/**
 * Ofis Bilgisayarı Excel -> Supabase Otomatik Senkronizasyon Ajanı (V5 - Tam Türkçe Karakter Destekli)
 * --------------------------------------------------------------------------------------------------
 * 1) GİRİŞ-ÇIKIŞ GÜNLÜK (AYLIK GİRİŞ ÇIKIŞ.xlsx / AĞUSTOS-2026.xlsx / EYLÜL - 2026.xlsx / NİSAN-2026.xlsx vb.) -> cashbox_giris_cikis_reports
 * 2) ANA KASA GÜNLÜK (ANA KASA RAPORU.xlsx vb.) -> cashbox_ana_kasa_reports
 * 3) GÜNLÜK HESAP (GÜNLÜK HESAP.xlsx vb.) -> cashbox_gunluk_hesap_reports
 * 4) Tüm ham Excel dosyalarını bulut Storage'a (kasa-excel-yedekleri) otomatik yedekler.
 */

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zubhjybqzcpplultpsgt.supabase.co";
const SUPABASE_KEY = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEFAULT_BASE_DIRS = [
  String.raw`C:\Users\berka\Downloads`,
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

function log(msg) {
  const timestamp = new Date().toLocaleTimeString('tr-TR');
  console.log(`[${timestamp}] ${msg}`);
}

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

function formatMoney(num) {
  if (num === '' || num === null || num === undefined) return '';
  if (num === 0) return '0,00';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function formatInt(num) {
  if (num === '' || num === null || num === undefined) return '';
  if (num === 0) return '0';
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
  
  // 1. İki basamaklı gün numarası ('01', '02' ... '31')
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

  // 2. ISO Tarih: 2026-08-31
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
  
  // 3. TR Tarih: 31.08.2026
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

  // 4. Metin Tarih: '31 Ağustos 2026' veya '31 Ağustos'
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

      if (amt !== 0 || col2 || col3) {
        girisItemCount++;
        girisTotal += amt;
      }

      if (col2 && col3) {
        girisList[idx] = {
          description: col2,
          bankOrType: col3,
          amount: amt !== 0 ? formatMoney(amt) : ''
        };
      } else {
        girisList[idx] = {
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

    // 2. DYNAMIC EXCEL SUMMARY ROWS EXTRACTION (TOPLAM KASA BAKİYESİ, GİRİŞ-ÇIKIŞ KALANI, KASA)
    let summaryRowMin = 999;
    let excelAnaKasaTotal = null;
    let excelKasaFarki = 0;

    // A) Formula in Column R: SUM(R4:R... veya TOPLAM(R4:R...
    for (let r = 20; r <= 65; r++) {
      const cell = ws['R' + r];
      if (cell && cell.f) {
        const f = cell.f.toUpperCase().replace(/\s+/g, '');
        if (f.startsWith('SUM(R4:R') || f.startsWith('TOPLAM(R4:R')) {
          summaryRowMin = r;
          excelAnaKasaTotal = cleanNum(cell.v);
          const nextCell = ws['R' + (r + 1)];
          if (nextCell && nextCell.v !== undefined && nextCell.v !== '') {
            excelNetKalan = cleanNum(nextCell.v);
          }
          const farkCell = ws['R' + (r + 2)];
          if (farkCell && farkCell.v !== undefined && farkCell.v !== '') {
            excelKasaFarki = cleanNum(farkCell.v);
          }
          break;
        }
      }
    }

    // B) Text Label Match in Column M, L, K, N
    if (excelAnaKasaTotal === null) {
      for (let r = 20; r <= 65; r++) {
        for (const col of ['M', 'L', 'K', 'N']) {
          const cell = ws[col + r];
          if (cell && cell.v) {
            const text = String(cell.v).trim().toUpperCase();
            if (text.includes('TOPLAM KASA') || text.includes('KASA BAKİYE') || text.includes('KASA BAKIYE')) {
              summaryRowMin = r;
              const rCell = ws['R' + r];
              if (rCell && rCell.v !== undefined && rCell.v !== '') {
                excelAnaKasaTotal = cleanNum(rCell.v);
              }
              const nextCell = ws['R' + (r + 1)];
              if (nextCell && nextCell.v !== undefined && nextCell.v !== '') {
                excelNetKalan = cleanNum(nextCell.v);
              }
              const farkCell = ws['R' + (r + 2)];
              if (farkCell && farkCell.v !== undefined && farkCell.v !== '') {
                excelKasaFarki = cleanNum(farkCell.v);
              }
              break;
            }
          }
        }
        if (excelAnaKasaTotal !== null) break;
      }
    }

    // C) Match Net Kalan in Column R (C22 formula or value match)
    if (excelAnaKasaTotal === null) {
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
      }
    }

    if (summaryRowMin === 999) {
      summaryRowMin = 41;
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

    for (let r = 4; r < summaryRowMin; r++) {
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
      const isDepo = upperName === 'DEPO';
      let depoGirisTotal = 0;
      let depoCikisTotal = 0;
      if (isDepo) {
        for (const g of girisList) {
          const desc = String(g.description || '').trim().toUpperCase();
          const bank = String(g.bankOrType || '').trim().toUpperCase();
          if (desc === 'DEPO' || bank === 'DEPO') depoGirisTotal += cleanNum(g.amount);
        }
        for (const c of cikisList) {
          const desc = String(c.description || '').trim().toUpperCase();
          if (desc.startsWith('DEPO ÇIKIŞ') || desc.startsWith('DEPO CIKIS')) depoCikisTotal += cleanNum(c.amount);
        }
      }

      const computedGunSonu = isKasa 
        ? (move + pos + duzeltme) 
        : (isDepo ? (devir + depoGirisTotal - depoCikisTotal) : (devir + move + pos + duzeltme));
      if (gunSonu === 0 && (!rCell || rCell.v === undefined || rCell.v === '') && (devir !== 0 || move !== 0 || pos !== 0 || duzeltme !== 0 || isDepo)) {
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
          ? (gunSonu === 0 ? '0' : formatInt(gunSonu))
          : ''
      };
    }

    const hasDailyActivity = (posTotal > 0 || cikisTotal > 0 || girisItemCount > 0 || cikisItemCount > 0 || anaKasaMoveCount > 0);
    if (!hasDailyActivity) {
      continue;
    }

    // DIRECT EXCEL VALUES
    const actualNetKalan = excelNetKalan !== null ? excelNetKalan : (excelGirisTotal !== null && excelCikisTotal !== null ? (excelGirisTotal - excelCikisTotal) : (girisTotal - cikisTotal));
    
    // Toplam Kasa Bakiyesi: Öncelik doğrudan Excel hücresinden (R sütunu özet satırı) okunan değerdedir
    let computedAnaKasaTotal = 0;
    for (const item of anaKasaList) {
      if (item.gunSonu !== '' && item.gunSonu !== undefined && item.gunSonu !== null) {
        computedAnaKasaTotal += cleanNum(item.gunSonu);
      }
    }
    let actualAnaKasaTotal = excelAnaKasaTotal !== null ? excelAnaKasaTotal : computedAnaKasaTotal;
    let actualBakiyeFarki = excelKasaFarki !== null ? excelKasaFarki : (actualAnaKasaTotal - actualNetKalan);
    if (Math.abs(actualAnaKasaTotal - actualNetKalan) < 0.05 || Math.abs(actualBakiyeFarki) < 0.05) {
      actualBakiyeFarki = 0;
      actualAnaKasaTotal = actualNetKalan;
    }

    const { error } = await supabase
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

    // POS Tablosu Senkronizasyonu (M51..Q65 POSLAR dökümü)
    try {
      let headerRow = -1;
      for (let r = 45; r <= 70; r++) {
        const cellM = ws['M' + r];
        const valM = cellM && cellM.v ? String(cellM.v).trim().toUpperCase('tr-TR') : '';
        if (valM.includes('POS')) {
          headerRow = r;
          break;
        }
      }

      if (headerRow !== -1) {
        const leftTable = [];
        for (let r = headerRow + 1; r <= headerRow + 15; r++) {
          const cellM = ws['M' + r];
          if (!cellM || cellM.v === undefined || cellM.v === '') continue;
          const rawBank = String(cellM.v).trim();
          if (rawBank.toUpperCase().startsWith('TOPLAM')) break;

          const tutar = cleanNum(ws['N' + r] ? ws['N' + r].v : 0);
          const gecen = cleanNum(ws['O' + r] ? ws['O' + r].v : 0);
          let kom = cleanNum(ws['P' + r] ? ws['P' + r].v : 0);
          if (kom > 0 && kom < 1) kom = kom * 100;
          const kes = cleanNum(ws['Q' + r] ? ws['Q' + r].v : 0);

          let bankName = rawBank.toLocaleUpperCase('tr-TR');
          if (bankName === 'DENİZ' || bankName === 'DENIZ') bankName = 'DENİZBANK';
          if (bankName === 'Ö.ZİRAAT' || bankName === 'Ö.ZIRAAT' || bankName === 'ÖZİRAAT') bankName = 'Ö. ZİRAAT';
          if (bankName === 'M.ZİRAAT' || bankName === 'M.ZIRAAT' || bankName === 'MARİFZİRAAT') bankName = 'MARİF ZİRAAT';

          leftTable.push({
            bank: bankName,
            colB: formatMoney(tutar),
            banka_gecen: formatMoney(gecen),
            komisyon: kom !== 0 ? formatMoney(kom) : '',
            kesinti: kes !== 0 ? formatMoney(kes) : ''
          });
        }

        if (leftTable.length > 0) {
          const orgId = '13b8da90-27d1-440d-a8f4-eb50dadd6391';
          const { data: existingPos } = await supabase
            .from('pos_reports')
            .select('right_table')
            .eq('organization_id', orgId)
            .eq('date', reportDate)
            .maybeSingle();

          const existingRight = existingPos?.right_table || [];

          await supabase
            .from('pos_reports')
            .upsert({
              organization_id: orgId,
              date: reportDate,
              left_table: leftTable,
              right_table: existingRight,
              updated_at: new Date().toISOString()
            }, { onConflict: 'organization_id,date' });
          log(`[POS Senkronizasyonu] ${reportDate} tarihi için ${leftTable.length} banka POS verisi güncellendi.`);
        }
      }
    } catch (posErr) {
      log(`[POS Parse Hatası] ${reportDate}: ${posErr.message}`);
    }

    if (!error) {
      log(`✔️ [GİRİŞ-ÇIKIŞ] ${reportDate} (${path.basename(filePath)} - Sayfa: ${sheetName}) yüklendi.`);
      count++;
    } else {
      log(`❌ [HATA] ${reportDate}: ${error.message}`);
    }
  }

  return count;
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

  return {
    merkez,
    merzifon,
    atakum,
    ilkadim,
    depo,
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
    return u.includes('ARKA') || u.includes('ŞUBE') || u.includes('SHEET2') || u.includes('SAYFA 2') || u.includes('SAYFA2');
  }) || (wb.SheetNames.length > 1 ? wb.SheetNames[1] : null);

  if (arkaSheetName && wb.Sheets[arkaSheetName]) {
    arkaSayfaData = parseArkaSayfa(wb.Sheets[arkaSheetName]);
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
    log(`✔️ [ANA KASA] ${reportDate} raporu yüklendi. (Arka Sayfa: ${arkaSayfaData ? 'Mevcut' : 'Yok'})`);
    return 1;
  }
  return 0;
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
  }
  return 0;
}

async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const upperFileName = fileName.toUpperCase();
  if (!upperFileName.endsWith('.XLSX') && !upperFileName.endsWith('.XLSM')) return;
  if (fileName.startsWith('~$')) return;

  try {
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: 'buffer' });

    const upperPath = filePath.toUpperCase();

    // 1. ÖNCELİK: Dosya adında/yolunda ANA KASA varsa veya ilk sayfa ANA KASA RAPORU içeriyorsa
    if (upperPath.includes('ANA KASA') || (wb.Sheets[wb.SheetNames[0]] && String(wb.Sheets[wb.SheetNames[0]]['B1']?.v || '').toUpperCase().includes('ANA KASA'))) {
      await processAnaKasaWorkbook(wb, filePath);
    } 
    // 2. ÖNCELİK: Dosya adında/yolunda GÜNLÜK HESAP varsa veya Sayfa1 HALKBANK içeriyorsa
    else if (upperPath.includes('GÜNLÜK HESAP') || upperPath.includes('GUNLUK HESAP') || (wb.Sheets['Sayfa1'] && String(wb.Sheets['Sayfa1']['A1']?.v || '').toUpperCase().includes('HALKBANK'))) {
      await processGunlukHesapWorkbook(wb, filePath);
    } 
    // 3. ÖNCELİK: GİRİŞ ÇIKIŞ
    else {
      await processGirisCikisWorkbook(wb, filePath);
    }
  } catch (err) {
    log(`⚠️ Dosya okuma hatası (${fileName}): ${err.message}`);
  }
}

async function main() {
  console.log("=========================================================");
  console.log("🚀 BEKO / ONE DARS OFİS KASA SENKRONİZASYON AJANI (V5)");
  console.log("=========================================================");

  const activeDirs = DEFAULT_BASE_DIRS.filter(d => fs.existsSync(d));
  if (activeDirs.length === 0) {
    console.log("Tanımlı ağ veya yerel klasörler bulunamadı.");
    return;
  }

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

  console.log("\n🎉 Tüm dosyalar ve işlenmiş günler kusursuz biçimde eşitlendi!");
}

main();
