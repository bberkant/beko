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

async function searchInboxTable() {
  const js = await httpRequest('/accounting/static/js/main.17cd1934.chunk.js');
  
  // Search for queries containing "inbox" or "outbox" or pagination
  const regex = /["'](\/[a-zA-Z0-9_\-\/]+(?:fetch|query|get|search|list|inbox|outbox|invoice)[a-zA-Z0-9_\-\/]*)["']/gi;
  const matches = [];
  let m;
  while ((m = regex.exec(js)) !== null) {
    matches.push(m[1]);
  }
  console.log('Matches count:', matches.length);
  const unique = [...new Set(matches)];
  console.log('Unique matches:', unique);
}

searchInboxTable();
