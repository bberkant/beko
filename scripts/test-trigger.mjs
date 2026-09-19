import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

// Let's test updating another field like bank_branch to see if updates work
const testUpdate = await supabase
  .from('ebs_checks')
  .update({
    bank_branch: 'TEST_BRANCH',
    status: 'Tahsilde'
  })
  .eq('check_no', '5935989')
  .select();

console.log('Test update result:', JSON.stringify(testUpdate, null, 2));
