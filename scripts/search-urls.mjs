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

async function searchUrls() {
  const js = await httpRequest('/accounting/static/js/main.17cd1934.chunk.js');
  const regex = /url:\s*["']([^"']+)["']/g;
  const urls = [];
  let m;
  while ((m = regex.exec(js)) !== null) {
    urls.push(m[1]);
  }
  console.log('Found URLs in JS:', [...new Set(urls)]);
}

searchUrls();
