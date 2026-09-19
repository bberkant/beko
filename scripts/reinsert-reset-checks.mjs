import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

// Fetch the exact two checks
const { data: checks } = await supabase
  .from('ebs_checks')
  .select('*')
  .in('check_no', ['5935989', '5935990']);

console.log("Found checks to reset:", checks);

for (const check of checks) {
  const correctedCheck = {
    ...check,
    status: 'Tahsilde',
    updated_at: new Date().toISOString()
  };

  // Delete the old row
  const delRes = await supabase.from('ebs_checks').delete().eq('id', check.id);
  console.log(`Deleted check ${check.check_no}:`, delRes);

  // Re-insert with status 'Tahsilde'
  const insRes = await supabase.from('ebs_checks').insert([correctedCheck]).select();
  console.log(`Re-inserted check ${check.check_no}:`, insRes);
}

// Verify both checks now
const { data: verifiedChecks } = await supabase
  .from('ebs_checks')
  .select('id, check_no, status, debtor, creditor, amount, due_date')
  .in('check_no', ['5935989', '5935990']);

console.log("\nFINAL VERIFICATION OF BOTH CHECKS IN DB:", verifiedChecks);
