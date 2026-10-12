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

// 2. Download Payslip PDF (employee own or admin/hr)
router.get(
  '/payslips/:id/pdf',
  asyncHandler(payrollController.downloadPayslipPdf)
);

// 3. Set salary structure for an employee
router.post(
  '/salary',
  requirePermission('payroll.edit'),
  asyncHandler(payrollController.setSalaryStructure)
);

// 4. Get salary history for an employee
router.get(
  '/salary/:employeeId',
  requireAnyPermission('payroll.view', 'employees.view'),
  asyncHandler(payrollController.getSalaryHistory)
);

// 5. Pre-run adjustments (Incentives, Bonus, Allowances, Overtime, PF, Other Deductions)
router.get(
  '/adjustments',
  requirePermission('payroll.view'),
  asyncHandler(payrollController.getAdjustments)
);

router.post(
  '/adjustments',
  requirePermission('payroll.edit'),
  asyncHandler(payrollController.setAdjustment)
);

// 6. Generate / Recalculate payroll run
router.post(
  '/generate',
  requirePermission('payroll.run'),
  asyncHandler(payrollController.generatePayroll)
);

// 7. Get payroll run for a month
router.get(
  '/runs/:month',
  requirePermission('payroll.view'),
  asyncHandler(payrollController.getPayrollRun)
);

// 8. Lock payroll run
router.post(
  '/runs/:month/lock',
  requirePermission('payroll.approve'),
  asyncHandler(payrollController.lockPayroll)
);

// 9. Update payroll run status (Draft > Processed > Locked > Paid)
router.post(
  '/runs/:month/status',
  requirePermission('payroll.approve'),
  asyncHandler(payrollController.updateStatus)
);

export default router;
