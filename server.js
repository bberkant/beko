const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err ? (err.stack || err.message) : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Rejection:', reason);
});

const CACHE_FILE_PATH = path.join(__dirname, 'marif_incoming_cache.json');
const PDF_CACHE_DIR = path.join(__dirname, 'pdf_cache');
if (!fs.existsSync(PDF_CACHE_DIR)) {
  fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });
}

let firebird;
try {
  firebird = require('node-firebird');
} catch (e) {
  console.warn("UYARI: node-firebird modülü yüklenemedi. Çek senkronizasyonu çalışmayabilir.");
}

const app = express();
app.use(cors());
app.use(express.json());

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

// Firma Veritabanı ve SOAP Kullanıcı Tanımları
const companyPrefixes = {
  etik: {
    db: '', // Doğrudan VEGADB veritabanından çekilecek
    baslik: 'F0101D0008VFATURABASLIKLAR',
    hareket: 'F0101D0008VFATURAHAREKETLER',
    cari: 'F0101TBLCARI',
    username: 'admin_005857',
    password: '4fq8BICM'
  },
  marif: {
    db: '', // Doğrudan VEGADB veritabanından çekilecek
    baslik: 'F0102D0007VFATURABASLIKLAR',
    hareket: 'F0102D0007VFATURAHAREKETLER',
    cari: 'F0102TBLCARI',
    username: 'admin_007408',
    password: 'rvkDAuKh'
  }
};

// SOAP Web Servisi İstek Yardımcı Fonksiyonu (Legacy SSL İzinli)
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
      // Unsafe legacy renegotiation engeline takılmamak için bu seçeneği etkinleştiriyoruz
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Vega Entegratör Oturumu Açma Yardımcısı
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
    throw new Error('Giriş başarısız: Session_ID veya Security_Key alınamadı. Yanıt: ' + loginResponse.slice(0, 200));
  }

  return {
    sessionId: sessionIdMatch[1],
    securityKey: securityKeyMatch[1],
    ipNumber: ipNumberMatch ? ipNumberMatch[1] : ''
  };
}

function generateUblXml({ invoiceNo, date, cariName, cariContact, cariCity, taxOffice, taxNo, customerCode, items, company }) {
  const isEtik = (company || 'etik').toLowerCase() === 'etik';
  const supplierTitle = isEtik ? 'ETİK ET VE ET ÜRÜNLERİ SAN. TİC. LTD. ŞTİ.' : 'MARİF ET VE ET ÜRÜNLERİ SAN. TİC. LTD. ŞTİ.';
  const supplierVkn = isEtik ? '3810452391' : '6120803445';
  const supplierTaxOffice = isEtik ? 'AMASYA VERGİ DAİRESİ MÜD.' : 'AMASYA VERGİ DAİRESİ MÜD.';
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

// 0. Vega e-Fatura Canlı XML İndirme
const handleXmlRequest = async (req, res) => {
  try {
    const company = (req.params.company || 'etik').toLowerCase();
    const { invoiceNo } = req.params;
    const config = companyPrefixes[company];
    if (!config) {
      return res.status(400).json({ error: 'Geçersiz firma parametresi' });
    }

    // 1. Önce sunucudaki yerel Arctos / Vega klasörlerini kontrol et
    const localDirs = [
      'C:\\VegaArctos\\Bin\\Documents',
      'C:\\VegaArctos\\Documents',
      'C:\\VegaArctos\\Bin\\eArsiv',
      'C:\\eArsiv',
      'C:\\eFatura',
      'C:\\Arctos\\eFatura\\Giden',
      'C:\\Arctos\\eArsiv\\Giden',
      'C:\\Arctos\\eFatura\\Gelen',
      'C:\\Arctos\\eArsiv\\Gelen',
      'C:\\Arctos',
      'D:\\VegaArctos\\Bin\\Documents',
      'D:\\VegaArctos\\Documents',
      'D:\\VegaArctos\\Bin\\eArsiv',
      'D:\\eArsiv',
      'D:\\eFatura',
      'D:\\Arctos\\eFatura\\Giden',
      'D:\\Arctos\\eArsiv\\Giden',
      'D:\\Arctos\\eFatura\\Gelen',
      'D:\\Arctos\\eArsiv\\Gelen',
      'D:\\Arctos'
    ];
    for (const d of localDirs) {
      const pXml = path.join(d, `${invoiceNo}.xml`);
      if (fs.existsSync(pXml)) {
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
        return res.sendFile(pXml);
      }
      const pZip = path.join(d, `${invoiceNo}.zip`);
      if (fs.existsSync(pZip)) {
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.zip"`);
        return res.sendFile(pZip);
      }
    }

    // 2. VEGADB SQL Veritabanından Orijinal XMLDATA'yı sorgula
    try {
      const pool = await sql.connect(dbConfig);
      const tablesToQuery = [
        `${config.db}TBLEARSIVXML`,
        `${config.db}TBLEFATURAXML`,
        `F0101TBLEARSIVXML`,
        `F0101TBLEFATURAXML`,
        `F0102TBLEARSIVXML`,
        `F0102TBLEFATURAXML`,
        `TBLEARSIVXML`,
        `TBLEFATURAXML`,
        `TBLARSIVXML`,
        `TBLFATURAXML`
      ];

      for (const tbl of tablesToQuery) {
        try {
          const qRes = await pool.request()
            .input('invNo', sql.NVarChar, invoiceNo)
            .query(`SELECT TOP 1 XMLDATA FROM ${tbl} WHERE EVRAKNO = @invNo OR FATURANO = @invNo OR ETTN = @invNo`);
          if (qRes.recordset && qRes.recordset.length > 0 && qRes.recordset[0].XMLDATA) {
            const xmlText = qRes.recordset[0].XMLDATA;
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
            return res.send(xmlText);
          }
        } catch (tblErr) {
          // Tablo yoksa devam et
        }
      }
    } catch (dbErr) {
      console.warn('VEGADB XML tablosu okuma uyarısı:', dbErr.message);
    }

    // 3. Bulunamadıysa SOAP Entegratörden çek
    try {
      const { sessionId, securityKey, ipNumber } = await getVegaSession(config);

      // A) e-Arşiv ise veya ETS ile başlıyorsa GetEArchive dene
      let contentMatch = null;
      try {
        const getArchiveXml = `<?xml version="1.0" encoding="utf-8"?>
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

        const arcRes = await soapRequest('GetEArchive', getArchiveXml);
        contentMatch = arcRes.data.match(/<CONTENT>(.*?)<\/CONTENT>/) || arcRes.data.match(/<EDocumentData>(.*?)<\/EDocumentData>/);
      } catch (arcErr) {
        console.warn('GetEArchive denemesi:', arcErr.message);
      }

      // B) e-Fatura GetInvoice dene
      if (!contentMatch) {
        for (const dir of ['OUT', 'IN']) {
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
          <DIRECTION>${dir}</DIRECTION>
        </INVOICE_SEARCH_KEY>
        <HEADER_ONLY>false</HEADER_ONLY>
      </GetInvoiceRequest>
    </GetInvoice>
  </soap:Body>
</soap:Envelope>`;

          const invoiceResObj = await soapRequest('GetInvoice', getInvoiceXml);
          contentMatch = invoiceResObj.data.match(/<CONTENT>(.*?)<\/CONTENT>/) || invoiceResObj.data.match(/<EDocumentData>(.*?)<\/EDocumentData>/);
          if (contentMatch) break;
        }
      }

      if (contentMatch && contentMatch[1]) {
        const base64Content = contentMatch[1];
        const xmlBuffer = Buffer.from(base64Content, 'base64');

        // Zip kontrolü (PK başlığı varsa)
        if (xmlBuffer[0] === 0x50 && xmlBuffer[1] === 0x4B && xmlBuffer[2] === 0x03 && xmlBuffer[3] === 0x04) {
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.zip"`);
          return res.send(xmlBuffer);
        } else {
          res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
          return res.send(xmlBuffer);
        }
      }
    } catch (soapErr) {
      console.warn('SOAP entegratörden XML çekme uyarısı:', soapErr.message);
    }

    // 4. Bulunamadıysa VEGADB Fatura Başlık ve Stok Kalemlerinden Orijinal UBL-TR XML Üret
    try {
      const pool = await sql.connect(dbConfig);
      const headRes = await pool.request()
        .input('invoiceNo', sql.VarChar, invoiceNo)
        .query(`
          SELECT TOP 1
              b.IND AS [id],
              b.BELGENO AS [invoiceNo],
              b.TARIH AS [date],
              b.FIRMANO AS [cariCode],
              COALESCE(NULLIF(c.UNVAN, ''), NULLIF(c.FIRMAKODU, ''), c.ADI) AS [cariName],
              COALESCE(NULLIF(c.ADI, ''), '') AS [cariContact],
              ISNULL(c.SEHIR, 'AMASYA') AS [cariCity],
              ISNULL(c.VERGIDAIRESI, 'AMASYA VERGİ DAİRESİ MÜD.') AS [taxOffice],
              COALESCE(NULLIF(c.VERGINO, ''), '') AS [taxNo],
              ISNULL(c.FIRMAKODU, '') AS [customerCode]
          FROM ${config.db}${config.baslik} b
          LEFT JOIN ${config.cari} c ON b.FIRMANO = c.IND
          WHERE b.BELGENO = @invoiceNo
        `);

      const invoiceHeader = headRes.recordset?.[0];
      if (invoiceHeader) {
        let invoiceItems = [];
        try {
          const stokRes = await pool.request()
            .input('evrakNo', sql.VarChar, invoiceNo)
            .query(`
              SELECT 
                  sh.IND AS [id],
                  COALESCE(s.MALINCINSI, sh.IZAHAT, 'Mal/Hizmet') AS [productName],
                  COALESCE(NULLIF(sh.CIKAN, 0), NULLIF(sh.GIREN, 0), 0) AS [rawQuantity],
                  COALESCE(b.BIRIMADI, 'KG') AS [unit],
                  ISNULL(sh.BIRIMFIYAT, 0) AS [unitPrice],
                  ISNULL(sh.TUTAR, 0) AS [lineTutar],
                  ISNULL(sh.ALTNOT, '') AS [description]
              FROM F0101D0008TBLSTOKHAREKETLERI sh
              LEFT JOIN F0101TBLSTOKLAR s ON sh.STOKNO = s.IND
              LEFT JOIN F0101TBLBIRIMLEREX b ON sh.BIRIMEX = b.IND
              WHERE sh.EVRAKNO = @evrakNo
              ORDER BY sh.IND ASC
            `);

          if (stokRes.recordset && stokRes.recordset.length > 0) {
            invoiceItems = stokRes.recordset.map(r => {
              let lineTutar = Number(r.lineTutar || 0);
              let unitPrice = Number(r.unitPrice || 0);
              let quantity = Number(r.rawQuantity || 0);
              if (quantity === 0 && unitPrice > 0 && lineTutar > 0) {
                quantity = Math.round((lineTutar / unitPrice) * 100) / 100;
              }
              if (quantity === 0) quantity = 1;
              if (unitPrice === 0 && lineTutar > 0 && quantity > 0) {
                unitPrice = lineTutar / quantity;
              }
              return {
                id: r.id,
                productName: r.productName,
                quantity,
                unit: r.unit || 'KG',
                unitPrice,
                lineTutar,
                kdvRate: 1,
                kdvTutar: lineTutar * 0.01,
                description: r.description || ''
              };
            });
          }
        } catch (stokErr) {}

        if (invoiceItems.length === 0) {
          try {
            const itemsRes = await pool.request()
              .input('id', sql.Int, invoiceHeader.id)
              .query(`
                SELECT 
                    h.IND AS [id],
                    h.MALINCINSI AS [productName],
                    h.GERCEKTOPLAM AS [lineTutar],
                    h.KDVTUTAR AS [kdvTutar]
                FROM ${config.db}${config.hareket} h
                WHERE h.EVRAKNO = @id
                ORDER BY h.IND ASC
              `);
            invoiceItems = (itemsRes.recordset || []).map(r => {
              const lineTutar = Number(r.lineTutar || 0);
              const kdvTutar = Number(r.kdvTutar || 0);
              const kdvRate = (lineTutar > 0 && kdvTutar > 0) ? Math.round((kdvTutar / lineTutar) * 100) : 1;
              return {
                id: r.id,
                productName: r.productName,
                quantity: 1,
                unit: 'Adet',
                unitPrice: lineTutar,
                lineTutar,
                kdvRate,
                kdvTutar,
                description: ''
              };
            });
          } catch (hErr) {}
        }

        const generatedXml = generateUblXml({
          invoiceNo: invoiceHeader.invoiceNo,
          date: invoiceHeader.date,
          cariName: invoiceHeader.cariName,
          cariContact: invoiceHeader.cariContact,
          cariCity: invoiceHeader.cariCity,
          taxOffice: invoiceHeader.taxOffice,
          taxNo: invoiceHeader.taxNo,
          customerCode: invoiceHeader.customerCode,
          items: invoiceItems,
          company
        });

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${invoiceNo}.xml"`);
        return res.send(generatedXml);
      }
    } catch (sqlGenErr) {
      console.warn('UBL XML üretim hatası:', sqlGenErr.message);
    }

    return res.status(404).json({ error: 'Faturanın XML içeriği yerel sunucuda veya entegratörde bulunamadı.' });
  } catch (err) {
    console.error('XML indirme hatası:', err.message);
    res.status(500).json({ error: 'XML indirme hatası', details: err.message });
  }
};

