/**
 * Ofis Bilgisayarı Arka Plan Sürekli İzleme ve Senkronizasyon Servisi (V5)
 * -------------------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zubhjybqzcpplultpsgt.supabase.co";
const SUPABASE_KEY = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEFAULT_BASE_DIRS = [
  String.raw`C:\Users\berka\.gemini\antigravity\scratch\beko-guncel\dosyalar`,
  String.raw`\\Desktop-qjg3lnb\f\ANA KASA GÜNLÜK`,
  String.raw`\\Desktop-qjg3lnb\f\GİRİŞ-ÇIKIŞ GÜNLÜK`,
  String.raw`\\Desktop-qjg3lnb\f\GÜNLÜK HESAP`,
  String.raw`F:\ANA KASA GÜNLÜK`,
  String.raw`F:\GİRİŞ-ÇIKIŞ GÜNLÜK`,
  String.raw`F:\GÜNLÜK HESAP`,
];

const DEFAULT_POS_BANKS = [
  'AKBANK', 'ZİRAAT', 'HALK', 'GARANTİ', 'VAKIF', 'YAPI', 
  'ŞEKER', 'KUVEYT', 'DENİZ', 'Ö.ZİRAAT', 'TEB', 'ALBARAKA'
];

function normalizeStr(str) {
  if (!str) return '';
  return str
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

const MONTH_MAP = {
  'ocak': 1, 'subat': 2, 'mart': 3, 'nisan': 4,
  'mayis': 5, 'haziran': 6, 'temmuz': 7, 'agustos': 8,
  'eylul': 9, 'ekim': 10, 'kasim': 11, 'aralik': 12
};

function extractMonthFromText(text) {
  const norm = normalizeStr(text);
  for (const [mName, mCode] of Object.entries(MONTH_MAP)) {
    if (norm.includes(mName)) {
      return mCode;
    }
  }
  return null;
}

const processedFileMtimes = new Map();

function log(msg) {
  const timestamp = new Date().toLocaleTimeString('tr-TR');
  console.log(`[${timestamp}] ${msg}`);
}

function cleanNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let s = String(val).trim().replace(/₺|TL/g, '').trim();
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const res = parseFloat(s);
  return isNaN(res) ? 0 : res;
}

function formatMoney(num) {
  if (num === 0 || num === '' || num === null || num === undefined) return '';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function formatInt(num) {
  if (num === 0 || num === '' || num === null || num === undefined) return '';
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(num);
}

function excelDateToIso(serial) {
  if (typeof serial === 'number' && serial > 35000 && serial < 60000) {
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function parseDateFromSheetName(sheetName, fileYear = 2026, fileMonth = null) {
  const clean = sheetName.trim();
  
  if (/^\d{1,2}$/.test(clean)) {
    if (!fileMonth) {
      return null;
    }
    const day = parseInt(clean, 10);
    const month = fileMonth;
    if (day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(fileYear, month - 1, day));
      if (d.getUTCMonth() === (month - 1) && d.getUTCDate() === day) {
        return `${fileYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  const mIso = clean.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (mIso) {
    const y = parseInt(mIso[1], 10);
    const m = parseInt(mIso[2], 10);
    const d = parseInt(mIso[3], 10);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  
  const mTr = clean.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (mTr) {
    const d = parseInt(mTr[1], 10);
    const m = parseInt(mTr[2], 10);
    const y = parseInt(mTr[3], 10);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  const mText = clean.match(/(\d{1,2})\s+([a-zA-ZçğıöşüÇĞİÖŞÜ]+)(?:\s+(\d{4}))?/);
  if (mText) {
    const day = parseInt(mText[1], 10);
    const month = extractMonthFromText(mText[2]);
    const year = mText[3] ? parseInt(mText[3], 10) : fileYear;
    if (month) {
      const dt = new Date(Date.UTC(year, month - 1, day));
      if (dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

async function backupFileToSupabaseStorage(filePath, category) {
  try {
    const fileName = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);
    const storagePath = `${category}/${fileName}`;
    
    await supabase.storage
      .from('kasa-excel-yedekleri')
      .upload(storagePath, fileContent, {
        upsert: true,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
  } catch (err) {
    // ignore
  }
}

async function processGirisCikisWorkbook(wb, filePath) {
  const fileName = path.basename(filePath);
  const mYear = fileName.match(/202\d/);
  const fileYear = mYear ? parseInt(mYear[0], 10) : new Date().getFullYear();
  const fileMonth = extractMonthFromText(fileName);

  await backupFileToSupabaseStorage(filePath, 'GIRIS-CIKIS');

  let count = 0;
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!data || data.length < 4) continue;

    let reportDate = null;
    if (data[0]) {
      reportDate = excelDateToIso(data[0][0]) || excelDateToIso(data[0][6]);
    }
    if (!reportDate) {
      reportDate = parseDateFromSheetName(sheetName, fileYear, fileMonth);
    }
    if (!reportDate) {
      reportDate = parseDateFromSheetName(fileName, fileYear, fileMonth);
    }
    if (!reportDate) continue;

    const row3 = JSON.stringify(data[3] || []).toUpperCase();
    const row4 = JSON.stringify(data[4] || []).toUpperCase();
    if (!row3.includes('POS') && !row3.includes('DEVİR') && !row4.includes('AKBANK') && !row4.includes('MERKEZ')) {
      continue;
    }

    let posTotal = 0;
    const posList = DEFAULT_POS_BANKS.map(bank => ({ bank, amount: '' }));
    for (let r = 4; r <= 15; r++) {
      const row = data[r] || [];
      const bankName = String(row[0] || '').trim();
      const amt = cleanNum(row[1]);
      const idx = r - 4;
      if (idx < posList.length) {
        if (bankName) posList[idx].bank = bankName;
        posList[idx].amount = amt !== 0 ? formatMoney(amt) : '';
        posTotal += amt;
      }
    }

    let girisTotal = 0;
    let girisItemCount = 0;
    const girisList = Array.from({ length: 65 }, () => ({ posCari: '', description: '', bankOrType: '', amount: '' }));
    for (let r = 3; r <= 74; r++) {
      const idx = r - 3;
      if (idx >= 65) break;
      const row = data[r] || [];
      const col2 = String(row[2] || '').trim(); // Col D (posCari)
      const col3 = String(row[3] || '').trim(); // Col E (Açıklama / Banka / Şube / Cari)
      const amt = cleanNum(row[4]);             // Col F (Tutar)
      
      if (col3.toUpperCase().includes('GİRİŞ TOPLAMI') || col2.toUpperCase().includes('GİRİŞ TOPLAMI')) {
        continue;
      }

      if (idx > 0 && (amt > 0 || col2 || col3)) {
        girisItemCount++;
        girisTotal += amt;
      }

      if (col2 && col3) {
        girisList[idx] = {
          posCari: col2,
          description: col3,
          bankOrType: col3,
          amount: amt !== 0 ? formatMoney(amt) : ''
        };
      } else {
        girisList[idx] = {
          posCari: col2 || '',
          description: col3 || col2,
          bankOrType: '',
          amount: amt !== 0 ? formatMoney(amt) : ''
        };
      }
    }

    let cikisTotal = 0;
    let cikisItemCount = 0;
    const cikisList = Array.from({ length: 64 }, () => ({ description: '', bankOrType: '', amount: '' }));
    for (let r = 3; r <= 74; r++) {
      const idx = r - 3;
      if (idx >= 64) break;
      const row = data[r] || [];
      const desc = String(row[6] || '').trim();
      const type = String(row[7] || '').trim();
      const amt = cleanNum(row[8]);

      if (desc.toUpperCase().includes('ÇIKIŞ TOPLAMI') || type.toUpperCase().includes('ÇIKIŞ TOPLAMI')) {
        continue;
      }

      if (amt > 0 || desc) {
        cikisItemCount++;
        cikisTotal += amt;
      }

      cikisList[idx] = {
        description: desc,
        bankOrType: type,
        amount: amt !== 0 ? formatMoney(amt) : ''
      };
    }

    // 1. DYNAMICALLY DETECT BOTTOM 3 SUMMARY ROWS IN COLUMN 16 (Col R)
    // In Excel, the bottom-most 3 cells in Col R are always:
    // [TOPLAM KASA BAKİYESİ, GİRİŞ-ÇIKIŞ KALANI, KASA: 0]
    // They can slide up or down depending on how many accounts exist.
    const col16Cells = [];
    data.forEach((row, r) => {
      if (row && row[16] !== null && row[16] !== undefined && String(row[16]).trim() !== '') {
        col16Cells.push({ r, val: cleanNum(row[16]) });
      }
    });

    let summaryRowMin = 999;
    let excelAnaKasaTotal = null;
    let excelNetKalan = null;
    let excelKasaFarki = 0;

    if (col16Cells.length >= 3) {
      const last3 = col16Cells.slice(-3);
      summaryRowMin = last3[0].r;
      excelAnaKasaTotal = last3[0].val;
      excelNetKalan = last3[1].val;
      excelKasaFarki = last3[2].val;
    } else if (col16Cells.length === 2) {
      const last2 = col16Cells.slice(-2);
      summaryRowMin = last2[0].r;
      excelAnaKasaTotal = last2[0].val;
      excelKasaFarki = last2[1].val;
    }

    // 2. PARSE ANA KASA ACCOUNT ROWS (STRICTLY ABOVE summaryRowMin)
    let anaKasaMoveCount = 0;
    const anaKasaList = Array.from({ length: 42 }, () => ({
      name: '',
      devir: '',
      movement: '',
      pos: '',
      duzeltme: '',
      gunSonu: ''
    }));

    for (let r = 3; r < summaryRowMin && r <= 44; r++) {
      const idx = r - 3;
      if (idx >= 42) break;
      const row = data[r] || [];
      const rawName = String(row[11] || '').trim();
      const upperName = rawName.toUpperCase();

      // If this row has a summary keyword or is a note, do NOT treat as an account
      if (upperName.includes('TOPLAM') || 
          upperName.includes('KALAN') || 
          upperName.includes('KASA') || 
          upperName.includes('GİRİŞ') || 
          upperName.includes('ÇIKIŞ') ||
          upperName.includes('FAZLA VERMİŞ') ||
          upperName.includes('EKSİK VERMİŞ')) {
        continue;
      }

      const devir = cleanNum(row[10]);     // Col L
      const move = cleanNum(row[12]);      // Col N
      const pos = cleanNum(row[13]);       // Col O
      const duzeltme = cleanNum(row[14]);  // Col P (Banka Düzeltmeleri)
      const gunSonu = cleanNum(row[16]);   // Col R (Gün Sonu)
      
      if (move !== 0 || pos !== 0 || duzeltme !== 0 || gunSonu !== 0) {
        anaKasaMoveCount++;
      }

      const accountName = rawName; // Birebir Excel'de ne yazıyorsa o!
      const hasFinancialData = (rawName !== '' || devir !== 0 || move !== 0 || pos !== 0 || duzeltme !== 0);

      anaKasaList[idx] = {
        name: accountName,
        devir: devir !== 0 ? formatInt(devir) : '',
        movement: move !== 0 ? formatInt(move) : '',
        pos: pos !== 0 ? formatInt(pos) : '',
        duzeltme: duzeltme !== 0 ? formatInt(duzeltme) : '',
        // gunSonu is ONLY assigned if this is an active account row with data!
        gunSonu: (hasFinancialData && row[16] !== undefined && row[16] !== null && String(row[16]).trim() !== '')
          ? formatInt(gunSonu)
          : ''
      };
    }

    // Direct Excel exact totals (NO formula calculation)
    let excelPosTotal = null;
    let excelGirisTotal = null;
    let excelCikisTotal = null;

    for (let r = 0; r < 30; r++) {
      const row = data[r] || [];
      const a = String(row[0] || '').trim().toUpperCase();
      if (a === 'TOPLAM' && row[1] !== undefined) excelPosTotal = cleanNum(row[1]);
      if (a.includes('GİRİŞ TOPLAMI') && row[1] !== undefined) excelGirisTotal = cleanNum(row[1]);
      if (a.includes('ÇIKIŞ TOPLAMI') && row[1] !== undefined) excelCikisTotal = cleanNum(row[1]);
      if (r === 21 && row[1] !== undefined && excelNetKalan === null) excelNetKalan = cleanNum(row[1]);
    }

    const hasDailyActivity = (posTotal > 0 || cikisTotal > 0 || girisItemCount > 0 || cikisItemCount > 0 || anaKasaMoveCount > 0);
    if (!hasDailyActivity) {
      continue;
    }

    await supabase
      .from('cashbox_giris_cikis_reports')
      .upsert({
        report_date: reportDate,
        pos_list: posList,
        giris_list: girisList,
        cikis_list: cikisList,
        ana_kasa_list: anaKasaList,
        pos_total: excelPosTotal !== null ? excelPosTotal : posTotal,
        giris_total: excelGirisTotal !== null ? excelGirisTotal : girisTotal,
        cikis_total: excelCikisTotal !== null ? excelCikisTotal : cikisTotal,
        net_kalan: excelNetKalan !== null ? excelNetKalan : (girisTotal - cikisTotal),
        ana_kasa_total: excelAnaKasaTotal !== null ? excelAnaKasaTotal : null,
        bakiye_farki: excelKasaFarki !== null ? excelKasaFarki : 0,
        raw_file_name: path.basename(filePath),
        source: 'office_pc_sync',
        updated_at: new Date().toISOString()
      }, { onConflict: 'report_date' });
    count++;
  }

  return count;
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
    if (name && !name.includes('TOPLAM') && amount > 0) {
      cariler.push({ name, amount });
    }
  }

  return {
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
}

async function processAnaKasaWorkbook(wb, filePath) {
  const fileName = path.basename(filePath);
  let reportDate = parseDateFromSheetName(fileName);
  if (!reportDate) {
    const m = fileName.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (m) {
      reportDate = `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    }
  }
  if (!reportDate) {
    log(`⚠️ [ANA KASA] ${fileName} dosyasından tarih tespit edilemedi, atlandı.`);
    return 0;
  }

  await backupFileToSupabaseStorage(filePath, 'ANA-KASA');

  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  let arkaSayfaData = null;
  const arkaSheetName = wb.SheetNames.find(n => {
    const u = n.toUpperCase();
    return u.includes('ARKA') || u.includes('SAYFA') || u.includes('SHEET2') || u.includes('SAYFA 2');
  });
  if (arkaSheetName && wb.Sheets[arkaSheetName]) {
    arkaSayfaData = parseArkaSayfa(wb.Sheets[arkaSheetName]);
  } else if (wb.SheetNames.length > 1) {
    arkaSayfaData = parseArkaSayfa(wb.Sheets[wb.SheetNames[1]]);
  }

  const payloadData = { rows: data };
  if (arkaSayfaData) {
    payloadData.arka_sayfa = arkaSayfaData;
  }

  const { error } = await supabase
    .from('cashbox_ana_kasa_reports')
    .upsert({
      report_date: reportDate,
      data: payloadData,
      raw_file_name: fileName,
      source: 'office_pc_sync',
      updated_at: new Date().toISOString()
    }, { onConflict: 'report_date' });

  if (!error) {
    log(`✔️ [ANA KASA] ${reportDate} raporu (${fileName}) Supabase'e yüklendi. (Arka Sayfa: ${arkaSayfaData ? 'Mevcut' : 'Yok'})`);
    return 1;
  } else {
    log(`❌ [HATA] ${reportDate} Ana Kasa: ${error.message}`);
    return 0;
  }
}

async function processGunlukHesapWorkbook(wb, filePath) {
  const fileName = path.basename(filePath);
  let reportDate = parseDateFromSheetName(fileName);
  if (!reportDate) {
    const m = fileName.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (m) {
      reportDate = `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    }
  }
  if (!reportDate) return 0;

  await backupFileToSupabaseStorage(filePath, 'GUNLUK-HESAP');

  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  await supabase
    .from('cashbox_gunluk_hesap_reports')
    .upsert({
      report_date: reportDate,
      data: { rows: data },
      raw_file_name: fileName,
      source: 'office_pc_sync',
      updated_at: new Date().toISOString()
    }, { onConflict: 'report_date' });

  return 1;
}

async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const upperFileName = fileName.toUpperCase();
  if (!upperFileName.endsWith('.XLSX') && !upperFileName.endsWith('.XLSM')) return;
  if (fileName.startsWith('~$')) return;

  try {
    const stat = fs.statSync(filePath);
    const lastMtime = processedFileMtimes.get(filePath);
    if (lastMtime && stat.mtimeMs <= lastMtime) return;

    log(`Değişiklik: ${fileName} işleniyor...`);
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });

    // 1. ÖNCELİK: Dosya adında ANA KASA varsa
    if (upperFileName.includes('ANA KASA')) {
      await processAnaKasaWorkbook(wb, filePath);
    } 
    // 2. ÖNCELİK: Dosya adında GÜNLÜK HESAP varsa
    else if (upperFileName.includes('GÜNLÜK HESAP') || upperFileName.includes('GUNLUK HESAP')) {
      await processGunlukHesapWorkbook(wb, filePath);
    } 
    // 3. ÖNCELİK: Dosya adında GİRİŞ, ÇIKIŞ veya AYLIK varsa
    else if (upperFileName.includes('GİRİŞ') || upperFileName.includes('GIRIS') || upperFileName.includes('AYLIK')) {
      await processGirisCikisWorkbook(wb, filePath);
    }
    // 4. ÖNCELİK: Sekme adlarına göre belirleme
    else if (wb.SheetNames.some(s => s.toUpperCase().includes('ANA KASA') || s.toUpperCase().includes('ARKA SAYFA') || s.toUpperCase().includes('RAPOR ARKA'))) {
      await processAnaKasaWorkbook(wb, filePath);
    }
    else if (wb.SheetNames.some(s => s.toUpperCase().includes('HESAP') || s.toUpperCase().includes('BANKA'))) {
      await processGunlukHesapWorkbook(wb, filePath);
    }
    else {
      await processGirisCikisWorkbook(wb, filePath);
    }

    processedFileMtimes.set(filePath, stat.mtimeMs);
    log(`✔️ ${fileName} eşitlendi.`);
  } catch (err) {
    log(`⚠️ Dosya okuma hatası (${fileName}): ${err.message}`);
  }
}

let lastGitPullTime = 0;

async function runSyncCycle() {
  // 10 dakikada bir arka planda git güncellemelerini çek
  if (Date.now() - lastGitPullTime > 10 * 60 * 1000) {
    try {
      execSync('git pull origin main', { stdio: 'ignore' });
      lastGitPullTime = Date.now();
    } catch (e) {
      // Git hatası oluşursa servisi durdurma
    }
  }

  const activeDirs = DEFAULT_BASE_DIRS.filter(d => fs.existsSync(d));
  for (const dir of activeDirs) {
    try {
      const files = fs.readdirSync(dir, { recursive: true });
      for (const f of files) {
        if (typeof f === 'string') {
          const fullPath = path.join(dir, f);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            await processFile(fullPath);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

async function startDaemon() {
  log("🚀 One DARS Kasa Senkronizasyon Servisi Başlatıldı (V5).");
  log("👀 Klasörler her 60 saniyede bir otomatik taranıp Supabase ile eşitleniyor...");

  await runSyncCycle();

  setInterval(async () => {
    await runSyncCycle();
  }, 60 * 1000); // 1 dakika
}

startDaemon();
