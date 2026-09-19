import https from 'https';
import crypto from 'crypto';

function httpRequest(path) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'portal.mikrokomdonusum.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', (e) => resolve(''));
    req.end();
  });
}

async function findInboxQuery() {
  const js = await httpRequest('/accounting/static/js/main.17cd1934.chunk.js');
  // Search for the component rendering eInvoiceInboxList
  // In previous output: {name:"eInvoiceInboxList",triggerDownloadRequestTooltip:...}
  // Let's find "name:\"eInvoiceInboxList\""
  const idx = js.indexOf('name:"eInvoiceInboxList"');
  if (idx !== -1) {
    console.log('Found eInvoiceInboxList definition at', idx);
    console.log(js.substring(Math.max(0, idx - 600), Math.min(js.length, idx + 800)));
  }

  // Let's search for case "eInvoiceInboxList":
  let idx2 = 0;
  while ((idx2 = js.indexOf('"eInvoiceInboxList"', idx2)) !== -1) {
    console.log('--- FOUND "eInvoiceInboxList" at', idx2, '---');
    console.log(js.substring(Math.max(0, idx2 - 300), Math.min(js.length, idx2 + 400)));
    idx2 += 20;
  }
}

findInboxQuery();
