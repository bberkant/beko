import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { supabase } from '../../lib/supabase';
import { useAuth, ensureSupabaseBackendSession } from '../../lib/auth';
import { Coins, Search, RefreshCw, FileText, Calendar, Landmark } from 'lucide-react';
import { fixCorruptedTurkishText } from '../../lib/turkishTextFixer';

export interface CustomerCheck {
  id: string;
  local_id?: number;
  check_no: string | null;
  issue_date: string | null;
  due_date: string | null;
  amount: number;
  debtor: string | null;
  creditor: string | null;
  kesideci?: string | null;
  keside_yeri?: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  tahsildar_banka?: string | null;
  ciro_edilen?: string | null;
  status: string | null;
  para_birimi?: string | null;
  ozel_alan?: string | null;
  document_type?: 'cek' | 'senet';
}

export function CustomerChecksPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
  const [checks, setChecks] = useState<CustomerCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomerChecks = async () => {
    setLoading(true);
    try {
      await ensureSupabaseBackendSession();
      let allRows: CustomerCheck[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('ebs_checks')
          .select('*')
          .eq('organization_id', orgId)
          .eq('check_type', 'alinan')
          .order('due_date', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allRows = allRows.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      setChecks(allRows);
    } catch (err) {
      console.error('Müşteri çekleri yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomerChecks();
  }, [orgId]);

  const filteredChecks = useMemo(() => {
    const q = searchTerm.trim().toLocaleLowerCase('tr-TR');
    if (!q) return checks;
    return checks.filter(c => {
      const no = (c.check_no || '').toLocaleLowerCase('tr-TR');
      const cred = fixCorruptedTurkishText(c.creditor || '').toLocaleLowerCase('tr-TR');
      const kes = fixCorruptedTurkishText(c.kesideci || '').toLocaleLowerCase('tr-TR');
      const bank = fixCorruptedTurkishText(c.bank_name || '').toLocaleLowerCase('tr-TR');
      const debt = fixCorruptedTurkishText(c.debtor || '').toLocaleLowerCase('tr-TR');
      const note = fixCorruptedTurkishText(c.ozel_alan || '').toLocaleLowerCase('tr-TR');
      return no.includes(q) || cred.includes(q) || kes.includes(q) || bank.includes(q) || debt.includes(q) || note.includes(q);
    });
  }, [checks, searchTerm]);

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0) + ' ₺';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = dateStr.substring(0, 10).split('-');
    if (d.length === 3) return `${d[2]}.${d[1]}.${d[0]}`;
    return dateStr;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Müşteri Çekleri Listesi"
        description="Müşterilerden alınan çek ve senetlerin listesi ve takibi"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCustomerChecks}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Verileri Güncelle
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Coins size={18} className="text-brand-600" />
            <span>Müşteri Çekleri ({filteredChecks.length} Kayıt)</span>
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Çek no, keşideci, ciro eden, banka ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase">
                <th className="py-2.5 px-3">Vade Tarihi</th>
                <th className="py-2.5 px-3">Çek No</th>
                <th className="py-2.5 px-3">Keşideci</th>
                <th className="py-2.5 px-3">Ciro Eden (Müşteri)</th>
                <th className="py-2.5 px-3">Banka</th>
                <th className="py-2.5 px-3">Asıl Alacaklı / Not</th>
                <th className="py-2.5 px-3">Durum</th>
                <th className="py-2.5 px-3 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    Müşteri çekleri yükleniyor...
                  </td>
                </tr>
              ) : filteredChecks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredChecks.slice(0, 200).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2 px-3 font-semibold text-gray-800 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
                        {formatDate(c.due_date)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-gray-700">{c.check_no || '-'}</td>
                    <td className="py-2 px-3 font-medium text-gray-800">{fixCorruptedTurkishText(c.kesideci || '-')}</td>
                    <td className="py-2 px-3 font-semibold text-gray-900">{fixCorruptedTurkishText(c.creditor || '-')}</td>
                    <td className="py-2 px-3 text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Landmark size={12} className="text-gray-400" />
                        {fixCorruptedTurkishText(c.bank_name || '-')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">{fixCorruptedTurkishText(c.debtor || c.ozel_alan || '-')}</td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        <FileText size={11} />
                        {fixCorruptedTurkishText(c.status || 'Portföyde')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                      {formatMoney(Number(c.amount || 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
