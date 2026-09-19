import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  console.log('Running update 1...');
  execSync(`npx supabase db query --linked "UPDATE public.ebs_checks SET status = 'Ödendi' WHERE id = '92689778-78a1-4d48-a362-1db5d14d903b';"`, { encoding: 'utf-8' });
  
  console.log('Running update 2...');
  execSync(`npx supabase db query --linked "UPDATE public.ebs_checks SET status = 'Teminata Verildi' WHERE id = '58e13090-63ab-4cf0-af58-4bcf74b160a4';"`, { encoding: 'utf-8' });

  console.log('Done.');
} catch (error) {
  console.error('Error:', error.message);
}
