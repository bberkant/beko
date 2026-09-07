import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const SUPABASE_URL = 'https://zubhjybqzcpplultpsgt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanNum(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseDynamicBank(ws, bankName, startSearchRow, isRight) {
  if (!ws) return null;
  const colAmtOut = isRight ? 'F' : 'A';
  const colDescOut = isRight ? 'G' : 'B';
  const colAmtIn = isRight ? 'H' : 'C';
  const colDescIn = isRight ? 'I' : 'D';

  let headerRow = -1;
  for (let r = startSearchRow; r <= startSearchRow + 40; r++) {
    const cellVal = String(ws[colAmtOut + r]?.v || '').trim().toUpperCase();
    if (cellVal.includes(bankName.toUpperCase())) {
      headerRow = r;
      break;
    }
  }
  if (headerRow === -1) return null;

  let diffRow = -1;
  for (let r = headerRow + 1; r <= headerRow + 80; r++) {
    const c1 = String(ws[colDescOut + r]?.v || '').trim().toUpperCase();
    const c2 = String(ws[colAmtIn + r]?.v || '').trim().toUpperCase();
    const c3 = String(ws[colDescIn + r]?.v || '').trim().toUpperCase();
    if (c1.includes('ALDIK') || c1.includes('YATAN') || 
        c2.includes('ALDIK') || c2.includes('YATAN') || 
        c3.includes('ALDIK') || c3.includes('YATAN')) {
      diffRow = r;
      break;
    }
  }
  if (diffRow === -1) return null;

  const totalRow = diffRow - 1;
  const outflows = {};
  const inflows = {};
  let maxRowIndex = -1;

  let rowIndex = 0;
  for (let r = headerRow + 1; r < totalRow; r++) {
    const outAmt = cleanNum(ws[colAmtOut + r]?.v);
    const outDesc = String(ws[colDescOut + r]?.v || '').trim();
    const inAmt = cleanNum(ws[colAmtIn + r]?.v);
    const inDesc = String(ws[colDescIn + r]?.v || '').trim();

    if (outAmt !== null || outDesc !== '' || inAmt !== null || inDesc !== '') {
      maxRowIndex = Math.max(maxRowIndex, rowIndex);
      if (outAmt !== null || outDesc !== '') {
        outflows[rowIndex] = { amount: outAmt, description: outDesc };
      }
      if (inAmt !== null || inDesc !== '') {
        inflows[rowIndex] = { amount: inAmt, description: inDesc };
      }
    }
    rowIndex++;
  }

  const calcTotalOut = Object.values(outflows).reduce((s, x) => s + (x.amount || 0), 0);
  const calcTotalIn = Object.values(inflows).reduce((s, x) => s + (x.amount || 0), 0);

  const totalOut = cleanNum(ws[colAmtOut + totalRow]?.v) ?? calcTotalOut;
  const totalIn = cleanNum(ws[colAmtIn + totalRow]?.v) ?? calcTotalIn;

  const diffValRaw = cleanNum(ws[colDescOut + diffRow]?.v) ?? cleanNum(ws[colAmtIn + diffRow]?.v);
  const diffVal = diffValRaw !== null ? diffValRaw : (totalIn - totalOut);

  const statusText = [
    String(ws[colDescOut + diffRow]?.v || ''),
    String(ws[colAmtIn + diffRow]?.v || ''),
    String(ws[colDescIn + diffRow]?.v || '')
  ].join(' ').toUpperCase();

  let diffType = 'ALDIK';
  if (statusText.includes('YATAN')) diffType = 'YATAN';
  else if (statusText.includes('ALDIK')) diffType = 'ALDIK';
  else if (diffVal > 0) diffType = 'YATAN';

  return {
    bankName,
    outflows,
    inflows,
    totalOut,
    totalIn,
    diff: diffVal,
    diffType,
    maxRowIndex
  };
}

