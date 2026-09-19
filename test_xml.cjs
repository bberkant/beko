const https = require('https');
https.get('https://vega-api.amasyaetas.com/api/etik/efaturalar', res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const data = JSON.parse(body);
    const invoiceNo = data[0].invoiceNo;
    console.log("Fetching:", invoiceNo);
    https.get('https://vega-api.amasyaetas.com/api/etik/efaturalar/' + invoiceNo + '/xml', res2 => {
        let body2 = '';
        res2.on('data', d => body2 += d);
        res2.on('end', () => {
            const r = /<[a-zA-Z0-9:]*EmbeddedDocumentBinaryObject[^>]*>/g;
            console.log(body2.match(r));
        });
    });
  });
});
