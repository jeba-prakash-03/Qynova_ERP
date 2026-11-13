# Phase 3: Detailed Logic Verification & Code Audit

This report documents every verified finding from source code inspection and runtime verification. Each finding contains exact file paths, line numbers, reproduction steps, business impact, suggested fix, and catching test. Where a mechanism was inspected and verified correct, it is marked **PASS** in one line.

---

## 1. Identity, Authentication & Access Control

### PASS Items:
- **Refresh Token Rotation & Reuse Detection**: PASS (`auth.service.ts:135–158`). Token rotated on `/refresh`; token reuse revokes all user sessions.
- **Password Hashing**: PASS (`shared/utils/password.util.ts:8`). Bcrypt with salt factor 10 used consistently.
- **Account Lockout Protection**: PASS (`rate-limit.middleware.ts:47–58`). Locks account for 15 minutes after 5 consecutive failed attempts.
- **SQL Injection Guard**: PASS (`knex` parameterized queries used everywhere; no string concatenation found in raw queries).
- **Public Profile IDOR Defense**: PASS (`employees.controller.ts:39–41`). Regular employees receive 403 on `GET /api/v1/employees/:id` for other users.
- **Payslip IDOR Defense**: PASS (`payroll.controller.ts:168–172`). Regular employees receive 403 downloading other employees' payslip PDFs.

---

### Bug Cards:

#### BUG-SEC-01: Self-Approval of Leaves, Expenses, and Timesheets Permitted
- **Severity**: **Critical**
- **Evidence**: 
  - `leaves.service.ts:440–460` (`approveLeaveRequest`)
  - `finance.service.ts:305–320` (`approveExpense`)
  - `timesheets.service.ts:175–190` (`approveTimesheetEntry`)
- **Reproduction**:
  1. Log in as a Manager or HR who has approval permissions.
  2. Apply for a leave, expense claim, or timesheet entry as oneself.
  3. Send `PATCH /api/v1/leaves/:id/approve` (or finance/timesheets) using one's own token.
  4. Response is 200 OK; the request is approved.
- **Business Impact**: Complete violation of segregation of duties. Managers can approve their own unearned expenses, fake timesheets, or excessive leaves without managerial oversight.
- **Suggested Fix**:
  ```ts
  if (record.employee_id === approverEmployeeId) {
    throw new ForbiddenError('You cannot approve your own request');
  }
  ```
- **Catching Test**: Test calling approval endpoint with `req.user.employeeId === target.employee_id` expecting 403.

---

#### BUG-SEC-02: User ID vs Employee ID Ambiguity in Audit and Logging Tables
- **Severity**: **Medium**
- **Evidence**: `audit_logs` table schema has `user_id BIGINT UNSIGNED NULL`. In `employees.service.ts:195`, some audit entries log `req.user.employeeId` into `user_id`, causing foreign key mismatch or orphaned audit records when `users.id !== employees.id`.
- **Reproduction**: Create an employee whose `employees.id` is 10 but whose `users.id` is 4. Trigger lifecycle update. Check `audit_logs.user_id`: logs 10 instead of 4.
- **Business Impact**: Corrupted audit trail. Audit queries linking `audit_logs.user_id = users.id` attribute administrative actions to the wrong user or fail.
- **Suggested Fix**: Always pass `req.user.userId` strictly to `auditService.record({ userId })` and maintain separate `employee_id` column if logging target employee.
- **Catching Test**: Integration test asserting `audit_logs.user_id` matches `req.user.userId` when `userId !== employeeId`.

---

#### BUG-SEC-03: Repository Secrets & Default Values Exposed in Public Repository
- **Severity**: **High**
- **Evidence**: 
  - `backend/.env:13–14`: Hard-coded JWT secrets (`super_secret_jwt_access_key_...`).
  - `backend/.env:22–24`: Active Google Firebase Service Account Private Key committed directly in the working tree.
  - `backend/.env:34–36`: Production-grade admin email and password strings committed in `.env`.
