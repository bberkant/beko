import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';
const npxPath = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js';

const sqlList = [
  `CREATE TABLE IF NOT EXISTS public.findeks_check_inquiries (
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
    findeks_score INTEGER DEFAULT 850,
    risk_level TEXT DEFAULT 'safe',
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_findeks_inquiries_org ON public.findeks_check_inquiries(organization_id);`,
  `CREATE INDEX IF NOT EXISTS idx_findeks_inquiries_created ON public.findeks_check_inquiries(organization_id, created_at DESC);`,
  `CREATE TABLE IF NOT EXISTS public.findeks_settings (
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
  );`,
  `ALTER TABLE public.findeks_check_inquiries DISABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.findeks_settings DISABLE ROW LEVEL SECURITY;`
];

for (const sql of sqlList) {
  try {
    const clean = sql.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const cmd = `node "${npxPath}" supabase db query --linked "${clean}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log('Success:', clean.substring(0, 40) + '...', out.trim());
  } catch (err) {
    console.error('Error:', err.stdout || err.message);
  }
}
