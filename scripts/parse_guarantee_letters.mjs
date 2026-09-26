import xlsx from 'xlsx';
import fs from 'fs';

const wb = xlsx.readFile('C:/Users/berka/Downloads/BANKA TEMİNAT VE KREDİ MEKTUP.xlsx');
const ws = wb.Sheets['Sayfa1 (2)'];
const data = xlsx.utils.sheet_to_json(ws, { header: 1, raw: true });

function excelDateToISO(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') {
    const s = serial.trim();
    if (!s) return null;
    const parts = s.split('/');
    if (parts.length === 3) {
      let [m, d, y] = parts.map(Number);
      if (y < 100) y += 2000;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return s;
  }
  // Excel epoch: 1899-12-30
  const utc_days = Math.floor(serial - 25569);
  const date = new Date(utc_days * 86400 * 1000);
  return date.toISOString().slice(0, 10);
}

function cleanPhone(rawPhone) {
  if (!rawPhone) return null;
  let p = String(rawPhone).trim();
  // If it's a numeric string like 35821818451
  if (/^\d{10,11}$/.test(p)) {
    if (p.length === 10) p = '0' + p;
    // format as 0 (XXX) XXX XX XX
    return `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7, 9)} ${p.slice(9, 11)}`;
  }
  return p;
}

function cleanBank(rawBank) {
  if (!rawBank) return '';
  let b = rawBank.trim();
  if (b === 'M.KUVEYT' || b === 'M. KUVEYT') return 'Kuveyt Türk (Merzifon)';
  if (b === 'M.DENİZ') return 'Denizbank (Merzifon)';
  if (b === 'ALBARAKA') return 'Albaraka Türk';
  return b;
}

const records = [];
for (let i = 2; i <= 30; i++) {
  const row = data[i] || [];
  const rawDate = row[0];
  const institution = (row[1] || '').toString().trim();
  const rawType = (row[2] || '').toString().trim();
  const amount = Number(row[3]) || 0;
  const rawBank = (row[4] || '').toString().trim();
  const rawPhone = row[5];
  const rawEndDate = row[6];

  const issue_date = excelDateToISO(rawDate);
  const end_date = excelDateToISO(rawEndDate);
  const letter_type = (rawType.toUpperCase() === 'GEÇİCİ' ? 'GEÇİCİ' : (rawType.toUpperCase() === 'AVANS' ? 'AVANS' : 'KESİN'));
  const bank_name = cleanBank(rawBank);
  const phone_number = cleanPhone(rawPhone);

  records.push({
    id: `letter-${String(i - 1).padStart(3, '0')}`,
    organization_id: '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    issue_date,
    institution_name: institution,
    letter_type,
    amount,
    bank_name,
    phone_number,
    end_date,
    company_name: 'MARİF / ETİK ET',
    status: 'aktif',
    notes: ''
  });
}

console.log('Total records:', records.length);
console.log('Total amount:', records.reduce((s, r) => s + r.amount, 0));
fs.writeFileSync('scripts/parsed_letters.json', JSON.stringify(records, null, 2), 'utf8');
console.log('Saved to scripts/parsed_letters.json');
