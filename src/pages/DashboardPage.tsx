import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import {
  Wallet,
  Store,
  RefreshCw,
  ArrowUpRight,
  Building2,
  Gavel,
  CreditCard,
  History,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Search,
  ChevronDown,
  Rocket,
  Lightbulb,
  BarChart2,
  ShoppingCart,
  Briefcase,
  Sliders,
  Cloud,
  BookOpen,
  Bell,
  Coins,
  Users,
  FileText,
  TrendingUp
} from 'lucide-react';
import { CalendarPage } from '../features/calendar/CalendarPage';

const TUNNEL_URL = 'https://vega-api.amasyaetas.com';

interface BranchSummary {
  key: string;
  name: string;
  code: string;
  to: string;
  balance: number;
  dailyRevenue: number;
}

const BRANCH_CONFIGS: BranchSummary[] = [
  { key: 'merkez', name: 'Merkez Şube', code: '685', to: '/subeler/merkez', balance: 0, dailyRevenue: 0 },
  { key: 'merzifon', name: 'Merzifon Şube', code: '686', to: '/subeler/merzifon', balance: 0, dailyRevenue: 0 },
  { key: 'ilkadim', name: 'İlkadım Şube', code: '688', to: '/subeler/ilkadim', balance: 0, dailyRevenue: 0 },
  { key: 'atakum', name: 'Atakum Şube', code: '687', to: '/subeler/atakum', balance: 0, dailyRevenue: 0 },
  { key: 'sucukhane', name: 'Sucukhane Şube', code: '1588', to: '/subeler/sucukhane', balance: 0, dailyRevenue: 0 },
  { key: 'depo', name: 'Depo Şube', code: '4', to: '/subeler/depo', balance: 0, dailyRevenue: 0 },
];

interface UpcomingCheck {
  id: string;
  amount: number;
  due_date: string;
  debtor: string | null;
  bank: string | null;
  status: string | null;
  check_number: string | null;
}

interface ActivityLogItem {
  id: string;
  user_email: string | null;
  action_type: string;
  table_name: string;
  record_id: string;
  created_at: string;
  new_data: any;
  old_data: any;
}

const DASHBOARD_CACHE_KEY = 'dars_dashboard_cache_v5';

interface DashboardCachedData {
  cashboxBalance: number;
  cashboxReportDate: string;
  thisWeekChecksTotal: number;
  thisWeekChecksCount: number;
  upcomingChecks: UpcomingCheck[];
  branches: BranchSummary[];
  totalBranchBalance: number;
  totalDailyRevenue: number;
  activeTendersCount: number;
  activities: ActivityLogItem[];
  lastUpdated: string;
}

const getDashboardCache = (): DashboardCachedData | null => {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {
    console.warn('Dashboard cache read error:', e);
  }
  return null;
};

