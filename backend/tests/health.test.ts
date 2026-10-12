import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Health Check Endpoint', () => {
  it('should return 200 with status ok and database connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
  });
});
