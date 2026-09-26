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
  const utc_days = Math.floor(serial - 25569);
  const date = new Date(utc_days * 86400 * 1000);
  return date.toISOString().slice(0, 10);
}

function cleanPhone(rawPhone) {
  if (!rawPhone) return null;
  let p = String(rawPhone).trim();
  if (/^\d{10,11}$/.test(p)) {
    if (p.length === 10) p = '0' + p;
    return `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7, 9)} ${p.slice(9, 11)}`;
  }
  return p.replace(/\s+/g, ' ');
}

function cleanBank(rawBank) {
  if (!rawBank) return '';
  let b = rawBank.trim();
  if (b === 'M.KUVEYT' || b === 'M. KUVEYT') return 'Kuveyt Türk (Merzifon)';
  if (b === 'M.DENİZ') return 'Denizbank (Merzifon)';
  if (b === 'ALBARAKA') return 'Albaraka Türk';
  return b;
}

function cleanInstitution(inst) {
  if (!inst) return '';
  return inst.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();
}

const ORG_ID = '13b8da90-27d1-440d-a8f4-eb50dadd6391';
const records = [];

for (let i = 2; i <= 30; i++) {
  const row = data[i] || [];
  const rawDate = row[0];
  const institution = cleanInstitution(row[1]);
  const rawType = (row[2] || '').toString().trim();
  const amount = Number(row[3]) || 0;
  const rawBank = (row[4] || '').toString().trim();
  const rawPhone = row[5];
  const rawEndDate = row[6];

  const issue_date = excelDateToISO(rawDate);
  const end_date = excelDateToISO(rawEndDate);
  const letter_type = rawType.toUpperCase() === 'GEÇİCİ' ? 'GEÇİCİ' : (rawType.toUpperCase() === 'AVANS' ? 'AVANS' : 'KESİN');
  const bank_name = cleanBank(rawBank);
  const phone_number = cleanPhone(rawPhone);
  const indexStr = String(i - 1).padStart(4, '0');
  const id = `00000000-0000-4000-a000-${indexStr.padStart(12, '0')}`;

  records.push({
    id,
    organization_id: ORG_ID,
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

// 1. Generate SQL migration
let sql = `-- Migration: 202609260001_tender_guarantee_letters.sql
-- Create tender_guarantee_letters table and seed 29 rows from Excel

CREATE TABLE IF NOT EXISTS public.tender_guarantee_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    issue_date DATE,
    institution_name TEXT NOT NULL,
    letter_type TEXT NOT NULL CHECK (letter_type IN ('KESİN', 'GEÇİCİ', 'AVANS')),
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    bank_name TEXT NOT NULL,
    phone_number TEXT,
    end_date DATE,
    company_name TEXT,
    status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'iade_edildi', 'hukumsuz', 'kapandi')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_guarantee_letters_org ON public.tender_guarantee_letters(organization_id);
CREATE INDEX IF NOT EXISTS idx_tender_guarantee_letters_end_date ON public.tender_guarantee_letters(end_date);
CREATE INDEX IF NOT EXISTS idx_tender_guarantee_letters_status ON public.tender_guarantee_letters(status);
CREATE INDEX IF NOT EXISTS idx_tender_guarantee_letters_type ON public.tender_guarantee_letters(letter_type);

-- RLS configuration
ALTER TABLE public.tender_guarantee_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tender_guarantee_letters_select ON public.tender_guarantee_letters;
CREATE POLICY tender_guarantee_letters_select ON public.tender_guarantee_letters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS tender_guarantee_letters_insert ON public.tender_guarantee_letters;
CREATE POLICY tender_guarantee_letters_insert ON public.tender_guarantee_letters
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS tender_guarantee_letters_update ON public.tender_guarantee_letters;
CREATE POLICY tender_guarantee_letters_update ON public.tender_guarantee_letters
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tender_guarantee_letters_delete ON public.tender_guarantee_letters;
CREATE POLICY tender_guarantee_letters_delete ON public.tender_guarantee_letters
  FOR DELETE USING (true);

-- Seed 29 real guarantee letters
INSERT INTO public.tender_guarantee_letters (
    id, organization_id, issue_date, institution_name, letter_type, amount, bank_name, phone_number, end_date, company_name, status, notes
) VALUES
`;

const sqlValues = records.map(r => {
  const issueDateVal = r.issue_date ? `'${r.issue_date}'` : 'NULL';
  const endDateVal = r.end_date ? `'${r.end_date}'` : 'NULL';
  const phoneVal = r.phone_number ? `'${r.phone_number.replace(/'/g, "''")}'` : 'NULL';
  const instVal = `'${r.institution_name.replace(/'/g, "''")}'`;
  const bankVal = `'${r.bank_name.replace(/'/g, "''")}'`;
  const compVal = `'${r.company_name.replace(/'/g, "''")}'`;
  return `  ('${r.id}', '${r.organization_id}', ${issueDateVal}, ${instVal}, '${r.letter_type}', ${r.amount}, ${bankVal}, ${phoneVal}, ${endDateVal}, ${compVal}, '${r.status}', '')`;
}).join(',\n');

sql += sqlValues + '\nON CONFLICT (id) DO UPDATE SET\n' +
  '  amount = EXCLUDED.amount,\n' +
  '  end_date = EXCLUDED.end_date,\n' +
  '  updated_at = NOW();\n';

fs.writeFileSync('supabase/migrations/202609260001_tender_guarantee_letters.sql', sql, 'utf8');
console.log('Created supabase/migrations/202609260001_tender_guarantee_letters.sql');

// 2. Generate TypeScript seed data file
const tsContent = `// Auto-generated seed data for Guarantee Letters from Excel (Sayfa1 (2))
export interface GuaranteeLetter {
  id: string;
  organization_id: string;
  issue_date: string | null;
  institution_name: string;
  letter_type: 'KESİN' | 'GEÇİCİ' | 'AVANS';
  amount: number;
  bank_name: string;
  phone_number: string | null;
  end_date: string | null;
  company_name: string | null;
  status: 'aktif' | 'iade_edildi' | 'hukumsuz';
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export const INITIAL_GUARANTEE_LETTERS: GuaranteeLetter[] = ${JSON.stringify(records, null, 2)};
`;

fs.mkdirSync('src/features/tenders/data', { recursive: true });
fs.writeFileSync('src/features/tenders/data/seedGuaranteeLetters.ts', tsContent, 'utf8');
console.log('Created src/features/tenders/data/seedGuaranteeLetters.ts');
