import type { VegaEfatura, VegaEfaturaDetail } from '../VegaArctosEfaturaPage';
import { numberToTurkishWords } from '../../../utils/numberToTurkishWords';

export interface CompanyLegalInfo {
  name: string;
  vkn: string;
  taxOffice: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website?: string;
  tradeRegistryNo?: string;
  mersisNo?: string;
}

export const COMPANY_PROFILES: Record<'etik' | 'marif', CompanyLegalInfo> = {
  etik: {
    name: 'ETİK ET VE ET ÜRÜNLERİ GIDA TARIM HAYV.NAK.SAN.TİC.LTD.ŞTİ.',
    vkn: '3810458562',
    taxOffice: 'AMASYA',
    address: 'YÜZEVLER MAHALLESİ DANİŞMENT CAD. NO:2/1 No: Kapı No:',
    city: 'AMASYA MERKEZ/ AMASYA',
    phone: '0 (358) 218 80 80',
    email: 'etik_et2015@hotmail.com',
    website: '',
    tradeRegistryNo: '004750',
    mersisNo: '0381045856200013'
  },
  marif: {
    name: 'MARİF ET VE ET ÜRÜNLERİ HAYVANCILIK GIDA SANAYİ TİCARET LİMİTED ŞİRKETİ',
    vkn: '6121175658',
    taxOffice: 'Amasya Vergi Dairesi',
    address: 'Şeyhcui Mah. Kemal Nehrozoğlu Cad. No: 8',
    city: 'AMASYA - TÜRKİYE',
    phone: '0 (358) 218 80 80',
    email: 'marif@amasyaetas.com',
    website: '',
    tradeRegistryNo: '14520',
    mersisNo: '0612117565800001'
  }
};

export const BANK_ACCOUNTS: Record<'etik' | 'marif', Array<{ bank: string; iban: string }>> = {
  etik: [
    { bank: 'ALBARAKA AMASYA ŞB.', iban: 'TR35 0020 3000 0766 9557 0000 01' },
    { bank: 'HALKBANK AMASYA ŞB.', iban: 'TR47 0001 2009 3000 0010 2006 52' },
    { bank: 'AKBANK AMASYA ŞB.', iban: 'TR83 0004 6001 5488 8000 1199 83' },
    { bank: 'ZİRAAT BANKASI AMASYA ŞB.', iban: 'TR64 0001 0026 9577 2776 2850 01' },
    { bank: 'GARANTİ BANKASI AMASYA ŞB.', iban: 'TR69 0006 2000 7840 0006 2975 11' },
    { bank: 'KUVEYT TÜRK AMASYA ŞB.', iban: 'TR76 0020 5000 0122 7035 7000 04' }
  ],
  marif: [
    { bank: 'ZİRAAT BANKASI AMASYA ŞB.', iban: 'TR41 0001 0000 4872 7338 5001' },
    { bank: 'HALKBANK AMASYA ŞB.', iban: 'TR94 0001 2009 3000 0016 0001 92' },
    { bank: 'VAKIFBANK AMASYA ŞB.', iban: 'TR68 0001 5001 5800 7304 1863 50' }
  ]
};

/**
 * GİB Standart Karekod (QR Code) Veri Dizesi Üretir:
 * Şema: VKN/TCKN|AlıcıVKN|Tarih|FaturaNo|Tutar|KDV|ETTN
 */
export function getGibQrString(invoice: VegaEfatura, company: 'etik' | 'marif' = 'etik'): string {
  const sellerVkn = COMPANY_PROFILES[company].vkn;
  const buyerVkn = invoice.vkn || String(invoice.cariCode || '11111111111');
  const dateStr = (invoice.date || '').slice(0, 10);
  const invNo = (invoice.invoiceNo || '').trim();
  const total = Number(invoice.amount || 0).toFixed(2);
  const kdv = Number(invoice.kdv || 0).toFixed(2);
  const ettn = invoice.ettn || invoice.id || 'N/A';

  return `VKN:${sellerVkn}|AVKN:${buyerVkn}|TAR:${dateStr}|NO:${invNo}|TUT:${total}|KDV:${kdv}|ETTN:${ettn}`;
}

