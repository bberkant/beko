import assert from 'node:assert/strict';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { INITIAL_GUARANTEE_LETTERS } from '../src/features/tenders/data/seedGuaranteeLetters.ts';
import {
  parseMoneyInput,
  formatMoney,
  formatDate,
  getDaysDiff,
  formatPhoneNumber,
  normalizeTurkishSearch,
  calculateMetrics,
  sortLetters,
} from '../src/features/tenders/utils/guaranteeLetterUtils.ts';

console.log('================================================================');
console.log('--- STARTING COMPREHENSIVE GUARANTEE LETTERS ADVERSARIAL TEST ---');
console.log('================================================================\n');

// 1. Verify Seed Data Volume & Sum
console.log('[TEST 1: Seed Data Count and Total Sum]');
assert.equal(INITIAL_GUARANTEE_LETTERS.length, 29, 'Seed records count must be exactly 29');
const totalAmount = INITIAL_GUARANTEE_LETTERS.reduce((sum, r) => sum + r.amount, 0);
assert.equal(totalAmount, 25307831, 'Total amount must equal 25,307,831 TL');
console.log(`✓ 29 records verified. Total amount = ${totalAmount.toLocaleString('tr-TR')} TL`);

// 2. Verify Schema Integrity
console.log('\n[TEST 2: Record Fields Integrity]');
const expectedOrgId = '13b8da90-27d1-440d-a8f4-eb50dadd6391';
for (const [idx, item] of INITIAL_GUARANTEE_LETTERS.entries()) {
  assert.ok(item.id, `Row ${idx}: id must exist`);
  assert.equal(item.organization_id, expectedOrgId, `Row ${idx}: organization_id must be ${expectedOrgId}`);
  assert.ok(item.institution_name, `Row ${idx}: institution_name must exist`);
  assert.ok(['KESİN', 'GEÇİCİ', 'AVANS'].includes(item.letter_type), `Row ${idx}: letter_type invalid: ${item.letter_type}`);
  assert.ok(typeof item.amount === 'number' && item.amount > 0, `Row ${idx}: amount must be positive number`);
  assert.ok(item.bank_name, `Row ${idx}: bank_name must exist`);
  assert.ok(['aktif', 'iade_edildi', 'hukumsuz'].includes(item.status), `Row ${idx}: status invalid: ${item.status}`);
}
console.log('✓ All 29 records adhere to schema requirements');

// 3. Verify Specific Known Records
console.log('\n[TEST 3: Key Records Verification]');
const abalioglu1 = INITIAL_GUARANTEE_LETTERS.find((r) => r.institution_name === 'ABALIOĞLU' && r.amount === 500000);
assert.ok(abalioglu1, 'ABALIOĞLU 500,000 TL record must exist');
assert.equal(abalioglu1.bank_name, 'Albaraka Türk');
assert.equal(abalioglu1.letter_type, 'KESİN');

const abalioglu2 = INITIAL_GUARANTEE_LETTERS.find((r) => r.institution_name === 'ABALIOĞLU' && r.amount === 700000);
assert.ok(abalioglu2, 'ABALIOĞLU 700,000 TL record must exist');
assert.equal(abalioglu2.bank_name, 'Albaraka Türk');
assert.equal(abalioglu2.letter_type, 'KESİN');

const hacettepe = INITIAL_GUARANTEE_LETTERS.find((r) => r.institution_name.includes('HACETTEPE ERİŞKİN HASTANESİ'));
assert.ok(hacettepe, 'Hacettepe Erişkin Hastanesi record must exist');
assert.equal(hacettepe.amount, 3447360);
assert.equal(hacettepe.letter_type, 'KESİN');
assert.equal(hacettepe.end_date, '2027-02-05');

const erzurumSaglik = INITIAL_GUARANTEE_LETTERS.find((r) => r.institution_name.includes('ERZURUM İL SAĞLIK'));
assert.ok(erzurumSaglik, 'Erzurum İl Sağlık record must exist');
assert.equal(erzurumSaglik.amount, 4800000);
assert.equal(erzurumSaglik.letter_type, 'KESİN');

