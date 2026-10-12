import { Router } from 'express';
import { registryController } from './registry.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// List reports available for current user
router.get('/', registryController.listReports);

// Export report as xlsx or pdf (must be registered before /:key to avoid route collision)
router.get('/:key/export', registryController.exportReport);

// Get report data by key with filters (?from=&to=&department=)
router.get('/:key', registryController.getReportData);

export default router;
