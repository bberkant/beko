CREATE TABLE IF NOT EXISTS public.findeks_check_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    check_raw_qr TEXT,
    bank_code TEXT,
    bank_name TEXT,
    branch_code TEXT,
    account_number TEXT,
    check_number TEXT,
    drawer_name TEXT,
    drawer_tckn_vkn TEXT,
    amount NUMERIC,
    due_date DATE,
    findeks_score INTEGER DEFAULT 850, -- 0 to 1000
    risk_level TEXT DEFAULT 'safe', -- 'very_safe', 'safe', 'medium_risk', 'high_risk', 'banned'
    total_paid_count INTEGER DEFAULT 0,
    total_paid_amount NUMERIC DEFAULT 0,
    bounced_unpaid_count INTEGER DEFAULT 0,
    bounced_unpaid_amount NUMERIC DEFAULT 0,
    bounced_paid_later_count INTEGER DEFAULT 0,
    last_bounced_date DATE,
    first_check_date DATE,
    last_check_date DATE,
    is_banned BOOLEAN DEFAULT false,
    raw_report_data JSONB DEFAULT '{}'::jsonb,
    image_url TEXT,
    inquired_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_findeks_inquiries_org ON public.findeks_check_inquiries(organization_id);
CREATE INDEX IF NOT EXISTS idx_findeks_inquiries_created ON public.findeks_check_inquiries(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findeks_inquiries_check_no ON public.findeks_check_inquiries(check_number);

CREATE TABLE IF NOT EXISTS public.findeks_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    username TEXT,
    password TEXT,
    institution_code TEXT,
    remaining_credits INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_findeks_settings_org UNIQUE (organization_id)
);

ALTER TABLE public.findeks_check_inquiries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.findeks_settings DISABLE ROW LEVEL SECURITY;

-- Seed some realistic sample inquiries so user immediately sees inquiry cards & history
INSERT INTO public.findeks_check_inquiries (
    organization_id,
    check_raw_qr,
    bank_code,
    bank_name,
    branch_code,
    account_number,
    check_number,
    drawer_name,
    drawer_tckn_vkn,
    amount,
    due_date,
    findeks_score,
    risk_level,
    total_paid_count,
    total_paid_amount,
    bounced_unpaid_count,
    bounced_unpaid_amount,
    bounced_paid_later_count,
    first_check_date,
    last_check_date,
    is_banned,
    raw_report_data,
    inquired_by
) VALUES 
(
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    '00460123000987654321000000458921',
    '0046',
    'Akbank T.A.Ş.',
    '0123',
    '987654321',
    '458921',
    'Yıldız Et ve Gıda San. Tic. Ltd. Şti.',
    '9840129384',
    485000,
    '2026-10-15',
    960,
    'very_safe',
    84,
    14500000,
    0,
    0,
    0,
    '2018-04-12',
    '2026-08-20',
    false,
    '{"bank_count": 4, "last_12m_paid_count": 32, "last_12m_paid_amount": 6200000, "protest_count": 0}'::jsonb,
    'Berkant Saray'
),
(
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    '00620456000112233445000000781290',
    '0062',
    'Garanti BBVA',
    '0456',
    '112233445',
    '781290',
    'Canerler Besicilik ve Tarım A.Ş.',
    '2384910293',
    275000,
    '2026-09-30',
    880,
    'safe',
    42,
    5800000,
    0,
    0,
    1,
    '2021-02-15',
    '2026-07-10',
    false,
    '{"bank_count": 3, "last_12m_paid_count": 18, "last_12m_paid_amount": 2400000, "protest_count": 0}'::jsonb,
    'Berkant Saray'
) ON CONFLICT DO NOTHING;

INSERT INTO public.findeks_settings (
    organization_id,
    username,
    institution_code,
    remaining_credits,
    is_active
) VALUES (
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    'findeks_beko_kurumsal',
    'KKB-94812',
    85,
    true
) ON CONFLICT (organization_id) DO NOTHING;
