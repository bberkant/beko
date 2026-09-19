import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

const todayStr = '2026-09-10';

const { data: pastUnpaidKesilen } = await supabase
  .from('ebs_checks')
  .select('id, check_no, debtor, creditor, amount, due_date, status, ozel_alan')
  .eq('check_type', 'kesilen')
  .in('status', ['Tahsilde', 'beklemede', 'ödenmedi', 'Beklemede'])
  .lt('due_date', todayStr)
  .order('due_date', { ascending: false });

console.log(`Past unpaid kesilen checks count: ${pastUnpaidKesilen?.length}`);
console.log("Recent 10 past unpaid kesilen checks:", pastUnpaidKesilen?.slice(0, 10));
