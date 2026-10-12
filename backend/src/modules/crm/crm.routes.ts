import { Router } from 'express';
import { crmController } from './crm.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createLeadSchema,
  updateLeadSchema,
  updateStageSchema,
  convertLeadSchema,
  createActivitySchema,
} from './crm.schema';

const router = Router();

router.use(authenticate);

// Pipeline Overview & Forecasting
router.get(
  '/pipeline',
  requirePermission('crm.view,crm.view_own'),
  crmController.getPipelineOverview
);

// Leads CRUD
router.get(
  '/leads',
  requirePermission('crm.view,crm.view_own'),
  crmController.getLeads
);

router.get(
  '/leads/:id',
  requirePermission('crm.view,crm.view_own'),
  crmController.getLeadById
);

router.post(
  '/leads',
  requirePermission('crm.create'),
  validate({ body: createLeadSchema }),
  crmController.createLead
);

router.put(
  '/leads/:id',
  requirePermission('crm.edit'),
  validate({ body: updateLeadSchema }),
  crmController.updateLead
);

router.patch(
  '/leads/:id/stage',
  requirePermission('crm.edit'),
  validate({ body: updateStageSchema }),
  crmController.updateStage
);

// Lead Conversion to Client + Project (Atomic Transaction)
router.post(
  '/leads/:id/convert',
  requirePermission('crm.edit'),
  validate({ body: convertLeadSchema }),
  crmController.convertLead
);

router.delete(
  '/leads/:id',
  requirePermission('crm.delete'),
  crmController.deleteLead
);

// Lead Activities
router.get(
  '/leads/:id/activities',
  requirePermission('crm.view,crm.view_own'),
  crmController.getActivities
);

router.post(
  '/leads/:id/activities',
  requirePermission('crm.edit'),
  validate({ body: createActivitySchema }),
  crmController.addActivity
);

export default router;
