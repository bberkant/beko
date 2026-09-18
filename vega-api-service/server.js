const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ==========================================
// 1. KRİTİK ÇÖKME VE HATA YAKALAYICILAR
// ==========================================
process.on('uncaughtException', (err) => {
  console.error('[KRİTİK HATA - Uncaught Exception]:', err ? (err.stack || err.message) : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[KRİTİK HATA - Unhandled Rejection]:', reason);
});

// PDF ve Önbellek Klasörleri
const CACHE_FILE_PATH = path.join(__dirname, 'marif_incoming_cache.json');
const PDF_CACHE_DIR = path.join(__dirname, 'pdf_cache');
if (!fs.existsSync(PDF_CACHE_DIR)) {
  try {
    fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });
  } catch (e) {}
}

// Opsiyonel Modüller
let firebird = null;
try {
  firebird = require('node-firebird');
} catch (e) {
  console.warn('[BİLGİ] node-firebird modülü mevcut değil (Çekler finans ofisinden çekilmektedir).');
}

let xlsx = null;
try {
  xlsx = require('xlsx');
} catch (e) {
  console.warn('[UYARI] xlsx modülü yüklenemedi. Kesim listesi için npm install xlsx gereklidir.');
}

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 2. VERİTABANI BAĞLANTILARI (SINGLETON POOL)
// ==========================================
const dbConfig = {
  user: 'sa',
  password: 'Etas+-2020',
  server: '127.0.0.1',
  database: 'VEGADB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectionTimeout: 10000,
    requestTimeout: 30000
  },
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  }
};

let vegaPool = null;
let isConnectingVega = false;

async function getVegaPool() {
  if (vegaPool && vegaPool.connected) {
    return vegaPool;
  }
  if (isConnectingVega) {
    let waitCount = 0;
    while (isConnectingVega && waitCount < 20) {
      await new Promise(r => setTimeout(r, 200));
      waitCount++;
      if (vegaPool && vegaPool.connected) return vegaPool;
    }
  }
  isConnectingVega = true;
  try {
    if (vegaPool) {
      try { await vegaPool.close(); } catch (e) {}
    }
    vegaPool = new sql.ConnectionPool(dbConfig);
    vegaPool.on('error', (err) => {
      console.error('[MSSQL VEGA HAVUZ HATASI]:', err.message);
      vegaPool = null;
    });
    await vegaPool.connect();
    console.log('[MSSQL VEGA] VEGADB veritabanına başarıyla bağlanıldı.');
    isConnectingVega = false;
    return vegaPool;
  } catch (err) {
    isConnectingVega = false;
    vegaPool = null;
    console.error('[MSSQL VEGA BAĞLANTI HATASI]:', err.message);
    throw err;
  }
}

// GMS.Net Temel Bağlantı Ayarları (Marif için Opsiyonel)
const gmsMasterConfig = {
  user: 'sa',
  password: 'mikrokom2009/*-+',
  server: 'HASAN\\SQLEXPRESS',
  database: 'master',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000,
    requestTimeout: 15000
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 15000
  }
};

let gmsPool = null;
async function getGmsPool() {
  if (gmsPool && gmsPool.connected) {
    return gmsPool;
  }
  try {
    if (gmsPool) {
      try { await gmsPool.close(); } catch (e) {}
    }
    gmsPool = new sql.ConnectionPool(gmsMasterConfig);
    gmsPool.on('error', (err) => {
      console.warn('[MSSQL GMS HAVUZ UYARISI]:', err.message);
      gmsPool = null;
    });
    await gmsPool.connect();
    return gmsPool;
  } catch (err) {
    gmsPool = null;
    throw err;
  }
}

async function getMarifDatabaseName(pool) {
  let dbResult = await pool.request().query("SELECT name FROM sys.databases WHERE state_desc = 'ONLINE'");
  let databases = dbResult.recordset.map(d => d.name);
  let marifDb = databases.find(d => d.toUpperCase() === 'M_MARIF_ET_URUNLERI_2026') 
             || databases.find(d => d.toUpperCase().includes('MARIF') && d.includes('2026'))
             || databases.find(d => d.toUpperCase().includes('MARIF') && !d.toUpperCase().includes('YEDEK'))
             || databases.find(d => d.toUpperCase().includes('MARIF'));
  return { marifDb, databases };
}

// Firma Veritabanı ve SOAP Kullanıcı Tanımları
const companyPrefixes = {
  etik: {
    db: '',
    baslik: 'F0101D0008VFATURABASLIKLAR',
    hareket: 'F0101D0008VFATURAHAREKETLER',
    cari: 'F0101TBLCARI',
    username: 'admin_005857',
    password: '4fq8BICM'
  },
  marif: {
    db: '',
    baslik: 'F0102D0007VFATURABASLIKLAR',
    hareket: 'F0102D0007VFATURAHAREKETLER',
    cari: 'F0102TBLCARI',
    username: 'admin_007408',
    password: 'rvkDAuKh'
  }
};

// ==========================================
// 3. SOAP ENTEGRATÖR FONKSİYONLARI
// ==========================================
function soapRequest(action, body, host = 'integration.vegayazilim.com.tr') {
  return new Promise((resolve, reject) => {
    const postData = body;
    const isEdm = host.includes('edmbilisim');
    const path = isEdm ? '/EFaturaEDM/EFaturaEDM.svc' : '/integration.asmx';
    const soapAction = isEdm ? action : `http://tempuri.org/${action}`;
    
    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': soapAction,
        'Content-Length': Buffer.byteLength(postData)
      },
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve({ statusCode: res.statusCode, data }); });
    });

    req.on('error', (e) => { reject(e); });
    req.write(postData);
    req.end();
  });
}

