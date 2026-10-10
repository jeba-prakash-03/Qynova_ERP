import { Router } from 'express';
import { payrollController } from './payroll.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  requirePermission,
  requireAnyPermission,
  requireEmployee,
} from '../../shared/middleware/permission.middleware';
import { asyncHandler } from '../../shared/utils/async-handler.util';

const router = Router();

router.use(authenticate);

// 1. Employee view own payslips
router.get(
  '/me',
  requireEmployee,
  requirePermission('payroll.view_own'),
  asyncHandler(payrollController.getMyPayslips)
);

// 2. Set salary structure for an employee
router.post(
  '/salary',
  requirePermission('payroll.edit'),
  asyncHandler(payrollController.setSalaryStructure)
);

// 3. Get salary history for an employee
router.get(
  '/salary/:employeeId',
  requireAnyPermission('payroll.view', 'employees.view'),
  asyncHandler(payrollController.getSalaryHistory)
);

// 4. Generate / Recalculate payroll run
router.post(
  '/generate',
  requirePermission('payroll.run'),
  asyncHandler(payrollController.generatePayroll)
);

// 5. Get payroll run for a month
router.get(
  '/runs/:month',
  requirePermission('payroll.view'),
  asyncHandler(payrollController.getPayrollRun)
);

// 6. Lock payroll run
router.post(
  '/runs/:month/lock',
  requirePermission('payroll.approve'),
  asyncHandler(payrollController.lockPayroll)
);

export default router;
