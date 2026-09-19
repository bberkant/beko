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

async function findPortalScripts() {
  const index = await httpRequest('/');
  console.log('Index HTML length:', index.data?.length);
  const scripts = (index.data || '').match(/\/static\/js\/[^"]+/g) || (index.data || '').match(/src="([^"]+\.js)"/g) || [];
  console.log('Scripts:', scripts);

  for (const s of scripts) {
    const cleanPath = s.replace('src="', '').replace('"', '');
    const js = await httpRequest(cleanPath);
    console.log(`Script ${cleanPath} length:`, js.data?.length);
    if (js.data) {
      // Find API paths in JS
      const apiMatches = js.data.match(/\/accounting\/api\/[a-zA-Z0-9_\/]+/g) || [];
      console.log(`Found ${apiMatches.length} API paths in ${cleanPath}:`);
      const unique = [...new Set(apiMatches)];
      console.log(unique);
    }
  }
}

findPortalScripts();
