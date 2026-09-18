import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const config = {
  username: 'admin_005857',
  password: '4fq8BICM'
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zubhjybqzcpplultpsgt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG';

function soapRequest(action, body, host = 'integration.vegayazilim.com.tr') {
  return new Promise((resolve, reject) => {
    const postData = body;
    const p = '/integration.asmx';
    const soapAction = `http://tempuri.org/${action}`;
    
    const options = {
      hostname: host,
      port: 443,
      path: p,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
        'Content-Length': Buffer.byteLength(postData)
      },
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        const full = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode, data: full });
      });
    });

    req.on('error', (e) => { reject(e); });
    req.write(postData);
    req.end();
  });
}

let session = null;
async function getVegaSession() {
  if (session) return session;
  const loginXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Login xmlns="http://tempuri.org/">
      <_Login_Request>
        <UserName>${config.username}</UserName>
        <Password>${config.password}</Password>
        <Application_Name>Vega e-Fatura</Application_Name>
        <Application_Version>5.4.12</Application_Version>
      </_Login_Request>
    </Login>
  </soap:Body>
</soap:Envelope>`;

  const loginResObj = await soapRequest('Login', loginXml);
  const loginResponse = loginResObj.data;
  const sessionIdMatch = loginResponse.match(/<Session_ID>(.*?)<\/Session_ID>/);
  const securityKeyMatch = loginResponse.match(/<Security_Key>(.*?)<\/Security_Key>/);
  const ipNumberMatch = loginResponse.match(/<IP_Number>(.*?)<\/IP_Number>/);

  session = {
    sessionId: sessionIdMatch ? sessionIdMatch[1] : null,
    securityKey: securityKeyMatch ? securityKeyMatch[1] : null,
    ipNumber: ipNumberMatch ? ipNumberMatch[1] : ''
  };
  return session;
}

function extractTag(text, tag) {
  const open = `<${tag}`;
  const oIdx = text.indexOf(open);
  if (oIdx === -1) return '';
  const closeBracket = text.indexOf('>', oIdx);
  if (closeBracket === -1) return '';
  const cIdx = text.indexOf(`</${tag}>`, closeBracket);
  if (cIdx === -1) return '';
  return (' ' + text.substring(closeBracket + 1, cIdx)).slice(1).trim();
}

function parseInvoicesFromXml(xmlStr) {
  const list = [];
  let pos = 0;
  while (true) {
    const startIdx = xmlStr.indexOf('<INVOICE>', pos);
    if (startIdx === -1) break;
    const endIdx = xmlStr.indexOf('</INVOICE>', startIdx);
    if (endIdx === -1) break;

    const chunk = xmlStr.substring(startIdx + 9, endIdx);
    pos = endIdx + 10;

    const invNo = extractTag(chunk, 'ID');
    if (invNo) {
      list.push({
        invoiceNo: invNo,
        ettn: extractTag(chunk, 'UUID'),
        cariName: extractTag(chunk, 'SUPPLIER') || 'Bilinmeyen Cari',
        vkn: extractTag(chunk, 'SENDER'),
        cariCode: extractTag(chunk, 'SENDER'),
        date: extractTag(chunk, 'ISSUE_DATE') || extractTag(chunk, 'CDATE'),
        receivedDate: extractTag(chunk, 'CDATE'),
        amount: parseFloat(extractTag(chunk, 'PAYABLE_AMOUNT') || '0'),
        matrah: parseFloat(extractTag(chunk, 'PAYABLE_AMOUNT') || '0'),
        kdv: 0,
        direction: 'gelen',
        type: extractTag(chunk, 'PROFILEID') || 'e-Fatura',
        profile: extractTag(chunk, 'PROFILEID') || 'TEMELFATURA',
        status: extractTag(chunk, 'GIB_STATUS_DESCRIPTION') || 'Alındı'
      });
    }
  }
  return list;
}

async function fetchChunk(startDate, endDate) {
  const sess = await getVegaSession();
  const searchXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetInvoice xmlns="http://tempuri.org/">
      <GetInvoiceRequest>
        <Login_Request_Header>
          <Session_ID>${sess.sessionId}</Session_ID>
          <IP_Number>${sess.ipNumber}</IP_Number>
          <Security_Key>${sess.securityKey}</Security_Key>
        </Login_Request_Header>
        <INVOICE_SEARCH_KEY>
          <LIMIT>1000</LIMIT>
          <LIMITSpecified>true</LIMITSpecified>
          <START_DATE>${startDate}T00:00:00</START_DATE>
          <START_DATESpecified>true</START_DATESpecified>
          <END_DATE>${endDate}T23:59:59</END_DATE>
          <END_DATESpecified>true</END_DATESpecified>
          <READ_INCLUDED>true</READ_INCLUDED>
          <READ_INCLUDEDSpecified>true</READ_INCLUDEDSpecified>
          <PROCESSED_INCLUDED>true</PROCESSED_INCLUDED>
          <PROCESSED_INCLUDEDSpecified>true</PROCESSED_INCLUDEDSpecified>
          <DIRECTION>IN</DIRECTION>
        </INVOICE_SEARCH_KEY>
        <HEADER_ONLY>true</HEADER_ONLY>
      </GetInvoiceRequest>
    </GetInvoice>
  </soap:Body>
</soap:Envelope>`;

  const res = await soapRequest('GetInvoice', searchXml);
  const items = parseInvoicesFromXml(res.data);
  res.data = null;
  return items;
}

