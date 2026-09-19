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
    req.on('error', (e) => resolve({ statusCode: 500, data: '' }));
    req.end();
  });
}

async function searchApi() {
  // Let's test outbox endpoints:
  // /accounting/api/outbox/getOutboxes or /accounting/api/eArchive/getEArchives
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const testOutbox = [
    `/accounting/api/outbox/getOutboxes?year=${currentYear}&month=${currentMonth}&headerSearch=&notInList=false&documentIds=&multipleVkn=&chemistWarehouseFilter=ALL&page=0&size=20&sort=issueDateTime,desc&isArchive=0`,
    `/accounting/api/outbox/getOutboxes?year=2024&month=8&page=0&size=20`,
    `/accounting/api/eArchive/getEArchives?year=${currentYear}&month=${currentMonth}&page=0&size=20`,
    `/accounting/api/eArchive/getEArchives?year=2024&month=8&page=0&size=20`
  ];

  for (const q of testOutbox) {
    const res = await httpRequest(q);
    console.log(`Path: ${q} -> Status: ${res.statusCode} | Length: ${res.data?.length}`);
  }
}

searchApi();
