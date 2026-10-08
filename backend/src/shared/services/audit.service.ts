import db from '../../db/knex';

export interface AuditRecordParams {
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  oldValue?: any;
  newValue?: any;
  ip?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  public async record(params: AuditRecordParams): Promise<void> {
    try {
      await db('audit_logs').insert({
        user_id: params.userId || null,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId !== undefined && params.entityId !== null ? String(params.entityId) : null,
        old_value: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
        new_value: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
        ip: params.ip || null,
        user_agent: params.userAgent || null,
      });
    } catch (error) {
      console.error('[AUDIT_LOG_ERROR] Failed to record audit log:', error);
      // We don't throw error to avoid failing primary user operation, but log clearly
    }
  }
}

export const auditService = new AuditService();
export default auditService;
