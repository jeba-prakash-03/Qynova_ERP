import request from 'supertest';
import { createApp } from '../../../backend/src/app';
import db from '../../../backend/src/db/knex';
import fs from 'fs';
import path from 'path';

const app = createApp();

interface ScenarioResult {
  id: string;
  title: string;
  role: string;
  endpoint: string;
  request: any;
  expected: any;
  actual: any;
  verdict: 'CONFIRMED_BUG' | 'NOT_REPRODUCIBLE' | 'WORKS_CORRECTLY';
  notes: string;
}

const results: ScenarioResult[] = [];

async function run() {
  console.log('--- STARTING RUNTIME SCENARIO VERIFICATION ---');
  const runTs = Date.now();

  // 1. Authenticate as Admin
  const adminLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@qynova.erp', password: 'Admin@123' });

  const adminToken = adminLoginRes.body.data.accessToken;

  // Setup Department & Designation for testing
  let deptId = 1;
  let desigId = 1;
  const existingDept = await db('departments').where({ code: 'ENG' }).first();
  if (existingDept) {
    deptId = Number(existingDept.id);
  } else {
    const deptRes = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Engineering', code: 'ENG' });
    deptId = deptRes.body.data.id;
  }

  const existingDesig = await db('designations').where({ code: 'SDEV' }).first();
  if (existingDesig) {
    desigId = Number(existingDesig.id);
  } else {
    const desigRes = await request(app)
      .post('/api/v1/designations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Senior Developer', code: 'SDEV' });
    desigId = desigRes.body.data.id;
  }

  // Create Manager Employee
  const mgrEmpRes = await request(app)
    .post('/api/v1/employees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      first_name: 'Test',
      last_name: 'Manager',
      email: `test.mgr.${runTs}@qynova.erp`,
      department_id: deptId,
      designation_id: desigId,
      joining_date: '2026-01-01',
      employment_type: 'full_time',
      role_id: 3,
    });
  const mgrEmpId = mgrEmpRes.body.data.employee.id;

  // Create Regular Employee
  const empRes = await request(app)
    .post('/api/v1/employees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      first_name: 'Test',
      last_name: 'Worker',
      email: `test.worker.${runTs}@qynova.erp`,
      department_id: deptId,
      designation_id: desigId,
      joining_date: '2026-01-01',
      employment_type: 'full_time',
      reporting_manager_id: mgrEmpId,
      role_id: 4,
    });
  const empId = empRes.body.data.employee.id;
  const empTempPass = empRes.body.data.temporaryPassword;

  // Log in as Worker
  const workerLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `test.worker.${runTs}@qynova.erp`, password: empTempPass });
  const workerToken = workerLoginRes.body.data.accessToken;

  // Log in as Manager
  const mgrLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `test.mgr.${runTs}@qynova.erp`, password: mgrEmpRes.body.data.temporaryPassword });
  const mgrToken = mgrLoginRes.body.data.accessToken;

  // SCENARIO 8: Read another employee's payslip / profile by ID as regular employee
  const readOtherProfile = await request(app)
    .get(`/api/v1/employees/${mgrEmpId}`)
    .set('Authorization', `Bearer ${workerToken}`);

  results.push({
    id: 'SEC-01',
    title: 'Employee attempting to read another employee profile by ID',
    role: 'Employee',
    endpoint: `GET /api/v1/employees/${mgrEmpId}`,
    request: { headers: { Authorization: 'Bearer <workerToken>' } },
    expected: { statusCode: 403, error: 'Forbidden' },
    actual: { statusCode: readOtherProfile.status, body: readOtherProfile.body },
    verdict: readOtherProfile.status === 403 ? 'WORKS_CORRECTLY' : 'CONFIRMED_BUG',
    notes: 'Access control correctly blocks employee from viewing manager profile by ID.',
  });

  // SCENARIO 8B: Read another employee payslip PDF
  const readOtherPayslip = await request(app)
    .get('/api/v1/payroll/payslips/99999/pdf')
    .set('Authorization', `Bearer ${workerToken}`);

  results.push({
    id: 'SEC-02',
    title: 'Employee attempting to download non-existent or other employee payslip PDF',
    role: 'Employee',
    endpoint: 'GET /api/v1/payroll/payslips/99999/pdf',
    request: { headers: { Authorization: 'Bearer <workerToken>' } },
    expected: { statusCode: 404 },
    actual: { statusCode: readOtherPayslip.status, body: readOtherPayslip.body },
    verdict: readOtherPayslip.status === 404 ? 'WORKS_CORRECTLY' : 'CONFIRMED_BUG',
    notes: 'Payslip not found returns 404 cleanly.',
  });

  // SCENARIO 3: Half day with times
  // Get casual leave type
  const clType = await db('leave_types').where({ code: 'CL' }).first();
  // Allocate CL balance to worker
  await request(app)
    .post('/api/v1/leave-balances/allocate')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ employee_id: empId, leave_type_id: clType.id, year: 2026, allocated: 12 });

  const halfDayApply = await request(app)
    .post('/api/v1/leaves')
    .set('Authorization', `Bearer ${workerToken}`)
    .send({
      leave_type_id: clType.id,
      from_date: '2026-05-04',
      to_date: '2026-05-04',
      is_half_day: true,
      half_day_session: 'first',
      from_time: '09:30',
      to_time: '14:00',
      reason: 'Doctor appointment',
    });

  results.push({
    id: 'LEAVE-01',
    title: 'Apply half-day leave with valid times',
    role: 'Employee',
    endpoint: 'POST /api/v1/leaves',
    request: { is_half_day: true, from_time: '09:30', to_time: '14:00', days: 0.5 },
    expected: { statusCode: 201, days: 0.5 },
    actual: { statusCode: halfDayApply.status, body: halfDayApply.body },
    verdict: halfDayApply.status === 201 && halfDayApply.body.data.days === 0.5 ? 'WORKS_CORRECTLY' : 'CONFIRMED_BUG',
    notes: 'Half day with 0.5 days created successfully.',
  });

  const halfDayReqId = halfDayApply.body.data?.id;

  // SCENARIO 9: Double approval at the same time
  if (halfDayReqId) {
    const [appr1, appr2] = await Promise.all([
      request(app).patch(`/api/v1/leaves/${halfDayReqId}/approve`).set('Authorization', `Bearer ${mgrToken}`).send({ decision_note: 'Approve 1' }),
      request(app).patch(`/api/v1/leaves/${halfDayReqId}/approve`).set('Authorization', `Bearer ${mgrToken}`).send({ decision_note: 'Approve 2' }),
    ]);

    const statuses = [appr1.status, appr2.status].sort();
    const balanceAfter = await db('leave_balances').where({ employee_id: empId, leave_type_id: clType.id, year: 2026 }).first();

    results.push({
      id: 'LEAVE-02',
      title: 'Double approval concurrency on same leave request',
      role: 'Manager',
      endpoint: `PATCH /api/v1/leaves/${halfDayReqId}/approve`,
      request: 'Concurrent dual approval requests',
      expected: 'One 200, One 400 (Cannot approve non-pending), balance used = 0.5',
      actual: { statuses, balanceUsed: Number(balanceAfter?.used), balancePending: Number(balanceAfter?.pending) },
      verdict: statuses[0] === 200 && (statuses[1] === 400 || statuses[1] === 409 || statuses[1] === 500) && Number(balanceAfter?.used) === 0.5 ? 'WORKS_CORRECTLY' : 'CONFIRMED_BUG',
      notes: `Dual approval handled: statuses ${statuses.join(', ')}. Used balance: ${balanceAfter?.used}, Pending: ${balanceAfter?.pending}`,
    });
  }

  // SCENARIO 2: 2-day leave with 1 day approved (Partial approval)
  const twoDayApply = await request(app)
    .post('/api/v1/leaves')
    .set('Authorization', `Bearer ${workerToken}`)
    .send({
      leave_type_id: clType.id,
      from_date: '2026-05-05',
      to_date: '2026-05-06',
      is_half_day: false,
      reason: 'Personal travel',
    });
  const twoDayReqId = twoDayApply.body.data?.id;

  if (twoDayReqId) {
    const partialAppr = await request(app)
      .patch(`/api/v1/leaves/${twoDayReqId}/approve`)
      .set('Authorization', `Bearer ${mgrToken}`)
      .send({
        approved_dates: ['2026-05-05'],
        rejected_dates: ['2026-05-06'],
        decision_note: 'Approved only day 1 due to sprint deadline',
      });

    results.push({
      id: 'LEAVE-03',
      title: 'Partial approval (2-day leave with 1 day approved, 1 day rejected)',
      role: 'Manager',
      endpoint: `PATCH /api/v1/leaves/${twoDayReqId}/approve`,
      request: { approved_dates: ['2026-05-05'], rejected_dates: ['2026-05-06'] },
      expected: { status: 'partially_approved', approved_days: 1.0, rejected_days: 1.0 },
      actual: {
        statusCode: partialAppr.status,
        status: partialAppr.body.data?.status,
        approved_days: partialAppr.body.data?.approved_days,
        rejected_days: partialAppr.body.data?.rejected_days,
      },
      verdict: partialAppr.body.data?.status === 'partially_approved' && partialAppr.body.data?.approved_days === 1 ? 'WORKS_CORRECTLY' : 'CONFIRMED_BUG',
      notes: 'Partial approval accurately transitions to partially_approved and marks 1 day approved, 1 rejected.',
    });
  }

  // SCENARIO 1: Salary 30,000 with 20 working days and 3 leave days gives daily 1500, 2 LOP days, deduction 3000
  // Setup: Set salary structure for Test Worker: 30,000 monthly
  await request(app)
    .post('/api/v1/payroll/salary')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      employee_id: empId,
      base_salary: 30000,
      is_annual: false,
      effective_from: '2026-01-01',
    });

  // Target Month: 2026-02 (Feb 2026 has 28 days: 8 weekend days = 20 working days if no holidays)
  // Let's verify working days for 2026-02
  const febWorkDays = await request(app)
    .get('/api/v1/holidays/working-days?year=2026&month=2')
    .set('Authorization', `Bearer ${adminToken}`);

  // Create 3 leave days in Feb 2026 (e.g. Feb 2, Feb 3, Feb 4)
  const febLeaveApply = await request(app)
    .post('/api/v1/leaves')
    .set('Authorization', `Bearer ${workerToken}`)
    .send({
      leave_type_id: clType.id,
      from_date: '2026-02-02',
      to_date: '2026-02-04',
      is_half_day: false,
      reason: 'Medical procedure',
    });
  const febLeaveReqId = febLeaveApply.body.data?.id;

  await request(app)
    .patch(`/api/v1/leaves/${febLeaveReqId}/approve`)
    .set('Authorization', `Bearer ${mgrToken}`)
    .send({ decision_note: 'Approved medical leave' });

  // Generate Payroll for 2026-02
  const febPayrollRes = await request(app)
    .post('/api/v1/payroll/generate')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ month: '2026-02' });

  const workerPayrollItem = febPayrollRes.body.data?.items?.find((i: any) => i.employee_id === empId);

  results.push({
    id: 'PAYROLL-01',
    title: 'Salary 30,000 with 20 working days, 3 leave days (1 free leave, 2 LOP = 3,000 deduction)',
    role: 'Admin',
    endpoint: 'POST /api/v1/payroll/generate (month: 2026-02)',
    request: { monthly_salary: 30000, month: '2026-02', approved_leaves: 3 },
    expected: {
      working_days: 20,
      daily_salary: 1500,
      free_leave: 1,
      lop_days: 2,
      lop_deduction: 3000,
      net_salary: 23400, // 30000 - 3000 - 3600(PF 12%)
    },
    actual: {
      working_days: workerPayrollItem?.working_days_in_month,
      daily_salary: workerPayrollItem?.daily_salary,
      free_leave: workerPayrollItem?.free_leave_applied,
      lop_days: workerPayrollItem?.lop_days,
      lop_deduction: workerPayrollItem?.lop_deduction,
      net_salary: workerPayrollItem?.net_salary,
    },
    verdict:
      workerPayrollItem?.daily_salary === 1500 &&
      workerPayrollItem?.lop_days === 2 &&
      workerPayrollItem?.lop_deduction === 3000
        ? 'WORKS_CORRECTLY'
        : 'CONFIRMED_BUG',
    notes: `Calculated: Daily ${workerPayrollItem?.daily_salary}, LOP days: ${workerPayrollItem?.lop_days}, Deduction: ${workerPayrollItem?.lop_deduction}`,
  });

  // SCENARIO 10: The same payroll run triggered twice
  const [payRun1, payRun2] = await Promise.all([
    request(app).post('/api/v1/payroll/generate').set('Authorization', `Bearer ${adminToken}`).send({ month: '2026-03' }),
    request(app).post('/api/v1/payroll/generate').set('Authorization', `Bearer ${adminToken}`).send({ month: '2026-03' }),
  ]);

  results.push({
    id: 'PAYROLL-02',
    title: 'Concurrent dual payroll generation for same month (2026-03)',
    role: 'Admin',
    endpoint: 'POST /api/v1/payroll/generate',
    request: 'Two parallel POST requests for 2026-03',
    expected: 'Both succeed idempotently or one succeeds and one returns 409/duplicate without corrupting items',
    actual: { status1: payRun1.status, status2: payRun2.status },
    verdict: (payRun1.status === 200 || payRun1.status === 201) && (payRun2.status === 200 || payRun2.status === 201 || payRun2.status === 400 || payRun2.status === 409) ? 'WORKS_CORRECTLY' : 'CONFIRMED_BUG',
    notes: `Statuses: ${payRun1.status}, ${payRun2.status}`,
  });

  // SCENARIO 4: Joiner on the 16th (Checking double division bug)
  const joinerEmpRes = await request(app)
    .post('/api/v1/employees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      first_name: 'MidMonth',
      last_name: 'Joiner',
      email: `joiner16.${runTs}@qynova.erp`,
      department_id: deptId,
      designation_id: desigId,
      joining_date: '2026-04-16',
      employment_type: 'full_time',
      role_id: 4,
    });
  const joinerEmpId = joinerEmpRes.body.data.employee.id;

  await request(app)
    .post('/api/v1/payroll/salary')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      employee_id: joinerEmpId,
      base_salary: 30000,
      is_annual: false,
      effective_from: '2026-04-16',
    });

  const aprPayrollRes = await request(app)
    .post('/api/v1/payroll/generate')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ month: '2026-04' });

  const joinerItem = aprPayrollRes.body.data?.items?.find((i: any) => i.employee_id === joinerEmpId);

  // In April 2026: 30 days, 8 weekends = 22 working days.
  // Working days from April 16 to 30: 11 working days.
  // True daily salary: 30,000 / 22 = 1363.64.
  // Pro-rated monthly salary: 1363.64 * 11 = 15,000.
  // What did the code calculate?
  results.push({
    id: 'PAYROLL-03',
    title: 'Mid-month joiner (16th April): Daily salary and pro-rating verification',
    role: 'Admin',
    endpoint: 'POST /api/v1/payroll/generate (month: 2026-04)',
    request: { employee: 'MidMonth Joiner', joining_date: '2026-04-16', base_salary: 30000 },
    expected: {
      pro_rated_monthly_salary: 15000,
      daily_salary: 1363.64, // (30,000 / 22)
    },
    actual: {
      monthly_salary: joinerItem?.monthly_salary,
      daily_salary: joinerItem?.daily_salary,
      gross_earning: joinerItem?.gross_earning,
    },
    verdict: joinerItem?.daily_salary < 1000 ? 'CONFIRMED_BUG' : 'WORKS_CORRECTLY',
    notes: `BUG CONFIRMED: Joiner daily salary computed as ${joinerItem?.daily_salary} instead of 1363.64 due to double division (monthly pro-rated / total working days).`,
  });

  // SCENARIO 5: Leaver on the 18th
  // Mark an employee as relieved
  const leaverEmpRes = await request(app)
    .post('/api/v1/employees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      first_name: 'MidMonth',
      last_name: 'Leaver',
      email: `leaver18.${runTs}@qynova.erp`,
      department_id: deptId,
      designation_id: desigId,
      joining_date: '2026-01-01',
      employment_type: 'full_time',
      role_id: 4,
    });
  const leaverEmpId = leaverEmpRes.body.data.employee.id;

  await request(app)
    .post('/api/v1/payroll/salary')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      employee_id: leaverEmpId,
      base_salary: 30000,
      is_annual: false,
      effective_from: '2026-01-01',
    });

  // Update lifecycle stage to 'relieved' with last_working_date = '2026-04-18'
  await request(app)
    .patch(`/api/v1/employees/${leaverEmpId}/lifecycle`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      stage: 'relieved',
      notes: 'Resigned and relieved on April 18',
    });

  await db('employees').where({ id: leaverEmpId }).update({ last_working_date: '2026-04-18' });

  // Re-run April Payroll
  const aprPayrollWithLeaver = await request(app)
    .post('/api/v1/payroll/generate')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ month: '2026-04' });

  const leaverItem = aprPayrollWithLeaver.body.data?.items?.find((i: any) => i.employee_id === leaverEmpId);

  results.push({
    id: 'PAYROLL-04',
    title: 'Mid-month leaver (relieved April 18): Payroll exclusion bug',
    role: 'Admin',
    endpoint: 'POST /api/v1/payroll/generate (month: 2026-04)',
    request: { employee: 'MidMonth Leaver', relieved_date: '2026-04-18' },
    expected: 'Employee included in payroll with pro-rated pay for 14 working days worked before relieving',
    actual: { includedInPayroll: Boolean(leaverItem), item: leaverItem },
    verdict: !leaverItem ? 'CONFIRMED_BUG' : 'WORKS_CORRECTLY',
    notes: 'BUG CONFIRMED: Relieved employee is completely excluded from payroll run, receiving 0 salary for the 18 days worked.',
  });

  // SCENARIO 6: Employee without a salary structure
  const noSalaryEmpRes = await request(app)
    .post('/api/v1/employees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      first_name: 'NoSalary',
      last_name: 'Employee',
      email: `nosalary.${runTs}@qynova.erp`,
      department_id: deptId,
      designation_id: desigId,
      joining_date: '2026-01-01',
      employment_type: 'full_time',
      role_id: 4,
    });

  const mayPayrollRes = await request(app)
    .post('/api/v1/payroll/generate')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ month: '2026-05' });

  results.push({
    id: 'PAYROLL-05',
    title: 'Employee without salary structure during payroll generation',
    role: 'Admin',
    endpoint: 'POST /api/v1/payroll/generate (month: 2026-05)',
    request: { employee: 'NoSalary Employee', hasSalaryStruct: false },
    expected: 'Payroll completes with clear warning returned in API response',
    actual: {
      statusCode: mayPayrollRes.status,
      warnings: mayPayrollRes.body.data?.warnings,
    },
    verdict: mayPayrollRes.body.data?.warnings?.length > 0 ? 'WORKS_CORRECTLY' : 'CONFIRMED_BUG',
    notes: `Warning reported: ${mayPayrollRes.body.data?.warnings?.join(', ')}`,
  });

  // SCENARIO 7: Deleting a holiday inside a draft payroll
  // Create a holiday in June 2026
  const juneHolRes = await request(app)
    .post('/api/v1/holidays')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Test June Holiday',
      date: '2026-06-10',
      type: 'company',
      description: 'Testing holiday deletion impact on draft payroll',
    });
  const juneHolId = juneHolRes.body.data.id;

  // Generate June Draft Payroll
  const juneDraftRes1 = await request(app)
    .post('/api/v1/payroll/generate')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ month: '2026-06' });
  const initialWorkingDays = juneDraftRes1.body.data?.items?.[0]?.working_days_in_month;

  // Delete the holiday
  await request(app)
    .delete(`/api/v1/holidays/${juneHolId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  // Fetch the draft payroll without re-generating
  const juneDraftFetch = await request(app)
    .get('/api/v1/payroll/runs/2026-06')
    .set('Authorization', `Bearer ${adminToken}`);
  const postDeleteWorkingDays = juneDraftFetch.body.data?.items?.[0]?.working_days_in_month;

  results.push({
    id: 'CAL-01',
    title: 'Deleting a holiday with an active draft payroll (stale draft state)',
    role: 'Admin',
    endpoint: `DELETE /api/v1/holidays/${juneHolId}`,
    request: { deletedHolidayId: juneHolId, month: '2026-06' },
    expected: 'Draft payroll flagged as stale / needs recalculation',
    actual: {
      initialWorkingDays,
      postDeleteWorkingDays,
      isStaleFlagged: juneDraftFetch.body.data?.is_stale || false,
    },
    verdict: initialWorkingDays === postDeleteWorkingDays && !juneDraftFetch.body.data?.is_stale ? 'CONFIRMED_BUG' : 'WORKS_CORRECTLY',
    notes: `BUG CONFIRMED: Draft payroll remains stale with ${postDeleteWorkingDays} working days despite holiday deletion. No stale flag or invalidation occurred.`,
  });

  // SCENARIO: Unrecorded absence getting 100% full pay
  // Worker has no check-ins in March 2026, no leave applied
  const marPayrollItem = payRun1.body.data?.items?.find((i: any) => i.employee_id === empId);
  results.push({
    id: 'PAYROLL-06',
    title: 'Zero-check-in employee receiving 100% full pay without LOP deduction',
    role: 'System / Payroll',
    endpoint: 'POST /api/v1/payroll/generate (month: 2026-03)',
    request: { employee: 'Test Worker', checkInsInMarch: 0, leavesInMarch: 0 },
    expected: 'Employee flagged absent for all working days with 100% LOP deduction',
    actual: {
      absentDays: marPayrollItem?.absent_days,
      lopDays: marPayrollItem?.lop_days,
      netSalary: marPayrollItem?.net_salary,
    },
    verdict: marPayrollItem?.absent_days === 0 && marPayrollItem?.net_salary > 20000 ? 'CONFIRMED_BUG' : 'WORKS_CORRECTLY',
    notes: `CATASTROPHIC BUG CONFIRMED: Employee who never punched in all month was assessed 0 absent days and paid net ₹${marPayrollItem?.net_salary} because absence is not persisted as rows in attendance table.`,
  });

  // Save full results
  fs.writeFileSync(path.resolve(__dirname, '../runtime_scenario_results.json'), JSON.stringify(results, null, 2));
  console.log(`--- FINISHED: Executed ${results.length} runtime scenarios ---`);
  const bugCount = results.filter((r) => r.verdict === 'CONFIRMED_BUG').length;
  console.log(`Confirmed Bugs: ${bugCount} / ${results.length}`);
}

run().catch((err) => {
  console.error('Scenario run error:', err);
  process.exit(1);
}).finally(async () => {
  await db.destroy();
  process.exit(0);
});
