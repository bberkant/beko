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
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, data }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
}

async function checkPaths() {
  for (const p of ['/', '/accounting', '/accounting/', '/login', '/accounting/login', '/accounting/index.html']) {
    const res = await httpRequest(p);
    console.log(`Path ${p} -> Status: ${res.statusCode} | Location: ${res.headers?.location} | Body: ${res.data?.substring(0, 100)}`);
  }
}

checkPaths();
