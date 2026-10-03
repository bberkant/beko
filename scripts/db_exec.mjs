import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key, def = '') {
  const match = envContent.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
  return match ? match[1].trim() : def;
}

export function getDbClient() {
  return new Client({
    user: getEnv('SUPABASE_DB_USER', 'postgres.zubhjybqzcpplultpsgt'),
    host: getEnv('SUPABASE_DB_HOST', 'aws-0-ap-southeast-1.pooler.supabase.com'),
    database: getEnv('SUPABASE_DB_NAME', 'postgres'),
    password: getEnv('SUPABASE_DB_PASSWORD', '123berkant_'),
    port: parseInt(getEnv('SUPABASE_DB_PORT', '6543'), 10),
    ssl: { rejectUnauthorized: false }
  });
}

export async function executeSql(sql) {
  const client = getDbClient();
  await client.connect();
  try {
    const res = await client.query(sql);
    return res;
  } finally {
    await client.end();
  }
}

// CLI runner if invoked directly
if (process.argv[1] === __filename) {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/db_exec.mjs "<SQL_OR_FILE_PATH>"');
    process.exit(1);
  }

  let sql = arg;
  if (!arg.includes(' ') && !arg.includes('\n') && fs.existsSync(arg) && fs.statSync(arg).isFile()) {
    sql = fs.readFileSync(arg, 'utf8');
  }

  console.log('Executing SQL against Supabase Postgres...');
  executeSql(sql)
    .then(res => {
      console.log('Execution successful!');
      if (Array.isArray(res)) {
        res.forEach((r, idx) => console.log(`Statement ${idx + 1}: ${r.command} (${r.rowCount ?? 0} rows)`));
      } else {
        console.log(`Result: ${res.command} (${res.rowCount ?? 0} rows)`);
        if (res.rows && res.rows.length > 0) {
          console.table(res.rows.slice(0, 10));
        }
      }
    })
    .catch(err => {
      console.error('Execution error:', err.message);
      process.exit(1);
    });
}
