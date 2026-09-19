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
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
}

async function findScripts() {
  const res = await httpRequest('/accounting/');
  console.log('Accounting HTML:', res.data);
  const scripts = (res.data || '').match(/src="([^"]+)"/g) || [];
  console.log('Script tags:', scripts);

  for (const s of scripts) {
    let p = s.replace('src="', '').replace('"', '');
    if (!p.startsWith('/accounting') && !p.startsWith('http')) {
      p = '/accounting' + (p.startsWith('/') ? '' : '/') + p;
    }
    console.log('Fetching:', p);
    const js = await httpRequest(p);
    console.log('Length:', js.data?.length);
    if (js.data) {
      const apiMatches = js.data.match(/\/accounting\/api\/[a-zA-Z0-9_\/]+/g) || [];
      console.log('Unique API paths:', [...new Set(apiMatches)]);
    }
  }
}

findScripts();
