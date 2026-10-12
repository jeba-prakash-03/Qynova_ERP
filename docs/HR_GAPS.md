# HR Gaps Verification & Audit Report (Task 2)

This document audits and tracks the state of all HR modules in Qynova ERP following the Dev A sprint implementation and verification.

| Item | Was it Working? | What You Fixed or Built |
|---|---|---|
| **Payroll Adjustments** (Incentives, Bonus, Allowances, Overtime, Deductions) | No | Created `payroll_adjustments` database table and added corresponding columns to `payroll_items`. Implemented pre-run adjustment API (`GET /api/v1/payroll/adjustments`, `POST /api/v1/payroll/adjustments`) and added interactive pre-run adjustment modal in `PayrollRunPage.tsx`. |
| **Provident Fund (PF)** | No | Added `pf_deduction` column to `payroll_items` and `pf` to `payroll_adjustments`. Auto-calculates standard 12% of base salary or applies explicit custom PF override, deducting from gross salary. |
| **Payroll Run Status Lifecycle** (Draft > Processed > Locked > Paid) | Partially | Altered status enums on `payroll_runs` and `payroll_items` to include `processed`. Implemented `updatePayrollRunStatus` and route `POST /api/v1/payroll/runs/:month/status`. Added UI status badges and transition buttons ("Lock Payroll", "Mark as Paid"). |
| **Payslip PDF Download** | No | Built PDF payslip generator in `payroll.service.ts` using `PDFKit` with corporate letterhead, breakdown tables, and totals. Exposed `GET /api/v1/payroll/payslips/:id/pdf` and added download buttons on `PayrollRunPage.tsx` and `MyPayslipsPage.tsx`. |
| **Locked Payroll Immutability** | Yes | Verified and enforced: adjustments and recalculations throw 400 Bad Request if payroll is in `locked` or `paid` state. |
| **Salary Math & Free Leave** (Daily = Monthly / Working Days; 1 free leave; half-day = 0.5) | Yes | Verified mathematically and covered with automated tests in `tests/payroll.test.ts`. |
| **Attendance Break Tracking** | Yes | Verified `attendance_breaks` recording, employee start/end break, and automatic closure upon checkout. |
| **Attendance Late & Early Checkout** | Yes | Verified biometric / punch calculation setting `is_late` and `is_early_checkout`. |
| **Admin Attendance Edit Audit** | Yes | Verified `updateAttendance` enforces mandatory reason and logs to `audit_logs`. |
| **Attendance Sheet Excel Export** | Yes | Verified daily sheet export via ExcelJS with complete employee punches and statuses. |
| **Attendance Monthly Grid** | Yes | Verified `getMonthlySheet` endpoint and frontend calendar matrix grid. |
| **Attendance Prior to Joining Date Block** | Yes | Verified punch, edits, and leave requests before `joining_date` are strictly rejected. |
| **Leave Balance Cards** (Available, Used, Pending, Remaining) | Partially | Updated balance cards in `MyLeavesPage.tsx` to explicitly label all four metrics: Available, Used, Pending, Remaining. |
| **Leave Types** (Casual, Sick, Earned, LOP, Permission, WFH, Comp Off) | Yes | Verified all 7 standard leave types configured in seeds and validated during leave application. |
| **Half-Day Session & Time Range** | Yes | Verified `is_half_day` with `first_half` / `second_half` and `from_time` / `to_time` validation. |
| **Partial Leave Approval** | Yes | Verified multi-day leave approval allowing partial approval/rejection per day via `leave_request_days`. |
| **Timesheet Submission & TL Approval** | Yes | Verified submit endpoint with attendance variance check, TL pending list, and approve/reject with note. |
| **Employee Fields & Resume Upload** | Yes | Verified skills array, experience years, reporting manager hierarchy, photo URL, and resume upload under `documents`. |
