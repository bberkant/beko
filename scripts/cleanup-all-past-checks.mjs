import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

const todayStr = '2026-09-10';

let totalUpdated = 0;
while (true) {
  const { data: remaining, error: selectErr } = await supabase
    .from('ebs_checks')
    .select('id')
    .lt('due_date', todayStr)
    .neq('status', 'Ödendi')
    .limit(100);

  if (selectErr || !remaining || remaining.length === 0) break;

  const ids = remaining.map(r => r.id);
  const { error: updErr } = await supabase
    .from('ebs_checks')
    .update({ status: 'Ödendi' })
    .in('id', ids);

  if (updErr) {
    console.error("Batch update error:", updErr);
    break;
  }
  totalUpdated += ids.length;
}

console.log(`Total past checks updated to Ödendi: ${totalUpdated}`);

// Check remaining
const { count } = await supabase
  .from('ebs_checks')
  .select('id', { count: 'exact', head: true })
  .lt('due_date', todayStr)
  .neq('status', 'Ödendi');

console.log(`Remaining past unpaid checks count: ${count}`);
