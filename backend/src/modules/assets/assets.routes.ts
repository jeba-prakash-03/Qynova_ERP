import { Router } from 'express';
import { assetsController } from './assets.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
  returnAssetSchema,
  createMaintenanceSchema,
  updateMaintenanceSchema,
} from './assets.schema';

const router = Router();

router.use(authenticate);

// Self-service: employee can view their assigned assets
router.get('/my', assetsController.getMyAssets);

// Maintenance update route (defined before parameterized :id to avoid route shadowing)
router.patch(
  '/maintenance/:maintenanceId',
  requirePermission('assets.edit'),
  validate({ body: updateMaintenanceSchema }),
  assetsController.updateMaintenance
);

// Assets CRUD & Assignments
router.get('/', requirePermission('assets.view'), assetsController.getAssets);

router.get('/:id', requirePermission('assets.view'), assetsController.getAssetById);

router.post(
  '/',
  requirePermission('assets.create'),
  validate({ body: createAssetSchema }),
  assetsController.createAsset
);

router.put(
  '/:id',
  requirePermission('assets.edit'),
  validate({ body: updateAssetSchema }),
  assetsController.updateAsset
);

router.delete('/:id', requirePermission('assets.delete'), assetsController.deleteAsset);

router.post(
  '/:id/assign',
  requirePermission('assets.assign'),
  validate({ body: assignAssetSchema }),
  assetsController.assignAsset
);

router.post(
  '/:id/return',
  requirePermission('assets.assign'),
  validate({ body: returnAssetSchema }),
  assetsController.returnAsset
);

router.post(
  '/:id/maintenance',
  requirePermission('assets.edit'),
  validate({ body: createMaintenanceSchema }),
  assetsController.createMaintenance
);

export default router;
