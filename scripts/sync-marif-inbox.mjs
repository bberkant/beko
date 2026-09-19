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
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
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
  const data = JSON.parse(authRes.data);
  return data.token?.accessToken || data.accessToken || data.token;
}

async function syncMarifGelen() {
  console.log('🔄 Mikrokom Portal uzerinden Marif Gelen faturalari cekiliyor...');
  try {
    const token = await getMikrokomToken();
    if (!token) throw new Error('Token alinamadi');

    const currentYear = new Date().getFullYear();
    const yearsToScan = [currentYear, currentYear - 1]; // Only 2 years for speed
    const invoiceMap = new Map();

    for (const yr of yearsToScan) {
      for (let mo = 0; mo <= 11; mo++) {
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
                  status: item.responseCode || (item.responseValidationState === 2 ? 'KABUL' : 'Alindi')
                };
                if (invObj.invoiceNo) invoiceMap.set(invObj.invoiceNo, invObj);
              }
              if (items.length < 100 || (page + 1) * 100 >= (j.totalElements || 0)) {
                hasMore = false;
              } else {
                page++;
              }
            } catch (e) {
              console.log('JSON error on page', page, yr, mo);
              hasMore = false;
            }
          } else {
            console.log('API Error:', res.statusCode, res.data.slice(0, 100));
            hasMore = false;
          }
        }
      }
    }

    const gelenInvoices = Array.from(invoiceMap.values());
    console.log('✅ ' + gelenInvoices.length + ' adet Gelen fatura basariyla cekildi.');

    if (gelenInvoices.length > 0) {
      console.log('📤 Supabase onbellegi guncelleniyor (sadece gelenleri var olan onbellege ekleyecegiz)...');
      
      const { data: supaData } = await supabase.from('vega_efatura_cache').select('invoices').eq('company', 'marif').single();
      
      const existing = (supaData && supaData.invoices) || [];
      const giden = existing.filter(i => i.direction === 'giden');
      
      const merged = [...giden, ...gelenInvoices];
      merged.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

      await supabase.from('vega_efatura_cache').upsert({
        company: 'marif',
        invoices: merged,
        record_count: merged.length,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company' });

      console.log('🚀 Supabase guncellendi. Toplam kayit: ' + merged.length);
    }

  } catch (err) {
    console.error('❌ Hata:', err.message);
  }
}

syncMarifGelen();
