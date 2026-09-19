import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = `
    SELECT id, check_type, document_type, amount, due_date, status, debtor, creditor, kesideci, ozel_alan, check_no
    FROM public.ebs_checks
    WHERE (due_date >= '2026-09-15' AND due_date <= '2026-09-18')
    ORDER BY due_date DESC;
  `;
  const output = execSync(`npx supabase db query --linked --output-format json "${query.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.error('Error running query:', error.message);
}
