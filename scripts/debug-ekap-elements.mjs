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

  console.log("Navigating to https://ekapv2.kik.gov.tr/ekap/search...");
  await page.goto('https://ekapv2.kik.gov.tr/ekap/search', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  await page.evaluate(() => {
    const tutorial = document.querySelector('ekap-tutorial');
    if (tutorial) tutorial.remove();
    const popup = document.querySelector('#ekap-popup');
    if (popup) popup.remove();
  });

  const elements = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, .dx-button, a, input, [role="button"]')).map(el => ({
      tag: el.tagName,
      text: el.innerText || el.value || el.placeholder || '',
      id: el.id,
      className: el.className,
      ariaLabel: el.getAttribute('aria-label')
    })).filter(x => x.text.trim().length > 0 || x.id || x.ariaLabel);
    return buttons;
  });

  console.log("Found buttons / clickable elements on EKAP search:", JSON.stringify(elements.slice(0, 30), null, 2));

  await page.screenshot({ path: 'dosyalar/ekap-sync/debug_ekap_search_buttons.png' });
  console.log("Saved screenshot: dosyalar/ekap-sync/debug_ekap_search_buttons.png");

  await browser.close();
})();
