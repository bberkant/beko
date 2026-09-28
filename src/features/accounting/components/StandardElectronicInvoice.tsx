import type { VegaEfatura, VegaEfaturaDetail } from '../VegaArctosEfaturaPage';
import { COMPANY_PROFILES, getGibQrString } from '../utils/invoiceDocumentHelpers';
import { numberToTurkishWords } from '../../../utils/numberToTurkishWords';
import { FileCheck, ShieldCheck } from 'lucide-react';

interface StandardElectronicInvoiceProps {
  invoice: VegaEfatura;
  details: VegaEfaturaDetail[];
  company: 'etik' | 'marif';
}

export function StandardElectronicInvoice({ invoice, details, company }: StandardElectronicInvoiceProps) {
  const seller = COMPANY_PROFILES[company] || COMPANY_PROFILES.etik;
  const isEArsiv = (invoice.type || '').toLowerCase().includes('arşiv') || (invoice.type || '').toLowerCase().includes('arsiv');
  const invNo = (invoice.invoiceNo || '').trim();
  const ettn = invoice.ettn || `GIB-${invNo}-${invoice.id || '2026'}`;
  const matrah = Number(invoice.matrah || invoice.amount || 0);
  const kdv = Number(invoice.kdv || 0);
  const total = Number(invoice.amount || (matrah + kdv));

  const items: VegaEfaturaDetail[] = details.length > 0 ? details : [{
    id: 1,
    productName: 'Et ve Et Ürünleri Satış Bedeli',
    lineTutar: matrah,
    kdvTutar: kdv,
  }];

  const qrData = getGibQrString(invoice, company);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  return (
    <div className="electronic-invoice-root bg-white text-gray-900 border border-gray-300 rounded-xl shadow-lg p-6 sm:p-10 max-w-4xl mx-auto font-sans leading-relaxed select-text">
      {/* Official Header Section */}
      <div className="border-b-2 border-[#1f4e79] pb-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Document Title & Official GİB Badge */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className={`inline-block px-3 py-1 text-xs font-black tracking-wider uppercase rounded text-white ${isEArsiv ? 'bg-rose-700' : 'bg-[#1f4e79]'}`}>
                {isEArsiv ? 'e-ARŞİV FATURA' : 'e-FATURA'}
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <FileCheck size={13} />
                GİB Elektronik Belge Standardı (UBL-TR 2.1)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {seller.name}
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              ETTN (Evrensel Tekil Tanımlayıcı): <span className="font-semibold text-gray-700">{ettn}</span>
            </p>
          </div>

          {/* QR Code & Metadata Box */}
          <div className="flex items-center gap-4 self-end sm:self-center">
            <div className="flex flex-col items-center justify-center p-1.5 bg-gray-50 border border-gray-200 rounded-lg shadow-inner">
              <img
                src={qrUrl}
                alt="GİB Doğrulama Karekodu"
                width={80}
                height={80}
                className="rounded"
                onError={(e) => {
                  // Fallback if image proxy is blocked
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">GİB QR</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 min-w-[170px]">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Fatura No</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{invNo}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Fatura Tarihi</span>
                <span className="font-semibold text-gray-800">{formatDate(invoice.date)}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Senaryo / Profil</span>
                <span className="font-semibold text-gray-700">{invoice.profile || 'TEMELFATURA'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier & Customer Parties Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs">
        {/* SATICI */}
        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-[#1f4e79] uppercase tracking-wider text-[11px]">
              SATICI BİLGİLERİ
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Düzenleyen
            </span>
          </div>
          <div className="font-bold text-gray-900 text-sm leading-snug">
            {seller.name}
          </div>
          <div className="text-gray-600 leading-relaxed">
            {seller.address}
            <br />
            {seller.city} - TÜRKİYE
          </div>
          <div className="pt-1 text-gray-700 space-y-0.5 border-t border-slate-100">
            <div><strong className="text-gray-900">Vergi Dairesi:</strong> {seller.taxOffice}</div>
            <div><strong className="text-gray-900">VKN:</strong> <span className="font-mono">{seller.vkn}</span></div>
            <div><strong className="text-gray-900">Tel:</strong> {seller.phone}</div>
            {seller.mersisNo && <div><strong className="text-gray-900">Mersis No:</strong> <span className="font-mono">{seller.mersisNo}</span></div>}
          </div>
        </div>

        {/* ALICI */}
        <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-[#1f4e79] uppercase tracking-wider text-[11px]">
              ALICI / MÜŞTERİ BİLGİLERİ
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Muhatap
            </span>
          </div>
          <div className="font-bold text-gray-900 text-sm leading-snug">
            {invoice.cariName || 'MÜŞTERİ BİLGİSİ BELİRTİLMEMİŞ'}
          </div>
          <div className="text-gray-600 leading-relaxed">
            {invoice.city || 'TÜRKİYE'}
          </div>
          <div className="pt-1 text-gray-700 space-y-0.5 border-t border-slate-100">
            <div>
              <strong className="text-gray-900">VKN / TCKN:</strong>{' '}
              <span className="font-mono font-semibold">{invoice.vkn || invoice.cariCode || '—'}</span>
            </div>
            <div>
              <strong className="text-gray-900">Cari Takip Kodu:</strong>{' '}
              <span className="font-mono">{invoice.cariCode || '—'}</span>
            </div>
            {invoice.taxOffice && <div><strong className="text-gray-900">Vergi Dairesi:</strong> {invoice.taxOffice}</div>}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="mb-8">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#1f4e79] text-white font-semibold">
                <th className="px-3.5 py-3 w-10 text-center">S.No</th>
                <th className="px-3.5 py-3">Mal / Hizmet Açıklaması</th>
                <th className="px-3.5 py-3 text-right">Miktar</th>
                <th className="px-3.5 py-3 text-right">Birim Fiyat</th>
                <th className="px-3.5 py-3 text-right">KDV (%)</th>
                <th className="px-3.5 py-3 text-right">KDV Tutarı</th>
                <th className="px-3.5 py-3 text-right">Mal / Hizmet Tutarı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {items.map((line, idx) => {
                const lineNet = Number(line.lineTutar || 0);
                const lineKdv = Number(line.kdvTutar || 0);
                const lineQty = typeof line.quantity === 'number' ? line.quantity : (parseFloat(String(line.quantity || '1')) || 1);
                const unitPrice = line.unitPrice || (lineNet / lineQty);

                return (
                  <tr key={line.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-3.5 py-3 font-semibold text-gray-900">
                      {line.productName || 'Et ve Et Ürünleri'}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-gray-700">
                      {line.quantity ? `${line.quantity} ${line.unitName || 'KG'}` : '1 ADET'}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-gray-700">
                      {formatCurrency(unitPrice)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono text-gray-600">%1</td>
                    <td className="px-3.5 py-3 text-right font-mono text-gray-600">
                      {formatCurrency(lineKdv)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-gray-900">
                      {formatCurrency(lineNet)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Breakdown & Legal Summary Box */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-6">
        {/* Left: Turkish Legal Words Summary */}
        <div className="flex-1 space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
            <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider mb-1">
              Ödenecek Tutar Yazıyla:
            </span>
            <div className="font-bold text-slate-800 tracking-wide uppercase">
              YALNIZ {numberToTurkishWords(total)}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
            <span>
              İşbu fatura 213 sayılı V.U.K. hükümlerine göre elektronik ortamda tanzim edilmiş olup, 5070 sayılı Kanuna göre güvenli elektronik imza / mali mühür ile onaylanmıştır.
            </span>
          </div>
        </div>

        {/* Right: Calculations Summary Card */}
        <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 shadow-sm">
          <div className="flex justify-between items-center text-gray-600">
            <span>Mal / Hizmet Toplam Tutarı (Matrah):</span>
            <span className="font-mono font-semibold text-gray-900">{formatCurrency(matrah)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-600">
            <span>Hesaplanan KDV (%1):</span>
            <span className="font-mono font-semibold text-gray-900">{formatCurrency(kdv)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-600">
            <span>Toplam İndirim / İskonto:</span>
            <span className="font-mono text-gray-400">0,00 ₺</span>
          </div>
          <div className="border-t-2 border-slate-300 pt-2 flex justify-between items-center text-sm">
            <span className="font-bold text-gray-900 uppercase">ÖDENECEK TOPLAM:</span>
            <span className="font-mono font-black text-[#c53030] text-base">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Official Footnotes */}
      <div className="border-t border-gray-200 pt-4 text-center text-[10px] text-gray-400 space-y-1">
        <div>T.C. Gelir İdaresi Başkanlığı e-Fatura & e-Arşiv Fatura Portalı Standartlarına Uygundur.</div>
        <div className="font-mono">Belge Doğrulama Kodu: {ettn}</div>
      </div>
    </div>
  );
}
