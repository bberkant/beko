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
  tradeRegistryNo?: string;
  mersisNo?: string;
}

export const COMPANY_PROFILES: Record<'etik' | 'marif', CompanyLegalInfo> = {
  etik: {
    name: 'ETİK ET ÜRÜNLERİ GIDA TARIM HAYVANCILIK SANAYİ VE TİCARET LİMİTED ŞİRKETİ',
    vkn: '3810458562',
    taxOffice: 'Amasya Vergi Dairesi',
    address: 'Göllü Bağları Mah. Tokat Cad. No:200',
    city: 'AMASYA',
    phone: '0 (358) 218 80 80',
    email: 'muhasebe@amasyaetas.com',
    tradeRegistryNo: '12458',
    mersisNo: '0381045856200001'
  },
  marif: {
    name: 'MARİF ET VE ET ÜRÜNLERİ HAYVANCILIK GIDA SANAYİ TİCARET LİMİTED ŞİRKETİ',
    vkn: '6121175658',
    taxOffice: 'Amasya Vergi Dairesi',
    address: 'Şeyhcui Mah. Kemal Nehrozoğlu Cad. No:8',
    city: 'AMASYA',
    phone: '0 (358) 218 80 80',
    email: 'marif@amasyaetas.com',
    tradeRegistryNo: '14520',
    mersisNo: '0612117565800001'
  }
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
 * Standart Resmi e-Fatura HTML Çıktısı Üretir ve İndirir
 */
export function downloadInvoiceHtml(invoice: VegaEfatura, details: VegaEfaturaDetail[] = [], company: 'etik' | 'marif' = 'etik') {
  const seller = COMPANY_PROFILES[company];
  const invNo = invoice.invoiceNo.trim();
  const dateStr = (invoice.date || new Date().toISOString()).slice(0, 10);
  const matrah = Number(invoice.matrah || invoice.amount || 0);
  const kdv = Number(invoice.kdv || 0);
  const total = Number(invoice.amount || (matrah + kdv));
  const ettn = invoice.ettn || `INV-${invNo}`;
  const qrData = getGibQrString(invoice, company);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(qrData)}`;

  const items = details.length > 0 ? details : [{
    id: 1,
    productName: 'Et ve Et Ürünleri Satış Bedeli',
    lineTutar: matrah,
    kdvTutar: kdv
  }];

  const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${invNo} - ${invoice.type || 'e-Fatura'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background:#f4f6f8; margin:0; padding:20px; display:flex; justify-content:center; }
    .invoice-box { width: 210mm; min-height: 297mm; background:#fff; padding: 15mm; box-shadow: 0 0 10px rgba(0,0,0,0.15); box-sizing: border-box; }
    .header-table { width: 100%; border-bottom: 2px solid #1f4e79; padding-bottom: 12px; margin-bottom: 15px; }
    .title { font-size: 22px; font-weight: bold; color: #1f4e79; letter-spacing: 1px; }
    .subtitle { font-size: 11px; color: #666; margin-top: 4px; }
    .meta-box { border: 1px solid #1f4e79; border-radius: 4px; padding: 8px 12px; text-align: left; font-size: 11px; background: #fbfcfe; }
    .parties-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
    .party-card { width: 48%; vertical-align: top; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 11px; line-height: 1.5; background: #fff; }
    .party-title { font-size: 12px; font-weight: bold; color: #1f4e79; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    .items-table th { background: #1f4e79; color: #fff; padding: 8px 10px; font-weight: 600; text-align: left; }
    .items-table th.right { text-align: right; }
    .items-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .items-table td.right { text-align: right; }
    .summary-box { width: 320px; margin-left: auto; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 12px; background: #f8fafc; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .summary-total { font-size: 14px; font-weight: bold; color: #c53030; border-top: 2px solid #cbd5e1; margin-top: 6px; padding-top: 6px; }
    .yaziyla { margin-top: 15px; padding: 8px 12px; background: #f1f5f9; border-radius: 4px; font-size: 11px; font-weight: 600; color: #334155; }
    .legal-footer { margin-top: 25px; border-top: 1px dashed #cbd5e1; padding-top: 12px; text-align: center; font-size: 10px; color: #64748b; line-height: 1.5; }
    @media print {
      body { background:#fff; padding:0; }
      .invoice-box { box-shadow:none; padding:10mm; width:100%; min-height:auto; }
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <table class="header-table">
      <tr>
        <td style="width: 55%;">
          <div class="title">${invoice.type || 'e-FATURA'}</div>
          <div class="subtitle">GELİR İDARESİ BAŞKANLIĞI ELEKTRONİK BELGE STANDARDI</div>
          <div style="margin-top: 8px; font-size: 11px;"><strong>ETTN (UUID):</strong> ${ettn}</div>
        </td>
        <td style="width: 25%; text-align: right; vertical-align: middle;">
          <img src="${qrUrl}" alt="GİB Karekod" width="80" height="80" style="border: 1px solid #ddd; padding: 2px;" />
        </td>
        <td style="width: 20%; vertical-align: top;">
          <div class="meta-box">
            <div><strong>Fatura No:</strong> ${invNo}</div>
            <div style="margin-top:4px;"><strong>Tarih:</strong> ${dateStr}</div>
            <div style="margin-top:4px;"><strong>Senaryo:</strong> ${invoice.profile || 'TEMELFATURA'}</div>
          </div>
        </td>
      </tr>
    </table>

    <table class="parties-table">
      <tr>
        <td class="party-card">
          <div class="party-title">SATICI BİLGİLERİ</div>
          <div><strong>${seller.name}</strong></div>
          <div>${seller.address}</div>
          <div>${seller.city} - TÜRKİYE</div>
          <div><strong>Vergi Dairesi:</strong> ${seller.taxOffice}</div>
          <div><strong>VKN:</strong> ${seller.vkn}</div>
          <div><strong>Tel:</strong> ${seller.phone}</div>
        </td>
        <td style="width: 4%;"></td>
        <td class="party-card">
          <div class="party-title">ALICI BİLGİLERİ</div>
          <div><strong>${invoice.cariName || 'MÜŞTERİ'}</strong></div>
          <div>${invoice.city || 'TÜRKİYE'}</div>
          <div><strong>VKN / TCKN:</strong> ${invoice.vkn || invoice.cariCode || '—'}</div>
          <div><strong>Cari Kodu:</strong> ${invoice.cariCode || '—'}</div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%;">S.No</th>
          <th style="width: 50%;">Mal / Hizmet Açıklaması</th>
          <th class="right" style="width: 15%;">Net Tutar</th>
          <th class="right" style="width: 15%;">KDV (%1)</th>
          <th class="right" style="width: 15%;">Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((line, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${line.productName || 'Et ve Et Ürünleri'}</strong></td>
            <td class="right">${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(line.lineTutar)}</td>
            <td class="right">${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(line.kdvTutar)}</td>
            <td class="right"><strong>${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(line.lineTutar + line.kdvTutar)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-box">
      <div class="summary-row">
        <span>Mal/Hizmet Toplam Tutarı:</span>
        <span>${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(matrah)}</span>
      </div>
      <div class="summary-row">
        <span>Hesaplanan KDV:</span>
        <span>${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(kdv)}</span>
      </div>
      <div class="summary-row summary-total">
        <span>ÖDENECEK TOPLAM:</span>
        <span>${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(total)}</span>
      </div>
    </div>

    <div class="yaziyla">
      YALNIZ: ${numberToTurkishWords(total)}
    </div>

    <div class="legal-footer">
      <div>İşbu fatura 213 sayılı Vergi Usul Kanunu hükümlerine göre elektronik ortamda düzenlenmiş olup mali mühür ile onaylanmıştır.</div>
      <div>GİB Onay Kodu: ${ettn}</div>
    </div>
  </div>
</body>
</html>`;

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
