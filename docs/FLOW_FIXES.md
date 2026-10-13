# Flow Fixes & Audit Log - Phase 4

This document records the flow errors, scope vulnerabilities, stale data query invalidations, and access control bugs identified and resolved during Phase 4.

---

## 1. Stale Data Queries & TanStack Query Invalidation

| Area / File | Root Cause | Fix Applied |
|---|---|---|
| **Employee Edit** (`EmployeeEditPage.tsx`) | `updateMutation` previously only invalidated `['employees', id]`. Returning to `/employees` showed stale employee details until manual reload. | Broadened invalidation to `['employees']`, `['employees', id]`, and `['employee-stats']`. |
| **Employee Creation** (`EmployeeCreatePage.tsx`) | Successful submission did not call `invalidateQueries`. Navigating to `/employees` caused newly created employee to be missing from the cache. | Injected `useQueryClient` and invalidated `['employees']` and `['employee-stats']` upon employee onboarding. |
| **Employee Soft Delete & Lifecycle** (`EmployeeDetailPage.tsx`) | `deleteMutation` navigated to `/employees` without cache eviction, leaving deleted profile in view. `lifecycleMutation` only evicted single-employee key. | Evicted `['employees']`, `['employees', id]`, `['employee-lifecycle-history', id]`, and `['employee-stats']`. |
| **Offer Letter Lifecycle** (`OfferLetterEmployeeTab.tsx`) | Generating, accepting, or declining offer letters failed to sync the employee directory list and lifecycle stage badge. | Added invalidation of `['offer-letters']`, `['employees']`, `['employees', String(id)]`, `['employee-lifecycle-history']`, and `['employee-stats']`. |
| **Leave Approvals** (`LeaveApprovalsPage.tsx`) | Approving or rejecting leaves only cleared `['leave-requests', 'pending']`, leaving quota balances and calendars stale. | Invalidation expanded to all `['leave-requests']` and `['leave-balances']` keys. |
| **Leave Applications** (`MyLeavesPage.tsx`) | Employee leave submissions and cancellations only invalidated self-scoped keys (`['leave-requests', 'me']`). | Broadened to `['leave-requests']` and `['leave-balances']` so approver views and calendars refresh immediately. |
| **Timesheets** (`MyTimesheetsPage.tsx`) | Timesheet submissions only invalidated `['timesheets', 'me']`. | Invalidation broadened to `['timesheets']` so manager approval lists reflect submissions. |
| **Payroll Runs** (`PayrollRunPage.tsx`) | Status changes and adjustments only invalidated the specific run month key. | Broadened invalidation to `['payroll']` so payslips and summaries across tabs synchronize. |

---

## 2. Dropdown Entity Filtering (Active vs. Inactive/Relieved)

| Component | Target Field | Previous Behavior | Corrected Behavior |
|---|---|---|---|
| `EmployeeCreatePage.tsx` | Reporting Manager | Fetched `/employees?limit=100` without filtering active status. | Queries `/employees?limit=200&status=active` and filters out `status !== 'active'` and `lifecycle_stage === 'relieved'`. |
| `EmployeeEditPage.tsx` | Reporting Manager | Fetched `/employees?limit=100`; allowed employee to select themselves as manager. | Queries active non-relieved employees and filters out `id === currentEmployeeId`. |
| `LeaveApprovalsPage.tsx` | Quota Allocation Employee | Fetched `/employees?limit=200` without active status check. | Filtered to active employees who have not been relieved. |
| `TaskFormModal.tsx` | Task Reviewer Select | Fetched `/employees?limit=200` unfiltered. | Filtered to active, non-relieved employees. |
| `ProjectFormModal.tsx` | Project Manager (PM) | Fetched `/employees?limit=100` unfiltered. | Filtered to active, non-relieved employees. |
| `ProjectDetailPage.tsx` | Project Member Assignment | Fetched `/employees?limit=100` unfiltered. | Filtered to active, non-relieved employees. |
| `LeadFormModal.tsx` | Salesperson Select | Fetched `/employees?limit=100` unfiltered. | Filtered to active, non-relieved employees. |
| `ConvertLeadModal.tsx` | PM on Conversion | Fetched `/employees?limit=100` unfiltered. | Filtered to active, non-relieved employees. |
| `CrmPipelinePage.tsx` | Salesperson Filter | Fetched `/employees?limit=100` unfiltered. | Filtered to active, non-relieved employees. |

