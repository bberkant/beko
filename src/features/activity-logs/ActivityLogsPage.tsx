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
  MinusCircle,
  ShieldCheck,
  Globe,
  Laptop,
  CheckCircle2,
  XCircle,
  History,
  Copy,
  Check,
  Smartphone
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth, isStrictAdminOrBerkant } from '../../lib/auth';
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

export interface UserLoginLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  user_email: string;
  user_name: string | null;
  ip_address: string | null;
  device_info: string | null;
  user_agent: string | null;
  status: 'success' | 'failed' | string;
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
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const CREATE_TABLE_SQL = `-- Create user_login_logs table for tracking user logins, IP addresses, and device info
CREATE TABLE IF NOT EXISTS public.user_login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    user_id UUID,
    user_email TEXT NOT NULL,
    user_name TEXT,
    ip_address TEXT,
    device_info TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'success', -- 'success' | 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_login_logs_org_created 
ON public.user_login_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_login_logs_created 
ON public.user_login_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_login_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view and insert login logs
DROP POLICY IF EXISTS "login_logs_auth_access" ON public.user_login_logs;
CREATE POLICY "login_logs_auth_access" ON public.user_login_logs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow anon to insert failed login attempts
DROP POLICY IF EXISTS "login_logs_anon_insert" ON public.user_login_logs;
CREATE POLICY "login_logs_anon_insert" ON public.user_login_logs
    FOR INSERT
    TO anon
    WITH CHECK (true);`;