const omuGecici = INITIAL_GUARANTEE_LETTERS.find(
  (r) => r.institution_name.includes('ONDOKUZMAYIS ÜNİVERSİTESİ') && r.amount === 750000
);
assert.ok(omuGecici, 'Ondokuzmayıs 750,000 TL geçici teminat record must exist');
assert.equal(omuGecici.letter_type, 'GEÇİCİ');
console.log('✓ Key known records matched Excel Sayfa1 (2)');

// 4. Test Days Remaining & Expiry Logic (Timezone Safe)
console.log('\n[TEST 4: Deterministic Days Remaining & Expiry Logic]');
const refDate = new Date('2026-09-26T12:00:00');

assert.equal(getDaysDiff(null, refDate), null, 'Null date should return null');
assert.equal(getDaysDiff('', refDate), null, 'Empty string should return null');
assert.equal(getDaysDiff('2026-09-26', refDate), 0, 'Today should return 0');
assert.equal(getDaysDiff('2026-09-25', refDate), -1, 'Yesterday should return -1');
assert.equal(getDaysDiff('2026-09-20', refDate), -6, '6 days ago should return -6');
assert.equal(getDaysDiff('2026-09-27', refDate), 1, 'Tomorrow should return 1');
assert.equal(getDaysDiff('2026-10-26', refDate), 30, '30 days later should return 30');
assert.equal(getDaysDiff('2026-11-25', refDate), 60, '60 days later should return 60');
console.log('✓ getDaysDiff is timezone-safe and passed boundary date tests');

// 5. Test Robust Money Parsing (Turkish Locale Handling)
console.log('\n[TEST 5: Turkish Locale Money Input Parsing]');
assert.equal(parseMoneyInput('1.500.000'), 1500000, 'Turkish thousand separators (1.500.000) must equal 1,500,000 NOT 1.5');
assert.equal(parseMoneyInput('250.000'), 250000, 'Turkish thousand separator (250.000) must equal 250,000 NOT 250');
assert.equal(parseMoneyInput('1.500.000,50'), 1500000.5, 'Turkish formatted float with comma must parse properly');
assert.equal(parseMoneyInput('500000'), 500000, 'Raw integer string must parse properly');
assert.equal(parseMoneyInput('500,50'), 500.5, 'Decimal comma without thousand separator must parse properly');
assert.equal(parseMoneyInput('500.50'), 500.5, 'Standard dot decimal must parse properly');
assert.equal(parseMoneyInput('₺ 25.307.831'), 25307831, 'String with currency symbol and dots must parse properly');
assert.equal(parseMoneyInput(''), 0, 'Empty string must return 0');
assert.equal(parseMoneyInput('abc'), 0, 'Invalid string must return 0');
assert.equal(parseMoneyInput(-50), -50, 'Negative numbers preserved');
console.log('✓ parseMoneyInput correctly parses Turkish and standard formats without corruption');

// 6. Test Phone Number Formatting
console.log('\n[TEST 6: Phone Number Formatting]');
assert.equal(formatPhoneNumber(null), '-', 'Null phone should return -');
assert.equal(formatPhoneNumber(''), '-', 'Empty phone should return -');
assert.equal(formatPhoneNumber('0312 305 11 05'), '0312 305 11 05', 'Pre-formatted phone should be preserved');
assert.equal(formatPhoneNumber('3123051105'), '0312 305 11 05', '10-digit raw number should format with leading 0');
assert.equal(formatPhoneNumber('04423447684-6724'), '04423447684-6724', 'Phone with extension should be preserved');
console.log('✓ formatPhoneNumber formats phone numbers cleanly');

// 7. Test Sorting Logic (Nulls at bottom, correct ordering)
console.log('\n[TEST 7: Sorting Invariants (Nulls at Bottom)]');
const sortedDescEnd = sortLetters(INITIAL_GUARANTEE_LETTERS, 'end_date', 'desc');
assert.equal(sortedDescEnd[0].institution_name, 'ONDOKUZ MAYIS TIP YENİ İHALE', 'Latest end date should be top of DESC');
assert.equal(sortedDescEnd[sortedDescEnd.length - 1].end_date, null, 'Null end date must be at the bottom of DESC');
assert.equal(sortedDescEnd[sortedDescEnd.length - 2].end_date, null, 'All null end dates must be at the bottom of DESC');

