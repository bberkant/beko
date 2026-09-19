const sql = require('mssql');
const config = { user: 'sa', password: 'Etas+-2020', server: '127.0.0.1', database: 'VEGADB', options: { encrypt: false, trustServerCertificate: true } };
async function getXsltName() {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query('SELECT TOP 1 XMLDATA FROM F0101TBLEARSIVXML WHERE XMLDATA IS NOT NULL');
    if (result.recordset.length > 0) {
      const xml = result.recordset[0].XMLDATA;
      const match = xml.match(/<cbc:EmbeddedDocumentBinaryObject[^>]*filename=["']([^"']+)["'][^>]*>/i);
      if (match) {
        console.log('Etik XSLT Filename:', match[1]);
      } else {
        console.log('Not found in regex');
      }
    }
    
    let resultMarif = await pool.request().query('SELECT TOP 1 XMLDATA FROM F0102TBLEARSIVXML WHERE XMLDATA IS NOT NULL');
    if (resultMarif.recordset.length > 0) {
      const xml = resultMarif.recordset[0].XMLDATA;
      const match = xml.match(/<cbc:EmbeddedDocumentBinaryObject[^>]*filename=["']([^"']+)["'][^>]*>/i);
      if (match) {
        console.log('Marif XSLT Filename:', match[1]);
      }
    }
    
    pool.close();
  } catch (err) {
    console.error(err.message);
  }
}
getXsltName();
