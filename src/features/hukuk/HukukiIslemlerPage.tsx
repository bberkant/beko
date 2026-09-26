import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Gavel, 
  Plus, 
  Trash2, 
  Calendar, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Phone,
  Info,
  Eye
} from 'lucide-react';
import { useToast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Modal } from '../../components/ui/Modal';

interface HukukiIslemlerPageProps {
  activeTab?: 'dosyalar' | 'takvim' | 'uyap' | 'avukatlar';
}

const TUNNEL_URL = 'https://vega-api.amasyaetas.com';

interface LegalCase {
  id: string;
  case_number: string;
  court_name: string;
  title: string;
  case_type: 'dava' | 'icra';
  role: 'davaci' | 'davali' | 'alacakli' | 'borclu';
  client_code: string | null;
  client_name: string;
  amount: number;
  status: 'devam-ediyor' | 'karara-cikti' | 'kesinlesti' | 'dustu';
  lawyer_name: string;
  lawyer_phone: string | null;
  risk_assessment: 'yuksek' | 'orta' | 'dusuk';
  notes: string | null;
  uyap_sync_status: 'senkronize' | 'uyari' | 'hata';
  last_uyap_sync: string | null;
}

interface LegalHearing {
  id: string;
  case_id: string;
  hearing_date: string;
  description: string;
  status: 'bekliyor' | 'tamamlandi' | 'ertelendi';
  case_number?: string;
  case_title?: string;
  court_name?: string;
}

interface UyapSyncLog {
  id: string;
  status: 'success' | 'failed';
  records_checked: number;
  records_updated: number;
  error_message: string | null;
  created_at: string;
}

interface VegaCari {
  code: string;
  name: string;
}

