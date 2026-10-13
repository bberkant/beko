import assert from 'node:assert/strict';
import {
  isCheckPaid,
  formatDateForDB,
  isCektenCheck,
  aggregateCektenBalances,
  createCektenPaymentPayload
} from '../src/features/checks/utils/cektenTakasSync.ts';

const getCleanBankName = (debtor, bankName) => {
  const d = (debtor || '').toUpperCase();
  const b = (bankName || '').toUpperCase();
  if (d.includes('AKBANK') || b.includes('AKBANK')) return 'E.AKBANK';
  if (d.includes('DENİZ') || b.includes('DENİZ')) return 'E.DENİZ';
  if (d.includes('ZİRAAT') || b.includes('ZİRAAT')) return 'E.ZİRAAT';
  if (d.includes('ALBARAKA') || b.includes('ALBARAKA')) return 'ALBARAKA';
  return null;
};

console.log('================================================================');
console.log('--- STARTING ÇEKTEN HESABI -> TAKAS ÇEKLERİ INTEGRATION TESTS ---');
console.log('================================================================\n');

// -------------------------------------------------------------
// Helper simulations matching ChecksPage.tsx implementation
// -------------------------------------------------------------

function simulateCektenAggregation(cektenRows, existingChecks) {
  let allData = [...existingChecks];
  const supplierGroups = aggregateCektenBalances(cektenRows);
  const todayStr = '2026-10-13';

  // ebs_checks içindeki "TAKASTA OLMAYAN" Çekten kayıtlarını kontrol et:
  // Eğer cekten_hesabi'nda bakiyesi 0 TL olmuşsa veya açık bakiye kalmamışsa, allData'dan temizle
  allData = allData.filter(c => {
    if (isCheckPaid(c.status)) return true;
    if (!isCektenCheck(c)) return true;
    if (!c.ozel_alan?.includes('TAKASTA OLMAYAN')) return true;

    const cCreditor = (c.creditor || '').trim().toLocaleUpperCase('tr-TR');
    const summary = supplierGroups.get(cCreditor);
    if (!summary || Math.abs(summary.netBalance) < 0.01) {
      return false;
    }
    return true;
  });

  supplierGroups.forEach(({ supplier, netBalance }) => {
    // 0 TL olanlar dahil edilmez
    if (Math.abs(netBalance) < 0.01) return;

    const supplierUpper = supplier.toLocaleUpperCase('tr-TR');
    const existingCheck = allData.find(c => {
      if (isCheckPaid(c.status)) return false;
      const cCreditor = (c.creditor || '').trim().toLocaleUpperCase('tr-TR');
      if (cCreditor !== supplierUpper) return false;
      return isCektenCheck(c);
    });

    if (existingCheck) {
      if (existingCheck.ozel_alan?.includes('TAKASTA OLMAYAN')) {
        existingCheck.amount = Math.abs(netBalance);
      }
    } else {
      const dynamicCheck = {
        id: `cekten_${encodeURIComponent(supplierUpper)}`,
        local_id: 0,
        check_type: 'kesilen',
        document_type: 'cek',
        issue_date: todayStr,
        due_date: todayStr,
        amount: Math.abs(netBalance),
        para_birimi: 'TRY',
        check_no: null,
        creditor: supplier,
        debtor: 'ÇEKTEN HESABI',
        bank_name: 'ÇEKTEN HESABI',
        bank_branch: null,
        status: 'Tahsilde',
        ozel_alan: 'TAKASTA OLMAYAN - ÇEKTEN HESABI',
        kesideci: null,
        keside_yeri: null,
        tahsildar_banka: null,
        ciro_edilen: null,
        created_at: new Date().toISOString()
      };
      allData.push(dynamicCheck);
    }
  });

  return allData;
}

