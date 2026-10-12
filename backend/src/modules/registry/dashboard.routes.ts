import { Router } from 'express';
import { registryController } from './registry.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// List widgets available for current user
router.get('/widgets', registryController.listWidgets);

// Get widget data by key
router.get('/widgets/:key', registryController.getWidgetData);

export default router;
