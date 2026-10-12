import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('HR Reports Suite (Task 3)', () => {
  let adminToken: string;
  let employeeToken: string;
  let managerToken: string;
  let managerEmpId: number;

  beforeAll(async () => {
    // Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    adminToken = adminLogin.body.data.accessToken;

    // Regular employee login (no payroll.view)
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    employeeToken = empLogin.body.data.accessToken;

    // Manager login
    const mgrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@qynova.erp', password: 'Manager@123' });
    managerToken = mgrLogin.body.data.accessToken;
    managerEmpId = mgrLogin.body.data.user.employee?.id || 1;
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('should list all registered HR reports for admin', async () => {
    const res = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const keys = res.body.data.map((r: any) => r.key);

    expect(keys).toContain('headcount_by_department_designation');
    expect(keys).toContain('joiners_and_leavers_by_month');
    expect(keys).toContain('employee_lifecycle_summary');
    expect(keys).toContain('attendance_summary');
    expect(keys).toContain('leave_summary');
    expect(keys).toContain('payroll_summary');
    expect(keys).toContain('payslip_register');
  });

  it('should execute headcount_by_department_designation report with summary', async () => {
    const res = await request(app)
      .get('/api/v1/reports/headcount_by_department_designation')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('columns');
    expect(res.body.data).toHaveProperty('rows');
    expect(res.body.data).toHaveProperty('summary');
    expect(Array.isArray(res.body.data.rows)).toBe(true);
  });

  it('should execute attendance_summary report with date range filters', async () => {
    const res = await request(app)
      .get('/api/v1/reports/attendance_summary?from=2026-10-01&to=2026-10-31')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toContain('Attendance Summary');
    expect(Array.isArray(res.body.data.rows)).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
  });

  it('should execute leave_summary report', async () => {
    const res = await request(app)
      .get('/api/v1/reports/leave_summary?from=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toContain('Leave Summary');
    expect(Array.isArray(res.body.data.rows)).toBe(true);
  });

  it('should execute payroll_summary report for admin with payroll.view', async () => {
    const res = await request(app)
      .get('/api/v1/reports/payroll_summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toContain('Monthly Payroll Summary');
    expect(Array.isArray(res.body.data.rows)).toBe(true);
  });

  it('should forbid employee without payroll.view from viewing salary reports', async () => {
    const res = await request(app)
      .get('/api/v1/reports/payroll_summary')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
  });

  it('should export attendance_summary as Excel and PDF', async () => {
    // Excel export
    const excelRes = await request(app)
      .get('/api/v1/reports/attendance_summary/export?format=xlsx')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(excelRes.status).toBe(200);
    expect(excelRes.header['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // PDF export
    const pdfRes = await request(app)
      .get('/api/v1/reports/attendance_summary/export?format=pdf')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.header['content-type']).toBe('application/pdf');
  });

  it('should export payroll_summary as Excel and PDF for authorized user', async () => {
    const excelRes = await request(app)
      .get('/api/v1/reports/payroll_summary/export?format=xlsx')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(excelRes.status).toBe(200);
    expect(excelRes.header['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const pdfRes = await request(app)
      .get('/api/v1/reports/payroll_summary/export?format=pdf')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.header['content-type']).toBe('application/pdf');
  });
});
