import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
let startDate = null;
let endDate = null;

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--startDate=')) {
    startDate = args[i].split('=')[1];
  } else if (args[i].startsWith('--endDate=')) {
    endDate = args[i].split('=')[1];
  }
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const username = process.env.EKAP_SYNC_USERNAME;
const password = process.env.EKAP_SYNC_PASSWORD;

if (!url || !key || !username || !password) {
  throw new Error('VITE_SUPABASE_URL, Supabase anahtarı, EKAP_SYNC_USERNAME ve EKAP_SYNC_PASSWORD zorunludur.');
}

const email = username.includes('@') ? username : `${username}@ops360.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError || !auth.user) throw new Error(`Tarama kullanıcısı giriş yapamadı: ${authError?.message}`);

const { data: membership, error: membershipError } = await supabase
  .from('organization_members')
  .select('organization_id,role')
  .eq('user_id', auth.user.id)
  .limit(1)
  .maybeSingle();
if (membershipError || !membership) throw new Error('Tarama kullanıcısının şirket üyeliği bulunamadı.');
if (!['admin', 'muhasebe', 'finans'].includes(membership.role)) throw new Error('Tarama kullanıcısının yazma yetkisi yok.');

// Load and parse İHALE TAKİP.xlsx to build dynamic keywords
const excelPath = path.resolve('dosyalar/İHALE TAKİP.xlsx');
let excelSearchTerms = [];
let excelPatternStr = '(kırmızı\\s+et|dana\\s+eti?|sığır\\s+eti?|kuzu\\s+eti?|koyun\\s+eti?|karkas\\s+et|et\\s+ve\\s+et\\s+ürünleri)';

try {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['Sayfa1'] || workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  const uniqueProducts = new Set();
  const uniqueWords = new Set();
  
  rows.forEach(r => {
    const prodName = r['ÜRÜN ADI'];
    if (prodName) {
      const cleanProd = prodName.toString().trim().toLowerCase();
      uniqueProducts.add(cleanProd);
      
      const words = cleanProd.replace(/[(),\/]/g, ' ').split(/\s+/).map(w => w.trim()).filter(w => w.length > 2);
      words.forEach(w => uniqueWords.add(w));
    }
  });

  console.log(`Excel'den ${uniqueProducts.size} farklı ürün adı ve ${uniqueWords.size} anahtar kelime yüklendi.`);

  const candidateTerms = [
    'dana eti', 'sığır eti', 'kırmızı et', 'karkas et', 'kuzu eti', 'koyun eti',
    'tavuk eti', 'piliç eti', 'hindi eti', 'döner', 'kıyma', 'sucuk', 'köfte', 'kavurma', 'yumurta'
  ];
  
  excelSearchTerms = candidateTerms.filter(term => {
    const termWords = term.split(/\s+/);
    return termWords.some(w => uniqueWords.has(w)) || term === 'et ve et ürünleri';
  });
  
  if (excelSearchTerms.length === 0) {
    excelSearchTerms = candidateTerms;
  }

  const coreKeywords = [...uniqueWords].filter(w => {
    const stopwords = ['ve', 'ile', 'ton', 'kg', 'adet', 'paket', 'set', 'kalem', 'çeşitli', 'ürünleri', 'ürünleri̇', 'eti̇', 'eti', 'grup', 'sözleşme', 'tarih'];
    return !stopwords.includes(w);
  });
  
  if (coreKeywords.length > 0) {
    excelPatternStr = `(${coreKeywords.map(w => w.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')})`;
  }
} catch (e) {
  console.warn("İhale Takip excel dosyası okunamadı veya ayrıştırılamadı:", e.message);
  excelSearchTerms = ['kırmızı et', 'dana eti', 'sığır eti', 'kuzu eti', 'koyun eti', 'karkas et', 'et ve et ürünleri'];
}

const searchTerms = excelSearchTerms;
const meatPattern = new RegExp(excelPatternStr, 'iu');
console.log("EKAP Arama Terimleri:", searchTerms.join(', '));

const scanStartedAt = new Date();
const scanEndsAt = new Date(scanStartedAt.getTime() + (90 * 24 * 60 * 60 * 1000));
const found = new Map();

