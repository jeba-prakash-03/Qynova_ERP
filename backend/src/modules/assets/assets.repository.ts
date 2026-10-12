import db from '../../db/knex';
import { Asset, AssetAssignment, AssetMaintenance } from './assets.types';

export class AssetsRepository {
  public async findAssets(params: {
    search?: string;
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Asset[]> {
    let q = db('assets as a')
      .leftJoin('asset_assignments as aa', function () {
        this.on('aa.asset_id', '=', 'a.id').andOnNull('aa.returned_date');
      })
      .leftJoin('employees as e', 'aa.employee_id', 'e.id')
      .whereNull('a.deleted_at')
      .select(
        'a.*',
        'e.id as assigned_to_employee_id',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as assigned_to_employee_name"),
        'e.employee_code as assigned_to_employee_code',
        'aa.assigned_date as assigned_date'
      );

    if (params.search) {
      q = q.where((builder) => {
        builder
          .where('a.name', 'like', `%${params.search}%`)
          .orWhere('a.asset_tag', 'like', `%${params.search}%`)
          .orWhere('a.model', 'like', `%${params.search}%`)
          .orWhere('a.serial_number', 'like', `%${params.search}%`);
      });
    }

    if (params.category) {
      q = q.where('a.category', params.category);
    }

    if (params.status) {
      q = q.where('a.status', params.status);
    }

    if (params.limit) {
      q = q.limit(params.limit);
    }

    if (params.offset) {
      q = q.offset(params.offset);
    }

    const rows = await q.orderBy('a.id', 'desc');
    return rows.map(this.mapAsset);
  }

  public async countAssets(params: {
    search?: string;
    category?: string;
    status?: string;
  }): Promise<number> {
    let q = db('assets').whereNull('deleted_at');

    if (params.search) {
      q = q.where((builder) => {
        builder
          .where('name', 'like', `%${params.search}%`)
          .orWhere('asset_tag', 'like', `%${params.search}%`)
          .orWhere('model', 'like', `%${params.search}%`)
          .orWhere('serial_number', 'like', `%${params.search}%`);
      });
    }

    if (params.category) {
      q = q.where('category', params.category);
    }

    if (params.status) {
      q = q.where('status', params.status);
    }

    const [row] = await q.count('* as count');
    return Number(row?.count || 0);
  }

  public async findById(id: number): Promise<Asset | null> {
    const row = await db('assets as a')
      .leftJoin('asset_assignments as aa', function () {
        this.on('aa.asset_id', '=', 'a.id').andOnNull('aa.returned_date');
      })
      .leftJoin('employees as e', 'aa.employee_id', 'e.id')
      .where('a.id', id)
      .whereNull('a.deleted_at')
      .select(
        'a.*',
        'e.id as assigned_to_employee_id',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as assigned_to_employee_name"),
        'e.employee_code as assigned_to_employee_code',
        'aa.assigned_date as assigned_date'
      )
      .first();

    return row ? this.mapAsset(row) : null;
  }

  public async findByTag(tag: string): Promise<Asset | null> {
    const row = await db('assets').where({ asset_tag: tag }).whereNull('deleted_at').first();
    return row ? this.mapAsset(row) : null;
  }

  public async createAsset(data: any): Promise<number> {
    const [id] = await db('assets').insert({
      ...data,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return Number(id);
  }

  public async updateAsset(id: number, data: any): Promise<void> {
    await db('assets')
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      });
  }

  public async deleteAsset(id: number): Promise<void> {
    await db('assets')
      .where({ id })
      .update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
  }

  public async findActiveAssignment(assetId: number): Promise<AssetAssignment | null> {
    const row = await db('asset_assignments as aa')
      .join('employees as e', 'aa.employee_id', 'e.id')
      .where('aa.asset_id', assetId)
      .whereNull('aa.returned_date')
      .select(
        'aa.*',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'e.employee_code'
      )
      .first();

    return row || null;
  }

  public async createAssignment(data: any): Promise<number> {
    const [id] = await db('asset_assignments').insert({
      ...data,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return Number(id);
  }

  public async updateAssignment(id: number, data: any): Promise<void> {
    await db('asset_assignments')
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      });
  }

  public async findAssignmentsByAssetId(assetId: number): Promise<AssetAssignment[]> {
    const rows = await db('asset_assignments as aa')
      .join('employees as e', 'aa.employee_id', 'e.id')
      .where('aa.asset_id', assetId)
      .select(
        'aa.*',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'e.employee_code'
      )
      .orderBy('aa.id', 'desc');

    return rows;
  }

  public async findAssignmentsByEmployeeId(employeeId: number): Promise<any[]> {
    const rows = await db('asset_assignments as aa')
      .join('assets as a', 'aa.asset_id', 'a.id')
      .where('aa.employee_id', employeeId)
      .whereNull('aa.returned_date')
      .whereNull('a.deleted_at')
      .select(
        'aa.id as assignment_id',
        'aa.assigned_date',
        'aa.condition_assigned',
        'a.id as asset_id',
        'a.asset_tag',
        'a.name as asset_name',
        'a.category',
        'a.model',
        'a.serial_number',
        'a.status as asset_status'
      )
      .orderBy('aa.assigned_date', 'desc');

    return rows;
  }

  public async findMaintenanceByAssetId(assetId: number): Promise<AssetMaintenance[]> {
    const rows = await db('asset_maintenance')
      .where({ asset_id: assetId })
      .orderBy('id', 'desc');

    return rows;
  }

  public async findMaintenanceById(id: number): Promise<AssetMaintenance | null> {
    const row = await db('asset_maintenance').where({ id }).first();
    return row || null;
  }

  public async createMaintenance(data: any): Promise<number> {
    const [id] = await db('asset_maintenance').insert({
      ...data,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    return Number(id);
  }

  public async updateMaintenance(id: number, data: any): Promise<void> {
    await db('asset_maintenance')
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      });
  }

  private mapAsset(row: any): Asset {
    return {
      id: Number(row.id),
      asset_tag: row.asset_tag,
      name: row.name,
      category: row.category,
      model: row.model || null,
      serial_number: row.serial_number || null,
      purchase_date: row.purchase_date ? new Date(row.purchase_date).toISOString().split('T')[0] : null,
      purchase_cost: row.purchase_cost != null ? Number(row.purchase_cost) : null,
      status: row.status,
      notes: row.notes || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at || null,
      assigned_to_employee_id: row.assigned_to_employee_id ? Number(row.assigned_to_employee_id) : null,
      assigned_to_employee_name: row.assigned_to_employee_name || null,
      assigned_to_employee_code: row.assigned_to_employee_code || null,
      assigned_date: row.assigned_date ? new Date(row.assigned_date).toISOString().split('T')[0] : null,
    };
  }
}

export const assetsRepository = new AssetsRepository();
export default assetsRepository;
