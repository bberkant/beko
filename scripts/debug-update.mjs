import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) {
  console.error('Auth error:', authError);
  process.exit(1);
}

// Check membership role
const { data: members } = await supabase
  .from('organization_members')
  .select('*')
  .eq('user_id', auth.user.id);
console.log('Member roles:', members);

const updateRes = await supabase
  .from('ebs_checks')
  .update({
    status: 'Tahsilde'
  })
  .eq('id', 'cfeeff1a-6384-44ef-94c7-925ea1df1aad');

console.log('Single check update result:', updateRes);

const { data: verifyRow } = await supabase
  .from('ebs_checks')
  .select('id, check_no, status, updated_at')
  .eq('id', 'cfeeff1a-6384-44ef-94c7-925ea1df1aad')
  .single();

console.log('Verified row:', verifyRow);