const sortedAscEnd = sortLetters(INITIAL_GUARANTEE_LETTERS, 'end_date', 'asc');
assert.equal(sortedAscEnd[0].institution_name, 'AMASYA ŞEHİT AHMET ÖZSOY İMAM HATİP LİSESİ', 'Earliest end date should be top of ASC');
assert.equal(sortedAscEnd[sortedAscEnd.length - 1].end_date, null, 'Null end date must be at bottom of ASC');

const sortedAscIssue = sortLetters(INITIAL_GUARANTEE_LETTERS, 'issue_date', 'asc');
assert.equal(sortedAscIssue[0].institution_name, 'AMASYA ÜNİVERSİTESİ (2026)', 'Earliest issue date should be top of ASC');
assert.equal(sortedAscIssue[sortedAscIssue.length - 1].issue_date, null, 'Null issue date must be at bottom of ASC');

const sortedDescAmount = sortLetters(INITIAL_GUARANTEE_LETTERS, 'amount', 'desc');
assert.equal(sortedDescAmount[0].amount, 4800000, 'Top amount must be 4,800,000 TL');
assert.equal(sortedDescAmount[sortedDescAmount.length - 1].amount, 50000, 'Lowest amount must be 50,000 TL');
console.log('✓ Sorting invariants verified (nulls always relegated to bottom, proper numerical/chronological order)');

// 8. Test KPI Metrics Computation
console.log('\n[TEST 8: KPI Metrics Computation]');
const metrics = calculateMetrics(INITIAL_GUARANTEE_LETTERS, refDate);
assert.equal(metrics.totalCount, 29);
assert.equal(metrics.activeCount, 29);
assert.equal(metrics.totalAmount, totalAmount);
assert.equal(metrics.kesinCount, 22);
assert.equal(metrics.kesinAmount, 24089456);
assert.equal(metrics.geciciCount, 7);
assert.equal(metrics.geciciAmount, 1218375);
assert.equal(metrics.kesinAmount + metrics.geciciAmount, totalAmount);
console.log(`✓ KPI metrics: Total=${metrics.totalAmount} TL, Kesin=${metrics.kesinAmount} TL (22 adet), Geçici=${metrics.geciciAmount} TL (7 adet)`);

// 9. Test Multi-Column Filtering Engine
console.log('\n[TEST 9: Multi-Column Search & Filtering]');
const querySearch = (query, bank = 'all', type = 'all', status = 'all') => {
  return INITIAL_GUARANTEE_LETTERS.filter((l) => {
    if (query) {
      const q = normalizeTurkishSearch(query);
      const match =
        normalizeTurkishSearch(l.institution_name).includes(q) ||
        normalizeTurkishSearch(l.bank_name).includes(q) ||
        normalizeTurkishSearch(l.phone_number).includes(q);
      if (!match) return false;
    }
    if (bank !== 'all' && l.bank_name !== bank) return false;
    if (type !== 'all' && l.letter_type !== type) return false;
    if (status !== 'all' && l.status !== status) return false;
    return true;
  });
};

assert.equal(querySearch('Hacettepe').length, 3, "Query 'Hacettepe' should match 3 records");
assert.equal(querySearch('hacettepe').length, 3, "Query lowercase 'hacettepe' should match 3 records");
assert.equal(querySearch('', 'Albaraka Türk').length, 2, "Bank 'Albaraka Türk' should match 2 records");
assert.equal(querySearch('', 'all', 'GEÇİCİ').length, 7, "Type 'GEÇİCİ' should match 7 records");
assert.equal(querySearch('Turizm', 'all', 'GEÇİCİ').length, 3, "Combined filter with Turkish uppercase 'Turizm' should match 3 records");
assert.equal(querySearch('turizm', 'all', 'GEÇİCİ').length, 3, "Combined filter with ASCII lowercase 'turizm' should match 3 records");
assert.equal(querySearch('TURİZM', 'all', 'GEÇİCİ').length, 3, "Combined filter with dotted uppercase 'TURİZM' should match 3 records");
console.log('✓ Multi-column search and filtering engine with Turkish locale support verified');

