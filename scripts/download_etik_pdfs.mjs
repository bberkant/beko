import fs from 'fs';
import path from 'path';

const invoicesDir = path.join(process.cwd(), 'public', 'invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

const cacheFile = path.join(process.cwd(), 'public', 'data', 'etik_incoming_cache.json');
const invoices = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

// Filter Sep 2026
const targetInvoices = invoices.filter(i => {
  const d = i.date || i.receivedDate || '';
  return d.startsWith('2026-09');
});

console.log(`Starting download for ${targetInvoices.length} Etik incoming invoices (Sep 2026)...`);

let downloaded = 0;
let skipped = 0;
let failed = 0;

// Download concurrently in chunks of 5
const chunkSize = 5;
for (let i = 0; i < targetInvoices.length; i += chunkSize) {
  const chunk = targetInvoices.slice(i, i + chunkSize);
  await Promise.all(chunk.map(async (inv) => {
    const invNo = inv.invoiceNo.trim();
    const pdfPath = path.join(invoicesDir, `${invNo}.pdf`);
    if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 1000) {
      skipped++;
      return;
    }

    const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rawUuid = inv.ettn || '';
    const uuid = GUID_REGEX.test(rawUuid) ? rawUuid : '';
    const url = `https://vega-api.amasyaetas.com/api/etik/efaturalar/${encodeURIComponent(invNo)}/pdf?uuid=${encodeURIComponent(uuid)}&direction=gelen&date=${encodeURIComponent(inv.date || '')}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (res.ok && ct.includes('pdf')) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(pdfPath, buf);
        downloaded++;
        console.log(`[OK] ${invNo} (${buf.length} b)`);
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }
  }));
}

console.log(`All Done! Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`);