app.get('/api/:company/efaturalar/:invoiceNo/xml', handleXmlRequest);
app.get('/api/efaturalar/:invoiceNo/xml', handleXmlRequest);

// Sayıyı Türkçe yazıya çevirme (Vega Arctos Standartı)
function toTurkishWords(num) {
  const ones = ['', 'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ'];
  const tens = ['', 'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN'];
  function grp(n) {
    let s = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    if (h === 1) s += 'YÜZ';
    else if (h > 1) s += ones[h] + 'YÜZ';
    s += tens[t] + ones[o];
    return s;
  }
  const parts = Number(num || 0).toFixed(2).split('.');
  let intP = parseInt(parts[0], 10);
  const decP = parseInt(parts[1], 10);
  if (intP === 0 && decP === 0) return 'SIFIR TL';
  let w = '';
  const millions = Math.floor(intP / 1000000);
  intP %= 1000000;
  const thousands = Math.floor(intP / 1000);
  const rem = intP % 1000;
  if (millions > 0) w += grp(millions) + 'MİLYON';
  if (thousands === 1) w += 'BİN';
  else if (thousands > 1) w += grp(thousands) + 'BİN';
  if (rem > 0) w += grp(rem);
  w += ' TL';
  if (decP > 0) w += ' ' + grp(decP) + ' KR';
  return w;
}

// Vega Fatura Görsel Oluşturucu (Hem e-Fatura/e-Arşiv Hem Matbuu Satış Faturası)






const AUTHENTIC_GIB_LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4QBoRXhpZgAASUkqAAgAAAADABIBAwABAAAAAQAAADEBAgAQAAAAMgAAAGmHBAABAAAAQgAAAAAAAABTaG90d2VsbCAwLjIyLjAAAgACoAkAAQAAAKYBAAADoAkAAQAAAKYBAAAAAAAA/+EJ9Gh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNC40LjAtRXhpdjIiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iIGV4aWY6UGl4ZWxYRGltZW5zaW9uPSI0MjIiIGV4aWY6UGl4ZWxZRGltZW5zaW9uPSI0MjIiIHRpZmY6SW1hZ2VXaWR0aD0iNDIyIiB0aWZmOkltYWdlSGVpZ2h0PSI0MjIiIHRpZmY6T3JpZW50YXRpb249IjEiLz4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSJ3Ij8+/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUE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";
const AUTHENTIC_VEGA_LOGO = "data:image/png;base64, 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";
const AUTHENTIC_SIG_LOGO = "data:image/png;base64, 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";
const AUTHENTIC_QR_CODE = "data:image/jpeg;base64,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";