async function getVegaSession(config) {
  const loginXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Login xmlns="http://tempuri.org/">
      <_Login_Request>
        <UserName>${config.username}</UserName>
        <Password>${config.password}</Password>
        <Application_Name>Vega e-Fatura</Application_Name>
        <Application_Version>5.4.12</Application_Version>
      </_Login_Request>
    </Login>
  </soap:Body>
</soap:Envelope>`;

  const loginResObj = await soapRequest('Login', loginXml);
  const loginResponse = loginResObj.data;
  const sessionIdMatch = loginResponse.match(/<Session_ID>(.*?)<\/Session_ID>/);
  const securityKeyMatch = loginResponse.match(/<Security_Key>(.*?)<\/Security_Key>/);
  const ipNumberMatch = loginResponse.match(/<IP_Number>(.*?)<\/IP_Number>/);

  if (!sessionIdMatch || !securityKeyMatch) {
    throw new Error('Giriş başarısız: Session_ID veya Security_Key alınamadı.');
  }

  return {
    sessionId: sessionIdMatch[1],
    securityKey: securityKeyMatch[1],
    ipNumber: ipNumberMatch ? ipNumberMatch[1] : ''
  };
}

// UBL-TR 2.1 XML Üreteci
function generateUblXml({ invoiceNo, date, cariName, cariContact, cariCity, taxOffice, taxNo, customerCode, items, company }) {
  const isEtik = (company || 'etik').toLowerCase() === 'etik';
  const supplierTitle = isEtik ? 'ETİK ET VE ET ÜRÜNLERİ SAN. TİC. LTD. ŞTİ.' : 'MARİF ET VE ET ÜRÜNLERİ SAN. TİC. LTD. ŞTİ.';
  const supplierVkn = isEtik ? '3810452391' : '6120803445';
  const supplierTaxOffice = 'AMASYA VERGİ DAİRESİ MÜD.';
  const supplierCity = 'AMASYA';
  const supplierDistrict = 'MERKEZ';
  const supplierAddress = isEtik ? 'GÖLLÜ BAĞLARI MAH. MEZBAHA CAD. NO: 13' : 'GÖLLÜ BAĞLARI MAH. MEZBAHA CAD. NO: 15';

  const issueDate = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const issueTime = '12:00:00';
  const profileId = invoiceNo.startsWith('ETS') || invoiceNo.startsWith('EAS') ? 'EARSIVFATURA' : 'TEMELFATURA';
  const invoiceTypeCode = 'SATIS';

  let lineExtensionTotal = 0;
  let taxTotal = 0;

  (items || []).forEach(it => {
    lineExtensionTotal += Number(it.lineTutar || (it.quantity * it.unitPrice) || 0);
    taxTotal += Number(it.kdvTutar || 0);
  });
  const payableAmount = lineExtensionTotal + taxTotal;

  const linesXml = (items || []).map((it, idx) => {
    const lineTotal = Number(it.lineTutar || (it.quantity * it.unitPrice) || 0);
    const kdvTutar = Number(it.kdvTutar || 0);
    const kdvRate = it.kdvRate || 1;
    return `
    <cac:InvoiceLine>
        <cbc:ID>${idx + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="${it.unit === 'KG' ? 'KGM' : 'C62'}">${it.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="TRY">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="TRY">${kdvTutar.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="TRY">${lineTotal.toFixed(2)}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="TRY">${kdvTutar.toFixed(2)}</cbc:TaxAmount>
                <cbc:Percent>${kdvRate}</cbc:Percent>
                <cac:TaxCategory>
                    <cac:TaxScheme>
                        <cbc:Name>KDV</cbc:Name>
                        <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Description>${it.description || ''}</cbc:Description>
            <cbc:Name>${it.productName || 'Mal/Hizmet'}</cbc:Name>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="TRY">${it.unitPrice.toFixed(4)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ccts="urn:un:unece:uncefact:documentation:2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
         xmlns:ubltr="urn:oasis:names:specification:ubl:schema:xsd:TurkishCustomizationExtensionComponents"
         xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"
         xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
    <cbc:ProfileID>${profileId}</cbc:ProfileID>
    <cbc:ID>${invoiceNo}</cbc:ID>
    <cbc:CopyIndicator>false</cbc:CopyIndicator>
    <cbc:UUID>00000000-0000-0000-0000-000000000000</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode>${invoiceTypeCode}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
    <cbc:LineCountNumeric>${(items || []).length}</cbc:LineCountNumeric>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="VKN">${supplierVkn}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${supplierTitle}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:StreetName>${supplierAddress}</cbc:StreetName>
                <cbc:CitySubdivisionName>${supplierDistrict}</cbc:CitySubdivisionName>
                <cbc:CityName>${supplierCity}</cbc:CityName>
                <cac:Country>
                    <cbc:Name>TÜRKİYE</cbc:Name>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cac:TaxScheme>
                    <cbc:Name>${supplierTaxOffice}</cbc:Name>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="${(taxNo && String(taxNo).length === 11) ? 'TCKN' : 'VKN'}">${taxNo || '11111111111'}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name>${cariName || 'MÜŞTERİ'}</cbc:Name>
            </cac:PartyName>
            <cac:PostalAddress>
                <cbc:CityName>${cariCity || 'AMASYA'}</cbc:CityName>
                <cac:Country>
                    <cbc:Name>TÜRKİYE</cbc:Name>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cac:TaxScheme>
                    <cbc:Name>${taxOffice || 'VERGİ DAİRESİ'}</cbc:Name>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="TRY">${taxTotal.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="TRY">${lineExtensionTotal.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="TRY">${taxTotal.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:Name>KDV</cbc:Name>
                    <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="TRY">${lineExtensionTotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="TRY">${lineExtensionTotal.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="TRY">${payableAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="TRY">${payableAmount.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    ${linesXml}
</Invoice>`;
}

// ==========================================
// 4. API ROTALARI & SAĞLIK KONTROLLERİ
// ==========================================

// Sağlık Kontrolü (Uptime & Canlı DB Testi)
app.get(['/api/health', '/health', '/'], async (req, res) => {
  let dbOk = false;
  let dbLatencyMs = null;
  try {
    const t0 = Date.now();
    const pool = await getVegaPool();
    const q = await pool.request().query('SELECT 1 as ping');
    if (q.recordset && q.recordset[0].ping === 1) {
      dbOk = true;
      dbLatencyMs = Date.now() - t0;
    }
  } catch (err) {
    dbOk = false;
  }

  res.json({
    status: 'ok',
    service: 'VegaApiService',
    version: '2.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    dbConnected: dbOk,
    dbLatencyMs: dbLatencyMs,
    environment: 'Mezbaha Server (Windows Server 2012 R2)'
  });
});

// 1. Vega Cari Listesi
app.get('/api/cariler', async (req, res) => {
  try {
    const pool = await getVegaPool();
    const result = await pool.request().query(`
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
    console.error('[API /api/cariler HATASI]:', err.message);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 2. Vega Cari Hareket Detayı
app.get('/api/cariler/:code/hareketler', async (req, res) => {
  try {
    const { code } = req.params;
    const pool = await getVegaPool();
    const result = await pool.request()
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
    console.error('[API /api/cariler/:code/hareketler HATASI]:', err.message);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 3. Vega Personel Listesi
app.get('/api/personel', async (req, res) => {
  try {
    const pool = await getVegaPool();
    const result = await pool.request().query(`
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
    console.error('[API /api/personel HATASI]:', err.message);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 4. Vega Personel Hareket Detayı
app.get('/api/personel/:code/hareketler', async (req, res) => {
  try {
    const { code } = req.params;
    const pool = await getVegaPool();
    const result = await pool.request()
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
    console.error('[API /api/personel/:code/hareketler HATASI]:', err.message);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 5. Vega Son İşlemler (Canlı Rapor)
app.get('/api/son-islemler', async (req, res) => {
  try {
    const pool = await getVegaPool();
    const result = await pool.request().query(`
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
    console.error('[API /api/son-islemler HATASI]:', err.message);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 6. e-Faturalar Listesi (Etik & Marif)
app.get(['/api/:company/efaturalar', '/api/efaturalar'], async (req, res) => {
  try {
    const company = (req.params.company || 'etik').toLowerCase();
    
    // Marif Flow (VEGADB F0102 + GMS.Net + EDM Bilisim Portal)
    if (company === 'marif') {
      const force = req.query.force === 'true';
      if (force) {
        try { syncMarifIncomingInvoices(true).catch(() => {}); } catch (e) {}
      }

      // 1. Vega Veritabanı Marif Faturaları (VEGADB - F0102)
      let vegaMarifInvoices = [];
      try {
        const pool = await getVegaPool();
        const result = await pool.request().query(`
          SELECT 
              b.IND AS [id],
              b.BELGENO AS [invoiceNo],
              b.TARIH AS [date],
              b.FIRMANO AS [cariCode],
              COALESCE(NULLIF(c.UNVAN, ''), NULLIF(c.FIRMAKODU, ''), c.ADI) AS [cariName],
              ISNULL(SUM(h.GERCEKTOPLAM), 0) AS [matrah],
              ISNULL(SUM(h.KDVTUTAR), 0) AS [kdv],
              ISNULL(SUM(h.GERCEKTOPLAM + h.KDVTUTAR), 0) AS [amount],
              CASE WHEN b.BELGETIPI IN (21, 27, 33, 34, 104, 105, 151) THEN 'giden' ELSE 'gelen' END AS [direction],
              CASE WHEN b.BELGENO LIKE 'MAR%' OR b.BELGENO LIKE 'EAS%' OR b.BELGENO LIKE 'ETS%' THEN 'e-Fatura' ELSE 'e-Arşiv' END AS [type]
          FROM F0102D0007VFATURABASLIKLAR b
          LEFT JOIN F0102D0007VFATURAHAREKETLER h ON b.IND = h.EVRAKNO
          LEFT JOIN F0102TBLCARI c ON b.FIRMANO = c.IND
          GROUP BY b.IND, b.BELGENO, b.TARIH, b.FIRMANO, c.UNVAN, c.FIRMAKODU, c.ADI, b.BELGETIPI
          ORDER BY b.TARIH DESC, b.IND DESC;
        `);
        vegaMarifInvoices = result.recordset || [];
      } catch (vegaErr) {
        console.warn('Vega Marif tablosu okunamadı:', vegaErr.message);
      }

      // 2. GMS.Net SQL (HASAN\\SQLEXPRESS) Faturaları
      let gmsInvoices = [];
      let incomingGms = [];
      try {
        const pool = await getGmsPool();
        const { marifDb } = await getMarifDatabaseName(pool);
        if (marifDb) {
          const result = await pool.request().query(`
            USE [${marifDb}];
            SELECT 
              b.ID AS [id],
              b.FAT_NO AS [invoiceNo],
              b.FAT_TAR AS [date],
              c.CARI_KODU AS [cariCode],
              COALESCE(NULLIF(c.UNVAN, ''), LTRIM(RTRIM(COALESCE(c.SOYAD, '') + ' ' + COALESCE(c.AD, '')))) AS [cariName],
              b.TOPLAM_TUTAR AS [matrah],
              b.KDV_TOPLAMI AS [kdv],
              b.FATURA_TOPLAMI AS [amount],
              'giden' AS [direction],
              CASE WHEN b.E_FATURA_MI = 1 THEN 'e-Fatura' ELSE 'e-Arşiv' END AS [type]
            FROM [${marifDb}].[dbo].[F0001_2026_E_BIL_FATURA_BASLIK] b
            LEFT JOIN [${marifDb}].[dbo].[F0001_2026_X_BIL_CARI] c ON b.CH_ID = c.ID
            ORDER BY b.FAT_TAR DESC
          `);
          gmsInvoices = result.recordset || [];

          try {
            const gelRes = await pool.request().query(`
              SELECT 
                f.ID AS [id],
                f.BELGE_NO AS [invoiceNo],
                f.DUZENLEME_TARIHI AS [date],
                f.TOPLAM_TUTAR AS [amount],
                'gelen' AS [direction],
                CASE WHEN f.BELGE_TURU LIKE '%ARS%' THEN 'e-Arşiv' ELSE 'e-Fatura' END AS [type]
              FROM [${marifDb}].[dbo].[F0001_2026_T_BIL_GIB_EA_GEL_FAT] f
              ORDER BY f.DUZENLEME_TARIHI DESC
            `);
            incomingGms = (gelRes.recordset || []).map(r => ({
              ...r,
              cariCode: '',
              cariName: 'Gelen Fatura (GMS)',
              matrah: r.amount || 0,
              kdv: 0
            }));
          } catch (gelErr) {}
        }
      } catch (sqlErr) {}

      // 3. EDM Bilişim Önbellek Dosyası
      let cachedIncoming = [];
      try {
        if (fs.existsSync(CACHE_FILE_PATH)) {
          cachedIncoming = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8')) || [];
        }
      } catch (e) {}

      // Tüm kaynakları fatura numarasına göre birleştir ve tekilleştir
      const invoiceMap = new Map();
      for (const inv of [...vegaMarifInvoices, ...gmsInvoices, ...incomingGms, ...cachedIncoming]) {
        if (inv && inv.invoiceNo && !invoiceMap.has(inv.invoiceNo)) {
          invoiceMap.set(inv.invoiceNo, inv);
        }
      }
      return res.json(Array.from(invoiceMap.values()));
    }

    // Default Vega Flow (Etik)
    const force = req.query.force === 'true';
    if (force) {
      try { syncEtikIncomingInvoices(true).catch(() => {}); } catch (e) {}
    }

    const config = companyPrefixes[company] || companyPrefixes.etik;
    const pool = await getVegaPool();
    const result = await pool.request().query(`
      SELECT 
          b.IND AS [id],
          b.BELGENO AS [invoiceNo],
          b.TARIH AS [date],
          b.FIRMANO AS [cariCode],
          COALESCE(NULLIF(c.UNVAN, ''), NULLIF(c.FIRMAKODU, ''), c.ADI) AS [cariName],
          ISNULL(SUM(h.GERCEKTOPLAM), 0) AS [matrah],
          ISNULL(SUM(h.KDVTUTAR), 0) AS [kdv],
          ISNULL(SUM(h.GERCEKTOPLAM + h.KDVTUTAR), 0) AS [amount],
          'giden' AS [direction],
          CASE WHEN b.BELGENO LIKE 'ETS%' OR b.BELGENO LIKE 'EVF%' THEN 'e-Fatura' ELSE 'e-Arşiv' END AS [type]
      FROM ${config.db}${config.baslik} b
      LEFT JOIN ${config.db}${config.hareket} h ON b.IND = h.EVRAKNO
      LEFT JOIN ${config.cari} c ON b.FIRMANO = c.IND
      WHERE b.BELGETIPI IN (21, 27, 33, 34, 104, 105, 151)
      GROUP BY b.IND, b.BELGENO, b.TARIH, b.FIRMANO, c.UNVAN, c.FIRMAKODU, c.ADI, b.BELGETIPI
      ORDER BY b.TARIH DESC, b.IND DESC;
    `);
    const gidenInvoices = result.recordset || [];

    // Gerçek gelen e-faturaları yerel önbellek dosyasından yükle
    let incomingInvoices = [];
    const etikCacheFile = path.join(__dirname, 'etik_incoming_cache.json');
    if (fs.existsSync(etikCacheFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(etikCacheFile, 'utf8')) || [];
        incomingInvoices = raw.filter(i => {
          if (!i || !i.invoiceNo) return false;
          const no = String(i.invoiceNo).trim().toUpperCase();
          return !no.startsWith('A000') && !no.startsWith('A00');
        });
      } catch (e) {}
    }

    const allInvoices = [...gidenInvoices, ...incomingInvoices];
    allInvoices.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    res.json(allInvoices);
  } catch (err) {
    console.error('[API /api/efaturalar HATASI]:', err.message);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 7. e-Fatura Detay (Kalemler)
app.get(['/api/:company/efaturalar/:id/detay', '/api/efaturalar/:id/detay'], async (req, res) => {
  try {
    const company = (req.params.company || 'etik').toLowerCase();
    const { id } = req.params;

    if (company === 'marif') {
      try {
        const pool = await getGmsPool();
        const { marifDb } = await getMarifDatabaseName(pool);
        if (marifDb) {
          const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
              USE [${marifDb}];
              SELECT 
                  h.ID AS [id],
                  COALESCE(s.AD, h.SATIR_ACIKLAMASI, 'Bilinmeyen Ürün') AS [productName],
                  h.TUTAR AS [lineTutar],
                  h.KDV_TUTARI AS [kdvTutar],
                  h.TVK_TUTARI AS [tevkifatTutar],
                  h.OTV_TUTARI AS [otv],
                  h.OIV_TUTARI AS [oiv]
              FROM [${marifDb}].[dbo].[F0001_2026_E_BIL_FATURA_SATIR] h
              LEFT JOIN [${marifDb}].[dbo].[F0001_2026_T_KOD_STOK] s ON h.URUN_KODU = s.ID OR h.URUN_KODU = s.KOD
              WHERE h.FAT_ID = @id
            `);
          return res.json(result.recordset);
        }
      } catch (e) {}
      return res.json([]);
    }

    const config = companyPrefixes[company] || companyPrefixes.etik;
    const pool = await getVegaPool();
    const result = await pool.request()
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
        FROM ${config.db}${config.hareket} h
        WHERE h.EVRAKNO = @id
        ORDER BY h.IND ASC;
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('[API /api/efaturalar/:id/detay HATASI]:', err.message);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// 8. e-Fatura Canlı XML İndirme
const handleXmlRequest = async (req, res) => {
  try {
    const company = (req.params.company || 'etik').toLowerCase();
    const { invoiceNo } = req.params;
    const config = companyPrefixes[company] || companyPrefixes.etik;

    // 1. Yerel disk klasörlerini kontrol et
    const localDirs = [
      'C:\\VegaArctos\\Bin\\Documents',
      'C:\\VegaArctos\\Documents',
      'C:\\eArsiv',
      'C:\\eFatura',
      'C:\\Arctos\\eFatura\\Giden',
      'C:\\Arctos\\eArsiv\\Giden',
      'C:\\Arctos'
    ];
    for (const d of localDirs) {
      const pXml = path.join(d, `${invoiceNo}.xml`);
      if (fs.existsSync(pXml)) {
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
        return res.sendFile(pXml);
      }
    }

    // 2. VEGADB XML Tablolarından Sorgula
    try {
      const pool = await getVegaPool();
      const tablesToQuery = [
        'F0101TBLEARSIVXML',
        'F0101TBLEFATURAXML',
        'TBLEARSIVXML',
        'TBLEFATURAXML'
      ];
      for (const tbl of tablesToQuery) {
        try {
          const qRes = await pool.request()
            .input('invNo', sql.NVarChar, invoiceNo)
            .query(`SELECT TOP 1 XMLDATA FROM ${tbl} WHERE EVRAKNO = @invNo OR FATURANO = @invNo OR ETTN = @invNo`);
          if (qRes.recordset && qRes.recordset.length > 0 && qRes.recordset[0].XMLDATA) {
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
            return res.send(qRes.recordset[0].XMLDATA);
          }
        } catch (tblErr) {}
      }
    } catch (dbErr) {}

    // 3. SOAP Entegratörden Al
    try {
      const { sessionId, securityKey, ipNumber } = await getVegaSession(config);
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

      const invoiceResObj = await soapRequest('GetInvoice', getInvoiceXml);
      const contentMatch = invoiceResObj.data.match(/<CONTENT>(.*?)<\/CONTENT>/);
      if (contentMatch && contentMatch[1]) {
        const xmlBuffer = Buffer.from(contentMatch[1], 'base64');
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
        return res.send(xmlBuffer);
      }
    } catch (soapErr) {}

    // 4. Standart UBL XML Üret ve Gönder
    const finalXml = generateUblXml({
      invoiceNo,
      date: new Date().toISOString(),
      cariName: 'MÜŞTERİ',
      cariContact: '',
      cariCity: 'AMASYA',
      taxOffice: 'AMASYA VERGİ DAİRESİ MÜD.',
      taxNo: '',
      customerCode: '',
      items: [{ productName: 'Et ve Et Ürünleri', quantity: 1, unit: 'KG', unitPrice: 0, lineTutar: 0, kdvRate: 1, kdvTutar: 0, description: '' }],
      company
    });

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
    return res.send(finalXml);
  } catch (err) {
    console.error('[XML İNDİRME HATASI]:', err.message);
    res.status(500).json({ error: 'XML indirme hatası', details: err.message });
  }
};

app.get('/api/:company/efaturalar/:invoiceNo/xml', handleXmlRequest);
app.get('/api/efaturalar/:invoiceNo/xml', handleXmlRequest);

// 9. e-Fatura Resmi PDF İndirme / Görüntüleme
const handlePdfRequest = async (req, res) => {
  try {
    const company = (req.params.company || 'etik').toLowerCase();
    const { invoiceNo } = req.params;
    const config = companyPrefixes[company] || companyPrefixes.etik;

    // 1. Önbellek kontrolü
    const cachedFile = path.join(PDF_CACHE_DIR, `${invoiceNo}.pdf`);
    if (fs.existsSync(cachedFile)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${invoiceNo}.pdf"`);
      return res.sendFile(cachedFile);
    }

    // 2. Marif için Mikrokom Portal REST API üzerinden indir
    if (company === 'marif') {
      try {
        let uuid = req.query.uuid;
        let direction = req.query.direction || 'gelen';
        let date = req.query.date;

        if (!uuid && fs.existsSync(CACHE_FILE_PATH)) {
          const cachedList = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8')) || [];
          const found = cachedList.find(i => i.invoiceNo === invoiceNo);
          if (found) {
            uuid = found.ettn || found.id;
            direction = found.direction || 'gelen';
            date = found.date;
          }
        }

        if (uuid) {
          const token = await getMikrokomToken();
          const media = await fetchMikrokomMedia(token, uuid, direction, date, 'pdf');
          if (media.status === 200 && media.buffer && media.buffer.length > 0) {
            try { fs.writeFileSync(cachedFile, media.buffer); } catch (e) {}
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${invoiceNo}.pdf"`);
            return res.send(media.buffer);
          }
        }
      } catch (mikroErr) {
        console.warn('[MİKROKOM PDF HATASI]:', mikroErr.message);
      }
    }

    // 3. Etik için SOAP Entegratörden Resmi PDF Al
    try {
      const { sessionId, securityKey, ipNumber } = await getVegaSession(config);
      let uuid = req.query.uuid || null;

      if (!uuid) {
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
          const m = searchRes.data.match(/<UUID>(.*?)<\/UUID>/);
          if (m && m[1]) {
            uuid = m[1];
            break;
          }
        }
      }

      if (uuid) {
        const getPdfXml = `<?xml version="1.0" encoding="utf-8"?>
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

        const pdfResObj = await soapRequest('GetInvoice_PDF', getPdfXml);
        const pdfResultMatch = pdfResObj.data.match(/<GetInvoice_PDFResult>(.*?)<\/GetInvoice_PDFResult>/);

        if (pdfResultMatch && pdfResultMatch[1]) {
          const pdfBuffer = Buffer.from(pdfResultMatch[1], 'base64');
          try { fs.writeFileSync(cachedFile, pdfBuffer); } catch (e) {}
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${invoiceNo}.pdf"`);
          return res.send(pdfBuffer);
        }
      }
    } catch (soapErr) {}

    // 4. Fallback: Veritabanı XML / HTML Viewer
    const pool = await getVegaPool();
    const xmlRes = await pool.request()
      .input('invNo', sql.NVarChar, invoiceNo)
      .query(`SELECT TOP 1 XMLDATA FROM F0101TBLEARSIVXML WHERE EVRAKNO = @invNo OR FATURANO = @invNo`);
    
    if (xmlRes.recordset && xmlRes.recordset.length > 0 && xmlRes.recordset[0].XMLDATA) {
      const safeXmlStr = JSON.stringify(xmlRes.recordset[0].XMLDATA);
      const clientHtml = `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><title>Fatura - ${invoiceNo}</title></head>
<body style="margin:0; padding:20px; background:#f0f0f0; display:flex; justify-content:center;">
  <div id="invoice-container" style="background:#fff; width:210mm; min-height:297mm; padding:15mm; box-shadow:0 0 10px rgba(0,0,0,0.3);">Yükleniyor...</div>
  <script>
    try {
      const xmlString = ${safeXmlStr};
      const xsltMatch = xmlString.match(/<cbc:EmbeddedDocumentBinaryObject[^>]*>([\\s\\S]*?)<\\/cbc:EmbeddedDocumentBinaryObject>/);
      if (xsltMatch && xsltMatch[1]) {
        const xsltString = decodeURIComponent(escape(atob(xsltMatch[1].trim())));
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const xsltDoc = parser.parseFromString(xsltString, "text/xml");
        const xsltProcessor = new XSLTProcessor();
        xsltProcessor.importStylesheet(xsltDoc);
        const resultDocument = xsltProcessor.transformToFragment(xmlDoc, document);
        const container = document.getElementById('invoice-container');
        container.innerHTML = '';
        container.appendChild(resultDocument);
      } else {
        document.getElementById('invoice-container').innerText = 'Fatura XML içeriği görüntülendi.';
      }
    } catch (e) {
      document.getElementById('invoice-container').innerText = 'Görsel oluşturma hatası: ' + e.message;
    }
  </script>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(clientHtml);
    }

    res.status(404).json({ error: `Fatura bulunamadı: ${invoiceNo}` });
  } catch (err) {
    console.error('[PDF YÜKLEME HATASI]:', err.message);
    res.status(500).json({ error: 'PDF indirme hatası', details: err.message });
  }
};

// HTML İndirme / Görüntüleme (Marif için)
const handleHtmlRequest = async (req, res) => {
  try {
    const company = (req.params.company || 'etik').toLowerCase();
    const { invoiceNo } = req.params;

    if (company === 'marif') {
      let uuid = req.query.uuid;
      let direction = req.query.direction || 'gelen';
      let date = req.query.date;

      if (!uuid && fs.existsSync(CACHE_FILE_PATH)) {
        const cachedList = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8')) || [];
        const found = cachedList.find(i => i.invoiceNo === invoiceNo);
        if (found) {
          uuid = found.ettn || found.id;
          direction = found.direction || 'gelen';
          date = found.date;
        }
      }

      if (uuid) {
        const token = await getMikrokomToken();
        const media = await fetchMikrokomMedia(token, uuid, direction, date, 'html');
        if (media.status === 200 && media.buffer && media.buffer.length > 0) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Content-Disposition', `inline; filename="${invoiceNo}.html"`);
          return res.send(media.buffer);
        }
      }
    }

    res.status(404).json({ error: `HTML bulunamadı: ${invoiceNo}` });
  } catch (err) {
    console.error('[HTML YÜKLEME HATASI]:', err.message);
    res.status(500).json({ error: 'HTML indirme hatası', details: err.message });
  }
};

app.get('/api/:company/efaturalar/:invoiceNo/pdf', handlePdfRequest);
app.get('/api/efaturalar/:invoiceNo/pdf', handlePdfRequest);
app.get('/api/:company/efaturalar/:invoiceNo/viewer', handlePdfRequest);
app.get('/api/efaturalar/:invoiceNo/viewer', handlePdfRequest);
app.get('/api/:company/efaturalar/:invoiceNo/html', handleHtmlRequest);
app.get('/api/efaturalar/:invoiceNo/html', handleHtmlRequest);

// 10. EBS Firebird Çek/Senet (Finans ofisinde veya yerelde varsa)
app.get('/api/checks', (req, res) => {
  if (!firebird) {
    return res.status(200).json([]);
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
      return res.status(200).json([]);
    }
    db.query('SELECT * FROM ALINAN_CEKLER', function(errAlinan, alinanRows) {
      if (errAlinan) { db.detach(); return res.status(200).json([]); }
      db.query('SELECT * FROM CEKLER', function(errKesilen, kesilenRows) {
        db.detach();
        if (errKesilen) { return res.status(200).json([]); }
        res.json([...(alinanRows || []), ...(kesilenRows || [])]);
      });
    });
  });
});

// ==========================================
// 5. MEZBAHA KESİM LİSTESİ CANLI SENKRONİZASYON
// ==========================================
const KESIM_EXCEL_PATHS = [
  String.raw`D:\yedekler\E D E 2023\EDE - 2021\GÜNLÜK KESİM 2022\Günlük Kesim 2022.xlsx`,
  String.raw`D:\yedekler\E D E 2023\EDE - 2021\GÜNLÜK KESİM 2022\Günlük Kesim 2022.xls`,
  String.raw`C:\yedekler\E D E 2023\EDE - 2021\GÜNLÜK KESİM 2022\Günlük Kesim 2022.xlsx`,
  path.join(__dirname, 'dosyalar', 'KESİM LİSTESİ 2026.xlsx'),
  path.join(__dirname, 'Günlük Kesim 2022.xlsx')
];

let cachedKesimRecords = [];
let lastKesimCacheMtime = 0;

function postToSupabaseRest(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'zubhjybqzcpplultpsgt.supabase.co',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'apikey': 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG',
        'Authorization': 'Bearer sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      }
    }, res => {
      let resData = '';
      res.on('data', c => resData += c);
      res.on('end', () => resolve(resData));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function getParsedKesimRecords(force = false) {
  let targetPath = null;
  for (const p of KESIM_EXCEL_PATHS) {
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }

  if (!targetPath) {
    const dir = String.raw`D:\yedekler\E D E 2023\EDE - 2021\GÜNLÜK KESİM 2022`;
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const xlsxFile = files.find(f => (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('~$'));
      if (xlsxFile) targetPath = path.join(dir, xlsxFile);
    }
  }

  if (!targetPath) return cachedKesimRecords;

  try {
    const stat = fs.statSync(targetPath);
    if (!force && cachedKesimRecords.length > 0 && stat.mtimeMs <= lastKesimCacheMtime) {
      return cachedKesimRecords;
    }

    if (!xlsx) {
      try { xlsx = require('xlsx'); } catch (e) { return cachedKesimRecords; }
    }

    const buf = fs.readFileSync(targetPath);
    const wb = xlsx.read(buf, { type: 'buffer' });
    const records = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
      if (!rows || rows.length < 2) continue;

      let headerIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 25); i++) {
        const r = rows[i];
        if (r && r.some(cell => {
          const strCell = String(cell || '').trim().toUpperCase();
          return strCell.includes('TARİH') || strCell.includes('TARIH') || strCell.includes('CİNS') || strCell.includes('CINS');
        })) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) continue;

      const headers = rows[headerIdx].map(h => String(h || '').trim().toUpperCase());
      const colMap = {
        tarih: headers.findIndex(h => h.includes('TARİH') || h.includes('TARIH')),
        el: headers.findIndex(h => h === 'EL' || h.includes('CARİ') || h.includes('CARI') || h.includes('TEDARİKÇİ') || h.includes('ADI SOYADI') || h.includes('AD SOYAD') || h.includes('ALICI')),
        adet: headers.findIndex(h => h === 'AD.' || h === 'ADET' || h === 'AD'),
        cinsi: headers.findIndex(h => h.includes('CİNSİ') || h.includes('CINSI') || h.includes('CİNS') || h.includes('CINS')),
        kg: headers.findIndex(h => h === 'KG' || h.includes('KARKAS') || h.includes('KİLO') || h.includes('KILO')),
        fiyat: headers.findIndex(h => h.includes('FİYAT') || h.includes('FIYAT')),
        pesinat: headers.findIndex(h => h.includes('PEŞİNAT') || h.includes('PESINAT') || h.includes('KESİNTİ') || h.includes('KESINTI') || h === 'TUTAR' || h.includes('ÖDENEN') || h.includes('ODENEN')),
        aciklama: headers.findIndex(h => h.includes('AÇIKLAMA') || h.includes('ACIKLAMA') || h.includes('NOT')),
        odeme: headers.findIndex(h => h.includes('ÖDEME') || h.includes('ODEME') || h.includes('TARİHİ') || h.includes('TARIHI'))
      };

      if (colMap.tarih === -1 || colMap.el === -1 || colMap.kg === -1) continue;

      let lastParsedDate = null;
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const rawTarih = row[colMap.tarih];
        const rawEl = row[colMap.el];
        const rawKg = row[colMap.kg];
        if (!rawEl || !rawKg) continue;

        let parsedDate = null;
        if (typeof rawTarih === 'number') {
          if (rawTarih > 35000 && rawTarih < 60000) {
            const utcDays = Math.floor(rawTarih - 25569);
            const d = new Date(utcDays * 86400 * 1000);
            parsedDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
          }
        } else if (rawTarih) {
          const s = String(rawTarih).trim();
          const mTr = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
          if (mTr) {
            parsedDate = `${mTr[3]}-${String(mTr[2]).padStart(2, '0')}-${String(mTr[1]).padStart(2, '0')}`;
          }
        }

        if (parsedDate) lastParsedDate = parsedDate;
        else parsedDate = lastParsedDate;
        if (!parsedDate) continue;

        const parsedSupplier = String(rawEl).trim();
        let kgStr = String(rawKg).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '').trim();
        const parsedCarcassWeight = parseFloat(kgStr) || 0;
        if (!parsedSupplier || parsedCarcassWeight <= 0) continue;

        let fiyatStr = colMap.fiyat !== -1 ? String(row[colMap.fiyat] || 0).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '').trim() : '0';
        const parsedPricePerKg = parseFloat(fiyatStr) || 0;
        const parsedAnimalType = colMap.cinsi !== -1 ? String(row[colMap.cinsi] || 'Dana').trim() : 'Dana';
        const parsedHeadCount = colMap.adet !== -1 ? (parseInt(String(row[colMap.adet])) || 1) : 1;

        let pesinatStr = colMap.pesinat !== -1 ? String(row[colMap.pesinat] || 0).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '').trim() : '0';
        const parsedPesinat = parseFloat(pesinatStr) || 0;
        const parsedNotes = colMap.aciklama !== -1 ? String(row[colMap.aciklama] || '').trim() : '';
        let parsedPayment = 'CARİ';
        if (colMap.odeme !== -1 && row[colMap.odeme]) {
          parsedPayment = String(row[colMap.odeme]).trim();
        }

        const total = parsedCarcassWeight * parsedPricePerKg;

        records.push({
          id: `kesim-${parsedDate}-${parsedSupplier}-${parsedCarcassWeight}-${i}`,
          organization_id: '13b8da90-27d1-440d-a8f4-eb50dadd6391',
          slaughter_date: parsedDate,
          supplier: parsedSupplier,
          head_count: parsedHeadCount,
          animal_type: parsedAnimalType,
          carcass_weight: parsedCarcassWeight,
          price_per_kg: parsedPricePerKg,
          total_amount: total,
          pesinat: parsedPesinat,
          kalan_tutar: total - parsedPesinat,
          notes: parsedNotes || null,
          payment_date: parsedPayment || null
        });
      }
    }

    cachedKesimRecords = records;
    lastKesimCacheMtime = stat.mtimeMs;
    return records;
  } catch (err) {
    console.error('[KESİM OKUMA HATASI]:', err.message);
    return cachedKesimRecords;
  }
}

app.get('/api/kesim/records', async (req, res) => {
  try {
    const { startDate, endDate, force } = req.query;
    const records = await getParsedKesimRecords(force === 'true');
    let filtered = records;
    if (startDate) filtered = filtered.filter(r => r.slaughter_date >= startDate);
    if (endDate) filtered = filtered.filter(r => r.slaughter_date <= endDate);
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kesim/sync', async (req, res) => {
  try {
    const records = await getParsedKesimRecords(true);
    if (records.length > 0) {
      for (let i = 0; i < records.length; i += 100) {
        const chunk = records.slice(i, i + 100);
        await postToSupabaseRest('/rest/v1/kesim_listesi', chunk);
      }
    }
    res.json({ success: true, count: records.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. MİKROKOM PORTAL REST SENKRONİZASYONU (MARİF GELEN E-FATURALAR)
// ==========================================
let cachedMikrokomToken = null;
let tokenExpiresAt = 0;

function getMikrokomToken() {
  if (cachedMikrokomToken && Date.now() < tokenExpiresAt) {
    return Promise.resolve(cachedMikrokomToken);
  }
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify({
      username: 'admin_007408',
      password: 'rvkDAuKh'
    });
    const req = https.request({
      hostname: 'portal.mikrokomdonusum.com',
      port: 443,
      path: '/accounting/api/auth/signin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0',
        'Content-Length': Buffer.byteLength(dataStr)
      },
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          cachedMikrokomToken = j.token ? (j.token.accessToken || j.token) : j.accessToken;
          tokenExpiresAt = Date.now() + 3600000;
          resolve(cachedMikrokomToken);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

function fetchMikrokomMedia(token, uuid, direction, dateStr, mediaType = 'pdf') {
  return new Promise((resolve, reject) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    const month = isNaN(d.getMonth()) ? 12 : d.getMonth();

    const path = direction === 'gelen' ? `/inbox/downloadMedia/${mediaType}` : `/outbox/downloadMedia/${mediaType}`;
    const postData = JSON.stringify({
      documentUuid: uuid,
      year: year,
      month: month
    });

    const req = https.request({
      hostname: 'portal.mikrokomdonusum.com',
      port: 443,
      path: `/accounting/api${path}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0',
        'Content-Length': Buffer.byteLength(postData)
      },
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode || 500, buffer: buf });
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

let lastSyncAttempt = 0;
let isSyncingMarif = false;
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 dakikada bir

async function syncMarifIncomingInvoices(force = false) {
  const now = Date.now();
  if (isSyncingMarif) return [];
  if (!force && (now - lastSyncAttempt < SYNC_INTERVAL_MS)) {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8')) || [];
      } catch (e) {}
    }
    return [];
  }

  isSyncingMarif = true;
  lastSyncAttempt = now;

  try {
    console.log('[MİKROKOM] Marif gelen ve giden faturaları Mikrokom Portal REST API üzerinden senkronize ediliyor...');
    const token = await getMikrokomToken();
    const invoiceMap = new Map();

    // Mevcut önbellek varsa yükle
    if (fs.existsSync(CACHE_FILE_PATH)) {
      try {
        const prev = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8')) || [];
        prev.forEach(inv => {
          if (inv && inv.invoiceNo) {
            invoiceMap.set(inv.invoiceNo, inv);
          }
        });
      } catch (e) {}
    }

    const currentYear = new Date().getFullYear();
    const yearsToScan = force ? [currentYear, currentYear - 1, 2024, 2023] : [currentYear, currentYear - 1];

    // 1. INBOX (GELEN FATURALAR)
    for (const yr of yearsToScan) {
      for (let mo = 0; mo <= 11; mo++) {
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const qs = `/accounting/api/inbox/getInboxes?year=${yr}&month=${mo}&headerSearch=&notInList=false&documentIds=&multipleVkn=&chemistWarehouseFilter=ALL&page=${page}&size=100&sort=receivedDate,desc&isArchive=0`;

          const res = await new Promise((resolve) => {
            const req = https.request({
              hostname: 'portal.mikrokomdonusum.com',
              port: 443,
              path: qs,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': 'Mozilla/5.0'
              },
              secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
            }, (response) => {
              let d = '';
              response.on('data', c => d += c);
              response.on('end', () => resolve({ statusCode: response.statusCode, data: d }));
            });
            req.on('error', () => resolve({ statusCode: 500, data: '' }));
            req.end();
          });

          if (res.statusCode === 200) {
            try {
              const j = JSON.parse(res.data);
              const items = j.content || [];
              for (const item of items) {
                const invObj = {
                  id: item.recordId,
                  invoiceNo: item.documentId,
                  ettn: item.documentUuid,
                  year: yr,
                  date: item.documentIssueDate || item.receivedDate,
                  receivedDate: item.receivedDate,
                  cariCode: item.sourceId || '',
                  vkn: item.sourceId || '',
                  cariName: item.sourceTitle || 'Bilinmeyen Cari',
                  matrah: item.taxExclusiveAmount != null ? Number(item.taxExclusiveAmount) : (Number(item.invoiceTotal || 0) - Number(item.taxTotalAmount || 0)),
                  kdv: Number(item.taxTotalAmount || 0),
                  amount: Number(item.taxInclusiveAmount || item.invoiceTotal || 0),
                  direction: 'gelen',
                  type: item.documentProfile || 'e-Fatura',
                  profile: item.documentProfile || 'TEMELFATURA',
                  status: item.responseCode || (item.responseValidationState === 2 ? 'KABUL' : 'Alındı')
                };
                if (invObj.invoiceNo) {
                  invoiceMap.set(invObj.invoiceNo, invObj);
                }
              }
              if (items.length < 100 || (page + 1) * 100 >= (j.totalElements || 0)) {
                hasMore = false;
              } else {
                page++;
              }
            } catch (e) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
      }
    }

    // 2. OUTBOX (GİDEN FATURALAR)
    for (const yr of yearsToScan) {
      for (let mo = 0; mo <= 11; mo++) {
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const qs = `/accounting/api/outbox/getOutboxes?year=${yr}&month=${mo}&page=${page}&size=100`;

          const res = await new Promise((resolve) => {
            const req = https.request({
              hostname: 'portal.mikrokomdonusum.com',
              port: 443,
              path: qs,
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': 'Mozilla/5.0'
              },
              secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
            }, (response) => {
              let d = '';
              response.on('data', c => d += c);
              response.on('end', () => resolve({ statusCode: response.statusCode, data: d }));
            });
            req.on('error', () => resolve({ statusCode: 500, data: '' }));
            req.end();
          });

          if (res.statusCode === 200) {
            try {
              const j = JSON.parse(res.data);
              const items = j.content || [];
              for (const item of items) {
                const invObj = {
                  id: item.recordId,
                  invoiceNo: item.documentId,
                  ettn: item.documentUuid,
                  year: yr,
                  date: item.documentIssueDate || item.receivedDate,
                  receivedDate: item.receivedDate,
                  cariCode: item.destinationId || '',
                  vkn: item.destinationId || '',
                  cariName: item.destinationTitle || 'Bilinmeyen Cari',
                  matrah: item.taxExclusiveAmount != null ? Number(item.taxExclusiveAmount) : (Number(item.invoiceTotal || 0) - Number(item.taxTotalAmount || 0)),
                  kdv: Number(item.taxTotalAmount || 0),
                  amount: Number(item.taxInclusiveAmount || item.invoiceTotal || 0),
                  direction: 'giden',
                  type: item.documentProfile || 'e-Fatura',
                  profile: item.documentProfile || 'TEMELFATURA',
                  status: item.resultExplanation || item.responseCode || (item.processState === 500 ? 'Başarılı' : 'Gönderildi')
                };
                if (invObj.invoiceNo) {
                  invoiceMap.set(invObj.invoiceNo, invObj);
                }
              }
              if (items.length < 100 || (page + 1) * 100 >= (j.totalElements || 0)) {
                hasMore = false;
              } else {
                page++;
              }
            } catch (e) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }
      }
    }

    const finalInvoices = Array.from(invoiceMap.values());
    finalInvoices.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.invoiceNo || '').localeCompare(a.invoiceNo || ''));
    console.log(`[MİKROKOM] Senkronizasyon tamamlandı: Toplam ${finalInvoices.length} adet Marif faturası kaydedildi.`);
    try {
      fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(finalInvoices, null, 2), 'utf8');
    } catch (e) {}

    // Supabase Önbelleğine de aktar
    try {
      await postToSupabaseRest('/rest/v1/vega_efatura_cache', {
        company: 'marif',
        invoices: finalInvoices,
        record_count: finalInvoices.length,
        updated_at: new Date().toISOString()
      });
    } catch (supaErr) {}

    isSyncingMarif = false;
    return finalInvoices;
  } catch (err) {
    console.error('[MİKROKOM SENKRONİZASYON HATASI]:', err.message);
    isSyncingMarif = false;
    return [];
  }
}

// Akıllı Vega Etik Senkronizasyon Kilidi ve İstek Sınırlayıcı
let lastEtikSyncAttempt = 0;
let isSyncingEtik = false;
const ETIK_SYNC_INTERVAL_MS = 15 * 60 * 1000;

async function syncEtikIncomingInvoices(force = false) {
  const now = Date.now();
  if (isSyncingEtik) return [];
  if (!force && (now - lastEtikSyncAttempt < ETIK_SYNC_INTERVAL_MS)) {
    return [];
  }

  isSyncingEtik = true;
  lastEtikSyncAttempt = now;

  try {
    const etikCacheFile = path.join(__dirname, 'etik_incoming_cache.json');
    const localEtikCacheFile = path.join(__dirname, '..', 'etik_incoming_cache.json');
    const targetFile = fs.existsSync(etikCacheFile) ? etikCacheFile : localEtikCacheFile;

    let existingInvoices = [];
    if (fs.existsSync(targetFile)) {
      try {
        existingInvoices = JSON.parse(fs.readFileSync(targetFile, 'utf8')) || [];
      } catch (e) {}
    }

    const invMap = new Map();
    existingInvoices.forEach(inv => {
      if (inv && inv.invoiceNo) invMap.set(inv.invoiceNo, inv);
    });

    const sess = await getVegaSession(companyPrefixes.etik);
    if (!sess || !sess.sessionId) {
      isSyncingEtik = false;
      return [];
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const chunks = [
      [`${prevYear}-${String(prevMonth).padStart(2, '0')}-01`, `${prevYear}-${String(prevMonth).padStart(2, '0')}-15`],
      [`${prevYear}-${String(prevMonth).padStart(2, '0')}-16`, `${prevYear}-${String(prevMonth).padStart(2, '0')}-${new Date(prevYear, prevMonth, 0).getDate()}`],
      [`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`, `${currentYear}-${String(currentMonth).padStart(2, '0')}-15`],
      [`${currentYear}-${String(currentMonth).padStart(2, '0')}-16`, `${currentYear}-${String(currentMonth).padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`]
    ];

    for (const [start, end] of chunks) {
      const searchXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetInvoice xmlns="http://tempuri.org/">
      <GetInvoiceRequest>
        <Login_Request_Header>
          <Session_ID>${sess.sessionId}</Session_ID>
          <IP_Number>${sess.ipNumber}</IP_Number>
          <Security_Key>${sess.securityKey}</Security_Key>
        </Login_Request_Header>
        <INVOICE_SEARCH_KEY>
          <LIMIT>1000</LIMIT>
          <LIMITSpecified>true</LIMITSpecified>
          <START_DATE>${start}T00:00:00</START_DATE>
          <START_DATESpecified>true</START_DATESpecified>
          <END_DATE>${end}T23:59:59</END_DATE>
          <END_DATESpecified>true</END_DATESpecified>
          <READ_INCLUDED>true</READ_INCLUDED>
          <READ_INCLUDEDSpecified>true</READ_INCLUDEDSpecified>
          <PROCESSED_INCLUDED>true</PROCESSED_INCLUDED>
          <PROCESSED_INCLUDEDSpecified>true</PROCESSED_INCLUDEDSpecified>
          <DIRECTION>IN</DIRECTION>
        </INVOICE_SEARCH_KEY>
        <HEADER_ONLY>true</HEADER_ONLY>
      </GetInvoiceRequest>
    </GetInvoice>
  </soap:Body>
</soap:Envelope>`;

      try {
        const res = await soapRequest('GetInvoice', searchXml);
        const xmlStr = res.data;
        let pos = 0;
        while (true) {
          const startIdx = xmlStr.indexOf('<INVOICE>', pos);
          if (startIdx === -1) break;
          const endIdx = xmlStr.indexOf('</INVOICE>', startIdx);
          if (endIdx === -1) break;

          const chunk = xmlStr.substring(startIdx + 9, endIdx);
          pos = endIdx + 10;

          const extractTag = (text, tag) => {
            const open = `<${tag}`;
            const oIdx = text.indexOf(open);
            if (oIdx === -1) return '';
            const closeBracket = text.indexOf('>', oIdx);
            if (closeBracket === -1) return '';
            const cIdx = text.indexOf(`</${tag}>`, closeBracket);
            if (cIdx === -1) return '';
            return (' ' + text.substring(closeBracket + 1, cIdx)).slice(1).trim();
          };

          const invNo = extractTag(chunk, 'ID');
          if (invNo) {
            invMap.set(invNo, {
              invoiceNo: invNo,
              ettn: extractTag(chunk, 'UUID'),
              cariName: extractTag(chunk, 'SUPPLIER') || 'Bilinmeyen Cari',
              vkn: extractTag(chunk, 'SENDER'),
              cariCode: extractTag(chunk, 'SENDER'),
              date: extractTag(chunk, 'ISSUE_DATE') || extractTag(chunk, 'CDATE'),
              receivedDate: extractTag(chunk, 'CDATE'),
              amount: parseFloat(extractTag(chunk, 'PAYABLE_AMOUNT') || '0'),
              matrah: parseFloat(extractTag(chunk, 'PAYABLE_AMOUNT') || '0'),
              kdv: 0,
              direction: 'gelen',
              type: extractTag(chunk, 'PROFILEID') || 'e-Fatura',
              profile: extractTag(chunk, 'PROFILEID') || 'TEMELFATURA',
              status: extractTag(chunk, 'GIB_STATUS_DESCRIPTION') || 'Alındı'
            });
          }
        }
      } catch (chunkErr) {
        console.warn(`[ETİK SENKRONİZASYON ARALIK HATASI ${start}..${end}]:`, chunkErr.message);
      }
    }

    const allInvoices = Array.from(invMap.values()).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    try {
      fs.writeFileSync(path.join(__dirname, 'etik_incoming_cache.json'), JSON.stringify(allInvoices, null, 2), 'utf8');
      const rootCache = path.join(__dirname, '..', 'etik_incoming_cache.json');
      if (fs.existsSync(path.dirname(rootCache))) {
        fs.writeFileSync(rootCache, JSON.stringify(allInvoices, null, 2), 'utf8');
      }
    } catch (e) {}

    // Supabase vega_efatura_cache tablosunu da güncelle
    try {
      await postToSupabaseRest('/rest/v1/vega_efatura_cache', {
        company: 'etik',
        invoices: allInvoices,
        record_count: allInvoices.length,
        updated_at: new Date().toISOString(),
        updated_by: 'SOAP Sync Service'
      });
    } catch (supaErr) {}

    isSyncingEtik = false;
    return allInvoices;
  } catch (err) {
    console.error('[ETİK SENKRONİZASYON HATASI]:', err.message);
    isSyncingEtik = false;
    return [];
  }
}

// Arka plan otomatik periyodik kontroller
setInterval(() => {
  getParsedKesimRecords().catch(e => console.warn('[KESİM PERİYODİK]:', e.message));
}, 60 * 1000);

setInterval(() => {
  syncEtikIncomingInvoices(false).catch(e => console.warn('[ETİK PERİYODİK]:', e.message));
}, ETIK_SYNC_INTERVAL_MS);

setInterval(() => {
  syncMarifIncomingInvoices(false).catch(e => console.warn('[MARİF PERİYODİK]:', e.message));
}, SYNC_INTERVAL_MS);

// ==========================================
// 6. SUNUCUYU BAŞLAT
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` VEGA API & MEZBAHA KESİM SERVİSİ PORT ${PORT}'DE AKTİF!`);
  console.log(` Sağlık Kontrolü: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
