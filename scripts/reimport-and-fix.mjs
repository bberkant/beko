import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = '13b8da90-27d1-440d-a8f4-eb50dadd6391';

function getRealFilePath() {
  const base = 'C:/Users/berka';
  let foundPath = null;
  function walk(dir) {
    if (foundPath) return;
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        if (item.toLowerCase() === 'ağustos-2026.xlsx') {
          foundPath = full;
          return;
        }
        try {
          const isDir = fs.statSync(full).isDirectory();
          if (isDir && !item.startsWith('.') && !item.includes('node_modules')) {
            walk(full);
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
  walk(base);
  return foundPath;
}

const excelPath = getRealFilePath();
if (!excelPath) {
  console.error('Excel file not found!');
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);

const DEFAULT_LEFT_ROWS = [
  { bank: 'ZİRAAT', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
  { bank: 'GARANTİ', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
  { bank: 'DENİZBANK', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
  { bank: 'KUVEYT', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
  { bank: 'ALBARAKA', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
  { bank: 'Ö. ZİRAAT', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
  { bank: 'AKBANK', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
];

const TEMPLATE_RIGHT_ROWS = [
  { name: 'MERKEZ', amount: '' },
  { name: 'ÇIKIŞ', amount: '' },
  { name: 'Ö.ZİRAAT', amount: '' },
  { name: 'MERZİFON', amount: '' },
  { name: 'GARANTİ', amount: '' },
  { name: 'ZİRAAT', amount: '' },
  { name: 'AKBANK', amount: '' },
  { name: 'ATAKUM', amount: '' },
  { name: 'KUVEYT', amount: '' },
  { name: 'HALK', amount: '' },
  { name: 'GARANTİ', amount: '' },
  { name: 'ALBARAKA', amount: '' },
  { name: 'ZİRAAT', amount: '' },
  { name: 'İLKADIM', amount: '' },
  { name: 'ZİRAAT', amount: '' },
  { name: 'DENİZ', amount: '' },
  { name: 'KUVEYT', amount: '' },
  { name: 'DEPO', amount: '' },
  { name: 'KUVEYT', amount: '' },
  { name: 'DENİZ', amount: '' },
];

const matchLeftBankName = (name) => {
  const norm = name.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
  if (norm.includes('ZİRAAT') && !norm.includes('Ö')) return 'ZİRAAT';
  if (norm.includes('Ö.ZİRAAT') || norm.includes('ÖZELZİRAAT')) return 'Ö. ZİRAAT';
  if (norm.includes('GARANTİ')) return 'GARANTİ';
  if (norm.includes('DENİZ')) return 'DENİZBANK';
  if (norm.includes('KUVEYT')) return 'KUVEYT';
  if (norm.includes('ALBARAKA')) return 'ALBARAKA';
  if (norm.includes('AKBANK')) return 'AKBANK';
  return null;
};

const matchPOSName = (leftBank, rightName) => {
  const normLeft = leftBank.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
  const normRight = rightName.replace(/\s+/g, '').toLocaleUpperCase('tr-TR');
  if (normLeft === '' || normRight === '') return false;
  if (normLeft === 'DENİZBANK' && normRight === 'DENİZ') return true;
  if (normLeft === 'DENİZ' && normRight === 'DENİZBANK') return true;
  if (normLeft === 'ZİRAAT' && normRight === 'Ö.ZİRAAT') return false;
  if (normLeft === 'Ö.ZİRAAT' && normRight === 'ZİRAAT') return false;
  return normLeft === normRight;
};

const formatTRNum = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0,00';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

const parseFormattedNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = val.replace(/\./g, '').replace(/,/g, '.').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

async function processDay(dayStr) {
  const worksheet = workbook.Sheets[dayStr];
  if (!worksheet) {
    console.log(`Day sheet ${dayStr} not found.`);
    return;
  }
  
  let leftHeader = null;
  let rightHeader = null;
  
  const maxR = 60;
  const maxC = 15;
  
  // Find Headers
  for (let r = 0; r < maxR; r++) {
    for (let c = 0; c < maxC; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === undefined) continue;
      const val = String(cell.v).trim().toLocaleUpperCase('tr-TR');
      
      if (!leftHeader && (val === 'POS' || val === 'POSLAR')) {
        leftHeader = { r, c };
      }
      
      if (!rightHeader && (val === 'CARİ / AÇIKLAMA' || val === 'ŞUBE DAĞILIMI' || val === 'ŞUBE' || val === 'ŞUBELER') && (r >= 10 || c >= 4)) {
        rightHeader = { r, c };
      }
    }
  }
  
  if (!leftHeader || !rightHeader) {
    console.log(`Headers not found for day ${dayStr}.`);
    return;
  }
  
  const nextColCell = worksheet[XLSX.utils.encode_cell({ r: leftHeader.r, c: leftHeader.c + 1 })];
  const nextColVal = nextColCell && nextColCell.v ? String(nextColCell.v).trim().toLocaleUpperCase('tr-TR') : '';
  const isMonthlyLayout = nextColVal.includes('ŞUBE');
  
  // 1. Parse Right Table
  const parsedRight = [];
  for (let r = rightHeader.r + 1; r < maxR; r++) {
    const nameCell = worksheet[XLSX.utils.encode_cell({ r, c: rightHeader.c })];
    if (!nameCell || nameCell.v === undefined) break;
    const name = String(nameCell.v).trim();
    if (name.toLocaleUpperCase('tr-TR') === 'TOPLAM' || name === '') break;
    
    const amtCell = worksheet[XLSX.utils.encode_cell({ r, c: rightHeader.c + 1 })];
    const amount = amtCell ? amtCell.v : 0;
    
    parsedRight.push({
      name,
      amount: typeof amount === 'number' ? formatTRNum(amount) : String(amount).trim()
    });
  }
  
  // Pad Right Rows by Index
  const finalRightTable = TEMPLATE_RIGHT_ROWS.map((templateRow, idx) => {
    const dbRow = parsedRight[idx];
    return {
      name: templateRow.name,
      amount: dbRow ? dbRow.amount : ''
    };
  });
  if (parsedRight.length > TEMPLATE_RIGHT_ROWS.length) {
    for (let i = TEMPLATE_RIGHT_ROWS.length; i < parsedRight.length; i++) {
      finalRightTable.push(parsedRight[i]);
    }
  }
  
  // 2. Parse Left Table
  const leftTableMapping = {};
  for (let r = leftHeader.r + 1; r < maxR; r++) {
    const posCell = worksheet[XLSX.utils.encode_cell({ r, c: leftHeader.c })];
    if (!posCell || posCell.v === undefined) break;
    const posName = String(posCell.v).trim();
    if (posName.toLocaleUpperCase('tr-TR') === 'TOPLAM' || posName === '') break;
    
    const mappedName = matchLeftBankName(posName);
    if (mappedName) {
      let rawAmt = 0;
      let rawBankaGecen = 0;
      let rawKom = 0;
      let rawKes = 0;
      
      if (isMonthlyLayout) {
        const cellB = worksheet[XLSX.utils.encode_cell({ r, c: leftHeader.c + 1 })];
        const cellC = worksheet[XLSX.utils.encode_cell({ r, c: leftHeader.c + 2 })];
        const cellD = worksheet[XLSX.utils.encode_cell({ r, c: leftHeader.c + 3 })];
        const cellE = worksheet[XLSX.utils.encode_cell({ r, c: leftHeader.c + 4 })];
        
        rawAmt = cellB ? cellB.v : 0;
        rawBankaGecen = cellC ? cellC.v : 0;
        rawKom = cellD ? cellD.v : 0;
        rawKes = cellE ? cellE.v : 0;
      } else {
        const cellB = worksheet[XLSX.utils.encode_cell({ r, c: leftHeader.c + 1 })];
        const cellC = worksheet[XLSX.utils.encode_cell({ r, c: leftHeader.c + 2 })];
        const cellD = worksheet[XLSX.utils.encode_cell({ r, c: leftHeader.c + 3 })];
        
        rawBankaGecen = cellB ? cellB.v : 0;
        rawKom = cellC ? cellC.v : 0;
        rawKes = cellD ? cellD.v : 0;
      }
      
      leftTableMapping[mappedName] = {
        colB: typeof rawAmt === 'number' ? formatTRNum(rawAmt) : String(rawAmt).trim(),
        banka_gecen: typeof rawBankaGecen === 'number' ? formatTRNum(rawBankaGecen) : String(rawBankaGecen).trim(),
        komisyon: typeof rawKom === 'number' ? formatTRNum(rawKom * (rawKom < 1 ? 100 : 1)) : String(rawKom).trim(),
        kesinti: typeof rawKes === 'number' ? formatTRNum(rawKes) : String(rawKes).trim()
      };
    }
  }
  
  // Construct Left Table
  const finalLeftTable = DEFAULT_LEFT_ROWS.map(templateRow => {
    const match = leftTableMapping[templateRow.bank] || {};
    
    let colB = match.colB || '';
    let bankaGecen = match.banka_gecen || '';
    
    // Automatically calculate colB if it is a Daily layout (where colB in excel is empty)
    if (!isMonthlyLayout) {
      let sumB = 0;
      finalRightTable.forEach(r => {
        if (matchPOSName(templateRow.bank, r.name)) {
          sumB += parseFormattedNumber(r.amount);
        }
      });
      colB = sumB > 0 ? formatTRNum(sumB) : '';
    }
    
    // Apply Safe Banka Geçen Restoration Override:
    // If bank is Ö. ZİRAAT or KUVEYT, or if bankaGecen > colB * 1.5 (meaning it got overwritten with a huge bank balance)
    const valB = parseFormattedNumber(colB);
    const valGecen = parseFormattedNumber(bankaGecen);
    if (templateRow.bank === 'Ö. ZİRAAT' || templateRow.bank === 'KUVEYT' || valGecen > valB * 1.5) {
      bankaGecen = colB;
    }
    
    // Calculate Kesinti & Komisyon based on correct colB and bankaGecen
    let kesinti = '';
    let komisyon = '';
    const numB = parseFormattedNumber(colB);
    const numGecen = parseFormattedNumber(bankaGecen);
    if (numB > 0 && bankaGecen.trim() !== '') {
      const numKes = numB - numGecen;
      kesinti = formatTRNum(numKes);
      const numKom = Math.abs((numKes / numB) * 100);
      komisyon = formatTRNum(numKom);
    }
    
    return {
      bank: templateRow.bank,
      colB,
      banka_gecen: bankaGecen,
      kesinti,
      komisyon
    };
  });
  
  // Upsert to Supabase
  const dateStr = `2026-08-${dayStr.padStart(2, '0')}`;
  
  const { data: existing, error: fetchError } = await supabase
    .from('pos_reports')
    .select('*')
    .eq('organization_id', orgId)
    .eq('date', dateStr)
    .single();
    
  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
  
  if (existing) {
    const { error: updateError } = await supabase
      .from('pos_reports')
      .update({
        left_table: finalLeftTable,
        right_table: finalRightTable,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
    if (updateError) throw updateError;
    console.log(`Successfully updated Date: ${dateStr}`);
  } else {
    const { error: insertError } = await supabase
      .from('pos_reports')
      .insert({
        organization_id: orgId,
        date: dateStr,
        left_table: finalLeftTable,
        right_table: finalRightTable
      });
    if (insertError) throw insertError;
    console.log(`Successfully inserted Date: ${dateStr}`);
  }
}

async function run() {
  const days = ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];
  for (const d of days) {
    try {
      await processDay(d);
    } catch (e) {
      console.error(`Error processing day ${d}:`, e.message);
    }
  }
}

run();
