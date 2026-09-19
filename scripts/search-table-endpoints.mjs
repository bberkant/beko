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

async function findTableEndpoints() {
  const js = await httpRequest('/accounting/static/js/main.17cd1934.chunk.js');
  
  // Search for /query or /fetch or /find or /get with regex
  const regex = /["'](\/[a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)+)["']/g;
  const urls = [];
  let m;
  while ((m = regex.exec(js)) !== null) {
    const u = m[1];
    if (u.includes('query') || u.includes('fetch') || u.includes('search') || u.includes('page') || u.includes('Page') || u.includes('list') || u.includes('List') || u.includes('inbox') || u.includes('outbox') || u.includes('invoice') || u.includes('document')) {
      urls.push(u);
    }
  }
  console.log('Filtered endpoints count:', urls.length);
  const unique = [...new Set(urls)];
  console.log('Unique endpoints:', unique);
}

findTableEndpoints();