function generateVegaInvoiceHtml(invoice, items, company = 'etik') {
  const isEtik = company.toLowerCase() === 'etik';
  const seller = isEtik ? {
    name: 'ETİK ET VE ET ÜRÜNLERİ GIDA TARIM',
    name2: 'HAYV.İNŞ.NAK.SAN.TİC.LTD.ŞTİ.',
    street: 'YÜZEVLER MAHALLESİ DANİŞMENT CAD.',
    buildingNo: 'NO:4/2',
    citySub: 'AMASYA MERKEZ',
    city: 'AMASYA',
    taxOffice: 'AMASYA',
    vkn: '3810458562',
    tradeRegNo: '004790',
    mersisNo: '0381045856200013'
  } : {
    name: 'MARİF ET VE ET ÜRÜNLERİ',
    name2: 'HAYVANCILIK GIDA SAN. TİC. LTD. ŞTİ.',
    street: 'SULUOVA',
    buildingNo: '',
    citySub: 'SULUOVA',
    city: 'AMASYA',
    taxOffice: 'SULUOVA',
    vkn: '6120894562',
    tradeRegNo: '003210',
    mersisNo: '0612089456200001'
  };

  const invNo = invoice.invoiceNo || '';
  const dateObj = invoice.date ? new Date(invoice.date) : new Date();
  const formattedDate = !isNaN(dateObj.getTime())
    ? String(dateObj.getDate()).padStart(2, '0') + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + dateObj.getFullYear()
    : '05-09-2026';
  const formattedTime = '12:31';

  const deterministicUuid = (seed) => {
    const hash = crypto.createHash('md5').update(seed || 'inv').digest('hex').toUpperCase();
    return hash.slice(0, 8) + '-' + hash.slice(8, 12) + '-' + hash.slice(12, 16) + '-' + hash.slice(16, 20) + '-' + hash.slice(20, 32);
  };
  const uuid = invoice.uuid || deterministicUuid(invNo);

  const scenario = 'TICARIFATURA';
  const invoiceType = 'SATIS';

  const rows = (items && items.length > 0) ? items.map((it, idx) => {
    const qty = Number(it.quantity || it.MIKTAR || 1);
    const price = Number(it.unitPrice || it.FIYAT || it.total || 0);
    const total = Number(it.total || it.TUTAR || (qty * price));
    const kdvRate = Number(it.kdvRate || it.KDVORANI || 1);
    const kdvTutar = Number(it.kdvTutar || (total * kdvRate / 100));
    return {
      sira: idx + 1,
      name: it.productName || it.MALINCINSI || it.STOKADI || 'ET ÜRÜNÜ',
      qty: qty.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
      unit: it.unit || it.BIRIM || 'kg',
      price: price,
      kdvRate: kdvRate,
      kdvTutar: kdvTutar,
      total: total,
      desc: it.description || it.ACIKLAMA || ''
    };
  }) : [
    { sira: 1, name: 'ET ÜRÜNÜ', qty: '1', unit: 'Adet', price: Number(invoice.total || 0), kdvRate: 1, kdvTutar: Number(invoice.total || 0) * 0.01, total: Number(invoice.total || 0), desc: '' }
  ];

  const matrah = rows.reduce((s, r) => s + r.total, 0);
  const totalKdv = rows.reduce((s, r) => s + r.kdvTutar, 0);
  const grandTotal = matrah + totalKdv;

  const fmtCur = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  const words = toTurkishWords(grandTotal);

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>e-Belge</title>
  <style type="text/css">
${"\n\t\t\t\t\tbody {\n\t\t\t\t\tbackground-color: #FFFFFF;\n\t\t\t\t\tfont-family: 'Tahoma', \"Times New Roman\", Times, serif;\n\t\t\t\t\tfont-size: 11px;\n\t\t\t\t\tcolor: #000000;\n\t\t\t\t\t}\n\t\t\t\t\th1, h2 {\n\t\t\t\t\tpadding-bottom: 3px;\n\t\t\t\t\tpadding-top: 3px;\n\t\t\t\t\tmargin-bottom: 5px;\n\t\t\t\t\ttext-transform: uppercase;\n\t\t\t\t\tfont-family: Arial, Helvetica, sans-serif;\n\t\t\t\t\t}\n\t\t\t\t\th1 {\n\t\t\t\t\tfont-size: 1.4em;\n\t\t\t\t\ttext-transform:none;\n\t\t\t\t\t}\n\t\t\t\t\th2 {\n\t\t\t\t\tfont-size: 1em;\n\t\t\t\t\tcolor: brown;\n\t\t\t\t\t}\n\t\t\t\t\th3 {\n\t\t\t\t\tfont-size: 1em;\n\t\t\t\t\tcolor: #000000;\n\t\t\t\t\ttext-align: justify;\n\t\t\t\t\tmargin: 0;\n\t\t\t\t\tpadding: 0;\n\t\t\t\t\t}\n\t\t\t\t\th4 {\n\t\t\t\t\tfont-size: 1.1em;\n\t\t\t\t\tfont-style: bold;\n\t\t\t\t\tfont-family: Arial, Helvetica, sans-serif;\n\t\t\t\t\tcolor: #000000;\n\t\t\t\t\tmargin: 0;\n\t\t\t\t\tpadding: 0;\n\t\t\t\t\t}\n\t\t\t\t\thr {\n\t\t\t\t\theight:2px;\n\t\t\t\t\tcolor: #000000;\n\t\t\t\t\tbackground-color: #000000;\n\t\t\t\t\tborder-bottom: 1px solid #000000;\n\t\t\t\t\t}\n\t\t\t\t\tp, ul, ol {\n\t\t\t\t\tmargin-top: 1.5em;\n\t\t\t\t\t}\n\t\t\t\t\tul, ol {\n\t\t\t\t\tmargin-left: 3em;\n\t\t\t\t\t}\n\t\t\t\t\tblockquote {\n\t\t\t\t\tmargin-left: 3em;\n\t\t\t\t\tmargin-right: 3em;\n\t\t\t\t\tfont-style: italic;\n\t\t\t\t\t}\n\t\t\t\t\ta {\n\t\t\t\t\ttext-decoration: none;\n\t\t\t\t\tcolor: #70A300;\n\t\t\t\t\t}\n\t\t\t\t\ta:hover {\n\t\t\t\t\tborder: none;\n\t\t\t\t\tcolor: #70A300;\n\t\t\t\t\t}\n\t\t\t\t\t#customerPartyTable {\n\t\t\t\t\tborder-width: 0px;\n\t\t\t\t\tborder-spacing:;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: gray;\n\t\t\t\t\tborder-collapse: collapse;\n\t\t\t\t\tbackground-color:\n\t\t\t\t\t}\n\t\t\t\t\t#customerIDTable {\n\t\t\t\t\tborder-width: 2px;\n\t\t\t\t\tborder-spacing:;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: gray;\n\t\t\t\t\tborder-collapse: collapse;\n\t\t\t\t\tbackground-color:\n\t\t\t\t\t}\n\t\t\t\t\t#customerIDTableTd {\n\t\t\t\t\tborder-width: 2px;\n\t\t\t\t\tborder-spacing:;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: gray;\n\t\t\t\t\tborder-collapse: collapse;\n\t\t\t\t\tbackground-color:\n\t\t\t\t\t}\n\t\t\t\t\t#lineTable {\n\t\t\t\t\tborder-width:2px;\n\t\t\t\t\tborder-spacing:;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: black;\n\t\t\t\t\tborder-collapse: collapse;\n\t\t\t\t\tbackground-color:;\n\t\t\t\t\t}\n\t\t\t\t\ttd.lineTableTd {\n\t\t\t\t\tborder-width: 1px;\n\t\t\t\t\tpadding: 1px;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: black;\n\t\t\t\t\tbackground-color: white;\n\t\t\t\t\t}\n\t\t\t\t\t#lineTableDummyTd {\n\t\t\t\t\tborder-width: 1px;\n\t\t\t\t\tborder-color:white;\n\t\t\t\t\tpadding: 1px;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: black;\n\t\t\t\t\tbackground-color: white;\n\t\t\t\t\t}\n\t\t\t\t\ttd.lineTableBudgetTd {\n\t\t\t\t\tborder-width: 2px;\n\t\t\t\t\tborder-spacing:0px;\n\t\t\t\t\tpadding: 1px;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: black;\n\t\t\t\t\tbackground-color: white;\n\t\t\t\t\t-moz-border-radius:;\n\t\t\t\t\t}\n\t\t\t\t\t#notesTable {\n\t\t\t\t\tborder-width: 2px;\n\t\t\t\t\tborder-spacing:;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: black;\n\t\t\t\t\t<!-- border-collapse: collapse; -->\n\t\t\t\t\tbackground-color:\n\t\t\t\t\t}\n\t\t\t\t\t#notesTableTd {\n\t\t\t\t\tborder-width: 0px;\n\t\t\t\t\tborder-spacing:;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: black;\n\t\t\t\t\tborder-collapse: collapse;\n\t\t\t\t\tbackground-color:\n\t\t\t\t\t}\n\t\t\t\t\ttable {\n\t\t\t\t\tborder-spacing:0px;\n\t\t\t\t\t}\n\t\t\t\t\t#budgetContainerTable {\n\t\t\t\t\tborder-width: 0px;\n\t\t\t\t\tborder-spacing: 0px;\n\t\t\t\t\tborder-style: inset;\n\t\t\t\t\tborder-color: black;\n\t\t\t\t\tborder-collapse: collapse;\n\t\t\t\t\tbackground-color:;\n\t\t\t\t\t}\n\t\t\t\t\ttd {\n\t\t\t\t\tborder-color:gray;\n\t\t\t\t\t}\n\t\t\t\t\t#invoice-info-td {\n\t\t\t\t\t\tborder-style: solid;\n\t\t\t\t\t\tborder-width: 1px;\n\t\t\t\t\t\twidth: 50%;\n\t\t\t\t\t}\n\t\t\t\t\t#invoice-line-td {\n\t\t\t\t\t\tborder-style: solid;\n\t\t\t\t\t\tborder-width: 1px;\n\t\t\t\t\t}\n\t\t\t\t"}
    @page { size: A4 portrait; margin: 8mm 10mm; }
    * { box-sizing: border-box; }
    .top-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }
    .btn {
      padding: 4px 12px;
      font-size: 11px;
      font-weight: bold;
      border: 1px solid #888;
      background: #f0f0f0;
      cursor: pointer;
      border-radius: 4px;
    }
    @media print {
      .top-actions { display: none !important; }
      body { width: 100% !important; padding: 0 !important; margin: 0 !important; }
    }
  </style>
