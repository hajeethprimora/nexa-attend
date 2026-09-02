# NexaAttend Production Deployment & Operations Manual

This guide provides end-to-end instructions for deploying and running **NexaAttend** in a production environment using Docker, Supabase PostgreSQL, Express API, and Next.js 14.

---

## 1. Database Setup & Supabase Migration

1. Open your **Supabase Project Dashboard** -> **SQL Editor**.
2. Copy and execute the contents of [`schema.sql`](file:///c:/Users/Aashifa/OneDrive/Documents/GitHub/nexa-attend/schema.sql).
3. This creates:
   - `public.users`, `public.attendance`, `public.leaves`, `public.leave_balances`, and `public.audit_logs` tables.
   - High-performance database indexes.
   - Row-Level Security (RLS) policies ensuring users can only access their own attendance/leave data, while admins possess full management capabilities.

---

## 2. Environment Configuration

### Backend Setup (`backend/.env`):
Copy `backend/.env.example` to `backend/.env` and update:
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Frontend Setup (`frontend/.env.local`):
Copy `frontend/.env.example` to `frontend/.env.local` and update:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com/api
```

---

## 3. Local & Docker Production Deployment

### Docker Compose Deployment (Recommended):
To launch the complete decoupled stack with health checks:
```bash
docker-compose up -d --build
```
Verify status:
```bash
docker-compose ps
```

---

## 4. Running Automated Tests & Verification

Execute the backend Jest integration test suite:
```bash
cd backend
npm test
```

---

## 5. Security & Maintenance Best Practices

1. **Rate Limiting**: Rate limiters are pre-configured on `/api/auth` (20 requests/15m) and general API endpoints (300 requests/15m).
2. **Audit Logging**: All admin actions (creating employees, updating leave requests) and user attendance events are logged to `public.audit_logs`.
3. **Structured Logs**: Application logs are stored in `backend/logs/combined.log` and `error.log`.
