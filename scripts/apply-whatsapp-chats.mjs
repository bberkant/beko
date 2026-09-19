import { execSync } from 'child_process';
import fs from 'fs';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';
const npxPath = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js';

const sqlContent = fs.readFileSync('supabase/migrations/202609110004_whatsapp_chats.sql', 'utf8');

const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 5);

console.log(`Executing ${statements.length} SQL statements...`);

for (const stmt of statements) {
  try {
    const singleLine = stmt.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + ';';
    const cmd = `node "${npxPath}" supabase db query --linked "${singleLine.replace(/"/g, '\\"')}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log('Success stmt:', singleLine.substring(0, 35) + '...', out.trim());
  } catch (err) {
    console.error('Error stmt:', stmt.substring(0, 35), err.stdout || err.message);
  }
}