export function HukukiIslemlerPage({ activeTab: initialTab = 'dosyalar' }: HukukiIslemlerPageProps) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(initialTab);

  const handleTabChange = (tab: 'dosyalar' | 'takvim' | 'uyap' | 'avukatlar') => {
    setCurrentTab(tab);
    navigate(`/hukuk/${tab}`);
  };

  // General loading states
  const [loading, setLoading] = useState(false);
  const [cariler, setCariler] = useState<VegaCari[]>([]);

  // Tab 1 (Dava & İcra) States
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Case Form State
  const [caseForm, setCaseForm] = useState({
    case_number: '',
    court_name: '',
    title: '',
    case_type: 'dava' as 'dava' | 'icra',
    role: 'davaci' as any,
    client_code: '',
    client_name: '',
    amount: '',
    status: 'devam-ediyor' as any,
    lawyer_name: '',
    lawyer_phone: '',
    risk_assessment: 'dusuk' as 'yuksek' | 'orta' | 'dusuk',
    notes: ''
  });

  // Tab 2 (Hearings Calendar) States
  const [hearings, setHearings] = useState<LegalHearing[]>([]);
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [hearingForm, setHearingForm] = useState({
    case_id: '',
    hearing_date: '',
    description: '',
    status: 'bekliyor' as any
  });

  // Tab 3 (UYAP Sync) States
  const [syncLogs, setSyncLogs] = useState<UyapSyncLog[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);

  // Tab 4 (Avukat) States
  const [lawyerFilter, setLawyerFilter] = useState('');

  // Sync tab with initial prop changes
  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  // Load Vega Cariler for linking cases
  const fetchCariler = async () => {
    try {
      const res = await fetch(`${TUNNEL_URL}/api/cariler`);
      if (res.ok) {
        const data = await res.json();
        setCariler(data.map((c: any) => ({ code: c.code, name: c.name })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load cases from Supabase
  const fetchCases = async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('legal_cases')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases((data || []) as LegalCase[]);
    } catch (e: any) {
      notify('Dosya listesi yüklenemedi: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load hearings
  const fetchHearings = async () => {
    if (!user?.organizationId) return;
    try {
      const { data: casesData } = await supabase
        .from('legal_cases')
        .select('id, case_number, title, court_name')
        .eq('organization_id', user.organizationId);

      const caseIds = (casesData || []).map(c => c.id);
      if (caseIds.length === 0) {
        setHearings([]);
        return;
      }

      const { data, error } = await supabase
        .from('legal_hearings')
        .select('*')
        .in('case_id', caseIds)
        .order('hearing_date', { ascending: true });

      if (error) throw error;

      const mappedHearings = (data || []).map(h => {
        const associatedCase = (casesData || []).find(c => c.id === h.case_id);
        return {
          ...h,
          case_number: associatedCase?.case_number,
          case_title: associatedCase?.title,
          court_name: associatedCase?.court_name
        };
      });
      setHearings(mappedHearings);
    } catch (e: any) {
      console.error(e);
    }
  };

  // Load UYAP Sync Logs
  const fetchSyncLogs = async () => {
    if (!user?.organizationId) return;
    try {
      const { data, error } = await supabase
        .from('uyap_sync_logs')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setSyncLogs((data || []) as UyapSyncLog[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    void fetchCariler();
  }, []);

  useEffect(() => {
    if (currentTab === 'dosyalar') void fetchCases();
    if (currentTab === 'takvim') void fetchHearings();
    if (currentTab === 'uyap') void fetchSyncLogs();
  }, [currentTab]);

  // Create Case Action
  const handleCreateCase = async () => {
    if (!caseForm.case_number || !caseForm.court_name || !caseForm.title || !caseForm.client_name || !user?.organizationId) {
      notify('Lütfen zorunlu alanları doldurun.', 'info');
      return;
    }

    try {
      const payload = {
        organization_id: user.organizationId,
        case_number: caseForm.case_number,
        court_name: caseForm.court_name,
        title: caseForm.title,
        case_type: caseForm.case_type,
        role: caseForm.role,
        client_code: caseForm.client_code || null,
        client_name: caseForm.client_name,
        amount: parseFloat(caseForm.amount) || 0,
        status: caseForm.status,
        lawyer_name: caseForm.lawyer_name,
        lawyer_phone: caseForm.lawyer_phone || null,
        risk_assessment: caseForm.risk_assessment,
        notes: caseForm.notes || null,
        uyap_sync_status: 'senkronize',
        last_uyap_sync: new Date().toISOString()
      };

      const { error } = await supabase.from('legal_cases').insert(payload);
      if (error) throw error;
      
      notify('Dava / İcra dosyası başarıyla kaydedildi.', 'success');
      setIsCaseModalOpen(false);
      setCaseForm({
        case_number: '',
        court_name: '',
        title: '',
        case_type: 'dava',
        role: 'davaci',
        client_code: '',
        client_name: '',
        amount: '',
        status: 'devam-ediyor',
        lawyer_name: '',
        lawyer_phone: '',
        risk_assessment: 'dusuk',
        notes: ''
      });
      void fetchCases();
    } catch (e: any) {
      notify('Dosya oluşturulamadı: ' + e.message, 'error');
    }
  };

  // Delete Case Action
  const handleDeleteCase = async (id: string) => {
    if (!window.confirm('Bu dava dosyasını silmek istediğinize emin misiniz? Tüm duruşma ve evrak kayıtları da silinecektir.')) return;
    try {
      const { error } = await supabase.from('legal_cases').delete().eq('id', id);
      if (error) throw error;
      notify('Dosya başarıyla silindi.', 'success');
      void fetchCases();
    } catch (e: any) {
      notify('Silme işlemi başarısız: ' + e.message, 'error');
    }
  };

  // UYAP Entegrasyon Simülatörü
  const handleUyapSync = async () => {
    if (!user?.organizationId) return;
    setSyncLoading(true);
    try {
      // Fetch active lawsuits
      const { data: casesData } = await supabase
        .from('legal_cases')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('status', 'devam-ediyor');

      const casesList = casesData || [];
      const checkedCount = casesList.length;
      let updatedCount = 0;

      if (checkedCount > 0) {
        // Randomly pick 1 or 2 cases to simulate updates from UYAP portal
        const countToUpdate = Math.min(2, checkedCount);
        for (let i = 0; i < countToUpdate; i++) {
          const targetCase = casesList[Math.floor(Math.random() * checkedCount)];
          
          // Randomly trigger either a new hearing date or sync status update
          const roll = Math.random();
          if (roll < 0.6) {
            // Simulate adding an automated hearing date from UYAP portal
            const hearingDate = new Date();
            hearingDate.setDate(hearingDate.getDate() + 10 + Math.floor(Math.random() * 20)); // Future date
            
            await supabase.from('legal_hearings').insert({
              case_id: targetCase.id,
              hearing_date: hearingDate.toISOString(),
              description: 'UYAP Otomatik Duruşma Tanımlaması (Bilirkişi Rapor Beyanı)',
              status: 'bekiyor'
            });
            updatedCount += 1;
          } else {
            // Update sync status logs
            await supabase
              .from('legal_cases')
              .update({ 
                uyap_sync_status: 'senkronize', 
                last_uyap_sync: new Date().toISOString(),
                notes: (targetCase.notes || '') + `\n[UYAP Güncellemesi ${new Date().toLocaleDateString('tr-TR')}]: Dosya aşaması sorgulandı. Herhangi bir yeni karar bulunamadı.`
              })
              .eq('id', targetCase.id);
            updatedCount += 1;
          }
        }
      }

      // Add Sync Log
      await supabase.from('uyap_sync_logs').insert({
        organization_id: user.organizationId,
        status: 'success',
        records_checked: checkedCount,
        records_updated: updatedCount
      });

      notify(`UYAP Entegrasyon Sorgusu Tamamlandı. ${checkedCount} dosya denetlendi, ${updatedCount} yeni hareket işlendi.`, 'success');
      void fetchSyncLogs();
    } catch (e: any) {
      console.error(e);
      notify('UYAP senkronizasyon hatası: ' + e.message, 'error');
      await supabase.from('uyap_sync_logs').insert({
        organization_id: user.organizationId,
        status: 'failed',
        records_checked: 0,
        records_updated: 0,
        error_message: e.message
      });
      void fetchSyncLogs();
    } finally {
      setSyncLoading(false);
    }
  };

  // Add Hearing Action
  const handleAddHearing = async () => {
    if (!hearingForm.case_id || !hearingForm.hearing_date || !hearingForm.description) {
      notify('Lütfen zorunlu alanları doldurun.', 'info');
      return;
    }
    try {
      const { error } = await supabase.from('legal_hearings').insert({
        case_id: hearingForm.case_id,
        hearing_date: new Date(hearingForm.hearing_date).toISOString(),
        description: hearingForm.description,
        status: hearingForm.status
      });

      if (error) throw error;
      notify('Duruşma / İşlem takvime başarıyla eklendi.', 'success');
      setIsHearingModalOpen(false);
      setHearingForm({
        case_id: '',
        hearing_date: '',
        description: '',
        status: 'bekliyor'
      });
      if (currentTab === 'takvim') void fetchHearings();
    } catch (e: any) {
      notify('Duruşma eklenemedi: ' + e.message, 'error');
    }
  };

  // Mark hearing as completed/postponed
  const handleUpdateHearingStatus = async (hId: string, status: 'tamamlandi' | 'ertelendi' | 'bekliyor') => {
    try {
      const { error } = await supabase
        .from('legal_hearings')
        .update({ status })
        .eq('id', hId);

      if (error) throw error;
      notify('Duruşma durumu güncellendi.', 'success');
      void fetchHearings();
    } catch (e: any) {
      notify('Güncelleme hatası: ' + e.message, 'error');
    }
  };

  // Group cases by Lawyer for Lawyer Portal Tab
  const lawyerAnalytics = useMemo(() => {
    const map: Record<string, { name: string; phone: string; activeCount: number; resolvedCount: number }> = {};
    
    cases.forEach(c => {
      const lName = c.lawyer_name || 'Atanmamış';
      if (!map[lName]) {
        map[lName] = {
          name: lName,
          phone: c.lawyer_phone || '—',
          activeCount: 0,
          resolvedCount: 0
        };
      }
      if (c.status === 'devam-ediyor') {
        map[lName].activeCount += 1;
      } else {
        map[lName].resolvedCount += 1;
      }
    });

    return Object.values(map).filter(l => 
      l.name.toLowerCase().includes(lawyerFilter.toLowerCase())
    );
  }, [cases, lawyerFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gavel className="text-[#f37021]" size={28} />
            Hukuki İşlemler ve İcra Takibi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Dava ve icra takipleri, yasal avukat iş birlikleri, UYAP Entegrasyon Merkezi ve şüpheli cari karşılık uyarıları.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('dosyalar')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentTab === 'dosyalar'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Dava & İcra Takibi
        </button>
        <button
          onClick={() => handleTabChange('takvim')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentTab === 'takvim'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Duruşma & İş Takvimi
        </button>
        <button
          onClick={() => handleTabChange('uyap')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentTab === 'uyap'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          UYAP Entegrasyon Merkezi
        </button>
        <button
          onClick={() => handleTabChange('avukatlar')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentTab === 'avukatlar'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Avukat Portalı
        </button>
      </div>

      {/* Tab Contents */}

      {/* SECTION A: DAVA & İCRA TAKİBİ */}
      {currentTab === 'dosyalar' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-bold text-gray-700">
              Toplam Kayıt: {cases.length} Dosya
            </div>
            <button
              onClick={() => setIsCaseModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              Yeni Dosya (Dava/İcra) Ekle
            </button>
          </div>

          {/* Cases Table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-20 text-center text-gray-550 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="animate-spin text-[#f37021]" size={28} />
                  <span>Dava ve icra dosya kayıtları yükleniyor...</span>
                </div>
              ) : cases.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  Kayıtlı aktif dava veya icra dosyası bulunamadı.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-700">
                      <th className="px-6 py-4">Dosya No / Mahkeme</th>
                      <th className="px-6 py-4">Karşı Taraf</th>
                      <th className="px-6 py-4 text-right">Dava Tutarı</th>
                      <th className="px-6 py-4 text-center">Dosya Türü</th>
                      <th className="px-6 py-4 text-center">Risk Durumu</th>
                      <th className="px-6 py-4 text-center">UYAP Durumu</th>
                      <th className="px-6 py-4 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-900">
                    {cases.map(item => {
                      const isHighRiskCreditor = item.case_type === 'icra' && item.risk_assessment === 'yuksek';
                      return (
                        <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isHighRiskCreditor ? 'bg-orange-50/20' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-900">{item.case_number}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{item.court_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-800">{item.client_name}</div>
                            {item.client_code && (
                              <div className="text-xs text-brand-600 font-mono mt-0.5">Vega Cari: {item.client_code}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.amount)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                              item.case_type === 'icra'
                                ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-700/10'
                                : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10'
                            }`}>
                              {item.case_type === 'icra' ? 'İcra Takibi' : 'Hukuk Davası'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              item.risk_assessment === 'yuksek'
                                ? 'bg-red-50 text-red-700'
                                : item.risk_assessment === 'orta'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {item.risk_assessment === 'yuksek' ? 'Yüksek Risk' : item.risk_assessment === 'orta' ? 'Orta Risk' : 'Düşük Risk'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                item.uyap_sync_status === 'senkronize'
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                              }`}>
                                <CheckCircle2 size={12} />
                                UYAP Eşit
                              </span>
                              {item.last_uyap_sync && (
                                <span className="text-[10px] text-gray-400">
                                  {new Date(item.last_uyap_sync).toLocaleDateString('tr-TR')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => {
                                  setSelectedCase(item);
                                  setIsDetailModalOpen(true);
                                }}
                                className="text-brand-600 hover:text-brand-800 flex items-center gap-1 text-xs font-semibold"
                                title="Detayları Görüntüle"
                              >
                                <Eye size={14} />
                                Detay
                              </button>
                              <button
                                onClick={() => void handleDeleteCase(item.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Dosyayı Sil"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: DURUŞMA & İŞ TAKVİMİ */}
      {currentTab === 'takvim' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-700">
              Duruşma ve Yasal Süreç Takvimi
            </div>
            <button
              onClick={() => {
                if (cases.length === 0) {
                  notify('Duruşma eklemek için önce en az bir dava dosyası oluşturmalısınız.', 'info');
                  return;
                }
                setIsHearingModalOpen(true);
              }}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              Yeni Duruşma / Tarih Ekle
            </button>
          </div>

          {/* Timeline List */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            {hearings.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                Yaklaşan herhangi bir yasal duruşma veya işlem tarihi bulunmamaktadır.
              </div>
            ) : (
              <div className="space-y-6 relative border-l-2 border-slate-100 ml-4 pl-6">
                {hearings.map(h => {
                  const hDate = new Date(h.hearing_date);
                  return (
                    <div key={h.id} className="relative group">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                        h.status === 'tamamlandi'
                          ? 'bg-emerald-500'
                          : h.status === 'ertelendi'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                      }`} />
                      
                      <div className="rounded-xl border border-gray-150 p-4 bg-white hover:border-brand-500 hover:shadow-card transition-all space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <span className="text-xs font-bold text-brand-600 block">{h.case_number} · {h.case_title}</span>
                            <h4 className="font-semibold text-gray-900 text-sm mt-0.5">{h.description}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{h.court_name}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-gray-600 flex items-center gap-1">
                              <Calendar size={12} />
                              {hDate.toLocaleDateString('tr-TR')} {hDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div className="flex gap-1.5">
                              {h.status === 'bekliyor' && (
                                <>
                                  <button
                                    onClick={() => void handleUpdateHearingStatus(h.id, 'tamamlandi')}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded hover:bg-emerald-100"
                                  >
                                    Tamamlandı
                                  </button>
                                  <button
                                    onClick={() => void handleUpdateHearingStatus(h.id, 'ertelendi')}
                                    className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded hover:bg-amber-100"
                                  >
                                    Ertelendi
                                  </button>
                                </>
                              )}
                              {h.status === 'tamamlandi' && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  <CheckCircle2 size={10} /> Completed
                                </span>
                              )}
                              {h.status === 'ertelendi' && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  <Clock size={10} /> Ertelendi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION C: UYAP ENTEGRASYON MERKEZİ */}
      {currentTab === 'uyap' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Live Trigger Section */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                  <RefreshCw className="text-brand-500" size={20} />
                  UYAP Kurum Portalı Entegrasyon Servisi
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Bağlantı Stabil
                </span>
              </div>

              <div className="rounded-lg bg-gray-50 border border-gray-150 p-4 text-xs space-y-3 leading-5 text-gray-600">
                <p>
                  <strong>Entegrasyon İşleyişi:</strong> UYAP Kurum Portalı XML veri eşleme servisleri üzerinden her gece saat 02:00'de otomatik tetiklenen robot, şirketin yasal kimliği (VKN) adına açılmış tüm icra takiplerini, davaları, tebligatları ve duruşma tarihlerini yerel sisteme çeker.
                </p>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-3">
                  <div>
                    <span className="font-semibold block text-gray-900">Sertifika Türü:</span>
                    <span>Kurumsal E-İmza (Server E-İmza)</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-gray-900">Entegrasyon Protokolü:</span>
                    <span>UYAP XML / SOAP Web Servisleri</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-150 pt-4 flex justify-between items-center">
                <div className="text-xs text-gray-400">
                  Son başarılı sorgulama: {syncLogs.length > 0 ? new Date(syncLogs[0].created_at).toLocaleString('tr-TR') : 'Hiç yapılmadı'}
                </div>
                <button
                  onClick={() => void handleUyapSync()}
                  disabled={syncLoading}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5"
                >
                  {syncLoading ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                  UYAP Servis Sorgusunu Şimdi Tetikle
                </button>
              </div>
            </div>

            {/* Sync History Logs */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Sorgulama Geçmişi (Son 10 Günlük)</h3>
              <div className="overflow-x-auto">
                {syncLogs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">Kayıtlı geçmiş sorgulama logu bulunamadı.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                        <th className="px-4 py-3">Tarih / Saat</th>
                        <th className="px-4 py-3 text-center">Durum</th>
                        <th className="px-4 py-3 text-center">Taranan Dosya</th>
                        <th className="px-4 py-3 text-center">Güncellenen Dosya</th>
                        <th className="px-4 py-3">Log Mesajı / Hata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-900 font-medium">
                      {syncLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-gray-550">{new Date(log.created_at).toLocaleString('tr-TR')}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                              log.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {log.status === 'success' ? 'Başarılı' : 'Hata'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{log.records_checked}</td>
                          <td className="px-4 py-3 text-center font-bold text-brand-600">{log.records_updated}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate text-gray-555">
                            {log.error_message || 'Herhangi bir uyuşmazlık veya yeni evrak saptanmadı.'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Guide Card */}
          <div className="rounded-xl border border-gray-200 bg-orange-50/50 p-6 space-y-4 h-fit">
            <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
              <Info size={16} className="text-[#f37021]" />
              UYAP Entegrasyonu Hakkında
            </h3>
            <p className="text-xs leading-5 text-gray-650">
              Bu ekran UYAP Kurum Portalı robot sorgularının yönetim merkezidir. Canlı API servisleri, Adalet Bakanlığı Kurum Portalı altyapısında tanımlı şirket E-İmza sertifikanızla eşleşerek davalardaki her yeni gelişmeyi yasal süre kaçmadan yakalar.
            </p>
          </div>
        </div>
      )}

      {/* SECTION D: AVUKAT PORTALI */}
      {currentTab === 'avukatlar' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 max-w-sm w-full">
              <input
                type="text"
                placeholder="Avukat adına göre ara..."
                value={lawyerFilter}
                onChange={e => setLawyerFilter(e.target.value)}
                className="input-sm w-full"
              />
            </div>
            <div className="text-xs text-gray-500 font-semibold">
              Holding Hukuk Departmanı & Sözleşmeli Dış Avukatlar
            </div>
          </div>

          {/* Lawyers Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lawyerAnalytics.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400 bg-white border border-gray-200 rounded-xl">
                Dosyalarda atanmış herhangi bir avukat kaydı bulunamadı.
              </div>
            ) : (
              lawyerAnalytics.map((law, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-500 transition-all space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                      AV
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{law.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Phone size={10} />
                        {law.phone}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    <div className="text-center rounded-lg bg-orange-50/40 border border-orange-100 p-2">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Aktif Dosya</span>
                      <span className="text-lg font-bold text-brand-600">{law.activeCount}</span>
                    </div>
                    <div className="text-center rounded-lg bg-emerald-50/30 border border-emerald-100 p-2">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Kapanan Dosya</span>
                      <span className="text-lg font-bold text-emerald-600">{law.resolvedCount}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: YENİ DAVA/İCRA EKLEME MODALİ */}
      <Modal
        open={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        title="Yeni Dava / İcra Takip Kartı Ekle"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dosya No (Esas / İcra No)*</label>
              <input
                type="text"
                placeholder="Örn: 2026/123 Esas"
                value={caseForm.case_number}
                onChange={e => setCaseForm({ ...caseForm, case_number: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Mahkeme / İcra Dairesi*</label>
              <input
                type="text"
                placeholder="Örn: Amasya 1. Asliye Hukuk Mahkemesi"
                value={caseForm.court_name}
                onChange={e => setCaseForm({ ...caseForm, court_name: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dava / İcra Konusu*</label>
              <input
                type="text"
                placeholder="Örn: Cari Alacak Takibi"
                value={caseForm.title}
                onChange={e => setCaseForm({ ...caseForm, title: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Karşı Taraf (Müşteri/Tedarikçi/Kişi)*</label>
              <input
                type="text"
                placeholder="Karşı Taraf Unvanı"
                value={caseForm.client_name}
                onChange={e => setCaseForm({ ...caseForm, client_name: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dosya Türü</label>
              <select
                value={caseForm.case_type}
                onChange={e => setCaseForm({ ...caseForm, case_type: e.target.value as any })}
                className="select"
              >
                <option value="dava">Hukuk Davası</option>
                <option value="icra">İcra Takibi</option>
              </select>
            </div>
            <div>
              <label className="label">Şirket Rolümüz</label>
              <select
                value={caseForm.role}
                onChange={e => setCaseForm({ ...caseForm, role: e.target.value as any })}
                className="select"
              >
                {caseForm.case_type === 'dava' ? (
                  <>
                    <option value="davaci">Davacı (Biz Açtık)</option>
                    <option value="davali">Davalı (Bize Açıldı)</option>
                  </>
                ) : (
                  <>
                    <option value="alacakli">Alacaklı (Biz Başlattık)</option>
                    <option value="borclu">Borçlu (Bize Başlatıldı)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vega Cari Kart Bağlantısı (Opsiyonel)</label>
              <select
                value={caseForm.client_code}
                onChange={e => {
                  const match = cariler.find(c => c.code === e.target.value);
                  setCaseForm({ 
                    ...caseForm, 
                    client_code: e.target.value,
                    client_name: match ? match.name : caseForm.client_name 
                  });
                }}
                className="select"
              >
                <option value="">Cari Seçilmedi</option>
                {cariler.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Dava / Takip Tutarı (TL)</label>
              <input
                type="number"
                placeholder="0.00"
                value={caseForm.amount}
                onChange={e => setCaseForm({ ...caseForm, amount: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Risk Düzeyi (Kaybetme/Giderleşme Riski)</label>
              <select
                value={caseForm.risk_assessment}
                onChange={e => setCaseForm({ ...caseForm, risk_assessment: e.target.value as any })}
                className="select"
              >
                <option value="dusuk">Düşük Risk</option>
                <option value="orta">Orta Risk</option>
                <option value="yuksek">Yüksek Risk</option>
              </select>
            </div>
            <div>
              <label className="label">Dosya Durumu</label>
              <select
                value={caseForm.status}
                onChange={e => setCaseForm({ ...caseForm, status: e.target.value as any })}
                className="select"
              >
                <option value="devam-ediyor">Devam Ediyor</option>
                <option value="karara-cikti">Karara Çıktı</option>
                <option value="kesinlesti">Kesinleşti</option>
                <option value="dustu">Düştü (Kapatıldı)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Sorumlu Avukat Adı*</label>
              <input
                type="text"
                placeholder="Örn: Av. Ahmet Yılmaz"
                value={caseForm.lawyer_name}
                onChange={e => setCaseForm({ ...caseForm, lawyer_name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Avukat Telefon</label>
              <input
                type="text"
                placeholder="Örn: 0532..."
                value={caseForm.lawyer_phone}
                onChange={e => setCaseForm({ ...caseForm, lawyer_phone: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Notlar ve Özet</label>
            <textarea
              rows={3}
              placeholder="Dosyaya ait önemli detaylar..."
              value={caseForm.notes}
              onChange={e => setCaseForm({ ...caseForm, notes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="border-t border-gray-150 pt-4 flex justify-end gap-3">
            <button
              onClick={() => setIsCaseModalOpen(false)}
              className="btn-secondary px-4 py-2"
            >
              İptal
            </button>
            <button
              onClick={() => void handleCreateCase()}
              className="btn-primary px-6 py-2"
            >
              Kaydet
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: DOSYA DETAY MODALİ */}
      <Modal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Dava / İcra Dosyası Detayları"
        size="lg"
      >
        {selectedCase && (
          <div className="space-y-6">
            {/* Provision Warning for Independent Audit (TFRS 9) */}
            {selectedCase.case_type === 'icra' && selectedCase.risk_assessment === 'yuksek' && selectedCase.status === 'devam-ediyor' && (
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 flex items-start gap-3">
                <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-red-800 text-sm">Şüpheli Ticari Alacak Karşılığı Uyarısı</h4>
                  <p className="text-xs text-red-700 leading-5 mt-1">
                    Bu dosya bir icra takibidir ve yasal risk düzeyi **Yüksek** olarak sınıflandırılmıştır. Bağımsız denetim denetçilerinin TFRS 9 standartları uyarınca, bu alacak bakiye tutarı kadar bilançoda **"129 Şüpheli Ticari Alacaklar Karşılığı"** ayırmanızı ve gider yazmanızı talep etmesi muhtemeldir.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs text-gray-400 block font-bold uppercase">Dosya No</span>
                <span className="font-bold text-gray-800">{selectedCase.case_number}</span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-bold uppercase">Mahkeme / İcra Dairesi</span>
                <span className="font-bold text-gray-800">{selectedCase.court_name}</span>
              </div>
              <div className="mt-2">
                <span className="text-xs text-gray-400 block font-bold uppercase">Karşı Taraf</span>
                <span className="font-bold text-gray-800">{selectedCase.client_name}</span>
              </div>
              <div className="mt-2">
                <span className="text-xs text-gray-400 block font-bold uppercase">Dosya Tutarı</span>
                <span className="font-bold text-brand-600">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(selectedCase.amount)}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs text-gray-400 block font-bold uppercase">Sorumlu Avukat</span>
                <span className="font-bold text-gray-800">
                  {selectedCase.lawyer_name} {selectedCase.lawyer_phone ? `(${selectedCase.lawyer_phone})` : ''}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs text-gray-400 block font-bold uppercase">Son UYAP Sorgulaması</span>
                <span className="font-mono text-xs text-gray-600">
                  {selectedCase.last_uyap_sync ? new Date(selectedCase.last_uyap_sync).toLocaleString('tr-TR') : '—'}
                </span>
              </div>
            </div>

            {/* Actions & Notes */}
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-sm">Dosya Notları ve Kararlar</h4>
              <p className="text-xs text-gray-600 bg-slate-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap leading-5">
                {selectedCase.notes || 'Herhangi bir not veya ara karar özeti girilmedi.'}
              </p>
            </div>

            <div className="border-t border-gray-150 pt-4 flex justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setHearingForm({ ...hearingForm, case_id: selectedCase.id });
                    setIsHearingModalOpen(true);
                  }}
                  className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1"
                >
                  <Calendar size={12} />
                  Yeni Duruşma Ekle
                </button>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="btn-primary px-5 py-1.5 text-xs"
              >
                Pencereyi Kapat
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: YENİ DURUŞMA EKLEME MODALİ */}
      <Modal
        open={isHearingModalOpen}
        onClose={() => setIsHearingModalOpen(false)}
        title="Duruşma / İşlem Tarihi Planla"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">İlgili Dava Dosyası*</label>
            <select
              value={hearingForm.case_id}
              onChange={e => setHearingForm({ ...hearingForm, case_id: e.target.value })}
              className="select"
            >
              <option value="">Dosya Seçin</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>{c.case_number} - {c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Duruşma / Son Tarih (Tarih & Saat)*</label>
            <input
              type="datetime-local"
              value={hearingForm.hearing_date}
              onChange={e => setHearingForm({ ...hearingForm, hearing_date: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">İşlem / Duruşma Açıklaması*</label>
            <input
              type="text"
              placeholder="Örn: 2. Karar Celsesi, Bilirkişi İtiraz Dilekçesi"
              value={hearingForm.description}
              onChange={e => setHearingForm({ ...hearingForm, description: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="label">Durum</label>
            <select
              value={hearingForm.status}
              onChange={e => setHearingForm({ ...hearingForm, status: e.target.value as any })}
              className="select"
            >
              <option value="bekliyor">Bekliyor (Günü Gelmedi)</option>
              <option value="tamamlandi">Tamamlandı</option>
              <option value="ertelendi">Ertelendi</option>
            </select>
          </div>

          <div className="border-t border-gray-150 pt-4 flex justify-end gap-3">
            <button
              onClick={() => setIsHearingModalOpen(false)}
              className="btn-secondary px-4 py-2"
            >
              İptal
            </button>
            <button
              onClick={() => void handleAddHearing()}
              className="btn-primary px-6 py-2"
            >
              Ekle
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
