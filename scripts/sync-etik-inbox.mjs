import https from 'https';
import crypto from 'crypto';
import fs from 'fs';

const config = {
  username: 'admin_005857',
  password: '4fq8BICM'
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zubhjybqzcpplultpsgt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG';

function soapRequest(action, body, host = 'integration.vegayazilim.com.tr') {
  return new Promise((resolve, reject) => {
    const postData = body;
    const path = '/integration.asmx';
    const soapAction = `http://tempuri.org/${action}`;
    
    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
        'Content-Length': Buffer.byteLength(postData)
      },
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve({ statusCode: res.statusCode, data }); });
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
    sessionId: sessionIdMatch[1],
    securityKey: securityKeyMatch[1],
    ipNumber: ipNumberMatch ? ipNumberMatch[1] : ''
  };
  return session;
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

    const getField = (tag) => {
      const openTag = `<${tag}`;
      const oIdx = chunk.indexOf(openTag);
      if (oIdx === -1) return '';
      const closeBracket = chunk.indexOf('>', oIdx);
      if (closeBracket === -1) return '';
      const cIdx = chunk.indexOf(`</${tag}>`, closeBracket);
      if (cIdx === -1) return '';
      return chunk.substring(closeBracket + 1, cIdx);
    };

    const invNo = getField('ID');
    if (invNo) {
      list.push({
        invoiceNo: invNo,
        ettn: getField('UUID'),
        cariName: getField('SUPPLIER') || 'Bilinmeyen Cari',
        vkn: getField('SENDER'),
        cariCode: getField('SENDER'),
        date: getField('ISSUE_DATE') || getField('CDATE'),
        receivedDate: getField('CDATE'),
        amount: parseFloat(getField('PAYABLE_AMOUNT') || '0'),
        matrah: parseFloat(getField('PAYABLE_AMOUNT') || '0'),
        kdv: 0,
        direction: 'gelen',
        type: getField('PROFILEID') || 'e-Fatura',
        profile: getField('PROFILEID') || 'TEMELFATURA',
        status: getField('GIB_STATUS_DESCRIPTION') || 'Alındı'
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
  return parseInvoicesFromXml(res.data);
}

export async function syncEtikIncomingInvoices() {
  console.log('🔄 Etik Gelen Faturalari Vega SOAP Entegratöründen güncelleniyor...');
  const now = new Date();
  
  // Recent 60 days
  const chunks = [];
  const yr = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? yr - 1 : yr;

  chunks.push([`${prevYear}-${String(prevMonth).padStart(2, '0')}-01`, `${prevYear}-${String(prevMonth).padStart(2, '0')}-15`]);
  chunks.push([`${prevYear}-${String(prevMonth).padStart(2, '0')}-16`, `${prevYear}-${String(prevMonth).padStart(2, '0')}-${new Date(prevYear, prevMonth, 0).getDate()}`]);
  chunks.push([`${yr}-${String(currentMonth).padStart(2, '0')}-01`, `${yr}-${String(currentMonth).padStart(2, '0')}-15`]);
  chunks.push([`${yr}-${String(currentMonth).padStart(2, '0')}-16`, `${yr}-${String(currentMonth).padStart(2, '0')}-${new Date(yr, currentMonth, 0).getDate()}`]);

  const newInvoices = [];
  for (const [start, end] of chunks) {
    try {
      const items = await fetchChunk(start, end);
      newInvoices.push(...items);
    } catch (e) {
      console.warn(`Etik chunk ${start}..${end} error:`, e.message);
    }
  }

  if (newInvoices.length > 0) {
    // Get existing Supabase cache
    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/vega_efatura_cache?company=eq.etik&select=invoices`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    let currentInvoices = [];
    try {
      const json = await getRes.json();
      if (json && json[0] && Array.isArray(json[0].invoices)) {
        currentInvoices = json[0].invoices;
      }
    } catch (e) {}

    const map = new Map();
    for (const inv of currentInvoices) {
      if (inv.invoiceNo) map.set(inv.invoiceNo, inv);
    }
    for (const inv of newInvoices) {
      if (inv.invoiceNo) map.set(inv.invoiceNo, inv);
    }

    const merged = Array.from(map.values()).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    await fetch(`${SUPABASE_URL}/rest/v1/vega_efatura_cache`, {
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
        updated_at: new Date().toISOString()
      })
    });

    console.log(`✅ Etik Gelen Faturalar senkronize edildi. Toplam: ${merged.length}`);
  }
}

if (process.argv[1]?.includes('sync-etik-inbox')) {
  syncEtikIncomingInvoices();
}
