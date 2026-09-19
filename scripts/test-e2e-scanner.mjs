import { chromium } from 'playwright';

async function testScan() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const page = await browser.newPage({
    locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 }
  });

  await page.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  await page.route('**/api/human-verification/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isRequired: false, status: 'OK', success: true })
    });
  });

  const today = new Date();
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const future15 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15, 23, 59, 59);
  
  const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const startStr = formatDate(today0);
  const endStr = formatDate(future15);

  console.log(`========================================`);
  console.log(`1. EKAP 4734 İHALELER TARAMASI BAŞLIYOR`);
  console.log(`Tarih: ${startStr} - ${endStr} | OKAS Kodu: 15100000 | Sadece MAL`);
  console.log(`========================================`);

  await page.goto('https://ekapv2.kik.gov.tr/ekap/search', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  await page.evaluate(() => {
    const tutorial = document.querySelector('ekap-tutorial');
    if (tutorial) tutorial.remove();
    const popup = document.querySelector('#ekap-popup');
    if (popup) popup.remove();
    
    // Deselect Yapım, Hizmet, Danışmanlık
    ['filter-button-2', 'filter-button-3', 'filter-button-4'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn && btn.classList.contains('active')) btn.click();
    });
  });
  await page.waitForTimeout(1000);

  // Tarih aralığı gir
  try {
    const tarihRadio = page.locator('.dx-radiobutton:has-text("Tarih Aralığı")');
    if (await tarihRadio.count() > 0) {
      await tarihRadio.first().evaluate(el => el.click()).catch(() => undefined);
      await page.waitForTimeout(1000);
      const startDateInput = page.locator('.dx-daterangebox:visible input[type="text"]').first();
      if (await startDateInput.isVisible().catch(() => false)) {
        await startDateInput.fill(startStr);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        await page.keyboard.type(endStr);
        await page.keyboard.press('Enter');
      }
    }
  } catch (e) {
    console.log("Tarih input hatası:", e.message);
  }

  // OKAS Kodu Seç
  console.log("OKAS Kodu Seçiliyor: 15100000...");
  const okasBtn = page.locator('.okas-button, button:has-text("OKAS Kodu Seç")').first();
  await okasBtn.waitFor({ state: 'visible', timeout: 15000 });
  await okasBtn.click();
  await page.waitForTimeout(2000);

  const searchInput = page.locator('.dx-popup-content:visible input.dx-texteditor-input').first();
  await searchInput.waitFor({ state: 'visible', timeout: 15000 });
  await searchInput.fill('15100000');
  await page.waitForTimeout(3000);

  const checkbox = page.locator('.dx-popup-content:visible .dx-data-row .dx-checkbox').first();
  await checkbox.waitFor({ state: 'visible', timeout: 10000 });
  await checkbox.click();
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const popup = document.querySelector('.dx-popup-wrapper');
    if (popup) {
      const buttons = Array.from(popup.querySelectorAll('button, .dx-button'));
      const sec = buttons.find(b => b.textContent.includes('Seç') || b.textContent.includes('SELECT') || b.getAttribute('aria-label')?.includes('Seç'));
      if (sec) sec.click();
    }
  });
  await page.waitForTimeout(2000);

  console.log("Filtrele butonuna basılıyor (#search-ihale)...");
  await page.evaluate(() => {
    const btn = document.getElementById('search-ihale');
    if (btn) btn.click();
  });
  await page.waitForTimeout(6000);

  let tenderItems = [];
  while (true) {
    const rows = await page.locator('ihale-liste-item').evaluateAll((nodes) => nodes.map((node) => ({
      ikn: node.querySelector('.ikn')?.textContent?.trim() || '',
      title: node.querySelector('.ihale')?.textContent?.trim() || '',
      institution: node.querySelector('.idare')?.textContent?.trim() || '',
      placeAndDate: node.querySelector('.forth-row .il-saat')?.textContent?.trim()
        || node.querySelector('.first-row .il-saat')?.textContent?.trim() || '',
    })));

    for (const row of rows) {
      if (!row.ikn) continue;
      const match = row.placeAndDate.match(/^(.+),\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/u);
      if (!match) continue;
      const [, city, day, month, year, hour, minute] = match;
      const deadline = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+03:00`);
      if (Number.isNaN(deadline.getTime())) continue;
      if (deadline < today0 || deadline > future15) continue;

      if (!tenderItems.some(x => x.ikn === row.ikn)) {
        tenderItems.push({
          ikn: row.ikn,
          title: row.title,
          institution: row.institution,
          city: city.trim(),
          deadline_at: deadline.toISOString(),
          scope: '4734'
        });
      }
    }

    const nextBtn = page.locator('.dx-navigate-button.dx-next-button:not(.dx-button-disable), .page-item:not(.disabled) .next-page, button[aria-label="Next page"]').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(3000);
    } else {
      break;
    }
  }

  console.log(`\nEKAP 4734 İHALELER: Toplam ${tenderItems.length} adet ihale bulundu!`);
  tenderItems.forEach((t, i) => console.log(`  ${i + 1}. [${t.ikn}] ${t.title} | ${t.institution} | ${t.deadline_at}`));

  console.log(`\n========================================`);
  console.log(`2. EKAP DOĞRUDAN TEMİN TARAMASI BAŞLIYOR`);
  console.log(`Tarih: ${startStr} - ${endStr} | OKAS Kodu: 15100000 | Sadece MAL`);
  console.log(`========================================`);

  await page.goto('https://ekapv2.kik.gov.tr/ekap-dt/search', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  let searchFrame = page.frames().find(f => f.url().includes('YeniIhaleArama.aspx'));
  if (!searchFrame) {
    for (let i = 0; i < 20; i++) {
      searchFrame = page.frames().find(f => f.url().includes('YeniIhaleArama.aspx'));
      if (searchFrame) break;
      await page.waitForTimeout(1000);
    }
  }
  if (!searchFrame) throw new Error("Doğrudan Temin frame bulunamadı!");

  // Mal seçimi
  const malRadio = searchFrame.locator('label[for="rdIhaleTur_1"]').first();
  await malRadio.waitFor({ state: 'visible', timeout: 15000 });
  await malRadio.click();
  await page.waitForTimeout(1500);

  // Tarih aralığı
  const startInput = searchFrame.locator('input[name="txtIhaleTarihFirst"]').first();
  const endInput = searchFrame.locator('input[name="txtIhaleTarihSecond"]').first();
  await startInput.fill(startStr);
  await page.waitForTimeout(300);
  await endInput.fill(endStr);
  await page.waitForTimeout(500);

  // Kelime arama temizleme
  const aramaInput = searchFrame.locator('#bilgi2').first();
  await aramaInput.fill('').catch(() => undefined);

  // Branş Ekle
  const bransEkleBtn = searchFrame.locator('a.btn-okas:has-text("Branş Ekle"), div.btn-okas:has-text("Branş Ekle")').first();
  await bransEkleBtn.click();
  await page.waitForTimeout(3000);

  let popupFrame = page.frames().find(f => f.url().includes('PopUpIhaleKalemSec.aspx'));
  if (!popupFrame) {
    for (let i = 0; i < 20; i++) {
      popupFrame = page.frames().find(f => f.url().includes('PopUpIhaleKalemSec.aspx'));
      if (popupFrame) break;
      await page.waitForTimeout(1000);
    }
  }
  if (!popupFrame) throw new Error("PopUpIhaleKalemSec.aspx bulunamadı!");

  const navPromise = popupFrame.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => undefined);
  await popupFrame.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('a, span, label, td, tr, div'));
    let targetChk = null;
    for (const el of allElements) {
      const text = el.textContent?.trim() || '';
      if (text.includes('15100000') || text.includes('Hayvansal mezbaha')) {
        const row = el.closest('tr') || el.closest('li') || el.closest('div') || el.parentElement;
        targetChk = row?.querySelector('input[type="checkbox"]');
        if (targetChk) break;
      }
    }
    if (!targetChk) {
      const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      for (const chk of allCheckboxes) {
        const containerText = chk.closest('tr, li, div, td')?.textContent?.trim() || '';
        if (containerText.includes('15100000') || containerText.includes('Hayvansal')) {
          targetChk = chk;
          break;
        }
      }
    }
    if (targetChk) targetChk.click();
  });
  await navPromise;
  await page.waitForTimeout(3000);

  popupFrame = page.frames().find(f => f.url().includes('PopUpIhaleKalemSec.aspx'));
  await popupFrame.evaluate(() => {
    if (typeof Page_Validators !== 'undefined' && Array.isArray(Page_Validators)) {
      Page_Validators.forEach(val => { if (val) val.enabled = false; });
    }
    window.Page_BlockSubmit = false;
    window.setTimeout(() => {
      __doPostBack("ctl00$ContentPlaceHolder1$btnSecilenleriAktar", "");
    }, 50);
  });
  await page.waitForTimeout(6000);

  searchFrame = page.frames().find(f => f.url().includes('YeniIhaleArama.aspx'));
  const filtreleDtBtn = searchFrame.locator('#btnFilter').first();
  await filtreleDtBtn.evaluate(el => el.click());
  await page.waitForTimeout(8000);

  const dtRawResults = await searchFrame.evaluate(() => {
    const element = document.querySelector('dt-list-box');
    if (!element) return [];
    try {
      const scope = window.angular.element(element).scope();
      return scope ? scope.aramaSonuclari : [];
    } catch (e) {
      return [];
    }
  });

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
        return new Date(year, month, day, parseInt(timeParts[0], 10), parseInt(timeParts[1], 10));
      }
    }
    return new Date(year, month, day);
  };

  let dtItems = [];
  for (const item of (dtRawResults || [])) {
    const title = item.E2 || '';
    const dtn = item.E1 || '';
    const institution = item.E3 || '';
    const city = item.E12 || '';
    const dateStr = item.E7 || '';
    if (!dtn || !title) continue;

    const deadline = parseDtDate(dateStr);
    if (!deadline) continue;
    if (deadline < today0 || deadline > future15) continue;

    dtItems.push({
      ikn: dtn,
      title,
      institution,
      city: city.trim(),
      deadline_at: deadline.toISOString(),
      scope: 'dogrudan_temin'
    });
  }

  console.log(`\nEKAP DOĞRUDAN TEMİN: Toplam ${dtItems.length} adet doğrudan temin bulundu!`);
  dtItems.forEach((t, i) => console.log(`  ${i + 1}. [${t.ikn}] ${t.title} | ${t.institution} | ${t.deadline_at}`));

  await browser.close();
}

testScan().catch(console.error);
