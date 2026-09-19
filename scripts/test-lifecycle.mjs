import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: auth } = await supabase.auth.signInWithPassword({ email, password });

// 1. Insert test check
const { data: inserted, error: insErr } = await supabase
  .from('ebs_checks')
  .insert({
    organization_id: '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    check_type: 'kesilen',
    check_no: 'TEST_999999',
    amount: 100,
    status: 'Tahsilde'
  })
  .select();

console.log("Inserted test check:", inserted, insErr);

if (inserted && inserted[0]) {
  // Update status to Ödendi
  const { data: upd1 } = await supabase
    .from('ebs_checks')
    .update({ status: 'Ödendi' })
    .eq('id', inserted[0].id)
    .select();
  console.log("Updated to Ödendi:", upd1);

  // Update status back to Tahsilde
  const { data: upd2 } = await supabase
    .from('ebs_checks')
    .update({ status: 'Tahsilde' })
    .eq('id', inserted[0].id)
    .select();
  console.log("Updated back to Tahsilde:", upd2);

  // Clean up
  await supabase.from('ebs_checks').delete().eq('id', inserted[0].id);
}
