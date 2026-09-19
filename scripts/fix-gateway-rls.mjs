import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';
const npxPath = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js';

const sqlStatements = [
  "ALTER TABLE public.whatsapp_gateway_sessions DISABLE ROW LEVEL SECURITY;",
  "DROP POLICY IF EXISTS \"Allow public all whatsapp_gateway_sessions\" ON public.whatsapp_gateway_sessions;",
  "CREATE POLICY \"Allow public all whatsapp_gateway_sessions\" ON public.whatsapp_gateway_sessions FOR ALL USING (true) WITH CHECK (true);",
  "ALTER TABLE public.whatsapp_gateway_sessions ENABLE ROW LEVEL SECURITY;"
];

for (const sql of sqlStatements) {
  try {
    const cmd = `node "${npxPath}" supabase db query --linked "${sql}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log('Success:', sql, out.trim());
  } catch (err) {
    console.error('Error on SQL:', sql, err.stdout || err.message);
  }
}
