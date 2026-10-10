import { Router } from 'express';
import { holidaysController } from './holidays.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission } from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createHolidaySchema,
  updateHolidaySchema,
  holidayQuerySchema,
  updateWorkSettingsSchema,
} from './holidays.schema';

const router = Router();

router.use(authenticate);

// Work settings endpoints
router.get('/work-settings', requirePermission('holidays.view'), holidaysController.getWorkSettings);
router.put(
  '/work-settings',
  requirePermission('holidays.edit'),
  validate({ body: updateWorkSettingsSchema }),
  holidaysController.updateWorkSettings
);

// Working days endpoint for calendar / payroll helpers
router.get('/working-days', requirePermission('holidays.view'), holidaysController.getWorkingDays);

// Holidays CRUD
router.get(
  '/',
  requirePermission('holidays.view'),
  validate({ query: holidayQuerySchema }),
  holidaysController.getAll
);

router.post(
  '/',
  requirePermission('holidays.create'),
  validate({ body: createHolidaySchema }),
  holidaysController.create
);

router.get('/:id', requirePermission('holidays.view'), holidaysController.getById);

router.put(
  '/:id',
  requirePermission('holidays.edit'),
  validate({ body: updateHolidaySchema }),
  holidaysController.update
);

router.delete('/:id', requirePermission('holidays.delete'), holidaysController.delete);

export default router;