- **Reproduction**: Inspect `backend/.env` line 24. A valid 2048-bit RSA private key for `firebase-adminsdk-fbsvc@qynova-36d21.iam.gserviceaccount.com` is committed.
- **Business Impact**: If the repository is public or shared with third parties, attackers can forge JWT tokens or abuse the Firebase Project infrastructure.
- **Suggested Fix**: Add `.env` to `.gitignore`, revoke and rotate Firebase credentials in Google Cloud Console, and ensure `.env.example` contains only dummy placeholders.
- **Catching Test**: Automated git pre-commit hook scanning for private keys and high-entropy secrets.

---

#### BUG-SEC-04: Route-Level Frontend Permission Guard Missing on `/employees/:id`
- **Severity**: **Medium**
- **Evidence**: `frontend/src/App.tsx:64–70`. The route `<Route path="/employees/:id" element={<EmployeeDetailPage />} />` is wrapped only in `<ProtectedRoute>` and lacks `<PermissionRoute requiredPermission="employees.view">`.
- **Reproduction**: Log in as an Employee. Navigate directly to `http://localhost:5173/employees/1`. The UI mounts the full page shell and attempts API calls before receiving 403 errors.
- **Business Impact**: Suboptimal UX, layout flashes, and exposure of UI schema/field metadata to unauthorized roles.
- **Suggested Fix**: Wrap route in `<PermissionRoute requiredPermission="employees.view">` or add internal permission check.
- **Catching Test**: Frontend test ensuring unprivileged user navigating to `/employees/1` is redirected to `/dashboard` or 403 page.

---

## 2. Dates, Time, Calendar & Timezones

### PASS Items:
- **Holiday Exclusion in Leave Requests**: PASS (`leaves.service.ts:88–95`). Weekends and holiday dates within a requested range are not counted against leave balance.
- **Leap Year Working Days**: PASS (`holidays.service.ts:42–50`). February 2024 evaluated with 29 days correctly.

---

### Bug Cards:

#### BUG-TIME-01: Server Timezone Shift Vulnerability on Date String Parsing
- **Severity**: **High**
- **Evidence**: `leaves.service.ts:66–72`, `attendance.service.ts:80–84`. Code executes `new Date(fromDate)` where `fromDate` is `'YYYY-MM-DD'`.
- **Reproduction**:
  1. On a server set to UTC (e.g. AWS or Docker container), `new Date('2026-05-01')` parses as `2026-05-01T00:00:00.000Z`.
  2. In local time conversion or formatting via `iter.getDate()`, servers behind UTC evaluate this to April 30th.
- **Business Impact**: Off-by-one calendar shifts on cloud deployments. Leaves and attendance logged on the wrong day.
- **Suggested Fix**:
  ```ts
  // Use timezone-safe string splitting or luxon/date-fns with explicit Asia/Kolkata zone
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  ```
- **Catching Test**: Test date calculation under `process.env.TZ = 'UTC'` and `process.env.TZ = 'America/New_York'`.

---

#### BUG-TIME-02: Stale Working Days and Draft Payroll upon Holiday Deletion
- **Severity**: **Medium**
- **Evidence**: `holidays.service.ts:65–75` (`deleteHoliday`).
- **Reproduction**:
  1. Generate draft payroll for June 2026 (calculates 21 working days).
  2. Delete a holiday falling in June 2026 via `DELETE /api/v1/holidays/:id`.
  3. Fetch the June 2026 draft payroll run. It still displays 21 working days and stale daily salaries.
- **Business Impact**: Inaccurate payroll disbursement. Deleting a holiday should increase working days and decrease daily salaries; instead, employees are paid based on stale calendar counts.
- **Suggested Fix**:
  ```ts
  await db('payroll_runs').where({ status: 'draft' }).andWhere('month', holidayMonth).update({ is_stale: true });
  ```
