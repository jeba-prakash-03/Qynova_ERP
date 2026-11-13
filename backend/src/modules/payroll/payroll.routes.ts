import { Router } from 'express';
import { payrollController } from './payroll.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import {
  requirePermission,
  requireAnyPermission,
  requireEmployee,
} from '../../shared/middleware/permission.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import {
  setSalaryStructureSchema,
  getSalaryHistoryParamsSchema,
  setPayrollAdjustmentSchema,
  getPayrollAdjustmentsQuerySchema,
  generatePayrollSchema,
  payrollMonthParamSchema,
  updatePayrollStatusSchema,
  payslipIdParamSchema,
  fnfParamsSchema,
  calculateFnFSchema,
} from './payroll.schema';

const router = Router();

router.use(authenticate);

// 1. Employee view own payslips
router.get(
  '/me',
  requireEmployee,
  requireAnyPermission('payroll.view_own', 'payslips.view_own'),
  asyncHandler(payrollController.getMyPayslips)
);

// 2. Download Payslip PDF (employee own or admin/hr)
router.get(
  '/payslips/:id/pdf',
  validate({ params: payslipIdParamSchema }),
  asyncHandler(payrollController.downloadPayslipPdf)
);

// 3. Set salary structure for an employee
router.post(
  '/salary',
  requirePermission('payroll.edit'),
  validate({ body: setSalaryStructureSchema }),
  asyncHandler(payrollController.setSalaryStructure)
);

// 4. Get salary history for an employee
router.get(
  '/salary/:employeeId',
  requireAnyPermission('payroll.view', 'employees.view'),
  validate({ params: getSalaryHistoryParamsSchema }),
  asyncHandler(payrollController.getSalaryHistory)
);

// 5. Pre-run adjustments (Incentives, Bonus, Allowances, Overtime, PF, Other Deductions)
router.get(
  '/adjustments',
  requirePermission('payroll.view'),
  validate({ query: getPayrollAdjustmentsQuerySchema }),
  asyncHandler(payrollController.getAdjustments)
);

router.post(
  '/adjustments',
  requirePermission('payroll.edit'),
  validate({ body: setPayrollAdjustmentSchema }),
  asyncHandler(payrollController.setAdjustment)
);

// 6. Generate / Recalculate payroll run
router.post(
  '/generate',
  requirePermission('payroll.run'),
  validate({ body: generatePayrollSchema }),
  asyncHandler(payrollController.generatePayroll)
);

// 7. Get payroll run for a month
router.get(
  '/runs/:month',
  requirePermission('payroll.view'),
  validate({ params: payrollMonthParamSchema }),
  asyncHandler(payrollController.getPayrollRun)
);

// 8. Lock payroll run
router.post(
  '/runs/:month/lock',
  requirePermission('payroll.approve'),
  validate({ params: payrollMonthParamSchema }),
  asyncHandler(payrollController.lockPayroll)
);

// 9. Update payroll run status (Draft > Processed > Locked > Paid)
router.post(
  '/runs/:month/status',
  requirePermission('payroll.approve'),
  validate({ params: payrollMonthParamSchema, body: updatePayrollStatusSchema }),
  asyncHandler(payrollController.updateStatus)
);

// 10. Full & Final Settlement (FnF)
router.get(
  '/fnf/:employeeId',
  requireAnyPermission('payroll.view', 'payroll.run'),
  validate({ params: fnfParamsSchema }),
  asyncHandler(payrollController.calculateFnF)
);

router.post(
  '/fnf/:employeeId',
  requireAnyPermission('payroll.run', 'payroll.edit'),
  validate({ params: fnfParamsSchema, body: calculateFnFSchema }),
  asyncHandler(payrollController.calculateFnF)
);

export default router;
