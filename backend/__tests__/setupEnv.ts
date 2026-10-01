// Deterministic config for tests (read by src/config.ts at import time)
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'https://app.example.com';
process.env.APP_TIMEZONE = 'Asia/Kolkata';
process.env.WEEKEND_DAYS = '0,6';
delete process.env.ALLOW_PUBLIC_SIGNUP;
