-- Create user_login_logs table for tracking user logins, IP addresses, and device info
CREATE TABLE IF NOT EXISTS public.user_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    user_email TEXT NOT NULL,
    user_name TEXT,
    ip_address TEXT,
    device_info TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'success', -- 'success' | 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_login_logs_org_created 
ON public.user_login_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_login_logs_created 
ON public.user_login_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_login_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view and insert login logs
DROP POLICY IF EXISTS "login_logs_auth_access" ON public.user_login_logs;
CREATE POLICY "login_logs_auth_access" ON public.user_login_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow anon to insert failed login attempts
DROP POLICY IF EXISTS "login_logs_anon_insert" ON public.user_login_logs;
CREATE POLICY "login_logs_anon_insert" ON public.user_login_logs
    FOR INSERT
    TO anon
    WITH CHECK (true);
