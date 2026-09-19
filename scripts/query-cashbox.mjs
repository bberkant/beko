import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zubhjybqzcpplultpsgt.supabase.co';
const supabaseKey = 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG';
const supabase = createClient(supabaseUrl, supabaseKey);

const main = async () => {
  const { data, error } = await supabase
    .from('pos_reports')
    .select('date, right_table')
    .order('date', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('--- ALL POS REPORT DATES ---');
    data.forEach(row => {
      console.log(`Date: ${row.date} | Right Table length: ${row.right_table ? row.right_table.length : 0}`);
    });
  }
};

main();
