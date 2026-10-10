import { Router } from 'express';
import { leavesController } from './leaves.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  requirePermission,
  requireAnyPermission,
  requireEmployee,
} from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { allocateBalanceSchema } from './leaves.schema';
import { asyncHandler } from '../../shared/utils/async-handler.util';

const router = Router();

// All leave-balance routes require authentication
router.use(authenticate);

// 1. Employee view own balances
router.get(
  '/me',
  requireEmployee,
  requirePermission('leave.view_own'),
  asyncHandler(leavesController.getMyBalances)
);

// 2. HR/Admin view balances for specific employee
router.get(
  '/',
  requireAnyPermission('leave.view', 'leave.approve'),
  asyncHandler(leavesController.getEmployeeBalances)
);

// 3. HR/Admin allocate yearly quotas (individual or for all employees)
router.post(
  '/allocate',
  requireAnyPermission('leave.edit', 'leave.approve', 'leave.view'),
  validate({ body: allocateBalanceSchema }),
  asyncHandler(leavesController.allocateBalance)
);

export default router;
