import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

function excelDateToDateStr(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') {
    serial = serial.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(serial)) return serial;
    const parts = serial.split('.');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return serial;
  }
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const y = date_info.getUTCFullYear();
    const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date_info.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

const checks = [];
let localId = 1000;

// 1. TAKAS ÇEKLERİ.xlsx (Special Non-Takas, Kayıp, etc.)
const takasPath = 'C:/Users/berka/Downloads/TAKAS ÇEKLERİ.xlsx';
if (fs.existsSync(takasPath)) {
  checks.push({
    id: 'fallback-nontakas-1',
    local_id: localId++,
    check_type: 'kesilen',
    document_type: 'cek',
    due_date: '2026-09-29',
    amount: 51556,
    para_birimi: 'TRY',
    check_no: '',
    debtor: '',
    creditor: 'ALİ ARAN TAZMİNAT',
    bank_name: '',
    status: 'Tahsilde',
    ozel_alan: 'TAKASTA OLMAYAN',
    created_at: new Date().toISOString()
  });
  checks.push({
    id: 'fallback-nontakas-2',
    local_id: localId++,
    check_type: 'kesilen',
    document_type: 'cek',
    due_date: '2026-09-29',
    amount: 1000000,
    para_birimi: 'TRY',
    check_no: '',
    debtor: 'M.AKBANK',
    creditor: 'ÖMER DEMİR',
    bank_name: 'M.AKBANK',
    status: 'Tahsilde',
    ozel_alan: 'TAKASTA OLMAYAN',
    created_at: new Date().toISOString()
  });
  checks.push({
    id: 'fallback-nontakas-3',
    local_id: localId++,
    check_type: 'kesilen',
    document_type: 'cek',
    due_date: '2026-09-29',
    amount: 5000000,
    para_birimi: 'TRY',
    check_no: '',
    debtor: 'M.ZİRAAT',
    creditor: 'BURAK BESİCİLİK-KRŞ',
    bank_name: 'M.ZİRAAT',
    status: 'Tahsilde',
    ozel_alan: 'TAKASTA OLMAYAN',
    created_at: new Date().toISOString()
  });

  // Active Takas Checks for 2026-09-29 and 2026-09-30
  const activeTakasList = [
    // 2026-09-29 Takas Checks
    { date: '2026-09-29', bank: 'ETİK AKBANK', debtor: 'ETİK AKBANK', creditor: 'MUZAFFER BOLAT', amt: 540735 },
    { date: '2026-09-29', bank: 'ETİK AKBANK', debtor: 'ETİK AKBANK', creditor: 'ARAS KÖSYETKİN', amt: 280000 },
    { date: '2026-09-29', bank: 'DENİZBANK', debtor: 'DENİZBANK', creditor: 'KUTİX MUKAVVA', amt: 311409 },
    { date: '2026-09-29', bank: 'DENİZBANK', debtor: 'DENİZBANK', creditor: 'CENG NAMLI GIDA', amt: 249300 },
    { date: '2026-09-29', bank: 'ZİRAAT', debtor: 'ETİK ZİRAAT', creditor: 'ELEKÇİ KEMAL', amt: 412569 },
    { date: '2026-09-29', bank: 'ZİRAAT', debtor: 'ETİK ZİRAAT', creditor: 'ERZİNCAN MESUT', amt: 511290 },
    { date: '2026-09-29', bank: 'MARİF ZİRAAT', debtor: 'MARİF ZİRAAT', creditor: 'RAMAZAN YILMAZ', amt: 569500 },
    { date: '2026-09-29', bank: 'MARİF ZİRAAT', debtor: 'MARİF ZİRAAT', creditor: 'NEBİOĞULLARI', amt: 811573 },
    { date: '2026-09-29', bank: 'ALBARAKA', debtor: 'ALBARAKA', creditor: 'BERKAN BESİCİLİK', amt: 1810000 },
    { date: '2026-09-29', bank: 'ALBARAKA', debtor: 'ALBARAKA', creditor: 'MESUT AYAYDIN', amt: 428888 },
    { date: '2026-09-29', bank: 'İŞBANK', debtor: 'İŞBANK', creditor: 'SKT ET', amt: 381601 },
    { date: '2026-09-29', bank: 'MARİF GARANTİ', debtor: 'MARİF GARANTİ', creditor: 'ALİ DEMİR', amt: 474165 },
    { date: '2026-09-29', bank: 'TAKSİT', debtor: 'TAKSİT', creditor: 'HALK TAKSİT', amt: 73021 },
    { date: '2026-09-29', bank: 'TAKSİT', debtor: 'TAKSİT', creditor: 'ZİRAAT TAKSİT', amt: 125000 },
    
    // 2026-09-30 Takas Checks
    { date: '2026-09-30', bank: 'İŞBANK', debtor: 'İŞBANK', creditor: 'ORHAN KELCE', amt: 110000 },
    { date: '2026-09-30', bank: 'İŞBANK', debtor: 'İŞBANK', creditor: 'SARIMSAK KASTAMONU', amt: 193920 },
    { date: '2026-09-30', bank: 'DENİZBANK', debtor: 'DENİZBANK', creditor: 'KUTİX MUKAVVA', amt: 311409 },
    { date: '2026-09-30', bank: 'ALBARAKA', debtor: 'ALBARAKA', creditor: 'İLHAMİ BAĞÇUVAN', amt: 1000000 },
    { date: '2026-09-30', bank: 'TAKSİT', debtor: 'TAKSİT', creditor: 'ŞEKERBANK TAKSİT', amt: 150000 }
  ];

  activeTakasList.forEach((t, idx) => {
    checks.push({
      id: 'fallback-takas-' + (idx + 1),
      local_id: localId++,
      check_type: 'kesilen',
      document_type: 'cek',
      due_date: t.date,
      amount: t.amt,
      para_birimi: 'TRY',
      check_no: 'TK' + (10000 + idx),
      debtor: t.debtor,
      creditor: t.creditor,
      bank_name: t.bank,
      status: 'Tahsilde',
      ozel_alan: 'TAKASTA',
      created_at: new Date().toISOString()
    });
  });


  const kayipList = [
    { creditor: 'MUHARREM DEMİR', bank: 'E.ZİRAAT', amt: 0, date: '2023-06-12' },
    { creditor: 'MUSTAFA GENÇELİOĞLU', bank: 'E.DENİZ', amt: 0, date: '2023-08-26' },
    { creditor: 'ASLAN KIRIKTAŞ', bank: 'E.DENİZ', amt: 1478540, date: '2024-09-09' },
    { creditor: 'ŞENOL', bank: 'E.ZİRAAT', amt: 1523884, date: '2025-03-19' },
    { creditor: 'MUSTAFA UYUMAZ', bank: 'M.ZİRAAT', amt: 346398, date: '2025-09-30' }
  ];
  kayipList.forEach((k, idx) => {
    checks.push({
      id: 'fallback-kayip-' + (idx + 1),
      local_id: localId++,
      check_type: 'alinan',
      document_type: 'cek',
      due_date: k.date,
      amount: k.amt,
      para_birimi: 'TRY',
      check_no: '',
      debtor: k.bank,
      creditor: k.creditor,
      bank_name: k.bank,
      status: 'Kayıp',
      ozel_alan: 'KAYIP',
      created_at: new Date().toISOString()
    });
  });
}

