import type { VegaEfatura, VegaEfaturaDetail } from '../VegaArctosEfaturaPage';
import { COMPANY_PROFILES, BANK_ACCOUNTS, getGibQrString } from '../utils/invoiceDocumentHelpers';
import { numberToTurkishWords } from '../../../utils/numberToTurkishWords';

interface StandardElectronicInvoiceProps {
  invoice: VegaEfatura;
  details: VegaEfaturaDetail[];
  company: 'etik' | 'marif';
}

function GibOfficialLogo() {
  return (
    <div className="flex flex-col items-center">
      <svg width="68" height="68" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Double circular red border */}
        <circle cx="50" cy="50" r="46" stroke="#c00" strokeWidth="2.5" fill="#fff" />
        <circle cx="50" cy="50" r="41" stroke="#c00" strokeWidth="1" fill="#fff" />
        {/* Top Arc text: GELİR İDARESİ BAŞKANLIĞI */}
        <path id="gibArcTextReact" d="M 18,50 A 32,32 0 1,1 82,50" fill="none" />
        <text fontSize="7.5" fontWeight="bold" fill="#c00" letterSpacing="0.5">
          <textPath href="#gibArcTextReact" startOffset="50%" textAnchor="middle">
            GELİR İDARESİ BAŞKANLIĞI
          </textPath>
        </text>
        {/* Central Stylized G emblem */}
        <path
          d="M 50 25 A 25 25 0 1 0 75 50 L 52 50 L 52 58 L 71 58 A 19 19 0 1 1 50 31 Z"
          fill="#c00"
        />
        {/* Bottom Arc text: T.C. HAZİNE VE MALİYE BAKANLIĞI */}
        <path id="gibBottomArcReact" d="M 82,50 A 32,32 0 0,1 18,50" fill="none" />
        <text fontSize="6" fontWeight="bold" fill="#c00" letterSpacing="0.5">
          <textPath href="#gibBottomArcReact" startOffset="50%" textAnchor="middle">
            T.C. HAZİNE VE MALİYE BAKANLIĞI
          </textPath>
        </text>
      </svg>
    </div>
  );
}

function WetBlueSignature() {
  return (
    <div className="flex items-center justify-center">
      <svg width="140" height="55" viewBox="0 0 160 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -rotate-2">
        <path
          d="M15 45 C30 20, 45 10, 60 35 C70 50, 85 15, 95 25 C105 35, 115 55, 130 30 C138 18, 145 28, 150 40 M45 42 C70 42, 110 38, 145 45 M30 30 C50 15, 75 12, 100 20 C125 28, 140 25, 155 35"
          stroke="#1a4f8b"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.88 }}
        />
      </svg>
    </div>
  );
}

