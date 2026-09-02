-- NexaAttend Supabase PostgreSQL Enterprise Database Schema
-- Run this script in the Supabase SQL Editor

-- 1. Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    department TEXT DEFAULT 'Engineering',
    shift_start TIME DEFAULT '09:00:00',
    shift_end TIME DEFAULT '17:00:00',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Attendance records (Supports multi-break tracking, overtime, and late arrival metrics)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE, -- Legacy single break support
    break_end TIMESTAMP WITH TIME ZONE,   -- Legacy single break support
    breaks JSONB DEFAULT '[]'::jsonb,      -- Production multi-break array [{start: ISO, end: ISO}]
    total_hours DECIMAL(5,2) DEFAULT 0.0,
    overtime_hours DECIMAL(5,2) DEFAULT 0.0,
    late_minutes INTEGER DEFAULT 0,
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

-- 4. Leave Entitlement Quotas & Balances
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

-- 5. Audit Logging for Enterprise Governance
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Indexes for High-Performance Industrial Queries
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_open_session ON public.attendance(user_id) WHERE clock_out IS NULL;
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_user_id ON public.leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_user_status ON public.leaves(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year ON public.leave_balances(user_id, year);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- 7. Row Level Security (RLS) Configuration
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies: Users
CREATE POLICY "Users view own profile or admins view all"
    ON public.users FOR SELECT
    USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert or update users"
    ON public.users FOR ALL
    USING (public.is_admin(auth.uid()));

-- RLS Policies: Attendance
CREATE POLICY "Users view own attendance or admins view all"
    ON public.attendance FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert/update own attendance or admins all"
    ON public.attendance FOR ALL
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- RLS Policies: Leaves
CREATE POLICY "Users view own leaves or admins view all"
    ON public.leaves FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users insert own leaves"
    ON public.leaves FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update leave status"
    ON public.leaves FOR UPDATE
    USING (public.is_admin(auth.uid()));

-- RLS Policies: Leave Balances
CREATE POLICY "Users view own leave balances or admins view all"
    ON public.leave_balances FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- RLS Policies: Audit Logs
CREATE POLICY "Admins view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
