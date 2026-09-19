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

async function search7Chunk() {
  const js = await httpRequest('/accounting/static/js/7.cc80a7c3.chunk.js');
  console.log('7.chunk length:', js.length);
  const regex = /["'](\/[a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)+)["']/g;
  const urls = [];
  let m;
  while ((m = regex.exec(js)) !== null) {
    const u = m[1];
    urls.push(u);
  }
  console.log('Unique endpoints in 7.chunk:', [...new Set(urls)].slice(0, 100));
}

search7Chunk();