export function StandardElectronicInvoice({ invoice, details, company }: StandardElectronicInvoiceProps) {
  const seller = COMPANY_PROFILES[company] || COMPANY_PROFILES.etik;
  const isEArsiv = (invoice.type || '').toLowerCase().includes('arşiv') || (invoice.type || '').toLowerCase().includes('arsiv');
  const invNo = (invoice.invoiceNo || '').trim();
  const rawUuid = invoice.ettn || '';
  const ettn = (rawUuid.length > 20) ? rawUuid : `AD2872D9-D956-4F5F-A6F2-CDC9DC1FD48B`;
  const matrah = Number(invoice.matrah || invoice.amount || 0);
  const kdv = Number(invoice.kdv || 0);
  const total = Number(invoice.amount || (matrah + kdv));

  const items: VegaEfaturaDetail[] = details.length > 0 ? details : [{
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

  const formatDateWithTime = (dateStr: string) => {
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

  return (
    <div className="electronic-invoice-vega-official bg-white text-black p-6 sm:p-10 max-w-[210mm] mx-auto font-sans leading-tight shadow-md border border-gray-300 select-text">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .electronic-invoice-vega-official,
          .electronic-invoice-vega-official * {
            visibility: visible !important;
          }
          .electronic-invoice-vega-official {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      {/* 1. TOP HEADER (3 Columns: Seller Details, GİB Logo, Company Logo) */}
      <div className="grid grid-cols-12 gap-3 border-b-2 border-black pb-3 mb-3">
        {/* Left: Seller Legal Info */}
        <div className="col-span-5 text-[11px] leading-[1.3] text-black">
          <div className="font-bold text-[11.5px] uppercase mb-1">
            {seller.name}
          </div>
          <div>{seller.address}</div>
          <div>{seller.city}</div>
          {seller.website && <div>Web Sitesi: {seller.website}</div>}
          <div>E-Posta: {seller.email}</div>
          <div>Vergi Dairesi: {seller.taxOffice}</div>
          <div>VKN: {seller.vkn}</div>
          <div>TİCARETSİCİLNO: {seller.tradeRegistryNo || '004750'}</div>
          <div>MERSİSNO: {seller.mersisNo || '0381045856200013'}</div>
        </div>

        {/* Center: Official GİB Logo & Document Type */}
        <div className="col-span-4 flex flex-col items-center justify-center text-center">
          <GibOfficialLogo />
          <div className="font-black text-sm tracking-wider text-black mt-1">
            {isEArsiv ? 'e-ARŞİV FATURA' : 'e-FATURA'}
          </div>
        </div>

        {/* Right: Company Logo */}
        <div className="col-span-3 flex justify-end items-start pt-1">
          <img
            src="/etas_et_logo.png"
            alt="Firma Logosu"
            className="max-h-20 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* 2. MIDDLE ROW (Buyer Info, Wet Signature, Invoice Metadata Table) */}
      <div className="grid grid-cols-12 gap-2 items-center border-b-2 border-black pb-3 mb-2">
        {/* Left: Buyer Details */}
        <div className="col-span-5 text-[11px] leading-[1.3] text-black">
          <div className="font-bold text-xs mb-0.5">SAYIN</div>
          <div className="font-bold uppercase text-[12px]">
            {invoice.cariName || 'MÜŞTERİ'}
          </div>
          {invoice.notes && <div className="text-gray-900">{invoice.notes}</div>}
          <div>{invoice.city || 'AMASYA MERKEZ/ AMASYA'}</div>
          <div>E-Posta:</div>
          <div>Tel: Fax:</div>
          <div>Vergi Dairesi: {invoice.taxOffice || 'AMASYA'}</div>
          <div className="font-bold">
            {vknLabel} {buyerVkn || '—'}
          </div>
        </div>

        {/* Center: Wet Signature */}
        <div className="col-span-3 flex justify-center items-center">
          <WetBlueSignature />
        </div>

        {/* Right: Invoice Metadata Table */}
        <div className="col-span-4">
          <table className="w-full text-[10.5px] border-collapse border border-black">
            <tbody>
              <tr>
                <td className="border border-black px-2 py-0.5 font-bold bg-gray-50/50 w-2/5">
                  Özelleştirme No:
                </td>
                <td className="border border-black px-2 py-0.5">TR1.2</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-bold bg-gray-50/50">
                  Senaryo:
                </td>
                <td className="border border-black px-2 py-0.5 font-semibold">
                  {invoice.profile || 'TEMELFATURA'}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-bold bg-gray-50/50">
                  Fatura Tipi:
                </td>
                <td className="border border-black px-2 py-0.5 font-semibold">
                  SATIS
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-bold bg-gray-50/50">
                  Fatura No:
                </td>
                <td className="border border-black px-2 py-0.5 font-bold text-xs font-mono">
                  {invNo}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-0.5 font-bold bg-gray-50/50">
                  Fatura Tarihi:
                </td>
                <td className="border border-black px-2 py-0.5">
                  {formatDateWithTime(invoice.date)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. ETTN SINGLE LINE BAR */}
      <div className="text-[11px] font-bold text-black border-b border-black pb-1 mb-2.5">
        ETTN: <span className="font-mono">{ettn}</span>
      </div>

      {/* 4. EXACT 12-COLUMN LINE ITEMS TABLE */}
      <div className="mb-2 overflow-x-auto">
        <table className="w-full text-[9.5px] border-collapse border border-black leading-tight">
          <thead>
            <tr className="bg-gray-50/80 font-bold text-center">
              <th className="border border-black p-1 w-[4%]">Sıra No</th>
              <th className="border border-black p-1 text-left w-[22%]">Mal Hizmet</th>
              <th className="border border-black p-1 text-right w-[10%]">Miktar</th>
              <th className="border border-black p-1 text-right w-[9%]">Birim Fiyat</th>
              <th className="border border-black p-1 text-center w-[7%]">İskonto/ Arttırım Oranı</th>
              <th className="border border-black p-1 text-right w-[7%]">İskonto/ Arttırım Tutarı</th>
              <th className="border border-black p-1 text-center w-[6%]">İskonto/ Arttırım Nedeni</th>
              <th className="border border-black p-1 text-center w-[6%]">KDV Oranı</th>
              <th className="border border-black p-1 text-right w-[8%]">KDV Tutarı</th>
              <th className="border border-black p-1 text-center w-[5%]">Diğer Vergiler</th>
              <th className="border border-black p-1 text-left w-[8%]">Satır Açıklaması</th>
              <th className="border border-black p-1 text-right w-[8%]">Mal Hizmet Tutarı</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const qty = it.quantity || 1;
              const unit = it.unitName || 'KG';
              const lineNet = it.lineTutar || matrah;
              const unitPrice = it.unitPrice || (lineNet / Number(qty));
              const lineKdv = it.kdvTutar || kdv;

              return (
                <tr key={it.id || idx}>
                  <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1 text-left font-bold text-gray-950">
                    {it.productName || 'KARKAS DANA ETİ'}
                  </td>
                  <td className="border border-black p-1 text-right font-mono">
                    {typeof qty === 'number' ? qty.toLocaleString('tr-TR') : qty} {unit}
                  </td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmtCurrency(unitPrice)}
                  </td>
                  <td className="border border-black p-1 text-center font-mono">—</td>
                  <td className="border border-black p-1 text-right font-mono">0,00TL</td>
                  <td className="border border-black p-1 text-center font-mono">—</td>
                  <td className="border border-black p-1 text-center font-mono">%1,00</td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmtCurrency(lineKdv)}
                  </td>
                  <td className="border border-black p-1 text-center font-mono">—</td>
                  <td className="border border-black p-1 text-left text-[9px]">
                    {unit} {qty}
                  </td>
                  <td className="border border-black p-1 text-right font-mono font-bold">
                    {fmtCurrency(lineNet)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. TOTALS SUMMARY BOX (RIGHT ALIGNED) */}
      <div className="flex justify-end mb-3">
        <table className="w-[280px] text-[10.5px] border-collapse border border-black">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-0.5 font-bold w-[60%]">
                Mal Hizmet Toplam Tutarı
              </td>
              <td className="border border-black px-2 py-0.5 text-right font-mono">
                {fmtCurrency(matrah)}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-0.5 font-bold">
                Toplam İskonto
              </td>
              <td className="border border-black px-2 py-0.5 text-right font-mono">
                0,00TL
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-0.5 font-bold">
                Hesaplanan KDV (%1)
              </td>
              <td className="border border-black px-2 py-0.5 text-right font-mono">
                {fmtCurrency(kdv)}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-0.5 font-bold">
                Vergiler Dahil Toplam Tutar
              </td>
              <td className="border border-black px-2 py-0.5 text-right font-mono">
                {fmtCurrency(total)}
              </td>
            </tr>
            <tr className="font-bold bg-gray-50/50">
              <td className="border border-black px-2 py-0.5 text-black">
                Ödenecek Tutar
              </td>
              <td className="border border-black px-2 py-0.5 text-right font-mono font-black text-black">
                {fmtCurrency(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 6. NOTES & QR CODE ROW */}
      <div className="flex justify-between items-start mb-4">
        {/* Left: Notes & Turkish Words */}
        <div className="w-[65%] text-[11px] space-y-1">
          <div className="font-bold">Not:</div>
          <div className="font-bold text-gray-900 tracking-wide uppercase">
            Not: Yalnız {numberToTurkishWords(total).toUpperCase()} TL
          </div>
        </div>

        {/* Right: Square QR Code */}
        <div className="w-[35%] flex justify-end">
          <img
            src={qrUrl}
            alt="GİB Karekod"
            width={95}
            height={95}
            className="border border-gray-400 p-0.5"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* 7. BANK IBAN ACCOUNTS TABLE (BOTTOM FOOTER) */}
      <table className="w-full text-[9.5px] border-collapse border border-black mt-2">
        <tbody>
          {accounts.map((acc, i) => (
            <tr key={i}>
              <td className="border border-black px-2 py-0.5 font-bold w-[35%]">
                {acc.bank}
              </td>
              <td className="border border-black px-2 py-0.5 font-mono w-[65%]">
                IBAN: {acc.iban}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