function simulateDashboardClassification(checks, targetDateStr = '2026-10-13') {
  const nonTakasKeywords = ['HATIR', 'KRŞ', 'KARŞILIK', 'TAZMİNAT', 'BORÇ', 'ÖMER DEMİR', 'BURAK BESİCİLİK', 'ALİ ARAN', 'TAKASTA OLMAYAN'];

  const activeUnpaid = checks.filter(c => {
    if (c.check_type !== 'kesilen') return false;
    const status = (c.status || '').toLowerCase();
    if (isCheckPaid(c.status) || !['tahsilde', 'beklemede', 'ödenmedi'].includes(status)) {
      return false;
    }
    const due = (c.due_date || '').substring(0, 10);
    const isForced = (c.ozel_alan || '').trim().toUpperCase().startsWith('TAKASTA');
    const isManualOrTaksit = c.debtor === 'TAKSİT' || !c.check_no;
    const dateMatch = due === targetDateStr;

    return dateMatch || isForced || (isManualOrTaksit && due <= targetDateStr);
  });

  const isNonTakasCheck = (c) => {
    const note = (c.ozel_alan || '').toUpperCase();
    if (note.includes('TAKASTA OLMAYAN')) {
      return true;
    }
    if (note.includes('TAKASTA') && !note.includes('TAKASTA OLMAYAN')) {
      return false;
    }
    if (isCektenCheck(c)) {
      return true;
    }
    const column = getCleanBankName(c.debtor, c.bank_name);
    if (c.check_type === 'kesilen' && column !== null) {
      return false;
    }
    const matchesKeyword = nonTakasKeywords.some(keyword =>
      (c.creditor || '').toUpperCase().includes(keyword) ||
      (c.debtor || '').toUpperCase().includes(keyword) ||
      note.includes(keyword)
    );
    return matchesKeyword || !column;
  };

  const takasCandidates = [];
  const nonTakasChecks = [];

  activeUnpaid.forEach(c => {
    if (isNonTakasCheck(c)) {
      nonTakasChecks.push(c);
    } else {
      takasCandidates.push(c);
    }
  });

  const taksitChecks = [];
  const candidateBanks = {};

  takasCandidates.forEach(c => {
    const bankName = getCleanBankName(c.debtor, c.bank_name);
    const note = (c.ozel_alan || '').toUpperCase();
    const isExplicitTakasta = note.includes('TAKASTA') && !note.includes('TAKASTA OLMAYAN');
    const shouldGoToTaksit = bankName === 'TAKSİT' || (!bankName && isExplicitTakasta) || (isCektenCheck(c) && isExplicitTakasta);

    if (shouldGoToTaksit) {
      taksitChecks.push(c);
    } else if (bankName) {
      if (!candidateBanks[bankName]) candidateBanks[bankName] = [];
      candidateBanks[bankName].push(c);
    } else {
      nonTakasChecks.push(c);
    }
  });

  const taksitTotal = taksitChecks.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const nonTakasTotal = nonTakasChecks.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const takasGrandTotal = taksitTotal; // assuming only taksit in this test scope

  return {
    taksitChecks,
    nonTakasChecks,
    taksitTotal,
    nonTakasTotal,
    takasGrandTotal,
    genelToplam: takasGrandTotal + nonTakasTotal
  };
}

// -------------------------------------------------------------
// TEST 1: R1. Çekten Hesabı Açık Bakiyelerinin Listelenmesi
// -------------------------------------------------------------
console.log('[TEST 1: R1 - Çekten Hesabı Açık Bakiyelerinin Listelenmesi]');