- **Catching Test**: Runtime scenario test `CAL-01` (Executed and confirmed in Phase 4).

---

## 3. Attendance Logic

### PASS Items:
- **One Row Per Day Constraint**: PASS (`attendance.repository.ts:32`). Database enforces `UNIQUE(employee_id, date)`.
- **Late Arrival Calculation**: PASS (`attendance.service.ts:95–110`). Compares punch time to shift start + 15 min grace period.
- **Overtime Calculation**: PASS (`attendance.service.ts:145–155`). Computes excess minutes beyond standard 480 minutes.

---

### Bug Cards:

#### BUG-ATT-01: Absent Days Not Persisted as Records in Database
- **Severity**: **Critical**
- **Evidence**: `attendance.service.ts:40–180`. Attendance records are only created when an employee actively punches in or when HR manually creates a correction.
- **Reproduction**:
  1. An employee joins on Jan 1, 2026.
  2. In the month of March 2026, the employee never punches in and applies for no leaves.
  3. Query `SELECT COUNT(*) FROM attendance WHERE employee_id = ? AND date BETWEEN '2026-03-01' AND '2026-03-31'`. Returns `0`.
- **Business Impact**: Cascades directly into Payroll Engine (`payroll.service.ts:325`). Payroll counts absent days by querying `attendance WHERE status = 'absent'`. Since 0 rows exist, absent days evaluates to 0, resulting in **100% full net salary paid to completely absent employees**.
- **Suggested Fix**: Either (A) Daily midnight cron inserts `status = 'absent'` rows for employees without check-in, or (B) Payroll calculates `absentDays = totalWorkingDays - (presentDays + approvedLeaveDays)`.
- **Catching Test**: Runtime scenario test `PAYROLL-06` (Executed and confirmed in Phase 4).

---

## 4. Leave Management Logic

### PASS Items:
- **Half-Day Duration Tracking**: PASS (`leaves.service.ts:280`). Accurately deducts 0.5 days from balance and tracks first/second half session.
- **Balance Non-Negativity Check**: PASS (`leaves.service.ts:265`). Application rejected if requested days exceed remaining balance.
- **Partial Leave Approval**: PASS (`leaves.service.ts:490–525`). Successfully marks approved vs rejected dates and refunds rejected days to balance.

---

### Bug Cards:

#### BUG-LEAVE-01: Race Condition on Concurrent Leave Approvals (Double Deduction)
- **Severity**: **High**
- **Evidence**: `leaves.service.ts:450–475` (`approveLeaveRequest`).
- **Reproduction**:
  1. Employee has 1.0 day pending leave.
  2. Trigger two concurrent `PATCH /api/v1/leaves/:id/approve` requests simultaneously.
  3. Both read `status = 'pending'`, both proceed, both call `decrement('pending', days)` and `increment('used', days)`.
  4. Balance result: `used = 1.0`, `pending = -0.5` (or negative).
- **Business Impact**: Corrupted leave ledger. Balances become mathematically invalid and negative.
- **Suggested Fix**:
  ```ts
  const updatedCount = await db('leave_requests')
    .where({ id, status: 'pending' })
    .update({ status: finalStatus, approver_employee_id: approverId, decided_at: db.fn.now() });
  if (updatedCount === 0) throw new ConflictError('Leave request is already processed');
  ```
- **Catching Test**: Runtime scenario test `LEAVE-02` (Executed and confirmed in Phase 4).

---

#### BUG-LEAVE-02: Permission Hours Never Deducted from Quota
- **Severity**: **Medium**
- **Evidence**: `leaves.service.ts:274`.
  ```ts
  daysCount = isPermission ? 0.0 : calc.days;
  ```
- **Reproduction**: Apply for permission hours (e.g. 2 hours). Check `leave_balances`. Zero days deducted.
- **Business Impact**: Employees can apply for unlimited permission requests without consuming their monthly or annual permission quota.
- **Suggested Fix**: Maintain dedicated `permission_hours_balance` or convert 4 hours of permission into 0.5 CL.
- **Catching Test**: Apply for permission hours and verify quota reflects deducted minutes/hours.

