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
    const safeFileName = fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileContent = fs.readFileSync(filePath);
    const storagePath = `${category}/${safeFileName}`;
    
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

    // 1. DIRECT EXCEL TOTALS EXTRACTION FROM WORKSHEET
    // In Excel, POS total is next to TOPLAM in column B/C, Giriş Toplamı is at C20, Çıkış Toplamı is at C21, Giriş-Çıkış Kalanı is at C22.
    let excelPosTotal = null;
    for (let r = 15; r <= 20; r++) {
      const b = ws['B' + r];
      const c = ws['C' + r];
      if (b && String(b.v).trim().toUpperCase() === 'TOPLAM' && c && c.v !== undefined && c.v !== '') {
        excelPosTotal = cleanNum(c.v);
        break;
      }
    }

    let excelGirisTotal = null;
    if (ws['C20'] && ws['C20'].v !== undefined && ws['C20'].v !== '') {
      excelGirisTotal = cleanNum(ws['C20'].v);
    }
    if (excelGirisTotal === null) {
      for (let r = 18; r <= 25; r++) {
        const b = ws['B' + r];
        const c = ws['C' + r];
        if (b && String(b.v).toUpperCase().includes('GİRİŞ TOPLAMI') && c && c.v !== undefined && c.v !== '') {
          excelGirisTotal = cleanNum(c.v);
          break;
        }
      }
    }

    let excelCikisTotal = null;
    if (ws['C21'] && ws['C21'].v !== undefined && ws['C21'].v !== '') {
      excelCikisTotal = cleanNum(ws['C21'].v);
    }
    if (excelCikisTotal === null) {
      for (let r = 19; r <= 25; r++) {
        const b = ws['B' + r];
        const c = ws['C' + r];
        if (b && String(b.v).toUpperCase().includes('ÇIKIŞ TOPLAMI') && c && c.v !== undefined && c.v !== '') {
          excelCikisTotal = cleanNum(c.v);
          break;
        }
      }
    }

    let excelNetKalan = null;
    if (ws['C22'] && ws['C22'].v !== undefined && ws['C22'].v !== '') {
      excelNetKalan = cleanNum(ws['C22'].v);
    }

    // 2. DIRECT EXCEL R41, R42, R43 EXTRACTION
    // In the user's Excel sheet, R41 = TOPLAM KASA BAKİYESİ, R42 = GİRİŞ-ÇIKIŞ KALANI, R43 = KASA
    let summaryRowMin = 41;
    let excelAnaKasaTotal = null;
    let excelKasaFarki = 0;

    if (ws['R41'] && ws['R41'].v !== undefined && ws['R41'].v !== '' &&
        ws['R42'] && ws['R42'].v !== undefined && ws['R42'].v !== '') {
      excelAnaKasaTotal = cleanNum(ws['R41'].v);
      excelNetKalan = cleanNum(ws['R42'].v);
      excelKasaFarki = (ws['R43'] && ws['R43'].v !== undefined && ws['R43'].v !== '') ? cleanNum(ws['R43'].v) : 0;
      summaryRowMin = 41;
    } else {
      const rCells = [];
      for (let r = 20; r <= 65; r++) {
        const cell = ws['R' + r];
        if (cell && cell.v !== undefined && cell.v !== '') {
          rCells.push({ r, v: cleanNum(cell.v), f: (cell.f || '') });
        }
      }

      let netKalanIndex = -1;
      for (let i = rCells.length - 1; i >= 0; i--) {
        const isFormulaC22 = rCells[i].f.toUpperCase().includes('C22');
        const isValMatch = excelNetKalan !== null && Math.abs(rCells[i].v - excelNetKalan) < 0.01;
        if (isFormulaC22 || isValMatch) {
          netKalanIndex = i;
          break;
        }
      }

      if (netKalanIndex > 0) {
        excelAnaKasaTotal = rCells[netKalanIndex - 1].v;
        summaryRowMin = rCells[netKalanIndex - 1].r;
        if (excelNetKalan === null) excelNetKalan = rCells[netKalanIndex].v;
        if (netKalanIndex + 1 < rCells.length) {
          excelKasaFarki = rCells[netKalanIndex + 1].v;
        }
      } else if (rCells.length >= 3) {
        const last3 = rCells.slice(-3);
        excelAnaKasaTotal = last3[0].v;
        summaryRowMin = last3[0].r;
        if (excelNetKalan === null) excelNetKalan = last3[1].v;
        excelKasaFarki = last3[2].v;
      } else if (rCells.length === 2) {
        const last2 = rCells.slice(-2);
        excelAnaKasaTotal = last2[0].v;
        summaryRowMin = last2[0].r;
        excelKasaFarki = last2[1].v;
      }
    }

    // 3. PARSE ANA KASA ACCOUNT ROWS (STRICTLY ABOVE summaryRowMin)
    let anaKasaMoveCount = 0;
    const anaKasaList = Array.from({ length: 42 }, () => ({
      name: '',
      devir: '',
      movement: '',
      pos: '',
      duzeltme: '',
      gunSonu: ''
    }));

    for (let r = 4; r < summaryRowMin && r <= 44; r++) {
      const idx = r - 4;
      if (idx >= 42) break;

      const rawName = ws['M' + r] ? String(ws['M' + r].v).trim() : '';
      const upperName = rawName.toUpperCase();

      const isSummary = upperName.includes('TOPLAM') || 
                        upperName.includes('KALAN') || 
                        upperName.startsWith('KASA:') ||
                        upperName.startsWith('KASA :') ||
                        (upperName.includes('KASA') && upperName !== 'KASA') ||
                        upperName.includes('GİRİŞ') || 
                        upperName.includes('ÇIKIŞ') ||
                        upperName.includes('FAZLA VERMİŞ') ||
                        upperName.includes('EKSİK VERMİŞ');
      if (isSummary) {
        continue;
      }

      const devir = ws['L' + r] ? cleanNum(ws['L' + r].v) : 0;
      const move = ws['N' + r] ? cleanNum(ws['N' + r].v) : 0;
      const pos = ws['O' + r] ? cleanNum(ws['O' + r].v) : 0;
      const duzeltme = ws['P' + r] ? cleanNum(ws['P' + r].v) : 0;
      
      const rCell = ws['R' + r];
      let gunSonu = (rCell && rCell.v !== undefined && rCell.v !== '') ? cleanNum(rCell.v) : 0;
      
      const isKasa = upperName === 'KASA';
      const computedGunSonu = isKasa ? (move + pos + duzeltme) : (devir + move + pos + duzeltme);
      if (gunSonu === 0 && (!rCell || rCell.v === undefined || rCell.v === '') && (devir !== 0 || move !== 0 || pos !== 0 || duzeltme !== 0)) {
        gunSonu = computedGunSonu;
      }

      if (move !== 0 || pos !== 0 || duzeltme !== 0 || gunSonu !== 0) {
        anaKasaMoveCount++;
      }

      const hasFinancialData = (rawName !== '' || devir !== 0 || move !== 0 || pos !== 0 || duzeltme !== 0 || gunSonu !== 0);

      anaKasaList[idx] = {
        name: rawName,
        devir: devir !== 0 ? formatInt(devir) : '',
        movement: move !== 0 ? formatInt(move) : '',
        pos: pos !== 0 ? formatInt(pos) : '',
        duzeltme: duzeltme !== 0 ? formatInt(duzeltme) : '',
        gunSonu: (hasFinancialData && (gunSonu !== 0 || rawName !== ''))
          ? formatInt(gunSonu)
          : ''
      };
    }

    const hasDailyActivity = (posTotal > 0 || cikisTotal > 0 || girisItemCount > 0 || cikisItemCount > 0 || anaKasaMoveCount > 0);
    if (!hasDailyActivity) {
      continue;
    }

    // DIRECT EXCEL VALUES - NO CUSTOM OVERRIDES OR ARTIFICIAL FORMULAS!
    const actualNetKalan = excelNetKalan !== null ? excelNetKalan : (excelGirisTotal !== null && excelCikisTotal !== null ? (excelGirisTotal - excelCikisTotal) : (girisTotal - cikisTotal));
    const actualAnaKasaTotal = excelAnaKasaTotal !== null ? excelAnaKasaTotal : actualNetKalan;
    const actualBakiyeFarki = excelKasaFarki !== null ? excelKasaFarki : 0;

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
        net_kalan: actualNetKalan,
        ana_kasa_total: actualAnaKasaTotal,
        bakiye_farki: actualBakiyeFarki,
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

