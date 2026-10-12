import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';
import { emailService } from '../src/shared/services/email.service';
import { notificationService } from '../src/shared/services/notification.service';
import crypto from 'crypto';

const app = createApp();

describe('Task 5: Email Outbox, Notifications & Forgot Password Suite', () => {
  let adminToken: string;
  let adminUserId: number;

  beforeAll(async () => {
    // Authenticate admin user
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });

    expect(res.status).toBe(200);
    adminToken = res.body.data.accessToken;
    adminUserId = res.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up test outbox records
    await db('email_outbox').where('to', 'like', '%@test.com').delete();
    await db('password_reset_tokens').where('user_id', adminUserId).delete();
  });

  describe('1. Email Outbox & Deduplication', () => {
    it('should queue email in outbox with pending status', async () => {
      const eventKey = `test:event:${Date.now()}`;
      const result = await emailService.queueEmail({
        to: 'employee@test.com',
        subject: 'Welcome to Qynova',
        html: '<p>Welcome test</p>',
        eventKey,
      });

      expect(result.queued).toBe(true);
      expect(result.id).toBeDefined();

      const outboxRow = await db('email_outbox').where({ id: result.id }).first();
      expect(outboxRow).toBeDefined();
      expect(outboxRow.status).toBe('pending');
      expect(outboxRow.event_key).toBe(eventKey);
      expect(outboxRow.attempts).toBe(0);
    });

    it('should deduplicate emails with the same eventKey', async () => {
      const eventKey = `test:duplicate:${Date.now()}`;

      const res1 = await emailService.queueEmail({
        to: 'employee@test.com',
        subject: 'Duplicate Test',
        html: '<p>First</p>',
        eventKey,
      });
      expect(res1.queued).toBe(true);

      const res2 = await emailService.queueEmail({
        to: 'employee@test.com',
        subject: 'Duplicate Test 2',
        html: '<p>Second</p>',
        eventKey,
      });
      expect(res2.queued).toBe(false);

      const rows = await db('email_outbox').where({ event_key: eventKey });
      expect(rows.length).toBe(1);
    });

    it('should process pending outbox items and update status to sent', async () => {
      const eventKey = `test:worker:${Date.now()}`;
      await emailService.queueEmail({
        to: 'worker@test.com',
        subject: 'Worker Test',
        html: '<p>Worker test</p>',
        eventKey,
      });

      const processResult = await emailService.processOutbox(100);
      expect(processResult.processed).toBeGreaterThanOrEqual(1);
      expect(processResult.sent).toBeGreaterThanOrEqual(1);

      const row = await db('email_outbox').where({ event_key: eventKey }).first();
      expect(row.status).toBe('sent');
      expect(row.attempts).toBe(1);
    });
  });

  describe('2. User Notification Preferences', () => {
    it('should update and retrieve user notification preferences', async () => {
      // Set preference to disable email for leave_request
      const updateRes = await request(app)
        .put('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: 'leave_request',
          emailEnabled: false,
          inAppEnabled: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.email_enabled).toBe(0);

      // Verify via GET
      const getRes = await request(app)
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      const pref = getRes.body.data.find((p: any) => p.event_type === 'leave_request');
      expect(pref).toBeDefined();
      expect(pref.email_enabled).toBe(0);
      expect(pref.in_app_enabled).toBe(1);
    });

    it('should respect disabled email preference and avoid queueing email', async () => {
      const eventKey = `test:pref_check:${Date.now()}`;

      await notificationService.notify({
        eventKey,
        userIds: adminUserId,
        type: 'info',
        title: 'Leave Notice',
        message: 'Leave Notice Message',
        emailDetails: {
          eventType: 'leave_request',
          subject: 'Leave Requested',
          html: '<p>Leave details</p>',
        },
      });

      // Outbox should NOT contain this email because emailEnabled is false
      const outboxRow = await db('email_outbox').where({ event_key: `${eventKey}:email` }).first();
      expect(outboxRow).toBeUndefined();

      // But in-app notification should still be created
      const inApp = await db('notifications').where({ event_key: eventKey }).first();
      expect(inApp).toBeDefined();
    });
  });

  describe('3. Forgot Password & Single-Use Reset Token Flow', () => {
    it('should silently handle unknown email without error or leaking', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent_user_9999@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should generate reset token and email for valid user email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'admin@qynova.erp' });

      expect(res.status).toBe(200);

      // Verify token inserted in database
      const tokenRow = await db('password_reset_tokens')
        .where({ user_id: adminUserId })
        .whereNull('used_at')
        .orderBy('id', 'desc')
        .first();

      expect(tokenRow).toBeDefined();
      expect(tokenRow.token_hash).toBeDefined();
      expect(tokenRow.expires_at).toBeDefined();

      // Verify email queued in outbox
      const outbox = await db('email_outbox')
        .where('to', 'admin@qynova.erp')
        .where('subject', 'like', '%Reset Your Qynova%')
        .orderBy('id', 'desc')
        .first();

      expect(outbox).toBeDefined();
      expect(outbox.html).toContain('reset-password?token=');
    });

    it('should reject reset-password with invalid token and name the field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid_raw_token_that_does_not_exist',
          newPassword: 'NewPassword@2026',
        });

      expect(res.status).toBe(400);
      expect(res.body.errors?.[0]?.field).toBe('token');
    });

    it('should successfully reset password with valid token and invalidate token afterwards', async () => {
      // 1. Create a controlled raw token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await db('password_reset_tokens').insert({
        user_id: adminUserId,
        token_hash: tokenHash,
        expires_at: db.raw('DATE_ADD(NOW(), INTERVAL 30 MINUTE)'),
      });

      // 2. Perform reset
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'UpdatedAdminPass@2026',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 3. Verify token marked as used
      const usedToken = await db('password_reset_tokens')
        .where({ token_hash: tokenHash })
        .first();
      expect(usedToken.used_at).not.toBeNull();

      // 4. Single-use check: reusing same token must fail
      const reuseRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'AnotherPassword@2026',
        });

      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.errors?.[0]?.field).toBe('token');

      // 5. Test login with newly reset password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@qynova.erp',
          password: 'UpdatedAdminPass@2026',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();

      // Restore password back to Password@123 for other tests
      const restoreRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
        .send({
          oldPassword: 'UpdatedAdminPass@2026',
          newPassword: 'Admin@123',
        });
      expect(restoreRes.status).toBe(200);
    });
  });
});
