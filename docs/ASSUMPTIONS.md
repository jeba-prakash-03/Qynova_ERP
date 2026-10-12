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

## Sprint HR Assumptions (Dev A)

| # | Assumption | Rationale |
|---|------------|-----------|
| 10 | Dashboard widgets and reports registries are mounted at `/api/v1/dashboard/widgets` and `/api/v1/reports`, with role/permission authorization. | Task 1 specification to decouple dashboard and reporting extensions for Dev B. |
| 11 | PF deduction defaults to 12% of basic monthly salary unless explicitly overridden in payroll adjustments. | Standard statutory PF guideline in India when explicit breakdown is not specified. |
| 12 | Email notifications use Nodemailer with dev fallback to structured console logging when SMTP host is unset or unconfigured. | Ensures outbox worker and background queues function reliably in development and test environments without an active SMTP server. |
| 13 | Asset tags auto-generate with format `AST-YYYY-XXXX` if left blank on creation. Assets can only be deleted if in 'available' status. | Prevents loss of audit trail for assigned or maintained hardware. |
| 14 | Database health check endpoint mounted at `/health` verifies live database connectivity with `SELECT 1` returning 200 OK or 503 Service Unavailable. | Standard Docker and cloud orchestrator health probe contract. |

