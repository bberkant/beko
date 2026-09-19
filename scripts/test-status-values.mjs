import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

// Test updating with different values
for (const testVal of ['Portföyde', 'Beklemede', 'Ödenmedi', 'Tahsilde', 'tahsilde', 'Ödendi', 'Bankada Tahsilde']) {
  const res = await supabase
    .from('ebs_checks')
    .update({ status: testVal })
    .eq('check_no', '5935989')
    .select('id, status');
  console.log(`Setting status to '${testVal}':`, res.data, res.error);
}
