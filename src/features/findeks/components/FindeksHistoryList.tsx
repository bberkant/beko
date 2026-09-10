import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Building2, 
  ChevronRight, 
  Clock
} from 'lucide-react';
import { FindeksCheckInquiry } from '../types';

interface FindeksHistoryListProps {
  inquiries: FindeksCheckInquiry[];
  onSelectInquiry: (inquiry: FindeksCheckInquiry) => void;
  selectedId?: string;
}

export const FindeksHistoryList: React.FC<FindeksHistoryListProps> = ({
  inquiries,
  onSelectInquiry,
  selectedId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');

  const filteredInquiries = useMemo(() => {
    return inquiries.filter(item => {
      const matchesSearch = 
        item.drawer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.check_number.includes(searchQuery) ||
        item.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.drawer_tckn_vkn && item.drawer_tckn_vkn.includes(searchQuery));

      if (!matchesSearch) return false;

      if (selectedRisk === 'all') return true;
      if (selectedRisk === 'safe') return item.findeks_score >= 750;
      if (selectedRisk === 'medium') return item.findeks_score >= 500 && item.findeks_score < 750;
      if (selectedRisk === 'high') return item.findeks_score < 500 || item.is_banned;

      return true;
    });
  }, [inquiries, searchQuery, selectedRisk]);

  const getScoreBadge = (score: number, isBanned: boolean) => {
    if (isBanned) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-600 text-white shadow-2xs">
          YASAKLI
        </span>
      );
    }
    if (score >= 900) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
          {score} Puan &bull; Çok Güvenli
        </span>
      );
    }
    if (score >= 750) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
          {score} Puan &bull; Güvenli
        </span>
      );
    }
    if (score >= 500) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
          {score} Puan &bull; Orta Risk
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
        {score} Puan &bull; Yüksek Risk
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-gray-200 space-y-3 bg-gray-50/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-900">Önceki Çek Sorgu Geçmişi</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Toplam <strong>{inquiries.length}</strong> Sorgu
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Keşideci, çek no, banka veya VKN ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Quick Risk Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[11px] font-medium">
            <button
              onClick={() => setSelectedRisk('all')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
                selectedRisk === 'all'
                  ? 'bg-gray-900 text-white font-bold'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setSelectedRisk('safe')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
                selectedRisk === 'safe'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              Güvenli (750+)
            </button>
            <button
              onClick={() => setSelectedRisk('medium')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
                selectedRisk === 'medium'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              Orta Risk
            </button>
            <button
              onClick={() => setSelectedRisk('high')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${
                selectedRisk === 'high'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              Yüksek Risk / Yasak
            </button>
          </div>
        </div>
      </div>

      {/* Inquiry List Cards */}
      <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
        {filteredInquiries.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-xs">
            {searchQuery ? 'Aramanıza uygun çek sorgusu bulunamadı.' : 'Henüz yapılmış bir çek sorgusu yok.'}
          </div>
        ) : (
          filteredInquiries.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onSelectInquiry(item)}
                className={`p-4 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-emerald-50/50 active:bg-emerald-100/50 ${
                  isSelected ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600' : 'bg-white'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Building2 size={14} className="text-gray-500 shrink-0" />
                      {item.drawer_name}
                    </span>
                    {item.drawer_tckn_vkn && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        VKN: {item.drawer_tckn_vkn}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2">
                    <span className="font-semibold text-gray-700">{item.bank_name}</span>
                    <span>&bull;</span>
                    <span>Çek No: <strong className="text-gray-900">{item.check_number}</strong></span>
                    <span>&bull;</span>
                    <span>Ödenen: <strong className="text-emerald-700">{item.total_paid_count} Adet</strong></span>
                    {item.bounced_unpaid_count > 0 && (
                      <>
                        <span>&bull;</span>
                        <span className="text-rose-600 font-bold">{item.bounced_unpaid_count} Karşılıksız!</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                    <div>{getScoreBadge(item.findeks_score, item.is_banned)}</div>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {new Date(item.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <ChevronRight size={18} className="text-gray-300 hidden sm:block" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