// 2. ÇEK KOÇANI TAKİP.xlsx (Kesilen Çekler)
const kocanPath = 'C:/Users/berka/Downloads/ÇEK KOÇANI TAKİP.xlsx';
if (fs.existsSync(kocanPath)) {
  const wb = XLSX.readFile(kocanPath);
  for (const sheetName of wb.SheetNames) {
    if (sheetName === 'Sayfa1') continue;
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let startRow = 1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const rowStr = (data[i] || []).join(' ').toUpperCase();
      if (rowStr.includes('ÇEK') || rowStr.includes('SERİ') || rowStr.includes('TARİH')) {
        startRow = i + 1;
        break;
      }
    }
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      const checkNo = row[0] ? String(row[0]).trim() : null;
      const rawDate = row[1];
      const amount = Number(row[2]) || 0;
      const creditor = row[3] ? String(row[3]).trim() : '';

      if (!checkNo && amount === 0 && !creditor) continue;
      const dueDate = excelDateToDateStr(rawDate);

      checks.push({
        id: `fallback-kocan-${localId}`,
        local_id: localId++,
        check_type: 'kesilen',
        document_type: 'cek',
        issue_date: dueDate,
        due_date: dueDate,
        amount: amount,
        para_birimi: 'TRY',
        check_no: checkNo,
        debtor: sheetName,
        creditor: creditor,
        bank_name: sheetName,
        bank_branch: '',
        status: 'Tahsilde',
        ozel_alan: 'ÇEK',
        kesideci: 'ETİK / MARİF',
        keside_yeri: 'AMASYA',
        tahsildar_banka: sheetName,
        ciro_edilen: null,
        created_at: new Date().toISOString()
      });
    }
  }
}

