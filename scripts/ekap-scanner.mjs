import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

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

const searchTerms = ['kırmızı et', 'dana eti', 'sığır eti', 'kuzu eti', 'koyun eti', 'karkas et', 'et ve et ürünleri'];
const meatPattern = /(kırmızı\s+et|dana\s+eti?|sığır\s+eti?|kuzu\s+eti?|koyun\s+eti?|karkas\s+et|et\s+ve\s+et\s+ürünleri)/iu;
const scanStartedAt = new Date();
const scanEndsAt = new Date(scanStartedAt.getTime() + (90 * 24 * 60 * 60 * 1000));
const found = new Map();
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  const page = await browser.newPage({ locale: 'tr-TR' });
  await page.goto('https://ekapv2.kik.gov.tr/ekap/search', { waitUntil: 'domcontentloaded', timeout: 90000 });
  const search = page.locator('#search-by-word input');
  await search.waitFor({ state: 'visible', timeout: 90000 });

  for (const term of searchTerms) {
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
} finally {
  await browser.close();
}

const candidates = [...found.values()];
if (candidates.length) {
  const { error } = await supabase.from('ekap_candidates').upsert(candidates, {
    onConflict: 'organization_id,ikn',
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

console.log(`EKAP taraması tamamlandı. Önümüzdeki 90 gün içinde ${candidates.length} uygun ihale bulundu.`);
await supabase.auth.signOut();
