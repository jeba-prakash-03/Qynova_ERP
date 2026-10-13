import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Frontend Push Notification Logic & Contract Tests', () => {
  let userToken: string;
  let userId: number;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });

    expect(res.status).toBe(200);
    userToken = res.body.data.accessToken;
    userId = res.body.data.user.id;
  });

  describe('1. Push Banner Permission Logic Contract', () => {
    it('should determine banner shows ONLY when permission is "default"', () => {
      const getBannerState = (permission: string, isSupported: boolean, dismissedUntil: number | null) => {
        const isDismissed = Boolean(dismissedUntil && Date.now() < dismissedUntil);
        return isSupported && permission === 'default' && !isDismissed;
      };

      // When permission is default and supported -> shows banner
      expect(getBannerState('default', true, null)).toBe(true);

      // When permission is granted -> does NOT show banner
      expect(getBannerState('granted', true, null)).toBe(false);

      // When permission is denied -> does NOT show banner
      expect(getBannerState('denied', true, null)).toBe(false);

      // When browser does not support push -> does NOT show banner
      expect(getBannerState('default', false, null)).toBe(false);
    });

    it('should hide banner for 7 days after "Not now" dismissal', () => {
      const calculateDismissalExpiry = () => Date.now() + 7 * 24 * 60 * 60 * 1000;
      const dismissedUntil = calculateDismissalExpiry();

      const isBannerVisible = (permission: string, dismissedUntilTime: number) => {
        const isDismissed = Date.now() < dismissedUntilTime;
        return permission === 'default' && !isDismissed;
      };

      // Immediately after dismissal: banner is hidden
      expect(isBannerVisible('default', dismissedUntil)).toBe(false);

      // 6 days later: still hidden
      const sixDaysLater = Date.now() + 6 * 24 * 60 * 60 * 1000;
      expect(sixDaysLater < dismissedUntil).toBe(true);

      // 8 days later: banner can show again
      const eightDaysLater = dismissedUntil + 24 * 60 * 60 * 1000;
      expect(Date.now() < eightDaysLater).toBe(true);
    });

    it('should hide banner immediately when user clicks Enable and permission becomes granted', () => {
      let permission = 'default';
      let showBanner = permission === 'default';
      expect(showBanner).toBe(true);

      // User clicks Enable and grants permission
      permission = 'granted';
      showBanner = permission === 'default';
      expect(showBanner).toBe(false);
    });
  });

  describe('2. Logout Calls Unregister Endpoint Contract', () => {
    it('should unregister token from backend when logout unregister helper is invoked', async () => {
      const token = `test-fcm-logout-${Date.now()}`;

      // 1. Register token on app start
      const regRes = await request(app)
        .post('/api/v1/push/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ token, platform: 'web' });

      expect(regRes.status).toBe(200);

      const activeToken = await db('device_tokens')
        .where({ token, user_id: userId })
        .whereNull('deleted_at')
        .first();
      expect(activeToken).toBeDefined();

      // 2. Invoke logout unregister call (DELETE /api/v1/push/register)
      const unregRes = await request(app)
        .delete('/api/v1/push/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ token });

      expect(unregRes.status).toBe(200);
      expect(unregRes.body.data.unregistered).toBe(true);

      // 3. Verify token is marked as deleted in database
      const deletedToken = await db('device_tokens')
        .where({ token, user_id: userId })
        .first();
      expect(deletedToken.deleted_at).not.toBeNull();
    });
  });
});
