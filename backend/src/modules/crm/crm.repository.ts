import { Knex } from 'knex';
import db from '../../db/knex';
import {
  Lead,
  LeadActivity,
  LeadStage,
  PipelineOverview,
  StageSummary,
} from './crm.types';

export class CrmRepository {
  public async generateLeadCode(trx?: Knex.Transaction): Promise<string> {
    const knex = trx || db;
    const year = new Date().getFullYear();
    const prefix = `LD-${year}-`;

    const lastLead = await knex('leads')
      .where('lead_code', 'like', `${prefix}%`)
      .orderBy('id', 'desc')
      .first();

    let seq = 1;
    if (lastLead && lastLead.lead_code) {
      const parts = lastLead.lead_code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  public async findAll(params: {
    stage?: LeadStage;
    salesperson_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Lead[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const baseQuery = db('leads as l')
      .leftJoin('employees as e', 'l.salesperson_id', 'e.id')
      .leftJoin('clients as c', 'l.converted_client_id', 'c.id')
      .leftJoin('projects as p', 'l.converted_project_id', 'p.id');

    if (params.stage) {
      baseQuery.where('l.stage', params.stage);
    }

    if (params.salesperson_id) {
      baseQuery.where('l.salesperson_id', params.salesperson_id);
    }

    if (params.search) {
      const q = `%${params.search}%`;
      baseQuery.where((builder) => {
        builder
          .where('l.company_name', 'like', q)
          .orWhere('l.contact_name', 'like', q)
          .orWhere('l.lead_code', 'like', q)
          .orWhere('l.email', 'like', q);
      });
    }

    const countRes = await baseQuery.clone().count<{ count: number }>('l.id as count').first();
    const total = Number(countRes?.count || 0);

    const rows = await baseQuery
      .select(
        'l.*',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as salesperson_name"),
        'c.client_code as converted_client_code',
        'c.company_name as converted_client_name',
        'p.project_code as converted_project_code',
        'p.name as converted_project_name'
      )
      .orderBy('l.id', 'desc')
      .limit(limit)
      .offset(offset);

    const data: Lead[] = rows.map((r) => this.mapLeadRow(r));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async findById(id: number, trx?: Knex.Transaction): Promise<Lead | null> {
    const knex = trx || db;
    const row = await knex('leads as l')
      .leftJoin('employees as e', 'l.salesperson_id', 'e.id')
      .leftJoin('clients as c', 'l.converted_client_id', 'c.id')
      .leftJoin('projects as p', 'l.converted_project_id', 'p.id')
      .where('l.id', id)
      .select(
        'l.*',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as salesperson_name"),
        'c.client_code as converted_client_code',
        'c.company_name as converted_client_name',
        'p.project_code as converted_project_code',
        'p.name as converted_project_name'
      )
      .first();

    if (!row) return null;

    const lead = this.mapLeadRow(row);
    lead.activities = await this.findActivities(id, trx);
    return lead;
  }

  public async create(data: Partial<Lead>, trx?: Knex.Transaction): Promise<number> {
    const knex = trx || db;
    const [insertedId] = await knex('leads').insert({
      lead_code: data.lead_code,
      company_name: data.company_name,
      contact_name: data.contact_name,
      email: data.email || null,
      phone: data.phone || null,
      source: data.source || null,
      requirement: data.requirement || null,
      estimated_value: data.estimated_value || 0,
      probability_percent: data.probability_percent || 10,
      expected_closing_date: data.expected_closing_date || null,
      salesperson_id: data.salesperson_id || null,
      stage: data.stage || 'lead',
      lost_reason: data.lost_reason || null,
      created_by: data.created_by || null,
    });
    return Number(insertedId);
  }

  public async update(id: number, data: Partial<Lead>, trx?: Knex.Transaction): Promise<void> {
    const knex = trx || db;
    const updateData: any = { ...data, updated_at: knex.fn.now() };
    delete updateData.id;
    delete updateData.activities;
    delete updateData.salesperson_name;
    delete updateData.converted_client_code;
    delete updateData.converted_client_name;
    delete updateData.converted_project_code;
    delete updateData.converted_project_name;

    await knex('leads').where({ id }).update(updateData);
  }

  public async delete(id: number, trx?: Knex.Transaction): Promise<void> {
    const knex = trx || db;
    await knex('leads').where({ id }).del();
  }

  public async addActivity(
    data: {
      lead_id: number;
      type: string;
      title: string;
      description?: string | null;
      performed_by?: number | null;
      activity_date?: string;
    },
    trx?: Knex.Transaction
  ): Promise<number> {
    const knex = trx || db;
    const [id] = await knex('lead_activities').insert({
      lead_id: data.lead_id,
      type: data.type,
      title: data.title,
      description: data.description || null,
      performed_by: data.performed_by || null,
      activity_date: data.activity_date || knex.fn.now(),
    });
    return Number(id);
  }

  public async findActivities(leadId: number, trx?: Knex.Transaction): Promise<LeadActivity[]> {
    const knex = trx || db;
    const rows = await knex('lead_activities as la')
      .leftJoin('users as u', 'la.performed_by', 'u.id')
      .leftJoin('employees as e', 'u.id', 'e.user_id')
      .where('la.lead_id', leadId)
      .select(
        'la.*',
        db.raw("COALESCE(CONCAT(e.first_name, ' ', e.last_name), u.email) as performed_by_name")
      )
      .orderBy('la.activity_date', 'desc')
      .orderBy('la.id', 'desc');

    return rows.map((r) => ({
      id: r.id,
      lead_id: r.lead_id,
      type: r.type,
      title: r.title,
      description: r.description,
      performed_by: r.performed_by,
      performed_by_name: r.performed_by_name,
      activity_date: r.activity_date,
      created_at: r.created_at,
    }));
  }

  public async getPipelineOverview(): Promise<PipelineOverview> {
    const ALL_STAGES: LeadStage[] = [
      'lead',
      'contact',
      'requirement',
      'meeting',
      'proposal',
      'negotiation',
      'won',
      'lost',
    ];

    const stageAggregates = await db('leads')
      .select(
        'stage',
        db.raw('COUNT(id) as count'),
        db.raw('COALESCE(SUM(estimated_value), 0) as total_value'),
        db.raw('COALESCE(SUM(estimated_value * probability_percent / 100), 0) as weighted_value')
      )
      .groupBy('stage');

    const stageMap = new Map<string, { count: number; total_value: number; weighted_value: number }>();
    stageAggregates.forEach((sa: any) => {
      stageMap.set(sa.stage, {
        count: Number(sa.count || 0),
        total_value: Number(sa.total_value || 0),
        weighted_value: Number(sa.weighted_value || 0),
      });
    });

    let totalLeadsCount = 0;
    let totalPipelineValue = 0;
    let weightedForecast = 0;

    const stageSummaries: StageSummary[] = ALL_STAGES.map((stage) => {
      const data = stageMap.get(stage) || { count: 0, total_value: 0, weighted_value: 0 };
      totalLeadsCount += data.count;
      // Pipeline excludes lost deals from active pipeline value & forecast
      if (stage !== 'lost') {
        totalPipelineValue += data.total_value;
        weightedForecast += data.weighted_value;
      }
      return {
        stage,
        count: data.count,
        total_value: Number(data.total_value.toFixed(2)),
        weighted_value: Number(data.weighted_value.toFixed(2)),
      };
    });

    return {
      total_leads_count: totalLeadsCount,
      total_pipeline_value: Number(totalPipelineValue.toFixed(2)),
      weighted_forecast: Number(weightedForecast.toFixed(2)),
      stage_summaries: stageSummaries,
    };
  }

  private mapLeadRow(r: any): Lead {
    return {
      id: r.id,
      lead_code: r.lead_code,
      company_name: r.company_name,
      contact_name: r.contact_name,
      email: r.email,
      phone: r.phone,
      source: r.source,
      requirement: r.requirement,
      estimated_value: Number(r.estimated_value || 0),
      probability_percent: Number(r.probability_percent || 0),
      expected_closing_date: r.expected_closing_date,
      salesperson_id: r.salesperson_id,
      salesperson_name: r.salesperson_name,
      stage: r.stage,
      lost_reason: r.lost_reason,
      converted_client_id: r.converted_client_id,
      converted_client_code: r.converted_client_code,
      converted_client_name: r.converted_client_name,
      converted_project_id: r.converted_project_id,
      converted_project_code: r.converted_project_code,
      converted_project_name: r.converted_project_name,
      converted_at: r.converted_at,
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }
}

export const crmRepository = new CrmRepository();
