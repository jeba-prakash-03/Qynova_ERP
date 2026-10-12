import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Dashboard and Report Registries', () => {
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    adminToken = adminLogin.body.data.accessToken;

    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    employeeToken = empLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Dashboard Widgets Registry', () => {
    it('should list registered widgets for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/widgets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((w: any) => w.key === 'metrics_overview')).toBe(true);
      expect(res.body.data.some((w: any) => w.key === 'pending_leaves')).toBe(true);
      expect(res.body.data.some((w: any) => w.key === 'active_projects')).toBe(true);
      expect(res.body.data.some((w: any) => w.key === 'invoice_aging')).toBe(true);
    });

    it('should fetch data for registered widget metrics_overview', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/widgets/metrics_overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalEmployees');
      expect(res.body.data).toHaveProperty('activeTotal');
    });

    it('should fetch data for registered business widget invoice_aging', async () => {
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

    it('should return 404 for unknown widget key', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/widgets/non_existent_widget')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Reports Registry', () => {
    it('should list registered reports for user', async () => {
      const res = await request(app)
        .get('/api/v1/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const reportKeys = res.body.data.map((r: any) => r.key);
      expect(reportKeys).toContain('employee_directory');
      expect(reportKeys).toContain('project_status_summary');
      expect(reportKeys).toContain('budget_vs_actual_per_project');
      expect(reportKeys).toContain('client_wise_revenue');
    });

    it('should execute employee_directory report and return columns and rows', async () => {
      const res = await request(app)
        .get('/api/v1/reports/employee_directory')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('columns');
      expect(res.body.data).toHaveProperty('rows');
      expect(Array.isArray(res.body.data.columns)).toBe(true);
      expect(Array.isArray(res.body.data.rows)).toBe(true);
    });

    it('should execute project_status_summary report', async () => {
      const res = await request(app)
        .get('/api/v1/reports/project_status_summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.columns).toBeDefined();
      expect(Array.isArray(res.body.data.rows)).toBe(true);
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

      expect(res.status).toBe(403);
    });

    it('should export employee_directory report as XLSX', async () => {
      const res = await request(app)
        .get('/api/v1/reports/employee_directory/export?format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.header['content-disposition']).toContain('.xlsx');
      expect(res.body).toBeDefined();
    });

    it('should export employee_directory report as PDF', async () => {
      const res = await request(app)
        .get('/api/v1/reports/employee_directory/export?format=pdf')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toBe('application/pdf');
      expect(res.header['content-disposition']).toContain('.pdf');
      expect(res.body).toBeDefined();
    });

    it('should export project_status_summary report as CSV', async () => {
      const res = await request(app)
        .get('/api/v1/reports/project_status_summary/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('.csv');
      expect(res.text).toContain('Project Code');
      expect(res.text).toContain('Project Name');
    });

    it('should export project_status_summary report as JSON', async () => {
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
