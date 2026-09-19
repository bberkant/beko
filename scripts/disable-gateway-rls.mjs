import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';
const npxPath = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js';

try {
  const cmd = `node "${npxPath}" supabase db query --linked "ALTER TABLE public.whatsapp_gateway_sessions DISABLE ROW LEVEL SECURITY;"`;
  const out = execSync(cmd, { encoding: 'utf-8' });
  console.log('RLS Disabled Success:', out.trim());
} catch (err) {
  console.error('Error:', err.stdout || err.message);
}