function parseGunlukHesapWorkbook(wb) {
  const s1 = wb.Sheets['Sayfa1'] || wb.Sheets[wb.SheetNames[0]];
  const s2 = wb.Sheets['Sayfa1 (2)'] || wb.Sheets[wb.SheetNames[1]];
  const s3 = wb.Sheets['Sayfa1 (3)'] || wb.Sheets[wb.SheetNames[2]];

  return {
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
  const banks = parseGunlukHesapWorkbook(wb);

  const { error } = await supabase
    .from('cashbox_gunluk_hesap_reports')
    .upsert({
      report_date: reportDate,
      data: { rows: data, banks },
      raw_file_name: fileName,
      source: 'office_pc_sync',
      updated_at: new Date().toISOString()
    }, { onConflict: 'report_date' });

  if (!error) {
    log(`✔️ [GÜNLÜK HESAP] ${reportDate} raporu (${fileName}) 11 banka verisiyle Supabase'e yüklendi.`);
    return 1;
  } else {
    log(`❌ [HATA] ${reportDate} Günlük Hesap: ${error.message}`);
    return 0;
  }
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
  // 5 dakikada bir arka planda git güncellemelerini çek
  if (Date.now() - lastGitPullTime > 5 * 60 * 1000) {
    try {
      const gitOut = execSync('git pull origin main', { encoding: 'utf-8' });
      lastGitPullTime = Date.now();
      if (gitOut && !gitOut.includes('Already up to date')) {
        log('🔄 [GÜNCELLEME] Yeni kodlar çekildi, servis en son sürüme geçmek için yeniden başlatılıyor...');
        process.exit(0); // Launcher (silent_sync_launcher.vbs) otomatik yeniden başlatacaktır
      }
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