const mockCektenRows = [
  // Supplier A: Open debt of 100,000 TL
  { id: '1', organization_id: 'org1', date: '2026-10-01', supplier: 'BURAK BESİCİLİK', total_amount: 100000, paid_amount: 0, remaining_amount: 100000 },
  // Supplier B: Partially paid, remaining 35,000 TL
  { id: '2', organization_id: 'org1', date: '2026-10-02', supplier: 'ALİ ARAN', total_amount: 50000, paid_amount: 0, remaining_amount: 50000 },
  { id: '3', organization_id: 'org1', date: '2026-10-05', supplier: 'ALİ ARAN', total_amount: 0, paid_amount: 15000, remaining_amount: -15000 },
  // Supplier C: Fully paid (remaining == 0 TL)
  { id: '4', organization_id: 'org1', date: '2026-10-03', supplier: 'KAPALI CARİ', total_amount: 40000, paid_amount: 40000, remaining_amount: 0 },
  // Supplier D: Overpaid / alacak (-20,000 TL)
  { id: '5', organization_id: 'org1', date: '2026-10-04', supplier: 'ALACAKLI CARİ', total_amount: 0, paid_amount: 20000, remaining_amount: -20000 }
];

const integratedChecks = simulateCektenAggregation(mockCektenRows, []);

// Verify KAPALI CARİ is excluded (0 TL)
assert.equal(
  integratedChecks.some(c => c.creditor === 'KAPALI CARİ'),
  false,
  'KAPALI CARİ (0 TL bakiye) listeye dahil edilmemeli'
);
console.log('✓ 0 TL bakiyeli cariler listeye dahil edilmedi');

// Verify BURAK BESİCİLİK exists with 100,000 TL
const burakCheck = integratedChecks.find(c => c.creditor === 'BURAK BESİCİLİK');
assert.ok(burakCheck, 'BURAK BESİCİLİK kaydı oluşturulmalı');
assert.equal(burakCheck.amount, 100000, 'BURAK BESİCİLİK tutarı 100.000 TL olmalı');
assert.equal(burakCheck.debtor, 'ÇEKTEN HESABI', 'Banka alanı ÇEKTEN HESABI olmalı');
assert.equal(burakCheck.bank_name, 'ÇEKTEN HESABI');
assert.ok(burakCheck.ozel_alan.includes('TAKASTA OLMAYAN'), 'Özel alan TAKASTA OLMAYAN içermeli');
console.log('✓ BURAK BESİCİLİK 100.000 TL ile doğru alanlarla listelendi');

// Verify ALİ ARAN net balance is 35,000 TL
const aliCheck = integratedChecks.find(c => c.creditor === 'ALİ ARAN');
assert.ok(aliCheck, 'ALİ ARAN kaydı oluşturulmalı');
assert.equal(aliCheck.amount, 35000, 'ALİ ARAN net bakiyesi 50.000 - 15.000 = 35.000 TL olmalı');
console.log('✓ ALİ ARAN net tutarı (35.000 TL) doğru hesaplandı');

// Verify ALACAKLI CARİ has Math.abs(-20000) = 20000 TL
const alacakliCheck = integratedChecks.find(c => c.creditor === 'ALACAKLI CARİ');
assert.ok(alacakliCheck, 'ALACAKLI CARİ kaydı oluşturulmalı');
assert.equal(alacakliCheck.amount, 20000, 'ALACAKLI CARİ tutarı pozitif net 20.000 TL olmalı');
console.log('✓ ALACAKLI CARİ net tutarı (20.000 TL) doğru hesaplandı');

// Dashboard classification test
const dashboard1 = simulateDashboardClassification(integratedChecks);
assert.equal(dashboard1.taksitChecks.length, 0, 'Henüz takasa taşınmadığı için TAKSİT sütununda olmamalı');
assert.equal(dashboard1.nonTakasChecks.length, 3, 'Takasta Olmayan Çekler listesinde 3 cari olmalı');
assert.equal(dashboard1.nonTakasTotal, 155000, 'Takasta Olmayan Toplamı 100k + 35k + 20k = 155.000 TL olmalı');
assert.equal(dashboard1.genelToplam, 155000, 'Genel Toplam 155.000 TL olmalı');
console.log('✓ Dashboard Takasta Olmayan Çekler ve Toplamları doğrulandı (155.000 TL)');

