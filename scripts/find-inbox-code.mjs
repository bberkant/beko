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

async function findInboxCode() {
  const js = await httpRequest('/accounting/static/js/main.17cd1934.chunk.js');
  let idx = 0;
  while ((idx = js.indexOf('eInvoiceInbox', idx)) !== -1) {
    console.log('--- FOUND eInvoiceInbox at index', idx, '---');
    console.log(js.substring(Math.max(0, idx - 300), Math.min(js.length, idx + 500)));
    idx += 13;
  }
}

findInboxCode();
