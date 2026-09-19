import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

// 1. Search recent records created or updated in the last 3 days
const { data: recentChecks } = await supabase
  .from('ebs_checks')
  .select('*')
  .gte('created_at', '2026-09-08T00:00:00Z')
  .order('created_at', { ascending: false });

console.log("Recent checks created in last 3 days:", recentChecks);

// 2. Search all checks with due_date = '2026-09-09'
const { data: yesterdayChecks } = await supabase
  .from('ebs_checks')
  .select('*')
  .eq('due_date', '2026-09-09');

console.log("Yesterday (09.09.2026) due_date checks:", yesterdayChecks);
