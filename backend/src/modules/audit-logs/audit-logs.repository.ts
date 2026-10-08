import db from '../../db/knex';

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  user_id?: number;
  entity?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export class AuditLogsRepository {
  public async findAll(params: AuditLogQueryParams): Promise<{ data: any[]; total: number }> {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const offset = (page - 1) * limit;

    let query = db('audit_logs as a')
      .leftJoin('users as u', 'a.user_id', 'u.id')
      .leftJoin('employees as e', 'u.id', 'e.user_id');

    if (params.user_id) {
      query = query.where('a.user_id', params.user_id);
    }
    if (params.entity) {
      query = query.where('a.entity', params.entity);
    }
    if (params.action) {
      query = query.where('a.action', params.action);
    }
    if (params.startDate) {
      query = query.where('a.created_at', '>=', `${params.startDate} 00:00:00`);
    }
    if (params.endDate) {
      query = query.where('a.created_at', '<=', `${params.endDate} 23:59:59`);
    }

    const countResult = await query.clone().count('a.id as count').first();
    const total = Number(countResult?.count || 0);

    const rows = await query
      .select(
        'a.*',
        'u.email as user_email',
        db.raw("CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as user_full_name")
      )
      .orderBy('a.created_at', 'desc')
      .offset(offset)
      .limit(limit);

    const formattedRows = rows.map((r) => ({
      ...r,
      old_value: typeof r.old_value === 'string' ? JSON.parse(r.old_value) : r.old_value,
      new_value: typeof r.new_value === 'string' ? JSON.parse(r.new_value) : r.new_value,
    }));

    return { data: formattedRows, total };
  }
}

export const auditLogsRepository = new AuditLogsRepository();
export default auditLogsRepository;
