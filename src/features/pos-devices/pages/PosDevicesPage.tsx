import React, { useState, useMemo, useRef } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Download, 
  ChevronDown, 
  Filter, 
  Pencil, 
  Trash2, 
  Building2, 
  MapPin, 
  MoreVertical,
  X,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useToast } from '../../../lib/toast';
import { usePosDevices } from '../data/store';
import { PosDeviceModal } from '../components/PosDeviceModal';
import { POPULAR_BANKS, POPULAR_LOCATIONS } from '../data/seedData';
import type { PosDevice, PosDeviceFormInput } from '../types';

// Bank badge color styling
export const getBankBadgeStyle = (bankName: string) => {
  const upper = (bankName || '').toUpperCase();
  if (upper.includes('ZİRAAT') || upper.includes('ZIRAAT')) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (upper.includes('GARANTİ') || upper.includes('GARANTI')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (upper.includes('DENİZ') || upper.includes('DENIZ')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (upper.includes('KUVEYT')) {
    return 'bg-teal-50 text-teal-700 border-teal-200';
  }
  if (upper.includes('ALBARAKA')) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  if (upper.includes('AKBANK')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (upper.includes('HALK')) {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  if (upper.includes('VAKIF')) {
    return 'bg-amber-50 text-amber-700 border-amber-300';
  }
  if (upper.includes('YAPI KREDİ') || upper.includes('YAPI KREDI')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

// Location badge styling
export const getLocationBadgeStyle = (location: string) => {
  const upper = (location || '').toUpperCase();
  if (upper.includes('MERKEZ')) {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  if (upper.includes('ATAKUM')) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200';
  }
  if (upper.includes('DEPO')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (upper.includes('FABRİKA') || upper.includes('FABRIKA')) {
    return 'bg-orange-50 text-orange-700 border-orange-200';
  }
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

// Inline editable text cell matching BillListPage
function InlineTextCell({
  value,
  displayValue,
  onSave,
  className = "",
  inputClassName = "",
  placeholder = "—"
}: {
  value: string;
  displayValue: React.ReactNode;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setTempVal(value);
    setEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSave(tempVal);
      setEditing(false);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleBlur = () => {
    onSave(tempVal);
    setEditing(false);
  };

  if (editing) {
    return (
      <td className={`table-td !px-2 !py-1.5 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          className={`input !py-1 !px-1.5 !text-sm w-full ${inputClassName}`}
          value={tempVal}
          onChange={(e) => setTempVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
        />
      </td>
    );
  }

  const isCenter = className.includes('text-center') || className.includes('justify-center');
  const justifyClass = isCenter ? 'justify-center' : 'justify-between';

  return (
    <td className={`table-td !px-2.5 ${className} relative overflow-visible group/item`}>
      <div className={`flex items-center ${justifyClass} w-full gap-1`}>
        <div className="truncate">{displayValue || <span className="text-gray-300 font-normal">{placeholder}</span>}</div>
        <button
          type="button"
          onClick={startEdit}
          className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2 shrink-0"
          title="Hızlı Düzenle"
        >
          <Pencil size={13} />
        </button>
      </div>
    </td>
  );
}

export function PosDevicesPage() {
  const { notify } = useToast();
  const { devices, loading, saving, addDevice, updateDevice, deleteDevice } = usePosDevices();

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<PosDevice | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dynamic lists from data
  const availableBanks = useMemo(() => {
    const set = new Set<string>();
    POPULAR_BANKS.forEach(b => set.add(b));
    devices.forEach(d => { if (d.bank) set.add(d.bank); });
    return Array.from(set);
  }, [devices]);

  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    POPULAR_LOCATIONS.forEach(l => set.add(l));
    devices.forEach(d => { if (d.location) set.add(d.location.toUpperCase()); });
    return Array.from(set);
  }, [devices]);

  // Filtering
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (search) {
        const q = search.toLocaleLowerCase('tr-TR');
        const match =
          d.merchantNo.toLocaleLowerCase('tr-TR').includes(q) ||
          d.terminalNo.toLocaleLowerCase('tr-TR').includes(q) ||
          d.location.toLocaleLowerCase('tr-TR').includes(q) ||
          d.bank.toLocaleLowerCase('tr-TR').includes(q) ||
          (d.deviceModel || '').toLocaleLowerCase('tr-TR').includes(q) ||
          (d.serialNo || '').toLocaleLowerCase('tr-TR').includes(q) ||
          (d.notes || '').toLocaleLowerCase('tr-TR').includes(q);
        if (!match) return false;
      }
      if (selectedBank !== 'all' && d.bank !== selectedBank) return false;
      if (selectedLocation !== 'all' && d.location.toUpperCase() !== selectedLocation.toUpperCase()) return false;
      if (selectedStatus !== 'all' && d.status !== selectedStatus) return false;
      return true;
    });
  }, [devices, search, selectedBank, selectedLocation, selectedStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCount = devices.length;
    const activeCount = devices.filter(d => d.status === 'aktif').length;
    
    const banks = new Set(devices.map(d => d.bank.trim().toUpperCase()));
    const locations = new Set(devices.map(d => d.location.trim().toUpperCase()));

    const merkezCount = devices.filter(d => d.location.toUpperCase().includes('MERKEZ')).length;
    const subeCount = totalCount - merkezCount;

    return {
      totalCount,
      activeCount,
      bankCount: banks.size,
      locationCount: locations.size,
      merkezCount,
      subeCount
    };
  }, [devices]);

  // Excel Export
  const exportToExcel = () => {
    try {
      const rows = filteredDevices.map((d, idx) => ({
        'Sıra': idx + 1,
        'İşyeri No': d.merchantNo,
        'Pos No / Terminal No': d.terminalNo,
        'Nerede': d.location,
        'Banka': d.bank,
        'Cihaz Modeli': d.deviceModel || '—',
        'Seri No': d.serialNo || '—',
        'Durum': d.status === 'aktif' ? 'Aktif' : d.status === 'pasif' ? 'Pasif' : 'Arızalı',
        'Notlar': d.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pos Cihazları');
      XLSX.writeFile(wb, `POS_Cihazlari_Listesi_${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify('Excel dosyası başarıyla indirildi.', 'success');
    } catch {
      notify('Excel dışa aktarma hatası oluştu.', 'error');
    }
  };

  // PDF Export
  const exportToPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>POS Cihazları Listesi</title>
          <style>
            body { font-family: 'Calibri', 'Inter', sans-serif; padding: 25px; font-size: 13px; color: #111; }
            h2 { margin: 0 0 4px 0; font-size: 20px; color: #0f172a; }
            p { margin: 0 0 16px 0; color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; color: #b91c1c; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 12px; }
            td { border: 1px solid #e2e8f0; padding: 7px 10px; font-size: 12px; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .font-mono { font-family: monospace; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid #cbd5e1; background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h2>Şirket POS Cihazları ve Terminal Envanteri</h2>
          <p>Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')} | Toplam Cihaz: ${filteredDevices.length}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 35px;" class="text-center">#</th>
                <th class="text-center">İşyeri No</th>
                <th class="text-center">Pos No / Terminal No</th>
                <th>Nerede (Konum)</th>
                <th>Banka</th>
                <th>Model / Tip</th>
                <th>Seri No</th>
                <th class="text-center">Durum</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDevices.map((d, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="text-center font-mono font-bold">${d.merchantNo}</td>
                  <td class="text-center font-mono font-bold">${d.terminalNo}</td>
                  <td><strong>${d.location}</strong></td>
                  <td>${d.bank}</td>
                  <td>${d.deviceModel || '—'}</td>
                  <td class="font-mono">${d.serialNo || '—'}</td>
                  <td class="text-center">${d.status === 'aktif' ? 'Aktif' : d.status === 'pasif' ? 'Pasif' : 'Arızalı'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    notify('PDF baskı penceresi açıldı.', 'success');
  };

  const handleSaveDevice = async (input: PosDeviceFormInput) => {
    if (editingDevice) {
      await updateDevice(editingDevice.id, input);
    } else {
      await addDevice(input);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    await deleteDevice(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Pos Cihazları"
        description="Ana Kasa ve banka hesaplarına bağlı tüm POS terminallerini, üye işyeri ve terminal numaralarını, şube ve lokasyon bilgilerini yönetin."
        actions={
          <div className="flex items-center gap-2">
            {saving && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Bulutla Eşitleniyor...
              </span>
            )}

            {/* Actions Menu */}
            <div className="relative">
              <button
                className="btn-secondary flex items-center gap-1.5 text-xs font-bold"
                onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
              >
                İşlemler
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 ${actionsMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {actionsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-20 flex flex-col">
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        exportToExcel();
                        setActionsMenuOpen(false);
                      }}
                    >
                      <Download size={14} className="text-gray-400" /> Excel Dışa Aktar (.xlsx)
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        exportToPdf();
                        setActionsMenuOpen(false);
                      }}
                    >
                      <Printer size={14} className="text-gray-400" /> PDF / Yazdır
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Yeni POS Cihazı Ekle */}
            <button
              className="btn-primary flex items-center gap-1.5 text-xs font-bold"
              onClick={() => {
                setEditingDevice(null);
                setModalOpen(true);
              }}
            >
              <Plus size={16} />
              Yeni POS Cihazı Ekle
            </button>
          </div>
        }
      />

      {/* KPI Cards (Matching BillListPage Style) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Toplam POS Cihazı</span>
          <p className="mt-2 text-xl font-bold text-gray-900">{kpis.totalCount} Cihaz</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{kpis.activeCount} terminal aktif kullanımda</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Aktif Banka Sayısı</span>
          <p className="mt-2 text-xl font-bold text-blue-700">{kpis.bankCount} Banka</p>
          <p className="text-[11px] text-gray-400 mt-0.5">anlaşmalı POS altyapısı</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Konum / Şube</span>
          <p className="mt-2 text-xl font-bold text-purple-700">{kpis.locationCount} Lokasyon</p>
          <p className="text-[11px] text-gray-400 mt-0.5">cihaz noktaları</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Merkez Kasa Cihazları</span>
          <p className="mt-2 text-xl font-bold text-emerald-700">{kpis.merkezCount} Adet</p>
          <p className="text-[11px] text-gray-400 mt-0.5">merkezde konuşlu terminaller</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Şubeler & Depo</span>
          <p className="mt-2 text-xl font-bold text-amber-700">{kpis.subeCount} Adet</p>
          <p className="text-[11px] text-gray-400 mt-0.5">şube, depo ve diğer noktalar</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-3.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input w-full pl-9 pr-8 text-xs font-medium"
              placeholder="İşyeri no, pos no, nerede veya banka ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Aramayı Temizle"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Banka Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Filter size={13} className="text-gray-400" />
              <select
                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
              >
                <option value="all">Tüm Bankalar</option>
                {availableBanks.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Nerede (Konum) Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <MapPin size={13} className="text-gray-400" />
              <select
                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="all">Tüm Konumlar (Nerede)</option>
                {availableLocations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Durum Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <select
                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tüm Durumlar</option>
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
                <option value="arizali">Arızalı</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table (Matching BillListPage Exact Layout & Style) */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="table-th w-10 text-center font-bold text-red-600 !text-sm">#</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">İşyeri No</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Pos No / Terminal No</th>
                <th className="table-th text-left font-bold text-red-600 !text-sm">Nerede</th>
                <th className="table-th text-left font-bold text-red-600 !text-sm">Banka</th>
                <th className="table-th text-left font-bold text-red-600 !text-sm">Model / Tip</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Durum</th>
                <th className="table-th w-16 text-center font-bold text-red-600 !text-sm">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && devices.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="table-td text-center"><div className="h-4 w-4 bg-gray-100 rounded mx-auto" /></td>
                    <td className="table-td text-center"><div className="h-4 w-24 bg-gray-200 rounded mx-auto" /></td>
                    <td className="table-td text-center"><div className="h-4 w-24 bg-gray-200 rounded mx-auto" /></td>
                    <td className="table-td"><div className="h-4 w-28 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-4 w-32 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                    <td className="table-td text-center"><div className="h-5 w-16 bg-gray-100 rounded-full mx-auto" /></td>
                    <td className="table-td text-center"><div className="h-4 w-6 bg-gray-100 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard size={32} className="text-gray-300 stroke-[1.5]" />
                      <p className="text-sm font-semibold">Kayıtlı POS cihazı veya filtreye uyan sonuç bulunamadı.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDevice(null);
                          setModalOpen(true);
                        }}
                        className="mt-1 text-xs font-bold text-brand-600 hover:text-brand-800 hover:underline"
                      >
                        + İlk POS Cihazını Ekle
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d, index) => {
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-gray-50/60 transition-colors group/row"
                    >
                      {/* # Sıra */}
                      <td className="table-td text-center text-gray-400 font-medium text-xs !px-1">
                        {index + 1}
                      </td>

                      {/* 1. İşyeri No (Inline Edit) */}
                      <InlineTextCell
                        value={d.merchantNo}
                        displayValue={
                          <span className="font-mono text-sm font-black text-gray-900 tracking-wider">
                            {d.merchantNo}
                          </span>
                        }
                        onSave={(val) => updateDevice(d.id, { merchantNo: val.trim() })}
                        className="text-center font-mono"
                        inputClassName="text-center font-mono font-bold"
                        placeholder="İşyeri no..."
                      />

                      {/* 2. Pos No / Terminal No (Inline Edit) */}
                      <InlineTextCell
                        value={d.terminalNo}
                        displayValue={
                          <span className="font-mono text-sm font-black text-blue-700 tracking-wider bg-blue-50/60 px-2 py-0.5 rounded border border-blue-100">
                            {d.terminalNo}
                          </span>
                        }
                        onSave={(val) => updateDevice(d.id, { terminalNo: val.trim() })}
                        className="text-center font-mono"
                        inputClassName="text-center font-mono font-bold"
                        placeholder="Terminal no..."
                      />

                      {/* 3. Nerede (Konum) */}
                      <InlineTextCell
                        value={d.location}
                        displayValue={
                          <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-md border ${getLocationBadgeStyle(d.location)}`}>
                            <MapPin size={11} className="shrink-0" />
                            {d.location}
                          </span>
                        }
                        onSave={(val) => updateDevice(d.id, { location: val.trim().toUpperCase() })}
                        placeholder="Konum..."
                      />

                      {/* 4. Banka */}
                      <InlineTextCell
                        value={d.bank}
                        displayValue={
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 rounded-lg border shadow-2xs ${getBankBadgeStyle(d.bank)}`}>
                              <Building2 size={13} className="shrink-0" />
                              {d.bank}
                            </span>
                          </div>
                        }
                        onSave={(val) => updateDevice(d.id, { bank: val.trim() })}
                        placeholder="Banka..."
                      />

                      {/* Model / Tip & Seri No */}
                      <td className="table-td">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-700 block truncate">
                            {d.deviceModel || 'Standart POS'}
                          </span>
                          {d.serialNo && (
                            <span className="text-[11px] font-mono text-gray-400 block truncate" title={`Seri No: ${d.serialNo}`}>
                              SN: {d.serialNo}
                            </span>
                          )}
                          {d.notes && (
                            <span className="text-[10px] text-gray-400 block truncate italic" title={d.notes}>
                              {d.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Durum */}
                      <td className="table-td text-center">
                        {d.status === 'aktif' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Aktif
                          </span>
                        ) : d.status === 'pasif' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Pasif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Arızalı
                          </span>
                        )}
                      </td>

                      {/* İşlem Menüsü */}
                      <td className="table-td text-center relative overflow-visible">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setActiveRowMenuId(activeRowMenuId === d.id ? null : d.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="İşlemler"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeRowMenuId === d.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveRowMenuId(null)} />
                              <div className="absolute right-0 mt-1 w-36 rounded-xl border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-20 flex flex-col text-left">
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                  onClick={() => {
                                    setEditingDevice(d);
                                    setModalOpen(true);
                                    setActiveRowMenuId(null);
                                  }}
                                >
                                  <Pencil size={13} className="text-blue-600" /> Düzenle
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                                  onClick={() => {
                                    setDeleteConfirmId(d.id);
                                    setActiveRowMenuId(null);
                                  }}
                                >
                                  <Trash2 size={13} className="text-rose-500" /> Sil
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <PosDeviceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingDevice(null);
        }}
        onSubmit={handleSaveDevice}
        device={editingDevice}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="card max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">POS Cihazını Sil</h4>
                <p className="text-xs text-gray-500">Bu işlem geri alınamaz.</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Bu POS cihazını listeden kaldırmak istediğinize emin misiniz?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                className="btn-secondary text-xs px-3 py-1.5"
                onClick={() => setDeleteConfirmId(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="btn-danger text-xs px-3.5 py-1.5 font-bold"
                onClick={() => handleDeleteDevice(deleteConfirmId)}
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