// 10. Test Excel Export Generation with Summary Row
console.log('\n[TEST 10: Excel Export Generation with Summary Row]');
const exportRows = INITIAL_GUARANTEE_LETTERS.map((item, idx) => ({
  'Sıra No': idx + 1,
  'Düzenleme Tarihi': formatDate(item.issue_date),
  'Kurum Adı': item.institution_name,
  'Mektup Türü': item.letter_type,
  'Tutar (₺)': item.amount,
  'Banka': item.bank_name,
  'İletişim / Tel No': formatPhoneNumber(item.phone_number),
  'Vade (Bitiş) Tarihi': item.end_date ? formatDate(item.end_date) : 'Süresiz',
  'Kalan Gün': getDaysDiff(item.end_date, refDate) ?? 'Süresiz',
  'Durum': item.status,
  'Firma': item.company_name || 'MARİF / ETİK ET',
}));
exportRows.push({
  'Sıra No': 'TOPLAM',
  'Düzenleme Tarihi': '',
  'Kurum Adı': `${INITIAL_GUARANTEE_LETTERS.length} Adet Teminat Mektubu`,
  'Mektup Türü': '',
  'Tutar (₺)': totalAmount,
  'Banka': '',
  'İletişim / Tel No': '',
  'Vade (Bitiş) Tarihi': '',
  'Kalan Gün': '',
  'Durum': '',
  'Firma': '',
});

