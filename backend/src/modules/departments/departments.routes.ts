import { Router } from 'express';
import { departmentsController } from './departments.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentIdParamSchema,
} from './departments.schema';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('departments.view'),
  departmentsController.getAll
);

router.get(
  '/:id',
  requirePermission('departments.view'),
  validate({ params: departmentIdParamSchema }),
  departmentsController.getById
);

router.post(
  '/',
  requirePermission('departments.create'),
  validate({ body: createDepartmentSchema }),
  departmentsController.create
);

router.put(
  '/:id',
  requirePermission('departments.edit'),
  validate({ params: departmentIdParamSchema, body: updateDepartmentSchema }),
  departmentsController.update
);

router.delete(
  '/:id',
  requirePermission('departments.delete'),
  validate({ params: departmentIdParamSchema }),
  departmentsController.delete
);

export default router;
