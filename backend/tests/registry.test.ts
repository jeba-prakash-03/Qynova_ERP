import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';
import { generateAccessToken } from '../src/shared/utils/jwt.util';

describe('Task 6: Dashboard Widgets & Reports Registry', () => {
  const app = createApp();

  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    // Admin user token
    adminToken = generateAccessToken({
      userId: 1,
      employeeId: 1,
      roles: ['Admin'],
      permissions: ['*'],
    });

    // Employee user token without financial or manager permissions
    employeeToken = generateAccessToken({
      userId: 4,
      employeeId: 4,
      roles: ['Employee'],
      permissions: ['tasks.view_own', 'projects.view_own'],
    });
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('1. Dashboard Widgets Registry', () => {
    it('should retrieve all registered widgets for Admin user', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/widgets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;

      // Verify all required Dev B widgets exist in output
      expect(data).toHaveProperty('active_projects');
      expect(data).toHaveProperty('clients_count');
      expect(data).toHaveProperty('revenue_this_month');
      expect(data).toHaveProperty('expenses_this_month');
      expect(data).toHaveProperty('pending_invoices_amount');
      expect(data).toHaveProperty('invoice_aging');
      expect(data).toHaveProperty('project_status_chart');
      expect(data).toHaveProperty('overdue_tasks');
      expect(data).toHaveProperty('my_tasks');

      expect(typeof data.active_projects.count).toBe('number');
      expect(typeof data.clients_count.total).toBe('number');
      expect(typeof data.revenue_this_month.amount).toBe('number');
    });

    it('should retrieve a specific widget by ID (invoice_aging)', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/widgets/invoice_aging')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('current');
      expect(res.body.data).toHaveProperty('days_0_30');
      expect(res.body.data).toHaveProperty('days_31_60');
      expect(res.body.data).toHaveProperty('days_61_90');
      expect(res.body.data).toHaveProperty('days_90_plus');
    });

    it('should return 404 for unknown widget ID', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/widgets/non_existent_widget')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('2. Reports Registry & Executions', () => {
    it('should list all available registered reports for Admin', async () => {
      const res = await request(app)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const reportIds = res.body.data.map((r: any) => r.id);

      expect(reportIds).toContain('project_status_summary');
      expect(reportIds).toContain('task_summary_per_employee');
      expect(reportIds).toContain('utilization_per_employee');
      expect(reportIds).toContain('budget_vs_actual_per_project');
      expect(reportIds).toContain('income_vs_expenses_per_month');
      expect(reportIds).toContain('invoice_aging');
      expect(reportIds).toContain('client_wise_revenue');
      expect(reportIds).toContain('sales_pipeline_forecast');
    });

    it('should execute project_status_summary report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/project_status_summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.columns).toBeDefined();
      expect(Array.isArray(res.body.data.rows)).toBe(true);
      expect(res.body.data.totalRows).toBeGreaterThanOrEqual(1);
    });

    it('should execute budget_vs_actual_per_project report with labor costs and variances', async () => {
      const res = await request(app)
        .get('/api/v1/reports/budget_vs_actual_per_project')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.columns.some((c: any) => c.key === 'budget')).toBe(true);
      expect(res.body.data.columns.some((c: any) => c.key === 'labor_cost')).toBe(true);
      expect(res.body.data.columns.some((c: any) => c.key === 'expense_cost')).toBe(true);
      expect(res.body.data.columns.some((c: any) => c.key === 'variance')).toBe(true);
    });

    it('should BLOCK employee without financial permission from viewing budget_vs_actual_per_project report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/budget_vs_actual_per_project')
        .set('Authorization', `Bearer ${employeeToken}`);

      // Employee lacks reports.view or projects.view_financials
      expect(res.status).toBe(403);
    });

    it('should execute sales_pipeline_forecast report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales_pipeline_forecast')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rows.length).toBe(8); // 8 stages
    });

    it('should execute client_wise_revenue report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/client_wise_revenue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.columns.some((c: any) => c.key === 'total_invoiced')).toBe(true);
    });
  });

  describe('3. Generic Report Exporter (CSV & JSON)', () => {
    it('should export report as CSV with proper headers and mime type', async () => {
      const res = await request(app)
        .get('/api/v1/reports/project_status_summary/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('.csv');
      expect(res.text).toContain('Project Code');
      expect(res.text).toContain('Project Name');
    });

    it('should export report as JSON with proper mime type', async () => {
      const res = await request(app)
        .get('/api/v1/reports/project_status_summary/export?format=json')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      const parsed = JSON.parse(res.text);
      expect(parsed).toHaveProperty('columns');
      expect(parsed).toHaveProperty('rows');
    });
  });
});
