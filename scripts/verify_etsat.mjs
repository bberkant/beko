import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = `
    SELECT id, check_type, amount, due_date, status, creditor, kesideci, debtor
    FROM public.ebs_checks
    WHERE id IN ('92689778-78a1-4d48-a362-1db5d14d903b', '58e13090-63ab-4cf0-af58-4bcf74b160a4');
  `;
  const output = execSync(`npx supabase db query --linked --output-format json "${query.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.error('Error running query:', error.message);
}
