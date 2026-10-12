import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('CRM-Lite Module (Task 5)', () => {
  let adminToken: string;
  let employeeToken: string;
  let noCrmToken: string;
  let testLeadId: number;

  beforeAll(async () => {
    await db('login_attempts').truncate();

    // 1. Admin token (all permissions)
    const [adminLogin, empLogin, internLogin] = await Promise.all([
      request(app).post('/api/v1/auth/login').send({ email: 'admin@qynova.erp', password: 'Admin@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'employee@qynova.erp', password: 'Employee@123' }),
      request(app).post('/api/v1/auth/login').send({ email: 'intern@qynova.erp', password: 'Intern@123' }),
    ]);

    adminToken = adminLogin.body.data.accessToken;
    employeeToken = empLogin.body.data.accessToken;
    noCrmToken = internLogin.body.data.accessToken;
  });

  describe('1. Leads CRUD & Field Validations', () => {
    it('should create a lead with auto-generated LD- code and default probability', async () => {
      const res = await request(app)
        .post('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_name: 'Flipkart Internet Private Limited',
          contact_name: 'Ananya Deshmukh',
          email: 'ananya.d@flipkart.example.com',
          phone: '+91 98330 12345',
          source: 'Website',
          requirement: 'Automated warehouse inventory tracking system',
          estimated_value: 1500000.00,
          stage: 'lead',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.lead_code).toMatch(/^LD-\d{4}-\d{4}$/);
      expect(res.body.data.company_name).toBe('Flipkart Internet Private Limited');
      expect(res.body.data.probability_percent).toBe(10); // Default for 'lead'
      expect(Number(res.body.data.estimated_value)).toBe(1500000.00);

      testLeadId = res.body.data.id;
    });

    it('should REJECT lead creation when required company_name is missing naming the field', async () => {
      const res = await request(app)
        .post('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          contact_name: 'Missing Company Person',
          estimated_value: 200000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'company_name' }),
        ])
      );
    });

    it('should retrieve lead by ID with joined details and activities', async () => {
      const res = await request(app)
        .get(`/api/v1/crm/leads/${testLeadId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testLeadId);
      expect(res.body.data.activities).toBeInstanceOf(Array);
      expect(res.body.data.activities.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Pipeline Overview & Weighted Forecast', () => {
    it('should calculate pipeline totals and weighted forecast correctly', async () => {
      const res = await request(app)
        .get('/api/v1/crm/pipeline')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total_leads_count');
      expect(res.body.data).toHaveProperty('total_pipeline_value');
      expect(res.body.data).toHaveProperty('weighted_forecast');
      expect(res.body.data.stage_summaries).toBeInstanceOf(Array);
      expect(res.body.data.stage_summaries.length).toBe(8); // all 8 stages represented

      // Verify each stage summary format
      res.body.data.stage_summaries.forEach((stageItem: any) => {
        expect(stageItem).toHaveProperty('stage');
        expect(stageItem).toHaveProperty('count');
        expect(stageItem).toHaveProperty('total_value');
        expect(stageItem).toHaveProperty('weighted_value');
      });
    });
  });

  describe('3. Stage Transitions & Mandatory Lost Reason', () => {
    it('should move lead to proposal stage and update probability to 60%', async () => {
      const res = await request(app)
        .patch(`/api/v1/crm/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ stage: 'proposal' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('proposal');
      expect(res.body.data.probability_percent).toBe(60);
    });

    it('should BLOCK moving stage to lost without lost_reason naming field lost_reason', async () => {
      const res = await request(app)
        .patch(`/api/v1/crm/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stage: 'lost',
          // missing lost_reason
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'lost_reason' }),
        ])
      );
    });

    it('should allow moving stage to lost when lost_reason is provided and set probability to 0%', async () => {
      const res = await request(app)
        .patch(`/api/v1/crm/leads/${testLeadId}/stage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stage: 'lost',
          lost_reason: 'Budget postponed to next fiscal quarter by client executive board',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('lost');
      expect(res.body.data.lost_reason).toContain('Budget postponed');
      expect(res.body.data.probability_percent).toBe(0);
    });
  });

  describe('4. Converting Won Lead to Client and Project in ONE Transaction', () => {
    let wonLeadId: number;

    it('should atomically convert lead to a new Client and new Project', async () => {
      // Create a fresh qualified lead for conversion
      const leadRes = await request(app)
        .post('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_name: 'Swiggy Delivery Technologies',
          contact_name: 'Vikram Joshi',
          email: 'vikram.j@swiggy.example.com',
          phone: '+91 99000 88776',
          requirement: 'Dynamic delivery rider routing engine and geospatial clustering algorithm',
          estimated_value: 2000000.00,
          stage: 'negotiation',
        });
      wonLeadId = leadRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/crm/leads/${wonLeadId}/convert`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_name: 'Swiggy HyperLocal Delivery Engine',
          project_description: 'Geospatial rider clustering and real-time dispatching service',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 1. Check Client created
      expect(res.body.data).toHaveProperty('client');
      expect(res.body.data.client.client_code).toMatch(/^CL-\d{4}$/);
      expect(res.body.data.client.company_name).toBe('Swiggy Delivery Technologies');
      expect(res.body.data.client.status).toBe('active');

      // 2. Check Project created
      expect(res.body.data).toHaveProperty('project');
      expect(res.body.data.project.project_code).toMatch(/^PRJ-\d{4}$/);
      expect(res.body.data.project.name).toBe('Swiggy HyperLocal Delivery Engine');
      expect(Number(res.body.data.project.budget)).toBe(2000000.00);
      expect(res.body.data.project.client_id).toBe(res.body.data.client.id);

      // 3. Check Lead updated to Won and linked
      expect(res.body.data.lead.stage).toBe('won');
      expect(res.body.data.lead.probability_percent).toBe(100);
      expect(res.body.data.lead.converted_client_id).toBe(res.body.data.client.id);
      expect(res.body.data.lead.converted_project_id).toBe(res.body.data.project.id);
      expect(res.body.data.lead.converted_at).not.toBeNull();

      // Verify in DB directly
      const dbClient = await db('clients').where({ id: res.body.data.client.id }).first();
      expect(dbClient).toBeDefined();

      const dbProject = await db('projects').where({ id: res.body.data.project.id }).first();
      expect(dbProject).toBeDefined();
    });

    it('should BLOCK re-conversion of an already converted lead with 400 naming lead_id', async () => {
      const res = await request(app)
        .post(`/api/v1/crm/leads/${wonLeadId}/convert`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          project_name: 'Duplicate Conversion Attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'lead_id' }),
        ])
      );
    });
  });

  describe('5. Activities & RBAC Protection', () => {
    it('should add activity entry and retrieve chronological timeline for lead', async () => {
      const actRes = await request(app)
        .post(`/api/v1/crm/leads/${testLeadId}/activities`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'call',
          title: 'Quarterly Check-in Call',
          description: 'Spoke with VP of procurement regarding renewal of Q1 enterprise contract.',
        });

      expect(actRes.status).toBe(201);
      expect(actRes.body.success).toBe(true);

      const listRes = await request(app)
        .get(`/api/v1/crm/leads/${testLeadId}/activities`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data).toBeInstanceOf(Array);
      const callAct = listRes.body.data.find((a: any) => a.title === 'Quarterly Check-in Call');
      expect(callAct).toBeDefined();
      expect(callAct.type).toBe('call');
    });

    it('should BLOCK unauthorized users without crm.view with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/crm/leads')
        .set('Authorization', `Bearer ${noCrmToken}`);

      expect(res.status).toBe(403);
    });
  });
});
