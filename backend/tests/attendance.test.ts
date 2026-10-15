import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';
import { getKolkataDateString } from '../src/shared/utils/date.util';

const app = createApp();

describe('Attendance Module Lifecycle & Permissions', () => {
  let adminToken: string;
  let employeeToken: string;
  let managerToken: string;
  let employeeId: number;
  let managerEmployeeId: number;

  beforeAll(async () => {
    // 1. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    adminToken = adminLogin.body.data.accessToken;

    // 2. Employee login
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    employeeToken = empLogin.body.data.accessToken;
    employeeId = empLogin.body.data.user.employee.id;

    // 3. Manager login
    const mgrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@qynova.erp', password: 'Manager@123' });
    managerToken = mgrLogin.body.data.accessToken;
    managerEmployeeId = mgrLogin.body.data.user.employee.id;
  });

  describe('Employee Punch & Break Lifecycle', () => {
    const today = getKolkataDateString();

    beforeEach(async () => {
      // Clean today's attendance for the employee before each test in this suite
      const att = await db('attendance').where({ employee_id: employeeId, date: today }).first();
      if (att) {
        await db('attendance_breaks').where({ attendance_id: att.id }).delete();
        await db('attendance').where({ id: att.id }).delete();
      }
    });

    it('should allow employee to check in with server time and work type', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
          remarks: 'Morning punch in from office',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee_id).toBe(employeeId);
      expect(res.body.data.date).toBe(today);
      expect(res.body.data.check_in).not.toBeNull();
      expect(res.body.data.status).toBe('present');
    });

    it('should reject duplicate check-in on the same day', async () => {
      // First check-in
      await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ work_type: 'office' });

      // Second check-in
      const dupRes = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ work_type: 'office' });

      expect(dupRes.status).toBe(400);
      expect(dupRes.body.success).toBe(false);
      expect(dupRes.body.message).toMatch(/already checked in/i);
    });

    it('should allow employee to start and end breaks', async () => {
      // Check in
      await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ work_type: 'office' });

      // Start Break
      const breakStartRes = await request(app)
        .post('/api/v1/attendance/break/start')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(breakStartRes.status).toBe(201);
      expect(breakStartRes.body.data).toHaveProperty('break_start');

      // Cannot start concurrent break
      const dupBreak = await request(app)
        .post('/api/v1/attendance/break/start')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(dupBreak.status).toBe(400);

      // End Break
      const breakEndRes = await request(app)
        .post('/api/v1/attendance/break/end')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(breakEndRes.status).toBe(200);
      expect(breakEndRes.body.data.break_end).not.toBeNull();
    });

    it('should allow employee to check out and auto-close open breaks', async () => {
      // Check in
      await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ work_type: 'office' });

      // Start break without explicitly ending it
      await request(app)
        .post('/api/v1/attendance/break/start')
        .set('Authorization', `Bearer ${employeeToken}`);

      // Check out
      const checkOutRes = await request(app)
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ remarks: 'Evening checkout' });

      expect(checkOutRes.status).toBe(200);
      expect(checkOutRes.body.data.check_out).not.toBeNull();

      // Open break should be auto-closed
      const attInDb = await db('attendance')
        .where({ employee_id: employeeId, date: today })
        .first();
      const openBreaks = await db('attendance_breaks')
        .where({ attendance_id: attInDb.id })
        .whereNull('break_end');
      expect(openBreaks.length).toBe(0);
    });

    it('should reject check-out if not checked in', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot check out without checking in/i);
    });
  });

  describe('Permission Scoping & Manager Restrictions', () => {
    it('should prevent regular employee from manually editing attendance', async () => {
      const res = await request(app)
        .put('/api/v1/attendance/1')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          status: 'present',
          reason: 'Attempting unauthorized edit',
        });

      expect(res.status).toBe(403);
    });

    it('should allow Admin/HR to edit attendance with mandatory reason and create audit log', async () => {
      // Create test attendance
      const testDate = '2026-05-18';
      await db('attendance').where({ employee_id: employeeId, date: testDate }).delete();

      const [testId] = await db('attendance').insert({
        employee_id: employeeId,
        date: testDate,
        status: 'absent',
        work_type: 'office',
        working_minutes: 0,
        break_minutes: 0,
        overtime_minutes: 0,
      });

      // Admin updates attendance
      const updateRes = await request(app)
        .put(`/api/v1/attendance/${testId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'present',
          check_in: `${testDate}T09:30:00.000Z`,
          check_out: `${testDate}T18:30:00.000Z`,
          reason: 'Employee biometric punch machine was offline',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe('present');
      expect(updateRes.body.data.working_minutes).toBe(540); // 9 hours = 540 min

      // Verify audit log
      const audit = await db('audit_logs')
        .where({ entity: 'attendance', entity_id: testId, action: 'attendance.edit' })
        .first();
      expect(audit).toBeDefined();
    });

    it('should allow admin to manually create and then delete attendance record', async () => {
      const manualDate = '2026-10-08';
      // Clean up if already exists
      await db('attendance').where({ employee_id: employeeId, date: manualDate }).delete();

      // 1. Admin creates manual attendance
      const createRes = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employee_id: employeeId,
          date: manualDate,
          status: 'present',
          work_type: 'wfh',
          check_in: `${manualDate}T09:30:00.000Z`,
          check_out: `${manualDate}T18:30:00.000Z`,
          reason: 'Manual backdated entry by administrator',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      const createdId = createRes.body.data.id;
      expect(createdId).toBeDefined();

      // Verify audit log for creation
      const createAudit = await db('audit_logs')
        .where({ entity: 'attendance', entity_id: createdId, action: 'attendance.create_manual' })
        .first();
      expect(createAudit).toBeDefined();

      // 2. Admin deletes attendance
      const deleteRes = await request(app)
        .delete(`/api/v1/attendance/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify deleted from db
      const deletedRecord = await db('attendance').where({ id: createdId }).first();
      expect(deletedRecord).toBeUndefined();

      // Verify delete audit log
      const deleteAudit = await db('audit_logs')
        .where({ entity: 'attendance', entity_id: createdId, action: 'attendance.delete' })
        .first();
      expect(deleteAudit).toBeDefined();
    });

    it('should filter manager daily sheet to only direct team reportees', async () => {
      const yesterday = '2026-10-09';
      const mgrSheet = await request(app)
        .get(`/api/v1/attendance/sheet?date=${yesterday}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(mgrSheet.status).toBe(200);
      expect(mgrSheet.body.success).toBe(true);

      // Verify that all employees in manager sheet report to manager
      for (const item of mgrSheet.body.data.items) {
        expect(item.reporting_manager_id).toBe(managerEmployeeId);
      }
    });

    it('should export daily attendance sheet as Excel (.xlsx) and CSV', async () => {
      const today = '2026-10-10';

      // 1. XLSX export
      const xlsxRes = await request(app)
        .get(`/api/v1/attendance/export?type=daily&date=${today}&format=xlsx`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(xlsxRes.status).toBe(200);
      expect(xlsxRes.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(xlsxRes.headers['content-disposition']).toContain(`attendance_daily_${today}.xlsx`);

      // 2. CSV export
      const csvRes = await request(app)
        .get(`/api/v1/attendance/export?type=daily&date=${today}&format=csv`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(csvRes.status).toBe(200);
      expect(csvRes.headers['content-type']).toContain('text/csv');
      expect(csvRes.headers['content-disposition']).toContain(`attendance_daily_${today}.csv`);
    });

    it('should export monthly attendance sheet as Excel (.xlsx)', async () => {
      const month = '2026-10';
      const res = await request(app)
        .get(`/api/v1/attendance/export?type=monthly&month=${month}&format=xlsx`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain(`attendance_monthly_${month}.xlsx`);
    });

    it('should reject unauthenticated request to /export', async () => {
      const res = await request(app).get('/api/v1/attendance/export?type=daily&format=xlsx');
      expect(res.status).toBe(401);
    });
  });
});
