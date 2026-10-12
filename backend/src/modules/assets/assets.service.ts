import db from '../../db/knex';
import { assetsRepository } from './assets.repository';
import {
  Asset,
  CreateAssetDto,
  UpdateAssetDto,
  AssignAssetDto,
  ReturnAssetDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
} from './assets.types';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { getTodayKolkata } from '../../shared/utils/date.util';

export class AssetsService {
  public async getAssets(params: {
    search?: string;
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Asset[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      assetsRepository.findAssets({
        search: params.search,
        category: params.category,
        status: params.status,
        limit,
        offset,
      }),
      assetsRepository.countAssets({
        search: params.search,
        category: params.category,
        status: params.status,
      }),
    ]);

    return { data, total, page, limit };
  }

  public async getAssetById(id: number): Promise<{
    asset: Asset;
    activeAssignment: any;
    assignmentHistory: any[];
    maintenanceHistory: any[];
  }> {
    const asset = await assetsRepository.findById(id);
    if (!asset) {
      throw new NotFoundError(`Asset with ID ${id} not found`);
    }

    const [activeAssignment, assignmentHistory, maintenanceHistory] = await Promise.all([
      assetsRepository.findActiveAssignment(id),
      assetsRepository.findAssignmentsByAssetId(id),
      assetsRepository.findMaintenanceByAssetId(id),
    ]);

    return {
      asset,
      activeAssignment,
      assignmentHistory,
      maintenanceHistory,
    };
  }

  public async createAsset(dto: CreateAssetDto, currentUserId?: number): Promise<Asset> {
    let assetTag = dto.asset_tag?.trim();

    if (!assetTag) {
      let counter = 1;
      const [maxRow] = await db('assets').max('id as maxId');
      counter = Number(maxRow?.maxId || 0) + 1;
      assetTag = `AST-${String(counter).padStart(4, '0')}`;
      while (await db('assets').where({ asset_tag: assetTag }).first()) {
        counter++;
        assetTag = `AST-${String(counter).padStart(4, '0')}`;
      }
    }

    const existing = await assetsRepository.findByTag(assetTag);
    if (existing) {
      throw new BadRequestError(`Asset tag '${assetTag}' is already in use`, [
        { field: 'asset_tag', message: `Asset tag '${assetTag}' is already registered` },
      ]);
    }

    const id = await assetsRepository.createAsset({
      asset_tag: assetTag,
      name: dto.name,
      category: dto.category,
      model: dto.model || null,
      serial_number: dto.serial_number || null,
      purchase_date: dto.purchase_date || null,
      purchase_cost: dto.purchase_cost != null ? dto.purchase_cost : null,
      status: 'available',
      notes: dto.notes || null,
    });

    if (currentUserId) {
      await auditService.record({
        userId: currentUserId,
        action: 'assets.create',
        entity: 'assets',
        entityId: id,
        newValue: { id, assetTag, name: dto.name },
      });
    }

    const created = await assetsRepository.findById(id);
    return created!;
  }

