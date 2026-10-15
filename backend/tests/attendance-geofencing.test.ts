import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';
import { getKolkataDateString } from '../src/shared/utils/date.util';

const app = createApp();

describe('Attendance Geofencing & Location Verification Suite', () => {
  let adminToken: string;
  let employeeToken: string;
  let employeeId: number;
  let otherEmployeeToken: string;
  let otherEmployeeId: number;

  // Reference Office: Tech Park, Bengaluru (12.9716, 77.5946)
  const OFFICE_LAT = 12.9715987;
  const OFFICE_LON = 77.5945627;
  const OFFICE_RADIUS = 100; // 100 metres
  const MIN_ACCURACY = 50; // 50 metres

  const today = getKolkataDateString();

  beforeAll(async () => {
    // 1. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    adminToken = adminLogin.body.data.accessToken;

    // 2. Main Employee login
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    employeeToken = empLogin.body.data.accessToken;
    employeeId = empLogin.body.data.user.employee.id;

    // 3. Manager/Other Employee login
    const otherLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@qynova.erp', password: 'Manager@123' });
    otherEmployeeToken = otherLogin.body.data.accessToken;
    otherEmployeeId = otherLogin.body.data.user.employee.id;
  });

  const cleanAttendance = async (empId: number) => {
    const att = await db('attendance').where({ employee_id: empId, date: today }).first();
    if (att) {
      await db('attendance_breaks').where({ attendance_id: att.id }).delete();
      await db('attendance').where({ id: att.id }).delete();
    }
  };

  beforeEach(async () => {
    await cleanAttendance(employeeId);
    await cleanAttendance(otherEmployeeId);
  });

  afterAll(async () => {
    // Reset work settings back to geofencing disabled
    await db('work_settings').where({ id: 1 }).update({
      geofencing_enabled: false,
      office_name: null,
      office_latitude: null,
      office_longitude: null,
      office_radius_meters: 100,
      min_location_accuracy_meters: 50,
    });
    await db('office_locations').delete();
    await cleanAttendance(employeeId);
    await cleanAttendance(otherEmployeeId);
  });

  describe('Office Settings Configuration & Permissions', () => {
    it('should reject non-admin from updating office work settings', async () => {
      const res = await request(app)
        .put('/api/v1/settings/work')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          shift_start: '09:30',
          shift_end: '18:30',
          weekly_off_days: [0, 6],
          late_grace_minutes: 10,
          min_hours_full_day: 8,
          min_hours_half_day: 4,
          geofencing_enabled: true,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid coordinates in work settings update', async () => {
      const res = await request(app)
        .put('/api/v1/settings/work')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shift_start: '09:30',
          shift_end: '18:30',
          weekly_off_days: [0, 6],
          late_grace_minutes: 10,
          min_hours_full_day: 8,
          min_hours_half_day: 4,
          geofencing_enabled: true,
          office_latitude: 195.0, // Invalid latitude > 90
          office_longitude: 77.5946,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should allow Admin to configure authoritative office coordinates', async () => {
      const res = await request(app)
        .put('/api/v1/settings/work')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shift_start: '09:30',
          shift_end: '18:30',
          weekly_off_days: [0, 6],
          late_grace_minutes: 10,
          min_hours_full_day: 8,
          min_hours_half_day: 4,
          geofencing_enabled: true,
          office_name: 'Bengaluru Tech Park HQ',
          office_latitude: OFFICE_LAT,
          office_longitude: OFFICE_LON,
          office_radius_meters: OFFICE_RADIUS,
          min_location_accuracy_meters: MIN_ACCURACY,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.geofencing_enabled).toBe(true);
      expect(Number(res.body.data.office_latitude)).toBeCloseTo(OFFICE_LAT, 4);
      expect(Number(res.body.data.office_longitude)).toBeCloseTo(OFFICE_LON, 4);
      expect(res.body.data.office_radius_meters).toBe(100);
      expect(res.body.data.min_location_accuracy_meters).toBe(50);
    });
  });

  describe('Server-Side Geofence Enforcement on Check-In', () => {
    beforeEach(async () => {
      // Ensure geofencing is enabled with HQ coordinates
      await db('work_settings').where({ id: 1 }).update({
        geofencing_enabled: true,
        office_name: 'Bengaluru Tech Park HQ',
        office_latitude: OFFICE_LAT,
        office_longitude: OFFICE_LON,
        office_radius_meters: OFFICE_RADIUS,
        min_location_accuracy_meters: MIN_ACCURACY,
      });
      await db('office_locations').delete();
    });

    it('should fail closed if geofencing is enabled but no office is configured', async () => {
      // Clear office coordinates
      await db('work_settings').where({ id: 1 }).update({
        office_latitude: null,
        office_longitude: null,
      });

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
          latitude: OFFICE_LAT,
          longitude: OFFICE_LON,
          accuracy: 15,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Office location has not been configured/i);
    });

    it('should reject check-in when coordinates are missing and geofencing is enabled', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/coordinates and accuracy are required/i);
    });

    it('should reject malformed or out-of-range coordinates', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
          latitude: 95.0, // Invalid > 90
          longitude: 77.5946,
          accuracy: 10,
        });

      expect(res.status).toBe(400);
    });

    it('should reject check-in when reported GPS accuracy is worse than threshold', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
          latitude: OFFICE_LAT,
          longitude: OFFICE_LON,
          accuracy: 120, // 120m accuracy is worse than 50m threshold
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/location accuracy is insufficient/i);
    });

    it('should reject check-in when employee is outside the allowed office radius', async () => {
      // Point approx 800m away from office (12.9788, 77.5946)
      const FAR_LAT = 12.9788;
      const FAR_LON = 77.5946;

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
          latitude: FAR_LAT,
          longitude: FAR_LON,
          accuracy: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/outside the permitted office check-in area/i);
    });

    it('should accept check-in when employee is within the allowed radius with good accuracy', async () => {
      // Point approx 25m away from office (inside 100m radius)
      const NEAR_LAT = OFFICE_LAT + 0.0002;
      const NEAR_LON = OFFICE_LON + 0.0001;

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
          latitude: NEAR_LAT,
          longitude: NEAR_LON,
          accuracy: 12,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee_id).toBe(employeeId);
      expect(res.body.data.status).toBe('present');
      expect(res.body.data.work_type).toBe('office');
      expect(res.body.data.check_in).not.toBeNull();
      expect(res.body.data.check_in_latitude).toBeCloseTo(NEAR_LAT, 4);
      expect(res.body.data.check_in_longitude).toBeCloseTo(NEAR_LON, 4);
      expect(res.body.data.check_in_accuracy).toBe(12);
      expect(res.body.data.check_in_distance_meters).toBeLessThanOrEqual(100);
    });

    it('should accept check-in at secondary branch office if configured', async () => {
      // Add Chennai branch (13.0827, 80.2707) with 150m radius
      const [chennaiOfficeId] = await db('office_locations').insert({
        name: 'Chennai Branch Office',
        latitude: 13.0827,
        longitude: 80.2707,
        radius_meters: 150,
        is_active: true,
      });

      // Employee punches near Chennai branch (approx 30m away)
      const CHENNAI_NEAR_LAT = 13.0829;
      const CHENNAI_NEAR_LON = 80.2708;

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
          latitude: CHENNAI_NEAR_LAT,
          longitude: CHENNAI_NEAR_LON,
          accuracy: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.office_location_id).toBe(Number(chennaiOfficeId));
      expect(res.body.data.check_in_distance_meters).toBeLessThanOrEqual(150);
    });
  });

  describe('Work From Home (WFH) Authorization & Bypass Prevention', () => {
    it('should reject WFH check-in if employee has NO approved WFH request for today', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'wfh',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/requires an approved WFH request for today/i);
    });

    it('should allow WFH check-in if employee has an approved WFH request for today', async () => {
      // Simulate approved WFH placeholder in attendance table
      await db('attendance').insert({
        employee_id: employeeId,
        date: today,
        status: 'wfh',
        work_type: 'wfh',
        remarks: 'Approved Work From Home',
        check_in: null,
        check_out: null,
        working_minutes: 0,
        break_minutes: 0,
        overtime_minutes: 0,
      });

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'wfh',
          remarks: 'Working from home today',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('wfh');
      expect(res.body.data.work_type).toBe('wfh');
      expect(res.body.data.check_in).not.toBeNull();
    });
  });

  describe('Geofencing Disabled Policy Behavior', () => {
    it('should allow normal check-in without coordinates when geofencing is disabled', async () => {
      await db('work_settings').where({ id: 1 }).update({
        geofencing_enabled: false,
      });

      const res = await request(app)
        .post('/api/v1/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          work_type: 'office',
          remarks: 'Punch in with geofencing off',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('present');
    });
  });
});
