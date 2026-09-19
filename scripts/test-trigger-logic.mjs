import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

// Check what happens if status is 'Tahsilde ' or 'Beklemede' or 'Portföyde' or null or ''
const { data: testNull } = await supabase
  .from('ebs_checks')
  .insert({
    organization_id: '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    check_type: 'kesilen',
    check_no: 'TEST_TRIGGER_2',
    amount: 100,
    status: 'Ödendi'
  })
  .select();

console.log("Test check created with status Ödendi:", testNull[0]?.id);

// Try updating status to empty string or null
const resNull = await supabase
  .from('ebs_checks')
  .update({ status: null })
  .eq('id', testNull[0]?.id)
  .select();
console.log("Update to null:", resNull.data);

const resEmpty = await supabase
  .from('ebs_checks')
  .update({ status: '' })
  .eq('id', testNull[0]?.id)
  .select();
console.log("Update to empty:", resEmpty.data);

const resBeklemede = await supabase
  .from('ebs_checks')
  .update({ status: 'Tahsilde' })
  .eq('id', testNull[0]?.id)
  .select();
console.log("Update to Tahsilde after empty:", resBeklemede.data);

// Delete test row
await supabase.from('ebs_checks').delete().eq('id', testNull[0]?.id);
