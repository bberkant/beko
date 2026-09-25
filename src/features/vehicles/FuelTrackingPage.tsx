import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Fuel, 
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  CircleDollarSign, 
  Droplet, 
  Building2, 
  Car, 
  Calendar, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  Download, 
  ChevronRight,
  ExternalLink,
  Filter
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useVehicles } from './store';
import { VehicleFuelEntry } from './types';
import * as XLSX from 'xlsx';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

const money = (value: number) =>
  `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ₺`;

const formatNumber = (value: number, decimals: number = 2) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);

const cleanPlate = (p: string) => (p || '').replace(/[^A-Za-z0-9]/g, '').toLocaleUpperCase('tr-TR');

export function parseUniversalNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;

  // Clean currency symbols, spaces, quotes, letters (like TL, Lt, etc.)
  str = str.replace(/[₺$€£\s\u00A0TLtlA-Za-z]/g, '');

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  if (hasComma && hasDot) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) {
      // e.g. 1.234,56 -> dot is thousand, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. 1,234.56 -> comma is thousand, dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma: 95,11 or 1,234,567
    const parts = str.split(',');
    if (parts.length > 2) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(',', '.');
    }
  } else if (hasDot) {
    // Only dot: 95.11 or 1.234.567
    const parts = str.split('.');
    if (parts.length > 2) {
      str = str.replace(/\./g, '');
    }
  }

  // Remove any remaining unexpected chars except 0-9, dot, minus
  str = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function parseUniversalDate(rawDate: any): string {
  if (!rawDate && rawDate !== 0) return new Date().toISOString();

  if (rawDate instanceof Date) {
    if (!isNaN(rawDate.getTime())) {
      const y = rawDate.getFullYear();
      const m = String(rawDate.getMonth() + 1).padStart(2, '0');
      const d = String(rawDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}T12:00:00.000Z`;
    }
  }

  const str = String(rawDate).trim();
  if (!str) return new Date().toISOString();

  // Excel numeric date check (number or integer/float string without date separators)
  if (typeof rawDate === 'number' || (/^\d+(\.\d+)?$/.test(str) && !str.includes('-') && !str.includes('/') && !str.includes(':'))) {
    const num = typeof rawDate === 'number' ? rawDate : parseFloat(str);
    if (num > 30000 && num < 80000) {
      const utcMs = Math.round((num - 25569) * 86400 * 1000);
      const d = new Date(utcMs);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}T12:00:00.000Z`;
    }
  }

  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const hour = dmyMatch[4] ? dmyMatch[4].padStart(2, '0') : '12';
    const min = dmyMatch[5] ? dmyMatch[5].padStart(2, '0') : '00';
    const sec = dmyMatch[6] ? dmyMatch[6].padStart(2, '0') : '00';
    return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    const hour = ymdMatch[4] ? ymdMatch[4].padStart(2, '0') : '12';
    const min = ymdMatch[5] ? ymdMatch[5].padStart(2, '0') : '00';
    const sec = ymdMatch[6] ? ymdMatch[6].padStart(2, '0') : '00';
    return `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
  }

  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString();
  }

  return new Date().toISOString();
}

interface FuelFormState {
  id?: string;
  vehicle_id?: string;
  plate: string;
  date: string;
  fuel_type: string;
  unit_price: string;
  quantity: string;
  total_amount: string;
  station: string;
  city: string;
  fuel_card_no: string;
  km: string;
  driver_name: string;
  notes: string;
}

const emptyForm = (): FuelFormState => ({
  vehicle_id: '',
  plate: '',
  date: new Date().toISOString().slice(0, 16),
  fuel_type: 'Motorin',
  unit_price: '',
  quantity: '',
  total_amount: '',
  station: '',
  city: '',
  fuel_card_no: '',
  km: '',
  driver_name: '',
  notes: ''
});

interface ParsedRow {
  plate: string;
  date: string;
  fuel_type: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  station: string;
  city: string;
  fuel_card_no: string;
  km?: number;
  driver_name: string;
  notes: string;
  matchedVehicleId?: string;
  isValid: boolean;
  error?: string;
}

export function FuelTrackingPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { vehicles } = useVehicles();

  const [activeTab, setActiveTab] = useState<'all' | 'vehicles' | 'stations'>('all');
  const [items, setItems] = useState<VehicleFuelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedPlateFilter, setSelectedPlateFilter] = useState<string>('all');
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('all');

  // Quick Detail Modal (Plate or Station)
  const navigate = useNavigate();
  const [detailModal, setDetailModal] = useState<{ type: 'plate' | 'station'; value: string } | null>(null);
  const [detailQuery, setDetailQuery] = useState('');

  // Manual Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FuelFormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canWrite = ['Süper Admin', 'Admin', 'Developer', 'Yönetici', 'Muhasebe', 'Finans'].includes(user?.role ?? '');

  // Load fuel entries
  const refresh = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicle_fuel_entries')
      .select('*')
      .eq('organization_id', user.organizationId)
      .order('date', { ascending: false });

    if (error) {
      notify(error.message, 'error');
    } else {
      setItems((data || []).map((x) => ({
        ...x,
        unit_price: Number(x.unit_price) || 0,
        quantity: Number(x.quantity) || 0,
        total_amount: Number(x.total_amount) || 0,
        km: x.km ? Number(x.km) : undefined
      })));
    }
    setLoading(false);
  }, [user?.organizationId, notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Unique lists for filter dropdowns
  const uniquePlates = useMemo(() => {
    const set = new Set<string>();
    items.forEach((x) => {
      if (x.plate) set.add(x.plate.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [items]);

  const uniqueStations = useMemo(() => {
    const set = new Set<string>();
    items.forEach((x) => {
      if (x.station) set.add(x.station.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered entries
  const filteredItems = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return items.filter((x) => {
      if (selectedPlateFilter !== 'all' && cleanPlate(x.plate) !== cleanPlate(selectedPlateFilter)) {
        return false;
      }
      if (selectedStationFilter !== 'all' && x.station !== selectedStationFilter) {
        return false;
      }
      if (!q) return true;
      const vehicle = vehicles.find((v) => v.id === x.vehicle_id || cleanPlate(v.plate) === cleanPlate(x.plate));
      const str = `${x.plate} ${vehicle?.brand || ''} ${vehicle?.model || ''} ${x.station || ''} ${x.city || ''} ${x.driver_name || ''} ${x.fuel_type || ''} ${x.notes || ''}`.toLocaleLowerCase('tr-TR');
      return str.includes(q);
    });
  }, [items, query, selectedPlateFilter, selectedStationFilter, vehicles]);

  // Overall Metrics
  const totalAmount = useMemo(() => items.reduce((s, x) => s + x.total_amount, 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((s, x) => s + x.quantity, 0), [items]);
  const avgUnitPrice = useMemo(() => (totalQuantity > 0 ? totalAmount / totalQuantity : 0), [totalAmount, totalQuantity]);
  
  // This month metrics
  const thisMonthData = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const monthItems = items.filter((x) => (x.date || '').startsWith(currentMonthPrefix));
    const amount = monthItems.reduce((s, x) => s + x.total_amount, 0);
    const qty = monthItems.reduce((s, x) => s + x.quantity, 0);
    return { amount, qty, count: monthItems.length };
  }, [items]);

  // Vehicle Summaries
  const vehicleSummaries = useMemo(() => {
    const map = new Map<string, {
      plate: string;
      vehicleId?: string;
      brandModel: string;
      totalAmount: number;
      totalLiters: number;
      count: number;
      lastDate: string;
      lastStation: string;
    }>();

    items.forEach((entry) => {
      const p = entry.plate.trim().toUpperCase();
      const existing = map.get(p);
      const vehicle = vehicles.find((v) => cleanPlate(v.plate) === cleanPlate(p) || v.id === entry.vehicle_id);

      if (!existing) {
        map.set(p, {
          plate: p,
          vehicleId: vehicle?.id || entry.vehicle_id,
          brandModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Kayıtsız Araç',
          totalAmount: entry.total_amount,
          totalLiters: entry.quantity,
          count: 1,
          lastDate: entry.date,
          lastStation: entry.station || '—'
        });
      } else {
        existing.totalAmount += entry.total_amount;
        existing.totalLiters += entry.quantity;
        existing.count += 1;
        if (new Date(entry.date) > new Date(existing.lastDate)) {
          existing.lastDate = entry.date;
          existing.lastStation = entry.station || '—';
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [items, vehicles]);

  // Station Summaries
  const stationSummaries = useMemo(() => {
    const map = new Map<string, {
      station: string;
      totalAmount: number;
      totalLiters: number;
      count: number;
      city: string;
    }>();

    items.forEach((entry) => {
      const s = (entry.station || 'Belirtilmemiş İstasyon').trim();
      const existing = map.get(s);

      if (!existing) {
        map.set(s, {
          station: s,
          totalAmount: entry.total_amount,
          totalLiters: entry.quantity,
          count: 1,
          city: entry.city || '—'
        });
      } else {
        existing.totalAmount += entry.total_amount;
        existing.totalLiters += entry.quantity;
        existing.count += 1;
        if (entry.city && existing.city === '—') existing.city = entry.city;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [items]);

  // Detail Modal data
  const {
    modalRecords,
    modalFilteredRecords,
    modalTotalAmount,
    modalTotalQty,
    modalAvgPrice,
    modalVehicle,
    modalStationCity,
    modalStationVehicleCount
  } = useMemo(() => {
    if (!detailModal) {
      return {
        modalRecords: [] as VehicleFuelEntry[],
        modalFilteredRecords: [] as VehicleFuelEntry[],
        modalTotalAmount: 0,
        modalTotalQty: 0,
        modalAvgPrice: 0,
        modalVehicle: undefined as any,
        modalStationCity: '',
        modalStationVehicleCount: 0
      };
    }

    let records: VehicleFuelEntry[] = [];
    let vehicle: any = undefined;
    let stationCity = '';
    let stationVehicleCount = 0;

    if (detailModal.type === 'plate') {
      const targetPlate = cleanPlate(detailModal.value);
      records = items.filter((x) => cleanPlate(x.plate) === targetPlate);
      vehicle = vehicles.find((v) => cleanPlate(v.plate) === targetPlate || v.id === records[0]?.vehicle_id);
    } else {
      const targetStation = detailModal.value.trim().toLocaleLowerCase('tr-TR');
      records = items.filter((x) => (x.station || '').trim().toLocaleLowerCase('tr-TR') === targetStation);
      const cities = Array.from(new Set(records.map((r) => r.city).filter(Boolean)));
      stationCity = cities.join(', ');
      stationVehicleCount = new Set(records.map((r) => cleanPlate(r.plate))).size;
    }

    const totalAmount = records.reduce((s, x) => s + x.total_amount, 0);
    const totalQty = records.reduce((s, x) => s + x.quantity, 0);
    const avgPrice = totalQty > 0 ? totalAmount / totalQty : 0;

    const q = detailQuery.trim().toLocaleLowerCase('tr-TR');
    const filtered = records.filter((x) => {
      if (!q) return true;
      const v = vehicles.find((item) => item.id === x.vehicle_id || cleanPlate(item.plate) === cleanPlate(x.plate));
      const str = `${x.plate} ${v?.brand || ''} ${v?.model || ''} ${x.station || ''} ${x.city || ''} ${x.driver_name || ''} ${x.fuel_type || ''} ${x.notes || ''}`.toLocaleLowerCase('tr-TR');
      return str.includes(q);
    });

    return {
      modalRecords: records,
      modalFilteredRecords: filtered,
      modalTotalAmount: totalAmount,
      modalTotalQty: totalQty,
      modalAvgPrice: avgPrice,
      modalVehicle: vehicle,
      modalStationCity: stationCity,
      modalStationVehicleCount: stationVehicleCount
    };
  }, [detailModal, items, vehicles, detailQuery]);

  // Form helpers
  const handleOpenAdd = () => {
    setForm(emptyForm());
    setModalOpen(true);
  };

  const handleOpenEdit = (item: VehicleFuelEntry) => {
    setForm({
      id: item.id,
      vehicle_id: item.vehicle_id || '',
      plate: item.plate,
      date: item.date ? item.date.slice(0, 16) : new Date().toISOString().slice(0, 16),
      fuel_type: item.fuel_type || 'Motorin',
      unit_price: String(item.unit_price || ''),
      quantity: String(item.quantity || ''),
      total_amount: String(item.total_amount || ''),
      station: item.station || '',
      city: item.city || '',
      fuel_card_no: item.fuel_card_no || '',
      km: item.km ? String(item.km) : '',
      driver_name: item.driver_name || '',
      notes: item.notes || ''
    });
    setModalOpen(true);
  };

  const handlePlateChangeInForm = (plateVal: string) => {
    const matched = vehicles.find((v) => cleanPlate(v.plate) === cleanPlate(plateVal));
    setForm((prev) => ({
      ...prev,
      plate: plateVal.toUpperCase(),
      vehicle_id: matched ? matched.id : prev.vehicle_id
    }));
  };

  const handleVehicleSelectInForm = (vehicleId: string) => {
    const v = vehicles.find((x) => x.id === vehicleId);
    setForm((prev) => ({
      ...prev,
      vehicle_id: vehicleId,
      plate: v ? v.plate : prev.plate
    }));
  };

  const handleQuantityOrPriceChange = (qtyStr: string, priceStr: string, isTotalManual: boolean = false) => {
    const q = parseFloat(qtyStr.replace(',', '.')) || 0;
    const p = parseFloat(priceStr.replace(',', '.')) || 0;
    if (!isTotalManual && q > 0 && p > 0) {
      setForm((prev) => ({
        ...prev,
        quantity: qtyStr,
        unit_price: priceStr,
        total_amount: (q * p).toFixed(2)
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        quantity: qtyStr,
        unit_price: priceStr
      }));
    }
  };

  const handleSave = async () => {
    if (!user?.organizationId) return;
    if (!form.plate.trim()) {
      notify('Lütfen bir plaka girin veya araç seçin.', 'error');
      return;
    }
    const totAmount = parseFloat(form.total_amount.replace(',', '.')) || 0;
    const qty = parseFloat(form.quantity.replace(',', '.')) || 0;
    const unitP = parseFloat(form.unit_price.replace(',', '.')) || (qty > 0 ? totAmount / qty : 0);

    if (totAmount <= 0 && qty <= 0) {
      notify('Geçerli bir tutar veya miktar girmelisiniz.', 'error');
      return;
    }

    setSaving(true);
    const matchedVehicle = vehicles.find((v) => cleanPlate(v.plate) === cleanPlate(form.plate) || v.id === form.vehicle_id);

    const payload = {
      organization_id: user.organizationId,
      vehicle_id: matchedVehicle?.id || (form.vehicle_id ? form.vehicle_id : null),
      plate: form.plate.trim().toUpperCase(),
      date: new Date(form.date).toISOString(),
      fuel_type: form.fuel_type.trim() || 'Motorin',
      unit_price: unitP,
      quantity: qty,
      total_amount: totAmount > 0 ? totAmount : qty * unitP,
      station: form.station.trim() || null,
      city: form.city.trim() || null,
      fuel_card_no: form.fuel_card_no.trim() || null,
      km: form.km ? parseFloat(form.km) : null,
      driver_name: form.driver_name.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString()
    };

    let res;
    if (form.id) {
      res = await supabase.from('vehicle_fuel_entries').update(payload).eq('id', form.id).eq('organization_id', user.organizationId);
    } else {
      res = await supabase.from('vehicle_fuel_entries').insert(payload);
    }

    setSaving(false);
    if (res.error) {
      notify(res.error.message, 'error');
    } else {
      notify(form.id ? 'Yakıt kaydı güncellendi.' : 'Yakıt kaydı eklendi.', 'success');
      setModalOpen(false);
      await refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yakıt kaydını silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('vehicle_fuel_entries').delete().eq('id', id).eq('organization_id', user?.organizationId);
    if (error) {
      notify(error.message, 'error');
    } else {
      notify('Yakıt kaydı silindi.', 'success');
      await refresh();
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      notify('Dışa aktarılacak kayıt bulunamadı.', 'error');
      return;
    }
    const exportRows = filteredItems.map((item) => {
      const v = vehicles.find((x) => x.id === item.vehicle_id || cleanPlate(x.plate) === cleanPlate(item.plate));
      return {
        'Tarih': new Date(item.date).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }),
        'Plaka': item.plate,
        'Araç': v ? `${v.brand} ${v.model}` : '—',
        'Yakıt Tipi': item.fuel_type,
        'Miktar (Litre)': item.quantity,
        'Birim Fiyat (₺)': item.unit_price,
        'Toplam Tutar (₺)': item.total_amount,
        'İstasyon': item.station || '—',
        'İl / Şehir': item.city || '—',
        'KM': item.km || '—',
        'Sürücü': item.driver_name || '—',
        'Kart No': item.fuel_card_no || '—',
        'Notlar': item.notes || '—'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yakıt Tüketim Raporu');
    XLSX.writeFile(wb, `Yakit_Tuketim_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify('Excel dosyası indirildi.', 'success');
  };

  // Parse Excel / PDF Files
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setImportFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'xlsx' || ext === 'xls') {
        await parseExcelFile(file);
      } else if (ext === 'pdf') {
        await parsePdfFile(file);
      } else {
        notify('Yalnızca .xlsx, .xls veya .pdf uzantılı dosyalar desteklenir.', 'error');
      }
    } catch (err) {
      console.error('File parsing error:', err);
      notify(err instanceof Error ? err.message : 'Dosya ayrıştırılırken hata oluştu.', 'error');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const parseExcelFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: true, defval: '' });

    if (!rows || rows.length === 0) {
      throw new Error('Excel dosyasında veri bulunamadı.');
    }

    const parsed: ParsedRow[] = [];

    for (const r of rows) {
      // Find key matching patterns (case-insensitive & Turkish locale friendly)
      const findVal = (keys: string[]) => {
        for (const k of Object.keys(r)) {
          const normK = k.trim().toLocaleLowerCase('tr-TR');
          for (const key of keys) {
            const normKey = key.toLocaleLowerCase('tr-TR');
            if (normK === normKey || normK.includes(normKey) || normKey.includes(normK)) {
              return r[k];
            }
          }
        }
        return '';
      };

      const rawPlate = String(findVal(['plaka', 'araç plaka', 'arac plaka', 'plate', 'plaka no'])).trim();
      const rawDate = findVal(['kayıt tarihi', 'kayit tarihi', 'tarih', 'işlem tarihi', 'islem tarihi', 'satış tarihi', 'date', 'zaman']);
      const rawFuelType = String(findVal(['yakıt tipi', 'yakit tipi', 'ürün', 'urun', 'yakıt', 'yakit', 'product'])).trim() || 'Motorin';
      const rawPrice = findVal(['alış fiyat', 'alis fiyat', 'alış fiyatı', 'alis fiyati', 'birim fiyat', 'b.fiyat', 'litre fiyatı', 'fiyat', 'unit price']);
      const rawTotal = findVal(['tutar', 'toplam tutar', 'net tutar', 'kdv dahil tutar', 'satış tutarı', 'amount', 'total']);
      const rawQty = findVal(['litre', 'miktar', 'hacim', 'lt', 'quantity', 'volume']);
      const rawStation = String(findVal(['istasyon', 'istasyon adı', 'istasyon adi', 'bayi', 'bayi adı', 'nokta', 'station'])).trim();
      const rawCity = String(findVal(['il', 'şehir', 'sehir', 'il/ilçe', 'city', 'bölge'])).trim();
      const rawKm = findVal(['km', 'kilometre', 'odometer']);
      const rawCard = String(findVal(['kart no', 'yakıt kartı', 'filo kartı', 'card no'])).trim();
      const rawDriver = String(findVal(['sürücü', 'surucu', 'şoför', 'sofor', 'driver'])).trim();

      const numTotal = parseUniversalNumber(rawTotal);
      const numQty = parseUniversalNumber(rawQty);
      let numPrice = parseUniversalNumber(rawPrice);

      if (!rawPlate && numTotal <= 0 && numQty <= 0) {
        continue; // skip empty headers or trailing lines
      }

      if (numPrice === 0 && numQty > 0 && numTotal > 0) {
        numPrice = Math.round((numTotal / numQty) * 100) / 100;
      }

      const computedTotal = numTotal > 0 ? numTotal : (numQty > 0 && numPrice > 0 ? Math.round(numQty * numPrice * 100) / 100 : 0);
      const parsedDate = parseUniversalDate(rawDate);
      const cleanedP = cleanPlate(rawPlate);
      const matched = vehicles.find((v) => cleanPlate(v.plate) === cleanedP);

      parsed.push({
        plate: rawPlate.toLocaleUpperCase('tr-TR') || 'PLAKA BELİRTİLMEMİŞ',
        date: parsedDate,
        fuel_type: rawFuelType,
        unit_price: numPrice,
        quantity: numQty,
        total_amount: computedTotal,
        station: rawStation,
        city: rawCity,
        fuel_card_no: rawCard,
        km: rawKm ? parseUniversalNumber(rawKm) || undefined : undefined,
        driver_name: rawDriver,
        notes: `Excel aktarımı (${file.name})`,
        matchedVehicleId: matched?.id,
        isValid: Boolean(rawPlate && (computedTotal > 0 || numQty > 0))
      });
    }

    if (parsed.length === 0) {
      throw new Error('Dosyada geçerli plaka ve yakıt bilgisi tespit edilemedi.');
    }

    setParsedRows(parsed);
    setImportModalOpen(true);
    notify(`${parsed.length} adet yakıt kaydı okundu. Lütfen onaylayın.`, 'info');
  };

  const parsePdfFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: buffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageStr + '\n';
    }

    // Try finding station name in header
    let defaultStation = 'Petrol İstasyonu';
    const stationMatch = fullText.match(/(Petrol Ofisi|Shell|Opet|Total|BP|TP|Aytemiz|Lukoil|Alpet|Kadoil|Termopet|Sunpet)/i);
    if (stationMatch) {
      defaultStation = stationMatch[0];
    }

    // Regex for lines: plate (e.g. 34 ABC 123 or 34ABC123), dates, numbers
    const lines = fullText.split(/\r?\n/);
    const parsed: ParsedRow[] = [];

    const plateRegex = /\b(\d{2})\s*([A-ZÇĞİÖŞÜ]{1,3})\s*(\d{2,4})\b/gi;
    const dateRegex = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/;
    const amountRegex = /\b([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2}))\b/g;

    for (const line of lines) {
      const plateMatches = line.match(plateRegex);
      const dateMatch = line.match(dateRegex);

      if (plateMatches && plateMatches.length > 0) {
        const foundPlate = plateMatches[0].replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
        
        let rowDate = new Date().toISOString();
        if (dateMatch) {
          rowDate = parseUniversalDate(dateMatch[0]);
        }

        // Find numbers in line (liters, amounts)
        const numbers = Array.from(line.matchAll(amountRegex)).map((m) =>
          parseUniversalNumber(m[1])
        );

        let quantity = 0;
        let totalAmount = 0;
        let unitPrice = 0;

        if (numbers.length >= 2) {
          // usually smallest or mid is quantity, largest is total
          const sorted = [...numbers].sort((a, b) => a - b);
          if (sorted.length === 2) {
            quantity = sorted[0];
            totalAmount = sorted[1];
          } else {
            quantity = sorted[1];
            totalAmount = sorted[2];
            unitPrice = sorted[0];
          }
          if (unitPrice === 0 && quantity > 0) unitPrice = totalAmount / quantity;
        } else if (numbers.length === 1) {
          totalAmount = numbers[0];
        }

        if (totalAmount > 0 || quantity > 0) {
          const cleanedP = cleanPlate(foundPlate);
          const matched = vehicles.find((v) => cleanPlate(v.plate) === cleanedP);

          parsed.push({
            plate: foundPlate,
            date: rowDate,
            fuel_type: line.toLowerCase().includes('benzin') ? 'Benzin' : 'Motorin',
            unit_price: unitPrice,
            quantity: quantity,
            total_amount: totalAmount,
            station: defaultStation,
            city: '',
            fuel_card_no: '',
            driver_name: '',
            notes: `PDF Ekstre aktarımı (${file.name})`,
            matchedVehicleId: matched?.id,
            isValid: true
          });
        }
      }
    }

    if (parsed.length === 0) {
      // Fallback generic scan
      throw new Error('PDF dosyasından plaka ve yakıt tutarları otomatik ayrıştırılamadı. Lütfen Excel formatını deneyin.');
    }

    setParsedRows(parsed);
    setImportModalOpen(true);
    notify(`${parsed.length} adet yakıt işlemi PDF ekstresinden çıkarıldı.`, 'info');
  };

  const handleConfirmImport = async () => {
    if (!user?.organizationId) return;
    const validRows = parsedRows.filter((r) => r.isValid && (r.total_amount > 0 || r.quantity > 0));
    if (validRows.length === 0) {
      notify('Aktarılacak geçerli kayıt bulunamadı.', 'error');
      return;
    }

    setImporting(true);

    const inserts = validRows.map((r) => {
      const matched = vehicles.find((v) => cleanPlate(v.plate) === cleanPlate(r.plate) || v.id === r.matchedVehicleId);
      return {
        organization_id: user.organizationId,
        vehicle_id: matched?.id || null,
        plate: r.plate.trim().toUpperCase(),
        date: r.date,
        fuel_type: r.fuel_type || 'Motorin',
        unit_price: r.unit_price || 0,
        quantity: r.quantity || 0,
        total_amount: r.total_amount || 0,
        station: r.station || null,
        city: r.city || null,
        fuel_card_no: r.fuel_card_no || null,
        km: r.km || null,
        driver_name: r.driver_name || null,
        source_file: importFileName || null,
        notes: r.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    const { error } = await supabase.from('vehicle_fuel_entries').insert(inserts);
    setImporting(false);

    if (error) {
      notify(error.message, 'error');
    } else {
      notify(`${inserts.length} adet yakıt hareketi sisteme başarıyla işlendi.`, 'success');
      setImportModalOpen(false);
      setParsedRows([]);
      await refresh();
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Yakıt Tüketim"
        description="Araçların akaryakıt tüketimlerini, petrol istasyonu ve cari ekstrelerini (Excel / PDF) otomatik içe aktararak takip edin."
        actions={
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx,.xls,.pdf"
              className="hidden"
            />
            <button
              className="btn-secondary"
              onClick={handleExportExcel}
              disabled={items.length === 0}
              title="Excel Olarak İndir"
            >
              <Download size={16} />
              Dışa Aktar
            </button>
            {canWrite && (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                >
                  <UploadCloud size={16} className={isParsing ? 'animate-bounce text-brand-600' : ''} />
                  {isParsing ? 'Ayrıştırılıyor...' : 'Excel / PDF Ekstre Yükle'}
                </button>
                <button className="btn-primary" onClick={handleOpenAdd}>
                  <Plus size={16} />
                  Yakıt Girişi
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Top Metric Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium">Toplam Yakıt Tutarı</span>
            <CircleDollarSign size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{money(totalAmount)}</div>
          <p className="mt-1 text-xs text-gray-400">Tüm zamanların toplam harcaması</p>
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium">Toplam Tüketim (Litre)</span>
            <Droplet size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{formatNumber(totalQuantity, 1)} Lt</div>
          <p className="mt-1 text-xs text-gray-400">{items.length} adet akaryakıt alımı</p>
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium">Ortalama Litre Fiyatı</span>
            <Fuel size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{money(avgUnitPrice)} / Lt</div>
          <p className="mt-1 text-xs text-gray-400">Filo genel ortalaması</p>
        </div>

        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between text-gray-500">
            <span className="text-xs font-medium">Bu Ayki Yakıt Harcaması</span>
            <Calendar size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{money(thisMonthData.amount)}</div>
          <p className="mt-1 text-xs text-gray-400">{formatNumber(thisMonthData.qty, 1)} Lt ({thisMonthData.count} dolum)</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <Fuel size={17} />
          Tüm Yakıt Hareketleri ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'vehicles'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <Car size={17} />
          Araç Bazlı Tüketim Özeti ({vehicleSummaries.length})
        </button>
        <button
          onClick={() => setActiveTab('stations')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'stations'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <Building2 size={17} />
          İstasyon / Şirket Analizi ({stationSummaries.length})
        </button>
      </div>

      {/* Tab 1: All Entries */}
      {activeTab === 'all' && (
        <>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                className="input pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Plaka, istasyon, il, sürücü veya not ara..."
              />
            </div>

            <div className="w-48">
              <select
                className="input"
                value={selectedPlateFilter}
                onChange={(e) => setSelectedPlateFilter(e.target.value)}
              >
                <option value="all">Tüm Plakalar ({uniquePlates.length})</option>
                {uniquePlates.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-56">
              <select
                className="input"
                value={selectedStationFilter}
                onChange={(e) => setSelectedStationFilter(e.target.value)}
              >
                <option value="all">Tüm İstasyonlar ({uniqueStations.length})</option>
                {uniqueStations.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {(query || selectedPlateFilter !== 'all' || selectedStationFilter !== 'all') && (
              <button
                className="btn-secondary !text-xs !py-2"
                onClick={() => {
                  setQuery('');
                  setSelectedPlateFilter('all');
                  setSelectedStationFilter('all');
                }}
              >
                <X size={14} />
                Filtreleri Temizle
              </button>
            )}
          </div>

          {/* Table */}
          <div className="card overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-th">Tarih</th>
                  <th className="table-th">Plaka</th>
                  <th className="table-th">Araç</th>
                  <th className="table-th">Yakıt Tipi</th>
                  <th className="table-th text-right">Litre (Miktar)</th>
                  <th className="table-th text-right">Birim Fiyat</th>
                  <th className="table-th text-right">Toplam Tutar</th>
                  <th className="table-th">İstasyon & İl</th>
                  <th className="table-th">Sürücü / Kart</th>
                  <th className="table-th text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="table-td py-12 text-center text-gray-400">
                      Yakıt kayıtları yükleniyor...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-td py-12 text-center text-gray-400">
                      Yakıt kaydı bulunamadı. "Excel / PDF Ekstre Yükle" butonuyla ekstrelerinizi yükleyebilirsiniz.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((x) => {
                    const vehicle = vehicles.find((v) => v.id === x.vehicle_id || cleanPlate(v.plate) === cleanPlate(x.plate));
                    return (
                      <tr key={x.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="table-td whitespace-nowrap">
                          {new Date(x.date).toLocaleDateString('tr-TR')}
                          {!x.date?.includes('T12:00:00') && !x.date?.includes('T00:00:00') ? (
                            <span className="text-xs text-gray-400 ml-1.5 font-mono">
                              {new Date(x.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : null}
                        </td>
                        <td className="table-td font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailQuery('');
                              setDetailModal({ type: 'plate', value: x.plate });
                            }}
                            className="inline-flex items-center gap-1 rounded bg-gray-100 px-2.5 py-1 text-xs font-mono font-bold text-gray-900 border border-gray-200 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 transition-colors shadow-2xs group cursor-pointer text-left"
                            title="Plaka hareket dökümünü incele"
                          >
                            <span>{x.plate}</span>
                            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-600" />
                          </button>
                        </td>
                        <td className="table-td">
                          {vehicle ? (
                            <span className="font-medium text-gray-800">
                              {vehicle.brand} {vehicle.model}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Harici Araç</span>
                          )}
                        </td>
                        <td className="table-td text-gray-600">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 font-medium">
                            {x.fuel_type || 'Motorin'}
                          </span>
                        </td>
                        <td className="table-td text-right font-bold text-gray-900">
                          {formatNumber(x.quantity, 2)} Lt
                        </td>
                        <td className="table-td text-right text-gray-600">
                          {money(x.unit_price)}
                        </td>
                        <td className="table-td text-right font-bold text-emerald-700">
                          {money(x.total_amount)}
                        </td>
                        <td className="table-td">
                          <div className="font-medium text-gray-900">
                            {x.station ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailQuery('');
                                  setDetailModal({ type: 'station', value: x.station || '' });
                                }}
                                className="text-left font-medium text-gray-900 hover:text-brand-600 hover:underline transition-colors group inline-flex items-center gap-1 cursor-pointer"
                                title="İstasyon hareket dökümünü incele"
                              >
                                <span>{x.station}</span>
                                <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-600" />
                              </button>
                            ) : (
                              '—'
                            )}
                          </div>
                          {x.city && <div className="text-xs text-gray-400">{x.city}</div>}
                        </td>
                        <td className="table-td">
                          <div className="text-gray-800">{x.driver_name || '—'}</div>
                          {x.fuel_card_no && <div className="text-xs text-gray-400">Kart: {x.fuel_card_no}</div>}
                        </td>
                        <td className="table-td text-right">
                          {canWrite && (
                            <div className="flex justify-end gap-2">
                              <button
                                className="text-gray-500 hover:text-brand-600 p-1"
                                onClick={() => handleOpenEdit(x)}
                                title="Düzenle"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="text-gray-400 hover:text-red-600 p-1"
                                onClick={() => void handleDelete(x.id)}
                                title="Sil"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab 2: Vehicle Summaries */}
      {activeTab === 'vehicles' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">Plaka</th>
                <th className="table-th">Araç Bilgisi</th>
                <th className="table-th text-center">Dolum Sayısı</th>
                <th className="table-th text-right">Toplam Tüketim (Litre)</th>
                <th className="table-th text-right">Toplam Yakıt Tutarı</th>
                <th className="table-th text-right">Ortalama Birim Fiyat</th>
                <th className="table-th">Son Dolum Tarihi</th>
                <th className="table-th">Son İstasyon</th>
                <th className="table-th text-right">Filtrele</th>
              </tr>
            </thead>
            <tbody>
              {vehicleSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-td py-12 text-center text-gray-400">
                    Kayıtlı araç tüketim özeti bulunamadı.
                  </td>
                </tr>
              ) : (
                vehicleSummaries.map((s) => {
                  const avg = s.totalLiters > 0 ? s.totalAmount / s.totalLiters : 0;
                  return (
                    <tr key={s.plate} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="table-td font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailQuery('');
                            setDetailModal({ type: 'plate', value: s.plate });
                          }}
                          className="inline-flex items-center gap-1 rounded bg-gray-100 px-2.5 py-1 text-xs font-mono font-bold text-gray-900 border border-gray-200 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 transition-colors shadow-2xs group cursor-pointer text-left"
                          title="Plaka hareket dökümünü incele"
                        >
                          <span>{s.plate}</span>
                          <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-600" />
                        </button>
                      </td>
                      <td className="table-td font-medium text-gray-800">{s.brandModel}</td>
                      <td className="table-td text-center font-bold text-gray-700">{s.count} kez</td>
                      <td className="table-td text-right font-bold text-blue-700">
                        {formatNumber(s.totalLiters, 1)} Lt
                      </td>
                      <td className="table-td text-right font-bold text-emerald-700">
                        {money(s.totalAmount)}
                      </td>
                      <td className="table-td text-right text-gray-600">
                        {money(avg)} / Lt
                      </td>
                      <td className="table-td whitespace-nowrap text-gray-600">
                        {new Date(s.lastDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="table-td text-gray-700">{s.lastStation}</td>
                      <td className="table-td text-right">
                        <button
                          className="btn-secondary !py-1 !text-xs cursor-pointer"
                          onClick={() => {
                            setDetailQuery('');
                            setDetailModal({ type: 'plate', value: s.plate });
                          }}
                        >
                          Hareketleri Gör
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Station Summaries */}
      {activeTab === 'stations' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">İstasyon / Tedarikçi</th>
                <th className="table-th">Şehir / Bölge</th>
                <th className="table-th text-center">İşlem Adedi</th>
                <th className="table-th text-right">Toplam Alınan (Litre)</th>
                <th className="table-th text-right">Toplam Harcama</th>
                <th className="table-th text-right">Ortalama Litre Fiyatı</th>
                <th className="table-th text-right">Harcama Payı (%)</th>
                <th className="table-th text-right">Filtrele</th>
              </tr>
            </thead>
            <tbody>
              {stationSummaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-td py-12 text-center text-gray-400">
                    İstasyon tüketim analizi bulunamadı.
                  </td>
                </tr>
              ) : (
                stationSummaries.map((s) => {
                  const avg = s.totalLiters > 0 ? s.totalAmount / s.totalLiters : 0;
                  const share = totalAmount > 0 ? (s.totalAmount / totalAmount) * 100 : 0;
                  return (
                    <tr key={s.station} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="table-td font-semibold text-gray-900">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailQuery('');
                            setDetailModal({ type: 'station', value: s.station });
                          }}
                          className="text-left font-semibold text-gray-900 hover:text-brand-600 hover:underline transition-colors group inline-flex items-center gap-1 cursor-pointer"
                          title="İstasyon hareket dökümünü incele"
                        >
                          <span>{s.station}</span>
                          <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-600" />
                        </button>
                      </td>
                      <td className="table-td text-gray-600">{s.city}</td>
                      <td className="table-td text-center font-bold text-gray-700">{s.count}</td>
                      <td className="table-td text-right font-bold text-blue-700">
                        {formatNumber(s.totalLiters, 1)} Lt
                      </td>
                      <td className="table-td text-right font-bold text-emerald-700">
                        {money(s.totalAmount)}
                      </td>
                      <td className="table-td text-right text-gray-600">
                        {money(avg)} / Lt
                      </td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-semibold text-gray-800">%{share.toFixed(1)}</span>
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-right">
                        <button
                          className="btn-secondary !py-1 !text-xs cursor-pointer"
                          onClick={() => {
                            setDetailQuery('');
                            setDetailModal({ type: 'station', value: s.station });
                          }}
                        >
                          Hareketleri Gör
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Breakdown Modal (Plate or Station) */}
      <Modal
        open={Boolean(detailModal)}
        onClose={() => setDetailModal(null)}
        title={
          detailModal?.type === 'plate'
            ? `Araç / Plaka Hareket Dökümü: ${detailModal.value}`
            : `İstasyon Hareket Dökümü: ${detailModal?.value}`
        }
        description={
          detailModal?.type === 'plate'
            ? (modalVehicle ? `${modalVehicle.brand} ${modalVehicle.model} · Toplam ${modalRecords.length} dolum kaydı` : `Kayıtsız Araç · Toplam ${modalRecords.length} dolum kaydı`)
            : `${modalStationCity ? `${modalStationCity} · ` : ''}${modalStationVehicleCount} farklı araç · Toplam ${modalRecords.length} dolum işlemi`
        }
        size="4xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-secondary !text-xs !py-1.5 cursor-pointer"
                onClick={() => {
                  if (!detailModal) return;
                  if (detailModal.type === 'plate') {
                    setSelectedPlateFilter(detailModal.value);
                  } else {
                    setSelectedStationFilter(detailModal.value);
                  }
                  setActiveTab('all');
                  setDetailModal(null);
                }}
              >
                <Filter size={14} />
                Ana Tabloda Filtrele
              </button>
              {detailModal?.type === 'plate' && modalVehicle?.id && (
                <button
                  type="button"
                  className="btn-secondary !text-xs !py-1.5 cursor-pointer"
                  onClick={() => {
                    navigate(`/arac-yonetimi/${modalVehicle.id}`);
                  }}
                >
                  <ExternalLink size={14} />
                  Araç Profiline Git
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn-secondary !text-xs !py-1.5 cursor-pointer"
              onClick={() => setDetailModal(null)}
            >
              Kapat
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-100 bg-emerald-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">Toplam Harcama</span>
                <CircleDollarSign size={16} className="text-emerald-600" />
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-700">
                {money(modalTotalAmount)}
              </div>
              <div className="text-[11px] text-emerald-600/80">KDV Dahil</div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-blue-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-800">Toplam Litre</span>
                <Droplet size={16} className="text-blue-600" />
              </div>
              <div className="mt-1 text-lg font-bold text-blue-700">
                {formatNumber(modalTotalQty, 2)} Lt
              </div>
              <div className="text-[11px] text-blue-600/80">Akaryakıt Hacmi</div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-amber-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800">Ort. Litre Fiyatı</span>
                <Fuel size={16} className="text-amber-600" />
              </div>
              <div className="mt-1 text-lg font-bold text-amber-700">
                {money(modalAvgPrice)} / Lt
              </div>
              <div className="text-[11px] text-amber-600/80">Ağırlıklı Ortalama</div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-purple-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-800">
                  {detailModal?.type === 'plate' ? 'Dolum Sayısı' : 'İşlem Sayısı'}
                </span>
                <Building2 size={16} className="text-purple-600" />
              </div>
              <div className="mt-1 text-lg font-bold text-purple-700">
                {modalRecords.length} Adet
              </div>
              <div className="text-[11px] text-purple-600/80">
                {detailModal?.type === 'plate'
                  ? 'Farklı akaryakıt alımı'
                  : `${modalStationVehicleCount} farklı araç`}
              </div>
            </div>
          </div>

          {/* Search bar inside modal */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={
                  detailModal?.type === 'plate'
                    ? 'İstasyon, il, şoför veya tarih ara...'
                    : 'Plaka, araç, şoför veya tarih ara...'
                }
                value={detailQuery}
                onChange={(e) => setDetailQuery(e.target.value)}
                className="input pl-9 !py-1.5 !text-sm"
              />
            </div>
            {detailQuery && (
              <button
                type="button"
                onClick={() => setDetailQuery('')}
                className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                Filtreyi Temizle
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[50vh]">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-200">
                  <tr>
                    <th className="table-th py-2">Tarih</th>
                    {detailModal?.type === 'station' ? (
                      <>
                        <th className="table-th py-2">Plaka</th>
                        <th className="table-th py-2">Araç Bilgisi</th>
                      </>
                    ) : (
                      <th className="table-th py-2">İstasyon & İl</th>
                    )}
                    <th className="table-th py-2">Yakıt Tipi</th>
                    <th className="table-th py-2 text-right">Litre</th>
                    <th className="table-th py-2 text-right">Birim Fiyat</th>
                    <th className="table-th py-2 text-right">Tutar</th>
                    <th className="table-th py-2">Sürücü / Not</th>
                    {canWrite && <th className="table-th py-2 text-right">İşlem</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {modalFilteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    modalFilteredRecords.map((x) => {
                      const v = vehicles.find((item) => item.id === x.vehicle_id || cleanPlate(item.plate) === cleanPlate(x.plate));
                      return (
                        <tr key={x.id} className="hover:bg-gray-50/60">
                          <td className="table-td py-2 whitespace-nowrap">
                            {new Date(x.date).toLocaleDateString('tr-TR')}
                            {!x.date?.includes('T12:00:00') && !x.date?.includes('T00:00:00') ? (
                              <span className="text-[11px] text-gray-400 ml-1 font-mono">
                                {new Date(x.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : null}
                          </td>
                          {detailModal?.type === 'station' ? (
                            <>
                              <td className="table-td py-2 font-mono font-bold text-gray-900">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailQuery('');
                                    setDetailModal({ type: 'plate', value: x.plate });
                                  }}
                                  className="text-brand-600 hover:underline cursor-pointer"
                                  title="Bu aracın tüm dökümüne geç"
                                >
                                  {x.plate}
                                </button>
                              </td>
                              <td className="table-td py-2 text-gray-700">
                                {v ? `${v.brand} ${v.model}` : <span className="italic text-gray-400">Harici Araç</span>}
                              </td>
                            </>
                          ) : (
                            <td className="table-td py-2">
                              <div className="font-medium text-gray-900">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (x.station) {
                                      setDetailQuery('');
                                      setDetailModal({ type: 'station', value: x.station || '' });
                                    }
                                  }}
                                  className="text-left hover:text-brand-600 hover:underline cursor-pointer"
                                  title="Bu istasyonun dökümüne geç"
                                >
                                  {x.station || '—'}
                                </button>
                              </div>
                              {x.city && <div className="text-[10px] text-gray-400">{x.city}</div>}
                            </td>
                          )}
                          <td className="table-td py-2">
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700 font-medium">
                              {x.fuel_type || 'Motorin'}
                            </span>
                          </td>
                          <td className="table-td py-2 text-right font-bold text-gray-900">
                            {formatNumber(x.quantity, 2)} Lt
                          </td>
                          <td className="table-td py-2 text-right text-gray-600">
                            {money(x.unit_price)}
                          </td>
                          <td className="table-td py-2 text-right font-bold text-emerald-700">
                            {money(x.total_amount)}
                          </td>
                          <td className="table-td py-2">
                            <div className="text-gray-800">{x.driver_name || '—'}</div>
                            {x.notes && <div className="text-[10px] text-gray-400 truncate max-w-[140px]" title={x.notes}>{x.notes}</div>}
                          </td>
                          {canWrite && (
                            <td className="table-td py-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  className="text-gray-500 hover:text-brand-600 p-1 cursor-pointer"
                                  onClick={() => {
                                    handleOpenEdit(x);
                                  }}
                                  title="Düzenle"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                                  onClick={() => void handleDelete(x.id)}
                                  title="Sil"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Manual Entry Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Yakıt Girişini Düzenle' : 'Yeni Yakıt Girişi'}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Kayıtlı Araç Seçin (Opsiyonel)</span>
            <select
              className="input"
              value={form.vehicle_id}
              onChange={(e) => handleVehicleSelectInForm(e.target.value)}
            >
              <option value="">Plakayı manuel gir veya araç seç</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} · {v.brand} {v.model}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="label">Plaka *</span>
            <input
              className="input uppercase font-mono font-bold"
              value={form.plate}
              onChange={(e) => handlePlateChangeInForm(e.target.value)}
              placeholder="Örn: 34 ABC 123"
            />
          </label>

          <label>
            <span className="label">Tarih & Saat *</span>
            <input
              type="datetime-local"
              className="input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>

          <label>
            <span className="label">Yakıt Tipi</span>
            <select
              className="input"
              value={form.fuel_type}
              onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
            >
              <option value="Motorin">Motorin (Dizel)</option>
              <option value="Benzin">Kurşunsuz Benzin 95</option>
              <option value="LPG">Otogaz (LPG)</option>
              <option value="Elektrik">Elektrik (Şarj)</option>
              <option value="AdBlue">AdBlue</option>
            </select>
          </label>

          <label>
            <span className="label">Miktar (Litre)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.quantity}
              onChange={(e) => handleQuantityOrPriceChange(e.target.value, form.unit_price)}
              placeholder="Örn: 45.50"
            />
          </label>

          <label>
            <span className="label">Litre Birim Fiyatı (₺)</span>
            <input
              type="number"
              step="0.001"
              min="0"
              className="input"
              value={form.unit_price}
              onChange={(e) => handleQuantityOrPriceChange(form.quantity, e.target.value)}
              placeholder="Örn: 44.50"
            />
          </label>

          <label>
            <span className="label">Toplam Tutar (₺) *</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input font-bold"
              value={form.total_amount}
              onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
              placeholder="Örn: 2024.75"
            />
          </label>

          <label>
            <span className="label">İstasyon / Tedarikçi</span>
            <input
              className="input"
              value={form.station}
              onChange={(e) => setForm({ ...form, station: e.target.value })}
              placeholder="Örn: Shell Maslak"
            />
          </label>

          <label>
            <span className="label">İl / Şehir</span>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Örn: İstanbul"
            />
          </label>

          <label>
            <span className="label">Kilometre (KM)</span>
            <input
              type="number"
              className="input"
              value={form.km}
              onChange={(e) => setForm({ ...form, km: e.target.value })}
              placeholder="Örn: 125400"
            />
          </label>

          <label>
            <span className="label">Sürücü Adı</span>
            <input
              className="input"
              value={form.driver_name}
              onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
              placeholder="Örn: Ahmet Yılmaz"
            />
          </label>

          <label>
            <span className="label">Yakıt / Filo Kart No</span>
            <input
              className="input"
              value={form.fuel_card_no}
              onChange={(e) => setForm({ ...form, fuel_card_no: e.target.value })}
              placeholder="Örn: 7004-xxxx"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="label">Notlar</span>
            <textarea
              className="input min-h-20"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ek açıklama..."
            />
          </label>

          <button
            className="btn-primary sm:col-span-2"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title={`İçe Aktarım Önizleme - ${importFileName}`}
      >
        <div className="space-y-4 max-h-[75vh] flex flex-col">
          <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3 text-sm text-blue-800 border border-blue-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-blue-600" />
              <span>
                <strong>{parsedRows.length} adet</strong> yakıt hareketi okundu. Plakalar filodaki araçlarla otomatik eşleştirildi.
              </span>
            </div>
            <div className="font-bold text-blue-900">
              Toplam Tutar: {money(parsedRows.reduce((s, x) => s + x.total_amount, 0))}
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto flex-1 border rounded-lg max-h-[50vh]">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="table-th py-2">Tarih</th>
                  <th className="table-th py-2">Plaka</th>
                  <th className="table-th py-2">Filo Eşleşmesi</th>
                  <th className="table-th py-2">Yakıt Tipi</th>
                  <th className="table-th py-2 text-right">Miktar (Lt)</th>
                  <th className="table-th py-2 text-right">Birim Fiyat</th>
                  <th className="table-th py-2 text-right">Toplam Tutar</th>
                  <th className="table-th py-2">İstasyon & İl</th>
                  <th className="table-th py-2 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, idx) => {
                  const vehicle = vehicles.find((v) => cleanPlate(v.plate) === cleanPlate(row.plate) || v.id === row.matchedVehicleId);
                  return (
                    <tr key={idx} className="border-t hover:bg-gray-50/50">
                      <td className="table-td py-1.5 whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="table-td py-1.5 font-bold font-mono text-gray-900">
                        {row.plate}
                      </td>
                      <td className="table-td py-1.5">
                        {vehicle ? (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 font-semibold border border-emerald-200">
                            {vehicle.brand} {vehicle.model}
                          </span>
                        ) : (
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-200">
                            Kayıtsız Plaka
                          </span>
                        )}
                      </td>
                      <td className="table-td py-1.5">{row.fuel_type}</td>
                      <td className="table-td py-1.5 text-right font-semibold">{formatNumber(row.quantity, 2)} Lt</td>
                      <td className="table-td py-1.5 text-right">{money(row.unit_price)}</td>
                      <td className="table-td py-1.5 text-right font-bold text-emerald-700">{money(row.total_amount)}</td>
                      <td className="table-td py-1.5 text-gray-700">
                        {row.station} {row.city ? `(${row.city})` : ''}
                      </td>
                      <td className="table-td py-1.5 text-center">
                        <button
                          className="text-red-500 hover:text-red-700 p-1"
                          onClick={() => setParsedRows(parsedRows.filter((_, i) => i !== idx))}
                          title="Satırı Kaldır"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              className="btn-secondary"
              onClick={() => setImportModalOpen(false)}
              disabled={importing}
            >
              İptal
            </button>
            <button
              className="btn-primary"
              onClick={() => void handleConfirmImport()}
              disabled={importing || parsedRows.length === 0}
            >
              {importing ? 'Sisteme İşleniyor...' : `${parsedRows.length} Kaydı Onayla ve İçe Aktar`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