const saveDashboardCache = (data: Partial<DashboardCachedData>) => {
  try {
    const existing = getDashboardCache() || {
      cashboxBalance: 0,
      cashboxReportDate: '',
      thisWeekChecksTotal: 0,
      thisWeekChecksCount: 0,
      upcomingChecks: [],
      branches: BRANCH_CONFIGS,
      totalBranchBalance: 0,
      totalDailyRevenue: 0,
      activeTendersCount: 0,
      activities: [],
      lastUpdated: '',
    };
    const merged = { ...existing, ...data };
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('Dashboard cache save error:', e);
  }
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sidebar theme preservation
  const [sidebarTheme, setSidebarTheme] = useState<'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp'>(() => {
    try {
      return (localStorage.getItem(`sidebar_theme_${user?.email}`) as any) || 'one_dars_v4';
    } catch {
      return 'one_dars_v4';
    }
  });

  useEffect(() => {
    const handleThemeChange = () => {
      try {
        const theme = (localStorage.getItem(`sidebar_theme_${user?.email}`) as any) || 'one_dars_v4';
        setSidebarTheme(theme);
      } catch {
        setSidebarTheme('one_dars_v4');
      }
    };
    window.addEventListener('sidebar-theme-changed', handleThemeChange);
    return () => window.removeEventListener('sidebar-theme-changed', handleThemeChange);
  }, [user?.email]);

  // Initial Cached SWR Data for 0ms Instant Render
  const initialCache = useMemo(() => getDashboardCache(), []);

  // Live data states
  const [loading, setLoading] = useState<boolean>(() => !initialCache);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>(() => initialCache?.lastUpdated || '');

  // 1. Ana Kasa Balance
  const [cashboxBalance, setCashboxBalance] = useState<number>(() => initialCache?.cashboxBalance || 0);
  const [cashboxReportDate, setCashboxReportDate] = useState<string>(() => initialCache?.cashboxReportDate || '');

  // 2. Checks data
  const [thisWeekChecksTotal, setThisWeekChecksTotal] = useState<number>(() => initialCache?.thisWeekChecksTotal || 0);
  const [thisWeekChecksCount, setThisWeekChecksCount] = useState<number>(() => initialCache?.thisWeekChecksCount || 0);
  const [upcomingChecks, setUpcomingChecks] = useState<UpcomingCheck[]>(() => initialCache?.upcomingChecks || []);

  // 3. Branches data
  const [branches, setBranches] = useState<BranchSummary[]>(() => initialCache?.branches || BRANCH_CONFIGS);
  const [totalBranchBalance, setTotalBranchBalance] = useState<number>(() => initialCache?.totalBranchBalance || 0);
  const [totalDailyRevenue, setTotalDailyRevenue] = useState<number>(() => initialCache?.totalDailyRevenue || 0);

  // 4. Tenders data
  const [activeTendersCount, setActiveTendersCount] = useState<number>(() => initialCache?.activeTendersCount || 0);

  // 5. Activity logs
  const [activities, setActivities] = useState<ActivityLogItem[]>(() => initialCache?.activities || []);

  // Helper to parse Turkish formatted money
  const parseMoneyNum = (v: any): number => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    const clean = String(v).replace(/\./g, '').replace(/,/g, '.').trim();
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  };

  // Helper to extract branch daily revenue totals from giris_list
  const calculateBranchDailyRevenues = (girisList: any[]): Record<string, number> => {
    if (!Array.isArray(girisList)) return {};
    
    const branchMap: Record<string, number> = {
      merkez: 0,
      merzifon: 0,
      ilkadim: 0,
      atakum: 0,
      sucukhane: 0,
      depo: 0
    };

    let currentBranch: string | null = null;

    for (const item of girisList) {
      if (!item) continue;
      const desc = (item.description || '').toUpperCase().trim();
      const amt = parseMoneyNum(item.amount);

      if (desc === 'DEVİR BAKİYE' || desc === 'DEVIR BAKIYE') {
        currentBranch = null;
        continue;
      }
      if (desc === 'MERKEZ') {
        currentBranch = 'merkez';
        branchMap.merkez += amt;
        continue;
      }
      if (desc === 'MERZİFON' || desc === 'MERZIFON') {
        currentBranch = 'merzifon';
        branchMap.merzifon += amt;
        continue;
      }
      if (desc === 'ATAKUM') {
        currentBranch = 'atakum';
        branchMap.atakum += amt;
        continue;
      }
      if (desc === 'İLKADIM' || desc === 'ILKADIM') {
        currentBranch = 'ilkadim';
        branchMap.ilkadim += amt;
        continue;
      }
      if (desc === 'DEPO') {
        currentBranch = 'depo';
        branchMap.depo += amt;
        continue;
      }
      if (desc === 'SUCUKHANE') {
        currentBranch = 'sucukhane';
        branchMap.sucukhane += amt;
        continue;
      }

      if (currentBranch) {
        if (['ADİL AĞCIHAN', 'GAMZE YEKELER', 'MERVE KURT ÇALI', 'BEKE KÖY MUHTARI', 'SERKAN TAŞKIRAN', 'ERZURUM HINIS HAST.', 'YUSUF BATU', 'CEM TEKİN KARKAS SATIŞI', 'KUVYT ÇEK', 'ZİRAT KREDİ', 'KRAL DÜRÜM', 'YEKELER', 'KASABIN OĞLU', 'ÖZADANA'].includes(desc)) {
          currentBranch = null;
          continue;
        }
        
        const posBanks = ['ÇIKIŞ', 'CIKIS', 'Ö.ZİRAAT', 'O.ZIRAAT', 'GARANTİ', 'GARANTI', 'ZİRAAT', 'AKBANK', 'KUVEYT', 'HALK', 'ALBARAKA', 'DENİZ', 'DENIZ', 'VAKIF', 'YAPI', 'ŞEKER', 'SEKER', 'POS'];
        if (posBanks.includes(desc)) {
          branchMap[currentBranch] += amt;
        }
      }
    }

    return branchMap;
  };

  // Sub-routine: Fetch Cashbox & Calculate Branch Revenues
  const fetchCashbox = useCallback(async (): Promise<Record<string, number>> => {
    try {
      const { data: latestCashbox, error } = await supabase
        .from('cashbox_giris_cikis_reports')
        .select('report_date, ana_kasa_total, ana_kasa_list, giris_list, giris_total')
        .order('report_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Cashbox query error:', error);
      }

      if (latestCashbox) {
        const repDate = latestCashbox.report_date || '';
        setCashboxReportDate(repDate);

        let totalVal = 0;
        if (latestCashbox.ana_kasa_total !== undefined && latestCashbox.ana_kasa_total !== null) {
          totalVal = Number(latestCashbox.ana_kasa_total) || 0;
        } else if (Array.isArray(latestCashbox.ana_kasa_list)) {
          for (const item of latestCashbox.ana_kasa_list) {
            if (item && item.gunSonu) {
              const num = typeof item.gunSonu === 'number' 
                ? item.gunSonu 
                : Number(String(item.gunSonu).replace(/\./g, '').replace(',', '.'));
              if (!isNaN(num)) totalVal += num;
            }
          }
        }
        setCashboxBalance(totalVal);

        const revMap = calculateBranchDailyRevenues(latestCashbox.giris_list || []);
        let totalRev = 0;
        Object.values(revMap).forEach(v => { totalRev += v; });
        setTotalDailyRevenue(totalRev);

        setBranches(prev => prev.map(b => ({
          ...b,
          dailyRevenue: revMap[b.key] || 0
        })));

        saveDashboardCache({
          cashboxBalance: totalVal,
          cashboxReportDate: repDate,
          totalDailyRevenue: totalRev,
        });

        return revMap;
      }
    } catch (e) {
      console.warn('Cashbox fetch error:', e);
    }
    return {};
  }, []);

  // Sub-routine: Fetch Checks Data
  const fetchChecks = useCallback(async (orgId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() + mondayOffset);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Sadece ödenmemiş / aktif çekleri sorgula (ebs_checks sütunları: bank_name, check_no, debtor, kesideci, creditor)
      const { data: checksData, error: checksError } = await supabase
        .from('ebs_checks')
        .select('id, amount, due_date, debtor, creditor, kesideci, bank_name, status, check_no, check_type')
        .eq('organization_id', orgId)
        .neq('status', 'Ödendi')
        .neq('status', 'Tahsil Edildi')
        .neq('status', 'İptal')
        .order('due_date', { ascending: true })
        .limit(2000);

      if (checksError) {
        console.error('Checks fetch error:', checksError);
        return;
      }

      if (Array.isArray(checksData)) {
        let weekSum = 0;
        let weekCount = 0;

        const unpaidChecks = checksData.filter(c => {
          const st = (c.status || '').toLowerCase().trim();
          return st !== 'ödendi' && st !== 'odendi' && st !== 'tahsil edildi' && st !== 'tahsil_edildi' && st !== 'iptal' && st !== 'iptal edildi';
        });

        unpaidChecks.forEach(c => {
          if (c.due_date) {
            const dueDate = new Date(c.due_date);
            if (dueDate >= startOfWeek && dueDate <= endOfWeek) {
              weekSum += Number(c.amount || 0);
              weekCount += 1;
            }
          }
        });

        setThisWeekChecksTotal(weekSum);
        setThisWeekChecksCount(weekCount);

        // Vadesi bugün veya ileri tarihli olan bekleyen çekler (tarihe göre artan)
        const upcomingList = unpaidChecks
          .filter(c => c.due_date && new Date(c.due_date) >= today)
          .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
          .slice(0, 7)
          .map(c => ({
            id: c.id,
            amount: Number(c.amount || 0),
            due_date: c.due_date || '',
            debtor: c.kesideci || c.debtor || c.creditor || '—',
            bank: c.bank_name || '—',
            status: c.status,
            check_number: c.check_no,
          }));

        // Eğer ileri vadeli çek yoksa en yakın vadeli çekleri listele
        let finalUpcoming = upcomingList;
        if (finalUpcoming.length === 0 && unpaidChecks.length > 0) {
          finalUpcoming = unpaidChecks.slice(0, 6).map(c => ({
            id: c.id,
            amount: Number(c.amount || 0),
            due_date: c.due_date || '',
            debtor: c.kesideci || c.debtor || c.creditor || '—',
            bank: c.bank_name || '—',
            status: c.status,
            check_number: c.check_no,
          }));
        }

        setUpcomingChecks(finalUpcoming);

        saveDashboardCache({
          thisWeekChecksTotal: weekSum,
          thisWeekChecksCount: weekCount,
          upcomingChecks: finalUpcoming,
        });
      }
    } catch (e) {
      console.warn('Checks fetch error:', e);
    }
  }, []);

  // Sub-routine: Fetch Vega Branches
  const fetchVegaBranches = useCallback(async (currentRevenues?: Record<string, number>) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const carilerRes = await fetch(`${TUNNEL_URL}/api/cariler`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (carilerRes.ok) {
        const carilerData = await carilerRes.json();
        if (Array.isArray(carilerData)) {
          let sumBranches = 0;
          setBranches(prev => {
            const updated = prev.map(b => {
              const matched = carilerData.find(c => c.code === b.code);
              const bBal = matched ? (matched.balance || 0) : b.balance;
              sumBranches += bBal;
              return {
                ...b,
                balance: bBal,
                dailyRevenue: currentRevenues?.[b.key] !== undefined ? currentRevenues[b.key] : b.dailyRevenue
              };
            });
            saveDashboardCache({
              branches: updated,
              totalBranchBalance: sumBranches
            });
            return updated;
          });
          setTotalBranchBalance(sumBranches);
        }
      }
    } catch (err) {
      console.warn('Vega API cariler verisi gecikti veya çekilemedi (önbellek korundu):', err);
    }
  }, []);

  // Sub-routine: Fetch Tenders Count
  const fetchTenders = useCallback(async (orgId: string) => {
    try {
      const [{ count: tendersCount }, { count: candidatesCount }] = await Promise.all([
        supabase
          .from('tenders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabase
          .from('ekap_candidates')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'bekliyor')
      ]);

      const total = (tendersCount || 0) + (candidatesCount || 0);
      setActiveTendersCount(total);
      saveDashboardCache({ activeTendersCount: total });
    } catch (e) {
      console.warn('Tenders fetch error:', e);
    }
  }, []);

  // Sub-routine: Fetch Activity Logs
  const fetchLogs = useCallback(async (orgId: string) => {
    try {
      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (Array.isArray(logsData)) {
        setActivities(logsData);
        saveDashboardCache({ activities: logsData });
      }
    } catch (e) {
      console.warn('Activity logs fetch error:', e);
    }
  }, []);

  // Parallel, Non-blocking Dashboard Synchronizer
  const fetchDashboardData = useCallback(async (silent = false) => {
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
    if (!silent) {
      setIsSyncing(true);
    }

    try {
      // Execute all primary database queries simultaneously
      const results = await Promise.allSettled([
        fetchCashbox(),
        fetchChecks(orgId),
        fetchTenders(orgId),
        fetchLogs(orgId)
      ]);

      const cashboxResult = results[0];
      const revMap = cashboxResult.status === 'fulfilled' ? cashboxResult.value : {};

      // Trigger Vega Cariler in parallel
      void fetchVegaBranches(revMap);

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLastUpdated(timeStr);
      saveDashboardCache({ lastUpdated: timeStr });
    } catch (e) {
      console.error('Dashboard veri çekme hatası:', e);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [user?.organizationId, fetchCashbox, fetchChecks, fetchTenders, fetchLogs, fetchVegaBranches]);

  useEffect(() => {
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';

    // Initial background sync (silent if cache already hydrated)
    void fetchDashboardData(!!initialCache);

    // Supabase Realtime subscriptions (auto-sync when database changes)
    const channel = supabase
      .channel('dashboard-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cashbox_giris_cikis_reports' }, () => {
        void fetchCashbox();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ebs_checks' }, () => {
        void fetchChecks(orgId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => {
        void fetchLogs(orgId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenders' }, () => {
        void fetchTenders(orgId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ekap_candidates' }, () => {
        void fetchTenders(orgId);
      })
      .subscribe();

    // Background interval sync every 60 seconds
    const interval = setInterval(() => {
      void fetchDashboardData(true);
    }, 60000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.organizationId, initialCache, fetchDashboardData, fetchCashbox, fetchChecks, fetchLogs, fetchTenders]);

  // Helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  };

  const getDaysRemainingBadge = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">Gecikmiş ({Math.abs(diffDays)} gün)</span>;
    }
    if (diffDays === 0) {
      return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">Bugün</span>;
    }
    if (diffDays === 1) {
      return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">Yarın</span>;
    }
    if (diffDays <= 7) {
      return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">{diffDays} gün kaldı</span>;
    }
    return <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 border border-gray-200">{diffDays} gün</span>;
  };

  const formatActivityText = (log: ActivityLogItem) => {
    const tableNames: Record<string, string> = {
      ebs_checks: 'Çek & Senet',
      vehicles: 'Araç Yönetimi',
      tenders: 'İhale Takip',
      ekap_candidates: 'EKAP İhale Adayı',
      kesim_listesi: 'Kesim Listesi',
      real_estates: 'Gayrimenkul',
      main_cashbox_transactions: 'Ana Kasa',
      cashbox_giris_cikis_reports: 'Kasa Gün Sonu',
      credit_cards: 'Kredi Kartı'
    };

    const actionTypes: Record<string, { label: string; color: string }> = {
      INSERT: { label: 'Yeni Kayıt', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
      UPDATE: { label: 'Güncellendi', color: 'text-blue-600 bg-blue-50 border-blue-200' },
      DELETE: { label: 'Silindi', color: 'text-red-600 bg-red-50 border-red-200' }
    };

    const tableLabel = tableNames[log.table_name] || log.table_name || 'İşlem';
    const actionInfo = actionTypes[log.action_type] || { label: log.action_type || 'İşlem', color: 'text-gray-600 bg-gray-50 border-gray-200' };

    let detail = '';
    if (log.new_data) {
      if (log.new_data.debtor || log.new_data.kesideci || log.new_data.creditor || log.new_data.bank_name || log.new_data.bank) {
        detail = `${log.new_data.kesideci || log.new_data.debtor || log.new_data.creditor || log.new_data.bank_name || log.new_data.bank}`;
      } else if (log.new_data.title) {
        detail = `${log.new_data.title.slice(0, 28)}...`;
      } else if (log.new_data.plate) {
        detail = `Plaka: ${log.new_data.plate}`;
      }
    }

    return {
      tableLabel,
      actionInfo,
      detail,
      user: log.user_email ? log.user_email.split('@')[0] : 'Sistem'
    };
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Az önce';
      if (diffMins < 60) return `${diffMins} dk önce`;
      if (diffHours < 24) return `${diffHours} saat önce`;
      if (diffDays === 1) return 'Dün';
      return `${diffDays} gün önce`;
    } catch {
      return '';
    }
  };

  // Bulut ERP Theme View
  const bulutModules = useMemo(() => [
    { label: 'Başlangıç Rehberi', bg: 'bg-[#ff6b3d]', icon: Rocket, to: '/finans/cek-vade-hesaplama' },
    { label: 'Nasıl Yaparım?', bg: 'bg-[#ff6b3d]', icon: Lightbulb, to: '/ai-asistan' },
    { label: 'Panolar', bg: 'bg-[#5b61ed]', icon: BarChart2, to: '/dashboard' },
    { label: 'Malzeme Yönetimi', bg: 'bg-[#4f67ff]', icon: ShoppingCart, to: '/muhasebe/stoklar' },
    { label: 'Varlık Yönetimi', bg: 'bg-[#3b82f6]', icon: Briefcase, to: '/gayrimenkul-listesi' },
    { label: 'Talep Yönetimi', bg: 'bg-[#6366f1]', icon: FileText, to: '/ihaleler' },
    { label: 'Satınalma Yönetimi', bg: 'bg-[#7c3aed]', icon: ShoppingCart, to: '/muhasebe/vega-son-islemler' },
    { label: 'Fırsat Takip Yönetimi', bg: 'bg-[#7c3aed]', icon: Users, to: '/arac-yonetimi/soforler' },
    { label: 'Satış Yönetimi', bg: 'bg-[#6366f1]', icon: ShoppingCart, to: '/arac-yonetimi' },
    { label: 'Satış Noktası', bg: 'bg-[#8b5cf6]', icon: Coins, to: '/pos' },
    { label: 'İthalat Yönetimi', bg: 'bg-[#585cfa]', icon: Sliders, to: '/arac-yonetimi/trafik-cezalari' },
    { label: 'İhracat Yönetimi', bg: 'bg-[#585cfa]', icon: Sliders, to: '/arac-yonetimi/hgs-gecis' },
    { label: 'Bütçe Yönetimi', bg: 'bg-[#059669]', icon: BarChart2, to: '/ana-kasa/rapor' },
    { label: 'Finans Yönetimi', bg: 'bg-[#10b981]', icon: Coins, to: '/cekler' },
    { label: 'Genel Muhasebe', bg: 'bg-[#0d9488]', icon: BookOpen, to: '/muhasebe/cariler' },
    { label: 'e-Dönüşüm', bg: 'bg-[#3b82f6]', icon: Cloud, to: '/belgeler' },
    { label: 'Bildirim ve Onay', bg: 'bg-[#4345d9]', icon: Bell, to: '/bildirimler' },
    { label: 'Kişisel Verilerin Yönetimi', bg: 'bg-[#3739a8]', icon: Users, to: '/kullanicilar' },
    { label: 'Sistem Ayarları', bg: 'bg-[#64748b]', icon: Sliders, to: '/ayarlar' },
    { label: 'Yönetim Paneli', bg: 'bg-[#5b61ed]', icon: Users, to: '/aktivite-gunlugu' },
  ], []);

  if (sidebarTheme === 'bulut_erp') {
    return (
      <div className="-mx-4 -my-6 lg:-mx-8 lg:-my-8 min-h-[calc(100vh-64px)] bg-gradient-to-br from-[#4c5270] to-[#1e223f] flex flex-col items-center py-12 px-6 overflow-y-auto">
        <div className="relative w-full max-w-2xl mb-12 flex items-center">
          <Search className="absolute left-4 text-white/50 pointer-events-none" size={18} />
          <input
            type="text"
            placeholder="Ara..."
            className="w-full h-11 pl-12 pr-4 bg-white/10 border-none rounded-lg text-white placeholder-white/40 focus:bg-white/20 focus:ring-0 focus:outline-none text-sm transition-all"
          />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-10 gap-y-12 max-w-5xl justify-items-center">
          {bulutModules.map((m) => {
            const ModuleIcon = m.icon;
            return (
              <button
                key={m.label}
                onClick={() => navigate(m.to)}
                className="flex flex-col items-center focus:outline-none group transition-transform active:scale-95"
              >
                <div className={`w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-2xl flex items-center justify-center ${m.bg} shadow-lg shadow-black/10 group-hover:brightness-105 transition-all`}>
                  <ModuleIcon size={24} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-white text-[11px] sm:text-xs text-center mt-2.5 font-medium leading-snug max-w-[85px] line-clamp-2 drop-shadow-sm">
                  {m.label}
                </span>
                <ChevronDown size={11} className="text-white/30 group-hover:text-white/65 mt-1 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Top Header & Live Sync Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <BarChart2 className="text-[#f37021]" size={28} />
            Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Şirket geneli anlık nakit akışı, çek portföyü, şube performansları ve canlı operasyon takibi.
          </p>
        </div>

        {/* Live Sync Status & Refresh Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50/70 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSyncing ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSyncing ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <span>{isSyncing ? 'Senkronize Ediliyor...' : 'Canlı Senkronize'}</span>
            {lastUpdated && <span className="text-gray-400 font-normal">({lastUpdated})</span>}
          </div>

          <button
            onClick={() => void fetchDashboardData(false)}
            disabled={isSyncing}
            className="btn-secondary flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 border-gray-200 text-gray-700 shadow-sm"
            title="Tüm verileri şimdi yenile"
          >
            <RefreshCw className={isSyncing ? 'animate-spin text-[#f37021]' : 'text-gray-500'} size={15} />
            Canlı Verileri Yenile
          </button>
        </div>
      </div>

      {/* Calendar Section (Preserved) */}
      <div className="rounded-2xl border border-gray-200/90 bg-white shadow-sm overflow-hidden p-1">
        <CalendarPage embedded />
      </div>

      {/* 4 Live Financial & Operational KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Canlı Ana Kasa Bakiyesi */}
        <Link
          to="/ana-kasa/giris-cikis"
          className="group relative rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 p-5 shadow-sm hover:shadow-md transition-all hover:border-blue-300 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900/70">
                Canlı Ana Kasa Bakiyesi
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/70 text-blue-700 group-hover:scale-105 transition-transform">
                <Wallet size={18} />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                {loading && !cashboxReportDate ? (
                  <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-lg mt-0.5" />
                ) : (
                  formatCurrency(cashboxBalance)
                )}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 size={12} className="text-emerald-500" />
                {cashboxReportDate ? `${cashboxReportDate} tarihli kasa sonu` : 'Güncel kasa sonu toplamı'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-100/60 flex items-center justify-between text-xs font-semibold text-blue-700 group-hover:translate-x-0.5 transition-transform">
            <span>Giriş / Çıkış Hareketleri</span>
            <ChevronRight size={14} />
          </div>
        </Link>

        {/* 2. Bu Hafta Vadesi Gelen Çekler */}
        <Link
          to="/cekler"
          className="group relative rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/30 p-5 shadow-sm hover:shadow-md transition-all hover:border-amber-300 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900/70">
                Bu Hafta Vadesi Gelen Çekler
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100/70 text-amber-700 group-hover:scale-105 transition-transform">
                <CreditCard size={18} />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                {loading && thisWeekChecksTotal === 0 && thisWeekChecksCount === 0 ? (
                  <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-lg mt-0.5" />
                ) : (
                  formatCurrency(thisWeekChecksTotal)
                )}
              </h3>
              <p className="text-[11px] text-amber-700/90 mt-1 flex items-center gap-1 font-semibold">
                <Clock size={12} />
                {thisWeekChecksCount > 0 ? `Bu hafta vadesi dolan ${thisWeekChecksCount} adet çek` : 'Bu hafta vadeli çek bulunmuyor'}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-100/60 flex items-center justify-between text-xs font-semibold text-amber-700 group-hover:translate-x-0.5 transition-transform">
            <span>Çek Portföyü & Vade Listesi</span>
            <ChevronRight size={14} />
          </div>
        </Link>

        {/* 3. Şubeler Toplam Cari Durumu */}
        <Link
          to="/subeler/merkez"
          className="group relative rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/30 p-5 shadow-sm hover:shadow-md transition-all hover:border-purple-300 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900/70">
                Şubeler Toplam Bakiyesi
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100/70 text-purple-700 group-hover:scale-105 transition-transform">
                <Store size={18} />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                {loading && totalBranchBalance === 0 ? (
                  <div className="h-8 w-32 bg-gray-100 animate-pulse rounded-lg mt-0.5" />
                ) : (
                  formatCurrency(totalBranchBalance)
                )}
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-medium">
                <Building2 size={12} className="text-purple-500" />
                6 şubenin konsolide Vega cari bakiyesi
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-purple-100/60 flex items-center justify-between text-xs font-semibold text-purple-700 group-hover:translate-x-0.5 transition-transform">
            <span>Şube Performans Kartları</span>
            <ChevronRight size={14} />
          </div>
        </Link>

        {/* 4. Aktif İhale & Teklifler */}
        <Link
          to="/ihaleler"
          className="group relative rounded-2xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 p-5 shadow-sm hover:shadow-md transition-all hover:border-indigo-300 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900/70">
                Aktif İhale & Teklifler
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100/70 text-indigo-700 group-hover:scale-105 transition-transform">
                <Gavel size={18} />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-gray-900">
                {loading && activeTendersCount === 0 ? (
                  <div className="h-8 w-20 bg-gray-100 animate-pulse rounded-lg mt-0.5" />
                ) : (
                  `${activeTendersCount} İhale / Aday`
                )}
              </h3>
              <p className="text-[11px] text-indigo-700/90 mt-1 flex items-center gap-1 font-medium">
                <FileSpreadsheet size={12} />
                Hazırlanan ihaleler ve onay bekleyen EKAP ilanları
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-100/60 flex items-center justify-between text-xs font-semibold text-indigo-700 group-hover:translate-x-0.5 transition-transform">
            <span>İhale & Doğrudan Temin Takibi</span>
            <ChevronRight size={14} />
          </div>
        </Link>
      </div>

      {/* 6 Branches Live Status & Daily Revenue */}
      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Store className="text-[#f37021]" size={20} />
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Şubelerimiz Günlük Hasılat & Canlı Cari Durumu
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                {cashboxReportDate 
                  ? `Son Kasa Raporu (${new Date(cashboxReportDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}) hasılatları ve Vega cari bakiyeleri`
                  : 'Kasa gün sonu hasılatları ve Vega cari bakiyeleri canlı takip'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-xs">
              <TrendingUp size={15} className="text-emerald-600" />
              <span>Toplam Günlük Hasılat:</span>
              <span className="text-emerald-950 font-extrabold text-sm">
                {formatCurrency(totalDailyRevenue)}
              </span>
            </div>
            <span className="hidden sm:inline-block text-[11px] text-gray-400 font-medium">
              Vega & Kasa Entegre
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {branches.map((b) => {
            const isBorc = b.balance >= 0;
            return (
              <Link
                key={b.key}
                to={b.to}
                className="group rounded-xl border border-gray-200/80 bg-gradient-to-b from-gray-50/70 to-white p-3.5 hover:bg-white hover:border-[#f37021]/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 group-hover:text-[#f37021] transition-colors truncate">
                      {b.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-2xs">
                      #{b.code}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 flex items-center justify-between">
                      <span>Günlük Hasılat</span>
                      <TrendingUp size={12} className="text-emerald-600" />
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-emerald-700 mt-0.5 tracking-tight truncate">
                      {loading && b.dailyRevenue === 0 ? (
                        <div className="h-5 w-20 bg-gray-200 animate-pulse rounded mt-0.5" />
                      ) : (
                        formatCurrency(b.dailyRevenue)
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <div className="truncate">
                    <span className="text-[10px] text-gray-400 font-medium mr-1">Cari:</span>
                    <span className={`font-semibold ${isBorc ? 'text-red-600' : 'text-emerald-600'}`}>
                      {loading && b.balance === 0 ? '...' : formatCurrency(b.balance)}
                    </span>
                  </div>
                  <ArrowUpRight size={13} className="text-gray-400 group-hover:text-[#f37021] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 2-Column Detailed Section: Upcoming Checks & Real Activity Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (7 Cols): Upcoming Checks & Maturities */}
        <div className="lg:col-span-7 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="text-[#f37021]" size={18} />
                <h3 className="font-bold text-gray-900 text-sm">
                  Yaklaşan Çek Vadeleri & Portföy Durumu
                </h3>
              </div>
              <Link
                to="/cekler"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
              >
                Tüm Çekleri Gör <ExternalLink size={12} />
              </Link>
            </div>

            {/* Checks Table */}
            <div className="mt-3 overflow-x-auto">
              {loading && upcomingChecks.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="animate-spin text-[#f37021]" size={20} />
                  <span>Çek portföyü yükleniyor...</span>
                </div>
              ) : upcomingChecks.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                  Yakın vadede bekleyen ödenmemiş çek kaydı bulunamadı.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-2 px-3">Vade</th>
                      <th className="py-2 px-3">Keşideci / Borçlu</th>
                      <th className="py-2 px-3">Banka</th>
                      <th className="py-2 px-3 text-right">Tutar</th>
                      <th className="py-2 px-3 text-center">Kalan Süre</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {upcomingChecks.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-gray-900 whitespace-nowrap">
                          {c.due_date ? new Date(c.due_date).toLocaleDateString('tr-TR') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-800 max-w-[140px] truncate font-medium">
                          {c.debtor || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 max-w-[100px] truncate">
                          {c.bank || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrency(Number(c.amount || 0))}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {c.due_date ? getDaysRemainingBadge(c.due_date) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1 text-[11px]">
              <AlertCircle size={13} className="text-amber-500" />
              Vadeler her sabah otomatik kontrol edilir ve hatırlatılır.
            </span>
            <Link to="/cekler" className="font-semibold text-brand-600 hover:underline">
              EBS Çek Entegrasyonu →
            </Link>
          </div>
        </div>

        {/* Right Column (5 Cols): Quick Actions + Live Audit Feed */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Actions Card */}
          <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <Rocket className="text-[#f37021]" size={16} />
              Hızlı İşlem Kısayolları
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/ana-kasa/giris-cikis"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-brand-400 hover:shadow-sm text-xs font-semibold text-gray-800 transition-all"
              >
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Wallet size={14} />
                </span>
                <span className="truncate">Kasa Giriş/Çıkış</span>
              </Link>

              <Link
                to="/cekler"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-brand-400 hover:shadow-sm text-xs font-semibold text-gray-800 transition-all"
              >
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <CreditCard size={14} />
                </span>
                <span className="truncate">Yeni Çek Girişi</span>
              </Link>

              <Link
                to="/ihaleler"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-brand-400 hover:shadow-sm text-xs font-semibold text-gray-800 transition-all"
              >
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Gavel size={14} />
                </span>
                <span className="truncate">İhale / EKAP Tara</span>
              </Link>

              <Link
                to="/subeler/merkez"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-brand-400 hover:shadow-sm text-xs font-semibold text-gray-800 transition-all"
              >
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Store size={14} />
                </span>
                <span className="truncate">Şube Performansı</span>
              </Link>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <History className="text-[#f37021]" size={16} />
                Canlı Sistem Aktivite Akışı
              </h3>
              <Link
                to="/aktivite-gunlugu"
                className="text-[11px] font-semibold text-brand-600 hover:underline"
              >
                Tümünü Gör
              </Link>
            </div>

            <div className="space-y-2.5">
              {loading && activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  Aktiviteler yükleniyor...
                </div>
              ) : activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  Henüz kaydedilmiş bir sistem aktivitesi bulunmuyor.
                </div>
              ) : (
                activities.map((log) => {
                  const info = formatActivityText(log);
                  return (
                    <div
                      key={log.id}
                      className="flex items-start justify-between gap-2 text-xs p-2 rounded-lg bg-gray-50/50 hover:bg-gray-100/70 transition-colors"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-gray-900">
                            {info.tableLabel}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${info.actionInfo.color}`}>
                            {info.actionInfo.label}
                          </span>
                        </div>
                        {info.detail && (
                          <p className="text-[11px] text-gray-600 truncate">
                            {info.detail}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400">
                          {info.user}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                        {getRelativeTime(log.created_at)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

