import https from 'https';
import crypto from 'crypto';

function soapRequest(action, body, host = 'portal1.edmbilisim.com.tr') {
  return new Promise((resolve, reject) => {
    const postData = body;
    const path = '/EFaturaEDM/EFaturaEDM.svc';
    
    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': action,
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

async function testEdm() {
  console.log('Testing EDM Bilişim SOAP Login with direct SOAPAction...');
  const actionDate = new Date().toISOString();
  const loginXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:LoginRequest>
         <tem:REQUEST_HEADER>
            <tem:ACTION_DATE>${actionDate}</tem:ACTION_DATE>
            <tem:REASON>Login</tem:REASON>
            <tem:APPLICATION_NAME>GMSNet</tem:APPLICATION_NAME>
            <tem:HOSTNAME>GMSNet</tem:HOSTNAME>
            <tem:CHANNEL_NAME>GMSNet</tem:CHANNEL_NAME>
            <tem:COMPRESSED>N</tem:COMPRESSED>
         </tem:REQUEST_HEADER>
         <tem:USER_NAME>admin_007408</tem:USER_NAME>
         <tem:PASSWORD>rvkDAuKh</tem:PASSWORD>
      </tem:LoginRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const res = await soapRequest('LoginRequest', loginXml);
    console.log('Status code:', res.statusCode);
    console.log('Response body:', res.data.substring(0, 500));
    const sessionIdMatch = res.data.match(/<SESSION_ID>(.*?)<\/SESSION_ID>/) || res.data.match(/<SESSION_ID[^>]*>(.*?)<\/SESSION_ID>/);
    if (sessionIdMatch) {
      console.log('SUCCESS! Session ID:', sessionIdMatch[1]);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 60);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = new Date().toISOString().split('T')[0];

      for (const dir of ['IN', 'OUT']) {
        const getInvoiceXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:GetInvoiceRequest>
         <tem:REQUEST_HEADER>
            <tem:SESSION_ID>${sessionIdMatch[1]}</tem:SESSION_ID>
            <tem:ACTION_DATE>${actionDate}</tem:ACTION_DATE>
            <tem:REASON>GetInvoices</tem:REASON>
            <tem:APPLICATION_NAME>GMSNet</tem:APPLICATION_NAME>
            <tem:HOSTNAME>GMSNet</tem:HOSTNAME>
            <tem:CHANNEL_NAME>GMSNet</tem:CHANNEL_NAME>
            <tem:COMPRESSED>N</tem:COMPRESSED>
         </tem:REQUEST_HEADER>
         <tem:INVOICE_SEARCH_KEY>
            <tem:LIMIT>50</tem:LIMIT>
            <tem:START_DATE>${startDateStr}</tem:START_DATE>
            <tem:END_DATE>${endDateStr}</tem:END_DATE>
            <tem:READ_INCLUDED>true</tem:READ_INCLUDED>
            <tem:DIRECTION>${dir}</tem:DIRECTION>
         </tem:INVOICE_SEARCH_KEY>
         <tem:HEADER_ONLY>Y</tem:HEADER_ONLY>
      </tem:GetInvoiceRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

        const invRes = await soapRequest('GetInvoiceRequest', getInvoiceXml);
        console.log(`GetInvoice ${dir} Status:`, invRes.statusCode);
        const matches = invRes.data.match(/<INVOICE>([\s\S]*?)<\/INVOICE>/g) || [];
        console.log(`GetInvoice ${dir} found ${matches.length} invoices.`);
        if (matches.length > 0) {
          console.log(`Sample ${dir} invoice:`, matches[0].substring(0, 300));
        } else {
          console.log(`Response body ${dir}:`, invRes.data.substring(0, 400));
        }
      }
    }
  } catch (err) {
    console.error('EDM Test Failed:', err.message);
  }
}

testEdm();
