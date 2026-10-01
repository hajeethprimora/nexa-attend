-- NexaAttend Supabase PostgreSQL Schema (fresh install)
-- Run this script in the Supabase SQL Editor.
-- Existing databases: run migrations/001_production_hardening.sql instead.

-- 1. Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    email TEXT,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    department TEXT DEFAULT 'Engineering',
    shift_start TIME DEFAULT '09:00:00',
    shift_end TIME DEFAULT '17:00:00',
    allow_remote BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Attendance records (multi-break, overtime, late arrival, work mode)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE, -- Legacy single break support
    break_end TIMESTAMP WITH TIME ZONE,   -- Legacy single break support
    breaks JSONB DEFAULT '[]'::jsonb,      -- [{start: ISO, end: ISO}]
    total_hours DECIMAL(5,2) DEFAULT 0.0,
    overtime_hours DECIMAL(5,2) DEFAULT 0.0,
    late_minutes INTEGER DEFAULT 0,
    work_mode TEXT NOT NULL DEFAULT 'office' CONSTRAINT attendance_work_mode_check CHECK (work_mode IN ('office', 'remote')),
    auto_closed BOOLEAN NOT NULL DEFAULT FALSE,
    edited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    edit_reason TEXT,
    ip_address TEXT,
    location_lat DECIMAL(9,6),
    location_lng DECIMAL(9,6),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Leave requests
CREATE TABLE IF NOT EXISTS public.leaves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT CHECK (type IN ('sick', 'casual', 'vacation')) NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_comment TEXT DEFAULT '',
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Leave entitlement quotas & balances
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    sick_quota INTEGER DEFAULT 10 NOT NULL,
    casual_quota INTEGER DEFAULT 12 NOT NULL,
    vacation_quota INTEGER DEFAULT 15 NOT NULL,
    sick_used INTEGER DEFAULT 0 NOT NULL,
    casual_used INTEGER DEFAULT 0 NOT NULL,
    vacation_used INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_year UNIQUE(user_id, year)
);

-- 5. Audit logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance_one_open_session ON public.attendance(user_id) WHERE clock_out IS NULL;
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_user_id ON public.leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_user_status ON public.leaves(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year ON public.leave_balances(user_id, year);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 7. New auth user -> public.users profile + leave balance.
--    Role is ALWAYS 'employee' here; only an admin (via the backend) can promote.
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- 8. Row Level Security: browsers get READ-ONLY access to their own rows.
--    All writes go through the backend API (service role), which enforces rules + audit logs.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Users view own profile or admins view all" ON public.users;
CREATE POLICY "Users view own profile or admins view all"
    ON public.users FOR SELECT
    USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own attendance or admins view all" ON public.attendance;
CREATE POLICY "Users view own attendance or admins view all"
    ON public.attendance FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own leaves or admins view all" ON public.leaves;
CREATE POLICY "Users view own leaves or admins view all"
    ON public.leaves FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own leave balances or admins view all" ON public.leave_balances;
CREATE POLICY "Users view own leave balances or admins view all"
    ON public.leave_balances FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin(auth.uid()));
