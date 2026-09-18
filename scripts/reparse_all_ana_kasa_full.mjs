import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

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

function isAnaKasaWorkbook(wb, fileName) {
  const upper = fileName.toUpperCase();
  if (upper.includes('ANA KASA') || upper.includes('ANAKASA') || upper.includes('ANA_KASA')) return true;
  
  // Sheet 1 kontrolü
  const ws1 = wb.Sheets[wb.SheetNames[0]];
  if (!ws1) return false;
  const a1 = String(ws1['A1']?.v || ws1['B1']?.v || '').toUpperCase();
  if (a1.includes('ANA KASA RAPORU')) return true;

  const a3 = String(ws1['A3']?.v || ws1['B3']?.v || '').toUpperCase();
  const e3 = String(ws1['E3']?.v || ws1['F3']?.v || '').toUpperCase();
  if (a3.includes('ÇIKIŞ') && e3.includes('GİRİŞ')) return true;

  return false;
}

function parseArkaSayfa(sheet) {
  if (!sheet) return null;
  const val = (cell) => {
    if (!sheet[cell]) return 0;
    const v = sheet[cell].v;
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    let s = String(v).trim().replace(/₺|TL/g, '').trim();
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };
  const str = (cell) => {
    if (!sheet[cell]) return '';
    return String(sheet[cell].v || '').trim();
  };

  const isColB = !!sheet['B3'] || !!sheet['E3'] || !!sheet['B4'];
  const nameCol = isColB ? 'B' : 'A';
  const valCol = isColB ? 'C' : 'B';
  const mValCol = isColB ? 'F' : 'E';
  const rValCol = isColB ? 'I' : 'H';

  const cariler = [];
  const ignoredKeywords = ['MERKEZ', 'MERZİFON', 'ATAKUM', 'İLKADIM', 'DEPO', 'TOPLAM', 'DEVİR', 'KASA', 'ÇIKIŞ', 'GİRİŞ', 'POS', 'TARİH'];
  
  for (let r = 8; r <= 45; r++) {
    const name = str(nameCol + r);
    const amount = val(valCol + r);
    const upperName = name.toUpperCase();
    if (name && amount > 0) {
      if (!ignoredKeywords.some(kw => upperName.includes(kw))) {
        cariler.push({ name, amount });
      }
    }
  }

  const merkez = {
    nakit: val(mValCol + '4'),
    cikis: val(mValCol + '5'),
    pos: val(mValCol + '6')
  };

  const merzifon = {
    nakit: val(rValCol + '4'),
    garanti: val(rValCol + '5'),
    ziraat: val(rValCol + '6'),
    akbank: val(rValCol + '7')
  };

  const atakum = {
    nakit: val(mValCol + '13'),
    kuveyt: val(mValCol + '14'),
    halk: val(mValCol + '15'),
    garanti: val(mValCol + '16'),
    albaraka: val(mValCol + '17'),
    ziraat: val(mValCol + '18')
  };

  const ilkadim = {
    nakit: val(rValCol + '13'),
    ziraat: val(rValCol + '14'),
    deniz: val(rValCol + '15'),
    kuveyt: val(rValCol + '16')
  };

  const depoGiris = val(rValCol + '22');
  const depoCikis = val(rValCol + '23');
  const depoDevir = val(rValCol + '24');
  const depoMerzifonDevir = val(rValCol + '29');
  const depoAnaKasaDevir = val(rValCol + '30');
  const depoToplamCell = val(rValCol + '31');
  const depoToplam = depoToplamCell > 0 ? depoToplamCell : (depoGiris - depoMerzifonDevir - depoAnaKasaDevir);

  const depo = {
    giris: depoGiris,
    cikis: depoCikis,
    devir: depoDevir,
    merzifonSubeDevir: depoMerzifonDevir,
    anaKasaDevir: depoAnaKasaDevir,
    toplam: depoToplam
  };

  const isAllZero = Object.values(merkez).every(v => !v || v === 0) &&
                    Object.values(merzifon).every(v => !v || v === 0) &&
                    Object.values(atakum).every(v => !v || v === 0) &&
                    Object.values(ilkadim).every(v => !v || v === 0) &&
                    Object.values(depo).every(v => !v || v === 0) &&
                    cariler.length === 0;

  return {
    merkez,
    merzifon,
    atakum,
    ilkadim,
    depo,
    cariler,
    isAllZero
  };
}

