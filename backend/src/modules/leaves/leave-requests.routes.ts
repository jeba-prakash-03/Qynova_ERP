import { Router } from 'express';
import { leavesController } from './leaves.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  requirePermission,
  requireAnyPermission,
  requireEmployee,
} from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createLeaveRequestSchema,
  approveLeaveRequestSchema,
  rejectLeaveRequestSchema,
  calculateDaysSchema,
} from './leaves.schema';
import { asyncHandler } from '../../shared/utils/async-handler.util';

const router = Router();

// All leave-request routes require authentication
router.use(authenticate);

// 1. Employee apply for leave
router.post(
  '/',
  requireEmployee,
  requirePermission('leave.create'),
  validate({ body: createLeaveRequestSchema }),
  asyncHandler(leavesController.applyLeave)
);

// 2. Employee view own leave requests
router.get(
  '/me',
  requireEmployee,
  requirePermission('leave.view_own'),
  asyncHandler(leavesController.getMyRequests)
);

// 3. Pending approvals (Manager team / HR/Admin all)
router.get(
  '/pending',
  requireAnyPermission('leave.approve', 'leave.view_team', 'leave.view'),
  asyncHandler(leavesController.getPendingApprovals)
);

// 4. Team Leave Calendar (Manager team / HR/Admin company-wide)
router.get(
  '/calendar',
  requireAnyPermission('leave.view_own', 'leave.view_team', 'leave.view'),
  asyncHandler(leavesController.getTeamCalendar)
);

// 5. Working Days live calculation preview
router.post(
  '/calculate-days',
  validate({ body: calculateDaysSchema }),
  asyncHandler(leavesController.calculateDays)
);

// 6. Cancel leave request
router.patch(
  '/:id/cancel',
  requireEmployee,
  asyncHandler(leavesController.cancelLeave)
);

// 7. Approve leave request
router.patch(
  '/:id/approve',
  requireAnyPermission('leave.approve', 'leave.edit'),
  validate({ body: approveLeaveRequestSchema }),
  asyncHandler(leavesController.approveLeave)
);

// 8. Reject leave request
router.patch(
  '/:id/reject',
  requireAnyPermission('leave.approve', 'leave.edit'),
  validate({ body: rejectLeaveRequestSchema }),
  asyncHandler(leavesController.rejectLeave)
);

export default router;
