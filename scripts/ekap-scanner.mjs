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

const email = username.includes('@') ? username : `${username}@dars.local`;
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
let reqScope = 'tender';
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
    reqScope = request.scope || 'tender';
    
    const formatToEkapDate = (isoStr) => {
      const [y, m, d] = isoStr.split('T')[0].split('-');
      return `${d}.${m}.${y}`;
    };

    ekapStart = formatToEkapDate(request.start_date);
    ekapEnd = formatToEkapDate(request.end_date);
    console.log(`Kuyruktan tarama isteği alındı (ID: ${reqId}, Scope: ${reqScope}): ${ekapStart} - ${ekapEnd}`);

    // Update status to 'running'
    await supabase
      .from('ekap_scan_requests')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', reqId);
  }

  console.log("Tarayıcı başlatılıyor (Headless modda)...");
  const browser = await chromium.launch({ headless: true });
  console.log("Tarayıcı başlatıldı, sayfa açılıyor...");

  let page = null;
  try {
    page = await browser.newPage({ 
      locale: 'tr-TR',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });

    // Helper functions for crawls
    const performTendersScan = async () => {
      console.log("EKAP İhaleler sayfası yükleniyor...");
      await page.goto('https://ekapv2.kik.gov.tr/ekap/search', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(err => {
        throw new Error(`EKAP ihaleler sayfası yüklenemedi: ${err.message}`);
      });
      await page.waitForTimeout(5000);
      
      // Remove blocking overlays
      console.log("Removing blocking tutorial and popup overlays...");
      await page.evaluate(() => {
        const tutorial = document.querySelector('ekap-tutorial');
        if (tutorial) tutorial.remove();
        const popup = document.querySelector('#ekap-popup');
        if (popup) popup.remove();
      });
      await page.waitForTimeout(1000);

      console.log("İhale filtreleri uygulanıyor (Sadece Mal)...");
      const yapimBtn = page.locator('button:has-text("Yapım")').first();
      const hizmetBtn = page.locator('button:has-text("Hizmet")').first();
      const danismanlikBtn = page.locator('button:has-text("Danışmanlık")').first();
      
      await yapimBtn.evaluate(el => el.click()).catch(() => undefined);
      await hizmetBtn.evaluate(el => el.click()).catch(() => undefined);
      await danismanlikBtn.evaluate(el => el.click()).catch(() => undefined);
      await page.waitForTimeout(1000);

      let startStr = ekapStart;
      let endStr = ekapEnd;
      
      if (!startStr || !endStr) {
        const formatDateToEkap = (d) => {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return `${dd}.${mm}.${yyyy}`;
        };
        const today = new Date();
        const future15 = new Date(today.getTime() + (15 * 24 * 60 * 60 * 1000));
        startStr = formatDateToEkap(today);
        endStr = formatDateToEkap(future15);
      }

      console.log(`İhale Tarihi aralığı dolduruluyor (15 Günlük): ${startStr} - ${endStr}`);
      
      // Expand the "İhale Tarihi" accordion panel if it is collapsed
      const ihaleTarihiHeader = page.locator(':has-text("İhale Tarihi")').first();
      await ihaleTarihiHeader.evaluate(el => el.click()).catch(() => undefined);
      await page.waitForTimeout(2000);

      // Select "Tarih Aralığı" under "İhale Tarihi"
      const tarihAraligiRadio = page.locator('.dx-radiobutton:has-text("Tarih Aralığı")').nth(1);
      await tarihAraligiRadio.evaluate(el => el.click());
      await page.waitForTimeout(2000);

      const daterangebox = page.locator('.dx-daterangebox:visible').first();
      await daterangebox.waitFor({ state: 'visible', timeout: 10000 });

      const startDateInput = page.locator('.dx-daterangebox:visible input[type="text"]').first();
      await startDateInput.fill(startStr);

      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);
      await page.keyboard.type(endStr);
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      console.log("OKAS Kodu '15100000' seçiliyor...");
      const okasBtn = page.locator('button:has-text("OKAS Kodu Seç"), .dx-button:has-text("OKAS Kodu Seç")').first();
      await okasBtn.waitFor({ state: 'visible', timeout: 10000 });
      await okasBtn.click();
      await page.waitForTimeout(2000);

      const searchInput = page.locator('.dx-popup-content:visible input.dx-texteditor-input').first();
      await searchInput.waitFor({ state: 'visible', timeout: 15000 });
      await searchInput.fill('15100000');
      await page.waitForTimeout(3000);

      const checkbox = page.locator('.dx-popup-content:visible .dx-data-row .dx-checkbox').first();
      await checkbox.waitFor({ state: 'visible', timeout: 10000 });
      await checkbox.click();
      await page.waitForTimeout(1500);

      const secBtn = page.locator('.dx-popup-wrapper:visible button:has-text("Seç"), .dx-popup-wrapper:visible .dx-button:has-text("Seç")').first();
      await secBtn.waitFor({ state: 'visible', timeout: 10000 });
      await secBtn.click();
      await page.waitForTimeout(2000);

      console.log("Arama sonuçları filtreleniyor...");
      const filtreleBtn = page.locator('button:has-text("Filtrele"), .dx-button:has-text("Filtrele")').first();
      await filtreleBtn.waitFor({ state: 'visible', timeout: 10000 });
      await filtreleBtn.evaluate(el => el.click());
      
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => undefined);
      await page.locator('ihale-liste-item').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);

      const rows = await page.locator('ihale-liste-item').evaluateAll((nodes) => nodes.map((node) => ({
        ikn: node.querySelector('.ikn')?.textContent?.trim() || '',
        title: node.querySelector('.ihale')?.textContent?.trim() || '',
        institution: node.querySelector('.idare')?.textContent?.trim() || '',
        placeAndDate: node.querySelector('.forth-row .il-saat')?.textContent?.trim()
          || node.querySelector('.first-row .il-saat')?.textContent?.trim() || '',
      })));

      console.log(`Toplam ${rows.length} ihale listelendi.`);

      for (const row of rows) {
        if (!row.ikn) continue;
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
          matched_keyword: 'OKAS: 15100000 (Hayvansal mezbaha ürünleri, et ve et ürünleri)',
          source_url: 'https://ekapv2.kik.gov.tr/ekap/search',
        });
      }
    };

    const performDogrudanTeminScan = async () => {
      console.log("EKAP Doğrudan Teminler sayfası yükleniyor...");
      await page.goto('https://ekapv2.kik.gov.tr/ekap-dt/search', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(err => {
        throw new Error(`EKAP doğrudan temin sayfası yüklenemedi: ${err.message}`);
      });
      
      await page.waitForTimeout(10000);
      
      let searchFrame = page.frames().find(f => f.url().includes('YeniIhaleArama.aspx'));
      if (!searchFrame) {
        console.log("Doğrudan Temin arama frame'i bekleniyor...");
        for (let i = 0; i < 20; i++) {
          searchFrame = page.frames().find(f => f.url().includes('YeniIhaleArama.aspx'));
          if (searchFrame) break;
          await page.waitForTimeout(1000);
        }
      }
      if (!searchFrame) throw new Error("Doğrudan Temin arama frame'i (YeniIhaleArama.aspx) yüklenemedi!");

      console.log("Doğrudan Temin Türü: 'Mal' seçiliyor...");
      const malRadio = searchFrame.locator('label[for="rdIhaleTur_1"]').first();
      await malRadio.waitFor({ state: 'visible', timeout: 15000 });
      await malRadio.click();
      await page.waitForTimeout(2000);

      console.log("Doğrudan Temin Tarih Filtresi dolduruluyor (15 Günlük)...");
      const formatDateToEkap = (d) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
      };

      const today = new Date();
      const future15 = new Date(today.getTime() + (15 * 24 * 60 * 60 * 1000));

      const startInput = searchFrame.locator('input[name="txtIhaleTarihFirst"]').first();
      const endInput = searchFrame.locator('input[name="txtIhaleTarihSecond"]').first();

      await startInput.waitFor({ state: 'visible', timeout: 15000 });
      await startInput.fill(formatDateToEkap(today));
      await page.waitForTimeout(500);
      await endInput.fill(formatDateToEkap(future15));
      await page.waitForTimeout(500);

      console.log("Doğrudan Temin Arama Metin kutusu temizleniyor (Kelime filtresi kaldırıldı, sadece OKAS kodu kullanılacak)...");
      const aramaInput = searchFrame.locator('#bilgi2').first();
      await aramaInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
      await aramaInput.fill('').catch(() => undefined);
      await page.waitForTimeout(500);

      console.log("Branş Ekle butonuna tıklanıyor...");
      const bransEkleBtn = searchFrame.locator('a.btn-okas:has-text("Branş Ekle"), div.btn-okas:has-text("Branş Ekle")').first();
      await bransEkleBtn.waitFor({ state: 'visible', timeout: 15000 });
      await bransEkleBtn.click();

      console.log("Branş seçimi popup penceresinin yüklenmesi bekleniyor...");
      let popupFrame = page.frames().find(f => f.url().includes('PopUpIhaleKalemSec.aspx'));
      if (!popupFrame) {
        for (let i = 0; i < 20; i++) {
          await page.waitForTimeout(1000);
          popupFrame = page.frames().find(f => f.url().includes('PopUpIhaleKalemSec.aspx'));
          if (popupFrame) break;
        }
      }
      if (!popupFrame) throw new Error("Branş seçimi popup penceresi (PopUpIhaleKalemSec.aspx) bulunamadı!");

      console.log("OKAS: 'Hayvansal mezbaha ürünleri, et ve et ürünleri' (Et / Et ürünleri) branşı seçiliyor...");
      const navPromise = popupFrame.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => undefined);
      await popupFrame.evaluate(() => {
        // Find the checkbox for "Hayvansal mezbaha ürünleri, et ve et ürünleri"
        const allElements = Array.from(document.querySelectorAll('a, span, label, td, tr, div'));
        let targetChk = null;
        
        for (const el of allElements) {
          const text = el.textContent?.trim() || '';
          if (text.includes('Hayvansal mezbaha') || text.includes('15100000')) {
            const row = el.closest('tr') || el.closest('li') || el.closest('div') || el.parentElement;
            targetChk = row?.querySelector('input[type="checkbox"]');
            if (targetChk) break;
          }
        }

        if (!targetChk) {
          // Fallback: check all checkboxes whose label or container contains Hayvansal or Et
          const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
          for (const chk of allCheckboxes) {
            const containerText = chk.closest('tr, li, div, td')?.textContent?.trim() || '';
            if (containerText.includes('Hayvansal') || containerText.includes('15100000')) {
              targetChk = chk;
              break;
            }
          }
        }

        if (targetChk) {
          targetChk.click();
        } else {
          // Fallback to tree item if specific ID exists
          const chk4 = document.getElementById("treeItemChk_4");
          if (chk4) chk4.click();
        }
      });
      await navPromise;
      console.log("Onay kutusu yenilemesi tamamlandı.");
      await page.waitForTimeout(3000); // Safety buffer

      popupFrame = page.frames().find(f => f.url().includes('PopUpIhaleKalemSec.aspx'));
      if (!popupFrame) throw new Error("Onay kutusu seçiminden sonra popup penceresi kayboldu!");

      console.log("Doğrulayıcılar devre dışı bırakılıyor ve seçilen branşlar aktarılıyor...");
      await popupFrame.evaluate(() => {
        if (typeof Page_Validators !== 'undefined' && Array.isArray(Page_Validators)) {
          Page_Validators.forEach(val => {
            if (val) val.enabled = false;
          });
        }
        window.Page_BlockSubmit = false;
        
        window.setTimeout(() => {
          __doPostBack("ctl00$ContentPlaceHolder1$btnSecilenleriAktar", "");
        }, 50);
      });
      await page.waitForTimeout(6000);

      searchFrame = page.frames().find(f => f.url().includes('YeniIhaleArama.aspx'));
      
      console.log("Filtrele butonuna tıklanıyor...");
      const filtreleBtn = searchFrame.locator('#btnFilter').first();
      await filtreleBtn.waitFor({ state: 'attached', timeout: 15000 });
      await filtreleBtn.evaluate(el => el.click());
      
      console.log("Sonuçların yüklenmesi bekleniyor...");
      await page.waitForTimeout(8000);

      searchFrame = page.frames().find(f => f.url().includes('YeniIhaleArama.aspx'));
      
      console.log("AngularJS modelinden doğrudan temin sonuçları ayıklanıyor...");
      const rawResults = await searchFrame.evaluate(() => {
        const element = document.querySelector('dt-list-box');
        if (!element) return [];
        try {
          const scope = window.angular.element(element).scope();
          return scope ? scope.aramaSonuclari : [];
        } catch (e) {
          return [];
        }
      });

      if (!rawResults || !Array.isArray(rawResults)) {
        console.log("Herhangi bir doğrudan temin kaydı bulunamadı veya model boş.");
        return;
      }

      console.log(`Doğrudan Temin listesinden ${rawResults.length} ham kayıt bulundu. Filtreleniyor...`);

      const parseDtDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split(' ');
        const dateParts = parts[0].split('.');
        if (dateParts.length !== 3) return null;
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        if (parts.length > 1) {
          const timeParts = parts[1].split(':');
          if (timeParts.length >= 2) {
            const hour = parseInt(timeParts[0], 10);
            const minute = parseInt(timeParts[1], 10);
            return new Date(year, month, day, hour, minute);
          }
        }
        return new Date(year, month, day);
      };

      const now = new Date();

      for (const item of rawResults) {
        const title = item.E2 || '';
        const dtn = item.E1 || '';
        const institution = item.E3 || '';
        const city = item.E12 || '';
        const dateStr = item.E7 || '';
        
        if (!dtn || !title) continue;

        const deadline = parseDtDate(dateStr);
        if (!deadline) continue;

        // Filter for next 15 days (with a 1-day safety margin for timezone offsets/same-day items)
        const diffTime = deadline.getTime() - now.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays >= -1 && diffDays <= 15) {
          console.log(`  Uyumlu Doğrudan Temin Bulundu: ${dtn} - ${title} (Son Tarih: ${dateStr})`);
          found.set(dtn, {
            organization_id: membership.organization_id,
            ikn: dtn,
            title: title,
            institution: institution,
            city: city.trim(),
            deadline_at: deadline.toISOString(),
            procurement_type: 'mal',
            scope: 'dogrudan_temin',
            matched_keyword: 'OKAS: 15100000 (Hayvansal mezbaha ürünleri, et ve et ürünleri)',
            source_url: 'https://ekapv2.kik.gov.tr/ekap-dt/search',
          });
        }
      }
    };

    if (isCron) {
      // Automatic daily runs check BOTH general tenders and direct procurements sequentially
      await performTendersScan();
      await performDogrudanTeminScan();
    } else {
      // Queued requests run the specific requested module scope
      if (reqScope === 'dogrudan_temin') {
        await performDogrudanTeminScan();
      } else {
        await performTendersScan();
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
    // 1. Veritabanındaki mevcut kayıtları çekip sadece yeni (benzersiz) olanları tespit edelim
    const existingIkns = new Set();
    const { data: existingData } = await supabase
      .from('ekap_candidates')
      .select('ikn')
      .eq('organization_id', membership.organization_id);
    if (existingData) {
      existingData.forEach(row => existingIkns.add(row.ikn));
    }

    const newCandidates = candidates.filter(c => !existingIkns.has(c.ikn));

    // 2. Veritabanına kaydet
    const { error } = await supabase.from('ekap_candidates').upsert(candidates, {
      onConflict: 'organization_id,ikn',
      ignoreDuplicates: true,
    });
    if (error) throw error;

    // 3. Eğer yeni aday(lar) varsa Telegram bildirimi gönder
    if (newCandidates.length > 0) {
      console.log(`${newCandidates.length} adet yeni benzersiz aday bulundu! Telegram bildirimi gönderiliyor...`);
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (token && chatId) {
        let messageText = `🔔 <b>YENİ EKAP ADAYLARI BULUNDU!</b>\n\n`;
        newCandidates.forEach((c, idx) => {
          const typeText = c.scope === 'dogrudan_temin' ? 'Doğrudan Temin' : 'İhale';
          const date = new Date(c.deadline_at);
          const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          
          messageText += `${idx + 1}. <b>[${typeText}]</b>\n`;
          messageText += `<b>İKN / No:</b> <code>${c.ikn}</code>\n`;
          messageText += `<b>Konu:</b> ${c.title}\n`;
          messageText += `<b>Kurum:</b> ${c.institution}\n`;
          messageText += `<b>Son Tarih:</b> ${formattedDate}\n\n`;
        });

        try {
          const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
          const res = await fetch(tgUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: messageText,
              parse_mode: 'HTML'
            })
          });
          const data = await res.json();
          if (!data.ok) {
            console.error("Telegram API hatası:", data.description);
          } else {
            console.log("Telegram bildirimi başarıyla gönderildi.");
          }
        } catch (tgErr) {
          console.error("Telegram gönderme hatası:", tgErr.message);
        }
      } else {
        console.log("TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID ortam değişkenleri tanımlı değil, bildirim gönderilmedi.");
      }
    }
  }

  console.log(`EKAP taraması tamamlandı. Toplam ${candidates.length} uygun ihale/doğrudan temin adayı işlendi.`);
  
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
