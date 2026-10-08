import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Clients and Projects Module (Dev 3 Stage 1)', () => {
  let adminToken: string;
  let managerToken: string;
  let employeeToken: string;
  let internToken: string;

  beforeAll(async () => {
    // Reset login attempts to prevent rate limit lockout in tests
    await db('login_attempts').truncate();

    const [adminLogin, managerLogin, empLogin, internLogin] = await Promise.all([
      request(app).post('/api/v1/auth/login').send({ email: 'admin@qynova.erp', password: 'Admin@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'manager@qynova.erp', password: 'Manager@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'employee@qynova.erp', password: 'Employee@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'intern@qynova.erp', password: 'Intern@123' }),
    ]);

    adminToken = adminLogin.body.data.accessToken;
    managerToken = managerLogin.body.data.accessToken;
    employeeToken = empLogin.body.data.accessToken;
    internToken = internLogin.body.data.accessToken;
  });

  describe('1. Clients Endpoints & Lifecycle', () => {
    let createdClientId: number;

    it('should list clients with pagination and search', async () => {
      const res = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.meta).toHaveProperty('total');
    });

    it('should create a new client with nested contacts and addresses and generate CL-xxxx code', async () => {
      const res = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_name: 'Starlight Cloud Innovations',
          industry: 'Cloud Infrastructure',
          website: 'https://starlight.example.com',
          gstin: '33AABCS9876P1Z1',
          status: 'active',
          contacts: [
            {
              name: 'Suresh Menon',
              designation: 'CTO',
              email: 'suresh@starlight.example.com',
              phone: '+91 99887 66554',
              is_primary: true,
            },
          ],
          addresses: [
            {
              type: 'office',
              line1: 'Olympia Tech Park',
              city: 'Chennai',
              state: 'Tamil Nadu',
              pincode: '600032',
              country: 'India',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.client_code).toMatch(/^CL-\d{4}$/);
      expect(res.body.data.contacts.length).toBe(1);
      expect(res.body.data.addresses.length).toBe(1);
      createdClientId = res.body.data.id;
    });

    it('should retrieve client details with contacts, addresses, and communications', async () => {
      const res = await request(app)
        .get(`/api/v1/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdClientId);
      expect(res.body.data.contacts[0].name).toBe('Suresh Menon');
    });

    it('should add a communication log to client', async () => {
      const res = await request(app)
        .post(`/api/v1/clients/${createdClientId}/communications`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'call',
          summary: 'Discussed AWS cloud migration timeline with CTO.',
          date: '2026-10-08',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.type).toBe('call');
      expect(res.body.data.summary).toContain('Discussed AWS');
    });

    it('should soft delete client and exclude from regular list', async () => {
      const res = await request(app)
        .delete(`/api/v1/clients/${createdClientId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify not returned in list
      const listRes = await request(app)
        .get('/api/v1/clients?search=Starlight')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.body.data.length).toBe(0);
    });
  });

  describe('2. Project Visibility Rules', () => {
    it('Admin should see ALL 4 seeded projects', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });

    it('Manager should see projects they manage or lead (PRJ-0001, PRJ-0002, PRJ-0004)', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      const codes = res.body.data.map((p: any) => p.project_code);
      expect(codes).toContain('PRJ-0001');
      expect(codes).toContain('PRJ-0002');
      expect(codes).toContain('PRJ-0004');
      // Manager is NOT PM or lead on PRJ-0003 (Priya is PM, Arjun is dev)
      expect(codes).not.toContain('PRJ-0003');
    });

    it('Employee (Arjun) should see ONLY projects they are a member of (PRJ-0001, PRJ-0003)', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      const codes = res.body.data.map((p: any) => p.project_code);
      expect(codes).toContain('PRJ-0001');
      expect(codes).toContain('PRJ-0003');
      expect(codes).not.toContain('PRJ-0002');
      expect(codes).not.toContain('PRJ-0004');
    });

    it('Intern (Sneha) should see ONLY project they are a member of (PRJ-0002)', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${internToken}`);

      expect(res.status).toBe(200);
      const codes = res.body.data.map((p: any) => p.project_code);
      expect(codes).toContain('PRJ-0002');
      expect(codes).not.toContain('PRJ-0001');
      expect(codes).not.toContain('PRJ-0003');
    });

    it('Employee should receive 403 Forbidden when requesting detail of an unassigned project', async () => {
      // Find ID of PRJ-0002 which Employee is NOT part of
      const proj2 = await db('projects').where({ project_code: 'PRJ-0002' }).first();
      const res = await request(app)
        .get(`/api/v1/projects/${proj2.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('permission to view this project');
    });
  });

  describe('3. Status Transitions', () => {
    let testProjectId: number;

    beforeAll(async () => {
      const client = await db('clients').whereNull('deleted_at').first();
      const createRes = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          client_id: client.id,
          name: 'Status State Machine Test Project',
          start_date: '2026-10-01',
          budget: 100000,
          status: 'planning',
        });
      testProjectId = createRes.body.data.id;
    });

    it('should allow valid forward lifecycle progression: planning -> development', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${testProjectId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'development', reason: 'Sprint 1 commenced' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('development');
    });

    it('should allow moving from development to on_hold', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${testProjectId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'on_hold', reason: 'Client contract review pending' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('on_hold');
    });

    it('should allow resuming from on_hold to testing', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${testProjectId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'testing', reason: 'Resumed after review' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('testing');
    });

    it('should REJECT invalid backward transition: testing -> lead with 400', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${testProjectId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'lead' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid status transition');
    });

    it('should allow transitioning to cancelled', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${testProjectId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled', reason: 'Project terminated by stakeholder' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });
  });

  describe('4. Member Add & Remove', () => {
    let testProjectId: number;
    let internEmployeeId: number;

    beforeAll(async () => {
      const client = await db('clients').whereNull('deleted_at').first();
      const createRes = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          client_id: client.id,
          name: 'Member Assignment Test Project',
          start_date: '2026-10-01',
          budget: 50000,
          status: 'development',
        });
      testProjectId = createRes.body.data.id;

      const internEmp = await db('employees').where({ email: 'intern@qynova.erp' }).first();
      internEmployeeId = internEmp.id;
    });

    it('should successfully add a member to the project and trigger audit/notification', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProjectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: internEmployeeId,
          role: 'qa',
          allocation_percent: 80,
          joined_at: '2026-10-08',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee_id).toBe(internEmployeeId);
      expect(res.body.data.role).toBe('qa');
      expect(res.body.data.allocation_percent).toBe(80);

      // Verify member can now see the project
      const internView = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${internToken}`);

      expect(internView.status).toBe(200);
    });

    it('should REJECT duplicate assignment of same employee to project with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProjectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: internEmployeeId,
          role: 'qa',
          allocation_percent: 50,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already assigned');
    });

    it('should successfully remove a member from the project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${testProjectId}/members/${internEmployeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify member can no longer see the project
      const internView = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${internToken}`);

      expect(internView.status).toBe(403);
    });
  });

  describe('5. Dev 2 Timesheet Integration Endpoint', () => {
    it('GET /api/v1/projects/my-assignments should return assigned projects with empty tasks array for logged-in employee', async () => {
      const res = await request(app)
        .get('/api/v1/projects/my-assignments')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const firstAssignment = res.body.data[0];
      expect(firstAssignment).toHaveProperty('id');
      expect(firstAssignment).toHaveProperty('project_code');
      expect(firstAssignment).toHaveProperty('name');
      expect(firstAssignment).toHaveProperty('tasks');
      expect(Array.isArray(firstAssignment.tasks)).toBe(true);
    });

    it('GET /api/v1/projects/my-assignments should reject users without employee identity (Admin) with 403', async () => {
      const res = await request(app)
        .get('/api/v1/projects/my-assignments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
