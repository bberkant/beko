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

async function searchUhDef() {
  const js = await httpRequest('/accounting/static/js/main.17cd1934.chunk.js');
  const patterns = ['uh=class', 'class uh', 'var uh=', 'let uh=', 'const uh=', 'function uh('];
  for (const p of patterns) {
    const idx = js.indexOf(p);
    if (idx !== -1) {
      console.log('Found pattern:', p, 'at', idx);
      console.log(js.substring(idx, idx + 800));
    }
  }
}

searchUhDef();
