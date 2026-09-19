import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

// Search for Semih or Ankara in ebs_checks
const { data: semihChecks, error } = await supabase
  .from('ebs_checks')
  .select('*')
  .or('creditor.ilike.%Semih%,debtor.ilike.%Semih%,ozel_alan.ilike.%Semih%,kesideci.ilike.%Semih%,creditor.ilike.%Ankara%,debtor.ilike.%Ankara%,ozel_alan.ilike.%Ankara%');

console.log("Semih / Ankara checks:", JSON.stringify(semihChecks, null, 2), error);
