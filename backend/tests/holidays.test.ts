import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';
import { getWorkingDays, holidaysService } from '../src/modules/holidays/holidays.service';

const app = createApp();

describe('Holidays & Work Calendar Module', () => {
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    // Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    adminToken = adminLogin.body.data.accessToken;

    // Employee login
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    employeeToken = empLogin.body.data.accessToken;
  });

  describe('Unit Test: getWorkingDays(year, month) Contract', () => {
    it('should correctly calculate working days in a month without holidays', async () => {
      // March 2026: 31 days.
      // Suppose we test a mock or month.
      // Let's test February 2026: 28 days (non-leap).
      // Feb 2026 starts on Sunday (Feb 1), ends on Saturday (Feb 28).
      // Sundays: Feb 1, 8, 15, 22 (4).
      // Saturdays: Feb 7, 14, 21, 28 (4).
      // Total weekends = 8.
      // If no holidays in Feb 2026, working days = 28 - 8 = 20.
      const result = await getWorkingDays(2026, 2);
      expect(result.count).toBe(20);
      expect(result.workingDates.length).toBe(20);
      expect(result.workingDates).not.toContain('2026-02-01'); // Sunday
      expect(result.workingDates).not.toContain('2026-02-07'); // Saturday
      expect(result.workingDates).toContain('2026-02-02'); // Monday
    });

    it('should correctly deduct 2 holidays from working days count', async () => {
      // Insert 2 test public holidays in November 2026 (Nov 2026 has 30 days)
      // Remove any existing holidays in Nov 2026 for controlled test
      await db('holidays').whereRaw('YEAR(date) = 2026 AND MONTH(date) = 11').delete();

      // November 2026:
      // Nov 1 is Sunday.
      // Sundays: Nov 1, 8, 15, 22, 29 (5).
      // Saturdays: Nov 7, 14, 21, 28 (4).
      // Total weekends = 9.
      // Days in month = 30.
      // Base weekdays = 30 - 9 = 21.

      // Add Holiday 1: Nov 10, 2026 (Tuesday - weekday)
      // Add Holiday 2: Nov 11, 2026 (Wednesday - weekday)
      await db('holidays').insert([
        { date: '2026-11-10', name: 'Test Holiday 1', type: 'public' },
        { date: '2026-11-11', name: 'Test Holiday 2', type: 'company' },
      ]);

      const result = await getWorkingDays(2026, 11);

      // Base 21 weekdays - 2 holidays = 19 working days
      expect(result.count).toBe(19);
      expect(result.workingDates).not.toContain('2026-11-10');
      expect(result.workingDates).not.toContain('2026-11-11');
      expect(result.workingDates).toContain('2026-11-09'); // Monday
      expect(result.workingDates).toContain('2026-11-12'); // Thursday
    });
  });

  describe('Holidays & Work Settings API Endpoints', () => {
    it('should allow admin to list holidays', async () => {
      const res = await request(app)
        .get('/api/v1/holidays')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow admin to create, update, and delete a holiday', async () => {
      const testDate = '2026-06-15';
      await db('holidays').where({ date: testDate }).delete();

      // Create
      const createRes = await request(app)
        .post('/api/v1/holidays')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          date: testDate,
          name: 'Mid Year Tech Festival',
          type: 'company',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.name).toBe('Mid Year Tech Festival');
      const holidayId = createRes.body.data.id;

      // Update
      const updateRes = await request(app)
        .put(`/api/v1/holidays/${holidayId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Annual Tech Festival & Celebration',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe('Annual Tech Festival & Celebration');

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/v1/holidays/${holidayId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
    });

    it('should allow admin to view and update work settings', async () => {
      const getRes = await request(app)
        .get('/api/v1/holidays/work-settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data).toHaveProperty('shift_start');
      expect(getRes.body.data).toHaveProperty('shift_end');
      expect(getRes.body.data).toHaveProperty('late_grace_minutes');

      // Update work settings
      const updateRes = await request(app)
        .put('/api/v1/holidays/work-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          late_grace_minutes: 15,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.late_grace_minutes).toBe(15);

      // Revert back to 10
      await request(app)
        .put('/api/v1/holidays/work-settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          late_grace_minutes: 10,
        });
    });

    it('should reject employee from creating holidays without holidays.create permission', async () => {
      const res = await request(app)
        .post('/api/v1/holidays')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          date: '2026-12-31',
          name: 'Unauthorized Holiday',
          type: 'public',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
