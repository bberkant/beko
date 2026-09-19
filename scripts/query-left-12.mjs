import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('pos_reports')
    .select('*')
    .eq('date', '2026-08-12')
    .single();
    
  if (error) {
    console.error(error.message);
  } else {
    console.log('Left Table JSON:', JSON.stringify(data.left_table, null, 2));
  }
}

run();
