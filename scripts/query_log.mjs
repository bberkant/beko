import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = `
    SELECT *
    FROM public.activity_logs
    WHERE details ILIKE '%3639832%' OR details ILIKE '%1000000%' OR entity_id = '58e13090-63ab-4cf0-af58-4bcf74b160a4'
    ORDER BY created_at DESC
    LIMIT 20;
  `;
  const output = execSync(`npx supabase db query --linked --output-format json "${query.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.error('Error running query:', error.message);
}
