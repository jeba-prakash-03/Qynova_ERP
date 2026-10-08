import { Router } from 'express';
import { auditLogsController } from './audit-logs.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('audit_logs.view'),
  auditLogsController.getAll
);

export default router;
