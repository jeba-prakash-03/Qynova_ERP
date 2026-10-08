import { Router } from 'express';
import { rolesController } from './roles.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createRoleSchema,
  updateRoleSchema,
  updateRolePermissionsSchema,
  roleIdParamSchema,
} from './roles.schema';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('roles.view'),
  rolesController.getAll
);

router.get(
  '/:id',
  requirePermission('roles.view'),
  validate({ params: roleIdParamSchema }),
  rolesController.getById
);

router.post(
  '/',
  requirePermission('roles.create'),
  validate({ body: createRoleSchema }),
  rolesController.create
);

router.put(
  '/:id',
  requirePermission('roles.edit'),
  validate({ params: roleIdParamSchema, body: updateRoleSchema }),
  rolesController.update
);

router.delete(
  '/:id',
  requirePermission('roles.delete'),
  validate({ params: roleIdParamSchema }),
  rolesController.delete
);

router.put(
  '/:id/permissions',
  requirePermission('roles.edit'),
  validate({ params: roleIdParamSchema, body: updateRolePermissionsSchema }),
  rolesController.updatePermissions
);

export default router;
