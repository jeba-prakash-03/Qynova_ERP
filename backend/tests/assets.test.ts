import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Task 6: Asset Management System Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let employeeId: number;
  let testAssetId: number;

  beforeAll(async () => {
    // Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;

    // Regular employee login
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    expect(empLogin.status).toBe(200);
    employeeToken = empLogin.body.data.accessToken;
    employeeId = empLogin.body.data.user.employee.id;

    // Reset test asset tables
    await db('asset_maintenance').delete();
    await db('asset_assignments').delete();
    await db('assets').delete();
  });

  afterAll(async () => {
    // Clean up created test assets
    await db('asset_maintenance').delete();
    await db('asset_assignments').delete();
    await db('assets').delete();
  });

  describe('1. Asset Creation & Validation', () => {
    it('should create an asset with auto-generated asset tag', async () => {
      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dell Precision 5570',
          category: 'laptop',
          model: 'Precision 5570',
          serial_number: 'SN-DELL-998877',
          purchase_cost: 145000,
          purchase_date: '2026-05-10',
          notes: 'Developer workstation',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Dell Precision 5570');
      expect(res.body.data.asset_tag).toMatch(/^AST-\d+/);
      expect(res.body.data.status).toBe('available');

      testAssetId = res.body.data.id;
    });

    it('should create an asset with a custom unique asset tag', async () => {
      const customTag = `TEST-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          asset_tag: customTag,
          name: 'Apple Studio Display 27"',
          category: 'monitor',
          purchase_cost: 159000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.asset_tag).toBe(customTag);
      expect(res.body.data.category).toBe('monitor');
    });

    it('should reject duplicate asset_tag with 400 Bad Request naming the field', async () => {
      const existing = await db('assets').where({ id: testAssetId }).first();

      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          asset_tag: existing.asset_tag,
          name: 'Duplicate Tag Hardware',
          category: 'desktop',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors?.[0]?.field).toBe('asset_tag');
    });
  });

  describe('2. Asset Listing & Details', () => {
    it('should list assets with search, category, and status filtering', async () => {
      const res = await request(app)
        .get('/api/v1/assets?category=laptop')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.every((a: any) => a.category === 'laptop')).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should get asset details including assignment and maintenance history', async () => {
      const res = await request(app)
        .get(`/api/v1/assets/${testAssetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.asset.id).toBe(testAssetId);
      expect(res.body.data.activeAssignment).toBeNull();
      expect(Array.isArray(res.body.data.assignmentHistory)).toBe(true);
      expect(Array.isArray(res.body.data.maintenanceHistory)).toBe(true);
    });
  });

  describe('3. Custody Lifecycle: Assignment & Return', () => {
    it('should assign an available asset to an active employee', async () => {
      const res = await request(app)
        .post(`/api/v1/assets/${testAssetId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: employeeId,
          assigned_date: '2026-10-10',
          condition_assigned: 'Brand New In Box',
          notes: 'Issued with 140W USB-C charger',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('assigned');

      // Check asset record status
      const assetRow = await db('assets').where({ id: testAssetId }).first();
      expect(assetRow.status).toBe('assigned');
    });

    it('should reject assigning an already assigned asset', async () => {
      const res = await request(app)
        .post(`/api/v1/assets/${testAssetId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: employeeId,
        });

      expect(res.status).toBe(400);
      expect(res.body.errors?.[0]?.field).toBe('status');
    });

    it('should return employee assigned assets via /assets/my', async () => {
      const res = await request(app)
        .get('/api/v1/assets/my')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const assignedItem = res.body.data.find((a: any) => a.asset_id === testAssetId);
      expect(assignedItem).toBeDefined();
      expect(assignedItem.asset_name).toBe('Dell Precision 5570');
    });

    it('should return the asset back to available inventory', async () => {
      const res = await request(app)
        .post(`/api/v1/assets/${testAssetId}/return`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          returned_date: '2026-10-12',
          condition_returned: 'Good - Cleaned',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('available');

      const assetRow = await db('assets').where({ id: testAssetId }).first();
      expect(assetRow.status).toBe('available');

      const assignmentRow = await db('asset_assignments')
        .where({ asset_id: testAssetId })
        .orderBy('id', 'desc')
        .first();
      expect(assignmentRow.returned_date).not.toBeNull();
    });
  });

  describe('4. Maintenance Records Lifecycle', () => {
    let maintenanceId: number;

    it('should log a service record and update asset status to maintenance', async () => {
      const res = await request(app)
        .post(`/api/v1/assets/${testAssetId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          start_date: '2026-10-12',
          cost: 2500,
          issue_description: 'Thermal paste reapplication & fan clean',
          vendor_name: 'Dell On-Site Support',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('maintenance');
      maintenanceId = res.body.data.id;

      const assetRow = await db('assets').where({ id: testAssetId }).first();
      expect(assetRow.status).toBe('maintenance');
    });

    it('should complete maintenance and restore asset status to available', async () => {
      const res = await request(app)
        .patch(`/api/v1/assets/maintenance/${maintenanceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completed',
          end_date: '2026-10-14',
          resolution_details: 'Fans cleaned and thermals normal at 42C under load',
        });

      expect(res.status).toBe(200);

      const assetRow = await db('assets').where({ id: testAssetId }).first();
      expect(assetRow.status).toBe('available');
    });
  });

  describe('5. Soft Delete and Access Control', () => {
    it('should prevent non-admin/employee without assets.create from registering assets', async () => {
      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Unauthorized Asset',
          category: 'laptop',
        });

      expect(res.status).toBe(403);
    });

    it('should soft delete the asset when available', async () => {
      const res = await request(app)
        .delete(`/api/v1/assets/${testAssetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      const assetRow = await db('assets').where({ id: testAssetId }).first();
      expect(assetRow.deleted_at).not.toBeNull();

      // Subsequent GET should return 404
      const getRes = await request(app)
        .get(`/api/v1/assets/${testAssetId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(404);
    });
  });
});
