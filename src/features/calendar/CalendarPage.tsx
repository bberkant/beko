import { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  CalendarDays, 
  Car, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Gavel, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  ListTodo, 
  Pencil, 
  Calendar as CalendarIcon, 
  X, 
  Filter, 
  Check,
  Landmark,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { useStore } from '../credit-cards/data/store';
import { useVehicles } from '../vehicles/store';
import { useSafeBills } from '../bills/data/store';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { fixCorruptedTurkishText } from '../../lib/turkishTextFixer';
import { resolveCardDueDate, resolveCardOutstandingDebt } from '../credit-cards/lib/billingDateEngine';

export type EventType = 
  | 'note'
  | 'credit-card' 
  | 'tender' 
  | 'check' 
  | 'insurance' 
  | 'inspection' 
  | 'bill';

export const ALL_EVENT_TYPES: EventType[] = [
  'note',
  'credit-card',
  'tender',
  'insurance',
  'inspection',
  'check',
  'bill'
];

export const DEFAULT_ACTIVE_EVENT_TYPES: EventType[] = [
  'note',
  'credit-card',
  'tender',
  'insurance',
  'inspection',
  'check',
  'bill'
];

interface CalendarEvent { 
  id: string; 
  date: string; 
  code: string;
  title: string; 
  subtitle?: string; 
  institution?: string; 
  detail: string; 
  type: EventType; 
  to: string; 
  amount?: string; 
  teminat?: string; 
  statusLabel?: string; 
  statusClass?: string; 
  timeStr?: string; 
}

interface TenderRow { 
  id: string; 
  tender_number: string; 
  title: string; 
  institution: string; 
  deadline_at: string; 
  status: string; 
  tender_type?: string; 
  bid_amount?: number | null; 
  currency?: string; 
  teminat_mektubu?: string; 
}

interface CheckRow {
  id: string;
  amount: number | null;
  due_date: string;
  debtor: string | null;
  creditor: string | null;
  kesideci: string | null;
  bank_name: string | null;
  status: string | null;
  check_no: string | null;
  check_type: string | null;
  bank_branch?: string | null;
}

const styles: Record<EventType, { label: string; dot: string; badge: string }> = {
  note: { label: 'NOT', dot: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  'credit-card': { label: 'KART', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border border-red-200' },
  tender: { label: 'İHALE', dot: 'bg-purple-600', badge: 'bg-purple-50 text-purple-700 border border-purple-200' },
  insurance: { label: 'SİGORTA', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  inspection: { label: 'MUAYENE', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  check: { label: 'ÇEK / SENET', dot: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
  bill: { label: 'FATURA', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-800 border border-orange-200' },
};

const dateKey = (value: string) => value.slice(0, 10);
const parseDate = (value: string) => { const [y, m, d] = dateKey(value).split('-').map(Number); return new Date(y, m - 1, d); };
const formatDate = (value: string) => parseDate(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

const formatDateShort = (value: string) => {
  try {
    const [y, m, d] = dateKey(value).split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dayStr = dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const todayDt = new Date();
    todayDt.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dt.getTime() - todayDt.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return `${dayStr} (Bugün)`;
    if (diffDays === 1) return `${dayStr} (Yarın)`;
    if (diffDays === -1) return `${dayStr} (Dün)`;
    if (diffDays > 1 && diffDays <= 7) return `${dayStr} (${diffDays} gün sonra)`;
    if (diffDays > 7 && diffDays <= 30) return `${dayStr} (${Math.round(diffDays / 7)} hf sonra)`;
    if (diffDays < -1) return `${dayStr} (${Math.abs(diffDays)} gün önce)`;
    return dayStr;
  } catch {
    return value;
  }
};

const DEFAULT_ORG_ID = '13b8da90-27d1-440d-a8f4-eb50dadd6391';

export function useCalendarEvents(){
  const { user } = useAuth();
  const { cards, statements } = useStore();
  const { vehicles } = useVehicles();
  const billsContext = useSafeBills();

  const [tenders, setTenders] = useState<TenderRow[]>(() => {
    try {
      const cached = localStorage.getItem('dars_cached_tenders');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [checks, setChecks] = useState<CheckRow[]>(() => {
    try {
      const cached = localStorage.getItem('dars_cached_checks');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const orgId = user?.organizationId || DEFAULT_ORG_ID;

    const fetchTenders = async () => {
      try {
        const { data, error } = await supabase
          .from('tenders')
          .select('id,tender_number,title,institution,deadline_at,status,tender_type,bid_amount,currency,teminat_mektubu')
          .eq('organization_id', orgId)
          .order('deadline_at');

        if (!active) return;
        if (error) {
          console.warn('Takvim ihale verileri yüklenemedi:', error);
        } else if (data) {
          setTenders(data as TenderRow[]);
          try {
            localStorage.setItem('dars_cached_tenders', JSON.stringify(data));
          } catch {}
        }
      } catch (err) {
        console.warn('Takvim ihale sorgu hatası:', err);
      }
    };

    const fetchChecks = async () => {
      try {
        const { data, error } = await supabase
          .from('ebs_checks')
          .select('id, amount, due_date, debtor, creditor, kesideci, bank_name, bank_branch, status, check_no, check_type')
          .eq('organization_id', orgId)
          .neq('status', 'Ödendi')
          .neq('status', 'Tahsil Edildi')
          .neq('status', 'İptal')
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(3000);

        if (!active) return;
        if (error) {
          console.warn('Takvim çek verileri yüklenemedi:', error);
        } else if (data) {
          setChecks(data as CheckRow[]);
          try {
            localStorage.setItem('dars_cached_checks', JSON.stringify(data));
          } catch {}
        }
      } catch (err) {
        console.warn('Takvim çek sorgu hatası:', err);
      }
    };

    void Promise.allSettled([fetchTenders(), fetchChecks()]).then(() => {
      if (active) setLoading(false);
    });

    const channel = supabase
      .channel('calendar_all_entities_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenders' }, () => {
        void fetchTenders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ebs_checks' }, () => {
        void fetchChecks();
      })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.organizationId]);

  const events = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = [];

    // 1. Çek & Senetler (Portföy / Borç Çeklerimiz)
    for (const c of checks) {
      if (!c.due_date) continue;
      const isCustomer = c.check_type === 'alinan' || c.check_type === 'Musteri';
      const person = fixCorruptedTurkishText(c.kesideci || c.debtor || c.creditor || 'Çek');
      const bank = fixCorruptedTurkishText(c.bank_name || 'Banka Belirtilmemiş', 'bank_name');
      const branch = fixCorruptedTurkishText(c.bank_branch);
      const fullBank = branch ? `${bank} (${branch})` : bank;
      const dKey = dateKey(c.due_date);

      result.push({
        id: `check-${c.id}`,
        date: dKey,
        code: c.check_no ? `Çek: ${c.check_no}` : (isCustomer ? 'Müşteri Çeki' : 'Kendi Çekimiz'),
        title: person || 'Çek Kaydı',
        subtitle: `${isCustomer ? 'Portföy (Müşteri)' : 'Kendi Çekimiz'} · ${fullBank}`,
        institution: bank,
        detail: `${fullBank} · No: ${c.check_no || '—'} · ${person}`,
        type: 'check',
        to: '/muhasebe/cek-senet',
        amount: `${Number(c.amount || 0).toLocaleString('tr-TR')} ₺`,
        teminat: c.status === 'Teminata Verildi' ? 'Teminata Verildi' : '—',
        statusLabel: c.status || (isCustomer ? 'Portföyde' : 'Kesilen Çek'),
        statusClass: isCustomer 
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
          : 'bg-rose-50 text-rose-700 border border-rose-200',
        timeStr: formatDate(c.due_date)
      });
    }

    // 2. Kredi Kartları
    for (const card of cards) {
      const debt = resolveCardOutstandingDebt(card, statements);
      if (card.status !== 'aktif' || card.limit <= 0 || debt <= 0) continue;
      const dueDate = resolveCardDueDate(card, statements).date;
      result.push({
        id: `card-${card.id}`,
        date: dateKey(dueDate),
        code: `•••• ${card.last4}`,
        title: `${card.bank} (${card.cardName || 'Kart'})`,
        subtitle: `${card.cardName} •••• ${card.last4}`,
        institution: card.holder ? `Kullanan: ${card.holder}` : 'Şirket Kartı',
        detail: `${card.cardName} •••• ${card.last4}`,
        type: 'credit-card',
        to: `/finans/kredi-kartlari/${card.id}`,
        amount: `${Number(debt).toLocaleString('tr-TR')} ₺`,
        teminat: '—',
        statusLabel: 'Ödeme Bekliyor',
        statusClass: 'bg-red-50 text-red-700 border border-red-200',
        timeStr: formatDate(dueDate)
      });
    }

    // 3. Şirket Faturaları (Elektrik, Su, Doğalgaz, İnternet vb.)
    const bills = billsContext?.bills || [];
    const invoices = billsContext?.invoices || [];

    for (const b of bills) {
      if (!b.dueDate || b.billStatus === 'odendi') continue;
      const dKey = dateKey(b.dueDate);
      result.push({
        id: `bill-${b.id}`,
        date: dKey,
        code: b.subscriberNo ? `Abn: ${b.subscriberNo}` : 'FATURA',
        title: b.name || 'Şirket Faturası',
        subtitle: `${(b.category || 'FATURA').toUpperCase()} · ${b.company || 'Genel'}`,
        institution: b.name || 'Kurumsal Fatura',
        detail: `${(b.category || '').toUpperCase()} faturası ${b.notes ? `(${b.notes})` : ''}`,
        type: 'bill',
        to: '/faturalar',
        amount: b.currentAmount > 0 ? `${Number(b.currentAmount).toLocaleString('tr-TR')} ₺` : '—',
        teminat: '—',
        statusLabel: b.autoPayment ? 'Otomatik Ödeme' : 'Ödeme Bekliyor',
        statusClass: b.autoPayment 
          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
          : 'bg-orange-50 text-orange-700 border border-orange-200',
        timeStr: formatDate(b.dueDate)
      });
    }

    for (const inv of invoices) {
      if (!inv.dueDate || inv.status === 'odendi') continue;
      const dKey = dateKey(inv.dueDate);
      const exists = result.some(e => e.id === `bill-${inv.billId}` && e.date === dKey);
      if (exists) continue;

      const parentBill = bills.find(b => b.id === inv.billId);
      const remaining = Number(inv.amount || 0) - Number(inv.paidAmount || 0);

      result.push({
        id: `bill-inv-${inv.id}`,
        date: dKey,
        code: inv.invoiceNo || (parentBill?.subscriberNo ? `Abn: ${parentBill.subscriberNo}` : 'FATURA'),
        title: parentBill?.name || 'Şirket Faturası',
        subtitle: `${inv.period ? `${inv.period} Dönemi · ` : ''}${parentBill ? parentBill.category.toUpperCase() : 'FATURA'}`,
        institution: parentBill?.name || 'Kurumsal Fatura',
        detail: `${parentBill?.name || 'Fatura'} · No: ${inv.invoiceNo || '—'}`,
        type: 'bill',
        to: '/faturalar',
        amount: remaining > 0 ? `${remaining.toLocaleString('tr-TR')} ₺` : '—',
        teminat: '—',
        statusLabel: inv.status === 'kismi' ? 'Kısmi Ödendi' : 'Ödeme Bekliyor',
        statusClass: inv.status === 'kismi' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-orange-50 text-orange-700 border border-orange-200',
        timeStr: formatDate(inv.dueDate)
      });
    }

    // 4. Araç Muayene, Sigorta ve Kasko
    for (const vehicle of vehicles) {
      if (vehicle.inspectionDate) {
        result.push({
          id: `inspection-${vehicle.id}`,
          date: dateKey(vehicle.inspectionDate),
          code: vehicle.plate,
          title: `${vehicle.brand} ${vehicle.model}`,
          subtitle: `${vehicle.brand} ${vehicle.model} · Periyodik Muayene`,
          institution: 'Araç Muayene İstasyonu (TÜVTÜRK)',
          detail: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`,
          type: 'inspection',
          to: `/arac-yonetimi/${vehicle.id}`,
          amount: '—',
          teminat: '—',
          statusLabel: 'Muayene',
          statusClass: 'bg-amber-50 text-amber-700 border border-amber-200',
          timeStr: formatDate(vehicle.inspectionDate)
        });
      }
      if (vehicle.insuranceDate) {
        result.push({
          id: `insurance-${vehicle.id}`,
          date: dateKey(vehicle.insuranceDate),
          code: vehicle.plate,
          title: `${vehicle.brand} ${vehicle.model}`,
          subtitle: `${vehicle.brand} ${vehicle.model} · Trafik Sigortası`,
          institution: vehicle.insuranceCompany || 'Trafik Sigortası',
          detail: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`,
          type: 'insurance',
          to: `/arac-yonetimi/${vehicle.id}`,
          amount: '—',
          teminat: '—',
          statusLabel: 'Trafik Sigortası',
          statusClass: 'bg-blue-50 text-blue-700 border border-blue-200',
          timeStr: formatDate(vehicle.insuranceDate)
        });
      }
      if (vehicle.cascoDate) {
        result.push({
          id: `casco-${vehicle.id}`,
          date: dateKey(vehicle.cascoDate),
          code: vehicle.plate,
          title: `${vehicle.brand} ${vehicle.model}`,
          subtitle: `${vehicle.brand} ${vehicle.model} · Kasko Poliçesi`,
          institution: vehicle.kaskoCompany || 'Kasko Sigortası',
          detail: `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`,
          type: 'insurance',
          to: `/arac-yonetimi/${vehicle.id}`,
          amount: '—',
          teminat: '—',
          statusLabel: 'Kasko',
          statusClass: 'bg-blue-50 text-blue-700 border border-blue-200',
          timeStr: formatDate(vehicle.cascoDate)
        });
      }
    }

    // 5. İhaleler
    for (const tender of tenders) {
      if (['kazanildi', 'kaybedildi', 'iptal'].includes(tender.status)) continue;
      const d = new Date(tender.deadline_at);
      const timeStr = !isNaN(d.getTime()) 
        ? `${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
        : formatDate(tender.deadline_at);

      result.push({
        id: `tender-${tender.id}`,
        date: dateKey(tender.deadline_at),
        code: tender.tender_number,
        title: tender.title || `${tender.tender_number} İhale`,
        subtitle: `${tender.tender_number}${tender.tender_type ? ` · ${tender.tender_type}` : ' · İhale'}`,
        institution: tender.institution || '—',
        detail: `${tender.title} · ${tender.institution}`,
        type: 'tender',
        to: '/ihaleler',
        amount: tender.bid_amount ? `${Number(tender.bid_amount).toLocaleString('tr-TR')} ${tender.currency || '₺'}` : '—',
        teminat: tender.teminat_mektubu || '—',
        statusLabel: tender.status === 'hazirlaniyor' ? 'Hazırlanıyor' : tender.status === 'teklif_verildi' ? 'Teklif Verildi' : 'Hazırlanıyor',
        statusClass: 'bg-purple-50 text-purple-700 border border-purple-200',
        timeStr: timeStr
      });
    }

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [cards, statements, vehicles, tenders, checks, billsContext?.bills, billsContext?.invoices]);

  return { events, loading };
}

interface CalendarNote { 
  id: string; 
  content: string; 
  completed: boolean; 
  date: string | null; 
  created_by?: string;
}

export function CalendarPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { events, loading } = useCalendarEvents();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(() => dateKey(new Date().toISOString()));

  const userKey = user?.id || user?.email || 'default';
  const notesStorageKey = `dars_calendar_notes_${userKey}`;
  const filterStorageKey = `dars_calendar_filters_${userKey}`;

  // 1. Dynamic Event Types Filter (Persisted per user, default: widely used operational types)
  const [activeTypes, setActiveTypes] = useState<EventType[]>(() => {
    try {
      const saved = localStorage.getItem(`dars_calendar_filters_${user?.id || user?.email || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((t: any) => ALL_EVENT_TYPES.includes(t));
          if (valid.length > 0) return valid;
        }
      }
    } catch {}
    return DEFAULT_ACTIVE_EVENT_TYPES;
  });

  // Re-sync filter preferences if user identity finishes resolving
  useEffect(() => {
    try {
      const saved = localStorage.getItem(filterStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((t: any) => ALL_EVENT_TYPES.includes(t));
          if (valid.length > 0) {
            setActiveTypes(valid);
          }
        }
      }
    } catch {}
  }, [filterStorageKey]);

  const toggleEventType = (type: EventType) => {
    setActiveTypes(prev => {
      let next: EventType[];
      if (prev.includes(type)) {
        next = prev.filter(t => t !== type);
      } else {
        next = [...prev, type];
      }
      try {
        localStorage.setItem(filterStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const enableAllTypes = () => {
    setActiveTypes(ALL_EVENT_TYPES);
    try {
      localStorage.setItem(filterStorageKey, JSON.stringify(ALL_EVENT_TYPES));
    } catch {}
  };

  const resetToDefaultTypes = () => {
    setActiveTypes(DEFAULT_ACTIVE_EVENT_TYPES);
    try {
      localStorage.setItem(filterStorageKey, JSON.stringify(DEFAULT_ACTIVE_EVENT_TYPES));
    } catch {}
  };

  const isCustomFilter = useMemo(() => {
    if (activeTypes.length !== DEFAULT_ACTIVE_EVENT_TYPES.length) return true;
    return !DEFAULT_ACTIVE_EVENT_TYPES.every(t => activeTypes.includes(t));
  }, [activeTypes]);

  // 2. User-Isolated Notes State & Cache
  const [notes, setNotes] = useState<CalendarNote[]>(() => {
    try {
      const local = localStorage.getItem(`dars_calendar_notes_${user?.id || user?.email || 'default'}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const saveNotesCache = useCallback((updated: CalendarNote[]) => {
    try {
      localStorage.setItem(`dars_calendar_notes_${user?.id || user?.email || 'default'}`, JSON.stringify(updated));
    } catch {}
  }, [user?.id, user?.email]);

  const [newNote, setNewNote] = useState('');
  const [newDateNote, setNewDateNote] = useState('');
  const [noteTargetDate, setNoteTargetDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const [notesLoading, setNotesLoading] = useState(() => {
    try {
      const local = localStorage.getItem(`dars_calendar_notes_${user?.id || user?.email || 'default'}`);
      return !local || JSON.parse(local).length === 0;
    } catch {
      return false;
    }
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showCompletedDateNotes, setShowCompletedDateNotes] = useState(false);
  const [datePickerNoteId, setDatePickerNoteId] = useState<string | null>(null);

  // Sync cache if user identity finishes resolving
  useEffect(() => {
    if (!user?.id && !user?.email) return;
    try {
      const local = localStorage.getItem(notesStorageKey);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          setNotes(parsed);
        }
      }
    } catch {}
  }, [notesStorageKey, user?.id, user?.email]);

  // Fetch only this user's notes from Supabase
  const fetchNotes = useCallback(async () => {
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    try {
      let query = supabase
        .from('calendar_notes')
        .select('id,content,completed,date,created_by')
        .eq('organization_id', orgId);

      if (user?.id) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) {
        console.warn('Notes load error, preserving local cache:', error);
        return;
      }

      if (Array.isArray(data)) {
        setNotes(data);
        saveNotesCache(data);
      }
    } catch (err) {
      console.warn('Calendar notes fetch exception:', err);
    } finally {
      setNotesLoading(false);
    }
  }, [user?.id, user?.organizationId, saveNotesCache]);

  useEffect(() => {
    void fetchNotes();

    const channelName = user?.id ? `calendar_notes_user_${user.id}` : 'calendar_notes_channel';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'calendar_notes',
        ...(user?.id ? { filter: `created_by=eq.${user.id}` } : {})
      }, () => {
        void fetchNotes();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotes]);

  // Add note from Yapılacaklar & Notlar box (with optional reminder date)
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newNote.trim();
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    if (!text) return;

    const targetDate = noteTargetDate || null;
    const tempId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
    const freshNote: CalendarNote = { 
      id: tempId, 
      content: text, 
      completed: false, 
      date: targetDate,
      created_by: user?.id
    };
    const updatedNotes = [...notes, freshNote];
    setNotes(updatedNotes);
    setNewNote('');
    setNoteTargetDate('');
    setShowDatePicker(false);
    saveNotesCache(updatedNotes);

    try {
      const { data, error } = await supabase
        .from('calendar_notes')
        .insert({
          organization_id: orgId,
          created_by: user?.id,
          content: text,
          completed: false,
          date: targetDate
        })
        .select('id')
        .single();
      if (!error && data) {
        setNotes(prev => {
          const synced = prev.map(n => n.id === tempId ? { ...n, id: data.id } : n);
          saveNotesCache(synced);
          return synced;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add note for selected calendar date from bottom detail table
  const handleAddDateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newDateNote.trim();
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    if (!text) return;

    const tempId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
    const freshNote: CalendarNote = { 
      id: tempId, 
      content: text, 
      completed: false, 
      date: selected,
      created_by: user?.id
    };
    const updatedNotes = [...notes, freshNote];
    setNotes(updatedNotes);
    setNewDateNote('');
    saveNotesCache(updatedNotes);

    try {
      const { data, error } = await supabase
        .from('calendar_notes')
        .insert({
          organization_id: orgId,
          created_by: user?.id,
          content: text,
          completed: false,
          date: selected
        })
        .select('id')
        .single();
      if (!error && data) {
        setNotes(prev => {
          const synced = prev.map(n => n.id === tempId ? { ...n, id: data.id } : n);
          saveNotesCache(synced);
          return synced;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleNote = async (id: string, completed: boolean) => {
    const updatedNotes = notes.map(n => n.id === id ? { ...n, completed: !completed } : n);
    setNotes(updatedNotes);
    saveNotesCache(updatedNotes);
    try {
      let query = supabase.from('calendar_notes').update({ completed: !completed }).eq('id', id);
      if (user?.id) query = query.eq('created_by', user.id);
      await query;
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    saveNotesCache(updatedNotes);
    try {
      let query = supabase.from('calendar_notes').delete().eq('id', id);
      if (user?.id) query = query.eq('created_by', user.id);
      await query;
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllNotes = async () => {
    const orgId = user?.organizationId || DEFAULT_ORG_ID;
    setNotes([]);
    setConfirmClear(false);
    saveNotesCache([]);

    try {
      let query = supabase.from('calendar_notes').delete().eq('organization_id', orgId);
      if (user?.id) query = query.eq('created_by', user.id);
      await query;
    } catch (err) {
      console.error('Notes clear all error:', err);
    }
  };

  const handleSaveNote = async (id: string, newContent: string) => {
    const text = newContent.trim();
    if (!text) {
      setEditingNoteId(null);
      return;
    }
    const updatedNotes = notes.map(n => n.id === id ? { ...n, content: text } : n);
    setNotes(updatedNotes);
    saveNotesCache(updatedNotes);
    setEditingNoteId(null);
    try {
      let query = supabase.from('calendar_notes').update({ content: text }).eq('id', id);
      if (user?.id) query = query.eq('created_by', user.id);
      await query;
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignNoteDate = async (id: string, newDate: string | null) => {
    const updatedNotes = notes.map(n => n.id === id ? { ...n, date: newDate } : n);
    setNotes(updatedNotes);
    saveNotesCache(updatedNotes);
    try {
      let query = supabase.from('calendar_notes').update({ date: newDate }).eq('id', id);
      if (user?.id) query = query.eq('created_by', user.id);
      await query;
    } catch (err) {
      console.error('Note date update error:', err);
    }
  };

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);
  
  const noteEvents = useMemo<CalendarEvent[]>(() => {
    return notes
      .filter(n => n.date)
      .map(n => ({
        id: `note-${n.id}`,
        date: n.date!,
        code: 'NOT',
        title: n.content,
        detail: n.completed ? 'Tamamlandı' : 'Yapılacak',
        type: 'note' as const,
        to: ''
      }));
  }, [notes]);

  // Merge notes with all system events
  const rawAllEvents = useMemo(() => {
    return [...noteEvents, ...events];
  }, [noteEvents, events]);

  // Real-time counts per category for the filter badges
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<EventType, number>> = {};
    for (const e of rawAllEvents) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return counts;
  }, [rawAllEvents]);

  // All events strictly filtered by activeTypes selected by user!
  const allEvents = useMemo(() => {
    return rawAllEvents.filter(e => activeTypes.includes(e.type));
  }, [rawAllEvents, activeTypes]);

  const byDate = useMemo(() => allEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    (acc[event.date] ??= []).push(event);
    return acc;
  }, {}), [allEvents]);
  
  const hasCompletedNotesForSelectedDate = useMemo(() => {
    const rawEvents = byDate[selected] ?? [];
    return rawEvents.some(e => {
      if (e.type === 'note') {
        const noteId = e.id.replace('note-', '');
        return notes.find(n => n.id === noteId)?.completed;
      }
      return false;
    });
  }, [byDate, selected, notes]);

  const selectedEvents = useMemo(() => {
    const rawEvents = byDate[selected] ?? [];
    return rawEvents.filter(e => {
      if (e.type === 'note') {
        const noteId = e.id.replace('note-', '');
        const note = notes.find(n => n.id === noteId);
        if (note?.completed && !showCompletedDateNotes) return false;
      }
      return true;
    });
  }, [byDate, selected, notes, showCompletedDateNotes]);

  const today = dateKey(new Date().toISOString());

  // Sorted user notes for Yapılacaklar & Notlar:
  // Incomplete first (dated ones by date, then undated), completed at the bottom
  const displayNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return 0;
    });
  }, [notes]);

  return (
    <div className={embedded ? '' : 'mx-auto max-w-7xl'}>
      {!embedded && (
        <PageHeader 
          title="Takvim" 
          description="Ödeme, araç ve ihale son tarihlerini tek ekrandan takip edin." 
          actions={
            <button 
              className="btn-secondary" 
              onClick={() => {
                const d = new Date();
                setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                setSelected(today);
              }}
            >
              Bugün
            </button>
          }
        />
      )} 

      {/* Filtre Rozetleri / Kategori Seçimi */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-gray-500 mr-1 flex items-center gap-1.5 pl-1">
            <Filter size={13} className="text-gray-400" />
            <span>Görünüm Filtreleri:</span>
          </span>
          {ALL_EVENT_TYPES.map(key => {
            const s = styles[key];
            const isActive = activeTypes.includes(key);
            const count = typeCounts[key] || 0;
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleEventType(key)}
                title={isActive ? `${s.label} filtresini gizle` : `${s.label} filtresini göster`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer select-none ${
                  isActive 
                    ? `${s.badge} shadow-xs ring-1 ring-black/5 hover:brightness-95` 
                    : 'bg-gray-50 text-gray-400 border border-gray-200 opacity-60 hover:opacity-100 hover:text-gray-600'
                }`}
              >
                <span className={`inline-block h-2 w-2 rounded-full transition-colors ${isActive ? s.dot : 'bg-gray-300'}`} />
                <span className={isActive ? '' : 'line-through'}>{s.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-black/10' : 'bg-gray-200 text-gray-500'}`}>
                    {count}
                  </span>
                )}
                {isActive && <Check size={11} className="stroke-[3] opacity-60 ml-0.5" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pr-1">
          {isCustomFilter && (
            <button
              type="button"
              onClick={resetToDefaultTypes}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
              title="En çok kullanılan varsayılan filtrelere dön"
            >
              <RotateCcw size={12} />
              <span>Varsayılan</span>
            </button>
          )}

          {activeTypes.length < ALL_EVENT_TYPES.length ? (
            <button
              type="button"
              onClick={enableAllTypes}
              className="text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors"
            >
              Tümünü Göster ({ALL_EVENT_TYPES.length})
            </button>
          ) : (
            <button
              type="button"
              onClick={resetToDefaultTypes}
              className="text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Varsayılana Dön
            </button>
          )}
        </div>
      </div>

      {/* 1. Üst Kısım: Takvim (Sol) + Genel Yapılacaklar & Notlar (Sağ) */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] mb-6">
        {/* Sol: Takvim Kartı */}
        <div className="card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 p-4 bg-white">
            <button className="btn-secondary !p-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Önceki ay"><ChevronLeft size={18}/></button>
            <h2 className="text-base font-semibold capitalize text-gray-900">{month.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</h2>
            <button className="btn-secondary !p-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Sonraki ay"><ChevronRight size={18}/></button>
          </div>
          <div className="grid grid-cols-7 border-b bg-gray-50/80">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(x => (
              <div key={x} className="p-2 text-center text-xs font-semibold text-gray-500">{x}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map(d => {
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const dayEvents = (byDate[key] ?? []).filter(e => {
                if (e.type === 'note') {
                  const noteId = e.id.replace('note-', '');
                  return !notes.find(n => n.id === noteId)?.completed;
                }
                return true;
              });
              const current = d.getMonth() === month.getMonth();
              return (
                <button 
                  key={key} 
                  onClick={() => setSelected(key)} 
                  className={`min-h-24 border-b border-r border-gray-100 p-2 text-left transition-colors hover:bg-gray-50 ${selected === key ? 'bg-brand-50/80 ring-2 ring-inset ring-brand-400' : ''} ${current ? 'bg-white' : 'bg-gray-50/50 text-gray-300'}`}
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${key === today ? 'bg-brand-600 text-white shadow-sm font-bold' : selected === key ? 'bg-brand-100 text-brand-800' : 'text-gray-700'}`}>
                    {d.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} className="flex items-center gap-1 truncate text-[10px] text-gray-600">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles[e.type].dot}`}/>
                        <span className="truncate">{e.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] font-semibold text-brand-600">
                        +{dayEvents.length - 3} etkinlik
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sağ: Kullanıcıya Özel Yapılacaklar & Notlar */}
        <div className="h-full flex flex-col">
          <SectionCard 
            title="Yapılacaklar & Notlar" 
            icon={<ListTodo size={16} className="text-gray-400"/>}
            className="shadow-sm flex-1 flex flex-col"
            bodyClassName="flex-1 flex flex-col"
          >
            {/* Note Input & Calendar Date Picker Form */}
            <form onSubmit={handleAddNote} className="mb-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-1.5">
                <input 
                  type="text" 
                  className="input !py-1.5 !text-sm flex-1" 
                  placeholder="Yeni not veya görev ekle..." 
                  value={newNote} 
                  onChange={e => setNewNote(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowDatePicker(v => !v)}
                  title="Tarih veya Hatırlatma Seç"
                  className={`p-2 rounded-lg border transition-colors shrink-0 ${
                    noteTargetDate 
                      ? 'bg-brand-50 border-brand-300 text-brand-700 font-bold' 
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <CalendarIcon size={16} />
                </button>
                <button type="submit" className="btn-primary !p-2 shrink-0" title="Not Ekle">
                  <Plus size={16}/>
                </button>
              </div>

              {/* Active Selected Date Badge */}
              {noteTargetDate && (
                <div className="mt-2 flex items-center justify-between bg-brand-50 border border-brand-200/80 rounded-lg px-2.5 py-1 text-xs text-brand-800">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CalendarIcon size={12} className="text-brand-600" />
                    <span>Hatırlatma: {formatDateShort(noteTargetDate)}</span>
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setNoteTargetDate('')}
                    className="text-brand-600 hover:text-brand-900 p-0.5"
                    title="Tarihi Kaldır"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Date Picker Popdown with Quick Presets */}
              {showDatePicker && (
                <div className="mt-2 p-2.5 bg-gray-50/90 border border-gray-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-700 font-bold text-[11px]">
                    <span>Hatırlatma / Vade Tarihi:</span>
                    <button 
                      type="button" 
                      onClick={() => setShowDatePicker(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      Kapat
                    </button>
                  </div>
                  <input 
                    type="date" 
                    min={today}
                    value={noteTargetDate} 
                    onChange={e => {
                      setNoteTargetDate(e.target.value);
                      if (e.target.value) setShowDatePicker(false);
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setNoteTargetDate(today);
                        setShowDatePicker(false);
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-gray-100 border border-gray-200 text-[10px] font-medium text-gray-700"
                    >
                      Bugün
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        setNoteTargetDate(dateKey(d.toISOString()));
                        setShowDatePicker(false);
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-gray-100 border border-gray-200 text-[10px] font-medium text-gray-700"
                    >
                      Yarın
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        setNoteTargetDate(dateKey(d.toISOString()));
                        setShowDatePicker(false);
                      }}
                      className="px-2 py-0.5 rounded bg-brand-50 hover:bg-brand-100 border border-brand-200 text-[10px] font-bold text-brand-700"
                    >
                      1 Hafta Sonra
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + 1);
                        setNoteTargetDate(dateKey(d.toISOString()));
                        setShowDatePicker(false);
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-gray-100 border border-gray-200 text-[10px] font-medium text-gray-700"
                    >
                      1 Ay Sonra
                    </button>
                  </div>
                </div>
              )}
            </form>

            {/* Notes List */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {notesLoading ? (
                <p className="py-6 text-center text-xs text-gray-400">Notlar yükleniyor...</p>
              ) : displayNotes.length === 0 ? (
                <p className="py-8 text-center text-xs text-gray-400">Henüz not veya görev eklenmemiş.</p>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {displayNotes.map(note => (
                    <div 
                      key={note.id} 
                      className={`group flex items-start justify-between gap-2.5 rounded-lg border p-2.5 transition-all ${
                        note.completed 
                          ? 'border-gray-100 bg-gray-50/50 opacity-60' 
                          : 'border-gray-100 hover:border-brand-200 hover:bg-brand-50/20 bg-white'
                      }`}
                    >
                      <button 
                        type="button"
                        onClick={() => void handleToggleNote(note.id, note.completed)}
                        className="mt-0.5 shrink-0 text-gray-400 hover:text-brand-600 transition-colors"
                        title={note.completed ? 'Tamamlanmadı yap' : 'Tamamlandı işaretle'}
                      >
                        {note.completed ? (
                          <CheckSquare size={18} className="text-brand-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                      
                      <div className="min-w-0 flex-1">
                        {editingNoteId === note.id ? (
                          <input
                            type="text"
                            className="input !py-1 !px-2 !text-sm w-full font-medium"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleSaveNote(note.id, editContent);
                              else if (e.key === 'Escape') setEditingNoteId(null);
                            }}
                            onBlur={() => void handleSaveNote(note.id, editContent)}
                            autoFocus
                          />
                        ) : (
                          <p className={`text-[13px] sm:text-sm font-semibold text-gray-800 leading-snug break-words ${
                            note.completed ? 'line-through text-gray-400 font-normal' : ''
                          }`}>
                            {note.content}
                          </p>
                        )}

                        {/* Date Badge if note has a scheduled date */}
                        {note.date && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSelected(note.date!)}
                              title="Takvimde bu tarihi seç ve incele"
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold transition-all ${
                                note.date < today 
                                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                                  : note.date === today 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              <CalendarIcon size={10} />
                              <span>{formatDateShort(note.date)}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDatePickerNoteId(prev => prev === note.id ? null : note.id)}
                              className="text-[10px] text-gray-400 hover:text-brand-600 transition-colors cursor-pointer"
                              title="Tarihi değiştir"
                            >
                              (tarihi değiştir)
                            </button>
                          </div>
                        )}
                      </div>

                      <div className={`flex items-center gap-1 shrink-0 transition-opacity mt-0.5 ${
                        datePickerNoteId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {/* Not Yanına Takvim İkonu: Tarih Atama / Değiştirme */}
                        <div className="relative">
                          <button 
                            type="button"
                            onClick={() => setDatePickerNoteId(prev => prev === note.id ? null : note.id)}
                            className={`p-1 rounded transition-colors ${
                              note.date 
                                ? 'text-brand-600 bg-brand-50 hover:bg-brand-100' 
                                : 'text-gray-400 hover:text-brand-600 hover:bg-white'
                            }`}
                            title={note.date ? `Tarihi Değiştir (${formatDateShort(note.date)})` : 'Tarih / Hatırlatma Ata'}
                          >
                            <CalendarIcon size={14} />
                          </button>

                          {datePickerNoteId === note.id && (
                            <div 
                              className="absolute right-0 top-7 z-30 w-60 rounded-xl border border-gray-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-2">
                                <span className="text-[11px] font-bold text-gray-800">Tarih / Hatırlatma Ata</span>
                                <button
                                  type="button"
                                  onClick={() => setDatePickerNoteId(null)}
                                  className="text-gray-400 hover:text-gray-600 p-0.5"
                                  title="Kapat"
                                >
                                  <X size={13} />
                                </button>
                              </div>

                              <input
                                type="date"
                                min={today}
                                defaultValue={note.date || ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    void handleAssignNoteDate(note.id, e.target.value);
                                    setDatePickerNoteId(null);
                                  }
                                }}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 mb-2"
                              />

                              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleAssignNoteDate(note.id, today);
                                    setDatePickerNoteId(null);
                                  }}
                                  className="rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 px-2 py-1 font-medium text-gray-700 text-center transition-colors"
                                >
                                  Bugün
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + 1);
                                    void handleAssignNoteDate(note.id, dateKey(d.toISOString()));
                                    setDatePickerNoteId(null);
                                  }}
                                  className="rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 px-2 py-1 font-medium text-gray-700 text-center transition-colors"
                                >
                                  Yarın
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + 7);
                                    void handleAssignNoteDate(note.id, dateKey(d.toISOString()));
                                    setDatePickerNoteId(null);
                                  }}
                                  className="col-span-2 rounded border border-brand-200 bg-brand-50 hover:bg-brand-100 px-2 py-1 font-bold text-brand-700 text-center transition-colors flex items-center justify-center gap-1"
                                >
                                  <CalendarIcon size={12} />
                                  <span>1 Hafta Sonra</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const d = new Date();
                                    d.setMonth(d.getMonth() + 1);
                                    void handleAssignNoteDate(note.id, dateKey(d.toISOString()));
                                    setDatePickerNoteId(null);
                                  }}
                                  className="rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 px-2 py-1 font-medium text-gray-700 text-center transition-colors"
                                >
                                  1 Ay Sonra
                                </button>
                                {note.date ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleAssignNoteDate(note.id, null);
                                      setDatePickerNoteId(null);
                                    }}
                                    className="col-span-2 rounded border border-red-200 bg-red-50 hover:bg-red-100 px-2 py-1 font-bold text-red-600 text-center transition-colors"
                                  >
                                    Tarihi Kaldır
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDatePickerNoteId(null)}
                                    className="col-span-2 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 px-2 py-1 font-medium text-gray-500 text-center transition-colors"
                                  >
                                    Vazgeç
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <button 
                          type="button"
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditContent(note.content);
                          }}
                          className="text-gray-400 hover:text-brand-600 transition-colors p-1 rounded hover:bg-white"
                          title="Notu Düzenle"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => void handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-white"
                          title="Notu Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sağ Alt: Not Sayacı ve Tümünü Temizle Butonu */}
            <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gray-400 font-medium">
                {notes.length} not {notes.filter(n => n.completed).length > 0 && `(${notes.filter(n => n.completed).length} tamamlandı)`}
              </span>
              {notes.length > 0 && (
                confirmClear ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <span className="text-[11px] text-red-600 font-semibold">Tümü silinsin mi?</span>
                    <button
                      type="button"
                      onClick={() => void handleClearAllNotes()}
                      className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold transition-colors shadow-xs"
                    >
                      Evet, Sil
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-medium transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors"
                    title="Tüm notları kalıcı olarak temizle"
                  >
                    <Trash2 size={12} />
                    <span>Tümünü Temizle</span>
                  </button>
                )
              )}
            </div>
          </SectionCard>
        </div>
      </div>

    {/* 2. Alt Kısım: Seçili Günün Detaylı Tablo Listesi (Takas Çekleri Tarzı Tablo) */}
    <div className="pb-10">
      <div className="card overflow-hidden shadow-sm">
        {/* Tablo Başlık Barı */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
              GÜNLÜK DETAYLI ETKİNLİK LİSTESİ ({formatDate(selected).toUpperCase()})
            </h3>
          </div>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 border border-brand-200">
            {selectedEvents.length} Adet
          </span>
        </div>

        {/* Seçili güne özel not ekleme çubuğu */}
        <div className="border-b border-gray-100 bg-gray-50/50 p-3">
          <form onSubmit={handleAddDateNote} className="flex gap-2">
            <input 
              type="text" 
              className="input !py-1.5 !text-xs flex-1 bg-white" 
              placeholder={`${formatDate(selected)} tarihine özel yeni not / hatırlatıcı ekle...`} 
              value={newDateNote} 
              onChange={e => setNewDateNote(e.target.value)}
            />
            <button type="submit" className="btn-primary !px-3 !py-1.5 shrink-0 flex items-center gap-1">
              <Plus size={14}/>
              <span className="text-xs font-bold">Tarihe Not Ekle</span>
            </button>
          </form>
        </div>

        {/* Tablo İçeriği */}
        <div className="w-full">
          <table className="w-full table-fixed text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="table-th w-10 text-center !py-2.5 !px-1">#</th>
                <th className="table-th w-24 text-center !py-2.5 !px-1">TÜR</th>
                <th className="table-th w-32 !py-2.5 !px-2">NO / KOD</th>
                <th className="table-th w-56 lg:w-64 !py-2.5 !px-2">BAŞLIK / KONU</th>
                <th className="table-th !py-2.5 !px-2">KURUM / AÇIKLAMA</th>
                <th className="table-th w-24 text-center !py-2.5 !px-1">VADE / SAAT</th>
                <th className="table-th w-28 text-center !py-2.5 !px-1">TUTAR</th>
                <th className="table-th w-24 text-center !py-2.5 !px-1">DURUM</th>
                <th className="table-th w-16 text-center !py-2.5 !px-1">İŞLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-gray-400">
                    Etkinlikler yükleniyor...
                  </td>
                </tr>
              ) : selectedEvents.length === 0 && !hasCompletedNotesForSelectedDate ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-gray-400">
                    <CalendarDays size={26} className="mx-auto mb-1.5 text-gray-300 stroke-[1.5]" />
                    Bu tarihte ({formatDate(selected)}) herhangi bir ihale, ödeme veya kayıt bulunmuyor.
                  </td>
                </tr>
              ) : (
                selectedEvents.map((e, index) => {
                  if (e.type === 'note') {
                    const noteId = e.id.replace('note-', '');
                    const note = notes.find(n => n.id === noteId);
                    if (!note) return null;

                    return (
                      <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="table-td text-center text-gray-400 font-medium !py-2 !px-1 text-[11px]">{index + 1}</td>
                        <td className="table-td text-center !py-2 !px-1">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wide scale-95 ${styles.note.badge}`}>
                            NOT
                          </span>
                        </td>
                        <td className="table-td font-semibold text-gray-500 !py-2 !px-2">
                          Hatırlatıcı
                        </td>
                        <td className="table-td font-bold text-gray-900 !py-2 !px-2 overflow-hidden" colSpan={2}>
                          {editingNoteId === note.id ? (
                            <input
                              type="text"
                              className="input !py-1 !px-2 !text-sm w-full font-medium"
                              value={editContent}
                              onChange={(ev) => setEditContent(ev.target.value)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') void handleSaveNote(note.id, editContent);
                                else if (ev.key === 'Escape') setEditingNoteId(null);
                              }}
                              onBlur={() => void handleSaveNote(note.id, editContent)}
                              autoFocus
                            />
                          ) : (
                            <div className={`truncate text-xs sm:text-[13px] font-semibold text-gray-900 ${note.completed ? 'line-through text-gray-400 font-normal' : ''}`} title={note.content}>
                              {note.content}
                            </div>
                          )}
                        </td>
                        <td className="table-td text-center font-medium text-gray-700 !py-2 !px-1 whitespace-nowrap text-[11px]">
                          {formatDate(selected)}
                        </td>
                        <td className="table-td text-center !py-2 !px-1 text-gray-400 font-medium">—</td>
                        <td className="table-td text-center !py-2 !px-1">
                          <button
                            type="button"
                            onClick={() => void handleToggleNote(note.id, note.completed)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                              note.completed 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {note.completed ? 'Tamamlandı' : 'Bekliyor'}
                          </button>
                        </td>
                        <td className="table-td text-center !py-2 !px-1">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditContent(note.content);
                              }}
                              className="p-1 text-gray-400 hover:text-brand-600 rounded transition-colors"
                              title="Düzenle"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteNote(note.id)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="table-td text-center text-gray-400 font-medium !py-2 !px-1 text-[11px]">{index + 1}</td>
                      <td className="table-td text-center !py-2 !px-1">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wide scale-95 ${styles[e.type].badge}`}>
                          {styles[e.type].label}
                        </span>
                      </td>
                      <td className="table-td font-bold text-gray-800 !py-2 !px-2 overflow-hidden">
                        <div className="truncate" title={e.code}>
                          {e.to ? (
                            <Link to={e.to} className="text-brand-600 hover:text-brand-800 hover:underline">
                              {e.code}
                            </Link>
                          ) : (
                            e.code
                          )}
                        </div>
                      </td>
                      <td className="table-td font-semibold text-gray-900 !py-2 !px-2 overflow-hidden">
                        <div className="truncate" title={e.title}>
                          {e.title}
                        </div>
                      </td>
                      <td className="table-td text-gray-600 font-medium !py-2 !px-2 overflow-hidden">
                        <div className="truncate uppercase text-[11px]" title={e.institution}>
                          {e.institution}
                        </div>
                      </td>
                      <td className="table-td text-center font-semibold text-gray-700 !py-2 !px-1 whitespace-nowrap text-[11px]">
                        {e.timeStr}
                      </td>
                      <td className="table-td text-center font-bold text-gray-900 !py-2 !px-1 whitespace-nowrap text-xs">
                        {e.amount}
                      </td>
                      <td className="table-td text-center !py-2 !px-1">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${e.statusClass}`}>
                          {e.statusLabel}
                        </span>
                      </td>
                      <td className="table-td text-center !py-2 !px-1">
                        {e.to && (
                          <Link 
                            to={e.to} 
                            className="inline-flex items-center justify-center rounded bg-gray-100 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700 transition-colors"
                          >
                            İncele
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {hasCompletedNotesForSelectedDate && (
          <div className="flex justify-center border-t border-gray-100 bg-gray-50/30 py-2">
            <button
              type="button"
              onClick={() => setShowCompletedDateNotes(prev => !prev)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              {showCompletedDateNotes ? 'Tamamlanan Notları Gizle' : 'Tamamlanan Notları Göster'}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}

export function DashboardCalendar() {
  const { events, loading } = useCalendarEvents();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 45);

  const upcoming = events
    .filter(e => {
      const d = parseDate(e.date);
      return d >= today && d <= limit;
    })
    .slice(0, 8);

  const icon: Record<EventType, any> = {
    note: ListTodo,
    'credit-card': CreditCard,
    tender: Gavel,
    check: Landmark,
    insurance: ShieldCheck,
    inspection: Car,
    bill: Receipt
  };

  return (
    <SectionCard
      title="Yaklaşan Tarihler"
      icon={<CalendarDays size={16} className="text-gray-400" />}
      action={
        <Link to="/takvim" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          Takvimi Aç
        </Link>
      }
      className="mb-6"
      bodyClassName="!p-0"
    >
      <div className="grid divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        {loading ? (
          <p className="p-6 text-center text-sm text-gray-400 md:col-span-2">Tarihler yükleniyor...</p>
        ) : upcoming.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400 md:col-span-2">Önümüzdeki 45 gün içinde yaklaşan tarih yok.</p>
        ) : (
          [upcoming.filter((_, i) => i % 2 === 0), upcoming.filter((_, i) => i % 2 === 1)].map((group, index) => (
            <div key={index} className="divide-y divide-gray-100">
              {group.map(e => {
                const Icon = icon[e.type] || CalendarDays;
                const days = Math.ceil((parseDate(e.date).getTime() - today.getTime()) / 86400000);
                const targetUrl = e.to || '/takvim';
                return (
                  <Link
                    key={e.id}
                    to={targetUrl}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{e.title}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(e.date)}
                        {e.amount && e.amount !== '—' ? ` · ${e.amount}` : ''}
                      </p>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-[10px] font-medium ${styles[e.type]?.badge || 'bg-gray-100 text-gray-700'}`}>
                      {days === 0 ? 'Bugün' : `${days} gün`}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
