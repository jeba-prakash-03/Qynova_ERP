import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Employees Module Transaction & Lifecycle', () => {
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    await db('login_attempts').truncate();
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    if (adminLogin.status !== 200) {
      console.error('adminLogin failed:', adminLogin.status, adminLogin.body);
    }
    adminToken = adminLogin.body.data?.accessToken;

    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    if (empLogin.status !== 200) {
      console.error('empLogin failed:', empLogin.status, empLogin.body);
    }
    employeeToken = empLogin.body.data?.accessToken;
  });

  it('should create user and employee in ONE transaction with temporary password', async () => {
    const empRole = await db('roles').where({ name: 'Employee' }).first();
    const roleId = Number(empRole.id);

    const uniqueEmail = `test.emp.${Date.now()}@qynova.erp`;
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: uniqueEmail,
        role_id: roleId,
        first_name: 'Rohit',
        last_name: 'Verma',
        joining_date: '2026-03-01',
        employment_type: 'full_time',
        status: 'active',
        lifecycle_stage: 'onboarding',
        experience_years: 2.5,
        bank_details: {
          account_holder: 'Rohit Verma',
          bank_name: 'HDFC Bank',
          account_number: '123456789012',
          ifsc: 'HDFC0001234',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employee).toHaveProperty('id');
    expect(res.body.data.employee.employee_code).toMatch(/^EMP-\d{4}$/);
    expect(res.body.data).toHaveProperty('temporaryPassword');

    // Verify user was created in users table with must_change_password = true
    const userInDb = await db('users').where({ email: uniqueEmail }).first();
    expect(userInDb).toBeDefined();
    expect(Boolean(userInDb.must_change_password)).toBe(true);

    // Verify employee was linked to this user
    expect(Number(res.body.data.employee.user_id)).toBe(Number(userInDb.id));

    // Verify bank details were inserted
    const bankInDb = await db('employee_bank_details')
      .where({ employee_id: res.body.data.employee.id })
      .first();
    expect(bankInDb).toBeDefined();
    expect(bankInDb.account_number).toBe('123456789012');
  });

  it('should allow employee to get their own profile via /employees/me without employees.view', async () => {
    const res = await request(app)
      .get('/api/v1/employees/me')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('employee@qynova.erp');
    expect(res.body.data.employee_code).toBe('EMP-0003');
  });

  it('should soft delete employee and deactivate user login', async () => {
    // Create a temporary employee to delete
    const empRole = await db('roles').where({ name: 'Employee' }).first();
    const roleId = Number(empRole.id);

    const tempEmail = `delete.test.${Date.now()}@qynova.erp`;
    const createRes = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: tempEmail,
        role_id: roleId,
        first_name: 'Temp',
        last_name: 'Delete',
        joining_date: '2026-01-01',
      });

    const empId = createRes.body.data.employee.id;
    const userId = createRes.body.data.employee.user_id;

    // Delete employee
    const delRes = await request(app)
      .delete(`/api/v1/employees/${empId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);

    // Verify soft delete
    const empInDb = await db('employees').where({ id: empId }).first();
    expect(empInDb.deleted_at).not.toBeNull();
    expect(empInDb.status).toBe('inactive');

    // Verify user status
    const userInDb = await db('users').where({ id: userId }).first();
    expect(userInDb.status).toBe('inactive');
  });
});
