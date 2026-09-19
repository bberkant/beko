import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: auth } = await supabase.auth.signInWithPassword({ email, password });

console.log("Logged in user:", auth.user.id);

// Let's test updating status of 5935989
const { data, error, count } = await supabase
  .from('ebs_checks')
  .update({
    status: 'Tahsilde'
  }, { count: 'exact' })
  .eq('check_no', '5935989')
  .select();

console.log("Update with count result:", { data, error, count });