---

## 5. Payroll & Salary Calculations

### PASS Items:
- **Dynamic Daily Salary Divisor**: PASS (`payroll.service.ts:290–295`). Uses actual calendar working days of the target month (e.g., 20 days in Feb, 22 in March), never hard-coded 30 or 26.
- **Free Monthly Leave Policy**: PASS (`payroll.service.ts:330–335`). Subtracts 1 free leave day from LOP deduction count accurately.
- **Locked Run Immutability**: PASS (`payroll.service.ts:415–425`). Once locked, all updates to run items or salary structures are rejected.
- **Duplicate Run Prevention**: PASS (`payroll.service.ts:240–248`). Returns 409 Conflict if a payroll run for the same month is triggered concurrently.

---

### Bug Cards:

#### BUG-PAY-01: Catastrophic Ghost-Employee Payout (Zero Check-in = 100% Pay)
- **Severity**: **Critical**
- **Evidence**: `payroll.service.ts:323–335`.
  ```ts
  const absentRecords = await db('attendance')
    .where({ employee_id: emp.id, status: 'absent' })
    .whereBetween('date', [startDate, endDate]);
  const absentDays = absentRecords.length;
  ```
- **Reproduction**:
  1. Add an employee with ₹30,000 monthly salary.
  2. Do not record any attendance or leave for the entire month.
  3. Generate payroll for the month.
  4. Generated item: `absent_days: 0`, `lop_days: 0`, `gross_earning: 30000`, `net_salary: 26400`.
- **Business Impact**: **Direct Financial Loss**. The company pays full salary to employees who never worked, were absent without leave, or had already abandoned their roles.
- **Suggested Fix**:
  ```ts
  const presentDays = await db('attendance')
    .where({ employee_id: emp.id })
    .whereIn('status', ['present', 'half_day', 'wfh'])
    .whereBetween('date', [startDate, endDate]);
  const effectivePresent = presentDays.reduce((acc, r) => acc + (r.status === 'half_day' ? 0.5 : 1.0), 0);
  const absentDays = Math.max(0, activeWorkingDays - (effectivePresent + approvedLeaveDays));
  ```
- **Catching Test**: Runtime scenario test `PAYROLL-06` (Executed and confirmed in Phase 4).

---

#### BUG-PAY-02: Mid-Month Joiner Double Division Bug
- **Severity**: **High**
- **Evidence**: `payroll.service.ts:297–305`.
  ```ts
  if (isMidMonthJoiner) {
    monthlySalary = (monthlySalary * activeWorkingDays) / workingDaysInMonth;
  }
  const dailySalary = monthlySalary / workingDaysInMonth; // BUG: Divided by workingDaysInMonth twice!
  ```
- **Reproduction**:
  1. Employee joins April 16 (11 active working days out of 22 total working days in April; base salary ₹30,000).
  2. Pro-rated monthly salary: ₹15,000.
  3. Daily salary computed: `15000 / 22 = ₹681.82` (True daily salary is `30000 / 22 = ₹1363.64`).
- **Business Impact**: If the mid-month joiner takes 1 day of unpaid leave (LOP), the system deducts only ₹681.82 instead of ₹1,363.64. If overtime is computed from `dailySalary`, it is underpaid by 50%.
- **Suggested Fix**:
  ```ts
  const unratedMonthlySalary = Number(emp.base_salary);
  const dailySalary = Math.round((unratedMonthlySalary / workingDaysInMonth) * 100) / 100;
  const earnableSalary = isMidMonthJoiner ? Math.round(dailySalary * activeWorkingDays * 100) / 100 : unratedMonthlySalary;
  ```
- **Catching Test**: Runtime scenario test `PAYROLL-03` (Executed and confirmed in Phase 4).

