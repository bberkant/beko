import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
  const output = execSync(`npx supabase db query --linked --output-format json "${query}"`, { encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.error('Error:', error);
}