// -------------------------------------------------------------
// TEST 2: R2. "Takasa Taşı" ve TAKSİT Sütununa Aktarım
// -------------------------------------------------------------
console.log('\n[TEST 2: R2 - Takasa Taşı ve TAKSİT Sütununa Aktarım]');

// User transfers BURAK BESİCİLİK to Takas
burakCheck.ozel_alan = 'TAKASTA - ÇEKTEN HESABI';
const dashboard2 = simulateDashboardClassification(integratedChecks);

assert.equal(dashboard2.taksitChecks.length, 1, 'TAKSİT sütununa 1 kayıt aktarılmış olmalı');
assert.equal(dashboard2.taksitChecks[0].creditor, 'BURAK BESİCİLİK', 'TAKSİT sütunundaki cari BURAK BESİCİLİK olmalı');
assert.equal(dashboard2.taksitTotal, 100000, 'TAKSİT toplamı 100.000 TL olmalı');
assert.equal(dashboard2.takasGrandTotal, 100000, 'Takas Toplamı 100.000 TL olmalı');
assert.equal(dashboard2.nonTakasChecks.length, 2, 'Takasta Olmayan tablosundan çıkarılmış olmalı');
assert.equal(dashboard2.nonTakasTotal, 55000, 'Takasta Olmayan Toplamı 35k + 20k = 55.000 TL olmalı');
assert.equal(dashboard2.genelToplam, 155000, 'Genel Toplam 155.000 TL olarak korunmalı');
console.log('✓ "Takasa Taşı" seçilince TAKSİT sütununa eklendi, Takas ve Genel Toplamlara doğru yansıdı');

// -------------------------------------------------------------
// TEST 3: R3. Ödendiğinde Çekten Hesabına Otomatik Ödeme Kaydı
// -------------------------------------------------------------
console.log('\n[TEST 3: R3 - Ödendiğinde Çekten Hesabına Otomatik Ödeme Kaydı]');

// Mark BURAK BESİCİLİK as Ödendi
burakCheck.status = 'Ödendi';

// Simulate payment generation
const targetDateStr = '2026-10-13';
const paymentAmount = Number(burakCheck.amount);
const paymentPayload = createCektenPaymentPayload('org1', burakCheck.creditor || '', paymentAmount, targetDateStr);

assert.equal(paymentPayload.supplier, 'BURAK BESİCİLİK');
assert.equal(paymentPayload.paid_amount, 100000);
assert.equal(paymentPayload.remaining_amount, -100000);
assert.equal(paymentPayload.payment_date, '13.10.2026');
console.log('✓ Otomatik ödeme hareketi payload bilgileri doğrulandı');

// Insert payment into mock Cekten rows
mockCektenRows.push({
  id: '6',
  ...paymentPayload
});

// Re-aggregate Cekten Hesabi
const updatedChecksAfterPayment = simulateCektenAggregation(mockCektenRows, [burakCheck]);

// Verify BURAK BESİCİLİK balance is now 0 TL in Cekten Hesabi
const burakTotalRemaining = mockCektenRows
  .filter(r => r.supplier === 'BURAK BESİCİLİK')
  .reduce((acc, r) => acc + r.remaining_amount, 0);

assert.equal(burakTotalRemaining, 0, 'BURAK BESİCİLİK kalan bakiyesi 0 TL olmalı (tamamen kapandı)');
console.log('✓ Çekten Hesabında cari bakiyesi otomatik kapatıldı (0 TL)');

// Check dashboard after payment
const dashboard3 = simulateDashboardClassification(updatedChecksAfterPayment);
assert.equal(
  dashboard3.nonTakasChecks.some(c => c.creditor === 'BURAK BESİCİLİK'),
  false,
  'Bakiyesi kapandığı için Takasta Olmayan tablosuna geri gelmemeli'
);
assert.equal(
  dashboard3.taksitChecks.some(c => c.creditor === 'BURAK BESİCİLİK'),
  false,
  'Ödendiği için aktif Takas tablosunda yer almamalı'
);
console.log('✓ Ödenen çek Takas ekranından ve Takasta Olmayan listesinden başarıyla temizlendi');

