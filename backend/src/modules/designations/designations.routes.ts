import { Router } from 'express';
import { designationsController } from './designations.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createDesignationSchema,
  updateDesignationSchema,
  designationIdParamSchema,
} from './designations.schema';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('designations.view'),
  designationsController.getAll
);

router.get(
  '/:id',
  requirePermission('designations.view'),
  validate({ params: designationIdParamSchema }),
  designationsController.getById
);

router.post(
  '/',
  requirePermission('designations.create'),
  validate({ body: createDesignationSchema }),
  designationsController.create
);

router.put(
  '/:id',
  requirePermission('designations.edit'),
  validate({ params: designationIdParamSchema, body: updateDesignationSchema }),
  designationsController.update
);

router.delete(
  '/:id',
  requirePermission('designations.delete'),
  validate({ params: designationIdParamSchema }),
  designationsController.delete
);

export default router;
