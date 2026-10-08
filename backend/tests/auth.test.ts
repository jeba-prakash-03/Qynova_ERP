import request from 'supertest';
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
        email: 'admin@qynova.erp',
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
});