// -------------------------------------------------------------
// TEST 4: R4. Kalıcılık, Tarih Değişimi ve Çift Yönlü Tutarlılık
// -------------------------------------------------------------
console.log('\n[TEST 4: R4 - Kalıcılık ve Çift Yönlü Tutarlılık]');

// User transfers ALİ ARAN to Takas
aliCheck.ozel_alan = 'TAKASTA - ÇEKTEN HESABI';

// 4.1 Page reload simulation (re-running simulateCektenAggregation with existing ebs_checks row)
const reloadedChecks = simulateCektenAggregation(mockCektenRows, [aliCheck]);
const aliCheckInstances = reloadedChecks.filter(c => c.creditor === 'ALİ ARAN');
assert.equal(aliCheckInstances.length, 1, 'Sayfa yenilendiğinde mükerrer aktarım olmamalı (tam 1 adet)');
console.log('✓ Sayfa yenilendiğinde mükerrer kayıt oluşmadığı doğrulandı');

// 4.2 Date change simulation (target date changed to next month 2026-11-20)
const dashboardFutureDate = simulateDashboardClassification(reloadedChecks, '2026-11-20');
assert.equal(
  dashboardFutureDate.taksitChecks.some(c => c.creditor === 'ALİ ARAN'),
  true,
  'Tarih değiştirildiğinde takasa alınmış Çekten carisi TAKSİT sütununda korunmalı'
);
console.log('✓ Tarih değiştirildiğinde takasa alınmış cari TAKSİT sütununda korundu');

// 4.3 Move back to "Takasta Değil"
aliCheck.ozel_alan = 'TAKASTA OLMAYAN - ÇEKTEN HESABI';
const dashboardToggledBack = simulateDashboardClassification([aliCheck, alacakliCheck]);
assert.equal(
  dashboardToggledBack.nonTakasChecks.some(c => c.creditor === 'ALİ ARAN'),
  true,
  'Takasta Değil seçildiğinde Takasta Olmayan tablosuna geri dönmeli'
);
assert.equal(
  dashboardToggledBack.taksitChecks.some(c => c.creditor === 'ALİ ARAN'),
  false,
  'Takasta Değil seçildiğinde TAKSİT sütununda yer almamalı'
);
console.log('✓ "Takasta Değil" seçildiğinde Takasta Olmayan tablosuna geri döndü');

// -------------------------------------------------------------
// TEST 5: Sıfırlanan Bakiyeli Carinin Takasta Olmayan'dan Temizlenmesi (Orphaned row prevention)
// -------------------------------------------------------------
console.log('\n[TEST 5: Orphaned Persisted Check Pruning upon 0 TL Balance]');

// Simulate a check that was previously persisted in ebs_checks with 'TAKASTA OLMAYAN - ÇEKTEN HESABI'
const persistedNonTakasCheck = {
  id: 'ebs-uuid-999',
  local_id: 999,
  check_type: 'kesilen',
  creditor: 'SIFIRLANAN CARİ',
  debtor: 'ÇEKTEN HESABI',
  bank_name: 'ÇEKTEN HESABI',
  amount: 45000,
  status: 'Tahsilde',
  ozel_alan: 'TAKASTA OLMAYAN - ÇEKTEN HESABI',
  due_date: '2026-10-13'
};

// Cekten Hesabi'nda bu carinin bakiyesi 0 TL (tamamı ödenmiş)
const cektenRowsWithZeroBalance = [
  { id: '10', supplier: 'SIFIRLANAN CARİ', total_amount: 45000, paid_amount: 45000, remaining_amount: 0 }
];