export function parseGunlukHesapWorkbook(wb) {
  const s1 = wb.Sheets['Sayfa1'] || wb.Sheets[wb.SheetNames[0]];
  const s2 = wb.Sheets['Sayfa1 (2)'] || wb.Sheets[wb.SheetNames[1]];
  const s3 = wb.Sheets['Sayfa1 (3)'] || wb.Sheets[wb.SheetNames[2]];

  const banks = {
    'HALKBANK': parseDynamicBank(s1, 'HALKBANK', 1, false) || { bankName: 'HALKBANK', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'ZİRAAT': parseDynamicBank(s1, 'ZİRAAT', 1, true) || { bankName: 'ZİRAAT', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'GARANTİ': parseDynamicBank(s1, 'GARANTİ', 15, false) || { bankName: 'GARANTİ', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'AKBANK': parseDynamicBank(s1, 'AKBANK', 15, true) || { bankName: 'AKBANK', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'İŞBANK': parseDynamicBank(s2, 'İŞBANK', 1, false) || { bankName: 'İŞBANK', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'DENİZ': parseDynamicBank(s2, 'DENİZ', 1, true) || { bankName: 'DENİZ', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'ŞEKER/TEB': parseDynamicBank(s2, 'ŞEKER', 10, false) || { bankName: 'ŞEKER/TEB', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'YAPI': parseDynamicBank(s2, 'YAPI', 12, true) || { bankName: 'YAPI', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'ALBARAKA': parseDynamicBank(s2, 'ALBARAKA', 20, false) || { bankName: 'ALBARAKA', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'VAKIF': parseDynamicBank(s2, 'VAKIF', 20, true) || { bankName: 'VAKIF', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
    'KUVEYT': parseDynamicBank(s3, 'KUVEYT', 1, false) || { bankName: 'KUVEYT', outflows: {}, inflows: {}, totalOut: 0, totalIn: 0, diff: 0, diffType: 'ALDIK', maxRowIndex: -1 },
  };

  return banks;
}

async function run() {
  console.log('Fetching files from Supabase Storage kasa-excel-yedekleri/GUNLUK-HESAP...');
  
  let allFiles = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.storage
      .from('kasa-excel-yedekleri')
      .list('GUNLUK-HESAP', { limit: pageSize, offset: page * pageSize });
    if (error) {
      console.error('Storage list error:', error);
      break;
    }
    if (!data || data.length === 0) break;
    allFiles.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  const excelFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.xlsx'));
  console.log(`Found ${excelFiles.length} files in GUNLUK-HESAP storage.`);

  // Sort files: 2026 first, then newest
  excelFiles.sort((a, b) => {
    const a2026 = a.name.includes('2026');
    const b2026 = b.name.includes('2026');
    if (a2026 && !b2026) return -1;
    if (!a2026 && b2026) return 1;
    return b.name.localeCompare(a.name);
  });

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < excelFiles.length; i++) {
    const file = excelFiles[i];
    const fileName = file.name;
    const m = fileName.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (!m) {
      continue;
    }
    const reportDate = `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;

    try {
      const { data, error } = await supabase.storage
        .from('kasa-excel-yedekleri')
        .download(`GUNLUK-HESAP/${fileName}`);
      
      if (error || !data) {
        console.error(`[${i+1}/${excelFiles.length}] Download failed for ${fileName}:`, error?.message);
        failCount++;
        continue;
      }

      const buf = Buffer.from(await data.arrayBuffer());
      const wb = XLSX.read(buf, { type: 'buffer' });
      const banks = parseGunlukHesapWorkbook(wb);

      // Get existing data rows if present
      const { data: existing } = await supabase
        .from('cashbox_gunluk_hesap_reports')
        .select('data')
        .eq('report_date', reportDate)
        .maybeSingle();

      const existingData = existing?.data || {};
      const updatedData = {
        ...existingData,
        banks
      };

      const { error: upsertErr } = await supabase
        .from('cashbox_gunluk_hesap_reports')
        .upsert({
          report_date: reportDate,
          data: updatedData,
          raw_file_name: fileName,
          source: 'office_pc_sync',
          updated_at: new Date().toISOString()
        }, { onConflict: 'report_date' });

      if (upsertErr) {
        console.error(`[${i+1}/${excelFiles.length}] Upsert failed for ${reportDate}:`, upsertErr.message);
        failCount++;
      } else {
        successCount++;
        if (successCount % 20 === 0 || i < 10) {
          console.log(`[${i+1}/${excelFiles.length}] Saved ${reportDate} (${fileName}) - Kuveyt diff: ${banks.KUVEYT.diff} ${banks.KUVEYT.diffType}`);
        }
      }
    } catch (err) {
      console.error(`[${i+1}/${excelFiles.length}] Error processing ${fileName}:`, err.message);
      failCount++;
    }
  }

  console.log(`\nReparse completed. Success: ${successCount}, Fail: ${failCount}`);
}

run();
