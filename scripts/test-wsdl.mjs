import https from 'https';
import crypto from 'crypto';

function testWsdl() {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'portal1.edmbilisim.com.tr',
      port: 443,
      path: '/EFaturaEDM/EFaturaEDM.svc?wsdl',
      method: 'GET',
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', e => resolve(e.message));
    req.end();
  });
}

async function run() {
  const wsdl = await testWsdl();
  console.log('WSDL length:', wsdl.length);
  const actions = wsdl.match(/soapAction="([^"]+)"/g) || [];
  console.log('Available Actions in WSDL:');
  console.log(actions.slice(0, 30));
}

run();
