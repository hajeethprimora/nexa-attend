# Softnix Attend: Production Deployment Guide

Stack: **Supabase** (Postgres + Auth) · **Express API** on Render · **Next.js frontend** on Netlify.

---

## 1. Supabase (database + auth)

1. **Run the SQL**: Supabase Dashboard → SQL Editor:
   - **Existing database** (already has data): run `migrations/001_production_hardening.sql`.
   - **Brand-new project**: run `schema.sql`.
2. **Turn off public sign-ups (critical).** Authentication → Sign In / Providers → *Allow new users to sign up* → **OFF**.
   The anon key is public (it ships in the browser bundle), so if this stays on, anyone can create an account
   directly against Supabase. Admins still create accounts from the app (that uses the service role).
3. Authentication → Policies (password strength): minimum length **8** or more.
4. Authentication → URL Configuration → *Site URL* = your Netlify URL.
5. Project Settings → API: copy the **Project URL**, the **anon** key (frontend) and the **service_role** key (backend only, keep it secret).

## 2. Backend (Render Web Service)

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Node version | 20 |

Environment variables (see `backend/.env.example` for all options):

```env
NODE_ENV=production
FRONTEND_URL=https://softnixattend.netlify.app
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
APP_TIMEZONE=Asia/Kolkata          # your office timezone (IANA name)
STANDARD_WORKDAY_HOURS=8
LATE_GRACE_MINUTES=10
WEEKEND_DAYS=0,6
ALLOW_PUBLIC_SIGNUP=false
ADMIN_EMAIL=hr@yourcompany.com     # receives new leave requests
# Optional SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
```

> Render's free plan sleeps after 15 min idle (first request then takes ~30-50 s). For a team that clocks in
> every morning, use a paid instance (~$7/mo) so clock-in is instant.

## 3. Frontend (Netlify)

`netlify.toml` already sets base dir, build command and the Next.js plugin. Add in
Site configuration → Environment variables:

```env
NEXT_PUBLIC_API_URL=https://<your-backend>.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Redeploy after changing these: `NEXT_PUBLIC_*` values are baked in at build time.

## 4. Create the first admin

From `backend/` with `backend/.env` filled in:

```bash
ADMIN_BOOTSTRAP_EMAIL=you@yourcompany.com ADMIN_BOOTSTRAP_PASSWORD='use-a-long-unique-password' npm run create-admin
```

Then sign in and add employees from **Employees → Add New Employee**.

> **Security:** an earlier version of `scripts/createAdmin.js` contained a hard-coded admin password that is still
> in git history. If that account exists, reset its password (re-run the command above) before going live.

## 5. Go-live checklist

- [ ] Migration/schema applied; Supabase sign-ups **disabled**
- [ ] Backend `/api/health` returns 200; logs show the right timezone and `origins=<your Netlify URL>`
- [ ] Admin can sign in, create an employee, and that employee can clock in (Office and WFH)
- [ ] Clock out → hours appear in history; admin sees the employee in **Live Command**
- [ ] Leave request → approve → balance decreases once
- [ ] Reports: Summary CSV, Daily CSV and PDF download
- [ ] Attendance Editor: edit a past day → hours recalculated, entry shows "Edited", audit log entry created

## 6. Features & how they work

| Feature | Notes |
|---|---|
| **Work from home** | Employees pick *Office* or *Work from Home* when clocking in. Admins can disable WFH per employee (Employees → Edit → *Allowed to work from home*). Live view and reports split office vs WFH days. |
| **Reports** | Reports page: monthly summary (present / office / WFH / hours / overtime / late / leave / absent / missed clock-outs), **Summary CSV**, **Daily CSV** (one row per session, payroll-ready) and **PDF**. Employees can download their own PDF/CSV. |
| **Editing past data** | **Edit Attendance** page: choose employee + month, then edit clock-in/out, breaks, work mode; add missing days or delete entries. A reason is required; hours/overtime/late are recalculated; the change is audit-logged with before/after values and the employee is emailed. |
| **Missed clock-outs** | Sessions open longer than `MAX_SESSION_HOURS` (default 16) are closed at the employee's shift end and flagged *Missed clock-out* for an admin to correct. |
| **Overtime / late** | Overtime = hours beyond `STANDARD_WORKDAY_HOURS` per day (all sessions combined). Late = first clock-in of the day after shift start + `LATE_GRACE_MINUTES`, in `APP_TIMEZONE`. |
| **Leave** | Counted in working days (weekends excluded), checked against yearly quotas, cancellable while pending, cannot be approved twice or self-approved. Quotas are editable per employee. |
| **Security** | Browsers have read-only DB access to their own rows (RLS); all writes go through the API. Deactivating an employee also blocks their sign-in. Admins cannot demote/deactivate themselves or remove the last admin. |
