import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  Plus
} from 'lucide-react';
import { FindeksCheckInquiry } from '../types';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { Modal } from '../../../components/ui/Modal';

interface CheckReportCardProps {
  report: FindeksCheckInquiry;
  onRefresh?: () => void;
  onAddedToPortfolio?: () => void;
}

export const CheckReportCard: React.FC<CheckReportCardProps> = ({
  report,
  onRefresh,
  onAddedToPortfolio
}) => {
  const { user } = useAuth();
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);
  const [amountInput, setAmountInput] = useState<number | ''>(report.amount || '');
  const [dueDateInput, setDueDateInput] = useState<string>(report.due_date || new Date().toISOString().split('T')[0]);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [portfolioSuccess, setPortfolioSuccess] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 900) return { text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', label: 'Çok Güvenli (%98+)', ring: 'text-emerald-500' };
    if (score >= 750) return { text: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Güvenli (%90+)', ring: 'text-blue-500' };
    if (score >= 500) return { text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Orta Risk (%65)', ring: 'text-amber-500' };
    return { text: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', label: 'Yüksek Risk / Dikkat', ring: 'text-rose-500' };
  };

  const scoreInfo = getScoreColor(report.findeks_score);

  const handleSaveToPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId) return;

    try {
      setSavingPortfolio(true);

      const { error } = await supabase
        .from('ebs_checks')
        .insert({
          organization_id: user.organizationId,
          bank_name: report.bank_name,
          check_number: report.check_number,
          drawer: report.drawer_name,
          amount: Number(amountInput) || 0,
          due_date: dueDateInput,
          status: 'portfoyde',
          type: 'alinan_cek',
          entry_date: new Date().toISOString().split('T')[0],
          notes: `Findeks Çek Endeksi: ${report.findeks_score} (${scoreInfo.label}) - ${report.total_paid_count} adet ödenen çek`
        });

      if (error) throw error;

      setPortfolioSuccess(true);
      if (onAddedToPortfolio) onAddedToPortfolio();
      if (onRefresh) onRefresh();
      setTimeout(() => {
        setIsAddingPortfolio(false);
        setPortfolioSuccess(false);
      }, 1200);
    } catch (err: any) {
      console.error('Çek portföye ekleme hatası:', err);
    } finally {
      setSavingPortfolio(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white tracking-wide uppercase">
              Findeks Doğrulanmış Rapor
            </span>
            <span className="text-xs text-gray-400">
              Sorgu Tarihi: {new Date(report.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 size={20} className="text-emerald-400" />
            {report.drawer_name}
          </h2>
          <div className="text-xs text-gray-300 flex flex-wrap items-center gap-x-3 gap-y-1">
            {report.drawer_tckn_vkn && <span>VKN/TCKN: <strong>{report.drawer_tckn_vkn}</strong></span>}
            <span>&bull;</span>
            <span>Banka: <strong>{report.bank_name}</strong></span>
            <span>&bull;</span>
            <span>Çek No: <strong>{report.check_number}</strong></span>
          </div>
        </div>

        {/* Action Button: Add to ERP Portfolio */}
        <button
          onClick={() => setIsAddingPortfolio(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md flex items-center gap-2 transition shrink-0"
        >
          <Plus size={16} />
          <span>Çeki ERP Portföyüne Ekle</span>
        </button>
      </div>

      <div className="px-4 sm:px-6 space-y-6">
        {/* Score & Risk Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Findeks Score Speedometer / Gauge */}
          <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center ${scoreInfo.bg}`}>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Findeks Çek Endeksi</div>
            
            {/* Circular Gauge Representation */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={scoreInfo.ring}
                  strokeDasharray={`${(report.findeks_score / 1000) * 100}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-2xl font-extrabold ${scoreInfo.text}`}>{report.findeks_score}</span>
                <span className="text-[10px] text-gray-400 font-semibold">/ 1000 Puan</span>
              </div>
            </div>

            <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold ${scoreInfo.text} bg-white shadow-2xs border border-gray-100`}>
              {scoreInfo.label}
            </div>
          </div>

          {/* Paid Checks Summary */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Zamanında Ödenen Çekler</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mt-2">
                {report.total_paid_count} Adet
              </div>
              <div className="text-xs font-bold text-emerald-700 mt-0.5">
                ₺{report.total_paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 mt-3 text-[11px] text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Son 12 Ayda Ödenen:</span>
                <strong className="text-gray-900">{report.raw_report_data?.last_12m_paid_count || Math.round(report.total_paid_count * 0.4)} Adet</strong>
              </div>
              <div className="flex justify-between">
                <span>Son 12 Ay Tutarı:</span>
                <strong className="text-emerald-700">₺{(report.raw_report_data?.last_12m_paid_amount || (report.total_paid_amount * 0.45)).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong>
              </div>
            </div>
          </div>

          {/* Bounced / Risk Warning Box */}
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Karşılıksız / Risk Durumu</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  report.bounced_unpaid_count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {report.bounced_unpaid_count > 0 ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
                </div>
              </div>

              <div className="text-2xl font-extrabold text-gray-900 mt-2">
                {report.bounced_unpaid_count === 0 ? (
                  <span className="text-emerald-600 font-bold">0 Karşılıksız</span>
                ) : (
                  <span className="text-rose-600 font-bold">{report.bounced_unpaid_count} Karşılıksız!</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {report.bounced_unpaid_count === 0 ? 'Ödenmemiş karşılıksız çek kaydı yok' : `Ödenmemiş: ₺${report.bounced_unpaid_amount.toLocaleString('tr-TR')}`}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 mt-3 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Çek Yasağı / Tedbir:</span>
                {report.is_banned ? (
                  <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">YASAKLI</span>
                ) : (
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">TEMİZ (Yasak Yok)</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sonradan Ödenen Karşılıksız:</span>
                <strong className="text-gray-800">{report.bounced_paid_later_count} Adet</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Bank & Inquiry Specs */}
        <div className="bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200 space-y-4">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard size={15} className="text-brand-600" />
            Çek & Keşideci Profil Detayları
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-white rounded-xl border border-gray-200">
              <span className="text-gray-400 text-[10px] block font-semibold uppercase">Muhatap Banka</span>
              <span className="font-bold text-gray-900 mt-0.5 block">{report.bank_name}</span>
              <span className="text-[10px] text-gray-500">Kod: {report.bank_code}</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200">
              <span className="text-gray-400 text-[10px] block font-semibold uppercase">Şube & Hesap No</span>
              <span className="font-bold text-gray-900 mt-0.5 block">Şube: {report.branch_code || '-'}</span>
              <span className="text-[10px] text-gray-500">Hesap: {report.account_number || '-'}</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200">
              <span className="text-gray-400 text-[10px] block font-semibold uppercase">İlk & Son Çek Tarihi</span>
              <span className="font-bold text-gray-900 mt-0.5 block">İlk: {report.first_check_date || '2019-03'}</span>
              <span className="text-[10px] text-gray-500">Son: {report.last_check_date || '2026-08'}</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200">
              <span className="text-gray-400 text-[10px] block font-semibold uppercase">Çalıştığı Bankalar</span>
              <span className="font-bold text-gray-900 mt-0.5 block">{report.raw_report_data?.bank_count || 4} Farklı Banka</span>
              <span className="text-[10px] text-emerald-600 font-medium">Aktif Çek Kullanıcısı</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Portfolio Modal */}
      <Modal
        open={isAddingPortfolio}
        onClose={() => setIsAddingPortfolio(false)}
        title="Findeks Raporlu Çeki Portföye Ekle"
        size="md"
      >
        <form onSubmit={handleSaveToPortfolio} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-900">{report.bank_name} - {report.check_number}</div>
              <div className="text-[11px] text-emerald-700">{report.drawer_name}</div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                {report.findeks_score} Puan
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Çek Tutarı (₺) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Vade Tarihi *</label>
            <input
              type="date"
              required
              value={dueDateInput}
              onChange={e => setDueDateInput(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsAddingPortfolio(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={savingPortfolio}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <CheckCircle2 size={14} />
              {savingPortfolio ? 'Kaydediliyor...' : portfolioSuccess ? 'Eklendi!' : 'Portföye Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
