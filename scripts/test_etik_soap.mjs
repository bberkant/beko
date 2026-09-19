import https from 'https';
import crypto from 'crypto';

const config = {
  username: 'admin_005857',
  password: '4fq8BICM'
};

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
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve({ statusCode: res.statusCode, data }); });
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
      const openTag = '<' + tag;
      const oIdx = chunk.indexOf(openTag);
      if (oIdx === -1) return '';
      const closeBracket = chunk.indexOf('>', oIdx);
      if (closeBracket === -1) return '';
      const cIdx = chunk.indexOf('</' + tag + '>', closeBracket);
      if (cIdx === -1) return '';
      return chunk.substring(closeBracket + 1, cIdx);
    };

    const invNo = getField('ID');
    if (invNo) {
      list.push({
        invoiceNo: invNo,
        ettn: getField('UUID'),
        supplier: getField('SUPPLIER'),
        sender: getField('SENDER'),
        issueDate: getField('ISSUE_DATE'),
        cdate: getField('CDATE'),
        amount: parseFloat(getField('PAYABLE_AMOUNT') || '0'),
        profileId: getField('PROFILEID'),
        status: getField('GIB_STATUS_DESCRIPTION')
      });
    }
  }
  return list;
}

async function main() {
  console.log('Logging in to Vega SOAP...');
  const sess = await getVegaSession();
  console.log('Session ID:', sess.sessionId);

  const ranges = [
    ['2026-09-01', '2026-09-30'],
    ['2026-08-01', '2026-08-31'],
    ['2026-07-01', '2026-07-31'],
    ['2026-06-01', '2026-06-30'],
    ['2026-05-01', '2026-05-31'],
    ['2026-04-01', '2026-04-30'],
    ['2026-03-01', '2026-03-31'],
    ['2026-02-01', '2026-02-28'],
    ['2026-01-01', '2026-01-31'],
    ['2025-10-01', '2025-12-31'],
    ['2025-01-01', '2025-09-30']
  ];

  const allMap = new Map();

  for (const [start, end] of ranges) {
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
    console.log('Range [' + start + ' .. ' + end + ']: found ' + items.length + ' invoices');
    for (const inv of items) {
      allMap.set(inv.invoiceNo, inv);
    }
  }

  console.log('\n=== Total unique incoming invoices found: ' + allMap.size + ' ===');
  const sorted = Array.from(allMap.values()).sort((a, b) => new Date(b.issueDate || b.cdate).getTime() - new Date(a.issueDate || a.cdate).getTime());
  console.log('\nTop 20 most recent invoices:');
  sorted.slice(0, 20).forEach((inv, i) => {
    console.log((i+1) + '. [' + inv.invoiceNo + '] Date: ' + (inv.issueDate || inv.cdate) + ' | Supplier: ' + inv.supplier + ' | Amount: ' + inv.amount + ' TL | Status: ' + inv.status);
  });
}

main().catch(console.error);
