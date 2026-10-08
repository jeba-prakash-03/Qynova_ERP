import { Router } from 'express';
import { rolesController } from '../roles/roles.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('roles.view'),
  rolesController.getPermissions
);

export default router;
