import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fixCorruptedTurkishText } from '../src/lib/turkishTextFixer.ts';

// Load config from .env.local
const envPath = path.resolve('.env.local');
let supabaseUrl = "https://zubhjybqzcpplultpsgt.supabase.co";
let supabaseKey = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*(.*)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseKey = keyMatch[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairAllChecks() {
  console.log('=== EBS Checks Turkish Repair Migration ===');
  
  // Authenticate as admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@ops360.local',
    password: '123berkant_'
  });

  if (authError) {
    console.error('Auth error:', authError.message);
    process.exit(1);
  }
  console.log('Authenticated successfully as:', authData.user.email);

  let from = 0;
  const pageSize = 500;
  let totalFixed = 0;
  let totalScanned = 0;

  const fieldsToCheck = [
    'debtor',
    'kesideci',
    'creditor',
    'bank_name',
    'bank_branch',
    'ozel_alan',
    'keside_yeri',
    'ciro_edilen'
  ];

  while (true) {
    const { data: checks, error } = await supabase
      .from('ebs_checks')
      .select('id, debtor, kesideci, creditor, bank_name, bank_branch, ozel_alan, keside_yeri, ciro_edilen')
      .order('id')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Fetch error:', error);
      break;
    }

    if (!checks || checks.length === 0) break;
    totalScanned += checks.length;

    const updates = [];
    for (const c of checks) {
      const patch = {};
      let needsUpdate = false;

      for (const field of fieldsToCheck) {
        const orig = c[field];
        if (orig) {
          const fixed = fixCorruptedTurkishText(orig, field);
          if (fixed !== orig) {
            patch[field] = fixed;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        updates.push({ id: c.id, ...patch });
      }
    }

    if (updates.length > 0) {
      // Concurrency chunks
      const chunkSize = 25;
      for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (u) => {
            const { id, ...data } = u;
            const { error: uErr } = await supabase.from('ebs_checks').update(data).eq('id', id);
            if (uErr) {
              console.error(`Error updating check ${id}:`, uErr.message);
            } else {
              totalFixed++;
            }
          })
        );
      }
      console.log(`Page [${from}-${from + checks.length - 1}]: Repaired ${updates.length} checks. Cumulative repaired: ${totalFixed}`);
    }

    if (checks.length < pageSize) break;
    from += pageSize;
  }

  console.log(`\n=== Migration Completed Successfully! ===`);
  console.log(`Total checks scanned: ${totalScanned}`);
  console.log(`Total checks repaired in database: ${totalFixed}`);
}

repairAllChecks().catch(console.error);