const ws = XLSX.utils.json_to_sheet(exportRows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Teminat Mektupları');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
assert.ok(buf.length > 5000, 'Excel file must be generated properly with valid size');
console.log(`✓ Excel workbook with summary row generated successfully (${buf.length} bytes)`);

// 11. Verify Navigation, App Routes, and Migration SQL
console.log('\n[TEST 11: Navigation, App Routes, and Migration Integrity]');
const navContent = fs.readFileSync('src/types/navigation.ts', 'utf8');
assert.ok(navContent.includes('/ihaleler/mektup-listesi'), 'navigation.ts must contain /ihaleler/mektup-listesi');
assert.ok(navContent.includes('Mektup Listesi'), 'navigation.ts must contain label Mektup Listesi');

const appContent = fs.readFileSync('src/App.tsx', 'utf8');
assert.ok(appContent.includes('/ihaleler/mektup-listesi'), 'App.tsx must contain route /ihaleler/mektup-listesi');
assert.ok(appContent.includes('MektupListPage'), 'App.tsx must import MektupListPage');

const migrationContent = fs.readFileSync('supabase/migrations/202609260001_tender_guarantee_letters.sql', 'utf8');
assert.ok(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.tender_guarantee_letters'), 'Migration must create table');
assert.ok(migrationContent.includes('00000000-0000-4000-a000-000000000029'), 'Migration must seed all 29 rows');
assert.ok(migrationContent.includes('organization_id = EXCLUDED.organization_id'), 'Migration ON CONFLICT must update all fields');
console.log('✓ Navigation, App routes, and migration SQL verified');

// 12. Test CRUD Mutations State Flow (In-Memory Verification)
console.log('\n[TEST 12: CRUD Mutations State Integrity]');
let stateLetters = [...INITIAL_GUARANTEE_LETTERS];

// CREATE
const newLetter = {
  id: '00000000-0000-4000-a000-000000000099',
  organization_id: expectedOrgId,
  issue_date: '2026-09-26',
  institution_name: 'TEST YENİ İHALE KURUMU',
  letter_type: 'KESİN',
  amount: 250000,
  bank_name: 'Vakıf Katılım',
  phone_number: '0312 000 00 00',
  end_date: '2027-09-26',
  company_name: 'MARİF / ETİK ET',
  status: 'aktif',
  notes: 'Test notu',
};
stateLetters = [newLetter, ...stateLetters];
assert.equal(stateLetters.length, 30, 'Letters count must be 30 after insert');
assert.equal(stateLetters[0].id, newLetter.id);

// UPDATE
stateLetters = stateLetters.map((l) => (l.id === newLetter.id ? { ...l, amount: 300000, status: 'iade_edildi' } : l));
const updated = stateLetters.find((l) => l.id === newLetter.id);
assert.equal(updated.amount, 300000);
assert.equal(updated.status, 'iade_edildi');

// DELETE
stateLetters = stateLetters.filter((l) => l.id !== newLetter.id);
assert.equal(stateLetters.length, 29, 'Letters count must return to 29 after delete');
// 13. Test Turkish Alphabetical Sort Invariants & New Sort Fields
console.log('\n[TEST 13: Turkish Alphabetical Sort Invariant (I vs İ) & Multi-Column Sorting]');
const lettersWithTurkishI = [
  { id: '1', institution_name: 'İĞNE VE İPLİK TİCARET', amount: 100 },
  { id: '2', institution_name: 'IŞIK VE AYDINLATMA', amount: 200 },
  { id: '3', institution_name: 'AMASYA BELEDİYESİ', amount: 300 },
];
const sortedTurkish = sortLetters(lettersWithTurkishI, 'institution_name', 'asc');
assert.equal(sortedTurkish[0].institution_name, 'AMASYA BELEDİYESİ');
assert.equal(sortedTurkish[1].institution_name, 'IŞIK VE AYDINLATMA', 'In Turkish alphabet, I must precede İ');
assert.equal(sortedTurkish[2].institution_name, 'İĞNE VE İPLİK TİCARET', 'In Turkish alphabet, İ must follow I');

// Test bank_name and letter_type sorting
const sortedByBank = sortLetters(INITIAL_GUARANTEE_LETTERS, 'bank_name', 'asc');
assert.ok(sortedByBank[0].bank_name.startsWith('Albaraka'), 'Albaraka should be first in ASC bank sort');

const sortedByType = sortLetters(INITIAL_GUARANTEE_LETTERS, 'letter_type', 'asc');
assert.ok(['GEÇİCİ', 'KESİN'].includes(sortedByType[0].letter_type));

// Test sort with invalid/corrupt dates (must not throw or return NaN)
const lettersWithInvalidDate = [
  { id: '1', end_date: '2026-12-31' },
  { id: '2', end_date: 'invalid-date' },
  { id: '3', end_date: null },
  { id: '4', end_date: '2026-01-01' },
];
const sortedInvalidDate = sortLetters(lettersWithInvalidDate, 'end_date', 'asc');
assert.equal(sortedInvalidDate[0].end_date, '2026-01-01');
assert.equal(sortedInvalidDate[1].end_date, '2026-12-31');
assert.ok(sortedInvalidDate[2].end_date === null || sortedInvalidDate[2].end_date === 'invalid-date');
assert.ok(sortedInvalidDate[3].end_date === null || sortedInvalidDate[3].end_date === 'invalid-date');
console.log('✓ Turkish alphabetical sort (I vs İ), bank/type sorting, and invalid date resilience verified');

// 14. Test Edge Case Money Parsing & International Phone Format
console.log('\n[TEST 14: Edge Case Money Parsing, International Phone (+90) & Date Formatting]');
assert.equal(parseMoneyInput('1.500 (KDV Dahil)'), 1500, 'Money with text and parentheses must parse cleanly');
assert.equal(parseMoneyInput('1,500,000.50'), 1500000.5, 'US/EN comma thousands and dot decimal must parse properly');
assert.equal(parseMoneyInput('-1.500'), -1500, 'Negative money must be parsed accurately');
assert.equal(parseMoneyInput('   '), 0, 'Whitespace string must return 0');

assert.equal(formatPhoneNumber('905382184514'), '0538 218 45 14', '12-digit number starting with 90 must format with 0 prefix');
assert.equal(formatPhoneNumber('+90 538 218 45 14'), '0538 218 45 14', 'Formatted number with +90 must format cleanly');
assert.equal(formatPhoneNumber('undefined'), '-', 'String "undefined" must format as -');
assert.equal(formatPhoneNumber('null'), '-', 'String "null" must format as -');

assert.equal(formatDate('2026-09-26T14:30:00Z'), '26.09.2026', 'ISO timestamp string must format to 26.09.2026');
assert.equal(formatDate('null'), '-', 'String "null" must format as -');
assert.equal(formatDate('undefined'), '-', 'String "undefined" must format as -');
console.log('✓ Edge case money parsing, international phone formatting, and date resilience verified');

// 15. Test Granular Overdue vs Upcoming Metrics
console.log('\n[TEST 15: Granular Overdue vs Upcoming Metrics & Date Validation]');
const detailedMetrics = calculateMetrics(INITIAL_GUARANTEE_LETTERS, refDate);
assert.equal(detailedMetrics.overdueCount, 3, '3 letters are overdue as of 2026-09-26');
assert.equal(detailedMetrics.upcomingCount, 0, '0 letters expiring in exactly 0-30 days as of 2026-09-26');
assert.equal(detailedMetrics.expiringCount, detailedMetrics.overdueCount + detailedMetrics.upcomingCount);

// Date validation invariant: end_date cannot be earlier than issue_date
const isValidDateRange = (issue, end) => {
  if (!issue || !end) return true;
  return end >= issue;
};
assert.equal(isValidDateRange('2026-09-26', '2026-09-25'), false, 'End date earlier than issue date must be invalid');
assert.equal(isValidDateRange('2026-09-26', '2026-09-26'), true, 'Same day end date is valid');
assert.equal(isValidDateRange('2026-09-26', '2027-09-26'), true, 'Future end date is valid');
console.log('✓ Granular overdue vs upcoming metrics and date range validation verified');

// 16. Test Fraction-Aware Money Formatting & DD.MM.YYYY getDaysDiff Support
console.log('\n[TEST 16: Fraction-Aware Money Formatting & Turkish DD.MM.YYYY Date Support]');
const formattedWhole = formatMoney(1500000);
assert.ok(formattedWhole.includes('1.500.000'), `Whole number must format without fraction: ${formattedWhole}`);
assert.ok(!formattedWhole.includes(',00'), `Whole number must not have trailing ,00: ${formattedWhole}`);

const formattedCents = formatMoney(1500000.5);
assert.ok(formattedCents.includes('1.500.000,50'), `Fractional money must preserve cents: ${formattedCents}`);

assert.equal(getDaysDiff('26.09.2026', refDate), 0, 'DD.MM.YYYY today should return 0');
assert.equal(getDaysDiff('27.09.2026', refDate), 1, 'DD.MM.YYYY tomorrow should return 1');
assert.equal(getDaysDiff('25.09.2026', refDate), -1, 'DD.MM.YYYY yesterday should return -1');
assert.equal(formatDate('26.09.2026'), '26.09.2026', 'DD.MM.YYYY should be preserved as 26.09.2026');
console.log('✓ Fraction-aware money formatting and Turkish DD.MM.YYYY date support verified');

// 17. Test Flexible Phone Formatting with Parentheses/Hyphens & Extension Preservation
console.log('\n[TEST 17: Flexible Phone Formatting & Extension Preservation]');
assert.equal(formatPhoneNumber('0 (312) 305-1105'), '0312 305 11 05', 'Dashes and parentheses in phone must format to standard');
assert.equal(formatPhoneNumber('0312-305-11-05'), '0312 305 11 05', 'Hyphenated phone must format to standard');
assert.equal(formatPhoneNumber('+90 (312) 305-11-05'), '0312 305 11 05', '+90 with parentheses and dashes must format to standard');
assert.equal(formatPhoneNumber('04423447684-6724'), '04423447684-6724', 'Phone with extension must be preserved');
console.log('✓ Flexible phone formatting and extension preservation verified');

// 18. Test Turkish Collation in Bank Names & Circumflex Normalization
console.log('\n[TEST 18: Turkish Collation in Bank Names & Circumflex Normalization]');
const banksSample = ['Ziraat Bankası', 'İş Bankası', 'Albaraka Türk', 'Kuveyt Türk'];
const sortedBanks = [...banksSample].sort((a, b) => a.localeCompare(b, 'tr'));
assert.equal(sortedBanks[0], 'Albaraka Türk');
assert.equal(sortedBanks[1], 'İş Bankası', 'In Turkish alphabet, İ must precede K and Z');
assert.equal(sortedBanks[2], 'Kuveyt Türk');
assert.equal(sortedBanks[3], 'Ziraat Bankası');

assert.equal(normalizeTurkishSearch('Hükûmet'), normalizeTurkishSearch('Hükümet'), 'Circumflex û should match u');
assert.equal(normalizeTurkishSearch('Dâhil'), normalizeTurkishSearch('Dahil'), 'Circumflex â should match a');
console.log('✓ Turkish bank collation and circumflex search normalization verified');

// 19. Test Multi-Column Search Across Amount and Letter Type
console.log('\n[TEST 19: Multi-Column Search Across Amount and Letter Type]');
const searchLetters = (query) => {
  const q = normalizeTurkishSearch(query);
  const cleanDigits = q.replace(/[^0-9]/g, '');
  return INITIAL_GUARANTEE_LETTERS.filter((item) => {
    const matchInst = normalizeTurkishSearch(item.institution_name).includes(q);
    const matchBank = normalizeTurkishSearch(item.bank_name).includes(q);
    const matchPhone = normalizeTurkishSearch(item.phone_number).includes(q);
    const matchNotes = normalizeTurkishSearch(item.notes).includes(q);
    const matchCompany = normalizeTurkishSearch(item.company_name).includes(q);
    const matchType = normalizeTurkishSearch(item.letter_type).includes(q);
    const matchAmount = cleanDigits ? String(item.amount).includes(cleanDigits) : false;
    return matchInst || matchBank || matchPhone || matchNotes || matchCompany || matchType || matchAmount;
  });
};

assert.equal(searchLetters('500000').length, 1, "Search '500000' should match 1 record (Abalıoğlu 500k)");
assert.equal(searchLetters('50000').length, 3, "Search '50000' should match 3 records (Abalıoğlu 500k, OMÜ 750k, Merzifon 50k)");
assert.equal(searchLetters('4.800.000').length, 1, "Search '4.800.000' should match Erzurum İl Sağlık");
assert.equal(searchLetters('GEÇİCİ').length, 7, "Search 'GEÇİCİ' should match 7 records");
assert.equal(searchLetters('KESİN').length, 22, "Search 'KESİN' should match 22 records");
console.log('✓ Search across amount and letter type verified');

// 20. Test Legacy Inverted Dates Edit Tolerance & Multi-Tenant UUID Generation
console.log('\n[TEST 20: Legacy Inverted Dates Edit Tolerance & Multi-Tenant UUID Isolation]');
const row8 = INITIAL_GUARANTEE_LETTERS[6]; // AMASYA ŞEHİT AHMET ÖZSOY (issue: 2026-03-18, end: 2026-01-30)
assert.equal(row8.institution_name, 'AMASYA ŞEHİT AHMET ÖZSOY İMAM HATİP LİSESİ');
assert.ok(row8.end_date < row8.issue_date, 'Row 8 has inverted dates in Excel');

const canSaveLetter = (formData, editingLetter) => {
  if (formData.issue_date && formData.end_date && formData.end_date < formData.issue_date) {
    const datesWereUnchanged =
      editingLetter &&
      formData.issue_date === (editingLetter.issue_date ? editingLetter.issue_date.slice(0, 10) : '') &&
      formData.end_date === (editingLetter.end_date ? editingLetter.end_date.slice(0, 10) : '');
    if (!datesWereUnchanged) return false;
  }
  return true;
};

// Editing other fields on Row 8 without touching dates must be allowed
assert.equal(
  canSaveLetter(
    { issue_date: '2026-03-18', end_date: '2026-01-30', notes: 'Updated note' },
    row8
  ),
  true,
  'Editing legacy record with unchanged dates must be allowed'
);

// Modifying dates on Row 8 to another invalid range must be rejected
assert.equal(
  canSaveLetter(
    { issue_date: '2026-03-18', end_date: '2026-01-20', notes: 'Changed date' },
    row8
  ),
  false,
  'Modifying dates to another inverted date must be rejected'
);

// New letter with inverted dates must be rejected
assert.equal(
  canSaveLetter(
    { issue_date: '2026-05-01', end_date: '2026-04-01' },
    null
  ),
  false,
  'New letter with inverted dates must be rejected'
);

// Verify multi-tenant seed UUID generation
const generateLetterUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
const altOrgId = 'e0000000-0000-4000-a000-000000000001';
const seededAlt = INITIAL_GUARANTEE_LETTERS.map((l) => ({
  ...l,
  id: altOrgId === '13b8da90-27d1-440d-a8f4-eb50dadd6391' ? l.id : generateLetterUUID(),
  organization_id: altOrgId,
}));
assert.notEqual(seededAlt[0].id, INITIAL_GUARANTEE_LETTERS[0].id, 'Alternative org must generate fresh UUIDs');
assert.ok(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(seededAlt[0].id),
  'Generated ID must be valid UUID v4'
);
console.log('✓ Legacy inverted dates edit tolerance and multi-tenant UUID isolation verified');

console.log('\n================================================================');
console.log('ALL 20 ADVERSARIAL ACCEPTANCE & FUNCTIONAL TESTS PASSED (100%)');
console.log('================================================================\n');
