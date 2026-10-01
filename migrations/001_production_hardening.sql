-- NexaAttend production hardening migration
-- Run ONCE in the Supabase SQL Editor on an existing database (safe to re-run).
-- Fresh installs: run schema.sql instead (it already contains everything below).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Users: email column (leave approval + notifications need it), WFH policy
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS allow_remote BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE a.id = u.id AND (u.email IS NULL OR u.email <> a.email);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ---------------------------------------------------------------------------
-- 2. Attendance: work mode (office / remote), admin edit tracking, auto-close flag
-- ---------------------------------------------------------------------------
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS work_mode TEXT NOT NULL DEFAULT 'office';
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_work_mode_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_work_mode_check CHECK (work_mode IN ('office', 'remote'));
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS auto_closed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS edit_reason TEXT;

-- Close duplicate open sessions (keep the newest) so the unique index below can be created.
UPDATE public.attendance a
SET clock_out = a.clock_in, auto_closed = TRUE, total_hours = 0, overtime_hours = 0
WHERE a.clock_out IS NULL
  AND EXISTS (
    SELECT 1 FROM public.attendance b
    WHERE b.user_id = a.user_id AND b.clock_out IS NULL AND b.clock_in > a.clock_in
  );

-- At most one open session per user (prevents double clock-in races).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance_one_open_session
  ON public.attendance(user_id) WHERE clock_out IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Signup trigger: NEVER trust role from client-controlled metadata
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, employee_id, email, full_name, role, department, is_active)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'employee_id', ''), 'EMP-' || UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 6))),
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), SPLIT_PART(NEW.email, '@', 1)),
    'employee',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Engineering'),
    TRUE
  ) ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  INSERT INTO public.leave_balances (user_id, year)
  VALUES (NEW.id, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
  ON CONFLICT (user_id, year) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Keep users.email in sync when an auth email changes
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_change();

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND role = 'admin' AND is_active);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security: browsers get READ-ONLY access to their own rows.
--    Every write goes through the backend API (service role bypasses RLS),
--    which enforces business rules and audit logging.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users
DROP POLICY IF EXISTS "Users insert/update own profile or admins all" ON public.users;
DROP POLICY IF EXISTS "Admins can insert or update users" ON public.users;
DROP POLICY IF EXISTS "Users view own profile or admins view all" ON public.users;
CREATE POLICY "Users view own profile or admins view all"
  ON public.users FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Attendance
DROP POLICY IF EXISTS "Users insert/update own attendance or admins all" ON public.attendance;
DROP POLICY IF EXISTS "Users view own attendance or admins view all" ON public.attendance;
CREATE POLICY "Users view own attendance or admins view all"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Leaves
DROP POLICY IF EXISTS "Users insert own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Admins update leave status" ON public.leaves;
DROP POLICY IF EXISTS "Users view own leaves or admins view all" ON public.leaves;
CREATE POLICY "Users view own leaves or admins view all"
  ON public.leaves FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Leave balances
DROP POLICY IF EXISTS "Users view own leave balances or admins view all" ON public.leave_balances;
CREATE POLICY "Users view own leave balances or admins view all"
  ON public.leave_balances FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Audit logs: admins read, nobody writes from the browser (prevents forged entries)
DROP POLICY IF EXISTS "Authenticated users insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.leaves(start_date, end_date);

COMMIT;
