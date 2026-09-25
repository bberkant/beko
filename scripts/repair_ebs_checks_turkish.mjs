import { createClient } from '@supabase/supabase-js';
import { fixCorruptedTurkishText } from '../src/lib/turkishTextFixer.ts';

const SUPABASE_URL = "https://zubhjybqzcpplultpsgt.supabase.co";
const SUPABASE_KEY = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function repairAllChecks() {
  console.log('=== EBS Checks Turkish Repair Migration ===');
  let from = 0;
  const pageSize = 500;
  let totalFixed = 0;

  const fieldsToCheck = ['debtor', 'kesideci', 'creditor', 'bank_name', 'ozel_alan', 'keside_yeri', 'ciro_edilen'];

  while (true) {
    const { data: checks, error } = await supabase
      .from('ebs_checks')
      .select('id, debtor, kesideci, creditor, bank_name, ozel_alan, keside_yeri, ciro_edilen')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Fetch error:', error);
      break;
    }

    if (!checks || checks.length === 0) break;

    const updates = [];
    for (const c of checks) {
      const patch = {};
      let needsUpdate = false;

      for (const field of fieldsToCheck) {
        const orig = c[field];
        if (orig) {
          const fixed = fixCorruptedTurkishText(orig);
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
      for (const u of updates) {
        const { id, ...data } = u;
        const { error: uErr } = await supabase.from('ebs_checks').update(data).eq('id', id);
        if (uErr) {
          console.error(`Error updating check ${id}:`, uErr.message);
        } else {
          totalFixed++;
        }
      }
      console.log(`Page [${from}-${from + checks.length - 1}]: Updated ${updates.length} checks. Cumulative: ${totalFixed}`);
    }

    if (checks.length < pageSize) break;
    from += pageSize;
  }

  console.log(`\nMigration completed! Total checks repaired in database: ${totalFixed}`);
}

repairAllChecks().catch(console.error);
