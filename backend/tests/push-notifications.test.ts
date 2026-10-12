import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';
import admin, { setPushEnabled } from '../src/shared/firebase';
import { pushService } from '../src/shared/services/push.service';
import { notificationService } from '../src/shared/services/notification.service';

const app = createApp();
const sleep = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

describe('FCM Web Push Notifications Suite', () => {
  let adminToken: string;
  let adminUserId: number;
  let sendEachForMulticastSpy: jest.SpyInstance;

  beforeAll(async () => {
    // Authenticate admin user
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });

    expect(res.status).toBe(200);
    adminToken = res.body.data.accessToken;
    adminUserId = res.body.data.user.id;

    // Clean up test device tokens and preferences
    await db('device_tokens').where('token', 'like', 'test-token-%').delete();
  });

  beforeEach(() => {
    setPushEnabled(true);
    // Mock admin.messaging().sendEachForMulticast
    const mockMessaging = {
      sendEachForMulticast: jest.fn().mockImplementation(async (msg: any) => {
        return {
          successCount: msg.tokens.length,
          failureCount: 0,
          responses: msg.tokens.map(() => ({ success: true })),
        };
      }),
    };

    jest.spyOn(admin, 'messaging').mockReturnValue(mockMessaging as any);
    sendEachForMulticastSpy = mockMessaging.sendEachForMulticast as any;
  });

  afterEach(() => {
    setPushEnabled(false);
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await db('device_tokens').where('token', 'like', 'test-token-%').delete();
    await db('notification_preferences').where('event_type', 'like', 'test_%').delete();
  });

  describe('1. Device Token Registration API', () => {
    it('should register a device token via POST /api/v1/push/register', async () => {
      const token = `test-token-reg-${Date.now()}`;
      const res = await request(app)
        .post('/api/v1/push/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token, platform: 'web' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const row = await db('device_tokens').where({ token }).first();
      expect(row).toBeDefined();
      expect(row.user_id).toBe(adminUserId);
      expect(row.platform).toBe('web');
      expect(row.deleted_at).toBeNull();
    });

    it('should soft-delete token on logout via DELETE /api/v1/push/register', async () => {
      const token = `test-token-unreg-${Date.now()}`;
      await pushService.registerDevice(adminUserId, token, 'web');

      const res = await request(app)
        .delete('/api/v1/push/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ token });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const row = await db('device_tokens').where({ token }).first();
      expect(row.deleted_at).not.toBeNull();
    });
  });

  describe('2. Push Notification Dispatch & Deduplication', () => {
    it('should send push once per event_key', async () => {
      const token1 = `test-token-dispatch-${Date.now()}`;
      await pushService.registerDevice(adminUserId, token1, 'web');

      const eventKey = `test:push:once:${Date.now()}`;

      await notificationService.notify({
        eventKey,
        userIds: adminUserId,
        type: 'info',
        title: 'New Leave Request',
        message: 'A test leave request has been submitted',
        link: '/leaves/approvals',
        eventType: 'leave_request',
      });

      // Allow async setImmediate and DB queries to complete
      await sleep(60);

      expect(sendEachForMulticastSpy).toHaveBeenCalledTimes(1);
      const callArg = sendEachForMulticastSpy.mock.calls[0][0];
      expect(callArg.tokens).toContain(token1);
      expect(callArg.notification.title).toBe('New Leave Request');
      expect(callArg.data.eventType).toBe('leave_request');
    });

    it('should NOT push twice for duplicate event_key', async () => {
      const token = `test-token-dup-${Date.now()}`;
      await pushService.registerDevice(adminUserId, token, 'web');

      const eventKey = `test:push:duplicate:${Date.now()}`;

      // First call
      await notificationService.notify({
        eventKey,
        userIds: adminUserId,
        type: 'info',
        title: 'Leave Request Approved',
        message: 'Your leave has been approved',
        link: '/leaves/my',
        eventType: 'leave_status',
      });
      await sleep(60);

      const firstCallCount = sendEachForMulticastSpy.mock.calls.length;
      expect(firstCallCount).toBeGreaterThanOrEqual(1);

      // Duplicate call with exact same eventKey
      await notificationService.notify({
        eventKey,
        userIds: adminUserId,
        type: 'info',
        title: 'Leave Request Approved',
        message: 'Duplicate trigger should be skipped',
        link: '/leaves/my',
        eventType: 'leave_status',
      });
      await sleep(60);

      // Multicast should NOT be called again
      expect(sendEachForMulticastSpy.mock.calls.length).toBe(firstCallCount);
    });
  });

  describe('3. Notification Preferences & Multi-Device', () => {
    it('should send 2 pushes when one user has 2 registered devices', async () => {
      const tokenA = `test-token-multi-A-${Date.now()}`;
      const tokenB = `test-token-multi-B-${Date.now()}`;

      // Clean other tokens for this user first
      await db('device_tokens').where({ user_id: adminUserId }).update({ deleted_at: db.fn.now() });

      await pushService.registerDevice(adminUserId, tokenA, 'web');
      await pushService.registerDevice(adminUserId, tokenB, 'web');

      const eventKey = `test:push:multidevice:${Date.now()}`;

      await notificationService.notify({
        eventKey,
        userIds: adminUserId,
        type: 'info',
        title: 'Company Announcement',
        message: 'Important update for the team',
        eventType: 'general',
      });
      await sleep(60);

      expect(sendEachForMulticastSpy).toHaveBeenCalled();
      const callArg = sendEachForMulticastSpy.mock.calls[0][0];
      expect(callArg.tokens).toHaveLength(2);
      expect(callArg.tokens).toContain(tokenA);
      expect(callArg.tokens).toContain(tokenB);
    });

    it('should NOT send push when push preference is turned OFF for that event', async () => {
      const token = `test-token-pref-off-${Date.now()}`;
      await pushService.registerDevice(adminUserId, token, 'web');

      // Update preference: turn off push for timesheet_decision
      await request(app)
        .put('/api/v1/push/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          eventType: 'timesheet_decision',
          push: false,
          inApp: true,
          email: true,
        });

      sendEachForMulticastSpy.mockClear();

      const eventKey = `test:push:prefoff:${Date.now()}`;
      await notificationService.notify({
        eventKey,
        userIds: adminUserId,
        type: 'warning',
        title: 'Timesheet Decision',
        message: 'Your timesheet was reviewed',
        eventType: 'timesheet_decision',
      });
      await new Promise((resolve) => setImmediate(resolve));

      // Expect push NOT sent
      expect(sendEachForMulticastSpy).not.toHaveBeenCalled();

      // Reset preference back to true
      await request(app)
        .put('/api/v1/push/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ eventType: 'timesheet_decision', push: true });
    });

    it('should remove invalid token when FCM returns registration-token-not-registered', async () => {
      const invalidToken = `test-token-invalid-${Date.now()}`;
      await pushService.registerDevice(adminUserId, invalidToken, 'web');

      // Clean other tokens
      await db('device_tokens')
        .where('token', '!=', invalidToken)
        .where({ user_id: adminUserId })
        .update({ deleted_at: db.fn.now() });

      // Mock FCM returning invalid token error
      const mockFail = {
        sendEachForMulticast: jest.fn().mockResolvedValue({
          successCount: 0,
          failureCount: 1,
          responses: [
            {
              success: false,
              error: { code: 'messaging/registration-token-not-registered', message: 'Token expired' },
            },
          ],
        }),
      };
      jest.spyOn(admin, 'messaging').mockReturnValue(mockFail as any);

      await pushService.sendPushToUsers(adminUserId, {
        title: 'Error Test',
        body: 'Testing token removal',
        eventType: 'general',
      });

      // Verify token is soft-deleted
      const row = await db('device_tokens').where({ token: invalidToken }).first();
      expect(row.deleted_at).not.toBeNull();
    });
  });

  describe('4. Push Preferences and Test Push Endpoints', () => {
    it('should fetch user preferences via GET /api/v1/push/preferences', async () => {
      const res = await request(app)
        .get('/api/v1/push/preferences')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((p: any) => p.event_type === 'leave_request')).toBe(true);
    });

    it('should trigger test push via POST /api/v1/push/test', async () => {
      const token = `test-token-sendtest-${Date.now()}`;
      await pushService.registerDevice(adminUserId, token, 'web');

      const res = await request(app)
        .post('/api/v1/push/test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.activeTokens).toBeGreaterThanOrEqual(1);
    });

    it('should gracefully skip push without crashing when push is disabled / missing env vars', async () => {
      setPushEnabled(false);
      sendEachForMulticastSpy.mockClear();

      const eventKey = `test:push:disabled:${Date.now()}`;
      await expect(
        notificationService.notify({
          eventKey,
          userIds: adminUserId,
          type: 'info',
          title: 'Push Disabled Test',
          message: 'Should not crash',
          eventType: 'general',
        })
      ).resolves.not.toThrow();

      await new Promise((resolve) => setImmediate(resolve));
      expect(sendEachForMulticastSpy).not.toHaveBeenCalled();
    });
  });
});