export function ActivityLogsPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [activeTab, setActiveTab] = useState<'login_logs' | 'audit_logs'>('login_logs');

  // --- Login Logs State ---
  const [loginLogs, setLoginLogs] = useState<UserLoginLog[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginTableMissing, setLoginTableMissing] = useState(false);
  const [loginSearchQuery, setLoginSearchQuery] = useState('');
  const [loginIpQuery, setLoginIpQuery] = useState('');
  const [loginStatusFilter, setLoginStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [loginStartDate, setLoginStartDate] = useState('');
  const [loginEndDate, setLoginEndDate] = useState('');
  const [selectedLoginLog, setSelectedLoginLog] = useState<UserLoginLog | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // --- Audit Logs State ---
  const [auditLogs, setAuditLogs] = useState<ActivityLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditUserQuery, setAuditUserQuery] = useState('');
  const [auditTableFilter, setAuditTableFilter] = useState('all');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<ActivityLog | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Security check: Only allow Admin and Berkant users
  const hasAccess = useMemo(() => {
    return isStrictAdminOrBerkant(user);
  }, [user]);

  // Fetch Login Logs
  const fetchLoginLogs = useCallback(async () => {
    setLoginLoading(true);
    setLoginTableMissing(false);
    try {
      let query = supabase
        .from('user_login_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (user?.organizationId) {
        query = query.or(`organization_id.eq.${user.organizationId},organization_id.is.null`);
      }

      const { data, error } = await query;
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('user_login_logs') || error.message?.includes('schema cache')) {
          setLoginTableMissing(true);
          return;
        }
        throw error;
      }
      setLoginLogs(data || []);
    } catch (error: any) {
      console.warn('Giriş logları yükleme hatası:', error);
      notify('Giriş logları yüklenirken hata oluştu: ' + error.message, 'error');
    } finally {
      setLoginLoading(false);
    }
  }, [user?.organizationId, notify]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    if (!user?.organizationId) return;
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error: any) {
      notify('Aktivite logları yüklenirken bir hata oluştu: ' + error.message, 'error');
    } finally {
      setAuditLoading(false);
    }
  }, [user?.organizationId, notify]);

  useEffect(() => {
    if (hasAccess) {
      void fetchLoginLogs();
      void fetchAuditLogs();
    }
  }, [fetchLoginLogs, fetchAuditLogs, hasAccess]);

  // Copy SQL Handler
  const handleCopySql = () => {
    navigator.clipboard.writeText(CREATE_TABLE_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
    notify('SQL betiği panoya kopyalandı. Supabase SQL Editor alanına yapıştırıp çalıştırabilirsiniz.', 'success');
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Filtered Login Logs
  const filteredLoginLogs = useMemo(() => {
    return loginLogs.filter((log) => {
      if (loginSearchQuery) {
        const q = loginSearchQuery.toLowerCase();
        const emailMatch = (log.user_email || '').toLowerCase().includes(q);
        const nameMatch = (log.user_name || '').toLowerCase().includes(q);
        if (!emailMatch && !nameMatch) return false;
      }
      if (loginIpQuery) {
        const ipMatch = (log.ip_address || '').toLowerCase().includes(loginIpQuery.toLowerCase());
        if (!ipMatch) return false;
      }
      if (loginStatusFilter !== 'all' && log.status !== loginStatusFilter) {
        return false;
      }
      if (loginStartDate) {
        const logDate = log.created_at.slice(0, 10);
        if (logDate < loginStartDate) return false;
      }
      if (loginEndDate) {
        const logDate = log.created_at.slice(0, 10);
        if (logDate > loginEndDate) return false;
      }
      return true;
    });
  }, [loginLogs, loginSearchQuery, loginIpQuery, loginStatusFilter, loginStartDate, loginEndDate]);

  // Login Statistics
  const loginStats = useMemo(() => {
    const total = filteredLoginLogs.length;
    const uniqueIps = new Set(filteredLoginLogs.map((l) => l.ip_address).filter(Boolean)).size;
    const successCount = filteredLoginLogs.filter((l) => l.status === 'success').length;
    const failedCount = filteredLoginLogs.filter((l) => l.status === 'failed').length;
    const lastLogin = filteredLoginLogs[0];
    return { total, uniqueIps, successCount, failedCount, lastLogin };
  }, [filteredLoginLogs]);

  // Filtered Audit Logs list
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditUserQuery && !(log.user_email || '').toLowerCase().includes(auditUserQuery.toLowerCase())) {
        return false;
      }
      if (auditTableFilter !== 'all' && log.table_name !== auditTableFilter) {
        return false;
      }
      if (auditActionFilter !== 'all' && log.action_type !== auditActionFilter) {
        return false;
      }
      if (auditStartDate) {
        const logDate = log.created_at.slice(0, 10);
        if (logDate < auditStartDate) return false;
      }
      if (auditEndDate) {
        const logDate = log.created_at.slice(0, 10);
        if (logDate > auditEndDate) return false;
      }
      return true;
    });
  }, [auditLogs, auditUserQuery, auditTableFilter, auditActionFilter, auditStartDate, auditEndDate]);

  // Compare old & new values for update operations in Audit Log
  const changesList = useMemo(() => {
    if (!selectedAuditLog || selectedAuditLog.action_type !== 'UPDATE') return [];
    const oldData = selectedAuditLog.old_data || {};
    const newData = selectedAuditLog.new_data || {};
    const changes: { field: string; oldVal: any; newVal: any }[] = [];

    const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
    for (const key of allKeys) {
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
  }, [selectedAuditLog]);

  // Security redirect
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aktivite ve Oturum Günlüğü"
        description="Sistemdeki tüm oturum açma / IP kayıtlarını ve veri değişiklik hareketlerini geriye dönük inceleyin."
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('login_logs')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-colors ${
            activeTab === 'login_logs'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <ShieldCheck size={18} />
          <span>Kullanıcı Giriş & Oturum Kayıtları (IP)</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            activeTab === 'login_logs' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {loginLogs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-semibold transition-colors ${
            activeTab === 'audit_logs'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <History size={18} />
          <span>Veri Değişiklik Günlüğü (Audit Log)</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            activeTab === 'audit_logs' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: LOGIN LOGS */}
      {activeTab === 'login_logs' && (
        <div className="space-y-6">
          {/* Missing Table Banner */}
          {loginTableMissing && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600" />
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-amber-900">
                    Oturum & IP Takip Tablosu (user_login_logs) Veritabanında Bekleniyor
                  </h3>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    Sisteme hangi kullanıcının ne zaman, hangi IP adresi ve cihaz üzerinden giriş yaptığını kaydetmek için Supabase veritabanında <code className="rounded bg-amber-200/70 px-1.5 py-0.5 font-mono text-xs font-semibold">user_login_logs</code> tablosunun oluşturulması gerekmektedir.
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={handleCopySql}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-800 transition-colors"
                    >
                      {sqlCopied ? <Check size={14} /> : <Copy size={14} />}
                      {sqlCopied ? 'SQL Panoya Kopyalandı!' : 'Gerekli SQL Kodunu Kopyala'}
                    </button>
                    <button
                      onClick={fetchLoginLogs}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100/50"
                    >
                      <RefreshCw size={13} className={loginLoading ? 'animate-spin' : ''} />
                      Yeniden Kontrol Et
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Toplam Oturum Girişi</span>
                <span className="rounded-lg bg-blue-50 p-2 text-brand-600">
                  <ShieldCheck size={20} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{loginStats.total}</span>
                <span className="text-xs text-gray-400">kayıt</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Farklı IP Adresi</span>
                <span className="rounded-lg bg-purple-50 p-2 text-purple-600">
                  <Globe size={20} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-900">{loginStats.uniqueIps}</span>
                <span className="text-xs text-gray-400">benzersiz IP</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Başarılı Giriş</span>
                <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <CheckCircle2 size={20} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700">{loginStats.successCount}</span>
                <span className="text-xs text-emerald-600 font-medium">doğrulandı</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Başarısız / Hatalı</span>
                <span className="rounded-lg bg-rose-50 p-2 text-rose-600">
                  <XCircle size={20} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-700">{loginStats.failedCount}</span>
                <span className="text-xs text-gray-400">deneme</span>
              </div>
            </div>
          </div>

          {/* Login Filter Panel */}
          <div className="flex flex-col gap-4 rounded-xl border border-gray-150 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
              {/* User search */}
              <div className="relative md:col-span-4">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Kullanıcı e-posta veya adı ile ara..."
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={loginSearchQuery}
                  onChange={(e) => setLoginSearchQuery(e.target.value)}
                />
              </div>

              {/* IP search */}
              <div className="relative md:col-span-3">
                <Globe className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="IP adresi ile ara (örn: 88.236...)"
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={loginIpQuery}
                  onChange={(e) => setLoginIpQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div className="md:col-span-2">
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
                  value={loginStatusFilter}
                  onChange={(e) => setLoginStatusFilter(e.target.value as any)}
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="success">Sadece Başarılı</option>
                  <option value="failed">Sadece Başarısız</option>
                </select>
              </div>

              {/* Date range picker */}
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 md:col-span-2">
                <Calendar size={15} className="text-gray-400" />
                <input
                  type="date"
                  className="border-0 bg-transparent p-0 text-xs font-medium text-gray-700 focus:outline-none focus:ring-0 max-w-[100px]"
                  value={loginStartDate}
                  onChange={(e) => setLoginStartDate(e.target.value)}
                />
                <span className="text-xs text-gray-400">—</span>
                <input
                  type="date"
                  className="border-0 bg-transparent p-0 text-xs font-medium text-gray-700 focus:outline-none focus:ring-0 max-w-[100px]"
                  value={loginEndDate}
                  onChange={(e) => setLoginEndDate(e.target.value)}
                />
                {(loginStartDate || loginEndDate) && (
                  <button
                    onClick={() => {
                      setLoginStartDate('');
                      setLoginEndDate('');
                    }}
                    className="rounded-full p-0.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Refresh button */}
              <div className="md:col-span-1 flex justify-end">
                <button
                  onClick={fetchLoginLogs}
                  className="rounded-lg p-2 text-gray-400 border border-gray-300 hover:text-gray-700 hover:bg-gray-50 focus:outline-none"
                  title="Yenile"
                >
                  <RefreshCw size={15} className={loginLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>

          {/* Login Table */}
          <div className="overflow-hidden rounded-xl border border-gray-150 bg-white shadow-sm">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-gray-50 text-[11.5px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-center w-[180px]">Giriş Tarihi & Saati</th>
                    <th className="px-4 py-3 font-semibold text-left">Kullanıcı (İsim / E-posta)</th>
                    <th className="px-4 py-3 font-semibold text-left w-[170px]">IP Adresi</th>
                    <th className="px-4 py-3 font-semibold text-left w-[200px]">Cihaz & İşletim Sistemi</th>
                    <th className="px-4 py-3 font-semibold text-left w-[160px]">Tarayıcı</th>
                    <th className="px-4 py-3 font-semibold text-center w-[110px]">Durum</th>
                    <th className="px-4 py-3 font-semibold text-center w-[80px]">İncele</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loginLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-500" />
                        Giriş kayıtları yükleniyor...
                      </td>
                    </tr>
                  ) : filteredLoginLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                        {loginTableMissing ? (
                          <div className="space-y-2">
                            <AlertCircle size={28} className="mx-auto text-amber-500" />
                            <p className="font-semibold text-gray-700">Veritabanında `user_login_logs` tablosu henüz yok.</p>
                            <p className="text-xs text-gray-500">Yukarıdaki SQL kodunu Supabase üzerinde çalıştırıp tabloyu aktifleştirebilirsiniz.</p>
                          </div>
                        ) : (
                          'Filtrelere uygun kullanıcı giriş kaydı bulunamadı.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredLoginLogs.map((log) => {
                      const isSuccess = log.status === 'success';
                      const isMobile = (log.device_info || '').toLowerCase().includes('phone') || (log.device_info || '').toLowerCase().includes('android') || (log.device_info || '').toLowerCase().includes('ios');
                      const DeviceIcon = isMobile ? Smartphone : Laptop;

                      // Split device info if contains bullet
                      const parts = (log.device_info || '').split('•').map((s) => s.trim());
                      const osName = parts[0] || 'Bilinmiyor';
                      const browserName = parts[1] || 'Bilinmiyor';

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 text-center font-medium text-gray-600 whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-4 py-3 text-left">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                                {(log.user_name || log.user_email || 'K').charAt(0).toUpperCase()}
                              </div>
                              <div className="leading-tight">
                                <div className="font-semibold text-gray-900">
                                  {log.user_name || log.user_email.split('@')[0]}
                                </div>
                                <div className="text-[11px] text-gray-400">
                                  {log.user_email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-left">
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 font-mono text-[11px] text-gray-800">
                              <Globe size={11} className="text-gray-500" />
                              <span>{log.ip_address || '—'}</span>
                              {log.ip_address && (
                                <button
                                  onClick={() => handleCopyIp(log.ip_address!)}
                                  className="ml-1 text-gray-400 hover:text-gray-700"
                                  title="IP Kopyala"
                                >
                                  {copiedIp === log.ip_address ? (
                                    <Check size={11} className="text-emerald-600" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-left font-medium text-gray-700">
                            <div className="flex items-center gap-1.5">
                              <DeviceIcon size={14} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate max-w-[170px]" title={osName}>{osName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-left font-medium text-gray-600 truncate max-w-[150px]" title={browserName}>
                            {browserName}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                                <CheckCircle2 size={12} />
                                Başarılı
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-rose-700">
                                <XCircle size={12} />
                                Başarısız
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedLoginLog(log);
                                setIsLoginModalOpen(true);
                              }}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-600 focus:outline-none"
                              title="Oturum Detayını Gör"
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

          {/* Login Detail Modal */}
          <Modal
            open={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            title="Oturum Giriş Detayı"
            size="md"
          >
            {selectedLoginLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-xs border border-gray-150">
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">Kullanıcı E-Posta</span>
                    <span className="text-gray-900 font-bold text-sm">{selectedLoginLog.user_email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">Kullanıcı Adı</span>
                    <span className="text-gray-900 font-bold text-sm">{selectedLoginLog.user_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">Giriş Zamanı</span>
                    <span className="text-gray-900 font-bold text-sm">{formatDate(selectedLoginLog.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">Durum</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                      selectedLoginLog.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {selectedLoginLog.status === 'success' ? 'Başarılı Oturum' : 'Başarısız Giriş Denemesi'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">IP Adresi</span>
                    <span className="text-gray-900 font-mono font-bold text-sm">{selectedLoginLog.ip_address || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">Cihaz Bilgisi</span>
                    <span className="text-gray-900 font-bold text-sm">{selectedLoginLog.device_info || '—'}</span>
                  </div>
                </div>

                {/* User Agent */}
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-xs">
                  <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-1">Ham Tarayıcı / User Agent</span>
                  <div className="font-mono text-gray-700 break-all bg-white p-2 rounded border border-gray-150">
                    {selectedLoginLog.user_agent || 'Bilinmiyor'}
                  </div>
                </div>

                {/* Internal IDs */}
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-xs space-y-1.5 font-mono text-gray-600">
                  <div>
                    <span className="text-gray-400 font-sans">Kayıt ID:</span> {selectedLoginLog.id}
                  </div>
                  <div>
                    <span className="text-gray-400 font-sans">Kullanıcı ID:</span> {selectedLoginLog.user_id || '—'}
                  </div>
                  <div>
                    <span className="text-gray-400 font-sans">Organizasyon ID:</span> {selectedLoginLog.organization_id || '—'}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-6">
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
                  value={auditUserQuery}
                  onChange={(e) => setAuditUserQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Table Name Filter */}
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
                  value={auditTableFilter}
                  onChange={(e) => setAuditTableFilter(e.target.value)}
                >
                  <option value="all">Tüm Modüller</option>
                  {Object.entries(tableLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                {/* Action Type Filter */}
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none"
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
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
                    value={auditStartDate}
                    onChange={(e) => setAuditStartDate(e.target.value)}
                  />
                  <span className="text-xs text-gray-400">—</span>
                  <input
                    type="date"
                    className="border-0 bg-transparent p-0 text-sm font-medium text-gray-700 focus:outline-none focus:ring-0 max-w-[120px]"
                    value={auditEndDate}
                    onChange={(e) => setAuditEndDate(e.target.value)}
                  />
                  {(auditStartDate || auditEndDate) && (
                    <button
                      onClick={() => {
                        setAuditStartDate('');
                        setAuditEndDate('');
                      }}
                      className="rounded-full p-0.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  onClick={fetchAuditLogs}
                  className="rounded-lg p-2 text-gray-400 border border-gray-300 hover:text-gray-700 hover:bg-gray-50 focus:outline-none"
                  title="Yenile"
                >
                  <RefreshCw size={15} className={auditLoading ? 'animate-spin' : ''} />
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
                  {auditLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-500" />
                        Aktivite günlükleri yükleniyor...
                      </td>
                    </tr>
                  ) : filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
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
                              onClick={() => {
                                setSelectedAuditLog(log);
                                setIsAuditModalOpen(true);
                              }}
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

          {/* Audit Detail Modal */}
          <Modal
            open={isAuditModalOpen}
            onClose={() => setIsAuditModalOpen(false)}
            title="Aktivite Detay Görünümü"
            size="lg"
          >
            {selectedAuditLog && (
              <div className="space-y-4">
                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-xs border border-gray-150">
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">İşlemi Yapan</span>
                    <span className="text-gray-900 font-bold text-sm">{selectedAuditLog.user_email || 'Sistem / EBS Sync'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">İşlem Tarihi</span>
                    <span className="text-gray-900 font-bold text-sm">{formatDate(selectedAuditLog.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">Modül / Tablo</span>
                    <span className="text-gray-900 font-bold text-sm">{tableLabels[selectedAuditLog.table_name] || selectedAuditLog.table_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider mb-0.5">İşlem Türü</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold mt-0.5 ${actionLabels[selectedAuditLog.action_type]?.cls}`}>
                      {actionLabels[selectedAuditLog.action_type]?.label || selectedAuditLog.action_type}
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
                  {selectedAuditLog.action_type === 'UPDATE' && (
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
                  {selectedAuditLog.action_type === 'INSERT' && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/30 text-xs font-mono max-h-80 overflow-y-auto">
                      <span className="text-gray-400 block font-semibold font-sans mb-2 uppercase">Eklenen Kayıt Verileri:</span>
                      <table className="w-full text-left">
                        <tbody>
                          {Object.entries(selectedAuditLog.new_data || {}).map(([key, val]) => {
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
                  {selectedAuditLog.action_type === 'DELETE' && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/30 text-xs font-mono max-h-80 overflow-y-auto">
                      <span className="text-gray-400 block font-semibold font-sans mb-2 uppercase">Silinen Kayıt Verileri:</span>
                      <table className="w-full text-left">
                        <tbody>
                          {Object.entries(selectedAuditLog.old_data || {}).map(([key, val]) => {
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
                    onClick={() => setIsAuditModalOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
