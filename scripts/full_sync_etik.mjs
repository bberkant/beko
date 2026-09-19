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
    const soapAction = 'http://tempuri.org/' + action;
    
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
      const chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        resolve({ statusCode: res.statusCode, data: fullBuffer.toString('utf8') });
      });
    });

    req.on('error', (e) => { reject(e); });
    req.write(postData);
    req.end();
  });
}

async function getVegaSession() {
  const loginXml = '<?xml version=\"1.0\" encoding=\"utf-8\"?>' +
'<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">' +
'  <soap:Body>' +
'    <Login xmlns=\"http://tempuri.org/\">' +
'      <_Login_Request>' +
'        <UserName>' + config.username + '</UserName>' +
'        <Password>' + config.password + '</Password>' +
'        <Application_Name>Vega e-Fatura</Application_Name>' +
'        <Application_Version>5.4.12</Application_Version>' +
'      </_Login_Request>' +
'    </Login>' +
'  </soap:Body>' +
'</soap:Envelope>';

  const loginResObj = await soapRequest('Login', loginXml);
  const loginResponse = loginResObj.data;
  const sessionIdMatch = loginResponse.match(/<Session_ID>(.*?)<\/Session_ID>/);
  const securityKeyMatch = loginResponse.match(/<Security_Key>(.*?)<\/Security_Key>/);
  const ipNumberMatch = loginResponse.match(/<IP_Number>(.*?)<\/IP_Number>/);

  return {
    sessionId: sessionIdMatch ? sessionIdMatch[1] : null,
    securityKey: securityKeyMatch ? securityKeyMatch[1] : null,
    ipNumber: ipNumberMatch ? ipNumberMatch[1] : ''
  };
}

function extractTag(text, tag) {
  const open = '<' + tag;
  const oIdx = text.indexOf(open);
  if (oIdx === -1) return '';
  const closeBracket = text.indexOf('>', oIdx);
  if (closeBracket === -1) return '';
  const cIdx = text.indexOf('</' + tag + '>', closeBracket);
  if (cIdx === -1) return '';
  // Force a deep copy of substring to avoid memory leak from sliced buffer/string
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

async function fetchMonth(sess, year, month) {
  const mStr = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const start = year + '-' + mStr + '-01';
  const end = year + '-' + mStr + '-' + lastDay;

  const searchXml = '<?xml version=\"1.0\" encoding=\"utf-8\"?>' +
'<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">' +
'  <soap:Body>' +
'    <GetInvoice xmlns=\"http://tempuri.org/\">' +
'      <GetInvoiceRequest>' +
'        <Login_Request_Header>' +
'          <Session_ID>' + sess.sessionId + '</Session_ID>' +
'          <IP_Number>' + sess.ipNumber + '</IP_Number>' +
'          <Security_Key>' + sess.securityKey + '</Security_Key>' +
'        </Login_Request_Header>' +
'        <INVOICE_SEARCH_KEY>' +
'          <LIMIT>1000</LIMIT>' +
'          <LIMITSpecified>true</LIMITSpecified>' +
'          <START_DATE>' + start + 'T00:00:00</START_DATE>' +
'          <START_DATESpecified>true</START_DATESpecified>' +
'          <END_DATE>' + end + 'T23:59:59</END_DATE>' +
'          <END_DATESpecified>true</END_DATESpecified>' +
'          <READ_INCLUDED>true</READ_INCLUDED>' +
'          <READ_INCLUDEDSpecified>true</READ_INCLUDEDSpecified>' +
'          <PROCESSED_INCLUDED>true</PROCESSED_INCLUDED>' +
'          <PROCESSED_INCLUDEDSpecified>true</PROCESSED_INCLUDEDSpecified>' +
'          <DIRECTION>IN</DIRECTION>' +
'        </INVOICE_SEARCH_KEY>' +
'        <HEADER_ONLY>true</HEADER_ONLY>' +
'      </GetInvoiceRequest>' +
'    </GetInvoice>' +
'  </soap:Body>' +
'</soap:Envelope>';

  const res = await soapRequest('GetInvoice', searchXml);
  const items = parseInvoicesFromXml(res.data);
  // Allow garbage collection of raw data
  res.data = null;
  return items;
}

async function main() {
  console.log('Vega SOAP oturumu açılıyor...');
  const sess = await getVegaSession();
  console.log('Oturum ID:', sess.sessionId);

  const allInvoices = new Map();

  // 2026 yılı (Eylül'den Ocak'a)
  for (let m = 9; m >= 1; m--) {
    try {
      const items = await fetchMonth(sess, 2026, m);
      console.log('2026-' + String(m).padStart(2, '0') + ': ' + items.length + ' fatura');
      for (const inv of items) {
        allInvoices.set(inv.invoiceNo, inv);
      }
    } catch (e) {
      console.warn('2026-' + m + ' hatası:', e.message);
    }
  }

  // 2025 yılı (Aralık'tan Ocak'a)
  for (let m = 12; m >= 1; m--) {
    try {
      const items = await fetchMonth(sess, 2025, m);
      console.log('2025-' + String(m).padStart(2, '0') + ': ' + items.length + ' fatura');
      for (const inv of items) {
        allInvoices.set(inv.invoiceNo, inv);
      }
    } catch (e) {
      console.warn('2025-' + m + ' hatası:', e.message);
    }
  }

  const list = Array.from(allInvoices.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  console.log('\n=============================================');
  console.log('TOPLAM ÇEKİLEN VEGA GELEN E-FATURA: ' + list.length);
  console.log('=============================================');

  // Local dosyalara kaydet
  fs.writeFileSync('vega-api-service/etik_incoming_cache.json', JSON.stringify(list, null, 2), 'utf8');
  fs.writeFileSync('etik_incoming_cache.json', JSON.stringify(list, null, 2), 'utf8');
  console.log('Yerel JSON dosyaları güncellendi.');

  // Supabase vega_efatura_cache tablosuna da kaydet
  try {
    console.log('Supabase vega_efatura_cache güncelleniyor...');
    const sRes = await fetch(SUPABASE_URL + '/rest/v1/vega_efatura_cache', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        company: 'etik',
        invoices: list,
        record_count: list.length,
        updated_at: new Date().toISOString(),
        updated_by: 'SOAP Sync Service'
      })
    });
    console.log('Supabase kaydı tamamlandı. Durum:', sRes.status);
  } catch (err) {
    console.warn('Supabase kayıt uyarısı:', err.message);
  }

  console.log('\nÖrnek son 5 gelen fatura:');
  list.slice(0, 5).forEach((inv, i) => {
    console.log((i+1) + '. ' + inv.invoiceNo + ' | ' + inv.date + ' | ' + inv.cariName + ' | ' + inv.amount + ' TL | ' + inv.status);
  });
}

main().catch(console.error);
