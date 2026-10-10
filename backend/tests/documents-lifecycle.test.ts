import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Documents & Employee Lifecycle — Stage 2 (Dev 1)', () => {
  let adminToken: string;
  let hrToken: string;
  let employeeToken: string;
  let managerToken: string;
  let employeeId: number;
  let managerEmployeeId: number;
  let testCandidateId: number;

  beforeAll(async () => {
    // 1. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    adminToken = adminLogin.body.data.accessToken;

    // 2. HR login
    const hrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr@qynova.erp', password: 'Hr@123' });
    hrToken = hrLogin.body.data.accessToken;

    // 3. Employee login
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    employeeToken = empLogin.body?.data?.accessToken;
    employeeId = empLogin.body?.data?.user?.employee?.id || 1;

    // 4. Manager login
    const mgrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@qynova.erp', password: 'Manager@123' });
    managerToken = mgrLogin.body?.data?.accessToken;
    managerEmployeeId = mgrLogin.body?.data?.user?.employee?.id || 1;

    // Create a fresh test candidate employee for lifecycle transitions
    const empRole = await db('roles').where({ name: 'Employee' }).first();
    const roleId = Number(empRole.id);

    const createdRes = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        first_name: 'Test',
        last_name: 'Candidate',
        email: `candidate.${Date.now()}@qynova.erp`,
        joining_date: '2026-11-01',
        employment_type: 'full_time',
        lifecycle_stage: 'candidate',
        role_id: roleId,
      });

    if (createdRes.status !== 201) {
      console.error('Candidate creation error:', createdRes.status, createdRes.body);
    }

    testCandidateId = createdRes.body?.data?.employee?.id;
  });

  describe('1. Lifecycle Transition Rules & Sequence', () => {
    it('should reject invalid jumps with 400 Bad Request', async () => {
      // Trying to jump from candidate straight to active
      const res = await request(app)
        .patch(`/api/v1/employees/${testCandidateId}/lifecycle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          lifecycle_stage: 'active',
          note: 'Invalid direct jump attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid lifecycle transition/i);
    });

    it('should allow valid transitions: candidate -> selected -> offer_generated -> offer_accepted', async () => {
      // 1. candidate -> selected
      const step1 = await request(app)
        .patch(`/api/v1/employees/${testCandidateId}/lifecycle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lifecycle_stage: 'selected', note: 'Selected in interviews' });
      expect(step1.status).toBe(200);
      expect(step1.body.data.lifecycle_stage).toBe('selected');

      // 2. selected -> offer_generated
      const step2 = await request(app)
        .patch(`/api/v1/employees/${testCandidateId}/lifecycle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lifecycle_stage: 'offer_generated', note: 'Offer letter prepared' });
      expect(step2.status).toBe(200);
      expect(step2.body.data.lifecycle_stage).toBe('offer_generated');

      // 3. offer_generated -> offer_accepted
      const step3 = await request(app)
        .patch(`/api/v1/employees/${testCandidateId}/lifecycle`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lifecycle_stage: 'offer_accepted', note: 'Candidate signed offer' });
      expect(step3.status).toBe(200);
      expect(step3.body.data.lifecycle_stage).toBe('offer_accepted');
    });

    it('should record transitions in employee_lifecycle_history table', async () => {
      const historyRes = await request(app)
        .get(`/api/v1/employees/${testCandidateId}/lifecycle-history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.length).toBeGreaterThanOrEqual(3);
      expect(historyRes.body.data[0].to_stage).toBe('offer_accepted');
      expect(historyRes.body.data[0].from_stage).toBe('offer_generated');
    });

    it('should set employees.status = inactive and users.status = disabled on relieved', async () => {
      // Advance step-by-step to relieved:
      // offer_accepted -> onboarding -> active -> probation -> confirmed -> resigned -> notice_period -> relieved
      const stages = [
        'onboarding',
        'active',
        'probation',
        'confirmed',
        'resigned',
        'notice_period',
        'relieved',
      ];

      for (const st of stages) {
        const stepRes = await request(app)
          .patch(`/api/v1/employees/${testCandidateId}/lifecycle`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ lifecycle_stage: st, note: `Advancing to ${st}` });
        expect(stepRes.status).toBe(200);
      }

      // Check DB values for relieved employee
      const emp = await db('employees').where({ id: testCandidateId }).first();
      expect(emp.status).toBe('inactive');
      expect(emp.lifecycle_stage).toBe('relieved');

      const user = await db('users').where({ id: emp.user_id }).first();
      expect(user.status).toBe('disabled');
    });
  });

  describe('2. Document Upload & Access Control', () => {
    let dummyPdfPath: string;
    let uploadedAadhaarId: number;
    let uploadedResumeId: number;

    beforeAll(() => {
      // Create a temporary dummy pdf file for testing
      dummyPdfPath = path.join(__dirname, 'dummy_test_doc.pdf');
      fs.writeFileSync(dummyPdfPath, '%PDF-1.4 Dummy test content');
    });

    afterAll(() => {
      if (fs.existsSync(dummyPdfPath)) {
        fs.unlinkSync(dummyPdfPath);
      }
    });

    it('should upload a sensitive document (aadhaar) for employee', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${employeeId}/documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('type', 'aadhaar')
        .attach('file', dummyPdfPath);

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('aadhaar');
      uploadedAadhaarId = res.body.data.id;
    });

    it('should upload a general document (resume) for employee', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${employeeId}/documents`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .field('type', 'resume')
        .attach('file', dummyPdfPath);

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('resume');
      uploadedResumeId = res.body.data.id;
    });

    it('should allow the owner and Admin/HR to view and download sensitive documents', async () => {
      // 1. Owner employee downloading their own Aadhaar
      const ownerRes = await request(app)
        .get(`/api/v1/documents/${uploadedAadhaarId}/download`)
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(ownerRes.status).toBe(200);

      // 2. Admin downloading the Aadhaar
      const adminRes = await request(app)
        .get(`/api/v1/documents/${uploadedAadhaarId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
    });

    it('should block non-owner/manager from downloading sensitive documents (aadhaar)', async () => {
      // Manager attempting to download employee Aadhaar -> 403 Forbidden
      const res = await request(app)
        .get(`/api/v1/documents/${uploadedAadhaarId}/download`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/sensitive documents/i);
    });

    it('should filter out sensitive documents from employee document list for non-HR/non-owner', async () => {
      // Manager listing employee documents
      const res = await request(app)
        .get(`/api/v1/employees/${employeeId}/documents`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const types = res.body.data.map((d: any) => d.type);
      expect(types).not.toContain('aadhaar');
      expect(types).toContain('resume');
    });

    it('should delete a document and create an audit log', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/documents/${uploadedResumeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify audit log
      const audit = await db('audit_logs')
        .where({ action: 'documents.delete', entity_id: uploadedResumeId })
        .first();
      expect(audit).toBeDefined();
    });
  });

  describe('3. Offer Letter PDF Generation', () => {
    it('should generate an offer letter PDF and store it as employee document', async () => {
      const res = await request(app)
        .post(`/api/v1/employees/${employeeId}/generate-offer-letter`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          designation_name: 'Lead Senior Architect',
          joining_date: '2026-12-01',
          salary_ctc: '₹24,00,000 / annum (INR)',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('offer_letter');
      expect(res.body.data.mime_type).toBe('application/pdf');

      // Verify download of the generated PDF
      const downloadRes = await request(app)
        .get(`/api/v1/documents/${res.body.data.id}/download`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-type']).toBe('application/pdf');
    });
  });
});
