# Qynova ERP – Round 2 Assumptions

| # | Assumption | Rationale |
|---|------------|-----------|
| 1 | `salary_structures` table does not yet exist (Dev 2/payroll not built). Phase 5 requires it, so a migration will be added to create it. | Payroll module is not in the codebase; only the placeholder is. |
| 2 | The `relieved` lifecycle check during token refresh is assumed to be already handled by the existing code that sets `users.status = 'disabled'` on transition. The refresh service already rejects non-active users. | The `refreshTokens()` method rejects if `user.status !== 'active'`, and relieved sets status to `disabled`. |
| 3 | Role comparisons throughout backend use `SYSTEM_ROLES` constants which are capitalised (`'Admin'`, `'HR'`). All lowercase comparisons in leaves.service.ts are bugs. | Seed data confirms capitalised role names. |
| 4 | Phase 3 (partial leave approval) and Phase 4 (attendance UI simplification) are UI-heavy and will require new DB tables. Migrations are additive (never destructive). | Spec says "existing data must keep working". |
| 5 | `Timesheets` and `Payroll` menu items are removed from sidebar since neither module exists yet. | Spec says hide items not yet built. |
| 6 | The "from path" redirect (Phase 2) stores the attempted URL in `location.state.from` (standard React Router pattern). | Standard approach, consistent with existing ProtectedRoute navigate call. |
| 7 | For Phase 5 salary_structures: `effective_from` date determines which row payroll uses. When a new structure is added, the previous one is NOT deleted. | Spec says "changes create a new row, keep history". |
| 8 | The attendance export route (`/export`) has no permission guard. Assumption: requires `attendance.view` permission (added in Phase 1 fix). | Consistent with other admin attendance routes. |
| 9 | Dev 3 modules (clients, projects, tasks, milestones, invoices, expenses, crm, contracts, reports) are disconnected from frontend navigation and RBAC grid. Timesheets uses a free-text task description with nullable project_id/task_id. No Dev 3 source files existed in frontend. | Task 3 specifications. |

## Sprint Business Assumptions (Dev B)

| # | Assumption | Rationale |
|---|------------|-----------|
| 10 | Added nullable project_id and task_id to timesheets table; created timesheetIntegrationService wrapper in projects module for getApprovedMinutesByProject/Task. | Dev A created timesheets table rather than timesheet_entries and did not export project/task minute aggregation methods. |
| 11 | Tasks actual_hours aggregates approved minutes from timesheets; daily cron for due tomorrow task notifications runs at 08:00 Asia/Kolkata using node-cron with idempotent event keys. | Workflow server enforcement requires assignee project membership and subtask completion checks before resolving parents. |
| 12 | `payrollService.getHourlyCost(employeeId)` was not implemented in Dev A payroll service. Implemented thin wrapper `payrollIntegrationService.getHourlyCost` in Dev B profitability module computing hourly cost from active salary structure CTC / (12 * 160 hrs). | Spec rule: "If a function does not exist, create a thin exported wrapper in MY module that reads through the existing service, and note it in docs/ASSUMPTIONS.md." |
| 13 | Invoices daily cron runs at midnight Asia/Kolkata checking overdue invoices and notifying finance administrators with idempotent event keys `invoice-overdue-${id}-${today}`; email notifications record a clear TODO awaiting Dev A email queue. | Required in Task 4 invoice workflow. |
| 14 | In CRM-Lite, converting a Won lead generates a new Client with unique sequence CL-XXXX and a primary contact from lead contact details, plus a new Project PRJ-XXXX in one atomic database transaction; converting requires won stage and blocks re-conversion. Moving to lost stage strictly requires a lost_reason. | Required in Task 5 CRM-Lite specifications. |
| 15 | Adapted Dev B widgets and reports into Dev A registry format (`backend/src/shared/registry/widget.registry.ts` and `report.registry.ts`), with business widgets registered in `business.widgets.ts` and analytical reports in `business.reports.ts`. | Spec: "If a function does not exist, create a thin exported wrapper in MY module that reads through the existing service, and note it in docs/ASSUMPTIONS.md." |

## Sprint HR Assumptions (Dev A)

| # | Assumption | Rationale |
|---|------------|-----------|
| 16 | Dashboard widgets and reports registries are mounted at `/api/v1/dashboard/widgets` and `/api/v1/reports`, with role/permission authorization. | Task 1 specification to decouple dashboard and reporting extensions for Dev B. |
| 17 | PF deduction defaults to 12% of basic monthly salary unless explicitly overridden in payroll adjustments. | Standard statutory PF guideline in India when explicit breakdown is not specified. |
| 18 | Email notifications use Nodemailer with dev fallback to structured console logging when SMTP host is unset or unconfigured. | Ensures outbox worker and background queues function reliably in development and test environments without an active SMTP server. |
| 19 | Asset tags auto-generate with format `AST-YYYY-XXXX` if left blank on creation. Assets can only be deleted if in 'available' status. | Prevents loss of audit trail for assigned or maintained hardware. |
| 20 | Database health check endpoint mounted at `/health` verifies live database connectivity with `SELECT 1` returning 200 OK or 503 Service Unavailable. | Standard Docker and cloud orchestrator health probe contract. |

## Final Polish Assumptions

| # | Assumption | Rationale |
|---|------------|-----------|
| 21 | Company settings uses a singleton row (`id = 1`) in `company_settings`. Public branding assets (logo, favicon, signature) are served via `/api/v1/public/branding/file/:filename` without authentication, and branding metadata via `/api/v1/public/branding`. Updating company settings requires `settings.company.edit` and records backend audit logs. | Phase 1 requirement: singleton table, public branding for login page, audited updates. |
| 22 | Offer letter sequence uses unique format OFR-YYYY-XXXX. Variables in templates are substituted from the active salary structure and employee record into an immutable snapshot JSON. PDFs are stored under UPLOAD_DIR/documents/offer-letters and served via authenticated endpoint with role/ownership enforcement. Daily cron runs at midnight Asia/Kolkata for expiry and onboarding activation. | Phase 2 specifications for offer letter generation, lifecycle linkage, and snapshot immutability. |


