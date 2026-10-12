import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission, requireAnyPermission } from '../../shared/middleware/permission.middleware';
import { registryController } from './registry.controller';

const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get('/widgets', registryController.getDashboardWidgets);
dashboardRouter.get('/widgets/:id', registryController.getDashboardWidgetById);

const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.get('/', requirePermission('reports.view'), registryController.getAvailableReports);
reportsRouter.get('/:id', requirePermission('reports.view'), registryController.runReport);
reportsRouter.get('/:id/export', requireAnyPermission('reports.export', 'reports.view'), registryController.exportReport);

export { dashboardRouter, reportsRouter };
