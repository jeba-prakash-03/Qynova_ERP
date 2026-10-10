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
import { documentsController } from '../documents/documents.controller';
import { uploadDocumentMiddleware } from '../documents/documents.middleware';

const router = Router();

router.use(authenticate);

// Employee can view own profile without employees.view
router.get('/me', employeesController.getMe);
router.get('/stats/summary', requirePermission('employees.view'), employeesController.getStatsSummary);

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

router.get(
  '/:id/lifecycle-history',
  validate({ params: employeeIdParamSchema }),
  employeesController.getLifecycleHistory
);

// Employee Documents Endpoints
router.post(
  '/:id/documents',
  validate({ params: employeeIdParamSchema }),
  uploadDocumentMiddleware.single('file'),
  documentsController.upload
);

router.get(
  '/:id/documents',
  validate({ params: employeeIdParamSchema }),
  documentsController.listByEmployee
);

// Offer letter generation
router.post(
  '/:id/generate-offer-letter',
  requirePermission('employees.edit'),
  validate({ params: employeeIdParamSchema }),
  documentsController.generateOfferLetter
);

router.delete(
  '/:id',
  requirePermission('employees.delete'),
  validate({ params: employeeIdParamSchema }),
  employeesController.delete
);

export default router;
