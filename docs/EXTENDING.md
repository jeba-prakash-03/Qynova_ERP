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
- `GET /api/v1/reports/:key/export?format=xlsx|pdf` (generic ExcelJS/PDFKit binary download)
