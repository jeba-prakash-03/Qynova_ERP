# Extending Qynova ERP: Dashboard & Report Registries

Qynova ERP features a centralized plugin-style registry architecture in `backend/src/shared/registry/` enabling Dev A and Dev B to register widgets and reports without touching each other's core modules.

## 1. Registering a Dashboard Widget

To register a dashboard card or metric widget:

```typescript
import { registerDashboardWidget } from '../../shared/registry';

registerDashboardWidget({
  key: 'sales_pipeline_summary',
  title: 'Sales Pipeline Summary',
  roles: ['Admin', 'Manager'],
  permission: 'crm.view',
  handler: async (user, query) => {
    return { openDeals: 12, totalPipelineValue: 450000 };
  },
});
```

Widgets are exposed via:
- `GET /api/v1/dashboard/widgets` (lists accessible widgets for authenticated user)
- `GET /api/v1/dashboard/widgets/:key` (executes handler and returns JSON payload)

---

## 2. Registering a Report

To register a tabular report that automatically supports Preview, Excel (.xlsx) and PDF (.pdf) export:

```typescript
import { registerReport } from '../../shared/registry';

registerReport({
  key: 'invoices_summary',
  title: 'Monthly Invoices Summary',
  group: 'Finance',
  permission: 'invoices.view',
  columns: [
    { key: 'invoice_no', header: 'Invoice #', width: 14 },
    { key: 'client_name', header: 'Client', width: 20 },
    { key: 'total_amount', header: 'Amount ($)', width: 14, format: 'currency', align: 'right' },
  ],
  handler: async (filters, user) => {
    // Return rows and optional summary
    return {
      title: 'Invoices Summary',
      columns: [/* column definitions */],
      rows: [
        { invoice_no: 'INV-1001', client_name: 'Acme Corp', total_amount: 15000 },
      ],
      summary: { invoice_no: 'Total', total_amount: 15000 },
    };
  },
});
```

Reports are exposed via:
- `GET /api/v1/reports` (lists accessible reports for authenticated user)
- `GET /api/v1/reports/:key?from=&to=&department=` (data preview)
- `GET /api/v1/reports/:key/export?format=xlsx|pdf|csv|json` (generic ExcelJS/PDFKit/CSV/JSON export)

---

## 3. Database Migration Naming & Precedence Rules

All database schema migrations in `backend/src/db/migrations/` MUST adhere to the strict timestamp naming convention:

```
YYYYMMDDHHMM_<descriptive_snake_case_name>.ts
```

### Precedence and Resolution Rules
1. **Lexicographical Ordering**: Knex executes migration files in alphabetical/lexicographical order. If two migrations share the exact same timestamp prefix, Knex resolves execution order alphabetically by the remainder of the filename.
2. **Never Rename Applied Migrations**: Once a migration has been committed and applied to environments, its filename is permanently recorded in the `knex_migrations` tracking table. Renaming existing migration files breaks migration checksums, prevents rolling back or upgrading, and corrupts environment deployments.
3. **Duplicate Timestamp History Note (202610110002)**:
   The duplicate timestamp `202610110002` was applied in early staging environments:
   - `202610110002_payroll_adjustments_and_components.ts` (executes 1st alphabetically: 'p' before 't')
   - `202610110002_tasks_create_tasks_tables.ts` (executes 2nd alphabetically)
   These files MUST NOT be renamed. All subsequent migrations must ensure unique timestamps.

---

## 4. API Routing & Canonical Conventions

To prevent route fragmentation, the ERP defines strict canonical API endpoints:

| Domain | Canonical Route | Deprecated / Removed Route | Note |
|---|---|---|---|
| Leave Requests | `/api/v1/leave-requests` | `/api/v1/leaves` (Removed) | All frontend features and approvals communicate via `/leave-requests`. Legacy duplicate `/leaves` route was removed to prevent route ambiguity. |
| Leave Balances | `/api/v1/leave-balances` | - | Allocations & employee balances |
| Leave Types | `/api/v1/leave-types` | - | System & custom leave types |
| Dashboard Widgets | `/api/v1/dashboard/widgets` | - | Plugin-based dynamic dashboard widgets |
| Analytical Reports | `/api/v1/reports` | - | Dynamic registry tabular & exportable reports |
