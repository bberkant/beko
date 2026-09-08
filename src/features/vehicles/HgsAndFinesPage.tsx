import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Waypoints, 
  AlertTriangle, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  ArrowRight, 
  CircleDollarSign, 
  Clock 
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ModuleFileActions } from '../../components/ui/ModuleFileActions';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useVehicles } from './store';
import { TrafficFineInput } from './types';

type HgsPaymentStatus = 'bekliyor' | 'odendi' | 'itiraz';

interface Passage {
  id: string;
  vehicle_id: string;
  passage_date: string;
  entry_point: string;
  exit_point: string;
  amount: number;
  hgs_account: string;
  payment_status: HgsPaymentStatus;
  description: string | null;
}

interface HgsFormState {
  vehicleId: string;
  passageDate: string;
  entryPoint: string;
  exitPoint: string;
  amount: string;
  hgsAccount: string;
  paymentStatus: HgsPaymentStatus;
  description: string;
}

const emptyHgsForm = (): HgsFormState => ({
  vehicleId: '',
  passageDate: new Date().toISOString().slice(0, 16),
  entryPoint: '',
  exitPoint: '',
  amount: '',
  hgsAccount: '',
  paymentStatus: 'bekliyor',
  description: ''
});

const hgsStatusLabel: Record<HgsPaymentStatus, string> = {
  bekliyor: 'Bekliyor',
  odendi: 'Ödendi',
  itiraz: 'İtiraz'
};

const hgsStatusClass: Record<HgsPaymentStatus, string> = {
  bekliyor: 'bg-amber-50 text-amber-700 border-amber-200',
  odendi: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  itiraz: 'bg-red-50 text-red-700 border-red-200'
};

const fineStatusLabel: Record<string, string> = {
  odenmedi: 'Ödenmedi',
  odendi: 'Ödendi',
  itiraz: 'İtiraz'
};

const fineStatusClass: Record<string, string> = {
  odenmedi: 'bg-red-50 text-red-700 border-red-200',
  odendi: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  itiraz: 'bg-amber-50 text-amber-700 border-amber-200'
};

const money = (value: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);

