const sql = require('mssql');
const config = { user: 'sa', password: 'Etas+-2020', server: '127.0.0.1', database: 'VEGADB', options: { encrypt: false, trustServerCertificate: true } };
async function findTables() {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%XML%' AND TABLE_NAME LIKE '%F0101%'");
    console.log(result.recordset);
    pool.close();
  } catch (err) {
    console.error(err.message);
  }
}
findTables();
