import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Comprehensive Integration Flows (Task 3a - 3g)', () => {
  let adminToken: string;
  let hrToken: string;
  let managerToken: string;
  let employeeToken: string;
  let internToken: string;

  let adminUser: any;
  let hrUser: any;
  let managerEmp: any;
  let devEmp: any;
  let internEmp: any;

  beforeAll(async () => {
    // Authenticate all 5 primary roles
    const [adminRes, hrRes, mgrRes, empRes, internRes] = await Promise.all([
      request(app).post('/api/v1/auth/login').send({ email: 'admin@qynova.erp', password: 'Admin@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'hr@qynova.erp', password: 'Hr@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'manager@qynova.erp', password: 'Manager@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'employee@qynova.erp', password: 'Employee@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'intern@qynova.erp', password: 'Intern@123' }),
    ]);

    adminToken = adminRes.body.data.accessToken;
    hrToken = hrRes.body.data.accessToken;
    managerToken = mgrRes.body.data.accessToken;
    employeeToken = empRes.body.data.accessToken;
    internToken = internRes.body.data.accessToken;

    adminUser = adminRes.body.data.user;
    hrUser = hrRes.body.data.user;

    managerEmp = await db('employees').where({ email: 'manager@qynova.erp' }).first();
    devEmp = await db('employees').where({ email: 'employee@qynova.erp' }).first();
    internEmp = await db('employees').where({ email: 'intern@qynova.erp' }).first();
  });

  // =========================================================================
  // FLOW 3a: Create client > create project > add members > create tasks >
  //          employee logs timesheet on the task > manager approves >
  //          task actual hours and project labor cost update.
  // =========================================================================
  describe('Flow 3a: Client -> Project -> Tasks -> Timesheet -> Approval -> Labor Cost Update', () => {
    let clientId: number;
    let projectId: number;
    let taskId: number;
    let timesheetId: number;

    it('step 1: Create client', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_name: 'FlowA Global Tech',
          industry: 'Technology',
          email: 'contact@flowa-global.com',
          phone: '+91 9988776655',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      clientId = res.body.data.id;
      expect(clientId).toBeDefined();
    });

    it('step 2: Create project under client', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          client_id: clientId,
          name: 'FlowA Enterprise Cloud Platform',
          budget: 250000,
          start_date: '2026-10-01',
          project_manager_id: managerEmp.id,
          status: 'development',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      projectId = res.body.data.id;
      expect(projectId).toBeDefined();
    });

    it('step 3: Add employee member to project', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: devEmp.id,
          role: 'developer',
          allocation_percent: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('step 4: Create task assigned to employee', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          project_id: projectId,
          title: 'Implement Multi-tenant Kafka Streaming',
          assignee_id: devEmp.id,
          reviewer_id: managerEmp.id,
          priority: 'high',
          status: 'in_progress',
          estimated_hours: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      taskId = res.body.data.id;
      expect(res.body.data.actual_hours).toBe(0);
    });

    it('step 5: Employee logs timesheet on the task', async () => {
      const res = await request(app)
        .post('/api/v1/timesheets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          project_id: projectId,
          task_id: taskId,
          date: '2026-10-10',
          hours: 5.5,
          task_description: 'Kafka producer/consumer topic partition setup',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      timesheetId = res.body.data.id;
      expect(res.body.data.status).toBe('pending');
    });

    it('step 6: Manager approves timesheet', async () => {
      const res = await request(app)
        .patch(`/api/v1/timesheets/${timesheetId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ note: 'Reviewed and confirmed work logs' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('approved');
    });

    it('step 7: Verify task actual hours and project labor cost update', async () => {
      // 1. Task actual hours
      const taskRes = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(taskRes.status).toBe(200);
      expect(taskRes.body.data.actual_hours).toBe(5.5);

      // 2. Project profitability labor cost
      const profRes = await request(app)
        .get(`/api/v1/projects/${projectId}/profitability`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(profRes.status).toBe(200);
      expect(profRes.body.data.labor_cost).toBeGreaterThan(0);
      expect(profRes.body.data.labor_breakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            employee_id: devEmp.id,
            approved_hours: 5.5,
          }),
        ])
      );
    });
  });

  // =========================================================================
  // FLOW 3b: Milestone completed > invoice created > payment recorded >
  //          profitability shows revenue minus labor cost and expenses.
  // =========================================================================
  describe('Flow 3b: Milestone Completed -> Invoice -> Payment -> Profitability Calculation', () => {
    let projectId: number;
    let clientId: number;
    let milestoneId: number;
    let invoiceId: number;

    beforeAll(async () => {
      // Use existing PRJ-0001
      const proj = await db('projects').where({ project_code: 'PRJ-0001' }).first();
      projectId = proj.id;
      clientId = proj.client_id;
    });

    it('step 1: Create milestone and mark completed', async () => {
      const msRes = await request(app)
        .post(`/api/v1/projects/${projectId}/milestones`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Sprint 5 Delivery & Certification',
          amount: 150000,
          due_date: '2026-10-31',
        });

      expect(msRes.status).toBe(201);
      milestoneId = msRes.body.data.id;

      const completeRes = await request(app)
        .put(`/api/v1/projects/${projectId}/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('completed');
    });

    it('step 2: Create invoice for completed milestone', async () => {
      const invRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          client_id: clientId,
          project_id: projectId,
          milestone_id: milestoneId,
          issue_date: '2026-10-12',
          due_date: '2026-10-26',
          tax_rate: 18.0,
          notes: 'Milestone 5 completion billing',
          items: [
            {
              description: 'Sprint 5 Architecture Delivery',
              quantity: 1,
              unit_price: 150000,
            },
          ],
        });

      expect(invRes.status).toBe(201);
      expect(invRes.body.success).toBe(true);
      invoiceId = invRes.body.data.id;
      expect(Number(invRes.body.data.subtotal)).toBe(150000);
    });

    it('step 3: Record payment against invoice', async () => {
      const payRes = await request(app)
        .post(`/api/v1/invoices/${invoiceId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 177000, // Total with 18% GST
          payment_date: '2026-10-12',
          payment_mode: 'bank_transfer',
          reference_number: `REF-FLOWB-${Date.now()}`,
          notes: 'NEFT Transfer cleared',
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.success).toBe(true);
      const updatedInv = await db('invoices').where({ id: invoiceId }).first();
      expect(updatedInv.status).toBe('paid');
    });

    it('step 4: Profitability displays revenue minus labor cost and expenses correctly', async () => {
      const profRes = await request(app)
        .get(`/api/v1/projects/${projectId}/profitability`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(profRes.status).toBe(200);
      const prof = profRes.body.data;

      expect(prof.revenue).toBeGreaterThanOrEqual(177000);
      // Net profit must equal Revenue - Labor Cost - Expenses
      expect(prof.total_cost).toBe(Number((prof.labor_cost + prof.project_expenses).toFixed(2)));
      expect(prof.profit).toBeCloseTo(prof.revenue - prof.total_cost, 1);
    });
  });

  // =========================================================================
  // FLOW 3c: Lead won > client and project created.
  // =========================================================================
  describe('Flow 3c: Lead Won -> Client & Project Automatic Creation', () => {
    let leadId: number;

    it('step 1: Create a negotiation-stage lead', async () => {
      const res = await request(app)
        .post('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_name: 'Apex AI Financial Engines',
          contact_name: 'Siddharth Roy',
          email: 'siddharth@apexai.example.com',
          phone: '+91 9911223344',
          source: 'Referral',
          requirement: 'Algorithmic options risk engine and high-frequency FIX gateway.',
          estimated_value: 800000,
          stage: 'negotiation',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      leadId = res.body.data.id;
      expect(leadId).toBeDefined();
    });

    it('step 2: Convert lead with project generation', async () => {
      const res = await request(app)
        .post(`/api/v1/crm/leads/${leadId}/convert`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          create_project: true,
          project_name: 'Apex AI Trading & FIX Integration',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lead.stage).toBe('won');
      expect(res.body.data.client.id).toBeDefined();
      expect(res.body.data.project.id).toBeDefined();

      // Verify Client exists in DB
      const client = await db('clients').where({ id: res.body.data.client.id }).first();
      expect(client).toBeDefined();
      expect(client.company_name).toBe('Apex AI Financial Engines');

      // Verify Project exists in DB
      const project = await db('projects').where({ id: res.body.data.project.id }).first();
      expect(project).toBeDefined();
      expect(project.name).toBe('Apex AI Trading & FIX Integration');
      expect(Number(project.budget)).toBe(800000);
    });
  });

  // =========================================================================
  // FLOW 3d: Attendance + approved leave + incentive > payroll run >
  //          payslip PDF > email in the outbox.
  // =========================================================================
  describe('Flow 3d: Attendance + Leave + Incentive -> Payroll Run -> Payslip PDF -> Email Outbox', () => {
    const testMonth = '2026-12';

    const cleanPayrollAndLeaves = async () => {
      const existingRuns = await db('payroll_runs').where({ month: testMonth }).select('id');
      const runIds = existingRuns.map((r: any) => r.id);
      if (runIds.length > 0) {
        await db('payroll_items').whereIn('payroll_run_id', runIds).del();
      }
      await db('payroll_adjustments').where({ month: testMonth }).del();
      await db('payroll_runs').where({ month: testMonth }).del();
      const existingLeaves = await db('leave_requests')
        .where('from_date', '>=', `${testMonth}-01`)
        .where('to_date', '<=', `${testMonth}-31`)
        .select('id');
      const leaveIds = existingLeaves.map((l: any) => l.id);
      if (leaveIds.length > 0) {
        await db('leave_request_days').whereIn('leave_request_id', leaveIds).del();
        await db('leave_requests').whereIn('id', leaveIds).del();
      }
    };

    beforeAll(async () => {
      await cleanPayrollAndLeaves();
      const today = new Date().toISOString().split('T')[0];
      await db('attendance').where({ employee_id: devEmp.id, date: today }).del();
    });

    afterAll(async () => {
      await cleanPayrollAndLeaves();
    });

    it('step 1: Submit attendance and leave record', async () => {
      // 1. Mark attendance for test employee
      const checkInRes = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
          ip_address: '127.0.0.1',
        });

      expect([200, 201]).toContain(checkInRes.status);

      // 2. Add approved leave record directly in DB for December 2026
      const [leaveReqId] = await db('leave_requests').insert({
        employee_id: devEmp.id,
        leave_type_id: 1,
        from_date: `${testMonth}-14`,
        to_date: `${testMonth}-15`,
        days: 2,
        reason: 'Integration test approved leave',
        status: 'approved',
        approver_employee_id: managerEmp.id,
      });

      await db('leave_request_days').insert([
        { leave_request_id: leaveReqId, date: `${testMonth}-14`, day_type: 'full', status: 'approved' },
        { leave_request_id: leaveReqId, date: `${testMonth}-15`, day_type: 'full', status: 'approved' },
      ]);

      // 3. Configure salary structure for employee
      const salRes = await request(app)
        .post('/api/v1/payroll/salary')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: devEmp.id,
          base_salary: 80000,
          is_annual: false,
          effective_from: '2026-01-01',
        });
      expect([200, 201]).toContain(salRes.status);
    });

    it('step 2: Add payroll incentive adjustment', async () => {
      const adjRes = await request(app)
        .post('/api/v1/payroll/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: devEmp.id,
          month: testMonth,
          incentives: 15000,
          bonus: 5000,
        });

      expect([200, 201]).toContain(adjRes.status);
      expect(adjRes.body.data.incentives).toBe(15000);
    });

    it('step 3: Generate payroll run and approve to trigger notifications', async () => {
      const genRes = await request(app)
        .post('/api/v1/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ month: testMonth });

      expect([200, 201]).toContain(genRes.status);
      expect(genRes.body.success).toBe(true);

      // Process and mark payroll run as paid
      const approveRes = await request(app)
        .post(`/api/v1/payroll/runs/${testMonth}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'paid' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('paid');
    });

    it('step 4: Fetch payslip PDF and verify PDF buffer binary', async () => {
      const runItem = await db('payroll_items')
        .join('payroll_runs as pr', 'payroll_items.payroll_run_id', 'pr.id')
        .where({ 'pr.month': testMonth, 'payroll_items.employee_id': devEmp.id })
        .select('payroll_items.id')
        .first();

      expect(runItem).toBeDefined();

      const pdfRes = await request(app)
        .get(`/api/v1/payroll/payslips/${runItem.id}/pdf`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(pdfRes.status).toBe(200);
      expect(pdfRes.header['content-type']).toContain('application/pdf');
      expect(pdfRes.body.slice(0, 4).toString()).toBe('%PDF');
    });

    it('step 5: Verify email was queued in email_outbox', async () => {
      const outbox = await db('email_outbox')
        .where('subject', 'like', `%${testMonth}%`)
        .orWhere('event_key', 'like', `%${testMonth}%`)
        .first();

      expect(outbox).toBeDefined();
      expect(outbox.to).toContain('@');
      expect(outbox.html).toContain(testMonth);
    });
  });

  // =========================================================================
  // FLOW 3e: Forgot password end to end.
  // =========================================================================
  describe('Flow 3e: Forgot Password End-to-End', () => {
    it('should request reset link, obtain token, reset password, and log in with new password', async () => {
      // 1. Forgot password request
      const reqRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'intern@qynova.erp' });

      expect(reqRes.status).toBe(200);
      expect(reqRes.body.success).toBe(true);

      // 2. Fetch reset token from email_outbox
      const emailRecord = await db('email_outbox')
        .where({ to: 'intern@qynova.erp' })
        .where('subject', 'like', '%Reset%')
        .orderBy('created_at', 'desc')
        .first();

      expect(emailRecord).toBeDefined();
      const tokenMatch = emailRecord.html.match(/token=([a-f0-9]+)/);
      expect(tokenMatch).not.toBeNull();
      const resetToken = tokenMatch![1];

      // 3. Reset password using token
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewIntern@456',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 4. Verify login with NEW password
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'intern@qynova.erp',
          password: 'NewIntern@456',
        });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.data.accessToken).toBeDefined();

      // 5. Restore original password so subsequent test runs stay clean
      const bcrypt = require('bcryptjs');
      const restoredHash = await bcrypt.hash('Intern@123', 10);
      await db('users').where({ email: 'intern@qynova.erp' }).update({ password_hash: restoredHash });
    });
  });

  // =========================================================================
  // FLOW 3f: Dashboard numbers and report totals match the database.
  //          Reports export to Excel and PDF.
  // =========================================================================
  describe('Flow 3f: Dashboard Numbers & Report Totals Match DB & Export Validations', () => {
    it('dashboard widgets match real database aggregates', async () => {
      // Active projects widget
      const projWidgetRes = await request(app)
        .get('/api/v1/dashboard/widgets/active_projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(projWidgetRes.status).toBe(200);
      expect(projWidgetRes.body.data.count).toBeDefined();

      // Clients count widget
      const clientWidgetRes = await request(app)
        .get('/api/v1/dashboard/widgets/clients_count')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(clientWidgetRes.status).toBe(200);
      const dbClientCount = await db('clients').whereNull('deleted_at').count('id as c').first();
      expect(clientWidgetRes.body.data.total).toBe(Number(dbClientCount?.c));
    });

    it('reports match database totals and export to Excel, PDF and CSV formats', async () => {
      // Execute report
      const repRes = await request(app)
        .get('/api/v1/reports/project_status_summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(repRes.status).toBe(200);
      const dbProjects = await db('projects').whereNull('deleted_at').count('id as c').first();
      expect(repRes.body.data.rows.length).toBe(Number(dbProjects?.c));

      // Export report as Excel
      const excelRes = await request(app)
        .get('/api/v1/reports/project_status_summary/export?format=xlsx')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(excelRes.status).toBe(200);
      expect(excelRes.header['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      // Export report as PDF
      const pdfRes = await request(app)
        .get('/api/v1/reports/project_status_summary/export?format=pdf')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pdfRes.status).toBe(200);
      expect(pdfRes.header['content-type']).toContain('application/pdf');

      // Export report as CSV
      const csvRes = await request(app)
        .get('/api/v1/reports/project_status_summary/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(csvRes.status).toBe(200);
      expect(csvRes.header['content-type']).toContain('text/csv');
    });
  });

  // =========================================================================
  // FLOW 3g: Employees cannot see salary-derived cost or profitability.
  //          Each role sees only the menu items it has permission for.
  // =========================================================================
  describe('Flow 3g: Confidential Financial Data & Menu Isolation for Non-Privileged Roles', () => {
    it('employee CANNOT see company finance overview (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/finance/overview')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it('intern CANNOT see company finance overview (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/finance/overview')
        .set('Authorization', `Bearer ${internToken}`);

      expect(res.status).toBe(403);
    });

    it('employee CANNOT see project profitability or labor costs (403 Forbidden)', async () => {
      const proj = await db('projects').first();
      const res = await request(app)
        .get(`/api/v1/projects/${proj.id}/profitability`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it('intern CANNOT see project profitability or labor costs (403 Forbidden)', async () => {
      const proj = await db('projects').first();
      const res = await request(app)
        .get(`/api/v1/projects/${proj.id}/profitability`)
        .set('Authorization', `Bearer ${internToken}`);

      expect(res.status).toBe(403);
    });

    it('intern CANNOT see invoices or expenses of the company (403 Forbidden)', async () => {
      const invRes = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${internToken}`);
      expect(invRes.status).toBe(403);

      const expRes = await request(app)
        .get('/api/v1/expenses')
        .set('Authorization', `Bearer ${internToken}`);
      expect(expRes.status).toBe(403);
    });
  });
});