</head>
<body style="width:800px; margin: 0 auto; background-color: #FFFFFF; font-family: 'Tahoma', 'Times New Roman', Times, serif; font-size: 11px; color: #000000; padding: 10px;">
  <div class="top-actions">
    <button class="btn" onclick="window.print()">🖨️ Yazdır</button>
  </div>

  <!-- 1. GONDERICI - EARSIV LOGO - FIRMA LOGO TABLOSU -->
  <table style="width: 100%;">
    <tbody>
      <tr>
        <!-- Gönderici Tablosu -->
        <td style="width: 40%; vertical-align: top;">
          <hr/>
          <table style="width: 100%;">
            <tbody>
              <tr align="left">
                <td align="left">
                  <b>${seller.name}</b><br/>
                  <b>${seller.name2}</b>
                </td>
              </tr>
              <tr align="left">
                <td align="left">
                  ${seller.street} No: ${seller.buildingNo}<br/>
                  Kapı No:<br/>
                  ${seller.citySub}/ ${seller.city}<br/>
                  Web Sitesi:<br/>
                  E-Posta:<br/>
                  Vergi Dairesi: ${seller.taxOffice}<br/>
                  VKN: ${seller.vkn}<br/>
                  TICARETSICILNO: ${seller.tradeRegNo}<br/>
                  MERSISNO: ${seller.mersisNo}
                </td>
              </tr>
            </tbody>
          </table>
          <hr/>
        </td>

        <!-- E-Arşiv Fatura Logo (Orta) -->
        <td style="width: 20%; text-align: center; vertical-align: middle;">
          <img style="width:95px; height: auto;" align="middle" alt="E-Fatura Logo" src="${AUTHENTIC_GIB_LOGO}" />
          <h1 style="text-align: center; margin: 4px 0 0 0; font-size: 1.2em;">
            <span style="font-weight:bold;">e-FATURA</span>
          </h1>
        </td>

        <!-- Firma Logosu (Sağ) -->
        <td style="width: 40%; text-align: center; vertical-align: middle;">
          <img src="${AUTHENTIC_VEGA_LOGO}" style="width: 130px; height: auto; display: inline-block;" alt="Vega Arctos" />
        </td>
      </tr>
    </tbody>
  </table>

  <!-- 2. ALICI - IMZA - FATURA BILGILERI TABLOSU -->
  <table style="width: 100%; margin-top: 5px;">
    <tbody>
      <tr>
        <!-- Alıcı Bilgileri -->
        <td style="width: 40%; vertical-align: top;">
          <table id="customerPartyTable" align="left" border="0" style="width: 100%;">
            <tbody>
              <tr>
                <td>
                  <hr/>
                  <table align="left" border="0" style="width: 100%;">
                    <tbody>
                      <tr>
                        <td align="left">
                          <span style="font-weight:bold;">SAYIN</span>
                        </td>
                      </tr>
                      <tr>
                        <td align="left">
                          <b>${invoice.cariName || 'MÜŞTERİ'}</b><br/>
                          ${invoice.cariContact ? '<b>' + invoice.cariContact + '</b><br/>' : ''}
                          ${invoice.cariAddress || (invoice.cariCity + ' MERKEZ')}<br/>
                          ${invoice.cariCity ? (invoice.cariCity + ' MERKEZ/ ' + invoice.cariCity) : ''}<br/>
                          E-Posta: ${invoice.cariEmail || ''}<br/>
                          Tel: Fax:<br/>
                          Vergi Dairesi: ${invoice.taxOffice || 'AMASYA VERGİ DAİRESİ MÜD.'}<br/>
                          ${(invoice.taxNo && invoice.taxNo.length === 11) ? 'TCKN' : 'VKN'}: ${invoice.taxNo || ''}<br/>
                          MUSTERINO: ${invoice.customerCode || invoice.cariCode || '0325'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <hr/>
                </td>
              </tr>
            </tbody>
          </table>
        </td>

        <!-- İmza (Orta) -->
        <td style="width: 30%; text-align: center; vertical-align: middle;">
          <img src="${AUTHENTIC_SIG_LOGO}" style="max-width: 100%; height: auto;" alt="İmza" />
        </td>

        <!-- Fatura Bilgileri (Sağ) -->
        <td style="width: 30%; vertical-align: top;">
          <table style="width:100%; border-collapse: collapse;">
            <tbody>
              <tr>
                <td id="invoice-info-td" style="width: 50%;"><b>Özelleştirme No:</b></td>
                <td id="invoice-info-td" style="width: 50%;">TR1.2</td>
              </tr>
              <tr style="height:13px;">
                <td id="invoice-info-td" style="width: 50%;"><b>Senaryo:</b></td>
                <td id="invoice-info-td" style="width: 50%;">${scenario}</td>
              </tr>
              <tr style="height:13px;">
                <td id="invoice-info-td" style="width: 50%;"><b>Fatura Tipi:</b></td>
                <td id="invoice-info-td" style="width: 50%;">${invoiceType}</td>
              </tr>
              <tr style="height:13px;">
                <td id="invoice-info-td" style="width: 50%;"><b>Fatura No:</b></td>
                <td id="invoice-info-td" style="width: 50%;">${invNo}</td>
              </tr>
              <tr style="height:13px;">
                <td id="invoice-info-td" style="width: 50%;"><b>Fatura Tarihi:</b></td>
                <td id="invoice-info-td" style="width: 50%;">${formattedDate} ${formattedTime}</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- 3. ETTN SATIRI -->
  <table style="width: 100%; margin: 6px 0 4px 0;">
    <tr>
      <td style="width: 100%;">
        <span style="font-weight:bold;">ETTN:</span> &#160; ${uuid}
      </td>
    </tr>
  </table>

  <!-- 4. URUNLER SATIRI (TABLOSU) -->
  <table id="lineTable" style="width: 100%; border-collapse: collapse; border-style: solid; border-width: 2px;">
    <tbody>
      <tr style="background-color: #f9f9f9; text-align: center;">
        <td id="invoice-line-td" style="width:3%;"><b>Sıra No</b></td>
        <td id="invoice-line-td" style="width:20%; text-align: left;"><b>Mal Hizmet</b></td>
        <td id="invoice-line-td" style="width:7.4%;"><b>Miktar</b></td>
        <td id="invoice-line-td" style="width:9%;"><b>Birim Fiyat</b></td>
        <td id="invoice-line-td" style="width:7%;"><b>İskonto/ Arttırım Oranı</b></td>
        <td id="invoice-line-td" style="width:9%;"><b>İskonto/ Arttırım Tutarı</b></td>
        <td id="invoice-line-td" style="width:9%;"><b>İskonto/ Arttırım Nedeni</b></td>
        <td id="invoice-line-td" style="width:7%;"><b>KDV Oranı</b></td>
        <td id="invoice-line-td" style="width:10%;"><b>KDV Tutarı</b></td>
        <td id="invoice-line-td" style="width:17%;"><b>Diğer Vergiler</b></td>
        <td id="invoice-line-td" style="width:10.6%;"><b>Satır Açıklaması</b></td>
        <td id="invoice-line-td" style="width:10.6%; text-align: right;"><b>Mal Hizmet Tutarı</b></td>
      </tr>
      ${rows.map(r => `
        <tr>
          <td id="invoice-line-td" style="text-align: center;">${r.sira}</td>
          <td id="invoice-line-td" style="text-align: left;">${r.name}</td>
          <td id="invoice-line-td" style="text-align: center;">${r.qty} ${r.unit}</td>
          <td id="invoice-line-td" style="text-align: right;">${fmtCur(r.price)}</td>
          <td id="invoice-line-td" style="text-align: center;"></td>
          <td id="invoice-line-td" style="text-align: right;"></td>
          <td id="invoice-line-td" style="text-align: center;"></td>
          <td id="invoice-line-td" style="text-align: center;">%${r.kdvRate},00</td>
          <td id="invoice-line-td" style="text-align: right;">${fmtCur(r.kdvTutar)}</td>
          <td id="invoice-line-td" style="text-align: center;"></td>
          <td id="invoice-line-td" style="text-align: left;">${r.desc || ''}</td>
          <td id="invoice-line-td" style="text-align: right;">${fmtCur(r.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- 5. TOPLAMLAR VE KAREKOD TABLOSU -->
  <!-- Toplamlar Tablosu (Kalemler Altı Sağa Hizalı) -->
  <table style="width: 100%; border-collapse: collapse; margin-top: -1px; margin-bottom: 6px;">
    <tbody>
      <tr>
        <td style="width: 58%;"></td>
        <td style="width: 42%;">
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 7.5pt;">
            <tbody>
              <tr align="right">
                <td class="lineTableBudgetTd" style="padding: 2px 6px; font-weight: bold; width: 60%;">Mal Hizmet Toplam Tutarı</td>
                <td class="lineTableBudgetTd" style="padding: 2px 6px; width: 40%;" align="right">${fmtCur(matrah)}</td>
              </tr>
              <tr align="right">
                <td class="lineTableBudgetTd" style="padding: 2px 6px; font-weight: bold;">Toplam İskonto</td>
                <td class="lineTableBudgetTd" style="padding: 2px 6px;" align="right">0,00 TL</td>
              </tr>
              <tr align="right">
                <td class="lineTableBudgetTd" style="padding: 2px 6px; font-weight: bold;">Hesaplanan KDV(%${rows[0]?.kdvRate || 1})</td>
                <td class="lineTableBudgetTd" style="padding: 2px 6px;" align="right">${fmtCur(totalKdv)}</td>
              </tr>
              <tr align="right">
                <td class="lineTableBudgetTd" style="padding: 2px 6px; font-weight: bold;">Vergiler Dahil Toplam Tutar</td>
                <td class="lineTableBudgetTd" style="padding: 2px 6px; font-weight: bold;" align="right">${fmtCur(grandTotal)}</td>
              </tr>
              <tr align="right">
                <td class="lineTableBudgetTd" style="padding: 2px 6px; font-weight: bold;">Ödenecek Tutar</td>
                <td class="lineTableBudgetTd" style="padding: 2px 6px; font-weight: bold;" align="right">${fmtCur(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Notlar Kutusu (Sol, Çerçeveli) ve Karekod (Sağ) Yan Yana -->
  <table style="width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 6px;">
    <tbody>
      <tr>
        <!-- Sol: Çerçeveli Notlar Kutusu (Karekodun Tam Solunu Doldurur) -->
        <td style="width: 70%; vertical-align: top; border: 1px solid #000; padding: 8px 10px; height: 140px; font-size: 7.5pt; line-height: 1.4;">
          <div style="font-weight: bold; margin-bottom: 4px;">Not:</div>
          <div>Not: Yalnız ${words}</div>
        </td>
        <td style="width: 2%;"></td>
        <!-- Sağ: Karekod -->
        <td style="width: 28%; text-align: right; vertical-align: middle;">
          <img src="${AUTHENTIC_QR_CODE}" style="width: 140px; height: 140px; display: inline-block;" alt="Karekod" />
        </td>
      </tr>
    </tbody>
  </table>

  <!-- 6. BANKA BILGILERI TABLOSU (ORIGINAL XSLT) -->
  <table border="1" cellpadding="1" cellspacing="1" style="width: 800px; margin-top: 8px; border-collapse: collapse;">
    <tbody>
      <tr>
        <td style="width: 239px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;ALBARAKA AMASYA ŞB.</span>
        </td>
        <td style="width: 450px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;IBAN:&#xa0;TR55 0020 3000 0766 9657 0000 01</span>
        </td>
      </tr>
      <tr>
        <td style="width: 239px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;HALKBANK AMASYA ŞB.</span>
        </td>
        <td style="width: 450px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;IBAN:&#xa0;TR47 0001 2009 3000 0010 2606 52</span>
        </td>
      </tr>
      <tr>
        <td style="width: 239px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;AKBANK AMASYA ŞB.</span>
        </td>
        <td style="width: 450px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;IBAN:&#xa0;TR33 0004 6001 5488 8000 1199 83</span>
        </td>
      </tr>
      <tr>
        <td style="width: 239px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;ZİRAAT BANKASI AMASYA ŞB.</span>
        </td>
        <td style="width: 450px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;IBAN:&#xa0;TR64 0001 0026 9577 2776 2850 01</span>
        </td>
      </tr>
      <tr>
        <td style="width: 239px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;GARANTİ BANKASI AMASYA ŞB.</span>
        </td>
        <td style="width: 450px; padding: 2px 4px;">
          <span style="color: rgb(68, 68, 68); font-family: verdana, geneva, sans-serif; font-size: 10px;">&#xa0; &#xa0;&#xa0;IBAN:&#xa0;TR69 0006 2000 7340 0006 2975 11</span>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

app.get('/api/check-earsiv', (req, res) => {
  const dirs = ['C:\\eArsiv', 'C:\\VegaArctos', 'C:\\Arctos', 'D:\\eArsiv', 'C:\\eFatura', 'C:\\Vega'];
  const report = {};
  dirs.forEach(d => {
    try {
      if (fs.existsSync(d)) {
        report[d] = fs.readdirSync(d);
      } else {
        report[d] = 'Klasor yok';
      }
    } catch (e) {
      report[d] = 'Hata: ' + e.message;
    }
  });
  res.json(report);
});


app.get('/api/view-xslt', (req, res) => {
  const p = path.join(__dirname, 'earchive.xslt');
  if (fs.existsSync(p)) {
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    return res.sendFile(p);
  }
  const p2 = path.join('C:\\eArsiv', 'earchive.xslt');
  if (fs.existsSync(p2)) {
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    return res.sendFile(p2);
  }
  res.status(404).send('earchive.xslt bulunamadı');
});

// 0. Vega e-Fatura Canlı Orijinal PDF ve Giden Kutusu InvoiceViewer Görüntüleme
const handlePdfRequest = async (req, res) => {
  try {
    const company = (req.params.company || 'etik').toLowerCase();
    const { invoiceNo } = req.params;
    const config = companyPrefixes[company];
    if (!config) {
      return res.status(400).json({ error: 'Geçersiz firma parametresi' });
    }

    // 1. Önce disk önbelleğinde var mı kontrol et
    const cachedFile = path.join(PDF_CACHE_DIR, `${invoiceNo}.pdf`);
    if (fs.existsSync(cachedFile)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${invoiceNo}.pdf"`);
      return res.sendFile(cachedFile);
    }

    // 2. Sunucudaki yerel Arctos / Vega klasörlerini kontrol et
    const localDirs = [
      'C:\\VegaArctos\\Bin\\Documents',
      'C:\\VegaArctos\\Documents',
      'C:\\VegaArctos\\Bin\\eArsiv',
      'C:\\eArsiv',
      'C:\\eFatura',
      'C:\\Arctos\\eFatura\\Giden',
      'C:\\Arctos\\eArsiv\\Giden',
      'C:\\Arctos\\eFatura\\Gelen',
      'C:\\Arctos\\eArsiv\\Gelen',
      'C:\\Arctos',
      'D:\\VegaArctos\\Bin\\Documents',
      'D:\\VegaArctos\\Documents',
      'D:\\VegaArctos\\Bin\\eArsiv',
      'D:\\eArsiv',
      'D:\\eFatura',
      'D:\\Arctos\\eFatura\\Giden',
      'D:\\Arctos\\eArsiv\\Giden',
      'D:\\Arctos\\eFatura\\Gelen',
      'D:\\Arctos\\eArsiv\\Gelen',
      'D:\\Arctos'
    ];
    for (const d of localDirs) {
      const pPdf = path.join(d, `${invoiceNo}.pdf`);
      if (fs.existsSync(pPdf)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${invoiceNo}.pdf"`);
        return res.sendFile(pPdf);
      }
      const pHtml = path.join(d, `${invoiceNo}.html`);
      if (fs.existsSync(pHtml)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.sendFile(pHtml);
      }
    }

    // 3. Matbuu değilse (ETS veya EAS ise) Vega SOAP oturumu açarak gönderilmiş kutusunda ara
    if (true) {
      try {
        const { sessionId, securityKey, ipNumber } = await getVegaSession(config);
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
          const m = searchRes.data.match(/<UUID>(.*?)<\/UUID>/);
          if (m && m[1]) {
            uuid = m[1];
            break;
          }
        }

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
          const m = arcRes.data.match(/<UUID>(.*?)<\/UUID>/);
          if (m && m[1]) {
            uuid = m[1];
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
          const pdfResponse = pdfResObj.data;
          const pdfResultMatch = pdfResponse.match(/<GetInvoice_PDFResult>(.*?)<\/GetInvoice_PDFResult>/);

          if (pdfResultMatch && pdfResultMatch[1]) {
            const base64Pdf = pdfResultMatch[1];
            const pdfBuffer = Buffer.from(base64Pdf, 'base64');
            try {
              fs.writeFileSync(cachedFile, pdfBuffer);
            } catch (cacheWriteErr) {
              console.warn('PDF önbelleğe yazılamadı:', cacheWriteErr.message);
            }
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${invoiceNo}.pdf"`);
            return res.send(pdfBuffer);
          }
        }
      } catch (soapErr) {
        console.warn('SOAP kontrolünde hata veya fatura henüz gönderilmemiş:', soapErr.message);
      }
    }

    // 4. Vega veritabanından faturayı ve gerçek stok kalemlerini çek
    let pool = await sql.connect(dbConfig);
    const headRes = await pool.request()
      .input('invoiceNo', sql.VarChar, invoiceNo)
      .query(`
        SELECT TOP 1
            b.IND AS [id],
            b.BELGENO AS [invoiceNo],
            b.TARIH AS [date],
            b.FIRMANO AS [cariCode],
            COALESCE(NULLIF(c.UNVAN, ''), NULLIF(c.FIRMAKODU, ''), c.ADI) AS [cariName],
            COALESCE(NULLIF(c.ADI, ''), '') AS [cariContact],
            ISNULL(c.SEHIR, 'AMASYA') AS [cariCity],
            ISNULL(c.VERGIDAIRESI, 'AMASYA VERGİ DAİRESİ MÜD.') AS [taxOffice],
            COALESCE(NULLIF(c.VERGINO, ''), '') AS [taxNo],
            ISNULL(c.FIRMAKODU, '') AS [customerCode]
        FROM ${config.db}${config.baslik} b
        LEFT JOIN ${config.cari} c ON b.FIRMANO = c.IND
        WHERE b.BELGENO = @invoiceNo
      `);

    const invoiceHeader = headRes.recordset?.[0];
    if (!invoiceHeader) {
      return res.status(404).json({ error: `Fatura bulunamadı: ${invoiceNo}` });
    }

    // Gerçek stok kalemlerini TBLSTOKHAREKETLERI üzerinden çek
    let invoiceItems = [];
    try {
      const stokRes = await pool.request()
        .input('evrakNo', sql.VarChar, invoiceNo)
        .query(`
          SELECT 
              sh.IND AS [id],
              COALESCE(s.MALINCINSI, sh.IZAHAT, 'Mal/Hizmet') AS [productName],
              COALESCE(NULLIF(sh.CIKAN, 0), NULLIF(sh.GIREN, 0), 0) AS [rawQuantity],
              COALESCE(b.BIRIMADI, 'KG') AS [unit],
              ISNULL(sh.BIRIMFIYAT, 0) AS [unitPrice],
              ISNULL(sh.TUTAR, 0) AS [lineTutar],
              ISNULL(sh.ALTNOT, '') AS [description]
          FROM F0101D0008TBLSTOKHAREKETLERI sh
          LEFT JOIN F0101TBLSTOKLAR s ON sh.STOKNO = s.IND
          LEFT JOIN F0101TBLBIRIMLEREX b ON sh.BIRIMEX = b.IND
          WHERE sh.EVRAKNO = @evrakNo
          ORDER BY sh.IND ASC
        `);

      if (stokRes.recordset && stokRes.recordset.length > 0) {
        invoiceItems = stokRes.recordset.map(r => {
          let lineTutar = Number(r.lineTutar || 0);
          let unitPrice = Number(r.unitPrice || 0);
          let quantity = Number(r.rawQuantity || 0);
          if (quantity === 0 && unitPrice > 0 && lineTutar > 0) {
            quantity = Math.round((lineTutar / unitPrice) * 100) / 100;
          }
          if (quantity === 0) quantity = 1;
          if (unitPrice === 0 && lineTutar > 0 && quantity > 0) {
            unitPrice = lineTutar / quantity;
          }
          return {
            id: r.id,
            productName: r.productName,
            quantity,
            unit: r.unit || 'KG',
            unitPrice,
            lineTutar,
            kdvRate: 0,
            kdvTutar: 0,
            description: r.description || ''
          };
        });
      }
    } catch (stokErr) {
      console.warn('Stok hareketleri okunamadı:', stokErr.message);
    }

    // Yedek: TBLSTOKHAREKETLERI boşsa VFATURAHAREKETLER tablosuna başvur
    if (invoiceItems.length === 0) {
      try {
        const itemsRes = await pool.request()
          .input('id', sql.Int, invoiceHeader.id)
          .query(`
            SELECT 
                h.IND AS [id],
                h.MALINCINSI AS [productName],
                h.GERCEKTOPLAM AS [lineTutar],
                h.KDVTUTAR AS [kdvTutar]
            FROM ${config.db}${config.hareket} h
            WHERE h.EVRAKNO = @id
            ORDER BY h.IND ASC
          `);
        invoiceItems = (itemsRes.recordset || []).map(r => {
          const lineTutar = Number(r.lineTutar || 0);
          const kdvTutar = Number(r.kdvTutar || 0);
          const kdvRate = (lineTutar > 0 && kdvTutar > 0) ? Math.round((kdvTutar / lineTutar) * 100) : 0;
          return {
            id: r.id,
            productName: r.productName,
            quantity: 1,
            unit: 'Adet',
            unitPrice: lineTutar,
            lineTutar,
            kdvRate,
            kdvTutar,
            description: ''
          };
        });
      } catch (hareketErr) {
        console.warn('Fatura hareketleri okunamadı:', hareketErr.message);
      }
    }


    // 5. Veritabanından Orijinal XML ve XSLT'yi çekip tarayıcıda render et (GERÇEK GÖRÜNTÜ)
    try {
      let pool = await sql.connect(dbConfig);
      let xmlRes = await pool.request().query("SELECT XMLDATA FROM " + config.db + "TBLEARSIVXML WHERE EVRAKNO = '" + invoiceNo + "'");
      if (xmlRes.recordset.length === 0) {
        xmlRes = await pool.request().query("SELECT XMLDATA FROM " + config.db + "TBLEFATURAXML WHERE EVRAKNO = '" + invoiceNo + "'");
      }
      
      if (xmlRes.recordset.length > 0) {
        let xmlText = xmlRes.recordset[0].XMLDATA;
        // Escape for JS template literal
        
        // Escape for JS by using JSON.stringify
        let safeXmlStr = JSON.stringify(xmlText);
        
        const clientHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Orijinal Fatura Görseli - ${invoiceNo}</title>
</head>
<body style="margin:0; padding:0; background:#525659; display:flex; justify-content:center;">
    <div id="invoice-container" style="background:#fff; width:210mm; min-height:297mm; padding:15mm; box-shadow:0 0 10px rgba(0,0,0,0.5); margin: 20px 0;">
        Yükleniyor...
    </div>
    <script>
        try {
            const xmlString = ${safeXmlStr};

            
            // 1. Base64 XSLT'yi XML içinden bul
            const xsltMatch = xmlString.match(/<cbc:EmbeddedDocumentBinaryObject[^>]*>([\\s\\S]*?)<\/cbc:EmbeddedDocumentBinaryObject>/);
            
            if (xsltMatch && xsltMatch[1]) {
                const base64Xslt = xsltMatch[1].trim();
                const xsltString = decodeURIComponent(escape(atob(base64Xslt)));
                
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
                document.getElementById('invoice-container').innerHTML = 'HATA: Faturanın içinde orijinal tasarım (XSLT) bulunamadı. Lütfen Vega destek ile iletişime geçin.';
            }
        } catch (e) {
            document.getElementById('invoice-container').innerHTML = 'HATA: Görsel oluşturulurken bir hata oluştu: ' + e.message;
            console.error(e);
        }
    </script>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(clientHtml);
      }
    } catch (dbErr) {
      console.error('XML fetching from DB error:', dbErr.message);
    }

    // 6. Son çare: Yedek HTML çizimimizi kullan
    const htmlContent = generateVegaInvoiceHtml(invoiceHeader, invoiceItems, company);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(htmlContent);

  } catch (err) {
    console.error('Fatura görsel/PDF yükleme hatası:', err.message);
    res.status(500).json({ error: 'Fatura görüntüleme hatası', details: err.message });
  }
};

