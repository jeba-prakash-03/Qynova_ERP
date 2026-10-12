import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Dashboard and Report Registries (Task 1)', () => {
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
      expect(res.body.data.some((r: any) => r.key === 'employee_directory')).toBe(true);
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
  });
});
