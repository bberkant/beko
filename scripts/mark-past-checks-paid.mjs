import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

const todayStr = '2026-09-10';

// Find all past checks with due_date < todayStr that have status != 'Ödendi'
const { data: pastUnpaid } = await supabase
  .from('ebs_checks')
  .select('*')
  .lt('due_date', todayStr)
  .neq('status', 'Ödendi');

console.log(`Found ${pastUnpaid?.length} past unpaid checks to update to 'Ödendi'...`);

let updatedCount = 0;
for (const check of (pastUnpaid || [])) {
  const { error } = await supabase
    .from('ebs_checks')
    .update({
      status: 'Ödendi',
      updated_at: new Date().toISOString()
    })
    .eq('id', check.id);
  
  if (!error) updatedCount++;
}

console.log(`Successfully updated ${updatedCount} past checks to 'Ödendi'!`);

// Let's verify what remains active for today (due_date >= todayStr)
const { data: activeToday } = await supabase
  .from('ebs_checks')
  .select('id, check_no, debtor, creditor, amount, due_date, status')
  .eq('due_date', todayStr)
  .neq('status', 'Ödendi');

console.log(`\nActive checks for TODAY (${todayStr}):`, activeToday);
