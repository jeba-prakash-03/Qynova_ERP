import { Router } from 'express';
import { timesheetsController } from './timesheets.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { requirePermission, requireEmployee, requireAnyPermission } from '../../shared/middleware/permission.middleware';
import { asyncHandler } from '../../shared/utils/async-handler.util';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  requireEmployee,
  requirePermission('timesheets.create'),
  asyncHandler(timesheetsController.submitTimesheet)
);

router.get(
  '/me',
  requireEmployee,
  requirePermission('timesheets.view_own'),
  asyncHandler(timesheetsController.getMyTimesheets)
);

router.get(
  '/pending',
  requireAnyPermission('timesheets.approve', 'timesheets.view'),
  asyncHandler(timesheetsController.getPendingTimesheets)
);

router.patch(
  '/:id/approve',
  requirePermission('timesheets.approve'),
  asyncHandler(timesheetsController.approveTimesheet)
);

router.patch(
  '/:id/reject',
  requirePermission('timesheets.approve'),
  asyncHandler(timesheetsController.rejectTimesheet)
);

export default router;
