import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app';
import db from '../src/db/knex';
import { hashPassword } from '../src/shared/utils/password.util';
import { offerLettersService } from '../src/modules/offer-letters/offer-letters.service';
import { employeesService } from '../src/modules/employees/employees.service';

const app = createApp();

describe('Phase 2: Offer Letter Management & Lifecycle Tests', () => {
  let adminToken: string;
  let hrToken: string;
  let employeeUserToken: string;
  let otherEmployeeToken: string;

  let testEmployeeId: number;
  let testUserId: number;
  let otherEmployeeId: number;
  let otherUserId: number;
  let defaultTemplateId: number;

  beforeAll(async () => {
    // 1. Admin login
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    adminToken = adminLoginRes.body.data.accessToken;

    // 2. HR login
    const hrLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr@qynova.erp', password: 'Hr@123' });
    hrToken = hrLoginRes.body.data.accessToken;

    // 3. Ensure default template exists
    const templateRes = await request(app)
      .get('/api/v1/offer-letters/templates')
      .set('Authorization', `Bearer ${adminToken}`);
    if (templateRes.body.data && templateRes.body.data.length > 0) {
      defaultTemplateId = templateRes.body.data[0].id;
    }

    // 4. Create test Department & Designation
    let dept = await db('departments').where({ name: 'OfferLetter Engineering' }).first();
    if (!dept) {
      const [id] = await db('departments').insert({
        name: 'OfferLetter Engineering',
        code: 'OLE',
      });
      dept = { id };
    }

    let desig = await db('designations').where({ name: 'Senior Offer Specialist' }).first();
    if (!desig) {
      const [id] = await db('designations').insert({
        name: 'Senior Offer Specialist',
        code: `SOS-${Date.now().toString().slice(-4)}`,
      });
      desig = { id };
    }

    // 5. Create Candidate / Selected Employee
    const empRole = await db('roles').where({ name: 'Employee' }).first();
    const testEmail = `candidate.${Date.now()}@example.com`;
    const pwdHash = await hashPassword('Password@123');

    const [uId] = await db('users').insert({
      email: testEmail,
      password_hash: pwdHash,
      status: 'active',
      must_change_password: true,
    });
    testUserId = Number(uId);

    await db('user_roles').insert({
      user_id: testUserId,
      role_id: empRole.id,
    });

    const [empId] = await db('employees').insert({
      employee_code: `TEST-OFR-${Date.now().toString().slice(-4)}`,
      user_id: testUserId,
      first_name: 'Jane',
      last_name: 'Candidate',
      email: testEmail,
      department_id: dept.id,
      designation_id: desig.id,
      joining_date: '2026-11-01',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'selected',
    });
    testEmployeeId = Number(empId);

    // 6. Create Another Employee (for ownership 403 test)
    const otherEmail = `other.emp.${Date.now()}@example.com`;
    const [oUId] = await db('users').insert({
      email: otherEmail,
      password_hash: pwdHash,
      status: 'active',
      must_change_password: false,
    });
    otherUserId = Number(oUId);
    await db('user_roles').insert({
      user_id: otherUserId,
      role_id: empRole.id,
    });

    const [oEmpId] = await db('employees').insert({
      employee_code: `TEST-OTH-${Date.now().toString().slice(-4)}`,
      user_id: otherUserId,
      first_name: 'Other',
      last_name: 'Employee',
      email: otherEmail,
      joining_date: '2026-10-01',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'active',
    });
    otherEmployeeId = Number(oEmpId);

    // Login as other employee
    const otherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: otherEmail, password: 'Password@123' });
    otherEmployeeToken = otherLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup generated offer letters
    const ids = [testEmployeeId, otherEmployeeId].filter(Boolean);
    if (ids.length > 0) {
      const letters = await db('offer_letters').whereIn('employee_id', ids);
      for (const l of letters) {
        if (l.file_path && fs.existsSync(l.file_path)) {
          try {
            fs.unlinkSync(l.file_path);
          } catch {}
        }
      }
      await db('offer_letters').whereIn('employee_id', ids).delete();
      await db('salary_structures').whereIn('employee_id', ids).delete();
      await db('employees').whereIn('id', ids).delete();
    }
    const uIds = [testUserId, otherUserId].filter(Boolean);
    if (uIds.length > 0) {
      await db('user_roles').whereIn('user_id', uIds).delete();
      await db('users').whereIn('id', uIds).delete();
    }
  });

  it('1. Blocks generation with clear error if salary structure is missing', async () => {
    const res = await request(app)
      .post('/api/v1/offer-letters/generate')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employee_id: testEmployeeId,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'salary_structure' }),
      ])
    );
  });

  it('2. Successfully generates offer letter, fills variables, creates non-empty PDF, and links lifecycle to offer_generated', async () => {
    // Create salary structure for candidate
    await db('salary_structures').insert({
      employee_id: testEmployeeId,
      base_salary: 80000,
      is_annual: false,
      effective_from: '2026-11-01',
    });

    const res = await request(app)
      .post('/api/v1/offer-letters/generate')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employee_id: testEmployeeId,
        template_id: defaultTemplateId,
        work_location: 'Bengaluru Tech Park',
        working_hours: '9:00 AM - 6:00 PM',
        probation_months: 6,
        notice_period_days: 60,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.reference_no).toMatch(/^OFR-\d{4}-\d{4}$/);
    expect(data.status).toBe('generated');
    expect(data.version).toBe(1);
    expect(Number(data.monthly_gross)).toBe(80000);
    expect(Number(data.annual_ctc)).toBe(960000);

    // Verify snapshot immutability
    expect(data.snapshot).toBeDefined();
    expect(data.snapshot.employee_name).toBe('Jane Candidate');
    expect(data.snapshot.work_location).toBe('Bengaluru Tech Park');
    expect(data.snapshot.probation_months).toBe(6);
    expect(data.snapshot.notice_period_days).toBe(60);
    expect(data.snapshot.rendered_html).toContain('Jane Candidate');

    // Verify PDF file exists and is non-empty
    expect(fs.existsSync(data.file_path)).toBe(true);
    const stats = fs.statSync(data.file_path);
    expect(stats.size).toBeGreaterThan(1000);

    // Verify employee lifecycle updated to offer_generated
    const emp = await db('employees').where({ id: testEmployeeId }).first();
    expect(emp.lifecycle_stage).toBe('offer_generated');

    // Verify history recorded
    const history = await db('employee_lifecycle_history')
      .where({ employee_id: testEmployeeId, to_stage: 'offer_generated' })
      .first();
    expect(history).toBeDefined();
  });

  it('3. Regenerating creates version + 1, supersedes old version, and keeps old PDF intact', async () => {
    const res = await request(app)
      .post('/api/v1/offer-letters/generate')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employee_id: testEmployeeId,
        work_location: 'Mumbai Branch',
      });

    expect(res.status).toBe(201);
    const v2 = res.body.data;
    expect(v2.version).toBe(2);
    expect(v2.status).toBe('generated');
    expect(v2.snapshot.work_location).toBe('Mumbai Branch');

    // Verify old version is superseded
    const v1 = await db('offer_letters')
      .where({ employee_id: testEmployeeId, version: 1 })
      .first();
    expect(v1.status).toBe('superseded');
    expect(fs.existsSync(v1.file_path)).toBe(true);
  });

  it('4. Snapshot remains unchanged after the employee profile is subsequently modified', async () => {
    // Modify employee profile
    await db('employees')
      .where({ id: testEmployeeId })
      .update({ first_name: 'Janet', last_name: 'Modified' });

    // Fetch v2 offer letter
    const letter = await offerLettersService.repository.findLatestByEmployeeId(testEmployeeId);
    expect(letter?.snapshot?.employee_name).toBe('Jane Candidate');
  });

  it('5. Blocks login before Onboarding with clear message "Your account is not active yet"', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: (await db('users').where({ id: testUserId }).first()).email,
        password: 'Password@123',
      });

    expect(loginRes.status).toBe(400);
    expect(loginRes.body.message).toBe('Your account is not active yet');
    expect(loginRes.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email', message: 'Your account is not active yet' }),
      ])
    );
  });

  it('6. Send queues email with PDF and updates status to sent', async () => {
    const latest = await offerLettersService.repository.findLatestByEmployeeId(testEmployeeId);
    const sendRes = await request(app)
      .post(`/api/v1/offer-letters/${latest!.id}/send`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({});

    expect(sendRes.status).toBe(200);
    expect(sendRes.body.data.status).toBe('sent');
    expect(sendRes.body.data.sent_at).toBeDefined();

    // Verify outbox queued
    const outbox = await db('email_outbox')
      .where('subject', 'like', '%Offer of Employment%')
      .orderBy('id', 'desc')
      .first();
    expect(outbox).toBeDefined();
    expect(outbox.to).toBe((await db('employees').where({ id: testEmployeeId }).first()).email);
  });

  it('7. Mark Accepted transitions lifecycle to offer_accepted', async () => {
    const latest = await offerLettersService.repository.findLatestByEmployeeId(testEmployeeId);
    const acceptRes = await request(app)
      .post(`/api/v1/offer-letters/${latest!.id}/accept`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({});

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('accepted');

    const emp = await db('employees').where({ id: testEmployeeId }).first();
    expect(emp.lifecycle_stage).toBe('offer_accepted');
  });

  it('8. Moving to Onboarding activates user, sets must_change_password=true, and permits login', async () => {
    // Transition to onboarding
    const updateRes = await request(app)
      .patch(`/api/v1/employees/${testEmployeeId}/lifecycle`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        lifecycle_stage: 'onboarding',
        note: 'Candidate completed pre-hire verification',
      });

    expect(updateRes.status).toBe(200);

    const user = await db('users').where({ id: testUserId }).first();
    expect(user.status).toBe('active');
    expect(user.must_change_password).toBeTruthy();

    // Verify welcome email was queued
    const welcomeMail = await db('email_outbox')
      .where({ event_key: `welcome-onboarding-${testEmployeeId}` })
      .first();
    expect(welcomeMail).toBeDefined();
    expect(welcomeMail.html).toContain('Temporary Password:');

    // Extract temporary password from welcome email HTML
    const match = welcomeMail.html.match(/<code>(.*?)<\/code>/);
    expect(match).toBeTruthy();
    const tempPassword = match![1];

    // Login with temporary password now succeeds
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: user.email,
        password: tempPassword,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.must_change_password).toBe(true);
    employeeUserToken = loginRes.body.data.accessToken;
  });

  it('9. Employee can view and download own offer letter but cannot access other employees letters (403)', async () => {
    // Employee views own offer letter
    const myOfferRes = await request(app)
      .get('/api/v1/offer-letters/my')
      .set('Authorization', `Bearer ${employeeUserToken}`);

    expect(myOfferRes.status).toBe(200);
    expect(myOfferRes.body.data).toBeDefined();
    expect(myOfferRes.body.data.employee_id).toBe(testEmployeeId);

    // Other employee tries to download Jane's offer letter -> 403 Forbidden
    const latest = await offerLettersService.repository.findLatestByEmployeeId(testEmployeeId);
    const forbiddenRes = await request(app)
      .get(`/api/v1/offer-letters/${latest!.id}/download`)
      .set('Authorization', `Bearer ${otherEmployeeToken}`);

    expect(forbiddenRes.status).toBe(403);
  });

  it('10. Enforces the "never move backwards" rule on employee lifecycle transitions', async () => {
    // Employee is currently in onboarding; attempting to move back to candidate or selected fails
    const backwardsRes = await request(app)
      .patch(`/api/v1/employees/${testEmployeeId}/lifecycle`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        lifecycle_stage: 'candidate',
      });

    expect(backwardsRes.status).toBe(400);
    expect(backwardsRes.body.message).toContain('Invalid lifecycle transition');
  });

  it('11. Daily activation cron job moves onboarding employee to active or probation on joining date', async () => {
    // Set joining date to today
    const today = new Date().toISOString().split('T')[0];
    await db('employees').where({ id: testEmployeeId }).update({ joining_date: today });

    const activatedCount = await offerLettersService.activateOnboardingEmployees();
    expect(activatedCount).toBeGreaterThanOrEqual(1);

    const updatedEmp = await db('employees').where({ id: testEmployeeId }).first();
    // Probation months was 6, so target stage is probation
    expect(updatedEmp.lifecycle_stage).toBe('probation');
  });

  it('12. HTML sanitization strips malicious script tags from custom body HTML', async () => {
    const maliciousHtml = '<p>Normal text</p><script>alert("hacked")</script><img src="x" onerror="stealCookie()" />';
    const tpl = await offerLettersService.createTemplate(
      {
        name: 'Sanitize Test Template',
        subject: 'Sanitize Subject',
        body_html: maliciousHtml,
        is_default: false,
      },
      testUserId
    );

    expect(tpl.body_html).not.toContain('<script>');
    expect(tpl.body_html).not.toContain('onerror');
    await offerLettersService.deleteTemplate(tpl.id, testUserId);
  });
});
