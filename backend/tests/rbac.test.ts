import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('RBAC & Roles Module', () => {
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

  it('should allow admin to list roles', async () => {
    const res = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
  });

  it('should prevent employee without roles.view permission from accessing /api/v1/roles', async () => {
    const res = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin to create a new role and update its permissions', async () => {
    const roleName = `Test Role ${Date.now()}`;
    const createRes = await request(app)
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: roleName,
        description: 'Automated test custom role',
      });

    expect(createRes.status).toBe(201);
    const newRoleId = createRes.body.data.id;

    // Update permissions for this role
    const updatePermRes = await request(app)
      .put(`/api/v1/roles/${newRoleId}/permissions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        permissionIds: [1, 2, 3],
      });

    expect(updatePermRes.status).toBe(200);
    expect(updatePermRes.body.data.permissionIds).toEqual(expect.arrayContaining([1, 2, 3]));
  });
});
