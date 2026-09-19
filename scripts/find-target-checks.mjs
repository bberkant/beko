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

const { data: checks, error } = await supabase
  .from('ebs_checks')
  .select('*')
  .in('check_no', ['5935990', '5935989']);

console.log('Checks found:', JSON.stringify(checks, null, 2), error);
