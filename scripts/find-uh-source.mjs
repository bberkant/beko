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

async function findUhSource() {
  const js = await httpRequest('/accounting/static/js/main.17cd1934.chunk.js');
  // Search backward from index 2979707 for "uh=" or similar
  const slice = js.substring(2900000, 2980000);
  const regex = /([a-zA-Z0-9_$]+)=class\s+extends/g;
  let m;
  const classes = [];
  while ((m = regex.exec(slice)) !== null) {
    classes.push(m[1]);
  }
  console.log('Classes found before 2979707:', classes.slice(-20));

  // Let's also look around the last 5000 chars before 2979707
  console.log('Slice before 2979707:');
  console.log(js.substring(2975000, 2979500));
}

findUhSource();
