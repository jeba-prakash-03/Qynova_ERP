import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Expenses, Invoices, Payments, Profitability Module (Task 4)', () => {
  let adminToken: string;
  let managerToken: string;
  let employeeToken: string;
  let internToken: string;
  let projectId: number;
  let clientId: number;
  let devId: number;
  let managerId: number;

  beforeAll(async () => {
    await db('login_attempts').truncate();

    const [adminLogin, managerLogin, empLogin, internLogin] = await Promise.all([
      request(app).post('/api/v1/auth/login').send({ email: 'admin@qynova.erp', password: 'Admin@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'manager@qynova.erp', password: 'Manager@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'employee@qynova.erp', password: 'Employee@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'intern@qynova.erp', password: 'Intern@123' }),
    ]);

    adminToken = adminLogin.body?.data?.accessToken;
    managerToken = managerLogin.body?.data?.accessToken;
    employeeToken = empLogin.body?.data?.accessToken;
    internToken = internLogin.body?.data?.accessToken;

    const proj = await db('projects').where({ project_code: 'PRJ-0001' }).first();
    projectId = proj?.id || 1;

    const client = await db('clients').where({ client_code: 'CL-0001' }).first();
    clientId = client?.id || 1;

    const devEmp = await db('employees').where({ email: 'employee@qynova.erp' }).first();
    const managerEmp = await db('employees').where({ email: 'manager@qynova.erp' }).first();
    devId = devEmp?.id || 2;
    managerId = managerEmp?.id || 1;
  });

  describe('1. Expenses Lifecycle & Self-Approval Prevention', () => {
    let createdExpenseId: number;

    it('should allow employee to submit an expense claim', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          category: 'Software',
          project_id: projectId,
          amount: 4500.0,
          date: '2026-10-12',
          vendor: 'GitHub Enterprise',
          description: 'Copilot seat license for sprint development',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.expense_code).toMatch(/^EXP-\d+$/);
      expect(res.body.data.status).toBe('pending_approval');
      createdExpenseId = res.body.data.id;
    });

    it('should BLOCK employee from approving their own expense (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/expenses/${createdExpenseId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ status: 'approved' });

      // Either 403 because no permission or forbidden self-approval
      expect([400, 403]).toContain(res.status);
    });

    it('should BLOCK manager from approving their own expense submission with 403 naming approved_by', async () => {
      // Manager creates an expense
      const mgrExpRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          category: 'Travel',
          project_id: projectId,
          amount: 3200.0,
          date: '2026-10-12',
          vendor: 'Uber Business',
          description: 'Airport cab to client workshop',
        });

      const mgrExpId = mgrExpRes.body.data.id;

      // Manager tries to approve their own expense
      const approveRes = await request(app)
        .patch(`/api/v1/expenses/${mgrExpId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'approved' });

      expect(approveRes.status).toBe(403);
      expect(approveRes.body.success).toBe(false);
      expect(approveRes.body.message).toContain('approve your own expense');
    });

    it('should allow manager to approve employee expense', async () => {
      const res = await request(app)
        .patch(`/api/v1/expenses/${createdExpenseId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.approved_by).toBe(managerId);
    });

    it('should require rejection_reason when rejecting an expense with 400', async () => {
      // Create new expense
      const newExp = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          category: 'Hardware',
          project_id: projectId,
          amount: 25000.0,
          date: '2026-10-12',
          vendor: 'Croma Retail',
          description: '4K external display',
        });

      const rejectRes = await request(app)
        .patch(`/api/v1/expenses/${newExp.body.data.id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'rejected' }); // missing rejection_reason

      expect(rejectRes.status).toBe(400);
      expect(JSON.stringify(rejectRes.body)).toContain('rejection_reason');
    });
  });

  describe('2. Invoices & Milestone Integration', () => {
    let createdInvoiceId: number;

    it('should create an invoice from a completed milestone', async () => {
      // Find completed milestone
      const milestone = await db('project_milestones')
        .where({ project_id: projectId, status: 'completed' })
        .first();

      if (!milestone) {
        // Mark one completed
        await db('project_milestones')
          .where({ project_id: projectId })
          .first()
          .update({ status: 'completed' });
      }

      const activeMilestone = await db('project_milestones')
        .where({ project_id: projectId, status: 'completed' })
        .first();

      // Check if invoice already exists for it; if so, create a fresh completed milestone
      const [newMilestoneId] = await db('project_milestones').insert({
        project_id: projectId,
        title: 'Phase 2 Cloud Deployment & Hardening',
        due_date: '2026-10-31',
        amount: 250000.0,
        status: 'completed',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/from-milestone/${newMilestoneId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice_number).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(Number(res.body.data.subtotal)).toBe(250000.0);
      expect(Number(res.body.data.total)).toBe(295000.0); // 250k + 18% GST (45k) = 295k
      expect(res.body.data.status).toBe('draft');
      createdInvoiceId = res.body.data.id;
    });

    it('should stream generated Invoice PDF with application/pdf header', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${createdInvoiceId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body.length).toBeGreaterThan(100);
    });
  });

  describe('3. Payments & Overpayment Protection (In DB Transaction)', () => {
    let testInvoiceId: number;
    const testTotal = 118000.0; // 100k + 18k GST

    beforeAll(async () => {
      const invRes = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          client_id: clientId,
          project_id: projectId,
          issue_date: '2026-10-10',
          due_date: '2026-10-25',
          tax_percent: 18.0,
          items: [
            {
              description: 'Sprint 1 Payment Testing Package',
              quantity: 1,
              unit_price: 100000.0,
            },
          ],
        });
      testInvoiceId = invRes.body.data.id;
    });

    it('should record partial payment and transition invoice status to partially_paid', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${testInvoiceId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 50000.0,
          payment_date: '2026-10-11',
          method: 'bank_transfer',
          reference: 'UTR-11223344',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.invoice.amount_paid)).toBe(50000.0);
      expect(res.body.data.invoice.status).toBe('partially_paid');
    });

    it('should BLOCK overpayment with 400 naming amount field', async () => {
      // Remaining is 118000 - 50000 = 68000. Trying to pay 70000
      const res = await request(app)
        .post(`/api/v1/invoices/${testInvoiceId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 70000.0,
          payment_date: '2026-10-12',
          method: 'bank_transfer',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('amount');
    });

    it('should clear remaining balance and transition invoice status to paid in one transaction', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${testInvoiceId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 68000.0,
          payment_date: '2026-10-12',
          method: 'bank_transfer',
          reference: 'UTR-55667788',
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.data.invoice.amount_paid)).toBe(testTotal);
      expect(res.body.data.invoice.status).toBe('paid');
      expect(res.body.data.invoice.balance_due).toBe(0);
    });
  });

  describe('4. Project Profitability & RBAC Cost Shielding', () => {
    it('should allow Admin to fetch project profitability metrics', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/profitability`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('revenue');
      expect(res.body.data).toHaveProperty('labor_cost');
      expect(res.body.data).toHaveProperty('project_expenses');
      expect(res.body.data).toHaveProperty('profit');
      expect(res.body.data).toHaveProperty('budget_used_percent');
      expect(Array.isArray(res.body.data.labor_breakdown)).toBe(true);
    });

    it('should BLOCK standard employee without projects.view_financials from viewing profitability (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/profitability`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('projects.view_financials');
    });

    it('should return financial overview metrics for authorized users', async () => {
      const res = await request(app)
        .get('/api/v1/finance/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total_revenue');
      expect(res.body.data).toHaveProperty('total_expenses');
      expect(res.body.data).toHaveProperty('pending_invoices_amount');
      expect(Array.isArray(res.body.data.monthly_trend)).toBe(true);
    });
  });
});
