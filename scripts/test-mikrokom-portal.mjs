import https from 'https';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const opts = {
      ...options,
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, data });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testMikrokom() {
  console.log('Testing Mikrokom REST API for Outbox (Giden E-Faturalar)...');
  
  const authPayload = JSON.stringify({
    username: 'admin_007408',
    password: 'rvkDAuKh'
  });

  const authRes = await httpRequest({
    hostname: 'portal.mikrokomdonusum.com',
    port: 443,
    path: '/accounting/api/auth/signin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'User-Agent': 'Mozilla/5.0',
      'Content-Length': Buffer.byteLength(authPayload)
    }
  }, authPayload);

  const j = JSON.parse(authRes.data);
  const token = j.token?.accessToken || j.accessToken || j.token;
  console.log('Access token acquired!');

  const allOutbox = [];
  const outboxMap = new Map();
  const currentYear = new Date().getFullYear();

  for (let yr = currentYear; yr >= 2023; yr--) {
    console.log(`\n--- Fetching Giden Faturalar Year ${yr} ---`);
    for (let mo = 0; mo <= 11; mo++) {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        // Parameter format for outbox:
        // /accounting/api/outbox/getOutboxes?year=2024&month=8&page=0&size=100
        const qs = `/accounting/api/outbox/getOutboxes?year=${yr}&month=${mo}&page=${page}&size=100`;

        const res = await httpRequest({
          hostname: 'portal.mikrokomdonusum.com',
          port: 443,
          path: qs,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json;charset=UTF-8',
            'User-Agent': 'Mozilla/5.0'
          }
        });

        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            const items = data.content || [];
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
              if (invObj.invoiceNo && !outboxMap.has(invObj.invoiceNo)) {
                outboxMap.set(invObj.invoiceNo, invObj);
                allOutbox.push(invObj);
              }
            }
            if (items.length > 0) {
              console.log(`  Year ${yr} Month ${mo + 1} (Page ${page}): ${items.length} outbox invoices (Total so far: ${outboxMap.size})`);
            }
            if (items.length < 100 || (page + 1) * 100 >= (data.totalElements || 0)) {
              hasMore = false;
            } else {
              page++;
            }
          } catch (e) {
            hasMore = false;
          }
        } else {
          console.warn(`  Year ${yr} Month ${mo + 1}: Status ${res.statusCode}`);
          hasMore = false;
        }
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`TOPLAM ÇEKİLEN MARİF GİDEN FATURA SAYISI: ${allOutbox.length}`);
  console.log(`========================================`);
  if (allOutbox.length > 0) {
    console.log('Örnek en son giden 3 fatura:');
    allOutbox.slice(0, 3).forEach(inv => {
      console.log(`- ${inv.date} | ${inv.invoiceNo} | ${inv.cariName} | ${inv.amount} TL`);
    });
  }
}

testMikrokom().catch(console.error);

