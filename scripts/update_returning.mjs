import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = `
    UPDATE public.ebs_checks 
    SET status = 'Portföyde' 
    WHERE id = '58e13090-63ab-4cf0-af58-4bcf74b160a4'
    RETURNING id, status, amount, due_date;
  `;
  const output = execSync(`npx supabase db query --linked --output-format json "${query.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.error('Error:', error.message);
}
