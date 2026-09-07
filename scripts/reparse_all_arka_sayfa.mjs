import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const SUPABASE_URL = "https://zubhjybqzcpplultpsgt.supabase.co";
const SUPABASE_KEY = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseDateFromFileName(fileName) {
  const m = fileName.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) {
    return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }
  return null;
}

function parseArkaSayfa(sheet) {
  if (!sheet) return null;
  const val = (cell) => {
    if (!sheet[cell]) return 0;
    const v = sheet[cell].v;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };
  const str = (cell) => {
    if (!sheet[cell]) return '';
    return String(sheet[cell].v || '').trim();
  };

  const isColB = !!sheet['B3'];
  const nameCol = isColB ? 'B' : 'A';
  const valCol = isColB ? 'C' : 'B';
  const mValCol = isColB ? 'F' : 'E';
  const rValCol = isColB ? 'I' : 'H';

  const cariler = [];
  for (let r = 9; r <= 40; r++) {
    let name = str(nameCol + r);
    let amount = val(valCol + r);
    if (name && !name.toUpperCase().includes('TOPLAM') && amount > 0) {
      cariler.push({ name, amount });
    }
  }

  const arka = {
    merkez: {
      nakit: val(mValCol + '4'),
      cikis: val(mValCol + '5'),
      pos: val(mValCol + '6')
    },
    merzifon: {
      nakit: val(rValCol + '4'),
      garanti: val(rValCol + '5'),
      ziraat: val(rValCol + '6'),
      akbank: val(rValCol + '7')
    },
    atakum: {
      nakit: val(mValCol + '13'),
      kuveyt: val(mValCol + '14'),
      halk: val(mValCol + '15'),
      garanti: val(mValCol + '16'),
      albaraka: val(mValCol + '17'),
      ziraat: val(mValCol + '18')
    },
    ilkadim: {
      nakit: val(rValCol + '13'),
      ziraat: val(rValCol + '14'),
      deniz: val(rValCol + '15'),
      kuveyt: val(rValCol + '16')
    },
    depo: {
      giris: val(rValCol + '22'),
      cikis: val(rValCol + '23'),
      devir: val(rValCol + '24'),
      merzifonSubeDevir: val(rValCol + '29'),
      anaKasaDevir: val(rValCol + '30'),
      toplam: val(rValCol + '31')
    },
    cariler
  };

  const allZero = Object.values(arka.merkez).every(v => v === 0) &&
                  Object.values(arka.merzifon).every(v => v === 0) &&
                  Object.values(arka.atakum).every(v => v === 0) &&
                  Object.values(arka.ilkadim).every(v => v === 0) &&
                  Object.values(arka.depo).every(v => v === 0) &&
                  cariler.length === 0;

  return { arka, allZero };
}

async function processFile(fileName) {
  const reportDate = parseDateFromFileName(fileName);
  if (!reportDate) {
    console.log(`⚠️ Tarih tespit edilemedi: ${fileName}`);
    return;
  }

  const { data: fileData, error: dlErr } = await supabase.storage
    .from('kasa-excel-yedekleri')
    .download(`ANA-KASA/${fileName}`);

  if (dlErr || !fileData) {
    console.error(`❌ İndirme hatası ${fileName}:`, dlErr?.message);
    return;
  }

  const buf = Buffer.from(await fileData.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });

  const arkaSheetName = wb.SheetNames.find(n => {
    const u = n.toUpperCase();
    return u.includes('ARKA') || u.includes('SAYFA') || u.includes('SHEET2') || u.includes('SAYFA 2');
  }) || (wb.SheetNames.length > 1 ? wb.SheetNames[1] : null);

  if (!arkaSheetName || !wb.Sheets[arkaSheetName]) {
    console.log(`ℹ️ [${reportDate}] Arka sayfa sayfası bulunamadı.`);
    return;
  }

  const parsed = parseArkaSayfa(wb.Sheets[arkaSheetName]);
  if (!parsed) return;

  const { data: existingRows } = await supabase
    .from('cashbox_ana_kasa_reports')
    .select('*')
    .eq('report_date', reportDate);

  const existingRow = existingRows && existingRows.length > 0 ? existingRows[0] : null;

  let finalData;
  if (existingRow && existingRow.data) {
    finalData = {
      ...existingRow.data,
      arka_sayfa: parsed.arka
    };
  } else {
    const ws1 = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws1, { header: 1 });
    finalData = {
      rows,
      arka_sayfa: parsed.arka
    };
  }

  const { error: upsertErr } = await supabase
    .from('cashbox_ana_kasa_reports')
    .upsert({
      report_date: reportDate,
      data: finalData,
      raw_file_name: fileName,
      source: 'storage_reparse',
      updated_at: new Date().toISOString()
    }, { onConflict: 'report_date' });

  if (upsertErr) {
    console.error(`❌ [${reportDate}] DB güncelleme hatası:`, upsertErr.message);
  } else {
    console.log(`✔️ [${reportDate}] Arka sayfa işlendi (Boş mu: ${parsed.allZero ? 'EVET' : 'HAYIR'}, Cariler: ${parsed.arka.cariler.length})`);
  }
}

async function main() {
  console.log('--- EYLÜL, AĞUSTOS, TEMMUZ 2026 DOSYALARI İŞLENİYOR ---');
  let allFiles = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabase.storage.from('kasa-excel-yedekleri').list('ANA-KASA', {
      limit: 100,
      offset: page * 100
    });
    if (error || !data || data.length === 0) break;
    allFiles.push(...data);
    if (data.length < 100) break;
    page++;
  }

  const targetFiles = allFiles
    .filter(f => f.name.includes('09.2026') || f.name.includes('08.2026') || f.name.includes('07.2026'))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Toplam ${targetFiles.length} adet dosya işlenecek...`);
  for (const f of targetFiles) {
    await processFile(f.name);
  }
  console.log('İşlem tamamlandı!');
}

main();