app.get('/api/:company/efaturalar/:invoiceNo/pdf', handlePdfRequest);
app.get('/api/efaturalar/:invoiceNo/pdf', handlePdfRequest);
app.get('/api/:company/efaturalar/:invoiceNo/viewer', handlePdfRequest);
app.get('/api/efaturalar/:invoiceNo/viewer', handlePdfRequest);


app.get('/api/debug-db', async (req, res) => {
  try {
    const config = companyPrefixes['etik'];
    let pool = await sql.connect(dbConfig);
    const tblRes = await pool.request().query("SELECT name FROM " + config.db + "sys.tables WHERE name LIKE '%PDF%' OR name LIKE '%HTML%' OR name LIKE '%EARSIV%' OR name LIKE '%EFATURA%' OR name LIKE '%XML%' OR name LIKE '%BELGE%'");
    const tables = tblRes.recordset.map(r => r.name);
    
    let tableInfo = {};
    for (const t of tables) {
      const cols = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM " + config.db + "INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '" + t + "'");
      tableInfo[t] = cols.recordset.map(c => c.COLUMN_NAME + ' (' + c.DATA_TYPE + ')');
    }
    res.json({ tables: tableInfo });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.get('/api/find-pdf/:invoiceNo', async (req, res) => {
  const { exec } = require('child_process');
  const invoiceNo = req.params.invoiceNo;
  exec('dir C:\\' + invoiceNo + '.* /s /b', (err1, stdout1) => {
    exec('dir D:\\' + invoiceNo + '.* /s /b', (err2, stdout2) => {
      res.json({
        c_drive: stdout1 ? stdout1.split('\n').filter(x => x) : [],
        d_drive: stdout2 ? stdout2.split('\n').filter(x => x) : []
      });
    });
  });
});


app.get('/api/test-xslt/:invoiceNo', async (req, res) => {
  try {
    let pool = await sql.connect(dbConfig);
    const invoiceNo = req.params.invoiceNo;
    const config = companyPrefixes['etik'];
    
    let xmlRes = await pool.request().query("SELECT XMLDATA FROM " + config.db + "TBLEARSIVXML WHERE EVRAKNO = '" + invoiceNo + "'");
    if (xmlRes.recordset.length === 0) {
      xmlRes = await pool.request().query("SELECT XMLDATA FROM " + config.db + "TBLEFATURAXML WHERE EVRAKNO = '" + invoiceNo + "'");
    }
    
    if (xmlRes.recordset.length === 0) {
      return res.status(404).json({ error: 'XML not found in DB' });
    }
    
    let xmlText = xmlRes.recordset[0].XMLDATA;
    // Extract base64 XSLT
    const match = xmlText.match(/<cbc:EmbeddedDocumentBinaryObject[^>]*>([\s\S]*?)<\/cbc:EmbeddedDocumentBinaryObject>/);
    if (!match) {
      return res.status(404).json({ error: 'No Embedded XSLT found' });
    }
    
    res.json({ success: true, xsltLength: match[1].length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GMS.Net Temel Bağlantı Ayarları (master veritabanı ile bağlanıp veritabanını dinamik seçer)
const gmsMasterConfig = {
  user: 'sa',
  password: 'mikrokom2009/*-+',
  server: 'HASAN\\SQLEXPRESS',
  database: 'master',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function getMarifDatabaseName(pool) {
  let dbResult = await pool.request().query("SELECT name FROM sys.databases WHERE state_desc = 'ONLINE'");
  let databases = dbResult.recordset.map(d => d.name);
  let marifDb = databases.find(d => d.toUpperCase() === 'M_MARIF_ET_URUNLERI_2026') 
             || databases.find(d => d.toUpperCase().includes('MARIF') && d.includes('2026'))
             || databases.find(d => d.toUpperCase().includes('MARIF') && !d.toUpperCase().includes('YEDEK'))
             || databases.find(d => d.toUpperCase().includes('MARIF'));
  return { marifDb, databases };
}

// 1. e-Faturalar Listesi Sorgusu (Canlı - Dinamik Vega & GMS.Net Yönlendirmeli)
app.get('/api/:company/efaturalar', async (req, res) => {
  try {
    const { company } = req.params;
    
    // GMS.Net (Mikrokom) Flow for Marif
    if (company.toLowerCase() === 'marif') {
      const force = req.query.force === 'true';
      
      // Force istenmişse ve kilitli değilse senkronizasyonu tetikle
      if (force) {
        try {
          await syncMarifIncomingInvoices(true);
        } catch (syncErr) {
          console.error("Marif senkronizasyon hatası:", syncErr.message);
        }
      }

      let gmsInvoices = [];
      let incomingGms = [];
      try {
        let pool = await sql.connect(gmsMasterConfig);
        const { marifDb } = await getMarifDatabaseName(pool);

        if (marifDb) {
          let result = await pool.request().query(`
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
            let gelResult = await pool.request().query(`
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
            incomingGms = (gelResult.recordset || []).map(r => ({
              ...r,
              cariCode: '',
              cariName: 'Gelen Fatura (GMS)',
              matrah: r.amount || 0,
              kdv: 0
            }));
          } catch (gelErr) {
            // Tablo boş veya henüz veri yoksa yoksay
          }
        }
        await pool.close();
      } catch (sqlErr) {
        console.warn('Marif GMS SQL bağlantısı kurulamadı (HASAN bilgisayarı kapalı veya ağda yok), önbellek verileri kullanılacak:', sqlErr.message);
      }

      // EDM Bilişim / Mikrokom Önbelleğindeki Faturalar
      let cachedIncoming = [];
      try {
        if (fs.existsSync(CACHE_FILE_PATH)) {
          const cacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
          cachedIncoming = JSON.parse(cacheData) || [];
        }
      } catch (cacheErr) {
        console.error('Önbellek okuma hatası:', cacheErr);
      }

      // Fatura numarasına göre tekilleştirerek birleştir
      const invoiceMap = new Map();
      for (const inv of [...gmsInvoices, ...incomingGms, ...cachedIncoming]) {
        if (inv && inv.invoiceNo && !invoiceMap.has(inv.invoiceNo)) {
          invoiceMap.set(inv.invoiceNo, inv);
        }
      }
      return res.json(Array.from(invoiceMap.values()));
    }

    // Default Vega Flow for other companies
    const config = companyPrefixes[company.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: 'Geçersiz firma parametresi' });
    }

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
          ISNULL(SUM(h.GERCEKTOPLAM + h.KDVTUTAR), 0) AS [amount],
          CASE WHEN b.BELGETIPI IN (21, 27, 33, 34, 104, 105, 151) THEN 'giden' ELSE 'gelen' END AS [direction]
      FROM ${config.db}${config.baslik} b
      LEFT JOIN ${config.db}${config.hareket} h ON b.IND = h.EVRAKNO
      LEFT JOIN ${config.cari} c ON b.FIRMANO = c.IND
      GROUP BY b.IND, b.BELGENO, b.TARIH, b.FIRMANO, c.UNVAN, c.FIRMAKODU, c.ADI, b.BELGETIPI
      ORDER BY b.TARIH DESC, b.IND DESC;
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(200).json({ success: false, error: 'SQL Hatası', details: err.message, stack: err.stack });
  }
});

// 2. e-Fatura Detay Sorgusu (Dinamik Vega & GMS.Net Yönlendirmeli)
app.get('/api/:company/efaturalar/:id/detay', async (req, res) => {
  try {
    const { company, id } = req.params;
    
    // GMS.Net (Mikrokom) Flow for Marif
    if (company.toLowerCase() === 'marif') {
      let pool = await sql.connect(gmsMasterConfig);
      const { marifDb, databases } = await getMarifDatabaseName(pool);

      if (!marifDb) {
        await pool.close();
        return res.status(404).json({ error: 'Marif veritabanı bulunamadı', databases });
      }

      let result = await pool.request()
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
          
          UNION ALL
          
          SELECT 
              h.ID AS [id],
              COALESCE(s.AD, h.SATIR_ACIKLAMASI, 'Bilinmeyen Ürün') AS [productName],
              h.TUTAR AS [lineTutar],
              h.KDV_TUTARI AS [kdvTutar],
              h.TVK_TUTARI AS [tevkifatTutar],
              h.OTV_TUTARI AS [otv],
              h.OIV_TUTARI AS [oiv]
          FROM [${marifDb}].[dbo].[F0001_2026_E_BIL_G_FAT_SATIR] h
          LEFT JOIN [${marifDb}].[dbo].[F0001_2026_T_KOD_STOK] s ON h.URUN_KODU = s.ID OR h.URUN_KODU = s.KOD
          WHERE h.FAT_ID = @id
        `);
      await pool.close();
      return res.json(result.recordset);
    }

    // Default Vega Flow for other companies
    const config = companyPrefixes[company.toLowerCase()];
    if (!config) {
      return res.status(400).json({ error: 'Geçersiz firma parametresi' });
    }

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
        FROM ${config.db}${config.hareket} h
        WHERE h.EVRAKNO = @id
        ORDER BY h.IND ASC;
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'SQL Hatası', details: err.message });
  }
});

// HASAN\SQLEXPRESS Veritabanlarını Listeleme Rotası
app.get('/api/marif/databases', async (req, res) => {
  try {
    let pool = await sql.connect(gmsMasterConfig);
    const { marifDb, databases } = await getMarifDatabaseName(pool);
    await pool.close();
    res.json({ success: true, selectedDatabase: marifDb, allDatabases: databases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Geçici Test Senkronizasyon Rotası
app.get('/api/marif/test-sync', async (req, res) => {
  try {
    await syncMarifIncomingInvoices();
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
      return res.json({ success: true, message: 'Senkronizasyon başarılı.', data: JSON.parse(data) });
    }
    return res.json({ success: false, error: 'Önbellek dosyası oluşturulamadı (edm_sync_failed)' });
  } catch (err) {
    res.json({ success: false, error: err.message, stack: err.stack });
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

// Akıllı EDM Senkronizasyon Kilidi ve İstek Sınırlayıcı (Rate Limiter)
let lastSyncAttempt = 0;
let syncLockUntil = 0; // Askıya alınma veya hata durumunda 2 saat istek atılmasını engeller
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // Normalde en fazla saatte 1 kez çalışır

// Arka Planda Marif e-Faturaları (Gelen & Giden) EDM SOAP'tan Çekme ve Önbellekleme Fonksiyonu
async function syncMarifIncomingInvoices(force = false) {
  const now = Date.now();
  if (!force && syncLockUntil > now) {
    const remainingMins = Math.ceil((syncLockUntil - now) / 60000);
    console.log(`[EDM KORUMA] Entegratör askı/hata koruma kilidi aktif. İstek iptal edildi. Kalan kilit süresi: ${remainingMins} dk.`);
    return;
  }
  if (!force && (now - lastSyncAttempt < SYNC_INTERVAL_MS)) {
    const remainingMins = Math.ceil((SYNC_INTERVAL_MS - (now - lastSyncAttempt)) / 60000);
    console.log(`[EDM KORUMA] Son senkronizasyondan sonra yeterli süre geçmedi. İstek engellendi. Kalan süre: ${remainingMins} dk.`);
    return;
  }
  lastSyncAttempt = now;

  console.log(`[${new Date().toISOString()}] Marif e-faturalar senkronizasyonu başlatıldı...`);
  try {
    const actionDate = new Date().toISOString();
    const loginXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:LoginRequest>
         <tem:REQUEST_HEADER>
            <tem:ACTION_DATE>${actionDate}</tem:ACTION_DATE>
            <tem:REASON>Login</tem:REASON>
            <tem:APPLICATION_NAME>GMSNet</tem:APPLICATION_NAME>
            <tem:HOSTNAME>GMSNet</tem:HOSTNAME>
            <tem:CHANNEL_NAME>GMSNet</tem:CHANNEL_NAME>
            <tem:COMPRESSED>N</tem:COMPRESSED>
         </tem:REQUEST_HEADER>
         <tem:USER_NAME>admin_007408</tem:USER_NAME>
         <tem:PASSWORD>rvkDAuKh</tem:PASSWORD>
      </tem:LoginRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

    const loginResponse = await soapRequest('LoginRequest', loginXml, 'portal1.edmbilisim.com.tr');
    const sessionIdMatch = loginResponse.data.match(/<SESSION_ID>(.*?)<\/SESSION_ID>/) || loginResponse.data.match(/<SESSION_ID[^>]*>(.*?)<\/SESSION_ID>/);
    
    if (!sessionIdMatch) {
      const match = loginResponse.data.match(/<faultstring[^>]*>(.*?)<\/faultstring>/);
      const errorStr = match ? match[1] : 'Giriş Başarısız';
      throw new Error(`Entegratör Giriş Hatası: ${errorStr}`);
    }
    const sessionId = sessionIdMatch[1];

    // Mevcut önbellek kayıtlarını koru
    let existingInvoices = [];
    if (fs.existsSync(CACHE_FILE_PATH)) {
      try {
        existingInvoices = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8')) || [];
      } catch (e) {}
    }
    const invMap = new Map();
    existingInvoices.forEach(inv => {
      if (inv && inv.invoiceNo) invMap.set(inv.invoiceNo, inv);
    });

    // Son 60 günlük faturaları çekelim
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = new Date().toISOString().split('T')[0];

    for (const dir of ['IN', 'OUT']) {
      const getInvoiceXml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:GetInvoiceRequest>
         <tem:REQUEST_HEADER>
            <tem:SESSION_ID>${sessionId}</tem:SESSION_ID>
            <tem:ACTION_DATE>${actionDate}</tem:ACTION_DATE>
            <tem:REASON>GetInvoices</tem:REASON>
            <tem:APPLICATION_NAME>GMSNet</tem:APPLICATION_NAME>
            <tem:HOSTNAME>GMSNet</tem:HOSTNAME>
            <tem:CHANNEL_NAME>GMSNet</tem:CHANNEL_NAME>
            <tem:COMPRESSED>N</tem:COMPRESSED>
         </tem:REQUEST_HEADER>
         <tem:INVOICE_SEARCH_KEY>
            <tem:LIMIT>100</tem:LIMIT>
            <tem:START_DATE>${startDateStr}</tem:START_DATE>
            <tem:END_DATE>${endDateStr}</tem:END_DATE>
            <tem:READ_INCLUDED>true</tem:READ_INCLUDED>
            <tem:DIRECTION>${dir}</tem:DIRECTION>
         </tem:INVOICE_SEARCH_KEY>
         <tem:HEADER_ONLY>Y</tem:HEADER_ONLY>
      </tem:GetInvoiceRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

      const invoiceResponse = await soapRequest('GetInvoiceRequest', getInvoiceXml, 'portal1.edmbilisim.com.tr');
      if (invoiceResponse.data.includes('Fault') || invoiceResponse.data.includes('faultstring')) {
        continue;
      }

      const invoiceMatches = invoiceResponse.data.match(/<INVOICE>([\s\S]*?)<\/INVOICE>/g);
      if (invoiceMatches) {
        for (const invXml of invoiceMatches) {
          const uuidMatch = invXml.match(/<UUID[^>]*>(.*?)<\/UUID>/);
          const invoiceNoMatch = invXml.match(/<ID[^>]*>(.*?)<\/ID>/) || invXml.match(/<INVOICE_NUMBER[^>]*>(.*?)<\/INVOICE_NUMBER>/);
          const dateMatch = invXml.match(/<ISSUE_DATE[^>]*>(.*?)<\/ISSUE_DATE>/);
          const cariNameMatch = dir === 'IN'
            ? (invXml.match(/<SENDER_NAME[^>]*>(.*?)<\/SENDER_NAME>/) || invXml.match(/<SENDER_TITLE[^>]*>(.*?)<\/SENDER_TITLE>/))
            : (invXml.match(/<RECEIVER_NAME[^>]*>(.*?)<\/RECEIVER_NAME>/) || invXml.match(/<RECEIVER_TITLE[^>]*>(.*?)<\/RECEIVER_TITLE>/));
          const cariCodeMatch = dir === 'IN'
            ? (invXml.match(/<SENDER_VKN[^>]*>(.*?)<\/SENDER_VKN>/) || invXml.match(/<SENDER_TCKN[^>]*>(.*?)<\/SENDER_TCKN>/))
            : (invXml.match(/<RECEIVER_VKN[^>]*>(.*?)<\/RECEIVER_VKN>/) || invXml.match(/<RECEIVER_TCKN[^>]*>(.*?)<\/RECEIVER_TCKN>/));
          const amountMatch = invXml.match(/<PAYABLE_AMOUNT[^>]*>(.*?)<\/PAYABLE_AMOUNT>/);
          const kdvMatch = invXml.match(/<TAX_AMOUNT[^>]*>(.*?)<\/TAX_AMOUNT>/) || [0, '0'];
          
          if (uuidMatch && invoiceNoMatch) {
            const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
            const kdv = kdvMatch ? parseFloat(kdvMatch[1]) : 0;
            const invObj = {
              id: uuidMatch[1],
              invoiceNo: invoiceNoMatch[1],
              date: dateMatch ? dateMatch[1] : new Date().toISOString(),
              cariCode: cariCodeMatch ? cariCodeMatch[1] : '',
              cariName: cariNameMatch ? cariNameMatch[1] : 'Bilinmeyen Cari',
              matrah: amount - kdv,
              kdv: kdv,
              amount: amount,
              direction: dir === 'IN' ? 'gelen' : 'giden',
              type: invoiceNoMatch[1].startsWith('MAR') ? 'e-Fatura' : 'e-Arşiv'
            };
            invMap.set(invObj.invoiceNo, invObj);
          }
        }
      }
    }

    const allInvoices = Array.from(invMap.values());
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(allInvoices, null, 2), 'utf8');
    console.log(`[${new Date().toISOString()}] Marif e-faturalar başarıyla diske önbelleklendi. Toplam: ${allInvoices.length} fatura.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Marif fatura senkronizasyon hatası:`, err.message);
    if (err.message && (err.message.includes('askıya') || err.message.includes('Hatalı istek') || err.message.includes('Giriş'))) {
      syncLockUntil = Date.now() + 2 * 60 * 60 * 1000;
      console.warn(`[EDM KORUMA] Entegratör hesabı askıya alındığı için senkronizasyon 2 saatliğine donduruldu. Açılış: ${new Date(syncLockUntil).toLocaleTimeString('tr-TR')}`);
    }
  }
}

// ==========================================
// MEZBAHA KESİM LİSTESİ CANLI SENKRONİZASYON
// ==========================================
let xlsx;
try {
  xlsx = require('xlsx');
} catch (e) {
  // Will try to require on demand
}

const KESIM_EXCEL_PATHS = [
  String.raw`D:\yedekler\E D E 2023\EDE - 2021\GÜNLÜK KESİM 2022\Günlük Kesim 2022.xlsx`,
  String.raw`D:\yedekler\E D E 2023\EDE - 2021\GÜNLÜK KESİM 2022\Günlük Kesim 2022.xls`,
  String.raw`C:\yedekler\E D E 2023\EDE - 2021\GÜNLÜK KESİM 2022\Günlük Kesim 2022.xlsx`,
  path.join(__dirname, 'dosyalar', 'KESİM LİSTESİ 2026.xlsx'),
  path.join(__dirname, 'Günlük Kesim 2022.xlsx')
];

let lastKesimMtime = 0;

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

async function syncKesimListesi(force = false) {
  if (!xlsx) {
    try { xlsx = require('xlsx'); } catch (e) { 
      console.warn("[KESİM] 'xlsx' modülü bulunamadı. Lütfen 'npm install xlsx' komutunu çalıştırın.");
      return { success: false, error: 'xlsx modülü eksik' }; 
    }
  }

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
      if (xlsxFile) {
        targetPath = path.join(dir, xlsxFile);
      }
    }
  }

  if (!targetPath) {
    console.log('[KESİM] Kesim Excel dosyası belirtilen yollarda bulunamadı.');
    return { success: false, error: 'Dosya bulunamadı' };
  }

  try {
    const stat = fs.statSync(targetPath);
    if (!force && lastKesimMtime && stat.mtimeMs <= lastKesimMtime) {
      return { success: true, message: 'Değişiklik yok' };
    }

    console.log(`[KESİM] Canlı Excel taranıyor: ${targetPath}...`);
    const buf = fs.readFileSync(targetPath);
    const wb = xlsx.read(buf, { type: 'buffer' });
    const orgId = '13b8da90-27d1-440d-a8f4-eb50dadd6391';

    let totalSynced = 0;

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

      const payload = [];
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
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            parsedDate = `${y}-${m}-${day}`;
          }
        } else if (rawTarih) {
          const s = String(rawTarih).trim();
          const mTr = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
          if (mTr) {
            parsedDate = `${mTr[3]}-${String(mTr[2]).padStart(2, '0')}-${String(mTr[1]).padStart(2, '0')}`;
          } else {
            const mIso = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
            if (mIso) {
              parsedDate = `${mIso[1]}-${String(mIso[2]).padStart(2, '0')}-${String(mIso[3]).padStart(2, '0')}`;
            }
          }
        }

        if (parsedDate) {
          lastParsedDate = parsedDate;
        } else {
          parsedDate = lastParsedDate;
        }

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
          const rawO = row[colMap.odeme];
          if (typeof rawO === 'number' && rawO > 35000 && rawO < 60000) {
            const utcDays = Math.floor(rawO - 25569);
            const d = new Date(utcDays * 86400 * 1000);
            parsedPayment = `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
          } else {
            parsedPayment = String(rawO).trim();
          }
        }

        const total = parsedCarcassWeight * parsedPricePerKg;

        payload.push({
          organization_id: orgId,
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

      if (payload.length > 0) {
        console.log(`[KESİM] "${sheetName}" sekmesinde ${payload.length} satır Supabase'e aktarılıyor...`);
        for (let i = 0; i < payload.length; i += 100) {
          const chunk = payload.slice(i, i + 100);
          await postToSupabaseRest('/rest/v1/kesim_listesi', chunk);
        }
        totalSynced += payload.length;
      }
    }

    lastKesimMtime = stat.mtimeMs;
    console.log(`[KESİM] Senkronizasyon başarıyla tamamlandı. Toplam ${totalSynced} kayıt aktarıldı.`);
    return { success: true, count: totalSynced };
  } catch (err) {
    console.error('[KESİM HATA]', err.message);
    return { success: false, error: err.message };
  }
}

let cachedKesimRecords = [];
let lastKesimCacheTime = 0;

async function getParsedKesimRecords(force = false) {
  if (!force && cachedKesimRecords.length > 0 && Date.now() - lastKesimCacheTime < 30000) {
    return cachedKesimRecords;
  }

  if (!xlsx) {
    try { xlsx = require('xlsx'); } catch (e) { return cachedKesimRecords; }
  }

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
      if (xlsxFile) {
        targetPath = path.join(dir, xlsxFile);
      }
    }
  }

  if (!targetPath) return cachedKesimRecords;

  try {
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
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            parsedDate = `${y}-${m}-${day}`;
          }
        } else if (rawTarih) {
          const s = String(rawTarih).trim();
          const mTr = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
          if (mTr) {
            parsedDate = `${mTr[3]}-${String(mTr[2]).padStart(2, '0')}-${String(mTr[1]).padStart(2, '0')}`;
          } else {
            const mIso = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
            if (mIso) {
              parsedDate = `${mIso[1]}-${String(mIso[2]).padStart(2, '0')}-${String(mIso[3]).padStart(2, '0')}`;
            }
          }
        }

        if (parsedDate) {
          lastParsedDate = parsedDate;
        } else {
          parsedDate = lastParsedDate;
        }

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
          const rawO = row[colMap.odeme];
          if (typeof rawO === 'number' && rawO > 35000 && rawO < 60000) {
            const utcDays = Math.floor(rawO - 25569);
            const d = new Date(utcDays * 86400 * 1000);
            parsedPayment = `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
          } else {
            parsedPayment = String(rawO).trim();
          }
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
    lastKesimCacheTime = Date.now();
    return records;
  } catch (err) {
    console.error('[KESİM HATA]', err.message);
    return cachedKesimRecords;
  }
}

app.get('/api/kesim/records', async (req, res) => {
  try {
    const { startDate, endDate, force } = req.query;
    const records = await getParsedKesimRecords(force === 'true');
    let filtered = records;
    if (startDate) {
      filtered = filtered.filter(r => r.slaughter_date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(r => r.slaughter_date <= endDate);
    }
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kesim/sync', async (req, res) => {
  const result = await syncKesimListesi(true);
  res.json(result);
});

// Başlangıçta ve her 60 saniyede bir mezbaha kesim listesini otomatik kontrol et
setTimeout(() => {
  syncKesimListesi().catch(e => console.error('[KESİM İLK SENKRONİZASYON HATA]:', e.message));
}, 3000);

setInterval(() => {
  syncKesimListesi().catch(e => console.error('[KESİM PERİYODİK HATA]:', e.message));
}, 60 * 1000);

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API servisi ${PORT} portunda başarıyla başladı...`);
});
