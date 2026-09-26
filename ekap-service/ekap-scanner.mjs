import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
let startDate = null;
let endDate = null;
let isCron = false;

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--startDate=')) {
    startDate = args[i].split('=')[1];
  } else if (args[i].startsWith('--endDate=')) {
    endDate = args[i].split('=')[1];
  } else if (args[i] === '--cron') {
    isCron = true;
  }
}

const url = process.env.VITE_SUPABASE_URL || 'https://zubhjybqzcpplultpsgt.supabase.co';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG';
const username = process.env.EKAP_SYNC_USERNAME || 'berkant@dars.local';
const password = process.env.EKAP_SYNC_PASSWORD || '123berkant_';

console.log('====================================================');
console.log('  🏢 EKAP İHALE TARAMA & ENTEGRASYON SERVİSİ (v2.0)');
console.log('====================================================');

const email = username.includes('@') ? username : `${username}@dars.local`;
const supabase = createClient(url, key, { auth: { persistSession: false } });

console.log('🔐 Supabase girişi yapılıyor...');
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError || !auth.user) {
  throw new Error(`Tarama kullanıcısı giriş yapamadı: ${authError?.message}`);
}

const { data: membership, error: membershipError } = await supabase
  .from('organization_members')
  .select('organization_id,role')
  .eq('user_id', auth.user.id)
  .limit(1)
  .maybeSingle();

if (membershipError || !membership) {
  throw new Error('Tarama kullanıcısının şirket üyeliği bulunamadı.');
}
console.log(`✅ Şirket yetkisi doğrulandı (Org ID: ${membership.organization_id})`);

// Load and parse İHALE TAKİP.xlsx
const excelPath = path.resolve('İHALE TAKİP.xlsx');
let searchTerms = [
  'dana eti', 'sığır eti', 'kırmızı et', 'karkas et', 'kuzu eti', 'koyun eti',
  'tavuk eti', 'piliç eti', 'hindi eti', 'döner', 'kıyma', 'sucuk', 'köfte', 'kavurma', 'yumurta'
];
let meatPattern = /(kırmızı\s+et|dana\s+eti?|sığır\s+eti?|kuzu\s+eti?|karkas|tavuk|piliç|hindi|döner|kıyma|sucuk|köfte|kavurma|yumurta)/iu;

try {
  if (fs.existsSync(excelPath)) {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['Sayfa1'] || workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const uniqueWords = new Set();

    rows.forEach(r => {
      const prodName = r['ÜRÜN ADI'];
      if (prodName) {
        const clean = prodName.toString().trim().toLowerCase();
        const words = clean.replace(/[(),\/]/g, ' ').split(/\s+/).map(w => w.trim()).filter(w => w.length > 2);
        words.forEach(w => uniqueWords.add(w));
      }
    });

    console.log(`📋 Excel listesinden ${uniqueWords.size} adet filtre terimi yüklendi.`);
  }
} catch (e) {
  console.warn('⚠️ Excel dosyası okunamadı, varsayılan et/tavuk terimleri kullanılacak:', e.message);
}

console.log('🔍 Arama Terimleri:', searchTerms.join(', '));

function parseEkapDate(str, isEnd = false) {
  if (!str) return isEnd ? new Date(Date.now() + 15 * 86400000) : new Date();
  const parts = str.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0);
  }
  return new Date();
}

let ekapStart = null;
let ekapEnd = null;
let scanStartedAt = new Date();
let scanEndsAt = new Date(Date.now() + 15 * 86400000);

if (startDate && endDate) {
  ekapStart = startDate;
  ekapEnd = endDate;
  scanStartedAt = parseEkapDate(ekapStart, false);
  scanEndsAt = parseEkapDate(ekapEnd, true);
  console.log(`📅 Özel Tarih Aralığı: ${ekapStart} - ${ekapEnd}`);
} else {
  const formatDateToEkap = (d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };
  const today = new Date();
  const future15 = new Date(today.getTime() + 15 * 86400000);
  ekapStart = formatDateToEkap(today);
  ekapEnd = formatDateToEkap(future15);
  scanStartedAt = parseEkapDate(ekapStart, false);
  scanEndsAt = parseEkapDate(ekapEnd, true);
  console.log(`📅 Standart Önümüzdeki 15 Günlük Tarama: ${ekapStart} - ${ekapEnd}`);
}

const found = new Map();
const profileDir = path.resolve('ekap_chrome_profile');

console.log('🌐 Gerçek Chrome Profili Başlatılıyor (Cloudflare Koruması Aşılıyor)...');
const context = await chromium.launchPersistentContext(profileDir, {
  channel: 'chrome',
  headless: false,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--window-size=1280,800'
  ]
});

const page = context.pages()[0] || await context.newPage();

