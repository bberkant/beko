import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

console.log("Current rows for 5935989 and 5935990:");
const { data: rowsBefore } = await supabase
  .from('ebs_checks')
  .select('id, check_no, status, debtor, creditor, ozel_alan, updated_at')
  .in('check_no', ['5935989', '5935990']);
console.log(rowsBefore);

console.log("\nAttempting update with status: 'Tahsilde'...");
const update1 = await supabase
  .from('ebs_checks')
  .update({
    status: 'Tahsilde',
    bank_branch: ''
  })
  .eq('check_no', '5935989');
console.log("Update 1 result:", update1);

console.log("\nAttempting update on 5935990 with status: 'Tahsilde'...");
const update2 = await supabase
  .from('ebs_checks')
  .update({
    status: 'Tahsilde',
    bank_branch: ''
  })
  .eq('check_no', '5935990');
console.log("Update 2 result:", update2);

const { data: rowsAfter } = await supabase
  .from('ebs_checks')
  .select('id, check_no, status, debtor, creditor, ozel_alan, updated_at')
  .in('check_no', ['5935989', '5935990']);
console.log("\nRows after update:", rowsAfter);