// 3. Musteri_Cekleri_2026.xlsx (Müşteri Çekleri)
const musteriPath = 'C:/Users/berka/Downloads/Musteri_Cekleri_2026.xlsx';
if (fs.existsSync(musteriPath)) {
  const wb = XLSX.readFile(musteriPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rows.length > 0) {
    const headerRow = rows[0];
    const bankCols = [
      { start: 0, bank: 'KUVEYT' },
      { start: 4, bank: 'ALBARAKA' },
      { start: 8, bank: 'ETİK DENİZ' },
      { start: 12, bank: 'GARANTİ' },
      { start: 16, bank: 'QNB FİNANS' },
      { start: 20, bank: 'SENET' }
    ];

    for (let rIdx = 1; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      if (!row) continue;
      for (const colDef of bankCols) {
        const rawDate = row[colDef.start];
        const customer = row[colDef.start + 1] ? String(row[colDef.start + 1]).trim() : '';
        const amtVal = row[colDef.start + 2];
        const amount = Number(amtVal) || 0;

        if (!customer && amount === 0) continue;
        const dueDate = excelDateToDateStr(rawDate);
        const isSenet = colDef.bank === 'SENET';

        checks.push({
          id: `fallback-musteri-${localId}`,
          local_id: localId++,
          check_type: 'alinan',
          document_type: isSenet ? 'senet' : 'cek',
          issue_date: dueDate,
          due_date: dueDate,
          amount: amount,
          para_birimi: 'TRY',
          check_no: '',
          debtor: customer,
          creditor: customer,
          bank_name: isSenet ? 'SENET' : colDef.bank,
          bank_branch: '',
          status: 'Tahsilde',
          ozel_alan: isSenet ? 'SENET' : 'ÇEK',
          kesideci: customer,
          keside_yeri: '',
          tahsildar_banka: colDef.bank,
          ciro_edilen: null,
          created_at: new Date().toISOString()
        });
      }
    }
  }
}

// 4. dosyalar/ÇEKLER-23.06.2026.xls & MÜŞTERİ ÇEKLERİ YENİ-21.07.2026.xls
for (const f of ['dosyalar/ÇEKLER-23.06.2026.xls', 'dosyalar/MÜŞTERİ ÇEKLERİ YENİ-21.07.2026.xls']) {
  if (fs.existsSync(f)) {
    const wb = XLSX.readFile(f);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;
      const rawDate = r[0];
      const kesideci = r[2] ? String(r[2]).trim() : '';
      const bankOrStatus = r[4] ? String(r[4]).trim() : '';
      const amount = Number(r[6]) || Number(r[5]) || 0;
      const ciro = r[7] ? String(r[7]).trim() : '';
      if (!kesideci && amount === 0) continue;
      checks.push({
        id: `fallback-alinan-${localId}`,
        local_id: localId++,
        check_type: 'alinan',
        document_type: 'cek',
        due_date: excelDateToDateStr(rawDate),
        amount: amount,
        para_birimi: 'TRY',
        check_no: '',
        debtor: kesideci,
        creditor: kesideci,
        bank_name: bankOrStatus.includes('Verildi') ? 'PORTFÖY' : bankOrStatus,
        status: bankOrStatus.includes('Verildi') ? bankOrStatus : 'Portföyde',
        ozel_alan: ciro ? 'CİRO: ' + ciro : 'ÇEK',
        kesideci: kesideci,
        ciro_edilen: ciro,
        created_at: new Date().toISOString()
      });
    }
  }
}

// Bank accounts
const bankAccounts = [
  {
    id: "bank-kuveyt",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "KUVEYT",
    account_name: "KUVEYT TÜRK",
    account_type: "vadesiz",
    iban: "TR330004600154888000119983",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  },
  {
    id: "bank-ziraat",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "ZİRAAT",
    account_name: "ZİRAAT BANKASI",
    account_type: "vadesiz",
    iban: "TR640001002695772776285001",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  },
  {
    id: "bank-albaraka",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "ALBARAKA",
    account_name: "ALBARAKA TÜRK",
    account_type: "vadesiz",
    iban: "",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  },
  {
    id: "bank-akbank",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "AKBANK",
    account_name: "AKBANK",
    account_type: "vadesiz",
    iban: "TR850001002695861304855001",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  },
  {
    id: "bank-deniz",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "DENİZ",
    account_name: "DENİZBANK",
    account_type: "vadesiz",
    iban: "TR640013400001264426400001",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  },
  {
    id: "bank-halkbank",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "HALKBANK",
    account_name: "HALKBANK",
    account_type: "vadesiz",
    iban: "TR470001200930000010260652",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  },
  {
    id: "bank-marif",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "MARİF",
    account_name: "MARİF",
    account_type: "vadesiz",
    iban: "TR620001200930000010260770",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  },
  {
    id: "bank-isbank",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "İŞBANK",
    account_name: "İŞBANK",
    account_type: "vadesiz",
    iban: "",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  },
  {
    id: "bank-garanti",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "GARANTİ",
    account_name: "GARANTİ BBVA",
    account_type: "vadesiz",
    iban: "",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  },
  {
    id: "bank-yapi",
    organization_id: "13b8da90-27d1-440d-a8f4-eb50dadd6391",
    bank: "YAPI",
    account_name: "YAPI KREDİ",
    account_type: "vadesiz",
    iban: "",
    currency: "TRY",
    balance: 0,
    status: "aktif"
  }
];

// Ensure public/data dir exists
fs.mkdirSync('public/data', { recursive: true });

fs.writeFileSync('public/data/fallback_ebs_checks.json', JSON.stringify(checks, null, 2), 'utf8');
fs.writeFileSync('public/data/fallback_bank_accounts.json', JSON.stringify(bankAccounts, null, 2), 'utf8');

console.log(`Generated fallback_ebs_checks.json with ${checks.length} checks.`);
console.log(`Generated fallback_bank_accounts.json with ${bankAccounts.length} accounts.`);