  public async updateAsset(id: number, dto: UpdateAssetDto, currentUserId?: number): Promise<Asset> {
    const asset = await assetsRepository.findById(id);
    if (!asset) {
      throw new NotFoundError(`Asset with ID ${id} not found`);
    }

    await assetsRepository.updateAsset(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.category && { category: dto.category }),
      ...(dto.model !== undefined && { model: dto.model }),
      ...(dto.serial_number !== undefined && { serial_number: dto.serial_number }),
      ...(dto.purchase_date !== undefined && { purchase_date: dto.purchase_date }),
      ...(dto.purchase_cost !== undefined && { purchase_cost: dto.purchase_cost }),
      ...(dto.status && { status: dto.status }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    if (currentUserId) {
      await auditService.record({
        userId: currentUserId,
        action: 'assets.update',
        entity: 'assets',
        entityId: id,
        oldValue: asset,
        newValue: dto,
      });
    }

    const updated = await assetsRepository.findById(id);
    return updated!;
  }

  public async deleteAsset(id: number, currentUserId?: number): Promise<void> {
    const asset = await assetsRepository.findById(id);
    if (!asset) {
      throw new NotFoundError(`Asset with ID ${id} not found`);
    }

    if (asset.status === 'assigned') {
      throw new BadRequestError(
        'Cannot delete an asset that is currently assigned to an employee. Return it first.',
        [{ field: 'status', message: 'Asset is currently assigned' }]
      );
    }

    await assetsRepository.deleteAsset(id);

    if (currentUserId) {
      await auditService.record({
        userId: currentUserId,
        action: 'assets.delete',
        entity: 'assets',
        entityId: id,
        oldValue: asset,
      });
    }
  }

  public async assignAsset(assetId: number, dto: AssignAssetDto, currentUserId?: number): Promise<any> {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) {
      throw new NotFoundError(`Asset with ID ${assetId} not found`);
    }

    if (asset.status !== 'available') {
      throw new BadRequestError(
        `Asset cannot be assigned because its current status is '${asset.status}'`,
        [{ field: 'status', message: `Asset is not available for assignment (status: ${asset.status})` }]
      );
    }

    const employee = await db('employees').where({ id: dto.employee_id }).whereNull('deleted_at').first();
    if (!employee) {
      throw new NotFoundError(`Employee with ID ${dto.employee_id} not found`);
    }

    const assignedDate = dto.assigned_date || getTodayKolkata();

    const assignmentId = await db.transaction(async (trx) => {
      const [id] = await trx('asset_assignments').insert({
        asset_id: assetId,
        employee_id: dto.employee_id,
        assigned_date: assignedDate,
        condition_assigned: dto.condition_assigned || null,
        assigned_by: currentUserId || null,
        notes: dto.notes || null,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      await trx('assets').where({ id: assetId }).update({
        status: 'assigned',
        updated_at: db.fn.now(),
      });

      return Number(id);
    });

    if (currentUserId) {
      await auditService.record({
        userId: currentUserId,
        action: 'assets.assign',
        entity: 'asset_assignments',
        entityId: assignmentId,
        newValue: { assetId, employeeId: dto.employee_id, assignedDate },
      });
    }

    return { assignmentId, assetId, employeeId: dto.employee_id, assignedDate, status: 'assigned' };
  }

  public async returnAsset(assetId: number, dto: ReturnAssetDto, currentUserId?: number): Promise<any> {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) {
      throw new NotFoundError(`Asset with ID ${assetId} not found`);
    }

    const activeAssignment = await assetsRepository.findActiveAssignment(assetId);
    if (!activeAssignment) {
      throw new BadRequestError('This asset does not have an active assignment to return', [
        { field: 'status', message: 'Asset is not currently assigned' },
      ]);
    }

    const returnedDate = dto.returned_date || getTodayKolkata();

    await db.transaction(async (trx) => {
      await trx('asset_assignments')
        .where({ id: activeAssignment.id })
        .update({
          returned_date: returnedDate,
          condition_returned: dto.condition_returned || null,
          notes: dto.notes || activeAssignment.notes,
          updated_at: db.fn.now(),
        });

      await trx('assets').where({ id: assetId }).update({
        status: 'available',
        updated_at: db.fn.now(),
      });
    });

    if (currentUserId) {
      await auditService.record({
        userId: currentUserId,
        action: 'assets.return',
        entity: 'asset_assignments',
        entityId: activeAssignment.id,
        newValue: { assetId, returnedDate },
      });
    }

    return { assetId, returnedDate, status: 'available' };
  }

  public async createMaintenance(assetId: number, dto: CreateMaintenanceDto, currentUserId?: number): Promise<any> {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) {
      throw new NotFoundError(`Asset with ID ${assetId} not found`);
    }

    const id = await db.transaction(async (trx) => {
      const [mId] = await trx('asset_maintenance').insert({
        asset_id: assetId,
        start_date: dto.start_date,
        end_date: dto.end_date || null,
        cost: dto.cost || 0,
        issue_description: dto.issue_description,
        vendor_name: dto.vendor_name || null,
        status: dto.status || 'in_progress',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      await trx('assets').where({ id: assetId }).update({
        status: 'maintenance',
        updated_at: db.fn.now(),
      });

      return Number(mId);
    });

    return { id, assetId, status: 'maintenance' };
  }

  public async updateMaintenance(maintenanceId: number, dto: UpdateMaintenanceDto, currentUserId?: number): Promise<any> {
    const maintenance = await assetsRepository.findMaintenanceById(maintenanceId);
    if (!maintenance) {
      throw new NotFoundError(`Maintenance record with ID ${maintenanceId} not found`);
    }

    await db.transaction(async (trx) => {
      await trx('asset_maintenance')
        .where({ id: maintenanceId })
        .update({
          ...(dto.end_date !== undefined && { end_date: dto.end_date }),
          ...(dto.cost !== undefined && { cost: dto.cost }),
          ...(dto.resolution_details !== undefined && { resolution_details: dto.resolution_details }),
          ...(dto.vendor_name !== undefined && { vendor_name: dto.vendor_name }),
          ...(dto.status && { status: dto.status }),
          updated_at: db.fn.now(),
        });

      if (dto.status === 'completed' || dto.status === 'cancelled') {
        // Return asset to available status
        await trx('assets').where({ id: maintenance.asset_id }).update({
          status: 'available',
          updated_at: db.fn.now(),
        });
      }
    });

    return { maintenanceId, status: dto.status };
  }

  public async getMyAssets(employeeId: number): Promise<any[]> {
    return assetsRepository.findAssignmentsByEmployeeId(employeeId);
  }
}

export const assetsService = new AssetsService();
export default assetsService;
