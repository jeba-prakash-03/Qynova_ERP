import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app';
import db from '../src/db/knex';

const app = createApp();

describe('Auth Module', () => {
  beforeEach(async () => {
    // Reset login attempts before each test
    await db('login_attempts').truncate();
  });

  it('should authenticate admin user and return tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@qynova.erp',
        password: 'Admin@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe('admin@qynova.erp');
    expect(res.body.data.user.roles).toContain('Admin');
  });

  it('should reject invalid credentials and return 400 naming password field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'badcreds-test@qynova.erp',
        password: 'WrongPassword',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  it('should lock account after 5 consecutive failed login attempts', async () => {
    const targetEmail = 'locktest@qynova.erp';
    // Ensure test user exists
    await db('users').insert({
      email: targetEmail,
      password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      status: 'active',
    }).onConflict('email').ignore();

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: targetEmail, password: 'Bad' });
    }

    // 6th attempt should be blocked with lock message
    const lockedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: targetEmail, password: 'Bad' });

    expect(lockedRes.status).toBe(400);
    expect(lockedRes.body.errors[0].message).toContain('Account is temporarily locked');
  });

  it('should rotate refresh token upon /auth/refresh', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'hr@qynova.erp',
        password: 'Hr@123',
      });

    const initialRefreshToken = loginRes.body.data.refreshToken;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data).toHaveProperty('accessToken');
    expect(refreshRes.body.data).toHaveProperty('refreshToken');
    expect(refreshRes.body.data.refreshToken).not.toBe(initialRefreshToken);

    // Reusing the old refresh token must be rejected
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(reuseRes.status).toBe(401);
  });

  it('should enforce password complexity rules and clear must_change_password flag', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });

    const token = loginRes.body.data.accessToken;

    // Reject weak password
    const weakRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'Employee@123', newPassword: 'simple' });

    expect(weakRes.status).toBe(400);

    // Accept strong password
    const validRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'Employee@123', newPassword: 'NewSecurePass@99' });

    expect(validRes.status).toBe(200);

    // Verify user record has must_change_password = 0
    const user = await db('users').where({ email: 'employee@qynova.erp' }).first();
    expect(Boolean(user.must_change_password)).toBe(false);

    // Login with new password to get new token (since old token is invalidated on password change)
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'NewSecurePass@99' });
    expect(newLoginRes.status).toBe(200);

    // Reset password back for other tests
    const restoreRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${newLoginRes.body.data.accessToken}`)
      .send({ oldPassword: 'NewSecurePass@99', newPassword: 'Employee@123' });
    expect(restoreRes.status).toBe(200);
  });

  it('should set HTTP-only cookie on login, allow refresh via cookie, and clear cookie on logout', async () => {
    // 1. Login sets HttpOnly refreshToken cookie
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@qynova.erp',
        password: 'Admin@123',
      });

    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : (setCookie as string);
    expect(cookieStr).toContain('refreshToken=');
    expect(cookieStr.toLowerCase()).toContain('httponly');

    // Extract cookie value for subsequent request
    const cookieMatch = cookieStr.match(/refreshToken=([^;]+)/);
    expect(cookieMatch).toBeTruthy();
    const cookieHeader = `refreshToken=${cookieMatch![1]}`;

    // 2. Refresh succeeds using ONLY the cookie (empty body)
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [cookieHeader])
      .send({});

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data).toHaveProperty('accessToken');
    expect(refreshRes.headers['set-cookie']).toBeDefined();

    // 3. Refresh without cookie and without body fails with 401
    const noTokenRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({});

    expect(noTokenRes.status).toBe(401);

    // 4. Logout clears the cookie
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', [cookieHeader])
      .send({});

    expect(logoutRes.status).toBe(200);
    const logoutCookie = logoutRes.headers['set-cookie'];
    expect(logoutCookie).toBeDefined();
    const logoutCookieStr = Array.isArray(logoutCookie) ? logoutCookie.join(';') : (logoutCookie as string);
    expect(logoutCookieStr).toContain('refreshToken=;');
  });

  it('should store refresh tokens as SHA-256 hashes instead of plaintext', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });

    expect(loginRes.status).toBe(200);
    const rawRefreshToken = loginRes.body.data.refreshToken;
    const adminUser = await db('users').where({ email: 'admin@qynova.erp' }).first();

    const stored = await db('refresh_tokens')
      .where({ user_id: adminUser.id })
      .orderBy('id', 'desc')
      .first();

    expect(stored).toBeDefined();
    expect(stored.token).toHaveLength(64);
    expect(stored.token).not.toBe(rawRefreshToken);

    const expectedHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    expect(stored.token).toBe(expectedHash);
  });

  it('should trigger reuse detection when presenting a revoked refresh token, revoking all sessions', async () => {
    const login1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr@qynova.erp', password: 'Hr@123' });
    const token1 = login1.body.data.refreshToken;

    const login2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hr@qynova.erp', password: 'Hr@123' });
    const token2 = login2.body.data.refreshToken;

    // Rotate token1 -> revokes token1 and issues token3
    const rotateRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: token1 });
    expect(rotateRes.status).toBe(200);
    const token3 = rotateRes.body.data.refreshToken;

    // Reuse attempt: present revoked token1 again
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: token1 });
    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.message.toLowerCase()).toContain('reuse detected');

    // Reuse detection must have revoked ALL sessions for that user
    const checkToken2 = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: token2 });
    expect(checkToken2.status).toBe(401);

    const checkToken3 = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: token3 });
    expect(checkToken3.status).toBe(401);
  });

  it('should return identical generic success on forgot-password for existing and non-existent email', async () => {
    const existingRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'admin@qynova.erp' });
    expect(existingRes.status).toBe(200);
    expect(existingRes.body.success).toBe(true);
    expect(existingRes.body.message).toBe('Password reset instructions have been sent to your email.');

    const nonExistentRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent-random-user@qynova.erp' });
    expect(nonExistentRes.status).toBe(200);
    expect(nonExistentRes.body.success).toBe(true);
    expect(nonExistentRes.body.message).toBe('Password reset instructions have been sent to your email.');
  });

  it('should isolate login lockout by email AND ip address', async () => {
    const targetEmail = 'ip-lock-test@qynova.erp';
    await db('users').insert({
      email: targetEmail,
      password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      status: 'active',
    }).onConflict('email').ignore();

    // 5 failed attempts from IP 10.0.0.1
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '10.0.0.1')
        .send({ email: targetEmail, password: 'Wrong' });
    }

    // IP 10.0.0.1 should now be locked
    const lockedRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '10.0.0.1')
      .send({ email: targetEmail, password: 'Wrong' });
    expect(lockedRes.status).toBe(400);
    expect(lockedRes.body.errors[0].message).toContain('Account is temporarily locked');

    // A different IP (10.0.0.2) attempting the same email is NOT locked out by the attacker
    const otherIpRes = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '10.0.0.2')
      .send({ email: targetEmail, password: 'Wrong' });
    expect(otherIpRes.status).toBe(400);
    expect(otherIpRes.body.errors[0].message).not.toContain('Account is temporarily locked');
  });

  it('should reject ?token= query parameter on standard protected API routes', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    const token = loginRes.body.data.accessToken;

    const queryRes = await request(app)
      .get(`/api/v1/employees?token=${token}`);
    expect(queryRes.status).toBe(401);
    expect(queryRes.body.message).toContain('Authorization token required');

    const headerRes = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${token}`);
    expect(headerRes.status).toBe(200);
  });

  it('should immediately reject access token when user status is disabled or token_version bumped', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    const token = loginRes.body.data.accessToken;

    const okRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(okRes.status).toBe(200);

    // Bump token_version in DB
    await db('users')
      .where({ email: 'employee@qynova.erp' })
      .increment('token_version', 1);

    const revokedRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(revokedRes.status).toBe(401);
  });
});