/**
 * GİB Standart UBL-TR 2.1 XML Dokümanı Üretir ve İndirir
 */
export function downloadInvoiceXml(invoice: VegaEfatura, details: VegaEfaturaDetail[] = [], company: 'etik' | 'marif' = 'etik') {
  const seller = COMPANY_PROFILES[company];
  const invNo = invoice.invoiceNo.trim();
  const dateStr = (invoice.date || new Date().toISOString()).slice(0, 10);
  const ettn = invoice.ettn || `INV-${invNo}-${Date.now()}`;
  const matrah = Number(invoice.matrah || invoice.amount || 0);
  const kdv = Number(invoice.kdv || 0);
  const total = Number(invoice.amount || (matrah + kdv));

  const items = details.length > 0 ? details : [{
    id: 1,
    productName: 'Et ve Et Ürünleri Bedeli',
    lineTutar: matrah,
    kdvTutar: kdv
  }];

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${invoice.profile || 'TEMELFATURA'}</cbc:ProfileID>
  <cbc:ID>${invNo}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${ettn}</cbc:UUID>
  <cbc:IssueDate>${dateStr}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${invoice.type === 'e-Arşiv' ? 'EARSIV' : 'SATIS'}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${items.length}</cbc:LineCountNumeric>

  <!-- SATICI (AccountingSupplierParty) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${seller.vkn}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${seller.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${seller.address}</cbc:StreetName>
        <cbc:CityName>${seller.city}</cbc:CityName>
        <cac:Country><cbc:Name>TÜRKİYE</cbc:Name></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme><cbc:Name>${seller.taxOffice}</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- ALICI (AccountingCustomerParty) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${(invoice.vkn || '').length === 11 ? 'TCKN' : 'VKN'}">${invoice.vkn || invoice.cariCode || '11111111111'}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${invoice.cariName || 'MÜŞTERİ'}]]></cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${invoice.city || 'TÜRKİYE'}</cbc:CityName>
        <cac:Country><cbc:Name>TÜRKİYE</cbc:Name></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- VERGİ DÖKÜMÜ (TaxTotal) -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${kdv.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="TRY">${matrah.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="TRY">${kdv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>1.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:Name>KDV</cbc:Name>
          <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- TOPLAMLAR (LegalMonetaryTotal) -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${matrah.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${matrah.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="TRY">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- KALEMLER (InvoiceLines) -->
${items.map((line, idx) => `  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="KGM">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="TRY">${Number(line.lineTutar || 0).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name><![CDATA[${line.productName || 'Et ve Et Ürünleri'}]]></cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="TRY">${Number(line.lineTutar || 0).toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`).join('\n')}
</Invoice>`;

  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invNo}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Standart Resmi e-Fatura HTML Dizesi Üretir (Vega Arctos / GİB Resmi Format)
 */
export function generateInvoiceHtmlString(invoice: VegaEfatura, details: VegaEfaturaDetail[] = [], company: 'etik' | 'marif' = 'etik'): string {
  const seller = COMPANY_PROFILES[company] || COMPANY_PROFILES.etik;
  const isEArsiv = (invoice.type || '').toLowerCase().includes('arşiv') || (invoice.type || '').toLowerCase().includes('arsiv');
  const invNo = invoice.invoiceNo.trim();
  const rawUuid = invoice.ettn || '';
  const ettn = (rawUuid.length > 20) ? rawUuid : `AD2872D9-D956-4F5F-A6F2-CDC9DC1FD48B`;
  const matrah = Number(invoice.matrah || invoice.amount || 0);
  const kdv = Number(invoice.kdv || 0);
  const total = Number(invoice.amount || (matrah + kdv));

  const items = details.length > 0 ? details : [{
    id: 1,
    productName: 'KARKAS DANA ETİ',
    quantity: 1,
    unitName: 'ADET',
    unitPrice: matrah,
    lineTutar: matrah,
    kdvTutar: kdv
  }];

  const qrData = getGibQrString(invoice, company);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0) + 'TL';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  const buyerVkn = (invoice.vkn || String(invoice.cariCode || '')).trim();
  const vknLabel = buyerVkn.length === 11 ? 'TCKN:' : 'VKN:';
  const accounts = BANK_ACCOUNTS[company] || BANK_ACCOUNTS.etik;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${invNo} - ${isEArsiv ? 'e-Arşiv Fatura' : 'e-Fatura'}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background:#f4f6f8; margin:0; padding:20px; display:flex; justify-content:center; color:#000; }
    .invoice-box { width: 210mm; min-height: 297mm; background:#fff; padding: 10mm 12mm; box-shadow: 0 0 10px rgba(0,0,0,0.15); font-size: 11px; line-height: 1.35; position: relative; }
    
    /* Header 3 Columns */
    .top-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .seller-col { width: 45%; font-size: 10.5px; }
    .seller-title { font-weight: bold; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; }
    .center-col { width: 25%; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .doc-type { font-size: 14px; font-weight: 900; margin-top: 6px; letter-spacing: 0.5px; }
    .logo-col { width: 30%; text-align: right; }
    .logo-col img { max-height: 75px; max-width: 140px; object-contain: fit; }

    /* Middle Row: Buyer & Signature & Meta */
    .middle-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 8px; }
    .buyer-col { width: 44%; font-size: 10.5px; }
    .buyer-title { font-weight: bold; margin-bottom: 2px; }
    .signature-col { width: 22%; text-align: center; }
    .meta-col { width: 34%; }
    .meta-table { width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 10px; }
    .meta-table td { border: 1px solid #000; padding: 3px 6px; }
    .meta-label { font-weight: bold; width: 40%; background: #fdfdfd; }

    /* ETTN Bar */
    .ettn-bar { font-size: 10.5px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 8px; }

    /* Items Table */
    .items-table { width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9.5px; margin-bottom: 8px; }
    .items-table th { border: 1px solid #000; padding: 4px; font-weight: bold; text-align: center; background: #fafafa; }
    .items-table td { border: 1px solid #000; padding: 4px; vertical-align: middle; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }

    /* Totals Box */
    .totals-wrapper { display: flex; justify-content: flex-end; margin-bottom: 12px; }
    .totals-table { width: 280px; border-collapse: collapse; border: 1px solid #000; font-size: 10.5px; }
    .totals-table td { border: 1px solid #000; padding: 3px 6px; }
    .totals-table .label { font-weight: bold; width: 60%; }
    .totals-table .val { text-align: right; width: 40%; }
    .totals-table .grand-total { font-weight: bold; font-size: 11px; }

    /* Notes & QR Row */
    .notes-qr-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
    .notes-col { width: 65%; font-size: 11px; }
    .notes-title { font-weight: bold; margin-bottom: 2px; }
    .notes-text { font-weight: bold; }
    .qr-col { width: 35%; text-align: right; }
    .qr-col img { width: 95px; height: 95px; border: 1px solid #ccc; padding: 2px; }

    /* Bank Accounts Table */
    .bank-table { width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 9.5px; margin-top: 10px; }
    .bank-table td { border: 1px solid #000; padding: 3px 6px; font-weight: 600; }
    .bank-table .bank-name { width: 35%; font-weight: bold; }
    .bank-table .bank-iban { width: 65%; font-family: monospace; }

    @media print {
      body { background:#fff; padding:0; }
      .invoice-box { box-shadow:none; padding:8mm 10mm; width:100%; min-height:auto; }
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <!-- Top Header -->
    <div class="top-header">
      <div class="seller-col">
        <div class="seller-title">${seller.name}</div>
        <div>${seller.address}</div>
        <div>${seller.city}</div>
        ${seller.phone ? `<div>Tel: ${seller.phone}</div>` : ''}
        <div>E-Posta: ${seller.email}</div>
        <div>Vergi Dairesi: ${seller.taxOffice}</div>
        <div>VKN: ${seller.vkn}</div>
        <div>TİCARETSİCİLNO: ${seller.tradeRegistryNo || (company === 'marif' ? '14520' : '004750')}</div>
        <div>MERSİSNO: ${seller.mersisNo || (company === 'marif' ? '0612117565800001' : '0381045856200013')}</div>
      </div>

      <div class="center-col">
        <!-- Official GİB Logo SVG -->
        <svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#c00" stroke-width="2.5" fill="#fff" />
          <circle cx="50" cy="50" r="41" stroke="#c00" stroke-width="1" fill="#fff" />
          <path id="gibArc" d="M 18,50 A 32,32 0 1,1 82,50" fill="none" />
          <text font-size="7.5" font-weight="bold" fill="#c00" letter-spacing="0.5">
            <textPath href="#gibArc" startOffset="50%" text-anchor="middle">GELİR İDARESİ BAŞKANLIĞI</textPath>
          </text>
          <path d="M 50 25 A 25 25 0 1 0 75 50 L 52 50 L 52 58 L 71 58 A 19 19 0 1 1 50 31 Z" fill="#c00" />
          <path id="gibBottom" d="M 82,50 A 32,32 0 0,1 18,50" fill="none" />
          <text font-size="6" font-weight="bold" fill="#c00" letter-spacing="0.5">
            <textPath href="#gibBottom" startOffset="50%" text-anchor="middle">T.C. HAZİNE VE MALİYE BAKANLIĞI</textPath>
          </text>
        </svg>
        <div class="doc-type">${isEArsiv ? 'e-ARŞİV FATURA' : 'e-FATURA'}</div>
      </div>

      <div class="logo-col">
        <img src="/etas_et_logo.png" alt="Firma Logosu" onerror="this.style.display='none'" />
      </div>
    </div>

    <!-- Middle Row -->
    <div class="middle-row">
      <div class="buyer-col">
        <div class="buyer-title">SAYIN</div>
        <div style="font-weight:bold; font-size:11.5px;">${invoice.cariName || 'MÜŞTERİ'}</div>
        <div>${invoice.notes || ''}</div>
        <div>${invoice.city || 'AMASYA MERKEZ/ AMASYA'}</div>
        <div>E-Posta:</div>
        <div>Tel: Fax:</div>
        <div>Vergi Dairesi: ${invoice.taxOffice || 'AMASYA'}</div>
        <div style="font-weight:bold;">${vknLabel} ${buyerVkn || '—'}</div>
      </div>

      <div class="signature-col">
        <!-- Wet Signature SVG -->
        <svg width="140" height="55" viewBox="0 0 160 70" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(-3deg);">
          <path d="M15 45 C30 20, 45 10, 60 35 C70 50, 85 15, 95 25 C105 35, 115 55, 130 30 C138 18, 145 28, 150 40 M45 42 C70 42, 110 38, 145 45 M30 30 C50 15, 75 12, 100 20 C125 28, 140 25, 155 35" stroke="#1a4f8b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />
        </svg>
      </div>

      <div class="meta-col">
        <table class="meta-table">
          <tr>
            <td class="meta-label">Özelleştirme No:</td>
            <td>TR1.2</td>
          </tr>
          <tr>
            <td class="meta-label">Senaryo:</td>
            <td>${invoice.profile || 'TEMELFATURA'}</td>
          </tr>
          <tr>
            <td class="meta-label">Fatura Tipi:</td>
            <td>SATIS</td>
          </tr>
          <tr>
            <td class="meta-label">Fatura No:</td>
            <td style="font-weight:bold;">${invNo}</td>
          </tr>
          <tr>
            <td class="meta-label">Fatura Tarihi:</td>
            <td>${formatDate(invoice.date)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- ETTN Bar -->
    <div class="ettn-bar">
      ETTN: ${ettn}
    </div>

    <!-- Line Items Table (Exact 12 columns) -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 4%;">Sıra No</th>
          <th style="width: 22%;">Mal Hizmet</th>
          <th style="width: 10%;">Miktar</th>
          <th style="width: 8%;">Birim Fiyat</th>
          <th style="width: 7%;">İskonto/ Arttırım Oranı</th>
          <th style="width: 7%;">İskonto/ Arttırım Tutarı</th>
          <th style="width: 6%;">İskonto/ Arttırım Nedeni</th>
          <th style="width: 6%;">KDV Oranı</th>
          <th style="width: 8%;">KDV Tutarı</th>
          <th style="width: 6%;">Diğer Vergiler</th>
          <th style="width: 8%;">Satır Açıklaması</th>
          <th style="width: 8%;">Mal Hizmet Tutarı</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, idx) => {
          const qty = it.quantity || 1;
          const unit = it.unitName || 'KG';
          const lineNet = it.lineTutar || matrah;
          const unitPrice = it.unitPrice || (lineNet / Number(qty));
          const lineKdv = it.kdvTutar || kdv;

          return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-left font-bold">${it.productName || 'KARKAS DANA ETİ'}</td>
            <td class="text-right">${typeof qty === 'number' ? qty.toLocaleString('tr-TR') : qty} ${unit}</td>
            <td class="text-right">${fmtCurrency(unitPrice)}</td>
            <td class="text-center">—</td>
            <td class="text-right">0,00TL</td>
            <td class="text-center">—</td>
            <td class="text-center">%1,00</td>
            <td class="text-right">${fmtCurrency(lineKdv)}</td>
            <td class="text-center">—</td>
            <td class="text-left">${unit} ${qty}</td>
            <td class="text-right font-bold">${fmtCurrency(lineNet)}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <!-- Totals Box -->
    <div class="totals-wrapper">
      <table class="totals-table">
        <tr>
          <td class="label">Mal Hizmet Toplam Tutarı</td>
          <td class="val">${fmtCurrency(matrah)}</td>
        </tr>
        <tr>
          <td class="label">Toplam İskonto</td>
          <td class="val">0,00TL</td>
        </tr>
        <tr>
          <td class="label">Hesaplanan KDV (%1)</td>
          <td class="val">${fmtCurrency(kdv)}</td>
        </tr>
        <tr>
          <td class="label">Vergiler Dahil Toplam Tutar</td>
          <td class="val">${fmtCurrency(total)}</td>
        </tr>
        <tr class="grand-total">
          <td class="label">Ödenecek Tutar</td>
          <td class="val" style="font-weight:bold;">${fmtCurrency(total)}</td>
        </tr>
      </table>
    </div>

    <!-- Notes & QR Code -->
    <div class="notes-qr-row">
      <div class="notes-col">
        <div class="notes-title">Not:</div>
        <div class="notes-text">Not: Yalnız ${numberToTurkishWords(total).toUpperCase()} TL</div>
      </div>
      <div class="qr-col">
        <img src="${qrUrl}" alt="GİB Karekod" />
      </div>
    </div>

    <!-- Bank Accounts Table -->
    <table class="bank-table">
      ${accounts.map(acc => `
        <tr>
          <td class="bank-name">${acc.bank}</td>
          <td class="bank-iban">IBAN: ${acc.iban}</td>
        </tr>
      `).join('')}
    </table>
  </div>
</body>
</html>`;
}

/**
 * Standart Resmi e-Fatura HTML Çıktısı Üretir ve İndirir
 */
export function downloadInvoiceHtml(invoice: VegaEfatura, details: VegaEfaturaDetail[] = [], company: 'etik' | 'marif' = 'etik') {
  const invNo = invoice.invoiceNo.trim();
  const htmlContent = generateInvoiceHtmlString(invoice, details, company);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invNo}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
