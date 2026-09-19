import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('pos_reports')
    .select('*')
    .gte('date', '2026-08-01')
    .lte('date', '2026-08-15')
    .order('date', { ascending: true });
    
  if (error) {
    console.error(error.message);
  } else {
    data.forEach(day => {
      console.log(`=== Date: ${day.date} ===`);
      const left = day.left_table || [];
      left.forEach(row => {
        console.log(`  ${row.bank} - Şubeler: ${row.colB}, Banka Geçen: ${row.banka_gecen}, Kesinti: ${row.kesinti}, Komisyon: ${row.komisyon}`);
      });
    });
  }
}

run();
