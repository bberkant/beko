import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zubhjybqzcpplultpsgt.supabase.co";
const SUPABASE_KEY = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let s = String(val).trim().replace(/₺|TL/g, '').trim();
  const isNegative = s.startsWith('-');
  s = s.replace(/-/g, '');

  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
  }

  const clean = s.replace(/[^0-9.]/g, '');
  const res = parseFloat(clean);
  if (isNaN(res)) return 0;
  return isNegative ? -res : res;
}

function formatInt(num) {
  if (num === '' || num === null || num === undefined) return '';
  const rounded = Math.round(Number(num));
  if (isNaN(rounded)) return '';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(rounded);
}

async function alignDates() {
  console.log('=== ALIGNING SEPTEMBER & JULY 2026 RECORDS IN SUPABASE ===\n');

  // Fetch all 2026 records from 2026-06-01 to 2026-09-30
  const { data: records, error } = await supabase
    .from('cashbox_giris_cikis_reports')
    .select('*')
    .gte('report_date', '2026-06-01')
    .lte('report_date', '2026-09-30')
    .order('report_date', { ascending: true });

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  console.log(`Checking ${records.length} records in 2026...`);
  let fixedCount = 0;

  for (const r of records) {
    const needsFix = Math.abs(r.bakiye_farki || 0) > 0.01 || Math.abs((r.ana_kasa_total || 0) - (r.net_kalan || 0)) > 0.01;
    
    // Also check if ana_kasa_list rows need gunSonu
    let listChanged = false;
    const rawList = r.ana_kasa_list || [];
    const updatedList = rawList.map(item => {
      if (!item) return item;
      const rawName = String(item.name || '').trim();
      const upper = rawName.toLocaleUpperCase('tr-TR');
      if (!rawName) return item;

      const isKasa = upper === 'KASA';
      const devirNum = cleanNum(item.devir);
      const moveNum = cleanNum(item.movement);
      const posNum = cleanNum(item.pos);
      const duzNum = cleanNum(item.duzeltme);

      let gunSonu = item.gunSonu;
      if (gunSonu === undefined || gunSonu === null || String(gunSonu).trim() === '' || gunSonu === 0 || gunSonu === '0') {
        const computed = isKasa ? (moveNum + posNum + duzNum) : (devirNum + moveNum + posNum + duzNum);
        if (computed !== 0 || item.movement !== '' || item.pos !== '' || item.duzeltme !== '') {
          gunSonu = formatInt(computed);
          listChanged = true;
          return { ...item, gunSonu };
        }
      }
      return item;
    });

    if (needsFix || listChanged) {
      const netKalan = r.net_kalan;
      const targetAnaKasaTotal = netKalan;
      const targetBakiyeFarki = 0;

      const { error: updErr } = await supabase
        .from('cashbox_giris_cikis_reports')
        .update({
          ana_kasa_total: targetAnaKasaTotal,
          bakiye_farki: targetBakiyeFarki,
          ana_kasa_list: updatedList,
          updated_at: new Date().toISOString()
        })
        .eq('id', r.id);

      if (updErr) {
        console.error(`Error updating ${r.report_date}:`, updErr.message);
      } else {
        console.log(`✅ [FIXED] ${r.report_date}: Net=${netKalan}, AnaKasa=${targetAnaKasaTotal}, Fark=0 (was ${r.bakiye_farki})`);
        fixedCount++;
      }
    }
  }

  console.log(`\n🎉 Total records aligned: ${fixedCount}`);
}

alignDates();
