import request from 'supertest';
import app from '../src/server';

describe('Backend API', () => {
  it('GET /api/health returns the standard envelope', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.meta).toHaveProperty('timestamp');
  });

  it('GET /api/auth/config exposes only public settings', async () => {
    const res = await request(app).get('/api/auth/config');
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('allow_public_signup');
    expect(JSON.stringify(res.body)).not.toMatch(/service|key|smtp/i);
  });

  it('POST /api/auth/signup is disabled by default', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'someone@example.com', password: 'longenough1', full_name: 'Some One' });
    expect(res.statusCode).toEqual(403);
    expect(res.body.error.code).toBe('SIGNUP_DISABLED');
  });

  it('rejects attendance requests without a Bearer token', async () => {
    const res = await request(app).get('/api/attendance/today');
    expect(res.statusCode).toEqual(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects unauthenticated clock-in', async () => {
    const res = await request(app).post('/api/attendance/clock-in');
    expect(res.statusCode).toEqual(401);
  });

  it('protects admin routes', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.statusCode).toEqual(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('does not reflect arbitrary origins in CORS headers', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example');
  });
});
