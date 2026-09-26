import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  RefreshCw, 
  Eye, 
  FileText, 
  AlertCircle,
  PlusCircle,
  ArrowRight,
  MinusCircle
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

interface ActivityLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  user_email: string | null;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  created_at: string;
}

const tableLabels: Record<string, string> = {
  ebs_checks: 'Çek / Senet',
  vehicles: 'Araç Yönetimi',
  tenders: 'İhale Takip',
  kesim_listesi: 'Kesim Listesi',
  real_estates: 'Gayrimenkul Listesi'
};

const actionLabels: Record<string, { label: string; cls: string; icon: any }> = {
  INSERT: { label: 'Yeni Kayıt (Ekleme)', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: PlusCircle },
  UPDATE: { label: 'Güncelleme', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: AlertCircle },
  DELETE: { label: 'Kayıt Silme', cls: 'bg-red-50 text-red-700 border-red-200', icon: MinusCircle }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export function ActivityLogsPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state
  const [userQuery, setUserQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected log for detail modal
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Security check: Only allow admin/developer role or admin@dars.local/admin@ets360.local email
  const hasAccess = useMemo(() => {
    return user?.email === 'admin@dars.local' || user?.email === 'admin@ets360.local' || user?.email === 'admin' || ['Admin', 'Süper Admin', 'Developer', 'Yönetici', 'Süper Yönetici'].includes(user?.role || '');
  }, [user]);

  const fetchLogs = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      notify('Aktivite logları yüklenirken bir hata oluştu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, notify]);

  useEffect(() => {
    if (hasAccess) {
      void fetchLogs();
    }
  }, [fetchLogs, hasAccess]);

  // Security redirect
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // Filtered Logs list
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // User email query
      if (userQuery && !(log.user_email || '').toLowerCase().includes(userQuery.toLowerCase())) {
        return false;
      }
      // Table Filter
      if (tableFilter !== 'all' && log.table_name !== tableFilter) {
        return false;
      }
      // Action Type Filter
      if (actionFilter !== 'all' && log.action_type !== actionFilter) {
        return false;
      }
      // Date filters
      if (startDate) {
        const logDate = log.created_at.slice(0, 10);
        if (logDate < startDate) return false;
      }
      if (endDate) {
        const logDate = log.created_at.slice(0, 10);
        if (logDate > endDate) return false;
      }
      return true;
    });
  }, [logs, userQuery, tableFilter, actionFilter, startDate, endDate]);

  const handleOpenDetail = (log: ActivityLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  // Compare old & new values for update operations
  const changesList = useMemo(() => {
    if (!selectedLog || selectedLog.action_type !== 'UPDATE') return [];
    const oldData = selectedLog.old_data || {};
    const newData = selectedLog.new_data || {};
    const changes: { field: string; oldVal: any; newVal: any }[] = [];

    const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
    for (const key of allKeys) {
      // Skip internal fields
      if (['id', 'organization_id', 'created_at', 'updated_at'].includes(key)) continue;

      const oldVal = oldData[key];
      const newVal = newData[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: key,
          oldVal: oldVal === null || oldVal === undefined ? '—' : String(oldVal),
          newVal: newVal === null || newVal === undefined ? '—' : String(newVal)
        });
      }
    }
    return changes;
  }, [selectedLog]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aktivite Günlüğü"
        description="Sistemdeki tüm kayıt ekleme, silme ve güncelleme hareketlerini geriye dönük inceleyin."
      />

      {/* Main Filter Panel */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {/* User Email search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="İşlemi yapan kullanıcı e-postası ile ara..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Table Name Filter */}
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
            >
              <option value="all">Tüm Modüller</option>
              {Object.entries(tableLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {/* Action Type Filter */}
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">Tüm İşlemler</option>
              <option value="INSERT">Sadece Ekleme</option>
              <option value="UPDATE">Sadece Güncelleme</option>
              <option value="DELETE">Sadece Silme</option>
            </select>

            {/* Date range picker */}
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5">
              <Calendar size={15} className="text-gray-400" />
              <input
                type="date"
                className="border-0 bg-transparent p-0 text-sm font-medium text-gray-700 focus:outline-none focus:ring-0 max-w-[120px]"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-xs text-gray-400">—</span>
              <input
                type="date"
                className="border-0 bg-transparent p-0 text-sm font-medium text-gray-700 focus:outline-none focus:ring-0 max-w-[120px]"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="rounded-full p-0.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>

            <button
              onClick={fetchLogs}
              className="rounded-lg p-2 text-gray-400 border border-gray-300 hover:text-gray-700 hover:bg-gray-50 focus:outline-none"
              title="Yenile"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-xl border border-gray-150 bg-white shadow-sm">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-gray-50 text-[11.5px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-center w-[180px]">İşlem Tarihi</th>
                <th className="px-4 py-3 font-semibold text-left">Kullanıcı (E-posta)</th>
                <th className="px-4 py-3 font-semibold text-center w-[120px]">İşlem Türü</th>
                <th className="px-4 py-3 font-semibold text-left w-[160px]">İlgili Modül</th>
                <th className="px-4 py-3 font-semibold text-left">Kayıt Referans ID</th>
                <th className="px-4 py-3 font-semibold text-center w-[100px]">İncele</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-500" />
                    Aktivite günlükleri yükleniyor...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const ActionIcon = actionLabels[log.action_type]?.icon || AlertCircle;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-center font-medium text-gray-500">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3 text-left font-semibold text-gray-900">{log.user_email || 'Sistem / EBS Sync'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${actionLabels[log.action_type]?.cls}`}>
                          <ActionIcon size={12} />
                          {actionLabels[log.action_type]?.label || log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left font-medium text-gray-700">
                        {tableLabels[log.table_name] || log.table_name}
                      </td>
                      <td className="px-4 py-3 text-left text-gray-500 font-mono select-all truncate max-w-[200px]" title={log.record_id}>
                        {log.record_id}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenDetail(log)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600 focus:outline-none"
                          title="Detayları İncele"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Aktivite Detay Görünümü"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-xs border border-gray-150">
              <div>
                <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">İşlemi Yapan</span>
                <span className="text-gray-900 font-bold text-sm">{selectedLog.user_email || 'Sistem / EBS Sync'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">İşlem Tarihi</span>
                <span className="text-gray-900 font-bold text-sm">{formatDate(selectedLog.created_at)}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">Modül / Tablo</span>
                <span className="text-gray-900 font-bold text-sm">{tableLabels[selectedLog.table_name] || selectedLog.table_name}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">İşlem Türü</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold mt-0.5 ${actionLabels[selectedLog.action_type]?.cls}`}>
                  {actionLabels[selectedLog.action_type]?.label || selectedLog.action_type}
                </span>
              </div>
            </div>

            {/* Changes / Content Panel */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <FileText size={16} className="text-gray-500" />
                Değişiklik Detayları
              </h3>

              {/* Case 1: UPDATE (Show diff fields) */}
              {selectedLog.action_type === 'UPDATE' && (
                <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <div className="grid grid-cols-3 bg-gray-50 p-2 font-semibold text-gray-600 border-b border-gray-200">
                    <div>Kolon Adı</div>
                    <div>Eski Değer (Before)</div>
                    <div>Yeni Değer (After)</div>
                  </div>
                  <div className="divide-y divide-gray-100 bg-white">
                    {changesList.length === 0 ? (
                      <p className="p-4 text-center text-gray-400">Veriler arasında fark tespit edilmedi (İçsel alanlar güncellenmiş olabilir).</p>
                    ) : (
                      changesList.map((ch) => (
                        <div key={ch.field} className="grid grid-cols-3 p-2.5 items-center font-medium">
                          <div className="font-mono text-gray-800 bg-gray-50 px-1 py-0.5 rounded w-fit">{ch.field}</div>
                          <div className="text-red-700 bg-red-50/50 p-1 rounded mr-2 line-through truncate" title={ch.oldVal}>{ch.oldVal}</div>
                          <div className="text-emerald-800 bg-emerald-50/50 p-1 rounded font-bold truncate flex items-center gap-1" title={ch.newVal}>
                            <ArrowRight size={11} className="text-emerald-600" />
                            {ch.newVal}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Case 2: INSERT (Show new record values) */}
              {selectedLog.action_type === 'INSERT' && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/30 text-xs font-mono max-h-80 overflow-y-auto">
                  <span className="text-gray-400 block font-semibold font-sans mb-2 uppercase">Eklenen Kayıt Verileri:</span>
                  <table className="w-full text-left">
                    <tbody>
                      {Object.entries(selectedLog.new_data || {}).map(([key, val]) => {
                        if (['id', 'organization_id', 'created_at', 'updated_at'].includes(key)) return null;
                        return (
                          <tr key={key} className="border-b border-gray-100">
                            <td className="py-1.5 font-bold text-gray-600 w-1/3">{key}</td>
                            <td className="py-1.5 text-emerald-800 font-bold">{val === null ? 'null' : String(val)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Case 3: DELETE (Show deleted values) */}
              {selectedLog.action_type === 'DELETE' && (
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/30 text-xs font-mono max-h-80 overflow-y-auto">
                  <span className="text-gray-400 block font-semibold font-sans mb-2 uppercase">Silinen Kayıt Verileri:</span>
                  <table className="w-full text-left">
                    <tbody>
                      {Object.entries(selectedLog.old_data || {}).map(([key, val]) => {
                        if (['id', 'organization_id', 'created_at', 'updated_at'].includes(key)) return null;
                        return (
                          <tr key={key} className="border-b border-gray-100">
                            <td className="py-1.5 font-bold text-gray-600 w-1/3">{key}</td>
                            <td className="py-1.5 text-red-700 line-through">{val === null ? 'null' : String(val)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
