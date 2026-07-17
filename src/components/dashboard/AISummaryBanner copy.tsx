import { Sparkles, ArrowRight } from 'lucide-react';

export function AISummaryBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
          <Sparkles size={18} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              AI Yönetici Özeti
            </h2>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700">
              Canlı
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
            Bugün <span className="font-medium text-gray-900">2 ödeme</span> ve{' '}
            <span className="font-medium text-gray-900">1 ihale teklifi</span>{' '}
            acil. Nakit akışında hafta sonuna doğru{' '}
            <span className="font-medium text-gray-900">₺180.000 açık</span>{' '}
            bekleniyor. Filo kapasitesi %92 —{' '}
            <span className="font-medium text-gray-900">2 araç müsait</span>.
            Detaylar için AI Asistan'a geçin.
          </p>
          <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
            AI Asistan'a git
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