// Parse dates from command line arguments or database request queue
let reqId = null;
let ekapStart = null;
let ekapEnd = null;
let isCron = false;

// Check if --cron is passed
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--cron') {
    isCron = true;
  }
}

try {
  if (isCron) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    ekapStart = `${dd}.${mm}.${yyyy}`;
    ekapEnd = `${dd}.${mm}.${yyyy}`;
    console.log(`Zamanlanmış otomatik günlük tarama başlatılıyor (Tarih Aralığı: ${ekapStart} - ${ekapEnd})...`);
  } else if (startDate && endDate) {
    ekapStart = startDate;
    ekapEnd = endDate;
    console.log(`Parametrik arama başlatılıyor: ${ekapStart} - ${ekapEnd}`);
  } else {
    console.log("Bekleyen tarama istekleri kontrol ediliyor...");
    const { data: request, error: requestError } = await supabase
      .from('ekap_scan_requests')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (requestError) {
      console.error("İstek sorgulama hatası:", requestError.message);
      process.exit(1);
    }

    if (!request) {
      console.log("Bekleyen tarama isteği bulunamadı. Program kapatılıyor.");
      await supabase.auth.signOut();
      process.exit(0);
    }

    reqId = request.id;
    
    const formatToEkapDate = (isoStr) => {
      const [y, m, d] = isoStr.split('T')[0].split('-');
      return `${d}.${m}.${y}`;
    };

    ekapStart = formatToEkapDate(request.start_date);
    ekapEnd = formatToEkapDate(request.end_date);
    console.log(`Kuyruktan tarama isteği alındı (ID: ${reqId}): ${ekapStart} - ${ekapEnd}`);

    // Update status to 'running'
    await supabase
      .from('ekap_scan_requests')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', reqId);
  }

  console.log("Tarayıcı başlatılıyor...");
  const browser = await chromium.launch({ headless: true });
  console.log("Tarayıcı başlatıldı, sayfa açılıyor...");

  let page = null;
  try {
    page = await browser.newPage({ 
      locale: 'tr-TR',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    console.log("EKAP sayfası yükleniyor...");
    await page.goto('https://ekapv2.kik.gov.tr/ekap/search', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(err => {
      throw new Error(`EKAP sayfası yüklenemedi: ${err.message}`);
    });
    
    // Focus page
    await page.click('body').catch(() => undefined);
    await page.waitForTimeout(2000);
    
    // Dismiss any tour guide popups
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    console.log("Filtreler uygulanıyor...");
    // Click "Yapım", "Hizmet", and "Danışmanlık" to deselect them, leaving only "Mal" active
    const yapimBtn = page.locator('button:has-text("Yapım")').first();
    const hizmetBtn = page.locator('button:has-text("Hizmet")').first();
    const danismanlikBtn = page.locator('button:has-text("Danışmanlık")').first();
    
    await yapimBtn.click({ timeout: 2000 }).catch(() => undefined);
    await hizmetBtn.click({ timeout: 2000 }).catch(() => undefined);
    await danismanlikBtn.click({ timeout: 2000 }).catch(() => undefined);

    if (ekapStart && ekapEnd) {
      // Click "Tarih Aralığı" radio button
      const tarihAraligiRadio = page.locator('text="Tarih Aralığı"').first();
      await tarihAraligiRadio.click();
      console.log(`Tarih Aralığı seçiliyor: ${ekapStart} - ${ekapEnd}`);

      // Dismiss step 2 guide if it appears
      await page.waitForTimeout(1000);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Wait for date range box to be visible
      const daterangebox = page.locator('.dx-daterangebox').first();
      await daterangebox.waitFor({ state: 'visible', timeout: 10000 });

      // Fill start date
      const startDateInput = page.locator('.dx-daterangebox input[type="text"]').first();
      await startDateInput.fill(ekapStart);

      // Tab to end date
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);

      // Type end date
      await page.keyboard.type(ekapEnd);
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Press Escape to close calendar
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      // Click "Bugün" radio button
      const bugunRadio = page.locator('text="Bugün"').first();
      await bugunRadio.click();
      console.log("İlan Tarihi: Bugün seçildi.");
    }

    // Click "Filtrele" button
    const filtreleBtn = page.locator('button:has-text("Filtrele")').first();
    await filtreleBtn.click({ force: true });
    await page.waitForTimeout(2000); // Wait for results to update

    const search = page.locator('#search-by-word input');
    await search.waitFor({ state: 'visible', timeout: 90000 });

    for (const term of searchTerms) {
      console.log(`"${term}" aranıyor...`);
      await search.fill(term);
      await search.press('Enter');
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => undefined);
      await page.locator('ihale-liste-item').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined);

      const rows = await page.locator('ihale-liste-item').evaluateAll((nodes) => nodes.map((node) => ({
        ikn: node.querySelector('.ikn')?.textContent?.trim() || '',
        title: node.querySelector('.ihale')?.textContent?.trim() || '',
        institution: node.querySelector('.idare')?.textContent?.trim() || '',
        placeAndDate: node.querySelector('.forth-row .il-saat')?.textContent?.trim()
          || node.querySelector('.first-row .il-saat')?.textContent?.trim() || '',
      })));

      console.log(`  ${rows.length} ikn veya ihale listelendi.`);

      for (const row of rows) {
        if (!row.ikn || !meatPattern.test(row.title)) continue;
        const match = row.placeAndDate.match(/^(.+),\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/u);
        if (!match) continue;
        const [, city, day, month, year, hour, minute] = match;
        const deadline = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+03:00`);
        if (Number.isNaN(deadline.getTime())) continue;
        if (deadline < scanStartedAt || deadline > scanEndsAt) continue;
        found.set(row.ikn, {
          organization_id: membership.organization_id,
          ikn: row.ikn,
          title: row.title,
          institution: row.institution,
          city: city.trim(),
          deadline_at: deadline.toISOString(),
          procurement_type: 'mal',
          scope: '4734',
          matched_keyword: row.title.match(meatPattern)?.[0] || term,
          source_url: 'https://ekapv2.kik.gov.tr/ekap/search',
        });
      }
    }
  } catch (innerErr) {
    if (page) {
      await page.screenshot({ path: 'dosyalar/ekap-sync/ekap_error_screenshot.png' }).catch(() => undefined);
      console.log("Hata anı ekran görüntüsü kaydedildi: dosyalar/ekap-sync/ekap_error_screenshot.png");
    }
    throw innerErr;
  } finally {
    await browser.close();
  }

  const candidates = [...found.values()];
  if (candidates.length) {
    for (const c of candidates) {
      c.status = 'onaylandi';
      c.reviewed_at = new Date().toISOString();
      if (c.scope !== 'dogrudan_temin' && !c.ikn.includes('DT')) {
        await supabase.from('tenders').insert({
          organization_id: c.organization_id,
          tender_number: c.ikn,
          title: c.title,
          institution: c.institution,
          tender_type: 'mal',
          method: 'acik',
          status: 'hazirlaniyor',
          estimated_amount: 0,
          currency: 'TRY',
          deadline_at: c.deadline_at,
          assigned_to: '',
          description: `EKAP 4734 kapsamı · Eşleşme: ${c.matched_keyword || 'OKAS 15100000'}`,
          created_by: '9c242e61-e15f-41b5-b1e6-60a02baed90a'
        }).select().maybeSingle().catch(() => undefined);
      }
    }
    const { error } = await supabase.from('ekap_candidates').upsert(candidates, {
      onConflict: 'organization_id,ikn',
      ignoreDuplicates: true,
    });
    if (error) throw error;
  }

  console.log(`EKAP taraması tamamlandı. Önümüzdeki 90 gün içinde ${candidates.length} uygun ihale bulundu.`);
  
  if (reqId) {
    await supabase
      .from('ekap_scan_requests')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', reqId);
  }
} catch (err) {
  console.error("Tarama sırasında hata oluştu:", err.message);
  if (reqId) {
    await supabase
      .from('ekap_scan_requests')
      .update({ status: 'failed', error_message: err.message, updated_at: new Date().toISOString() })
      .eq('id', reqId);
  }
  process.exit(1);
} finally {
  await supabase.auth.signOut();
}
