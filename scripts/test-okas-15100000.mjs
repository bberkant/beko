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

  // Calculate exact date range (today 00:00:00 to +15 days 23:59:59)
  const today = new Date();
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const future15 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15, 23, 59, 59);
  
  const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const startStr = formatDate(today0);
  const endStr = formatDate(future15);

  console.log(`\n=== 1. EKAP İHALELER TARAMASI (Tarih: ${startStr} - ${endStr}, OKAS: 15100000) ===`);
  await page.goto('https://ekapv2.kik.gov.tr/ekap/search', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);

  await page.evaluate(() => {
    const tutorial = document.querySelector('ekap-tutorial');
    if (tutorial) tutorial.remove();
    const popup = document.querySelector('#ekap-popup');
    if (popup) popup.remove();
  });

  // Uncheck Hizmet, Yapım, Danışmanlık - leaving ONLY Mal
  const yapimBtn = page.locator('button:has-text("Yapım")').first();
  const hizmetBtn = page.locator('button:has-text("Hizmet")').first();
  const danismanlikBtn = page.locator('button:has-text("Danışmanlık")').first();
  await yapimBtn.evaluate(el => el.click()).catch(() => undefined);
  await hizmetBtn.evaluate(el => el.click()).catch(() => undefined);
  await danismanlikBtn.evaluate(el => el.click()).catch(() => undefined);
  await page.waitForTimeout(1000);

  // Set Date Range
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

  // Select OKAS 15100000
  const okasBtn = page.locator('button:has-text("OKAS Kodu Seç"), .dx-button:has-text("OKAS Kodu Seç")').first();
  await okasBtn.click();
  await page.waitForTimeout(2000);

  const searchInput = page.locator('.dx-popup-content:visible input.dx-texteditor-input').first();
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill('15100000');
  await page.waitForTimeout(2500);

  const checkbox = page.locator('.dx-popup-content:visible .dx-data-row .dx-checkbox').first();
  await checkbox.click();
  await page.waitForTimeout(1000);

  const secBtn = page.locator('.dx-popup-wrapper:visible button:has-text("Seç"), .dx-popup-wrapper:visible .dx-button:has-text("Seç")').first();
  await secBtn.click();
  await page.waitForTimeout(2000);

  const filtreleBtn = page.locator('button:has-text("Filtrele"), .dx-button:has-text("Filtrele")').first();
  await filtreleBtn.evaluate(el => el.click());
  await page.waitForTimeout(6000);

  // Check pagination / total results on EKAP Search
  const paginationInfo = await page.evaluate(() => {
    const pager = document.querySelector('.dx-pager, .dx-pagination, ekap-pagination, .pagination');
    const totalCountEl = document.querySelector('.total-count, .result-count, .dx-info');
    const items = Array.from(document.querySelectorAll('ihale-liste-item'));
    return {
      itemsCount: items.length,
      pagerExists: !!pager,
      pagerText: pager ? pager.textContent : '',
      totalText: totalCountEl ? totalCountEl.textContent : '',
      bodyTextSnippet: document.body.innerText.substring(0, 500)
    };
  });
  console.log("EKAP İhale Listesi Bilgisi:", paginationInfo);

  // If there are multiple pages or next buttons, let's collect all
  let allTenderRows = [];
  let pageIndex = 1;
  while (true) {
    const rows = await page.locator('ihale-liste-item').evaluateAll((nodes) => nodes.map((node) => ({
      ikn: node.querySelector('.ikn')?.textContent?.trim() || '',
      title: node.querySelector('.ihale')?.textContent?.trim() || '',
      institution: node.querySelector('.idare')?.textContent?.trim() || '',
      placeAndDate: node.querySelector('.forth-row .il-saat')?.textContent?.trim()
        || node.querySelector('.first-row .il-saat')?.textContent?.trim() || '',
    })));

    for (const r of rows) {
      if (r.ikn && !allTenderRows.some(x => x.ikn === r.ikn)) {
        allTenderRows.push(r);
      }
    }

    // Check if there is a next page button
    const nextBtn = page.locator('.dx-navigate-button.dx-next-button:not(.dx-button-disable), .page-item:not(.disabled) .next-page, button[aria-label="Next page"], button.next-page').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      console.log(`Sayfa ${pageIndex + 1}'e geçiliyor...`);
      await nextBtn.click();
      await page.waitForTimeout(3000);
      pageIndex++;
    } else {
      break;
    }
  }

  console.log(`\nEKAP İHALELER TOPLAM BULUNAN (${startStr} - ${endStr}, OKAS: 15100000): ${allTenderRows.length} adet`);
  allTenderRows.forEach((r, idx) => {
    console.log(`  ${idx + 1}. [${r.ikn}] ${r.title} | ${r.institution} | ${r.placeAndDate}`);
  });

  console.log(`\n=== 2. EKAP DOĞRUDAN TEMİN TARAMASI (Tarih: ${startStr} - ${endStr}, OKAS: 15100000) ===`);
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

  // Find 15100000 (Hayvansal mezbaha ürünleri, et ve et ürünleri)
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

  console.log(`\nEKAP DOĞRUDAN TEMİN TOPLAM BULUNAN (${startStr} - ${endStr}, OKAS: 15100000): ${dtResults?.length || 0} adet`);
  if (dtResults && dtResults.length > 0) {
    dtResults.forEach((r, idx) => {
      console.log(`  ${idx + 1}. [${r.E1}] ${r.E2} | ${r.E3} | ${r.E7} (${r.E12})`);
    });
  }

  await browser.close();
})();
