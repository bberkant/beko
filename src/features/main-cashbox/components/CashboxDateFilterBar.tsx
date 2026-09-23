import React from 'react';
import { 
  Search, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  RefreshCw, 
  ArrowRight 
} from 'lucide-react';

export interface SearchResultItem {
  date: string;
  category: string;
  description: string;
  bankOrType?: string;
  amount: string | number;
}

export const shiftDate = (dateStr: string, days: number): string => {
  if (!dateStr) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export const getTodayStr = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const getYesterdayStr = (): string => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const formatDateTr = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}.${m}.${y}`;
  }
  return String(dateStr);
};

const formatMoney = (val: number): string => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

const parseNum = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/\./g, '').replace(/,/g, '.').trim();
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};

interface CashboxDateFilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isRange: boolean;
  setIsRange: (isRange: boolean) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  placeholder?: string;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onToday?: () => void;
  // Live search results
  searchResults?: SearchResultItem[];
  isSearching?: boolean;
  onSelectResult?: (date: string) => void;
  extraActions?: React.ReactNode;
  moduleTitle?: string;
}

export function CashboxDateFilterBar({
  searchQuery,
  setSearchQuery,
  selectedDate,
  setSelectedDate,
  isRange,
  setIsRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  placeholder = 'Açıklama, cari veya banka ara... (örn: tarım, akbank, celo)',
  onPrevDay,
  onNextDay,
  onToday,
  searchResults,
  isSearching = false,
  onSelectResult,
  extraActions,
  moduleTitle
}: CashboxDateFilterBarProps) {
  const handlePrev = () => {
    if (onPrevDay) {
      onPrevDay();
    } else {
      setSelectedDate(shiftDate(selectedDate, -1));
      setIsRange(false);
    }
  };

  const handleNext = () => {
    if (onNextDay) {
      onNextDay();
    } else {
      setSelectedDate(shiftDate(selectedDate, 1));
      setIsRange(false);
    }
  };

  const handleCurrentDay = () => {
    if (onToday) {
      onToday();
    } else {
      setSelectedDate(getTodayStr());
      setIsRange(false);
    }
  };

  const showSearchResults = searchResults !== undefined && searchQuery.trim().length >= 2;

  return (
    <div className="space-y-3 no-print">
      {/* Üst Arama & Tarih Navigasyon Çubuğu */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Arama Input */}
          <div className="relative flex-1 min-w-[280px] max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Aramayı Temizle"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Hızlı Tarih Seçici / Navigasyon (< 📅 05.09.2026 > Bugün) */}
          <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg p-0.5 shadow-xs">
            <button
              type="button"
              onClick={handlePrev}
              title="Önceki Gün"
              className="p-1.5 text-gray-600 hover:text-black hover:bg-white rounded transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-gray-800 shadow-2xs">
              <Calendar size={14} className="text-blue-600 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setIsRange(false);
                }}
                className="bg-transparent border-0 font-bold text-gray-900 focus:outline-none cursor-pointer text-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleNext}
              title="Sonraki Gün"
              className="p-1.5 text-gray-600 hover:text-black hover:bg-white rounded transition-colors"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleCurrentDay}
              className="ml-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
            >
              Bugün
            </button>
          </div>

          {/* Tarih Aralığı Filtresi (ARALIK: [Date] - [Date]) */}
          <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600">
            <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold uppercase tracking-wider text-[11px]">
              <input
                type="checkbox"
                checked={isRange}
                onChange={(e) => setIsRange(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              ARALIK:
            </label>
            <div className={`flex items-center gap-1 transition-opacity duration-200 ${isRange ? 'opacity-100' : 'opacity-40'}`}>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setIsRange(true);
                }}
                className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-800"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setIsRange(true);
                }}
                className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-bold text-gray-800"
              />
            </div>
          </div>

          {extraActions && (
            <div className="flex items-center gap-2">
              {extraActions}
            </div>
          )}
        </div>
      </div>

      {/* Arama Sonuçları Paneli (Arama Yapıldığında Açılır) */}
      {showSearchResults && (
        <div className="bg-white border-2 border-brand-500/80 rounded-xl shadow-md p-4 space-y-3 no-print transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                <Search size={16} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {moduleTitle && (
                    <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                      {moduleTitle}
                    </span>
                  )}
                  <h3 className="text-sm font-black text-gray-900">
                    Arama Sonuçları:
                  </h3>
                  <span className="text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full text-xs font-bold">
                    "{searchQuery}"
                  </span>
                  {isSearching && (
                    <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-bold animate-pulse">
                      <RefreshCw size={12} className="animate-spin" /> Arıyor...
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  <span className="font-semibold text-emerald-700">Yalnızca {moduleTitle || 'bu modüle'} ait kayıtlar taranmaktadır.</span>{' '}
                  {isRange ? `${formatDateTr(startDate)} ile ${formatDateTr(endDate)} tarihleri arasında` : 'Tüm tarihlerde'}{' '}
                  toplam <span className="font-bold text-gray-900">{searchResults.length}</span> eşleşen hareket bulundu.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-gray-400">Bulunan Toplam Tutar</div>
                <div className="text-sm font-black font-mono text-emerald-600">
                  {formatMoney(
                    searchResults.reduce((sum, item) => sum + parseNum(item.amount), 0)
                  )} ₺
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                title="Aramayı Kapat"
              >
                <X size={14} />
                <span>Kapat</span>
              </button>
            </div>
          </div>

          {/* Sonuç Tablosu */}
          {searchResults.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-xs font-semibold">
              {isSearching ? 'Kayıtlar aranıyor...' : `"${searchQuery}" ile eşleşen herhangi bir hareket bulunamadı.`}
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-[11px] font-black uppercase text-gray-600 sticky top-0 border-b border-gray-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Tarih</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Açıklama / Cari</th>
                    <th className="py-2.5 px-3">Banka / Tür</th>
                    <th className="py-2.5 px-3 text-right">Tutar</th>
                    <th className="py-2.5 px-3 text-center w-24">Git</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {searchResults.map((item, idx) => {
                    const badgeColor = 
                      item.category.includes('GİRİŞ') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      item.category.includes('ÇIKIŞ') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      item.category.includes('POS') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      item.category.includes('CARİ') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      'bg-blue-50 text-blue-700 border-blue-200';

                    return (
                      <tr 
                        key={idx} 
                        className="hover:bg-amber-50/60 transition-colors cursor-pointer group"
                        onClick={() => {
                          if (onSelectResult) {
                            onSelectResult(item.date);
                          } else {
                            setSelectedDate(item.date);
                            setIsRange(false);
                          }
                        }}
                      >
                        <td className="py-2.5 px-3 font-bold text-gray-900 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Calendar size={13} className="text-gray-400 group-hover:text-brand-600" />
                            {formatDateTr(item.date)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${badgeColor}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-black text-gray-900 uppercase">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 font-bold uppercase">
                          {item.bankOrType || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                          {formatMoney(parseNum(item.amount))} ₺
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 group-hover:text-brand-700 bg-brand-50 group-hover:bg-brand-100 px-2 py-0.5 rounded">
                            Git <ArrowRight size={11} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