const cleanedChecks = simulateCektenAggregation(cektenRowsWithZeroBalance, [persistedNonTakasCheck]);
assert.equal(
  cleanedChecks.some(c => c.creditor === 'SIFIRLANAN CARİ'),
  false,
  'Bakiyesi 0 TL olan cari ebs_checks tablosunda önceden kayıtlı olsa bile allData listesinden temizlenmeli'
);
console.log('✓ Sıfır bakiyeli carinin önceden kaydedilmiş kaydı Takasta Olmayan listesinden başarıyla temizlendi');

// -------------------------------------------------------------
// TEST 6: Bozuk Türkçe Karakter & Mojibake Dayanıklılığı
// -------------------------------------------------------------
console.log('\n[TEST 6: Mojibake & Turkish Charset Robustness]');

const corruptedCheck = {
  id: 'corrupt-1',
  debtor: 'Ã‡EKTEN HESABI',
  bank_name: 'Ã‡EKTEN HESABI',
  creditor: 'ıSTANBUL GIDA',
  ozel_alan: 'TAKASTA - Ã‡EKTEN HESABI'
};
assert.equal(isCektenCheck(corruptedCheck), true, 'Mojibake içeren Çekten kaydı (Ã‡EKTEN) başarıyla tanınmalı');

const rowsWithCorruptedSupplier = [
  { id: '11', supplier: 'ıSTANBUL GIDA', remaining_amount: 25000 },
  { id: '12', supplier: 'İSTANBUL GIDA', remaining_amount: 10000 }
];
const aggregatedCorrupted = aggregateCektenBalances(rowsWithCorruptedSupplier);
const istanbulSummary = aggregatedCorrupted.get('İSTANBUL GIDA');
assert.ok(istanbulSummary, 'Bozuk karakterli "ıSTANBUL GIDA" düzeltilerek "İSTANBUL GIDA" altında birleştirilmeli');
assert.equal(istanbulSummary.netBalance, 35000, 'İki kaydın toplamı 35.000 TL olmalı');
console.log('✓ Bozuk karakterli tedarikçi isimleri doğru onarılıp birleştirildi (35.000 TL)');

// -------------------------------------------------------------
// TEST 7: Default Tarih ve Güvenli Payload Üretimi
// -------------------------------------------------------------
console.log('\n[TEST 7: Payload Default Date Fallback]');
const fallbackPayload = createCektenPaymentPayload('org1', 'TEST CARİ', 5000);
assert.ok(fallbackPayload.date, 'date alanı boş olmamalı');
assert.ok(fallbackPayload.payment_date, 'payment_date alanı boş olmamalı');
assert.equal(fallbackPayload.supplier, 'TEST CARİ');
assert.equal(fallbackPayload.paid_amount, 5000);
console.log('✓ Tarih parametresi verilmediğinde bugünün tarihiyle güvenli payload üretildi');

// -------------------------------------------------------------
// TEST 8: ISO Timestamp Tarih Ayrıştırma & Null/Undefined Supplier Güvenliği
// -------------------------------------------------------------
console.log('\n[TEST 8: ISO Timestamp Date Extraction & Safe Null Supplier]');
const isoDatePayload = createCektenPaymentPayload('org1', undefined, 12500, '2026-10-13T14:30:00.000Z');
assert.equal(isoDatePayload.date, '2026-10-13', 'ISO timestamp saat/dakika kısmından arındırılıp saf YYYY-MM-DD olmalı');
assert.equal(isoDatePayload.payment_date, '13.10.2026', 'payment_date saatsiz temiz DD.MM.YYYY olmalı');
assert.equal(isoDatePayload.supplier, '', 'Undefined supplier güvenle boş string yapılmalı, çökmemeli');
assert.equal(isoDatePayload.paid_amount, 12500);
console.log('✓ ISO timestamp tarih formatı ve undefined supplier çökme koruması doğrulandı');