export function HgsAndFinesPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { vehicles, drivers, fines, saveFine, updateFineStatus } = useVehicles();
  
  const [activeTab, setActiveTab] = useState<'hgs' | 'fines'>('hgs');
  const [query, setQuery] = useState('');
  
  // HGS state
  const [hgsItems, setHgsItems] = useState<Passage[]>([]);
  const [hgsLoading, setHgsLoading] = useState(true);
  const [hgsOpen, setHgsOpen] = useState(false);
  const [editingHgs, setEditingHgs] = useState<Passage>();
  const [hgsForm, setHgsForm] = useState<HgsFormState>(emptyHgsForm());
  const [hgsSaving, setHgsSaving] = useState(false);

  // Fines state
  const [fineOpen, setFineOpen] = useState(false);
  const [fineForm, setFineForm] = useState<TrafficFineInput>({
    vehicleId: '',
    fineDate: new Date().toISOString().slice(0, 10),
    fineNumber: '',
    violationType: '',
    location: '',
    amount: 0,
    paymentStatus: 'odenmedi'
  });
  const [fineSaving, setFineSaving] = useState(false);

  const canWrite = ['Süper Admin', 'Admin', 'Developer', 'Yönetici', 'Muhasebe', 'Finans'].includes(user?.role ?? '');

  const refreshHgs = useCallback(async () => {
    if (!user?.organizationId) return;
    setHgsLoading(true);
    const { data, error } = await supabase
      .from('hgs_passages')
      .select('*')
      .eq('organization_id', user.organizationId)
      .order('passage_date', { ascending: false });
    
    if (error) {
      notify(error.message, 'error');
    } else {
      setHgsItems((data ?? []).map((x) => ({ ...x, amount: Number(x.amount) })) as Passage[]);
    }
    setHgsLoading(false);
  }, [user?.organizationId, notify]);

  useEffect(() => {
    void refreshHgs();
  }, [refreshHgs]);

  // HGS Filtered
  const filteredHgs = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return hgsItems;
    return hgsItems.filter((x) => {
      const vehicle = vehicles.find((v) => v.id === x.vehicle_id);
      const str = `${vehicle?.plate ?? ''} ${x.entry_point} ${x.exit_point} ${x.hgs_account} ${x.description ?? ''}`.toLocaleLowerCase('tr-TR');
      return str.includes(q);
    });
  }, [hgsItems, vehicles, query]);

  // Fines Filtered
  const filteredFines = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return fines;
    return fines.filter((f) => {
      const vehicle = vehicles.find((v) => v.id === f.vehicleId);
      const driver = drivers.find((d) => d.id === f.driverId);
      const str = `${vehicle?.plate ?? ''} ${driver?.fullName ?? ''} ${f.fineNumber} ${f.violationType} ${f.location} ${f.description ?? ''}`.toLocaleLowerCase('tr-TR');
      return str.includes(q);
    });
  }, [fines, vehicles, drivers, query]);

  // HGS Handlers
  const openHgsModal = (item?: Passage) => {
    setEditingHgs(item);
    setHgsForm(
      item
        ? {
            vehicleId: item.vehicle_id,
            passageDate: item.passage_date.slice(0, 16),
            entryPoint: item.entry_point,
            exitPoint: item.exit_point,
            amount: String(item.amount),
            hgsAccount: item.hgs_account,
            paymentStatus: item.payment_status,
            description: item.description ?? ''
          }
        : {
            ...emptyHgsForm(),
            vehicleId: vehicles[0]?.id ?? ''
          }
    );
    setHgsOpen(true);
  };

  const saveHgs = async () => {
    if (!user?.organizationId || !hgsForm.vehicleId || !hgsForm.passageDate || !hgsForm.entryPoint.trim() || !hgsForm.exitPoint.trim() || Number(hgsForm.amount) < 0) {
      notify('Araç, tarih, giriş, çıkış ve geçerli tutar zorunludur.', 'error');
      return;
    }
    setHgsSaving(true);
    const payload = {
      organization_id: user.organizationId,
      vehicle_id: hgsForm.vehicleId,
      passage_date: new Date(hgsForm.passageDate).toISOString(),
      entry_point: hgsForm.entryPoint.trim(),
      exit_point: hgsForm.exitPoint.trim(),
      amount: Number(hgsForm.amount) || 0,
      hgs_account: hgsForm.hgsAccount.trim(),
      payment_status: hgsForm.paymentStatus,
      description: hgsForm.description.trim() || null,
      updated_at: new Date().toISOString()
    };
    const result = editingHgs
      ? await supabase.from('hgs_passages').update(payload).eq('id', editingHgs.id).eq('organization_id', user.organizationId)
      : await supabase.from('hgs_passages').insert(payload);
    setHgsSaving(false);
    if (result.error) {
      notify(result.error.message, 'error');
      return;
    }
    notify(editingHgs ? 'HGS geçişi güncellendi.' : 'HGS geçişi eklendi.', 'success');
    setHgsOpen(false);
    await refreshHgs();
  };

  const removeHgs = async (item: Passage) => {
    if (!confirm('Bu HGS geçişi silinsin mi?')) return;
    const { error } = await supabase.from('hgs_passages').delete().eq('id', item.id).eq('organization_id', user?.organizationId);
    if (error) {
      notify(error.message, 'error');
    } else {
      notify('HGS geçişi silindi.', 'success');
      await refreshHgs();
    }
  };

  // Fine Handlers
  const saveFineEntry = async () => {
    if (!fineForm.vehicleId || !fineForm.fineDate || !fineForm.violationType.trim() || Number(fineForm.amount) <= 0) {
      notify('Araç, tarih, ihlal türü ve geçerli ceza tutarı zorunludur.', 'error');
      return;
    }
    setFineSaving(true);
    try {
      await saveFine(fineForm);
      notify('Trafik cezası kaydedildi.', 'success');
      setFineOpen(false);
      setFineForm({
        vehicleId: vehicles[0]?.id ?? '',
        fineDate: new Date().toISOString().slice(0, 10),
        fineNumber: '',
        violationType: '',
        location: '',
        amount: 0,
        paymentStatus: 'odenmedi'
      });
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Ceza kaydedilemedi', 'error');
    } finally {
      setFineSaving(false);
    }
  };

  // Metrics
  const totalHgs = hgsItems.reduce((s, x) => s + x.amount, 0);
  const pendingHgs = hgsItems.filter((x) => x.payment_status === 'bekliyor').reduce((s, x) => s + x.amount, 0);
  
  const totalFines = fines.reduce((s, f) => s + f.amount, 0);
  const unpaidFines = fines.filter((f) => f.paymentStatus === 'odenmedi').reduce((s, f) => s + f.amount, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="HGS - Geçiş & Trafik Cezaları"
        description="Otoyol ve köprü geçişleri ile araç trafik cezalarını, ödeme ve itiraz süreçlerini tek ekrandan yönetin."
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'hgs' ? (
              <>
                <ModuleFileActions
                  module="vehicles"
                  exportName="hgs-gecisleri"
                  uploadEnabled={false}
                  rows={hgsItems.map((x) => ({
                    Araç: vehicles.find((v) => v.id === x.vehicle_id)?.plate,
                    Tarih: x.passage_date,
                    Giriş: x.entry_point,
                    Çıkış: x.exit_point,
                    Tutar: x.amount,
                    'HGS Hesabı': x.hgs_account,
                    Durum: hgsStatusLabel[x.payment_status]
                  }))}
                />
                {canWrite && (
                  <button className="btn-primary" onClick={() => openHgsModal()}>
                    <Plus size={16} />
                    Geçiş Ekle
                  </button>
                )}
              </>
            ) : (
              <>
                <ModuleFileActions
                  module="traffic_fines"
                  exportName="trafik-cezalari"
                  rows={fines.map((f) => ({
                    Tarih: f.fineDate,
                    Araç: vehicles.find((v) => v.id === f.vehicleId)?.plate,
                    Şoför: drivers.find((d) => d.id === f.driverId)?.fullName,
                    'Ceza No': f.fineNumber,
                    İhlal: f.violationType,
                    Konum: f.location,
                    Tutar: f.amount,
                    Durum: fineStatusLabel[f.paymentStatus]
                  }))}
                />
                {canWrite && (
                  <button className="btn-primary" onClick={() => {
                    setFineForm({
                      vehicleId: vehicles[0]?.id ?? '',
                      fineDate: new Date().toISOString().slice(0, 10),
                      fineNumber: '',
                      violationType: '',
                      location: '',
                      amount: 0,
                      paymentStatus: 'odenmedi'
                    });
                    setFineOpen(true);
                  }}>
                    <Plus size={16} />
                    Ceza Ekle
                  </button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('hgs')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'hgs'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <Waypoints size={17} />
          HGS - Geçiş Hareketleri ({hgsItems.length})
        </button>
        <button
          onClick={() => setActiveTab('fines')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'fines'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <AlertTriangle size={17} />
          Trafik Cezaları ({fines.length})
        </button>
      </div>

      {/* Metrics */}
      {activeTab === 'hgs' ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between text-gray-500">
              <span className="text-xs font-medium">Toplam HGS Geçişi</span>
              <Waypoints size={16} className="text-brand-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{hgsItems.length}</div>
            <p className="mt-1 text-xs text-gray-400">Kayıtlı otoyol/köprü geçişi</p>
          </div>
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between text-gray-500">
              <span className="text-xs font-medium">Toplam Geçiş Tutarı</span>
              <CircleDollarSign size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{money(totalHgs)}</div>
            <p className="mt-1 text-xs text-gray-400">Tüm zamanların toplamı</p>
          </div>
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between text-gray-500">
              <span className="text-xs font-medium">Bekleyen / Ödenmemiş Tutar</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-600">{money(pendingHgs)}</div>
            <p className="mt-1 text-xs text-gray-400">{hgsItems.filter(x => x.payment_status === 'bekliyor').length} adet bekleyen geçiş</p>
          </div>
        </div>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between text-gray-500">
              <span className="text-xs font-medium">Toplam Ceza Tutarı</span>
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{money(totalFines)}</div>
            <p className="mt-1 text-xs text-gray-400">{fines.length} adet işlenmiş trafik cezası</p>
          </div>
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between text-gray-500">
              <span className="text-xs font-medium">Ödenmemiş Ceza Tutarı</span>
              <CircleDollarSign size={16} className="text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{money(unpaidFines)}</div>
            <p className="mt-1 text-xs text-gray-400">{fines.filter(f => f.paymentStatus === 'odenmedi').length} adet ödenmemiş</p>
          </div>
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between text-gray-500">
              <span className="text-xs font-medium">İtirazdaki Cezalar</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {fines.filter((f) => f.paymentStatus === 'itiraz').length} Adet
            </div>
            <p className="mt-1 text-xs text-gray-400">İtiraz süreci devam edenler</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input
          className="input pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeTab === 'hgs' ? 'Plaka, güzergâh, HGS hesabı ara...' : 'Plaka, şoför, ceza no, ihlal ara...'}
        />
      </div>

      {/* HGS View */}
      {activeTab === 'hgs' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">Tarih</th>
                <th className="table-th">Araç</th>
                <th className="table-th">Güzergâh</th>
                <th className="table-th">HGS Hesabı</th>
                <th className="table-th">Tutar</th>
                <th className="table-th">Durum</th>
                <th className="table-th text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {hgsLoading ? (
                <tr>
                  <td colSpan={7} className="table-td py-12 text-center text-gray-400">
                    Geçişler yükleniyor...
                  </td>
                </tr>
              ) : filteredHgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-td py-12 text-center text-gray-400">
                    HGS geçiş kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredHgs.map((x) => (
                  <tr key={x.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="table-td whitespace-nowrap">
                      {new Date(x.passage_date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="table-td font-semibold text-gray-900">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-bold text-gray-800">
                        {vehicles.find((v) => v.id === x.vehicle_id)?.plate ?? '—'}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className="font-medium text-gray-800">{x.entry_point}</span>
                      <ArrowRight size={13} className="mx-2 inline text-gray-400" />
                      <span className="font-medium text-gray-800">{x.exit_point}</span>
                      {x.description && <span className="block text-xs text-gray-400">{x.description}</span>}
                    </td>
                    <td className="table-td text-gray-600">{x.hgs_account || '—'}</td>
                    <td className="table-td font-bold text-gray-900">{money(x.amount)}</td>
                    <td className="table-td">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${hgsStatusClass[x.payment_status]}`}>
                        {hgsStatusLabel[x.payment_status]}
                      </span>
                    </td>
                    <td className="table-td text-right">
                      {canWrite && (
                        <div className="flex justify-end gap-2">
                          <button className="text-gray-500 hover:text-brand-600 p-1" onClick={() => openHgsModal(x)} title="Düzenle">
                            <Pencil size={15} />
                          </button>
                          <button className="text-gray-400 hover:text-red-600 p-1" onClick={() => void removeHgs(x)} title="Sil">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Fines View */}
      {activeTab === 'fines' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">Tarih</th>
                <th className="table-th">Araç</th>
                <th className="table-th">Şoför</th>
                <th className="table-th">Ceza No / İhlal</th>
                <th className="table-th">Tutar</th>
                <th className="table-th">Durum</th>
                <th className="table-th">Durum Güncelle</th>
              </tr>
            </thead>
            <tbody>
              {filteredFines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-td py-12 text-center text-gray-400">
                    Trafik cezası kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredFines.map((f) => (
                  <tr className="border-t border-gray-100 hover:bg-gray-50/50" key={f.id}>
                    <td className="table-td whitespace-nowrap">{f.fineDate}</td>
                    <td className="table-td font-semibold">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono font-bold text-gray-800">
                        {vehicles.find((v) => v.id === f.vehicleId)?.plate || '—'}
                      </span>
                    </td>
                    <td className="table-td text-gray-700">
                      {drivers.find((d) => d.id === f.driverId)?.fullName || '—'}
                    </td>
                    <td className="table-td">
                      <div className="font-medium text-gray-900">{f.violationType}</div>
                      <div className="text-xs text-gray-400">
                        {f.fineNumber ? `No: ${f.fineNumber}` : ''} {f.location ? `• ${f.location}` : ''}
                      </div>
                    </td>
                    <td className="table-td font-bold text-gray-900">{money(f.amount)}</td>
                    <td className="table-td">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${fineStatusClass[f.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
                        {fineStatusLabel[f.paymentStatus] || f.paymentStatus}
                      </span>
                    </td>
                    <td className="table-td">
                      {canWrite ? (
                        <select
                          className="input !py-1 !text-xs"
                          value={f.paymentStatus}
                          onChange={async (e) => {
                            try {
                              await updateFineStatus(f.id, e.target.value as any);
                              notify('Ceza durumu güncellendi.', 'success');
                            } catch (x) {
                              notify(x instanceof Error ? x.message : 'Güncellenemedi', 'error');
                            }
                          }}
                        >
                          <option value="odenmedi">Ödenmedi</option>
                          <option value="odendi">Ödendi</option>
                          <option value="itiraz">İtiraz</option>
                        </select>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* HGS Modal */}
      <Modal open={hgsOpen} onClose={() => setHgsOpen(false)} title={editingHgs ? 'HGS Geçişini Düzenle' : 'Yeni HGS Geçişi'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Araç</span>
            <select
              className="input"
              value={hgsForm.vehicleId}
              onChange={(e) => setHgsForm({ ...hgsForm, vehicleId: e.target.value })}
            >
              <option value="">Araç seçin</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} · {v.brand} {v.model}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Geçiş Tarihi</span>
            <input
              className="input"
              type="datetime-local"
              value={hgsForm.passageDate}
              onChange={(e) => setHgsForm({ ...hgsForm, passageDate: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Giriş Noktası</span>
            <input
              className="input"
              value={hgsForm.entryPoint}
              onChange={(e) => setHgsForm({ ...hgsForm, entryPoint: e.target.value })}
              placeholder="Örn: Mahmutbey"
            />
          </label>
          <label>
            <span className="label">Çıkış Noktası</span>
            <input
              className="input"
              value={hgsForm.exitPoint}
              onChange={(e) => setHgsForm({ ...hgsForm, exitPoint: e.target.value })}
              placeholder="Örn: Çamlıca"
            />
          </label>
          <label>
            <span className="label">Tutar (₺)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={hgsForm.amount}
              onChange={(e) => setHgsForm({ ...hgsForm, amount: e.target.value })}
            />
          </label>
          <label>
            <span className="label">HGS Hesabı / Etiket</span>
            <input
              className="input"
              value={hgsForm.hgsAccount}
              onChange={(e) => setHgsForm({ ...hgsForm, hgsAccount: e.target.value })}
              placeholder="Örn: Garanti HGS 104..."
            />
          </label>
          <label>
            <span className="label">Ödeme Durumu</span>
            <select
              className="input"
              value={hgsForm.paymentStatus}
              onChange={(e) => setHgsForm({ ...hgsForm, paymentStatus: e.target.value as HgsPaymentStatus })}
            >
              {Object.entries(hgsStatusLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="label">Açıklama</span>
            <textarea
              className="input min-h-20"
              value={hgsForm.description}
              onChange={(e) => setHgsForm({ ...hgsForm, description: e.target.value })}
              placeholder="Ek bilgi veya not..."
            />
          </label>
          <button className="btn-primary sm:col-span-2" disabled={hgsSaving} onClick={() => void saveHgs()}>
            {hgsSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </Modal>

      {/* Traffic Fine Modal */}
      <Modal open={fineOpen} onClose={() => setFineOpen(false)} title="Yeni Trafik Cezası Ekle">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Araç *</span>
            <select
              className="input"
              value={fineForm.vehicleId}
              onChange={(e) => setFineForm({ ...fineForm, vehicleId: e.target.value })}
            >
              <option value="">Seçin</option>
              {vehicles.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.plate} · {v.brand} {v.model}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Şoför</span>
            <select
              className="input"
              value={fineForm.driverId || ''}
              onChange={(e) => setFineForm({ ...fineForm, driverId: e.target.value || undefined })}
            >
              <option value="">Şoför atanmadı</option>
              {drivers.map((d) => (
                <option value={d.id} key={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Ceza Tarihi *</span>
            <input
              type="date"
              className="input"
              value={fineForm.fineDate}
              onChange={(e) => setFineForm({ ...fineForm, fineDate: e.target.value })}
            />
          </label>
          <label>
            <span className="label">Ceza / Tutanak No</span>
            <input
              className="input"
              value={fineForm.fineNumber}
              onChange={(e) => setFineForm({ ...fineForm, fineNumber: e.target.value })}
              placeholder="Örn: MB123456"
            />
          </label>
          <label>
            <span className="label">İhlal Türü / Madde *</span>
            <input
              className="input"
              value={fineForm.violationType}
              onChange={(e) => setFineForm({ ...fineForm, violationType: e.target.value })}
              placeholder="Örn: Hız Sınırı Aşımı (51/2-a)"
            />
          </label>
          <label>
            <span className="label">Konum / Bölge</span>
            <input
              className="input"
              value={fineForm.location}
              onChange={(e) => setFineForm({ ...fineForm, location: e.target.value })}
              placeholder="Örn: TEM Otoyolu Kurtköy"
            />
          </label>
          <label>
            <span className="label">Ceza Tutarı (₺) *</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={fineForm.amount || ''}
              onChange={(e) => setFineForm({ ...fineForm, amount: Number(e.target.value) })}
            />
          </label>
          <label>
            <span className="label">Ödeme Durumu</span>
            <select
              className="input"
              value={fineForm.paymentStatus}
              onChange={(e) => setFineForm({ ...fineForm, paymentStatus: e.target.value as any })}
            >
              <option value="odenmedi">Ödenmedi</option>
              <option value="odendi">Ödendi</option>
              <option value="itiraz">İtiraz</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="label">Açıklama</span>
            <textarea
              className="input min-h-20"
              value={fineForm.description || ''}
              onChange={(e) => setFineForm({ ...fineForm, description: e.target.value })}
              placeholder="Ceza detayı..."
            />
          </label>
          <button
            className="btn-primary sm:col-span-2"
            disabled={fineSaving}
            onClick={() => void saveFineEntry()}
          >
            {fineSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
