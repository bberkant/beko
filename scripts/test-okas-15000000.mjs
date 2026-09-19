import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const page = await browser.newPage({
    locale: 'tr-TR',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  await page.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).webdriver;
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  await page.route('**/api/human-verification/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isRequired: false, status: 'OK', data: { isRequired: false, isVerified: true }, success: true })
    });
  });

  console.log("Testing EKAP İhaleler with OKAS 15000000...");
  await page.goto('https://ekapv2.kik.gov.tr/ekap/search', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  await page.evaluate(() => {
    const tutorial = document.querySelector('ekap-tutorial');
    if (tutorial) tutorial.remove();
    const popup = document.querySelector('#ekap-popup');
    if (popup) popup.remove();
  });

  // Uncheck Hizmet, Yapım, Danışmanlık
  const yapimBtn = page.locator('button:has-text("Yapım")').first();
  const hizmetBtn = page.locator('button:has-text("Hizmet")').first();
  const danismanlikBtn = page.locator('button:has-text("Danışmanlık")').first();
  await yapimBtn.evaluate(el => el.click()).catch(() => undefined);
  await hizmetBtn.evaluate(el => el.click()).catch(() => undefined);
  await danismanlikBtn.evaluate(el => el.click()).catch(() => undefined);
  await page.waitForTimeout(1000);

  // Set 15 days date range
  const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const today = new Date();
  const future15 = new Date(today.getTime() + (15 * 24 * 60 * 60 * 1000));
  const startStr = formatDate(today);
  const endStr = formatDate(future15);

  console.log(`Tarih: ${startStr} - ${endStr}`);
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

  // Open OKAS modal
  const okasBtn = page.locator('button:has-text("OKAS Kodu Seç"), .dx-button:has-text("OKAS Kodu Seç")').first();
  await okasBtn.click();
  await page.waitForTimeout(2000);

  const searchInput = page.locator('.dx-popup-content:visible input.dx-texteditor-input').first();
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill('15000000');
  await page.waitForTimeout(2500);

  // Click checkbox for 15000000
  const checkbox = page.locator('.dx-popup-content:visible .dx-data-row .dx-checkbox').first();
  await checkbox.click();
  await page.waitForTimeout(1000);

  const secBtn = page.locator('.dx-popup-wrapper:visible button:has-text("Seç"), .dx-popup-wrapper:visible .dx-button:has-text("Seç")').first();
  await secBtn.click();
  await page.waitForTimeout(2000);

  const filtreleBtn = page.locator('button:has-text("Filtrele"), .dx-button:has-text("Filtrele")').first();
  await filtreleBtn.evaluate(el => el.click());
  await page.waitForTimeout(6000);

  const tenderRows = await page.locator('ihale-liste-item').evaluateAll((nodes) => nodes.map((node) => ({
    ikn: node.querySelector('.ikn')?.textContent?.trim() || '',
    title: node.querySelector('.ihale')?.textContent?.trim() || '',
    institution: node.querySelector('.idare')?.textContent?.trim() || '',
    placeAndDate: node.querySelector('.forth-row .il-saat')?.textContent?.trim()
      || node.querySelector('.first-row .il-saat')?.textContent?.trim() || '',
  })));

  console.log(`İhaleler Sayfasında OKAS 15000000 ile Bulunan Toplam İhale Sayısı: ${tenderRows.length}`);
  console.log("İlk 5 ihale:", JSON.stringify(tenderRows.slice(0, 5), null, 2));

  console.log("\n------------------------------------\nTesting Doğrudan Temin with OKAS 15000000...");
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

  // Select Mal
  const malRadio = searchFrame.locator('label[for="rdIhaleTur_1"]').first();
  await malRadio.click();
  await page.waitForTimeout(1500);

  // Set Dates
  const startInput = searchFrame.locator('input[name="txtIhaleTarihFirst"]').first();
  const endInput = searchFrame.locator('input[name="txtIhaleTarihSecond"]').first();
  await startInput.fill(startStr);
  await page.waitForTimeout(300);
  await endInput.fill(endStr);
  await page.waitForTimeout(500);

  // Clear word search
  const aramaInput = searchFrame.locator('#bilgi2').first();
  await aramaInput.fill('').catch(() => undefined);

  // Click Branş Ekle
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

  // In PopUpIhaleKalemSec, find 15000000 or "Gıda"
  const navPromise = popupFrame.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => undefined);
  await popupFrame.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('a, span, label, td, tr, div'));
    let targetChk = null;
    for (const el of allElements) {
      const text = el.textContent?.trim() || '';
      if (text.includes('15000000') || text.includes('Gıda maddeleri')) {
        const row = el.closest('tr') || el.closest('li') || el.closest('div') || el.parentElement;
        targetChk = row?.querySelector('input[type="checkbox"]');
        if (targetChk) break;
      }
    }
    if (!targetChk) {
      const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      for (const chk of allCheckboxes) {
        const containerText = chk.closest('tr, li, div, td')?.textContent?.trim() || '';
        if (containerText.includes('15000000') || containerText.includes('Gıda')) {
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

  const dtResults = await searchFrame.evaluate(() => {
    const element = document.querySelector('dt-list-box');
    if (!element) return [];
    try {
      const scope = window.angular.element(element).scope();
      return scope ? scope.aramaSonuclari : [];
    } catch (e) {
      return [];
    }
  });

  console.log(`Doğrudan Temin Sayfasında OKAS 15000000 ile Bulunan Toplam Kayıt Sayısı: ${dtResults?.length || 0}`);
  if (dtResults && dtResults.length > 0) {
    console.log("İlk 5 Doğrudan Temin:", JSON.stringify(dtResults.slice(0, 5), null, 2));
  }

  await browser.close();
})();
