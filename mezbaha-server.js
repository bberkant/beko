const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
let firebird;
try {
  firebird = require('node-firebird');
} catch (e) {
  console.warn("UYARI: node-firebird modülü yüklenemedi. Çek senkronizasyonu çalışmayabilir.");
}

const app = express();
app.use(cors());
app.use(express.json());

// PDF önbellek klasörü
const PDF_CACHE_DIR = path.join(__dirname, 'pdf_cache');
if (!fs.existsSync(PDF_CACHE_DIR)) {
  fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });
}

// SQL Server Bağlantı Bilgileriniz (Vega)
const dbConfig = {
  user: 'sa', 
  password: 'Etas+-2020', 
  server: '127.0.0.1', 
  database: 'VEGADB', 
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// SOAP Web Servisi İstek Yardımcı Fonksiyonu
function soapRequest(action, body) {
  return new Promise((resolve, reject) => {
    const postData = body;
    const req = https.request({
      hostname: 'integration.vegayazilim.com.tr',
      port: 443,
      path: '/integration.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData),
        'SOAPAction': 'http://tempuri.org/' + action
      },
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Firma bazlı Vega giriş bilgileri
function getCredentials(company) {
  if (company === 'marif') {
    return { user: 'admin_007408', pass: 'rvkDAuKh' };
  }
  return { user: 'admin_005857', pass: '4fq8BICM' };
}

// Vega Entegratör Oturumu Al
async function getVegaSession(company) {
  const { user, pass } = getCredentials(company);
  const loginXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Login xmlns="http://tempuri.org/">
      <_Login_Request>
        <UserName>${user}</UserName>
        <Password>${pass}</Password>
        <Application_Name>Vega e-Fatura</Application_Name>
        <Application_Version>5.4.12</Application_Version>
      </_Login_Request>
    </Login>
  </soap:Body>
</soap:Envelope>`;

  const lRes = await soapRequest('Login', loginXml);
  const sessionId = lRes.match(/<Session_ID>(.*?)<\/Session_ID>/)?.[1];
  const securityKey = lRes.match(/<Security_Key>(.*?)<\/Security_Key>/)?.[1];
  const ipNumber = lRes.match(/<IP_Number>(.*?)<\/IP_Number>/)?.[1] || '';

  if (!sessionId || !securityKey) {
    throw new Error('Vega girişi başarısız: ' + lRes.slice(0, 200));
  }
  return { sessionId, securityKey, ipNumber };
}

// Faturanın resmi PDF baytlarını indir
async function fetchOfficialPdf(invoiceNo, company = 'etik') {
  // 1. Önce disk önbelleğinde var mı kontrol et
  const cachedFile = path.join(PDF_CACHE_DIR, `${invoiceNo}.pdf`);
  if (fs.existsSync(cachedFile)) {
    return fs.readFileSync(cachedFile);
  }

  // 2. Vega SOAP oturumu aç
  const { sessionId, securityKey, ipNumber } = await getVegaSession(company);

  // 3. Faturanın UUID (ETTN) kodunu bul
  let uuid = null;
  for (const direction of ['OUT', 'IN']) {
    const searchXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetInvoice xmlns="http://tempuri.org/">
      <GetInvoiceRequest>
        <Login_Request_Header>
          <Session_ID>${sessionId}</Session_ID>
          <IP_Number>${ipNumber}</IP_Number>
          <Security_Key>${securityKey}</Security_Key>
        </Login_Request_Header>
        <INVOICE_SEARCH_KEY>
          <LIMIT>1</LIMIT>
          <LIMITSpecified>true</LIMITSpecified>
          <ID>${invoiceNo}</ID>
          <READ_INCLUDED>true</READ_INCLUDED>
          <READ_INCLUDEDSpecified>true</READ_INCLUDEDSpecified>
          <PROCESSED_INCLUDED>true</PROCESSED_INCLUDED>
          <PROCESSED_INCLUDEDSpecified>true</PROCESSED_INCLUDEDSpecified>
          <DIRECTION>${direction}</DIRECTION>
        </INVOICE_SEARCH_KEY>
        <HEADER_ONLY>true</HEADER_ONLY>
      </GetInvoiceRequest>
    </GetInvoice>
  </soap:Body>
</soap:Envelope>`;

    const searchRes = await soapRequest('GetInvoice', searchXml);
    const m = searchRes.match(/<UUID>(.*?)<\/UUID>/);
    if (m && m[1]) {
      uuid = m[1];
      break;
    }
  }

  // 4. Bulunamadıysa e-Arşiv olarak ara
  if (!uuid) {
    const archiveXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetEArchive xmlns="http://tempuri.org/">
      <GetEArchiveRequest>
        <Login_Request_Header>
          <Session_ID>${sessionId}</Session_ID>
          <IP_Number>${ipNumber}</IP_Number>
          <Security_Key>${securityKey}</Security_Key>
        </Login_Request_Header>
        <EArchive_SEARCH_KEY>
          <LIMIT>1</LIMIT>
          <LIMITSpecified>true</LIMITSpecified>
          <ID>${invoiceNo}</ID>
          <READ_INCLUDED>true</READ_INCLUDED>
          <READ_INCLUDEDSpecified>true</READ_INCLUDEDSpecified>
          <PROCESSED_INCLUDED>true</PROCESSED_INCLUDED>
          <PROCESSED_INCLUDEDSpecified>true</PROCESSED_INCLUDEDSpecified>
        </EArchive_SEARCH_KEY>
        <HEADER_ONLY>false</HEADER_ONLY>
      </GetEArchiveRequest>
    </GetEArchive>
  </soap:Body>
</soap:Envelope>`;

    const arcRes = await soapRequest('GetEArchive', archiveXml);
    const m = arcRes.match(/<UUID>(.*?)<\/UUID>/);
    if (m && m[1]) {
      uuid = m[1];
    }
  }

  if (!uuid) {
    throw new Error(`Fatura entegratörde bulunamadı: ${invoiceNo}`);
  }

  // 5. UUID ile resmi PDF'i indir
  const pdfXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetInvoice_PDF xmlns="http://tempuri.org/">
      <getInvoice_ETTN>
        <Login_Request_Header>
          <Session_ID>${sessionId}</Session_ID>
          <IP_Number>${ipNumber}</IP_Number>
          <Security_Key>${securityKey}</Security_Key>
        </Login_Request_Header>
        <ETTN>${uuid}</ETTN>
      </getInvoice_ETTN>
    </GetInvoice_PDF>
  </soap:Body>
</soap:Envelope>`;

  const pdfRes = await soapRequest('GetInvoice_PDF', pdfXml);
  const pdfMatch = pdfRes.match(/<GetInvoice_PDFResult>(.*?)<\/GetInvoice_PDFResult>/);

  if (!pdfMatch || !pdfMatch[1]) {
    throw new Error(`Vega'dan PDF içeriği alınamadı: ${invoiceNo}`);
  }

  const pdfBuffer = Buffer.from(pdfMatch[1], 'base64');
  try {
    fs.writeFileSync(cachedFile, pdfBuffer);
  } catch {}
  return pdfBuffer;
}

// 0. Vega e-Fatura Canlı Resmi PDF Uç Noktası
const handlePdfRequest = async (req, res) => {
  try {
    const { invoiceNo, company = 'etik' } = req.params;
    const pdfBuffer = await fetchOfficialPdf(invoiceNo, company);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoiceNo}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Hatası:', err.message);
    res.status(500).json({ error: 'PDF indirme hatası', details: err.message });
  }
};

app.get('/api/:company/efaturalar/:invoiceNo/pdf', handlePdfRequest);
app.get('/api/efaturalar/:invoiceNo/pdf', handlePdfRequest);

// 0. Vega e-Fatura Canlı Resmi XML Uç Noktası
const handleXmlRequest = async (req, res) => {
  try {
    const { invoiceNo, company = 'etik' } = req.params;
    
    // Önce yerel Arctos klasörlerini kontrol et
    const localDirs = [
      'C:\\Arctos\\eFatura\\Giden',
      'C:\\Arctos\\eArsiv\\Giden',
      'C:\\Arctos\\eFatura\\Gelen',
      'C:\\Arctos\\eArsiv\\Gelen',
      'C:\\Arctos'
    ];
    for (const d of localDirs) {
      const p = path.join(d, `${invoiceNo}.xml`);
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
        return res.sendFile(p);
      }
    }

    // Bulunamadıysa SOAP ile çek
    const { sessionId, securityKey, ipNumber } = await getVegaSession(company);
    const getInvoiceXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetInvoice xmlns="http://tempuri.org/">
      <GetInvoiceRequest>
        <Login_Request_Header>
          <Session_ID>${sessionId}</Session_ID>
          <IP_Number>${ipNumber}</IP_Number>
          <Security_Key>${securityKey}</Security_Key>
        </Login_Request_Header>
        <INVOICE_SEARCH_KEY>
          <LIMIT>1</LIMIT>
          <LIMITSpecified>true</LIMITSpecified>
          <ID>${invoiceNo}</ID>
          <READ_INCLUDED>true</READ_INCLUDED>
          <READ_INCLUDEDSpecified>true</READ_INCLUDEDSpecified>
          <PROCESSED_INCLUDED>true</PROCESSED_INCLUDED>
          <PROCESSED_INCLUDEDSpecified>true</PROCESSED_INCLUDEDSpecified>
        </INVOICE_SEARCH_KEY>
        <HEADER_ONLY>false</HEADER_ONLY>
      </GetInvoiceRequest>
    </GetInvoice>
  </soap:Body>
</soap:Envelope>`;

    const invoiceResponse = await soapRequest('GetInvoice', getInvoiceXml);
    const contentMatch = invoiceResponse.match(/<CONTENT>(.*?)<\/CONTENT>/);
    if (!contentMatch) {
      return res.status(404).json({ error: 'Faturanın XML içeriği bulunamadı.' });
    }
    const xmlBuffer = Buffer.from(contentMatch[1], 'base64');
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
    return res.send(xmlBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'XML indirme hatası', details: err.message });
  }
};

app.get('/api/:company/efaturalar/:invoiceNo/xml', handleXmlRequest);
app.get('/api/efaturalar/:invoiceNo/xml', handleXmlRequest);

// 1. Vega e-Faturalar Listesi Sorgusu (Canlı)
app.get('/api/efaturalar', async (req, res) => {
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool.request().query(`
      SELECT 
          b.IND AS [id],
          b.BELGENO AS [invoiceNo],
          b.TARIH AS [date],
          b.FIRMANO AS [cariCode],
          COALESCE(NULLIF(c.UNVAN, ''), NULLIF(c.FIRMAKODU, ''), c.ADI) AS [cariName],
          ISNULL(SUM(h.GERCEKTOPLAM), 0) AS [matrah],
          ISNULL(SUM(h.KDVTUTAR), 0) AS [kdv],
          ISNULL(SUM(h.GERCEKTOPLAM + h.KDVTUTAR), 0) AS [amount]
      FROM F0101D0008VFATURABASLIKLAR b
      LEFT JOIN F0101D0008VFATURAHAREKETLER h ON b.IND = h.EVRAKNO
      LEFT JOIN F0101TBLCARI c ON b.FIRMANO = c.IND
      GROUP BY b.IND, b.BELGENO, b.TARIH, b.FIRMANO, c.UNVAN, c.FIRMAKODU, c.ADI
      ORDER BY b.TARIH DESC, b.IND DESC;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 2. Vega e-Fatura Detay Sorgusu (Kalem Detayları)
app.get('/api/efaturalar/:id/detay', async (req, res) => {
  try {
    const { id } = req.params;
    let pool = await sql.connect(dbConfig);
    let result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
            h.IND AS [id],
            h.MALINCINSI AS [productName],
            h.GERCEKTOPLAM AS [lineTutar],
            h.KDVTUTAR AS [kdvTutar],
            h.TEVKIFATTUTAR AS [tevkifatTutar],
            h.OTV AS [otv],
            h.OIV AS [oiv]
        FROM F0101D0008VFATURAHAREKETLER h
        WHERE h.EVRAKNO = @id
        ORDER BY h.IND ASC;
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 3. Cari Listesi Sorgusu (Müşteri & Tedarikçiler - Personel Çakışmaları Hariç)
app.get('/api/cariler', async (req, res) => {
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool.request().query(`
      SELECT 
          CAST(IND AS VARCHAR(50)) AS [code], 
          COALESCE(NULLIF(UNVAN, ''), NULLIF(FIRMAKODU, ''), ADI) AS [name], 
          FIRMAKODU AS [companyCode],
          FIRMATAKIPKODU AS [companyTrackingCode],
          VERGIDAIRESI AS [taxOffice],
          VERGINO AS [taxNo],
          CASE WHEN FIRMATIPI = 1 THEN 'Müşteri' ELSE 'Tedarikçi' END AS [type],
          SEHIR AS [city],
          (SELECT MAX(ISLEMTARIHI) FROM F0101D0008TBLCARIHAREKETLERI WHERE FIRMANO = F0101TBLCARI.IND) AS [lastTransactionDate],
          ISNULL((SELECT SUM(ch.BORC - ch.ALACAK) FROM F0101D0008TBLCARIHAREKETLERI ch WHERE ch.FIRMANO = F0101TBLCARI.IND), 0) AS [balance]
      FROM F0101TBLCARI
      WHERE FIRMATIPI != 12 
        AND IND NOT IN (1376, 1250, 1251, 2190, 3369, 195, 753, 1554, 1723, 2186, 1849, 9925, 1939, 9846, 1909, 1008, 1470, 2171, 7705, 4466, 2169, 2245, 7677, 534)
        AND COALESCE(NULLIF(UNVAN, ''), NULLIF(FIRMAKODU, ''), ADI) IS NOT NULL
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 4. Cari Hareket Detay Sorgusu (Müşteri & Tedarikçiler)
app.get('/api/cariler/:code/hareketler', async (req, res) => {
  try {
    const { code } = req.params;
    let pool = await sql.connect(dbConfig);
    let result = await pool.request()
      .input('code', sql.VarChar, code)
      .query(`
        SELECT 
            ch.IND AS [id],
            ch.TARIH AS [date],
            ch.EVRAKNO AS [invoiceNo],
            ch.IZAHAT AS [izahat],
            ch.ALTNOT AS [description],
            COALESCE(sh.GIREN, sh.CIKAN, 0) AS [quantity],
            sh.BIRIMFIYAT AS [unitPrice],
            sh.TUTAR AS [lineTutar],
            s.MALINCINSI AS [productName],
            b.BIRIMADI AS [unitName],
            ch.BORC AS [borc],
            ch.ALACAK AS [alacak],
            ch.ODEMETARIHI AS [vade],
            ch.ALTNOT AS [altnot],
            CASE WHEN ch.BORC > 0 THEN 'Satış Faturası' ELSE 'Alış Faturası' END AS [type],
            (ch.BORC + ch.ALACAK) AS [amount]
        FROM F0101D0008TBLCARIHAREKETLERI ch
        LEFT JOIN F0101D0008TBLSTOKHAREKETLERI sh
            ON ch.EVRAKNO = sh.EVRAKNO 
            AND ch.FIRMANO = sh.FIRMANO 
            AND ch.IZAHAT = sh.IZAHAT
            AND NULLIF(ch.EVRAKNO, '') IS NOT NULL
        LEFT JOIN F0101TBLSTOKLAR s 
            ON sh.STOKNO = s.IND
        LEFT JOIN F0101TBLBIRIMLEREX b
            ON sh.BIRIMEX = b.IND
        WHERE ch.FIRMANO = @code
        ORDER BY ch.TARIH ASC, ch.IND ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 5. Personel Listesi Sorgusu (Canlı Vega - FIRMATIPI = 12)
app.get('/api/personel', async (req, res) => {
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool.request().query(`
      SELECT 
          CAST(IND AS VARCHAR(50)) AS [code], 
          COALESCE(NULLIF(UNVAN, ''), NULLIF(ADI + ' ' + COALESCE(SOYADI, ''), ''), FIRMAKODU) AS [name], 
          FIRMAKODU AS [companyCode],
          FIRMATAKIPKODU AS [companyTrackingCode],
          VERGIDAIRESI AS [taxOffice],
          VERGINO AS [taxNo],
          'Personel' AS [type],
          SEHIR AS [city],
          (SELECT MAX(ISLEMTARIHI) FROM F0101D0008TBLCARIHAREKETLERI WHERE FIRMANO = F0101TBLCARI.IND) AS [lastTransactionDate],
          ISNULL((SELECT SUM(ch.BORC - ch.ALACAK) FROM F0101D0008TBLCARIHAREKETLERI ch WHERE ch.FIRMANO = F0101TBLCARI.IND), 0) AS [balance]
      FROM F0101TBLCARI
      WHERE FIRMATIPI = 12 AND COALESCE(NULLIF(UNVAN, ''), NULLIF(FIRMAKODU, ''), ADI) IS NOT NULL
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 6. Personel Hareket Detay Sorgusu (Canlı Vega)
app.get('/api/personel/:code/hareketler', async (req, res) => {
  try {
    const { code } = req.params;
    let pool = await sql.connect(dbConfig);
    let result = await pool.request()
      .input('code', sql.VarChar, code)
      .query(`
        SELECT 
            ch.IND AS [id],
            ch.TARIH AS [date],
            ch.EVRAKNO AS [invoiceNo],
            ch.IZAHAT AS [izahat],
            ch.ALTNOT AS [description],
            COALESCE(sh.GIREN, sh.CIKAN, 0) AS [quantity],
            sh.BIRIMFIYAT AS [unitPrice],
            sh.TUTAR AS [lineTutar],
            s.MALINCINSI AS [productName],
            b.BIRIMADI AS [unitName],
            ch.BORC AS [borc],
            ch.ALACAK AS [alacak],
            ch.ODEMETARIHI AS [vade],
            ch.ALTNOT AS [altnot],
            CASE WHEN ch.BORC > 0 THEN 'Satış Faturası' ELSE 'Alış Faturası' END AS [type],
            (ch.BORC + ch.ALACAK) AS [amount]
        FROM F0101D0008TBLCARIHAREKETLERI ch
        LEFT JOIN F0101D0008TBLSTOKHAREKETLERI sh
            ON ch.EVRAKNO = sh.EVRAKNO 
            AND ch.FIRMANO = sh.FIRMANO 
            AND ch.IZAHAT = ch.IZAHAT
            AND NULLIF(ch.EVRAKNO, '') IS NOT NULL
        LEFT JOIN F0101TBLSTOKLAR s 
            ON sh.STOKNO = s.IND
        LEFT JOIN F0101TBLBIRIMLEREX b
            ON sh.BIRIMEX = b.IND
        WHERE ch.FIRMANO = @code
        ORDER BY ch.TARIH ASC, ch.IND ASC
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 7. Vega Son İşlemler (Canlı Rapor)
app.get('/api/son-islemler', async (req, res) => {
  try {
    let pool = await sql.connect(dbConfig);
    let result = await pool.request().query(`
      SELECT TOP 200 
          ch.IND AS [id],
          ch.TARIH AS [date],
          COALESCE(NULLIF(c.UNVAN, ''), NULLIF(c.FIRMAKODU, ''), c.ADI) AS [companyName],
          ch.IZAHAT AS [izahat],
          ch.EVRAKNO AS [evrakNo],
          CASE WHEN ch.BORC > 0 THEN ch.BORC ELSE ch.ALACAK END AS [amount],
          ch.PARABIRIMI AS [currency],
          ch.ISLEMTARIHI AS [createdAt],
          ch.OZELKOD1 AS [branch],
          ch.OZELKOD2 AS [cashbox],
          ch.OZELKOD5 AS [documentNevi]
      FROM F0101D0008TBLCARIHAREKETLERI ch
      LEFT JOIN F0101TBLCARI c ON ch.FIRMANO = c.IND
      ORDER BY ch.IND DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 8. EBS Firebird Çek/Senet Entegrasyonu
app.get('/api/checks', (req, res) => {
  if (!firebird) {
    return res.status(500).json({ error: 'node-firebird modülü yüklü değil.' });
  }
  const dbOptions = {
    host: '127.0.0.1',
    port: 3050,
    database: 'C:\\Ebs Yazilim\\cek\\V105\\vt\\EbsCek.fdb',
    user: 'SYSDBA',
    password: 'masterkey',
    lowercase_keys: true
  };
  
  firebird.attach(dbOptions, function(err, db) {
    if (err) {
      return res.status(500).json({ error: 'Firebird bağlantı hatası: ' + err.message });
    }
    
    db.query('SELECT * FROM ALINAN_CEKLER', function(errAlinan, alinanRows) {
      if (errAlinan) {
        db.detach();
        return res.status(500).json({ error: 'Alınan çekler hatası: ' + errAlinan.message });
      }
      
      db.query('SELECT * FROM CEKLER', function(errKesilen, kesilenRows) {
        if (errKesilen) {
          db.detach();
          return res.status(500).json({ error: 'Kesilen çekler hatası: ' + errKesilen.message });
        }
        
        db.detach();

        const mapAlinanStatus = (val) => {
          const v = String(val).trim();
          switch (v) {
            case "1": return "Portföyde";
            case "2": return "Ciro Edildi";
            case "3": return "Teminata Verildi";
            case "4": return "Takasa Verildi";
            case "5": return "İcraya Verildi";
            case "6": return "Faktoringe Verildi";
            case "7": return "Borçluya İade Edildi";
            case "8": return "Portföyden Tahsil";
            case "9": return "Bankadan Tahsil";
            case "10": return "İcradan Tahsil";
            case "11": return "Portföyde Karşılıksız";
            case "12": return "Bankada Karşılıksız";
            default: return "Tahsilde";
          }
        };

        const mapKesilenStatus = (val) => {
          const v = String(val).trim();
          switch (v) {
            case "1": return "Tahsilde";
            case "2": return "Ödendi";
            case "3": return "Geri Alındı";
            case "4": return "İptal";
            case "6": return "Kayıp";
            default: return "Tahsilde";
          }
        };

        const mappedAlinan = alinanRows.map(row => ({
          id: row.id,
          check_type: 'alinan',
          document_type: (String(row.bank_name).toUpperCase() === 'SENET' || String(row.tahsildar_banka).toUpperCase() === 'SENET') ? 'senet' : 'cek',
          issue_date: row.issue_date ? new Date(row.issue_date).toISOString().slice(0, 10) : null,
          due_date: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
          amount: parseFloat(row.amount),
          check_no: row.check_no,
          debtor: row.debtor,
          creditor: row.creditor,
          bank_name: row.bank_name,
          bank_branch: row.bank_branch,
          status: mapAlinanStatus(row.status),
          ozel_alan: row.ozel_alan,
          kesideci: row.kesideci,
          keside_yeri: row.keside_yeri,
          tahsildar_banka: row.tahsildar_banka,
          ciro_edilen: row.ciro_edilen
        }));

        const mappedKesilen = kesilenRows.map(row => ({
          id: row.id,
          check_type: 'kesilen',
          document_type: (String(row.bank_name).toUpperCase() === 'SENET' || String(row.tahsildar_banka).toUpperCase() === 'SENET') ? 'senet' : 'cek',
          issue_date: row.issue_date ? new Date(row.issue_date).toISOString().slice(0, 10) : null,
          due_date: row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : null,
          amount: parseFloat(row.amount),
          check_no: row.check_no,
          debtor: row.debtor,
          creditor: row.creditor,
          bank_name: row.bank_name,
          bank_branch: row.bank_branch,
          status: mapKesilenStatus(row.status),
          ozel_alan: row.ozel_alan,
          kesideci: row.kesideci,
          keside_yeri: row.keside_yeri,
          tahsildar_banka: row.tahsildar_banka,
          ciro_edilen: row.ciro_edilen
        }));

        res.json([...mappedAlinan, ...mappedKesilen]);
      });
    });
  });
});

const PORT = 5000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`API servisi ${PORT} portunda başarıyla başladı...`);
});
