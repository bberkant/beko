import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
await supabase.auth.signInWithPassword({ email, password });

// Update Ankara Semih due_date to today (2026-09-10)
const { data, error } = await supabase
  .from('ebs_checks')
  .update({
    due_date: '2026-09-10',
    ozel_alan: 'TAKASTA'
  })
  .eq('id', 'e81b3ca1-56e5-4d42-9af4-13df64a4b41c')
  .select();

console.log("Updated Ankara Semih to today:", data, error);
