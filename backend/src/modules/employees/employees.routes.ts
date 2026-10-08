import { Router } from 'express';
import { employeesController } from './employees.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateLifecycleSchema,
  employeeQuerySchema,
  employeeIdParamSchema,
} from './employees.schema';

const router = Router();

router.use(authenticate);

// Employee can view own profile without employees.view
router.get('/me', employeesController.getMe);

router.get(
  '/',
  requirePermission('employees.view'),
  validate({ query: employeeQuerySchema }),
  employeesController.getAll
);

router.get(
  '/:id',
  validate({ params: employeeIdParamSchema }),
  employeesController.getById
);

router.post(
  '/',
  requirePermission('employees.create'),
  validate({ body: createEmployeeSchema }),
  employeesController.create
);

router.put(
  '/:id',
  requirePermission('employees.edit'),
  validate({ params: employeeIdParamSchema, body: updateEmployeeSchema }),
  employeesController.update
);

router.patch(
  '/:id/lifecycle',
  requirePermission('employees.edit'),
  validate({ params: employeeIdParamSchema, body: updateLifecycleSchema }),
  employeesController.updateLifecycle
);

router.delete(
  '/:id',
  requirePermission('employees.delete'),
  validate({ params: employeeIdParamSchema }),
  employeesController.delete
);

export default router;