// -------------------------------------------------------------
// TEST 9: Çoklu Boşluk / Whitespace Normalizasyonu
// -------------------------------------------------------------
console.log('\n[TEST 9: Multi-space Collapsing in Supplier Aggregation]');
const rowsWithMultiSpace = [
  { id: '13', supplier: 'KASAP  AHMET   GIDA', remaining_amount: 15000 },
  { id: '14', supplier: 'KASAP AHMET GIDA', remaining_amount: 5000 }
];
const aggregatedSpaces = aggregateCektenBalances(rowsWithMultiSpace);
const kasapSummary = aggregatedSpaces.get('KASAP AHMET GIDA');
assert.ok(kasapSummary, 'Çoklu boşluklu cariler tek boşlukta birleştirilmeli');
assert.equal(kasapSummary.netBalance, 20000, 'Bakiyeler doğru toplanmalı (20.000 TL)');
console.log('✓ Çoklu boşluk içeren cari isimleri başarıyla birleştirildi (20.000 TL)');

// -------------------------------------------------------------
// TEST 10: Notlar Alanında Çekten Tespiti
// -------------------------------------------------------------
console.log('\n[TEST 10: Detection of Çekten via Notlar Field]');
const checkWithNotlar = {
  id: 'custom-check-1',
  debtor: 'DİĞER',
  bank_name: 'DİĞER',
  notlar: 'Bu ödeme çekten hesabı mahsubudur'
};
assert.equal(isCektenCheck(checkWithNotlar), true, 'notlar alanında "çekten" geçen çek doğru tanınmalı');
console.log('✓ notlar alanında "çekten" geçen çek başarıyla tespit edildi');

// -------------------------------------------------------------
// TEST 11: Keşideci Alanında Çekten Tespiti
// -------------------------------------------------------------
console.log('\n[TEST 11: Detection of Çekten via Kesideci Field]');
const checkWithKesideci = {
  id: 'kesideci-check-1',
  debtor: 'DİĞER',
  bank_name: 'DİĞER',
  kesideci: 'ÇEKTEN HESABI MAHSUBU'
};
assert.equal(isCektenCheck(checkWithKesideci), true, 'kesideci alanında "çekten" geçen çek doğru tanınmalı');
console.log('✓ kesideci alanında "çekten" geçen çek başarıyla tespit edildi');

// -------------------------------------------------------------
// TEST 12: Negatif / İmzalı Tutar Güvenliği (Math.abs)
// -------------------------------------------------------------
console.log('\n[TEST 12: Signed/Negative Amount Normalization in Payment Payload]');
const negativeAmountPayload = createCektenPaymentPayload('org1', 'BORÇLU CARİ', -75000, '2026-10-13');
assert.equal(negativeAmountPayload.paid_amount, 75000, 'paid_amount kesinlikle pozitif olmalı');
assert.equal(negativeAmountPayload.remaining_amount, -75000, 'remaining_amount borcu kapatacak şekilde -75.000 olmalı');
console.log('✓ Negatif tutar verildiğinde Math.abs ile güvenli pozitif ödeme üretildi');

// -------------------------------------------------------------
// TEST 13: Tarih Baş/Son Boşluk Temizleme (Trim)
// -------------------------------------------------------------
console.log('\n[TEST 13: Whitespace Trimming in Date Formatting]');
const spacedDate = '  2026-10-13  ';
assert.equal(formatDateForDB(spacedDate), '13.10.2026', 'Boşluklu tarih doğru trim edilip 13.10.2026 olmalı');
const spacedTimestamp = ' 2026-10-13T12:00:00Z ';
assert.equal(formatDateForDB(spacedTimestamp), '13.10.2026', 'Boşluklu ISO timestamp temizlenmeli');
console.log('✓ Boşluklu tarih parametreleri hatasız biçimlendirildi');