async function processWorkbookBuffer(buf, fileName) {
  const reportDate = parseDateFromFileName(fileName);
  if (!reportDate) return false;

  try {
    const wb = XLSX.read(buf, { type: 'buffer' });
    if (!isAnaKasaWorkbook(wb, fileName)) {
      // Bu bir Ana Kasa Raporu değil (Günlük Hesap vb.)
      return false;
    }

    const ws1 = wb.Sheets[wb.SheetNames[0]];
    const rows = ws1 ? XLSX.utils.sheet_to_json(ws1, { header: 1 }) : [];

    let arkaSayfaData = null;
    let isArkaAllZero = true;

    const arkaSheetName = wb.SheetNames.find(n => {
      const u = n.toUpperCase();
      return u.includes('ARKA') || u.includes('ŞUBE') || u.includes('SHEET2') || u.includes('SAYFA 2') || u.includes('SAYFA2');
    }) || (wb.SheetNames.length > 1 ? wb.SheetNames[1] : null);

    if (arkaSheetName && wb.Sheets[arkaSheetName]) {
      const parsed = parseArkaSayfa(wb.Sheets[arkaSheetName]);
      if (parsed) {
        arkaSayfaData = {
          merkez: parsed.merkez,
          merzifon: parsed.merzifon,
          atakum: parsed.atakum,
          ilkadim: parsed.ilkadim,
          depo: parsed.depo,
          cariler: parsed.cariler
        };
        isArkaAllZero = parsed.isAllZero;
      }
    }

    const { data: existingRows } = await supabase
      .from('cashbox_ana_kasa_reports')
      .select('data, raw_file_name')
      .eq('report_date', reportDate);

    const existing = existingRows && existingRows[0] ? existingRows[0] : null;
    
    // Rows handling: prefer non-empty rows
    let finalRows = rows;
    if ((!rows || rows.length < 5) && existing?.data?.rows && existing.data.rows.length >= 5) {
      finalRows = existing.data.rows;
    }

    // Arka sayfa handling: if current file has non-zero data, use it; otherwise if existing has non-zero data, keep existing!
    let finalArka = arkaSayfaData;
    if (isArkaAllZero && existing?.data?.arka_sayfa) {
      const existArka = existing.data.arka_sayfa;
      const existHasData = (existArka.cariler?.length > 0) ||
        Object.values(existArka.merkez || {}).some(v => v > 0) ||
        Object.values(existArka.merzifon || {}).some(v => v > 0) ||
        Object.values(existArka.atakum || {}).some(v => v > 0) ||
        Object.values(existArka.ilkadim || {}).some(v => v > 0) ||
        Object.values(existArka.depo || {}).some(v => v > 0);

      if (existHasData) {
        finalArka = existArka;
      }
    }

    const payloadData = {
      rows: finalRows,
      ...(finalArka ? { arka_sayfa: finalArka } : {})
    };

    // Sanitize any invalid unicode escapes / null bytes for PostgreSQL JSONB
    const cleanPayload = JSON.parse(JSON.stringify(payloadData).replace(/\\u0000/g, ''));

    const { error: upsertErr } = await supabase
      .from('cashbox_ana_kasa_reports')
      .upsert({
        report_date: reportDate,
        data: cleanPayload,
        raw_file_name: fileName,
        source: 'full_reparse_sync',
        updated_at: new Date().toISOString()
      }, { onConflict: 'report_date' });

    if (upsertErr) {
      console.error(`❌ [${reportDate}] DB hatası:`, upsertErr.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`❌ [${fileName}] Hata:`, err.message);
    return false;
  }
}

async function runFullSync() {
  console.log('=====================================================');
  console.log('🚀 TÜM GERÇEK ANA KASA RAPORLARINI EŞİTLEME');
  console.log('=====================================================');

  // 1. Storage'daki dosyaları listele
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
  console.log(`Storage üzerinde toplam ${allFiles.length} adet dosya bulundu.`);

  const xlsxFiles = allFiles
    .filter(f => f.name.toLowerCase().endsWith('.xlsx') && parseDateFromFileName(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`İşlenecek dosya sayısı: ${xlsxFiles.length}`);

  const CONCURRENCY = 20;
  let processed = 0;

  for (let i = 0; i < xlsxFiles.length; i += CONCURRENCY) {
    const chunk = xlsxFiles.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (f) => {
      const { data, error } = await supabase.storage
        .from('kasa-excel-yedekleri')
        .download(`ANA-KASA/${f.name}`);

      if (!error && data) {
        const buf = Buffer.from(await data.arrayBuffer());
        await processWorkbookBuffer(buf, f.name);
      }
    }));

    processed += chunk.length;
    if (processed % 200 === 0 || processed === xlsxFiles.length) {
      console.log(`İlerleme: %${Math.round((processed / xlsxFiles.length) * 100)} (${processed} / ${xlsxFiles.length})`);
    }
  }

  // 2. Yerel dosyalar klasörünü de tara
  const localDirs = ['dosyalar', 'dosyalar/ANA KASA RAPORU'];
  for (const dir of localDirs) {
    if (fs.existsSync(dir)) {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry.toLowerCase().endsWith('.xlsx') && !entry.startsWith('~$') && parseDateFromFileName(entry)) {
          const fullPath = path.join(dir, entry);
          const buf = fs.readFileSync(fullPath);
          const ok = await processWorkbookBuffer(buf, entry);
          if (ok) console.log(`✔️ [YEREL DOSYA] ${entry} işlendi.`);
        }
      }
    }
  }

  console.log('=====================================================');
  console.log('🎉 TÜM ANA KASA RAPORLARI VE ARKA SAYFALARI BAŞARIYLA GÜNCELLENDİ!');
  console.log('=====================================================');
}

runFullSync();
