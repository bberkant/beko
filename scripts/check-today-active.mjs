import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

const todayStr = '2026-09-10';

const { data: todayActive } = await supabase
  .from('ebs_checks')
  .select('id, check_no, debtor, creditor, amount, due_date, status, ozel_alan')
  .eq('due_date', todayStr)
  .neq('status', 'Ödendi');

console.log(`\nTODAY'S ACTIVE CHECKS (Total: ${todayActive?.length}):`);
console.table(todayActive);