// -------------------------------------------------------------
// TEST 14: Toplu Ödeme (handleMarkColumnAsPaid) Simülasyonu
// -------------------------------------------------------------
console.log('\n[TEST 14: Batch Column Payment Simulation on TAKSİT Column]');
const mixedTakasColumn = [
  { id: 'uuid-1', creditor: 'TEDARİKÇİ X', amount: 50000, debtor: 'TAKSİT', bank_name: 'ÇEKTEN HESABI', status: 'Tahsilde' },
  { id: 'uuid-2', creditor: 'NORMAL CARİ', amount: 30000, debtor: 'TAKSİT', bank_name: 'AKBANK', status: 'Tahsilde' },
  { id: 'uuid-3', creditor: 'TEDARİKÇİ Y', amount: 20000, debtor: 'ÇEKTEN HESABI', bank_name: 'ÇEKTEN HESABI', status: 'Tahsilde' },
  { id: 'uuid-4', creditor: 'ÖDENMİŞ ÇEK', amount: 10000, debtor: 'TAKSİT', bank_name: 'ÇEKTEN HESABI', status: 'Ödendi' }
];

// Sadece ödenmemiş olanları hedefle
const unpaidTargets = mixedTakasColumn.filter(c => c.id && !(c.status || '').toLowerCase().includes('ödendi'));
assert.equal(unpaidTargets.length, 3, 'Ödenmemiş 3 kayıt olmalı');

const cektenTargets = unpaidTargets.filter(c => isCektenCheck(c));
assert.equal(cektenTargets.length, 2, 'Çekten hesabı ile ilişkili 2 kayıt olmalı (X ve Y)');

const paymentDate = '2026-10-13';
const batchPayloads = cektenTargets.map(c => createCektenPaymentPayload('org1', c.creditor, c.amount, paymentDate));
assert.equal(batchPayloads.length, 2);
assert.equal(batchPayloads[0].supplier, 'TEDARİKÇİ X');
assert.equal(batchPayloads[0].paid_amount, 50000);
assert.equal(batchPayloads[1].supplier, 'TEDARİKÇİ Y');
assert.equal(batchPayloads[1].paid_amount, 20000);
console.log('✓ TAKSİT sütununda toplu ödendi yapıldığında yalnızca ödenmemiş Çekten carileri filtrelendi ve doğru payload üretildi');

// -------------------------------------------------------------
// TEST 15: Modal Ekleme / Taşıma (handleAddCheck) Suffix Bütünlüğü
// -------------------------------------------------------------
console.log('\n[TEST 15: Modal Addition / Move Ozel Alan Suffix Preservation]');
function computeModalOzelAlan(targetCheck, targetColumn) {
  const isCekten = isCektenCheck(targetCheck);
  const cektenSuffix = isCekten ? ' - ÇEKTEN HESABI' : '';
  const isCurrentlyIcTakas = (targetCheck.ozel_alan || '').toUpperCase().includes('İÇ TAKAS');
  if (targetColumn === 'TAKASTA OLMAYAN') {
    return isCurrentlyIcTakas ? `TAKASTA OLMAYAN - İÇ TAKAS${cektenSuffix}` : `TAKASTA OLMAYAN${cektenSuffix}`;
  } else {
    return isCurrentlyIcTakas ? `TAKASTA - İÇ TAKAS${cektenSuffix}` : `TAKASTA${cektenSuffix}`;
  }
}

const dynamicModalCheck = {
  id: 'cekten_TEST%20CAR%C4%B0',
  debtor: 'ÇEKTEN HESABI',
  bank_name: 'ÇEKTEN HESABI',
  ozel_alan: 'TAKASTA OLMAYAN - ÇEKTEN HESABI'
};
const modalOzelAlanResult = computeModalOzelAlan(dynamicModalCheck, 'TAKSİT');
assert.equal(modalOzelAlanResult, 'TAKASTA - ÇEKTEN HESABI', 'Modal ile takasa eklenen Çekten çeki "TAKASTA - ÇEKTEN HESABI" suffixini korumalı');
console.log('✓ Modal üzerinden ekleme işleminde ÇEKTEN HESABI eki korundu');

console.log('\n================================================================');
console.log('--- ALL INTEGRATION & ADVERSARIAL TESTS PASSED SUCCESSFULLY! ---');
console.log('================================================================');


