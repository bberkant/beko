import { execSync } from 'child_process';
import fs from 'fs';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

const npxPath = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js';

const queries = [
  `CREATE TABLE IF NOT EXISTS public.whatsapp_gateway_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'disconnected',
    qr_code TEXT,
    qr_raw TEXT,
    phone_number TEXT,
    device_name TEXT,
    battery_level INTEGER DEFAULT 100,
    is_charging BOOLEAN DEFAULT false,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_gateway_org UNIQUE (organization_id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_gateway_org ON public.whatsapp_gateway_sessions(organization_id);`,
  `ALTER TABLE public.whatsapp_gateway_sessions ENABLE ROW LEVEL SECURITY;`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read whatsapp_gateway_sessions') THEN
      CREATE POLICY "Allow public read whatsapp_gateway_sessions" ON public.whatsapp_gateway_sessions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public insert whatsapp_gateway_sessions') THEN
      CREATE POLICY "Allow public insert whatsapp_gateway_sessions" ON public.whatsapp_gateway_sessions FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public update whatsapp_gateway_sessions') THEN
      CREATE POLICY "Allow public update whatsapp_gateway_sessions" ON public.whatsapp_gateway_sessions FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public delete whatsapp_gateway_sessions') THEN
      CREATE POLICY "Allow public delete whatsapp_gateway_sessions" ON public.whatsapp_gateway_sessions FOR DELETE USING (true);
    END IF;
  END $$;`,
  `INSERT INTO public.whatsapp_gateway_sessions (
    organization_id,
    status,
    device_name,
    phone_number,
    last_heartbeat
  ) VALUES (
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    'disconnected',
    'WhatsApp Web Gateway',
    NULL,
    NOW()
  ) ON CONFLICT (organization_id) DO UPDATE SET updated_at = NOW();`
];

for (const q of queries) {
  try {
    const singleLine = q.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const cmd = `node "${npxPath}" supabase db query --linked "${singleLine}"`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    console.log('Success for query:', singleLine.substring(0, 40) + '...', output.trim());
  } catch (err) {
    console.error('Error for query:', err.stdout || err.message);
  }
}
