import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

import { execSync } from 'child_process';
import os from 'os';

const isIpOnline = (ip) => {
  try {
    execSync(`ping -n 1 -w 1000 ${ip}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
};

const getWatchDirs = () => {
  const trMonthsFolder = [
    '01-OCAK', '02-ŞUBAT', '03-MART', '04-NİSAN', '05-MAYIS', '06-HAZİRAN',
    '07-TEMMUZ', '08-AĞUSTOS', '09-EYLÜL', '10-EKİM', '11-KASIM', '12-ARALIK'
  ];
  const currentMonthFolder = trMonthsFolder[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  const validDirs = [];
  let netShareFound = false;

  // 1. Try IP-based network paths first (prevent Windows SMB hangs by checking isIpOnline)
  const candidateIps = ['192.168.1.159', '192.168.1.37'];
  for (const ip of candidateIps) {
    if (isIpOnline(ip)) {
      const ipPath = `\\\\${ip}\\f\\GİRİŞ-ÇIKIŞ GÜNLÜK\\${currentYear} YILI\\${currentMonthFolder}`;
      try {
        if (fs.existsSync(ipPath)) {
          validDirs.push(ipPath);
          netShareFound = true;
          break;
        }
      } catch (e) {}
    }
  }

  // 2. Try hostnames network paths if IP paths failed
  if (!netShareFound) {
    const candidateHosts = ['Desktop-sjq3lnb.local', 'Desktop-sjq3lnb'];
    for (const host of candidateHosts) {
      if (isIpOnline(host)) {
        const hostPath = `\\\\${host}\\f\\GİRİŞ-ÇIKIŞ GÜNLÜK\\${currentYear} YILI\\${currentMonthFolder}`;
        try {
          if (fs.existsSync(hostPath)) {
            validDirs.push(hostPath);
            netShareFound = true;
            break;
          }
        } catch (e) {}
      }
    }
  }

  // 3. Try Slaughterhouse paths
  const slaughterPaths = [
    `D:/yedekler/E D E 2023/EDE - 2021/GÜNLÜK KESİM 2022`,
    `D:/yedekler/E D E 2023/EDE - 2021`
  ];
  for (const p of slaughterPaths) {
    try {
      if (fs.existsSync(p)) {
        validDirs.push(p);
      }
    } catch (e) {}
  }

  // Always include local candidates to ensure backup and local-work sync
  const homeDir = os.homedir();
  const localCandidates = [
    path.join(homeDir, 'OneDrive', 'Desktop', 'Araçlar'),
    path.join(homeDir, 'OneDrive', 'Desktop'),
    path.join(homeDir, 'Desktop', 'Araçlar'),
    path.join(homeDir, 'Desktop'),
    'C:\\Users\\berka\\OneDrive\\Desktop\\Araçlar',
    'C:\\Users\\berka\\OneDrive\\Desktop',
    'C:\\Users\\berka\\Desktop\\Araçlar',
    'C:\\Users\\berka\\Desktop'
  ];

  for (const p of localCandidates) {
    try {
      if (fs.existsSync(p)) {
        const resolved = path.resolve(p);
        if (!validDirs.includes(resolved)) {
          validDirs.push(resolved);
        }
      }
    } catch (e) {}
  }

  return validDirs;
};

const orgId = '13b8da90-27d1-440d-a8f4-eb50dadd6391';
const userId = '8dee555d-fbc6-443e-8197-b441a0ee1052';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be defined in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const trMonths = {
  'OCAK': '01', 'SUBAT': '02', 'ŞUBAT': '02', 'MART': '03',
  'NISAN': '04', 'NİSAN': '04', 'MAYIS': '05', 'HAZIRAN': '06',
  'HAZİRAN': '06', 'TEMMUZ': '07', 'AGUSTOS': '08', 'AĞUSTOS': '08',
  'EYLUL': '09', 'EYLÜL': '09', 'EKIM': '10', 'EKİM': '10',
  'KASIM': '11', 'ARALIK': '12'
};

const formatExcelAmount = (val) => {
  if (val === null || val === undefined || val === '') return '0,00';
  if (typeof val === 'number') {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }
  return String(val).trim();
};

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

// ==========================================
// KESİM LİSTESİ YARDIMCI FONKSİYONLARI
// ==========================================

const parseYearMonthFromSheet = (sheetName) => {
  const clean = sheetName.trim().toUpperCase().toLocaleUpperCase('tr-TR');
  
  const yearMatch = clean.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
  
  const monthNamesTr = [
    'OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
    'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'
  ];
  
  let month = null;
  for (let i = 0; i < monthNamesTr.length; i++) {
    if (clean.includes(monthNamesTr[i])) {
      month = String(i + 1).padStart(2, '0');
      break;
    }
  }
  
  if (!month) {
    const numMatch = clean.match(/^(\d{2})/);
    if (numMatch) {
      month = numMatch[1];
    } else {
      month = String(new Date().getMonth() + 1).padStart(2, '0');
    }
  }
  
  return { year, month };
};

const getSlaughterRecordKey = (slaughter_date, supplier, carcass_weight, animal_type) => {
  const dateStr = String(slaughter_date || '').trim();
  const supplierStr = String(supplier || '').trim().toLocaleLowerCase('tr-TR');
  const weightNum = Number(carcass_weight) || 0;
  const typeStr = String(animal_type || '').trim().toLocaleLowerCase('tr-TR');
  return `${dateStr}_${supplierStr}_${weightNum}_${typeStr}`;
};

const parseExcelDate = (val, selectedYear, selectedMonth) => {
  if (val === undefined || val === null) return null;
  
  // 1. Check if it's an Excel Date Serial number
  const num = typeof val === 'number' ? val : Number(String(val).trim());
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // 2. Check if it's a day number (1-31) and we have selectedYear and selectedMonth
  if (!isNaN(num) && num >= 1 && num <= 31 && selectedYear && selectedMonth && selectedMonth !== 'all' && selectedMonth !== 'custom') {
    const y = selectedYear;
    const m = selectedMonth.padStart(2, '0');
    const d = String(num).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // 3. String date parsing
  const clean = String(val).trim();
  if (clean) {
    const parts = clean.split('.');
    if (parts.length === 3) {
      let year = parts[2];
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (parts.length === 2 && selectedYear) {
      return `${selectedYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    if (clean.includes('-')) {
      const parts2 = clean.split('-');
      if (parts2.length === 3) {
        if (parts2[0].length === 4) {
          return `${parts2[0]}-${parts2[1].padStart(2, '0')}-${parts2[2].padStart(2, '0')}`;
        } else {
          let year = parts2[2];
          if (year.length === 2) {
            year = '20' + year;
          }
          return `${year}-${parts2[1].padStart(2, '0')}-${parts2[0].padStart(2, '0')}`;
        }
      }
    }
  }
  
  return null;
};

const formatExcelPaymentDate = (val) => {
  if (val === undefined || val === null) return 'CARİ';
  const str = String(val).trim();
  if (!str) return 'CARİ';
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${d}.${m}.${y}`;
  }
  return str;
};

const parseAmount = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const processSlaughterSheet = async (sheetName, worksheet, existingRecordsMap) => {
  try {
    const { year: sheetYear, month: sheetMonth } = parseYearMonthFromSheet(sheetName);
    console.log(`[Kesim] Sekme taranıyor: "${sheetName}" (Tahmin edilen Yıl: ${sheetYear}, Ay: ${sheetMonth})`);
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (rows.length < 3) {
      console.log(`[Kesim Atlandı] "${sheetName}": Satır sayısı yetersiz (${rows.length})`);
      return;
    }

    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const r = rows[i];
      if (r && r.some(cell => {
        const strCell = String(cell || '').trim().toLocaleUpperCase('tr-TR');
        return strCell.includes('TARİH') || strCell.includes('CİNS') || strCell.includes('ADI SOYADI');
      })) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      console.log(`[Kesim Atlandı] "${sheetName}": "TARİH", "CİNS" veya "ADI SOYADI" başlık satırı bulunamadı.`);
      return;
    }

    const headers = rows[headerIdx].map(h => String(h || '').trim().toLocaleUpperCase('tr-TR'));

    const colMap = {
      tarih: headers.findIndex(h => h.includes('TARİH')),
      el: headers.findIndex(h => h === 'EL' || h.includes('CARİ') || h.includes('TEDARİKÇİ') || h.includes('ADI SOYADI') || h.includes('AD SOYAD') || h.includes('ALICI') || h.includes('SATICI')),
      adet: headers.findIndex(h => h === 'AD.' || h === 'ADET' || h === 'AD'),
      cinsi: headers.findIndex(h => h.includes('CİNSİ') || h.includes('CİNS')),
      kg: headers.findIndex(h => h === 'KG' || h.includes('KARKAS') || h.includes('KİLO')),
      fiyat: headers.findIndex(h => h.includes('FİYAT')),
      pesinat: headers.findIndex(h => h.includes('PEŞİNAT') || h.includes('KESİNTİ') || h === 'TUTAR' || h.includes('ÖDENEN')),
      aciklama: headers.findIndex(h => h.includes('AÇIKLAMA') || h.includes('NOT')),
      odeme: headers.findIndex(h => h.includes('ÖDEME') || h.includes('TARİHİ'))
    };

    if (colMap.tarih === -1 || colMap.el === -1 || colMap.kg === -1) {
      console.log(`[Kesim Atlandı] "${sheetName}": Zorunlu sütunlar eksik (Tarih: ${colMap.tarih}, Cari/El: ${colMap.el}, Kg: ${colMap.kg})`);
      return;
    }

    const payload = [];
    let lastParsedDate = null;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawTarih = row[colMap.tarih];
      const rawEl = row[colMap.el];
      const rawKg = row[colMap.kg];

      if (!rawEl || !rawKg) continue;

      let parsedDate = parseExcelDate(rawTarih, sheetYear, sheetMonth);
      if (parsedDate) {
        lastParsedDate = parsedDate;
      } else {
        parsedDate = lastParsedDate;
      }

      if (!parsedDate) {
        parsedDate = `${sheetYear}-${sheetMonth.padStart(2, '0')}-01`;
      }

      const parsedSupplier = String(rawEl).trim();
      const parsedCarcassWeight = parseAmount(rawKg);

      if (!parsedSupplier || parsedCarcassWeight <= 0) continue;

      const parsedPricePerKg = colMap.fiyat !== -1 ? parseAmount(row[colMap.fiyat]) : 0;
      const parsedAnimalType = colMap.cinsi !== -1 ? String(row[colMap.cinsi] || 'Dana').trim() : 'Dana';
      const parsedHeadCount = colMap.adet !== -1 ? (parseInt(String(row[colMap.adet])) || 1) : 1;
      const parsedPesinat = colMap.pesinat !== -1 ? parseAmount(row[colMap.pesinat]) : 0;
      const parsedNotes = colMap.aciklama !== -1 ? String(row[colMap.aciklama] || '').trim() : '';
      const parsedPayment = colMap.odeme !== -1 ? formatExcelPaymentDate(row[colMap.odeme]) : 'CARİ';

      const total = parsedCarcassWeight * parsedPricePerKg;

      payload.push({
        organization_id: orgId,
        slaughter_date: parsedDate,
        supplier: parsedSupplier,
        head_count: parsedHeadCount,
        animal_type: parsedAnimalType,
        carcass_weight: parsedCarcassWeight,
        price_per_kg: parsedPricePerKg,
        total_amount: total,
        pesinat: parsedPesinat,
        kalan_tutar: total - parsedPesinat,
        notes: parsedNotes || null,
        payment_date: parsedPayment || null
      });
    }

    if (payload.length === 0) {
      console.log(`[Kesim Atlandı] "${sheetName}": Kaydedilebilir veri satırı bulunamadı.`);
      return;
    }

    console.log(`[Kesim Eşitleme] "${sheetName}" sekmesinde ${payload.length} adet satır analiz ediliyor...`);

    const toInsert = [];
    const toUpdate = [];

    const isDifferent = (r1, r2) => {
      return (
        r1.head_count !== r2.head_count ||
        Math.abs(Number(r1.price_per_kg) - Number(r2.price_per_kg)) > 0.01 ||
        Math.abs(Number(r1.total_amount) - Number(r2.total_amount)) > 0.01 ||
        Math.abs(Number(r1.pesinat) - Number(r2.pesinat)) > 0.01 ||
        Math.abs(Number(r1.kalan_tutar) - Number(r2.kalan_tutar)) > 0.01 ||
        (r1.notes || '') !== (r2.notes || '') ||
        (r1.payment_date || '') !== (r2.payment_date || '')
      );
    };

    for (const record of payload) {
      const key = getSlaughterRecordKey(record.slaughter_date, record.supplier, record.carcass_weight, record.animal_type);
      if (existingRecordsMap.has(key)) {
        const existing = existingRecordsMap.get(key);
        if (isDifferent(record, existing)) {
          toUpdate.push({ id: existing.id, ...record });
        }
      } else {
        toInsert.push(record);
      }
    }

    // Bulk inserts
    if (toInsert.length > 0) {
      console.log(`[Kesim Eşitleme] "${sheetName}": ${toInsert.length} yeni kayıt toplu ekleniyor...`);
      for (let i = 0; i < toInsert.length; i += 100) {
        const chunk = toInsert.slice(i, i + 100);
        const { error: insertError } = await supabase.from('kesim_listesi').insert(chunk);
        if (insertError) {
          console.error(`[Hata] Toplu ekleme başarısız:`, insertError);
        }
      }
    }

    // Parallel updates with concurrency
    if (toUpdate.length > 0) {
      console.log(`[Kesim Eşitleme] "${sheetName}": ${toUpdate.length} değişen kayıt güncelleniyor...`);
      for (let i = 0; i < toUpdate.length; i += 10) {
        const batch = toUpdate.slice(i, i + 10);
        await Promise.all(batch.map(async (record) => {
          const { id, ...updateData } = record;
          const { error: updateError } = await supabase
            .from('kesim_listesi')
            .update(updateData)
            .eq('id', id);
          if (updateError) {
            console.error(`[Hata] Kayıt güncellenemedi (ID: ${id}):`, updateError);
          }
        }));
      }
    }

    console.log(`[Başarılı] "${sheetName}" sekmesi eşitlemesi tamamlandı. (Yeni: ${toInsert.length}, Güncellenen: ${toUpdate.length})`);
  } catch (err) {
    console.error(`[Hata] "${sheetName}" sekmesi işlenirken hata oluştu:`, err.message || err);
  }
};

// ==========================================
// POS CİRO RAPORLARI YARDIMCI FONKSİYONLARI
// ==========================================

const processDayData = async (reportDate, worksheet, isMonthly = false) => {
  try {
    const rightTable = [];
    const leftTableMapping = {};
    // Detect layout offset (Daily layout starts at B, c=1; Monthly starts at A, c=0)
    let colOffset = 0;
    
    // Read Row 3 and Row 4 to check if Column A contains 'POS' or 'POSLAR'
    const cellRow3Col0 = worksheet[XLSX.utils.encode_cell({ r: 3, c: 0 })];
    const cellRow4Col0 = worksheet[XLSX.utils.encode_cell({ r: 4, c: 0 })];
    const val3_0 = cellRow3Col0 && cellRow3Col0.v ? String(cellRow3Col0.v).trim().toUpperCase('tr-TR') : '';
    const val4_0 = cellRow4Col0 && cellRow4Col0.v ? String(cellRow4Col0.v).trim().toUpperCase('tr-TR') : '';

    if (val3_0 === 'POSLAR' || val3_0 === 'POS' || val4_0 === 'POS' || val4_0 === 'POSLAR') {
      colOffset = -1;
    }

    const allowedRightBanks = [
      'KUVEYT', 'Ö.ZİRAAT', 'Ö. ZİRAAT', 'DENİZ', 'DENIZ', 'YAPI', 'GARANTİ', 'GARANTI', 
      'ZİRAAT', 'ZIRAAT', 'AKBANK', 'ALBARAKA', 'HALK', 'VAKIF', 'TEB', 'İŞBANK', 'İŞ', 'ISBANK',
      'DEPO', 'MERKEZ', 'ÇIKIŞ', 'MERZİFON', 'ATAKUM', 'İLKADIM'
    ];

    for (let r = 4; r < 40; r++) {
      const cellRefE = XLSX.utils.encode_cell({ r, c: 4 + colOffset });
      const cellRefF = XLSX.utils.encode_cell({ r, c: 5 + colOffset });
      const cellE = worksheet[cellRefE];
      const cellF = worksheet[cellRefF];
      if (cellE && cellE.v !== undefined && String(cellE.v).trim() !== '') {
        const name = String(cellE.v).trim().toUpperCase('tr-TR');
        
        // Parse numeric value to verify it is greater than 0
        const rawVal = cellF ? cellF.v : 0;
        let numVal = 0;
        if (typeof rawVal === 'number') {
          numVal = rawVal;
        } else if (typeof rawVal === 'string') {
          const clean = rawVal.replace(/\./g, '').replace(/,/g, '.').trim();
          numVal = parseFloat(clean) || 0;
        }

        if (numVal > 0) {
          const amount = formatExcelAmount(rawVal);
          if (r >= 21) {
            if (allowedRightBanks.includes(name)) {
              rightTable.push({ name, amount });
            }
          } else {
            rightTable.push({ name, amount });
          }
        }
      }
    }

    for (let r = 4; r < 11; r++) {
      const cellRefB = XLSX.utils.encode_cell({ r, c: 1 + colOffset });
      const cellRefC = XLSX.utils.encode_cell({ r, c: 2 + colOffset });
      const cellRefD = XLSX.utils.encode_cell({ r, c: 3 + colOffset });
      const cellRefE = XLSX.utils.encode_cell({ r, c: 4 + colOffset });
      const cellRefF = XLSX.utils.encode_cell({ r, c: 5 + colOffset });

      const cellB = worksheet[cellRefB];
      const cellC = worksheet[cellRefC];
      const cellD = worksheet[cellRefD];
      const cellE = worksheet[cellRefE];
      const cellF = worksheet[cellRefF];

      if (cellB && cellB.v !== undefined && String(cellB.v).trim() !== '') {
        const bankName = String(cellB.v).trim();
        const mappedName = matchLeftBankName(bankName);
        if (mappedName) {
          const rawColB = cellC ? cellC.v : '';
          const rawBankaGecen = cellD ? cellD.v : '';
          const rawKom = cellE ? cellE.v : '';
          const rawKes = cellF ? cellF.v : '';

          let formattedColB = '';
          if (rawColB !== undefined && rawColB !== null && rawColB !== '') {
            formattedColB = typeof rawColB === 'number' ? formatExcelAmount(rawColB) : String(rawColB).trim();
          }

          let formattedBankaGecen = '';
          if (rawBankaGecen !== undefined && rawBankaGecen !== null && rawBankaGecen !== '') {
            formattedBankaGecen = typeof rawBankaGecen === 'number' ? formatExcelAmount(rawBankaGecen) : String(rawBankaGecen).trim();
          }

          let komVal = rawKom;
          if (typeof komVal === 'number' && komVal > 0 && komVal < 1) {
            komVal = komVal * 100;
          }
          let formattedKom = '';
          if (komVal !== undefined && komVal !== null && komVal !== '') {
            formattedKom = typeof komVal === 'number' ? formatExcelAmount(komVal) : String(komVal).trim();
          }

          let formattedKes = '';
          if (rawKes !== undefined && rawKes !== null && rawKes !== '') {
            formattedKes = typeof rawKes === 'number' ? formatExcelAmount(rawKes) : String(rawKes).trim();
          }

          leftTableMapping[mappedName] = {
            colB: formattedColB,
            banka_gecen: formattedBankaGecen,
            komisyon: formattedKom,
            kesinti: formattedKes
          };
        }
      }
    }

    const defaultLeftTable = [
      { bank: 'ZİRAAT', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
      { bank: 'GARANTİ', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
      { bank: 'DENİZBANK', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
      { bank: 'KUVEYT', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
      { bank: 'ALBARAKA', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
      { bank: 'Ö. ZİRAAT', colB: '', banka_gecen: '', kesinti: '', komisyon: '' },
      { bank: 'AKBANK', colB: '', banka_gecen: '', kesinti: '', komisyon: '' }
    ];

    const finalLeftTable = defaultLeftTable.map(row => {
      const mapping = leftTableMapping[row.bank];
      if (mapping !== undefined) {
        return {
          ...row,
          colB: mapping.colB || '',
          banka_gecen: mapping.banka_gecen || '',
          komisyon: mapping.komisyon || '',
          kesinti: mapping.kesinti || ''
        };
      }
      return row;
    });

    const hasLeftData = finalLeftTable.some(row => (row.banka_gecen && row.banka_gecen.trim() !== '') || (row.colB && row.colB.trim() !== ''));
    const hasRightData = rightTable.length > 0;
    if (!hasLeftData && !hasRightData) return;

    const { data: existing, error: fetchError } = await supabase
      .from('pos_reports')
      .select('*')
      .eq('organization_id', orgId)
      .eq('date', reportDate)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) {
      const existingLeftTable = existing.left_table || [];
      const updatedLeftTable = finalLeftTable.map(row => {
        const existingRow = existingLeftTable.find(r => 
          r.bank.trim().toLocaleUpperCase('tr-TR').replace(/\s+/g, '') === row.bank.trim().toLocaleUpperCase('tr-TR').replace(/\s+/g, '')
        );
        const existingVal = existingRow ? String(existingRow.banka_gecen || '').trim() : '';
        // Learn kuralı kaldırıldı: Excel verisi ofis bilgisayarında elle girildiği için birincil kaynaktır.
        const hasExcelGecen = row.banka_gecen && row.banka_gecen.trim() !== '';
        const finalBankaGecen = hasExcelGecen ? row.banka_gecen : existingVal;
        return {
          ...row,
          banka_gecen: finalBankaGecen
        };
      });

      const { error: updateError } = await supabase
        .from('pos_reports')
        .update({
          left_table: updatedLeftTable,
          right_table: rightTable,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      if (updateError) throw updateError;
      console.log(`[POS Başarılı] Güncellendi - Tarih: ${reportDate} (${rightTable.length} şube)`);
    } else {
      const { error: insertError } = await supabase
        .from('pos_reports')
        .insert({
          organization_id: orgId,
          date: reportDate,
          left_table: finalLeftTable,
          right_table: rightTable
        });
      if (insertError) throw insertError;
      console.log(`[POS Başarılı] Yeni Eklendi - Tarih: ${reportDate} (${rightTable.length} şube)`);
    }

    // 2. Kasa Giriş/Çıkış (Gelir/Gider) Verilerini Çekme ve Eşitleme
    if (isMonthly) {
      const cashboxRows = [];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Veriler index 4'ten (Satır 5) başlar
      for (let r = 4; r < rows.length; r++) {
        const row = rows[r];
        if (!row) continue;

        // A. Çıkışlar (Gider)
        const outCari = row[6] ? String(row[6]).trim() : ''; // Kolon G
        const outCatRaw = row[7] ? String(row[7]).trim() : ''; // Kolon H
        const outAmt = row[8] !== undefined ? parseAmount(row[8]) : 0; // Kolon I
        
        if (outCari || outCatRaw || outAmt > 0) {
          if (!outCari.toLowerCase().includes('toplam') && !outCatRaw.toLowerCase().includes('toplam')) {
            // Şirket ön eki ayrıştırma (E. = Etik Et, M. = Marif Et)
            let company = null;
            let cleanCategory = outCatRaw;
            if (outCatRaw.toLowerCase().startsWith('e.')) {
              company = 'Etik Et';
              cleanCategory = outCatRaw.substring(2).trim();
            } else if (outCatRaw.toLowerCase().startsWith('m.')) {
              company = 'Marif Et';
              cleanCategory = outCatRaw.substring(2).trim();
            } else if (outCatRaw.toLowerCase().startsWith('marif')) {
              company = 'Marif Et';
              cleanCategory = outCatRaw.substring(5).trim();
            }

            cashboxRows.push({
              organization_id: orgId,
              transaction_date: reportDate,
              transaction_type: 'gider',
              amount: outAmt || 0.01,
              currency: 'TRY',
              category: cleanCategory || 'Diğer',
              recipient_payer: outCari,
              description: String(r - 4),
              company: company,
              exclude_from_report: false,
              created_by: userId
            });
          }
        }

        // B. Girişler (Gelir)
        const inCari = row[11] ? String(row[11]).trim() : ''; // Kolon L
        const inAmt = row[16] !== undefined ? parseAmount(row[16]) : 0; // Kolon Q
        
        if (inCari || inAmt > 0) {
          if (!inCari.toLowerCase().includes('toplam')) {
            const isKasaDevir = (r - 4) === 0 || inCari.toLowerCase().includes('devir');
            const category = isKasaDevir ? 'Kasa Devir' : 'Tahsilat';

            cashboxRows.push({
              organization_id: orgId,
              transaction_date: reportDate,
              transaction_type: 'gelir',
              amount: inAmt || 0.01,
              currency: 'TRY',
              category: category,
              recipient_payer: inCari,
              description: String(r - 4),
              company: null,
              exclude_from_report: false,
              created_by: userId
            });
          }
        }
      }

      // Eğer günün kasa girdisi/çıktısı varsa, eski kayıtları silip yenilerini yüklüyoruz
      if (cashboxRows.length > 0) {
        const { error: deleteError } = await supabase
          .from('main_cashbox_transactions')
          .delete()
          .eq('transaction_date', reportDate)
          .eq('organization_id', orgId);
        
        if (deleteError) {
          console.error(`[Kasa Hata] Eski veriler silinemedi:`, deleteError);
        } else {
          const { error: insertError } = await supabase
            .from('main_cashbox_transactions')
            .insert(cashboxRows);
          
          if (insertError) {
            console.error(`[Kasa Hata] Yeni veriler eklenemedi:`, insertError);
          } else {
            console.log(`[Kasa Başarılı] ${reportDate} Kasa İşlemleri Eşitlendi (${cashboxRows.length} kayıt)`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`[Hata] Tarih işlenirken hata oluştu ${reportDate}:`, err.message || err);
  }
};

// ==========================================
// ANA DOSYA İŞLEYİCİSİ (DOSYA TÜRÜNÜ BELİRLER)
// ==========================================

const lastModifiedTimes = new Map();

const processFile = async (filePath) => {
  const fileName = path.basename(filePath);
  
  try {
    const stats = fs.statSync(filePath);
    const mtime = stats.mtimeMs;
    if (lastModifiedTimes.has(filePath) && lastModifiedTimes.get(filePath) === mtime) {
      return;
    }
    lastModifiedTimes.set(filePath, mtime);

    console.log(`[İşleniyor] Yeni veya değişen dosya algılandı: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    console.log(`[DEBUG] "${fileName}" içindeki tüm sekmeler:`, workbook.SheetNames);

    // Senaryo A: Kesim Listesi Excel Dosyası (Aktif edildi)
    if (fileName.toLowerCase().includes('kesim')) {
      console.log(`[Kesim] Kesim Exceli tespit edildi, işleniyor: ${filePath}`);
      
      // Fetch all existing records to do update-or-insert matching
      const existingRecordsMap = new Map();
      let from = 0;
      const step = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('kesim_listesi')
          .select('*')
          .eq('organization_id', orgId)
          .range(from, from + step - 1);
          
        if (error) {
          console.error(`[Kesim Hata] Mevcut kayıtlar çekilemedi:`, error.message);
          return;
        }
        if (!data || data.length === 0) break;
        
        for (const r of data) {
          const key = getSlaughterRecordKey(r.slaughter_date, r.supplier, r.carcass_weight, r.animal_type);
          existingRecordsMap.set(key, r);
        }
        if (data.length < step) break;
        from += step;
      }
      
      console.log(`[Kesim] Veritabanından ${existingRecordsMap.size} adet mevcut kayıt yüklendi.`);

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (worksheet) {
          await processSlaughterSheet(sheetName, worksheet, existingRecordsMap);
        }
      }
      console.log(`[Kesim Başarılı] "${fileName}" dosyasındaki kesim verileri eşitlendi.`);
      return;
    }

    // Senaryo B: Aylık POS Excel Dosyası (Örn: "AĞUSTOS-2026.xlsx")
    const monthlyMatch = fileName.match(/^([A-ZŞĞİÖÇÜ]+)-(\d{4})\.(xlsx|xls)$/i);
    if (monthlyMatch) {
      const monthName = monthlyMatch[1].toUpperCase('tr-TR');
      const year = monthlyMatch[2];
      const monthNum = trMonths[monthName];
      if (!monthNum) return;

      for (const sheetName of workbook.SheetNames) {
        if (/^\d{1,2}$/.test(sheetName)) {
          const day = sheetName.padStart(2, '0');
          const reportDate = `${year}-${monthNum}-${day}`;
          const worksheet = workbook.Sheets[sheetName];
          await processDayData(reportDate, worksheet, true);
        }
      }
      return;
    }

    // Senaryo C: Günlük POS Excel Dosyası (Örn: "12.08.2026.xlsx")
    const dailyMatch = fileName.match(/^(\d{2})[._-](\d{2})[._-](\d{4})/);
    if (dailyMatch) {
      const [_, day, month, year] = dailyMatch;
      const reportDate = `${year}-${month}-${day}`;
      const sheetName = workbook.SheetNames.includes('RAPOR ARKA SAYFA') ? 'RAPOR ARKA SAYFA' : workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      if (worksheet) {
        await processDayData(reportDate, worksheet, false);
      }
      return;
    }

    console.log(`[Bilgi] Dosya formatı eşleşmedi (es geçildi): ${fileName}`);
  } catch (err) {
    console.error(`[Hata] Dosya okunurken hata oluştu ${fileName}:`, err.message || err);
  }
};

