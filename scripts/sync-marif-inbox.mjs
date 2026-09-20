import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zubhjybqzcpplultpsgt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const opts = { ...options, secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

let cachedMikrokomToken = null;
let tokenExpiresAt = 0;

export async function getMikrokomToken() {
  if (cachedMikrokomToken && Date.now() < tokenExpiresAt) {
    return cachedMikrokomToken;
  }
  const authPayload = JSON.stringify({ username: 'admin_007408', password: 'rvkDAuKh' });
  const authRes = await httpRequest({
    hostname: 'portal.mikrokomdonusum.com',
    path: '/accounting/api/auth/signin',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(authPayload) }
  }, authPayload);
  const data = JSON.parse(authRes.data);
  cachedMikrokomToken = data.token?.accessToken || data.accessToken || data.token;
  tokenExpiresAt = Date.now() + 3600000;
  return cachedMikrokomToken;
}

export async function syncMarifIncomingInvoices(isFull = false) {
  console.log('🔄 Mikrokom Portal üzerinden Marif e-Faturaları çekiliyor...');
  try {
    const token = await getMikrokomToken();
    if (!token) throw new Error('Mikrokom token alınamadı');

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed

    // Yıl ve ay listesi oluştur
    let scanMonths = [];
    if (isFull) {
      const yearsToScan = [currentYear, currentYear - 1, 2024, 2023];
      for (const yr of yearsToScan) {
        for (let mo = 0; mo <= 11; mo++) {
          scanMonths.push({ yr, mo });
        }
      }
    } else {
      // Son 4 ayı tara (güncel + geçmiş aylar)
      for (let i = 0; i < 4; i++) {
        let mo = currentMonth - i;
        let yr = currentYear;
        if (mo < 0) {
          mo += 12;
          yr -= 1;
        }
        scanMonths.push({ yr, mo });
      }
      // Ayrıca geçen yılın son ayını da ekle (yıl devirleri için)
      scanMonths.push({ yr: currentYear - 1, mo: 11 });
    }

    const localCachePaths = [
      path.join(process.cwd(), 'vega-api-service', 'marif_incoming_cache.json'),
      path.join(process.cwd(), 'marif_incoming_cache.json')
    ];

    // Mevcut önbelleği oku
    const invoiceMap = new Map();
    for (const p of localCachePaths) {
      if (fs.existsSync(p)) {
        try {
          const prev = JSON.parse(fs.readFileSync(p, 'utf8')) || [];
          for (const inv of prev) {
            if (inv && inv.invoiceNo) invoiceMap.set(inv.invoiceNo, inv);
          }
        } catch (e) {}
      }
    }

    // 1. INBOX (GELEN FATURALAR)
    for (const { yr, mo } of scanMonths) {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const qs = `/accounting/api/inbox/getInboxes?year=${yr}&month=${mo}&headerSearch=&notInList=false&documentIds=&multipleVkn=&chemistWarehouseFilter=ALL&page=${page}&size=100&sort=receivedDate,desc&isArchive=0`;
        const res = await httpRequest({
          hostname: 'portal.mikrokomdonusum.com',
          path: qs,
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });

        if (res.statusCode === 200) {
          try {
            const j = JSON.parse(res.data);
            const items = j.content || [];
            for (const item of items) {
              const invObj = {
                id: item.recordId,
                invoiceNo: item.documentId,
                ettn: item.documentUuid,
                year: yr,
                date: item.documentIssueDate || item.receivedDate,
                receivedDate: item.receivedDate,
                cariCode: item.sourceId || '',
                vkn: item.sourceId || '',
                cariName: item.sourceTitle || 'Bilinmeyen Cari',
                matrah: item.taxExclusiveAmount != null ? Number(item.taxExclusiveAmount) : (Number(item.invoiceTotal || 0) - Number(item.taxTotalAmount || 0)),
                kdv: Number(item.taxTotalAmount || 0),
                amount: Number(item.taxInclusiveAmount || item.invoiceTotal || 0),
                direction: 'gelen',
                type: item.documentProfile || 'e-Fatura',
                profile: item.documentProfile || 'TEMELFATURA',
                status: item.responseCode || (item.responseValidationState === 2 ? 'KABUL' : 'Alındı')
              };
              if (invObj.invoiceNo) invoiceMap.set(invObj.invoiceNo, invObj);
            }
            if (items.length < 100 || (page + 1) * 100 >= (j.totalElements || 0)) {
              hasMore = false;
            } else {
              page++;
            }
          } catch (e) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
    }

    // 2. OUTBOX (GİDEN FATURALAR - Mikrokom Portal)
    for (const { yr, mo } of scanMonths) {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const qs = `/accounting/api/outbox/getOutboxes?year=${yr}&month=${mo}&page=${page}&size=100`;
        const res = await httpRequest({
          hostname: 'portal.mikrokomdonusum.com',
          path: qs,
          method: 'GET',
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });

        if (res.statusCode === 200) {
          try {
            const j = JSON.parse(res.data);
            const items = j.content || [];
            for (const item of items) {
              const invObj = {
                id: item.recordId,
                invoiceNo: item.documentId,
                ettn: item.documentUuid,
                year: yr,
                date: item.documentIssueDate || item.receivedDate,
                receivedDate: item.receivedDate,
                cariCode: item.destinationId || '',
                vkn: item.destinationId || '',
                cariName: item.destinationTitle || 'Bilinmeyen Cari',
                matrah: item.taxExclusiveAmount != null ? Number(item.taxExclusiveAmount) : (Number(item.invoiceTotal || 0) - Number(item.taxTotalAmount || 0)),
                kdv: Number(item.taxTotalAmount || 0),
                amount: Number(item.taxInclusiveAmount || item.invoiceTotal || 0),
                direction: 'giden',
                type: item.documentProfile || 'e-Fatura',
                profile: item.documentProfile || 'TEMELFATURA',
                status: item.resultExplanation || item.responseCode || (item.processState === 500 ? 'Başarılı' : 'Gönderildi')
              };
              if (invObj.invoiceNo) invoiceMap.set(invObj.invoiceNo, invObj);
            }
            if (items.length < 100 || (page + 1) * 100 >= (j.totalElements || 0)) {
              hasMore = false;
            } else {
              page++;
            }
          } catch (e) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
    }

    const merged = Array.from(invoiceMap.values()).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    const gelenCount = merged.filter(i => i.direction === 'gelen').length;
    const gidenCount = merged.filter(i => i.direction === 'giden').length;
    console.log(`✅ Marif Faturaları hazırlandı: Toplam ${merged.length} (Gelen: ${gelenCount}, Giden: ${gidenCount})`);

    // Yerel önbellek JSON dosyalarını güncelle
    for (const p of localCachePaths) {
      try {
        fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf8');
      } catch (e) {}
    }

    // Supabase vega_efatura_cache tablosuna kaydet
    if (merged.length > 0) {
      try {
        const { error } = await supabase.from('vega_efatura_cache').upsert({
          company: 'marif',
          invoices: merged,
          record_count: merged.length,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company' });

        if (error) {
          console.warn('Supabase kayıt uyarısı:', error.message);
        } else {
          console.log(`🚀 Supabase vega_efatura_cache (marif) güncellendi. Toplam: ${merged.length}`);
        }
      } catch (sErr) {
        console.warn('Supabase bağlantı hatası:', sErr.message);
      }
    }

    return merged;
  } catch (err) {
    console.error('❌ Marif Senkronizasyon Hatası:', err.message);
    return [];
  }
}

if (process.argv[1]?.includes('sync-marif-inbox')) {
  const isFull = process.argv.includes('--full');
  syncMarifIncomingInvoices(isFull).then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
