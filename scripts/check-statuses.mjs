import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

const { data: checks } = await supabase
  .from('ebs_checks')
  .select('status, check_type');

const statusCounts = {};
checks?.forEach(c => {
  const k = `${c.check_type} | ${c.status}`;
  statusCounts[k] = (statusCounts[k] || 0) + 1;
});

console.log('Distinct status counts:', statusCounts);