const main = async () => {
  console.log(`[${new Date().toISOString()}] DARS POS & Kesim Ortak İzleyici Servisi Başlatıldı...`);
  
  let email = process.env.SUPABASE_AUTH_EMAIL;
  let password = process.env.SUPABASE_AUTH_PASSWORD;
  
  if (!email || !password) {
    const syncUser = process.env.EKAP_SYNC_USERNAME;
    const syncPass = process.env.EKAP_SYNC_PASSWORD;
    if (syncUser && syncPass) {
      email = syncUser.includes('@') ? syncUser : (syncUser === 'berkant' ? 'berkant@dars.local' : `${syncUser}@ops360.local`);
      password = syncPass;
    }
  }

  if (email && password) {
    console.log(`[Auth] Giriş yapılıyor: ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error(`[Auth Hata] Giriş yapılamadı:`, error.message);
    } else {
      console.log(`[Auth Başarılı] Başarıyla giriş yapıldı: ${data.user.email}`);
    }
  } else {
    console.log(`[Auth Uyarı] .env.local dosyasında giriş bilgileri bulunamadı. Anonim olarak çalıştırılıyor.`);
  }

  const targetDirs = getWatchDirs();
  console.log(`İzlenecek Klasörler:`, targetDirs);

  const scanAndProcess = async () => {
    // Dynamically retrieve active watch directories to handle date/month boundary changes
    const activeDirs = getWatchDirs();
    for (const dir of activeDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = fs.readdirSync(dir).filter(f => {
          const ext = path.extname(f).toLowerCase();
          return (ext === '.xlsx' || ext === '.xls') && !f.startsWith('~$');
        });

        // Collect all file paths to process
        const pathsToProcess = new Set(files.map(f => path.join(dir, f)));

        // Explicitly check for the current month's file to trigger OneDrive sync if virtual
        const trMonthsFolder = [
          'OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
          'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'
        ];
        const currentMonthName = trMonthsFolder[new Date().getMonth()];
        const currentYear = new Date().getFullYear();
        
        const candidateFileNames = [
          `${currentMonthName}-${currentYear}.xlsx`,
          `${currentMonthName}-${currentYear}.xls`
        ];

        for (const candidateName of candidateFileNames) {
          const fullPath = path.join(dir, candidateName);
          try {
            if (fs.existsSync(fullPath)) {
              pathsToProcess.add(fullPath);
            }
          } catch (e) {}
        }

        for (const filePath of pathsToProcess) {
          await processFile(filePath);
        }
      } catch (err) {
        console.error(`[Hata] Klasör taranırken hata: ${dir}`, err.message);
      }
    }
  };

  // Run initial scan
  await scanAndProcess();

  // Setup watchers for each folder
  const activeWatchers = [];
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;
    let debounceTimer = null;
    try {
      const watcher = fs.watch(dir, (eventType, filename) => {
        if (!filename || filename.startsWith('~$')) return;
        const ext = path.extname(filename).toLowerCase();
        if (ext !== '.xlsx' && ext !== '.xls') return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          processFile(path.join(dir, filename));
        }, 1500);
      });
      watcher.on('error', (err) => {
        console.warn(`[İzleyici Uyarısı] ${dir} izlenirken hata oluştu (Watcher durduruluyor, Polling devam edecek):`, err.message);
        try {
          watcher.close();
        } catch (e) {}
      });
      activeWatchers.push(watcher);
    } catch (e) {
      console.warn(`[Uyarı] ${dir} için fs.watch kurulamadı (Ağ paylaşımı olabilir, Polling devrede):`, e.message);
    }
  }

  // Polling fallback to robustly detect changes on network drives (every 10 seconds)
  setInterval(async () => {
    await scanAndProcess();
  }, 10000);
};

main();
