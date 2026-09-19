import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*(.*)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseKey = keyMatch[1].trim();
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Authenticating...');
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'drama@ops360.local',
    password: '365200'
  });

  if (authError) {
    console.error('Auth error:', authError.message);
    return;
  }

  console.log('Fetching all kesim records in batches...');
  const records = [];
  let from = 0;
  const step = 1000;
  while (true) {
    console.log(`Fetching records from ${from} to ${from + step - 1}...`);
    const { data, error } = await supabase
      .from('kesim_listesi')
      .select('id, slaughter_date, supplier, carcass_weight, animal_type, total_amount')
      .eq('organization_id', '13b8da90-27d1-440d-a8f4-eb50dadd6391')
      .range(from, from + step - 1);

    if (error) {
      console.error('Fetch error:', error.message);
      return;
    }
    if (!data || data.length === 0) break;
    records.push(...data);
    if (data.length < step) break;
    from += step;
  }

  console.log(`Fetched total ${records.length} records. Grouping for duplicates...`);

  const groups = {};
  records.forEach(x => {
    const key = `${x.slaughter_date}|${String(x.supplier).trim().toUpperCase()}|${x.carcass_weight}|${String(x.animal_type).trim().toUpperCase()}|${x.total_amount}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(x.id);
  });

  const idsToDelete = [];
  let keptCount = 0;

  for (const [key, ids] of Object.entries(groups)) {
    if (ids.length > 1) {
      // Keep the first ID, delete the rest
      const keptId = ids[0];
      const duplicatesToDelete = ids.slice(1);
      idsToDelete.push(...duplicatesToDelete);
      keptCount++;
    }
  }

  console.log(`Found ${idsToDelete.length} duplicate records to delete across ${keptCount} duplicate groups.`);

  if (idsToDelete.length === 0) {
    console.log('No duplicates found. Database is clean!');
    return;
  }

  console.log('Deleting duplicate records in batches...');
  const batchSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error: deleteError, count } = await supabase
      .from('kesim_listesi')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError.message);
    } else {
      deletedCount += batch.length;
      console.log(`Deleted ${deletedCount}/${idsToDelete.length} records...`);
    }
  }

  console.log('Cleanup completed successfully!');
}

main().catch(console.error);