export async function syncEtikIncomingInvoices(isFull = false) {
  console.log('🔄 Etik Gelen Faturaları Vega SOAP Entegratöründen güncelleniyor...');
  const now = new Date();
  
  const chunks = [];
  const yr = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (isFull) {
    // 2026 all months
    for (let m = currentMonth; m >= 1; m--) {
      const mStr = String(m).padStart(2, '0');
      const lastDay = new Date(yr, m, 0).getDate();
      chunks.push([`${yr}-${mStr}-01`, `${yr}-${mStr}-15`]);
      chunks.push([`${yr}-${mStr}-16`, `${yr}-${mStr}-${lastDay}`]);
    }
    // 2025 all months
    for (let m = 12; m >= 1; m--) {
      const mStr = String(m).padStart(2, '0');
      const lastDay = new Date(2025, m, 0).getDate();
      chunks.push([`2025-${mStr}-01`, `2025-${mStr}-15`]);
      chunks.push([`2025-${mStr}-16`, `2025-${mStr}-${lastDay}`]);
    }
  } else {
    // Recent 90 days
    for (let i = 0; i < 3; i++) {
      let m = currentMonth - i;
      let y = yr;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      const mStr = String(m).padStart(2, '0');
      const lastDay = new Date(y, m, 0).getDate();
      chunks.push([`${y}-${mStr}-01`, `${y}-${mStr}-15`]);
      chunks.push([`${y}-${mStr}-16`, `${y}-${mStr}-${lastDay}`]);
    }
  }

  const newInvoices = [];
  for (const [start, end] of chunks) {
    try {
      const items = await fetchChunk(start, end);
      console.log(`  [${start} .. ${end}] -> ${items.length} fatura`);
      newInvoices.push(...items);
    } catch (e) {
      console.warn(`Etik chunk ${start}..${end} error:`, e.message);
    }
  }

  // Load existing local cache
  let existingInvoices = [];
  const localCachePaths = [
    path.join(process.cwd(), 'vega-api-service', 'etik_incoming_cache.json'),
    path.join(process.cwd(), 'etik_incoming_cache.json')
  ];
  for (const p of localCachePaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(data) && data.length > existingInvoices.length) {
          existingInvoices = data;
        }
      } catch (e) {}
    }
  }

  const map = new Map();
  for (const inv of existingInvoices) {
    if (inv && inv.invoiceNo) map.set(inv.invoiceNo, inv);
  }
  for (const inv of newInvoices) {
    if (inv && inv.invoiceNo) map.set(inv.invoiceNo, inv);
  }

  const merged = Array.from(map.values()).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  // Save to local JSON files
  for (const p of localCachePaths) {
    try {
      fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf8');
    } catch (e) {}
  }

  // Save to Supabase vega_efatura_cache
  try {
    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/vega_efatura_cache`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        company: 'etik',
        invoices: merged,
        record_count: merged.length,
        updated_at: new Date().toISOString(),
        updated_by: 'SOAP Sync Service'
      })
    });
    console.log(`✅ Etik Gelen Faturalar senkronize edildi. Toplam: ${merged.length} (Supabase HTTP: ${sRes.status})`);
  } catch (err) {
    console.warn('Supabase kayıt uyarısı:', err.message);
  }

  return merged;
}

if (process.argv[1]?.includes('sync-etik-inbox')) {
  const isFull = process.argv.includes('--full');
  syncEtikIncomingInvoices(isFull).then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
