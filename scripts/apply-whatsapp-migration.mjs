import { execSync } from 'child_process';
import fs from 'fs';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

const sql = fs.readFileSync('supabase/migrations/202609110001_whatsapp_operations.sql', 'utf8');

try {
  const cleanSql = sql.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const output = execSync('npx supabase db query --linked ' + cleanSql + '', { encoding: 'utf-8' });
  console.log('Supabase Query Success:', output);
} catch (error) {
  console.error('Supabase Query Output:', error.stdout || error.message);
}
