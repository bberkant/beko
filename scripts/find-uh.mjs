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

async function findUhComponent() {
  const js = await httpRequest('/accounting/static/js/main.17cd1934.chunk.js');
  // Find "class uh" or "function uh"
  const idx = js.indexOf('eInvoiceInboxList');
  if (idx !== -1) {
    console.log('Context around eInvoiceInboxList:');
    console.log(js.substring(Math.max(0, idx - 400), Math.min(js.length, idx + 600)));
  }

  // Search for /inbox/ or /document/
  const m = js.match(/\/accounting\/api\/[a-zA-Z0-9_\/]+/g) || [];
  console.log('All /accounting/api matches:', [...new Set(m)]);
}

findUhComponent();