---

#### BUG-PAY-03: Mid-Month Leaver Exclusion / Full-Month Overpayment
- **Severity**: **Critical**
- **Evidence**: `payroll.service.ts:263–265`.
  ```ts
  .whereNot('e.lifecycle_stage', 'relieved')
  ```
  And `payroll.service.ts:295–310` does NOT check `e.last_working_date`.
- **Reproduction**:
  - Case A: Employee is marked `relieved` on April 18. Payroll generated for April completely omits the employee. Result: **₹0 paid for 14 working days worked**.
  - Case B: Employee last working date is April 18, but HR has not toggled stage to `relieved`. Payroll generates: pays full ₹30,000 for 22 working days. Result: **Overpaid for 8 unworked days**.
- **Business Impact**: Unlawful wage non-payment or unrecoverable company overpayment during employee exits.
- **Suggested Fix**:
  Include employees whose `last_working_date >= monthStart`, and pro-rate `activeWorkingDays = countWorkingDays(monthStart, min(monthEnd, last_working_date))`.
- **Catching Test**: Runtime scenario test `PAYROLL-04` (Executed and confirmed in Phase 4).

---

## 6. Projects, Tasks, Timesheets & Finance

### PASS Items:
- **Invoice Gap-less Sequence**: PASS (`finance.service.ts:75–85`). Atomic counter produces `INV-YYYY-XXXX` sequentially.
- **Overpayment Prevention**: PASS (`finance.service.ts:165–170`). Blocks recording payment exceeding invoice `balance_due`.
- **GST Regional Splits**: PASS (`finance.service.ts:95–105`). Splits CGST/SGST (9%+9%) vs IGST (18%) based on state codes.

---

### Bug Cards:

#### BUG-FIN-01: Timesheet Daily Hours Exceeding 24 Hours Unchecked Across Multiple Entries
- **Severity**: **Medium**
- **Evidence**: `timesheets.service.ts:50–65`.
  Validates `input.hours <= 24`, but does NOT aggregate existing entries for the same employee and date.
- **Reproduction**: Employee submits three entries of 10 hours each on `2026-05-01`. All three succeed, logging 30 hours in a 24-hour day.
- **Business Impact**: Corrupted project billing, inaccurate client invoicing, and distorted employee utilization metrics.
- **Suggested Fix**:
  ```ts
  const existingSum = await db('timesheets').where({ employee_id, date }).sum('hours as total');
  if ((Number(existingSum[0].total) || 0) + input.hours > 24) {
    throw new BadRequestError('Total timesheet hours for a single day cannot exceed 24 hours');
  }
  ```
- **Catching Test**: Test submitting two 14-hour entries on the same date expecting 400 Bad Request on the second.

---

## 7. Cross-Cutting & API Consistency

### PASS Items:
- **Clean 403 on Null Employee ID**: PASS (`require-employee.middleware.ts:15`). Administrative users with `employeeId = null` accessing employee routes receive a clean 403 Forbidden without crashing.
- **Response Format Consistency**: PASS (`shared/utils/response.util.ts`). All endpoints return uniform `{ success: boolean, data?: any, message?: string, errors?: any[] }`.

---

### Bug Cards:

#### BUG-SYS-01: Undocumented and Missing Environment Variables
- **Severity**: **Low**
- **Evidence**: `backend/src/shared/services/email.templates.ts` uses `process.env.APP_NAME`; `backend/src/index.ts` uses `process.env.AUTO_MIGRATE`. Neither is documented in `.env.example`.
- **Reproduction**: Set up fresh developer environment using `.env.example`. System emails display fallback strings and auto-migrations do not run.
- **Business Impact**: Deployment friction and onboarding confusion.
- **Suggested Fix**: Update `.env.example` with default values for `APP_NAME` and `AUTO_MIGRATE`.
- **Catching Test**: Linter/test comparing keys in `.env.example` with `process.env.*` AST usages.
