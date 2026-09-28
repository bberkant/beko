import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zubhjybqzcpplultpsgt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT };
    const req = https.request(opts, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ statusCode: res.statusCode, data: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getMikrokomToken() {
  const authPayload = JSON.stringify({ username: 'admin_007408', password: 'rvkDAuKh' });
  const authRes = await httpRequest({
    hostname: 'portal.mikrokomdonusum.com',
    path: '/accounting/api/auth/signin',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(authPayload) }
  }, authPayload);

  const authData = JSON.parse(authRes.data.toString());
  return authData.token?.accessToken || authData.accessToken || authData.token;
}

export async function downloadMarifMedia(limit = 150) {
  console.log('🚀 Marif faturalarının resmi PDF ve HTML dosyaları Mikrokom\'dan indiriliyor...');
  const token = await getMikrokomToken();
  if (!token) {
    console.error('Mikrokom token alınamadı.');
    return;
  }

  const { data } = await supabase.from('vega_efatura_cache').select('invoices').eq('company', 'marif').single();
  const invoices = data?.invoices || [];
  
  // Sort descending by date, filter to 2026 invoices
  const activeInvoices = invoices
    .filter(i => (i.date || '').startsWith('2026') && i.ettn && i.invoiceNo)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, limit);

  console.log(`Toplam ${activeInvoices.length} adet 2026 Marif faturası işleniyor...`);

  const publicInvoicesDir = path.join(process.cwd(), 'public', 'invoices');
  const pdfCacheDir = path.join(process.cwd(), 'vega-api-service', 'pdf_cache');
  if (!fs.existsSync(publicInvoicesDir)) fs.mkdirSync(publicInvoicesDir, { recursive: true });
  if (!fs.existsSync(pdfCacheDir)) fs.mkdirSync(pdfCacheDir, { recursive: true });

  let downloadedCount = 0;

  for (const inv of activeInvoices) {
    const invNo = inv.invoiceNo.trim();
    const pdfPublic = path.join(publicInvoicesDir, `${invNo}.pdf`);
    const htmlPublic = path.join(publicInvoicesDir, `${invNo}.html`);
    const xmlPublic = path.join(publicInvoicesDir, `${invNo}.xml`);

    const hasPdf = fs.existsSync(pdfPublic);
    const hasHtml = fs.existsSync(htmlPublic);
    const hasXml = fs.existsSync(xmlPublic);

    if (hasPdf && hasHtml && hasXml) {
      continue;
    }

    const d = new Date(inv.date || inv.receivedDate || Date.now());
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed for Mikrokom API

    const postData = JSON.stringify({
      documentUuid: inv.ettn,
      year: year,
      month: month
    });

    const basePath = inv.direction === 'gelen' ? '/inbox/downloadMedia' : '/outbox/downloadMedia';

    // 1. PDF
    if (!hasPdf) {
      try {
        const res = await httpRequest({
          hostname: 'portal.mikrokomdonusum.com',
          path: `/accounting/api${basePath}/pdf`,
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=UTF-8',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, postData);

        if (res.statusCode === 200 && res.data.length > 500) {
          fs.writeFileSync(pdfPublic, res.data);
          fs.writeFileSync(path.join(pdfCacheDir, `${invNo}.pdf`), res.data);
          downloadedCount++;
        }
      } catch (e) {
        console.warn(`[PDF] ${invNo} indirilemedi:`, e.message);
      }
    }

    // 2. HTML
    if (!hasHtml) {
      try {
        const res = await httpRequest({
          hostname: 'portal.mikrokomdonusum.com',
          path: `/accounting/api${basePath}/html`,
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=UTF-8',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, postData);

        if (res.statusCode === 200 && res.data.length > 500) {
          fs.writeFileSync(htmlPublic, res.data);
        }
      } catch (e) {
        console.warn(`[HTML] ${invNo} indirilemedi:`, e.message);
      }
    }

    // 3. XML
    if (!hasXml) {
      try {
        const res = await httpRequest({
          hostname: 'portal.mikrokomdonusum.com',
          path: `/accounting/api${basePath}/xml`,
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=UTF-8',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, postData);

        if (res.statusCode === 200 && res.data.length > 500) {
          fs.writeFileSync(xmlPublic, res.data);
        }
      } catch (e) {
        console.warn(`[XML] ${invNo} indirilemedi:`, e.message);
      }
    }

    // Small delay to be polite to Mikrokom API
    await new Promise(r => setTimeout(r, 60));
  }

  console.log(`✅ Tamamlandı: ${downloadedCount} yeni fatura medyası public/invoices klasörüne kaydedildi.`);
}

if (process.argv[1]?.includes('download_marif_pdfs')) {
  downloadMarifMedia(120).then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
