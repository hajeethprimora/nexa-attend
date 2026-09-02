import request from 'supertest';
import app from '../src/server';

describe('NexaAttend Industrial Backend API Suite', () => {
  it('GET /api/health - should return 200 OK with standardized envelope', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.meta).toHaveProperty('timestamp');
  });

  it('GET /api/attendance/today - should reject request without Bearer token', async () => {
    const res = await request(app).get('/api/attendance/today');
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/attendance/clock-in - should reject unauthenticated request', async () => {
    const res = await request(app).post('/api/attendance/clock-in');
    expect(res.statusCode).toEqual(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/leaves - should reject invalid payload format', async () => {
    const res = await request(app)
      .post('/api/leaves')
      .set('Authorization', 'Bearer invalid_token')
      .send({ start_date: 'invalid', end_date: 'invalid' });
    expect(res.statusCode).toEqual(401);
  });

  it('GET /api/admin/users - should enforce admin security check', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });
});