---

## 3. Role Hierarchy & Multi-Permission Logic

| Area / Component | Vulnerability / Bug | Fix Applied |
|---|---|---|
| **Multi-Permission Routes** (`ProtectedRoute.tsx`) | Routes with comma-separated permissions (e.g. `crm.view,crm.view_own`) failed because `user.permissions.includes(...)` searched for the literal string containing the comma. | Updated `ProtectedRoute.tsx` to split on `,` and perform `.some()` matching. |
| **Permission Components** (`Can.tsx`, `usePermission.ts`) | Only checked exact single-string permission match. | Updated both to trim and split comma-separated strings to allow unified permission expressions. |
| **Dashboard Navigation Lockout** (`ProtectedRoute.tsx`) | `targetDashboard` logic previously checked `if (userHighestDashboard !== targetDashboard)` strictly. This blocked Admins and Managers who have an employee profile from accessing `/me` (My Dashboard / My Profile). | Refined `targetDashboard` to check permission bounds: `/admin` (Admin/HR), `/manager` (Admin/HR/Manager), and `/me` (any user with `user.employee`). |

---

## 4. Backend Scope Enforcement & Data Leakage Prevention

| Service / Endpoint | Root Cause | Fix Applied |
|---|---|---|
| `leaves.service.ts` (`getPendingApprovals`) | `isHrOrAdmin` checked `currentUser.permissions.includes('leave.approve')`. Since Managers possess `leave.approve`, they bypassed team scoping and were returned all pending leaves across the company. | Changed `isHrOrAdmin` to require Admin, HR, or global `leave.view`. Managers are now strictly scoped to `findPendingRequests(currentUser.employeeId)`. |
| `leaves.service.ts` (`approveLeave`, `rejectLeave`) | `isHrOrAdmin` included `leave.approve`, allowing managers to approve leaves for employees outside their reporting hierarchy. | Changed check so non-HR/Admin users must be the employee's direct `reporting_manager_id`. |
| `timesheets.service.ts` (`getPendingTimesheets`) | `isHrOrAdmin` included `timesheets.approve`, allowing managers to see company-wide pending timesheets. | Changed to check Admin, HR, or global `timesheets.view`. Managers are strictly scoped to `reporting_manager_id`. |
| `timesheets.service.ts` (`decideTimesheet`) | Lacked check verifying manager authority over the timesheet submitter. | Enforced check that user is Admin, HR, or the reporting manager of the employee. |
| `offer-letters.routes.ts` & controller | Route `/offer-letters/employee/:employeeId` required global `offer_letters.view`, blocking employees from viewing their own letter. Controller lacked ownership check on single-letter routes. | Added `requireAnyPermission('offer_letters.view', 'offer_letters.view_own')` and added strict ownership checks in controller (`currentUser.employeeId === employeeId` or Admin/HR). |
| `employees.controller.ts` (`getById`, `getLifecycleHistory`) | `getById` did not allow managers to view team members. `getLifecycleHistory` lacked permission checking entirely. | Added checks allowing Admin, HR, self-ownership, and reporting manager with `employees.view_team`. |
| `documents.service.ts` (`getEmployeeDocuments`) | Any authenticated user querying `/employees/:id/documents` could view other employees' non-sensitive documents. | Restricted access to Admin, HR, document owner, or reporting manager with `documents.view_team`. |
| `payroll.service.ts` (`generatePayroll`) | Selected employees without verifying `e.status = 'active'`, potentially calculating salary for inactive accounts. | Added `.where('e.status', 'active')` constraint. |
