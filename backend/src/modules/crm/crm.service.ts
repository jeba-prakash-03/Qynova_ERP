import db from '../../db/knex';
import { crmRepository } from './crm.repository';
import {
  CreateLeadDTO,
  UpdateLeadDTO,
  ConvertLeadDTO,
  LeadStage,
  PipelineOverview,
  Lead,
  LeadActivity,
} from './crm.types';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';

const STAGE_DEFAULT_PROBABILITIES: Record<LeadStage, number> = {
  lead: 10,
  contact: 20,
  requirement: 30,
  meeting: 40,
  proposal: 60,
  negotiation: 80,
  won: 100,
  lost: 0,
};

export class CrmService {
  public async getPipelineOverview(): Promise<PipelineOverview> {
    return crmRepository.getPipelineOverview();
  }

  public async getLeads(params: {
    stage?: LeadStage;
    salesperson_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    return crmRepository.findAll(params);
  }

  public async getLeadById(id: number): Promise<Lead> {
    const lead = await crmRepository.findById(id);
    if (!lead) {
      throw new NotFoundError(`Lead with ID ${id} not found`);
    }
    return lead;
  }

  public async createLead(data: CreateLeadDTO, userId?: number, ip?: string): Promise<Lead> {
    const leadCode = await crmRepository.generateLeadCode();

    const stage: LeadStage = data.stage || 'lead';
    const probability =
      data.probability_percent !== undefined
        ? data.probability_percent
        : STAGE_DEFAULT_PROBABILITIES[stage];

    const insertedId = await crmRepository.create({
      lead_code: leadCode,
      company_name: data.company_name,
      contact_name: data.contact_name,
      email: data.email || null,
      phone: data.phone || null,
      source: data.source || null,
      requirement: data.requirement || null,
      estimated_value: data.estimated_value || 0,
      probability_percent: probability,
      expected_closing_date: data.expected_closing_date || null,
      salesperson_id: data.salesperson_id || null,
      stage,
      created_by: userId || null,
    });

    await crmRepository.addActivity({
      lead_id: insertedId,
      type: 'note',
      title: 'Lead Created',
      description: `New lead added with initial stage: ${stage.toUpperCase()}`,
      performed_by: userId,
    });

    await auditService.record({
      userId,
      action: 'crm.create',
      entity: 'leads',
      entityId: insertedId,
      newValue: {
        lead_code: leadCode,
        company_name: data.company_name,
        estimated_value: data.estimated_value,
        stage,
      },
      ip,
    });

    return (await this.getLeadById(insertedId))!;
  }

  public async updateLead(
    id: number,
    data: UpdateLeadDTO,
    userId?: number,
    ip?: string
  ): Promise<Lead> {
    const existing = await this.getLeadById(id);

    // If stage is being changed to 'lost', validate lost reason
    if (data.stage === 'lost' && !data.lost_reason && !existing.lost_reason) {
      throw new BadRequestError('Lost reason is required when moving a lead to Lost stage', [
        { field: 'lost_reason', message: 'Reason for losing deal is required' },
      ]);
    }

    let probability = data.probability_percent;
    if (data.stage && data.stage !== existing.stage && probability === undefined) {
      probability = STAGE_DEFAULT_PROBABILITIES[data.stage];
    }

    await crmRepository.update(id, {
      ...data,
      probability_percent: probability !== undefined ? probability : existing.probability_percent,
    });

    if (data.stage && data.stage !== existing.stage) {
      await crmRepository.addActivity({
        lead_id: id,
        type: 'stage_change',
        title: `Stage Changed: ${existing.stage} -> ${data.stage}`,
        description:
          data.stage === 'lost'
            ? `Reason: ${data.lost_reason || existing.lost_reason}`
            : `Pipeline progress updated to ${data.stage.toUpperCase()}`,
        performed_by: userId,
      });
    }

    await auditService.record({
      userId,
      action: 'crm.edit',
      entity: 'leads',
      entityId: id,
      oldValue: {
        stage: existing.stage,
        estimated_value: existing.estimated_value,
        probability_percent: existing.probability_percent,
      },
      newValue: data,
      ip,
    });

    return (await this.getLeadById(id))!;
  }

  public async updateStage(
    id: number,
    newStage: LeadStage,
    lostReason?: string | null,
    userId?: number,
    ip?: string
  ): Promise<Lead> {
    const existing = await this.getLeadById(id);

    if (newStage === 'lost' && (!lostReason || lostReason.trim().length === 0)) {
      throw new BadRequestError('Lost reason is required when moving a lead to Lost stage', [
        { field: 'lost_reason', message: 'Reason for losing deal is required' },
      ]);
    }

    const probability = STAGE_DEFAULT_PROBABILITIES[newStage];

    await crmRepository.update(id, {
      stage: newStage,
      probability_percent: probability,
      lost_reason: newStage === 'lost' ? lostReason : null,
    });

    await crmRepository.addActivity({
      lead_id: id,
      type: 'stage_change',
      title: `Stage Changed: ${existing.stage.toUpperCase()} → ${newStage.toUpperCase()}`,
      description:
        newStage === 'lost'
          ? `Deal marked as lost. Reason: ${lostReason}`
          : `Lead moved to ${newStage.toUpperCase()} stage (${probability}% probability)`,
      performed_by: userId,
    });

    await auditService.record({
      userId,
      action: 'crm.edit',
      entity: 'leads',
      entityId: id,
      oldValue: { stage: existing.stage, probability_percent: existing.probability_percent },
      newValue: { stage: newStage, probability_percent: probability, lost_reason: lostReason },
      ip,
    });

    return (await this.getLeadById(id))!;
  }

  public async convertLead(
    id: number,
    convertData: ConvertLeadDTO,
    userId?: number,
    ip?: string
  ): Promise<{ client: any; project: any; lead: Lead }> {
    const result = await db.transaction(async (trx) => {
      const lead = await trx('leads').where({ id }).first();
      if (!lead) {
        throw new NotFoundError(`Lead with ID ${id} not found`);
      }

      if (lead.converted_client_id) {
        throw new BadRequestError('Lead has already been converted to a client and project', [
          { field: 'lead_id', message: 'Lead was already converted previously' },
        ]);
      }

      // 1. Generate client_code (CL-xxxx)
      const lastClient = await trx('clients')
        .where('client_code', 'like', 'CL-%')
        .orderBy('id', 'desc')
        .first();

      let clientSeq = 1;
      if (lastClient && lastClient.client_code) {
        const matches = lastClient.client_code.match(/CL-(\d+)/);
        if (matches) {
          clientSeq = parseInt(matches[1], 10) + 1;
        }
      }
      const clientCode = `CL-${String(clientSeq).padStart(4, '0')}`;

      // 2. Insert Client
      const [clientId] = await trx('clients').insert({
        client_code: clientCode,
        company_name: lead.company_name,
        status: 'active',
        notes: `Converted from CRM Lead ${lead.lead_code}`,
      });

      // 3. Insert Client Contact
      await trx('client_contacts').insert({
        client_id: clientId,
        name: lead.contact_name,
        email: lead.email || null,
        phone: lead.phone || null,
        is_primary: 1,
      });

      // 4. Generate project_code (PRJ-xxxx)
      const lastProject = await trx('projects')
        .where('project_code', 'like', 'PRJ-%')
        .orderBy('id', 'desc')
        .first();

      let projectSeq = 1;
      if (lastProject && lastProject.project_code) {
        const matches = lastProject.project_code.match(/PRJ-(\d+)/);
        if (matches) {
          projectSeq = parseInt(matches[1], 10) + 1;
        }
      }
      const projectCode = `PRJ-${String(projectSeq).padStart(4, '0')}`;

      const today = new Date().toISOString().split('T')[0];
      const projectName = convertData.project_name || `${lead.company_name} Project`;
      const projectDesc =
        convertData.project_description ||
        lead.requirement ||
        `Commercial engineering project converted from CRM Lead ${lead.lead_code}`;

      // 5. Insert Project
      const [projectId] = await trx('projects').insert({
        project_code: projectCode,
        client_id: clientId,
        name: projectName,
        description: projectDesc,
        project_manager_id: convertData.project_manager_id || lead.salesperson_id || null,
        start_date: convertData.start_date || today,
        end_date: convertData.end_date || null,
        budget: lead.estimated_value,
        status: 'planning',
        priority: 'medium',
      });

      // 6. Update Lead to Won + Links
      await trx('leads').where({ id }).update({
        stage: 'won',
        probability_percent: 100,
        converted_client_id: clientId,
        converted_project_id: projectId,
        converted_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });

      // 7. Add Activity log
      await trx('lead_activities').insert({
        lead_id: id,
        type: 'stage_change',
        title: 'Won & Converted',
        description: `Successfully converted lead into Client ${clientCode} and Project ${projectCode}`,
        performed_by: userId || null,
        activity_date: trx.fn.now(),
        created_at: trx.fn.now(),
      });

      // 8. Audit Record
      await auditService.record({
        userId,
        action: 'crm.convert',
        entity: 'leads',
        entityId: id,
        newValue: {
          client_id: clientId,
          client_code: clientCode,
          project_id: projectId,
          project_code: projectCode,
        },
        ip,
      });

      return { clientId, projectId };
    });

    const client = await db('clients').where({ id: result.clientId }).first();
    const project = await db('projects').where({ id: result.projectId }).first();
    const updatedLead = await this.getLeadById(id);

    return {
      client,
      project,
      lead: updatedLead,
    };
  }

  public async addActivity(
    leadId: number,
    data: {
      type: string;
      title: string;
      description?: string | null;
      activity_date?: string;
    },
    userId?: number
  ): Promise<LeadActivity[]> {
    await this.getLeadById(leadId);

    await crmRepository.addActivity({
      lead_id: leadId,
      type: data.type,
      title: data.title,
      description: data.description || null,
      performed_by: userId || null,
      activity_date: data.activity_date,
    });

    return crmRepository.findActivities(leadId);
  }

  public async getActivities(leadId: number): Promise<LeadActivity[]> {
    await this.getLeadById(leadId);
    return crmRepository.findActivities(leadId);
  }

  public async deleteLead(id: number, userId?: number, ip?: string): Promise<void> {
    const existing = await this.getLeadById(id);

    await crmRepository.delete(id);

    await auditService.record({
      userId,
      action: 'crm.delete',
      entity: 'leads',
      entityId: id,
      oldValue: {
        lead_code: existing.lead_code,
        company_name: existing.company_name,
      },
      ip,
    });
  }
}

export const crmService = new CrmService();
