import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';
import fs from 'fs';
import path from 'path';

const app = createApp();

describe('Phase 1: Company Settings & Public Branding Module', () => {
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    // Run migrations on test DB to ensure table exists
    await db.migrate.latest();

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    adminToken = adminLogin.body.data?.accessToken;

    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    employeeToken = empLogin.body.data?.accessToken;
  });

  describe('Public Branding Endpoints', () => {
    it('GET /api/v1/public/branding should return branding without authentication', async () => {
      const res = await request(app).get('/api/v1/public/branding');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('company_name');
      expect(res.body.data).toHaveProperty('logo_url');
      expect(res.body.data).toHaveProperty('support_email');
    });
  });

  describe('Company Settings RBAC & Data Management', () => {
    it('GET /api/v1/settings/company requires settings.view permission', async () => {
      const res = await request(app)
        .get('/api/v1/settings/company')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('company_name');
      expect(res.body.data).toHaveProperty('currency');
      expect(res.body.data).toHaveProperty('timezone');
    });

    it('PUT /api/v1/settings/company blocks non-admin without settings.company.edit', async () => {
      const res = await request(app)
        .put('/api/v1/settings/company')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ company_name: 'Unauthorized Change' });

      expect(res.status).toBe(403);
    });

    it('PUT /api/v1/settings/company validates fields and specifies failing field', async () => {
      const res = await request(app)
        .put('/api/v1/settings/company')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'not-an-email',
          financial_year_start_month: 15,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(Array.isArray(res.body.errors)).toBe(true);
      const fields = res.body.errors.map((e: any) => e.field);
      expect(fields).toContain('email');
      expect(fields).toContain('financial_year_start_month');
    });

    it('PUT /api/v1/settings/company updates company settings and creates audit log', async () => {
      const updateData = {
        company_name: 'Acme Global Enterprises',
        legal_name: 'Acme Global Technologies Pvt Ltd',
        tagline: 'Modern Workforce Platform',
        address_line1: '123 Tech Blvd, Suite 400',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560100',
        country: 'India',
        phone: '+91 80 5555 1234',
        email: 'info@acmeglobal.com',
        support_email: 'support@acmeglobal.com',
        website: 'https://acmeglobal.com',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        date_format: 'DD/MM/YYYY',
        financial_year_start_month: 4,
        signatory_name: 'Johnathan Doe',
        signatory_designation: 'Managing Director',
        payslip_footer_text: 'Computer generated payslip.',
        email_footer_text: 'Acme Global confidential communication.',
      };

      const res = await request(app)
        .put('/api/v1/settings/company')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.company_name).toBe('Acme Global Enterprises');
      expect(res.body.data.signatory_name).toBe('Johnathan Doe');

      // Check audit log was recorded
      const auditLog = await db('audit_logs')
        .where({ entity: 'company_settings', action: 'UPDATE_COMPANY_SETTINGS' })
        .orderBy('id', 'desc')
        .first();
      expect(auditLog).toBeDefined();

      // Check public branding reflects the updated company name
      const publicRes = await request(app).get('/api/v1/public/branding');
      expect(publicRes.body.data.company_name).toBe('Acme Global Enterprises');
      expect(publicRes.body.data.support_email).toBe('support@acmeglobal.com');
    });
  });

  describe('Branding File Upload & Serving', () => {
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG magic header
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);

    it('POST /api/v1/settings/company/logo accepts genuine PNG image', async () => {
      const res = await request(app)
        .post('/api/v1/settings/company/logo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('logo', validPngBuffer, 'company_logo.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logo_url).toMatch(/\/api\/v1\/public\/branding\/file\//);

      // Verify file can be retrieved publicly
      const fileRes = await request(app).get(res.body.data.logo_url);
      expect(fileRes.status).toBe(200);
      expect(fileRes.header['content-type']).toBe('image/png');
    });

    it('POST /api/v1/settings/company/logo rejects spoofed/non-image buffer', async () => {
      const fakeBuffer = Buffer.from('NOT A REAL IMAGE FILE CONTENT');
      const res = await request(app)
        .post('/api/v1/settings/company/logo')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('logo', fakeBuffer, 'malicious.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].field).toBe('logo');
    });

    it('DELETE /api/v1/settings/company/logo clears logo', async () => {
      const res = await request(app)
        .delete('/api/v1/settings/company/logo')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkRes = await request(app)
        .get('/api/v1/settings/company')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkRes.body.data.logo_path).toBeNull();
    });
  });

  describe('Work, Leave Policy & Payroll Settings Tabs', () => {
    it('GET and PUT /api/v1/settings/work', async () => {
      const getRes = await request(app)
        .get('/api/v1/settings/work')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);

      const putRes = await request(app)
        .put('/api/v1/settings/work')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shift_start: '09:00',
          shift_end: '18:00',
          weekly_off_days: [0, 6],
          late_grace_minutes: 15,
          min_hours_full_day: 8,
          min_hours_half_day: 4,
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.shift_start).toBe('09:00');
      expect(putRes.body.data.late_grace_minutes).toBe(15);
    });

    it('GET and PUT /api/v1/settings/leave-policy', async () => {
      const getRes = await request(app)
        .get('/api/v1/settings/leave-policy')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);

      const putRes = await request(app)
        .put('/api/v1/settings/leave-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          free_leave_per_month: 1.5,
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.free_leave_per_month).toBe(1.5);
    });

    it('GET and PUT /api/v1/settings/payroll', async () => {
      const putRes = await request(app)
        .put('/api/v1/settings/payroll')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          pf_percent: 12.0,
          overtime_multiplier: 1.75,
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.overtime_multiplier).toBe(1.75);
    });
  });

  afterAll(async () => {
    // Restore work_settings to default 09:30 - 18:30 for subsequent test suites
    await db('work_settings').update({
      shift_start: '09:30',
      shift_end: '18:30',
      weekly_off_days: JSON.stringify([0, 6]),
      late_grace_minutes: 10,
      min_hours_full_day: 8.0,
      min_hours_half_day: 4.0,
    });
  });
});