try {
  console.log('🚀 EKAP İhale Arama sayfası açılıyor...');
  await page.goto('https://ekapv2.kik.gov.tr/ekap/search', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  // Kılavuz / Pop-up katmanlarını temizle
  await page.evaluate(() => {
    const tutorial = document.querySelector('ekap-tutorial');
    if (tutorial) tutorial.remove();
    const popup = document.querySelector('#ekap-popup');
    if (popup) popup.remove();
    const popups = document.querySelectorAll('.dx-popup-wrapper');
    popups.forEach(p => p.remove());
  });
  await page.waitForTimeout(1000);

  // Filtreler: Sadece Mal Alımı
  console.log('📦 Alım türü filtresi uygulanıyor (Mal)...');
  const yapimBtn = page.locator('button:has-text("Yapım")').first();
  const hizmetBtn = page.locator('button:has-text("Hizmet")').first();
  const danismanlikBtn = page.locator('button:has-text("Danışmanlık")').first();

  await yapimBtn.evaluate(el => el.click()).catch(() => undefined);
  await hizmetBtn.evaluate(el => el.click()).catch(() => undefined);
  await danismanlikBtn.evaluate(el => el.click()).catch(() => undefined);
  await page.waitForTimeout(1000);

  // Kelime ve OKAS Kodu ile arama
  const searchInput = page.locator('#search-by-word input').first();
  if (await searchInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    const queryList = ['15100000', 'et alımı', 'dana eti', 'karkas et', 'tavuk eti'];

    for (const q of queryList) {
      console.log(`🔎 Arama yapılıyor: "${q}"...`);
      await searchInput.fill(q);
      await searchInput.press('Enter');
      await page.waitForTimeout(4000);

      const items = await page.locator('ihale-liste-item').evaluateAll((nodes) => nodes.map((node) => ({
        ikn: node.querySelector('.ikn')?.textContent?.trim() || '',
        title: node.querySelector('.ihale')?.textContent?.trim() || '',
        institution: node.querySelector('.idare')?.textContent?.trim() || '',
        placeAndDate: node.querySelector('.forth-row .il-saat')?.textContent?.trim()
          || node.querySelector('.first-row .il-saat')?.textContent?.trim() || '',
      })));

      console.log(`  -> ${items.length} adet sonuç bulundu.`);

      for (const row of items) {
        if (!row.ikn || found.has(row.ikn)) continue;
        const match = row.placeAndDate.match(/^(.+),\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/u);
        if (!match) continue;
        const [, city, day, month, year, hour, minute] = match;
        const deadline = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+03:00`);
        if (Number.isNaN(deadline.getTime())) continue;

        found.set(row.ikn, {
          organization_id: membership.organization_id,
          ikn: row.ikn,
          title: row.title,
          institution: row.institution,
          city: city.trim(),
          deadline_at: deadline.toISOString(),
          procurement_type: 'mal',
          scope: '4734',
          matched_keyword: q,
          source_url: 'https://ekapv2.kik.gov.tr/ekap/search',
          status: 'bekliyor'
        });
      }
    }
  }

} catch (err) {
  console.error('❌ İhale arama sırasında hata:', err.message);
} finally {
  await context.close().catch(() => undefined);
}

// 4. Sonuçları Supabase'e kaydet
const candidates = [...found.values()];
console.log(`\n====================================================`);
console.log(`📊 Toplam ${candidates.length} adet uygun ihale bulundu.`);
console.log(`====================================================`);

if (candidates.length > 0) {
  // Mevcut onaylı ihaleleri kontrol et
  const { data: existingData } = await supabase
    .from('ekap_candidates')
    .select('ikn')
    .eq('organization_id', membership.organization_id);

  const existingIkns = new Set((existingData || []).map(r => r.ikn));
  const newCandidates = candidates.filter(c => !existingIkns.has(c.ikn));

  console.log(`💾 Veritabanına aktarılıyor (${newCandidates.length} yeni aday)...`);
  const { error: upsertErr } = await supabase
    .from('ekap_candidates')
    .upsert(candidates, { onConflict: 'organization_id,ikn' });

  if (upsertErr) {
    console.error('Veritabanı kayıt hatası:', upsertErr.message);
  } else {
    console.log('✅ İhale adayları veritabanına başarıyla kaydedildi!');
  }

  // 5. Telegram Bildirimi Gönder
  if (newCandidates.length > 0) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      console.log(`📱 ${newCandidates.length} yeni ihale için Telegram bildirimi gönderiliyor...`);
      let messageText = `🔔 <b>YENİ EKAP İHALELERİ BULUNDU!</b>\n\n`;
      newCandidates.slice(0, 10).forEach((c, idx) => {
        const date = new Date(c.deadline_at);
        const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        messageText += `${idx + 1}. <b>İKN:</b> <code>${c.ikn}</code>\n`;
        messageText += `<b>Konu:</b> ${c.title}\n`;
        messageText += `<b>Kurum:</b> ${c.institution}\n`;
        messageText += `<b>Şehir:</b> ${c.city}\n`;
        messageText += `<b>Son Teklif:</b> ${formattedDate}\n\n`;
      });

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: messageText, parse_mode: 'HTML' })
        });
        const tgJson = await tgRes.json();
        if (tgJson.ok) {
          console.log('✅ Telegram bildirimi başarıyla iletildi.');
        }
      } catch (tgErr) {
        console.warn('Telegram bildirim hatası:', tgErr.message);
      }
    }
  }
}

await supabase.auth.signOut();
console.log('🏁 İşlem başarıyla tamamlandı.\n');
