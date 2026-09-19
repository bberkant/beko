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

console.log("Updating checks 5935989 and 5935990 status from 'Ödendi' back to 'Tahsilde'...");

const { data, error } = await supabase
  .from('ebs_checks')
  .update({
    status: 'Tahsilde',
    updated_at: new Date().toISOString()
  })
  .in('check_no', ['5935989', '5935990'])
  .select();

console.log("Update result:", data, error);
