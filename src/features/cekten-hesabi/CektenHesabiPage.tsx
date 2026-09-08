import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Database, 
  RefreshCw, 
  Search, 
  FileSpreadsheet, 
  Info,
  X,
  Plus,
  Trash2,
  Pencil,
  Calendar,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Wallet,
  Printer
} from 'lucide-react';
import { useToast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import * as XLSX from 'xlsx';

interface CektenRecord {
  id: string;
  organization_id: string;
  date: string;
  supplier: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const cleanNumericInput = (val: string): string => {
  let clean = '';
  let hasDecimal = false;
  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    if (char >= '0' && char <= '9') {
      clean += char;
    } else if ((char === ',' || char === '.') && !hasDecimal) {
      clean += char;
      hasDecimal = true;
    }
  }
  return clean;
};

const formatNumberString = (str: string) => {
  if (!str) return '';

  // Clean all dots (thousands separators)
  let cleanStr = str.replace(/\./g, '');

  let cleanVal = '';
  let hasComma = false;
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    if (char >= '0' && char <= '9') {
      cleanVal += char;
    } else if (char === ',' && !hasComma) {
      cleanVal += char;
      hasComma = true;
    }
  }

  const parts = cleanVal.split(',');
  let integerPart = parts[0];
  let decimalPart = parts[1];
  if (integerPart) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  if (hasComma) {
    return `${integerPart},${decimalPart !== undefined ? decimalPart : ''}`;
  }
  return integerPart;
};

const parseFormattedNumber = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(clean) || 0;
};

const formatDateForDB = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`; // yyyy-mm-dd to dd.mm.yyyy
  }
  return dateStr;
};

const formatDateForInput = (dateStr: string) => {
  if (!dateStr || dateStr === 'CARİ') {
    return new Date().toISOString().split('T')[0];
  }
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // dd.mm.yyyy to yyyy-mm-dd
  }
  return dateStr;
};

interface InlinePaymentDateProps {
  value: string;
  onSave: (val: string) => void;
  disabled?: boolean;
}

function InlinePaymentDate({ value, onSave, disabled }: InlinePaymentDateProps) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setTempVal(formatDateForInput(value));
    }
  }, [editing, value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      try {
        inputRef.current.showPicker();
      } catch (e) {
        console.warn("showPicker failed", e);
      }
    }
  }, [editing]);

  const handleBlur = () => {
    if (tempVal) {
      onSave(formatDateForDB(tempVal));
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (tempVal) {
        onSave(formatDateForDB(tempVal));
      }
      setEditing(false);
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  if (disabled) {
    return <span className="text-gray-500">{value}</span>;
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-center">
        <input
          ref={inputRef}
          type="date"
          className="input !py-0.5 !px-1.5 text-[17px] text-center"
          value={tempVal}
          onChange={(e) => setTempVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={() => {
            onSave('CARİ');
            setEditing(false);
          }}
          className="text-[10px] font-bold text-gray-400 hover:text-brand-600 bg-gray-100 hover:bg-gray-200 px-1 rounded"
          title="Vadeyi CARİ Yap"
        >
          CARİ
        </button>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setEditing(true)}
      className="cursor-pointer hover:bg-gray-50 rounded px-2 py-0.5 group flex items-center justify-center gap-1.5 min-h-[24px]"
    >
      <span className={`text-[17px] ${value === 'CARİ' ? 'text-gray-500 font-medium' : 'text-gray-900 font-semibold'}`}>
        {value}
      </span>
      <Calendar size={16} className="text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity no-print" />
    </div>
  );
}

function InlineEdit({
  value,
  displayValue,
  onSave,
  className = "",
  inputClassName = "",
  placeholder = "—",
  isNumeric = false,
  type = "text",
  align = "left",
  textSizeClassName = "text-[17px]",
  iconType = "pencil"
}: {
  value: string;
  displayValue: React.ReactNode;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  isNumeric?: boolean;
  type?: string;
  align?: 'left' | 'center' | 'right';
  textSizeClassName?: string;
  iconType?: 'pencil' | 'calendar';
}) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'date') {
        try {
          inputRef.current.showPicker();
        } catch (e) {
          console.warn("showPicker failed", e);
        }
      }
    }
  }, [editing, type]);

  const startEdit = () => {
    setTempVal(isNumeric ? value.replace(/\./g, '') : value);
    setEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const finalVal = isNumeric ? String(parseFormattedNumber(tempVal)) : tempVal;
      onSave(finalVal);
      setEditing(false);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleBlur = () => {
    const finalVal = isNumeric ? String(parseFormattedNumber(tempVal)) : tempVal;
    onSave(finalVal);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        className={`input !py-0.5 !px-1.5 w-full ${textSizeClassName} ${inputClassName}`}
        value={tempVal}
        onChange={(e) => setTempVal(isNumeric ? cleanNumericInput(e.target.value) : e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    );
  }

  const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <div 
      onClick={startEdit}
      className={`cursor-pointer hover:bg-gray-50 rounded px-2 py-0.5 group flex items-center gap-1.5 min-h-[24px] ${justifyClass} ${textSizeClassName} ${className}`}
    >
      <span className={!value ? 'text-gray-300 italic' : ''}>
        {value ? displayValue : placeholder}
      </span>
      {iconType === 'calendar' ? (
        <Calendar size={16} className="text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0 no-print" />
      ) : (
        <Pencil size={16} className="text-gray-400 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0 no-print" />
      )}
    </div>
  );
}

export function CektenHesabiPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  
  const [records, setRecords] = useState<CektenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
  const [activeTab, setActiveTab] = useState<'main' | 'history'>('main');

  // Supplier detail page state (synchronized with URL search parameter)
  const [selectedSupplierDetail, setSelectedSupplierDetailState] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('cari') || null;
  });

  const setSelectedSupplierDetail = (val: string | null) => {
    setSelectedSupplierDetailState(val);
    const params = new URLSearchParams(window.location.search);
    if (val) {
      params.set('cari', val);
    } else {
      params.delete('cari');
    }
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}`;
    window.history.pushState(null, '', newUrl);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // New record modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const existingSuppliers = useMemo(() => {
    const suppliers = records.map(r => r.supplier).filter(Boolean);
    return Array.from(new Set(suppliers)).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [records]);
  const [newRecordTxType, setNewRecordTxType] = useState<'borc' | 'odeme'>('borc');
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    total_amount: '',
    paid_amount: '0',
    payment_date: 'CARİ',
    notes: ''
  });

  // Supplier detail payment modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFormDate, setPaymentFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentFormAmount, setPaymentFormAmount] = useState('');
  const [paymentFormNotes, setPaymentFormNotes] = useState('');
  const [paymentFormTxType, setPaymentFormTxType] = useState<'borc' | 'odeme'>('odeme');

  // Supplier card edit states
  const [isSupplierEditModalOpen, setIsSupplierEditModalOpen] = useState(false);
  const [supplierEditName, setSupplierEditName] = useState('');

  const fetchRecords = async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('cekten_hesabi')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setRecords((data || []).map(r => ({
        ...r,
        total_amount: Number(r.total_amount || 0),
        paid_amount: Number(r.paid_amount || 0),
        remaining_amount: Number(r.remaining_amount || 0)
      })));
    } catch (e: any) {
      notify('Çekten hesabı verileri yüklenirken hata oluştu: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRecords();
  }, [user?.organizationId, startDate, endDate]);

  const filteredRecords = useMemo(() => {
    let list = [...records];
    if (searchQuery.trim()) {
      const q = searchQuery.toLocaleLowerCase('tr-TR');
      list = list.filter(r => 
        r.supplier.toLocaleLowerCase('tr-TR').includes(q) ||
        (r.notes && r.notes.toLocaleLowerCase('tr-TR').includes(q))
      );
    }
    return list;
  }, [records, searchQuery]);

  const stats = useMemo(() => {
    let totalQty = filteredRecords.length;
    let totalVal = 0;
    let totalPaid = 0;
    let totalRem = 0;

    filteredRecords.forEach(r => {
      totalVal += Number(r.total_amount);
      totalPaid += Number(r.paid_amount);
      totalRem += Number(r.remaining_amount);
    });

    return { totalQty, totalVal, totalPaid, totalRem };
  }, [filteredRecords]);

  const supplierRecords = useMemo(() => {
    if (!selectedSupplierDetail) return [];
    return records.filter(r => 
      r.supplier.trim().toUpperCase() === selectedSupplierDetail.trim().toUpperCase()
    ).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [selectedSupplierDetail, records]);

  const supplierStats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let remaining = 0;
    supplierRecords.forEach(r => {
      total += Number(r.total_amount || 0);
      paid += Number(r.paid_amount || 0);
      remaining += Number(r.remaining_amount || 0);
    });
    return { total, paid, remaining };
  }, [supplierRecords]);

  // Sorted list of all records by created_at (Last Transactions)
  const historyRecords = useMemo(() => {
    return [...records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [records]);

  // Sorted list of all individual records (Detail view)
  const sortedDetailedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal: any = a[sortField as keyof CektenRecord];
      let bVal: any = b[sortField as keyof CektenRecord];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal, 'tr') 
          : bVal.localeCompare(aVal, 'tr');
      } else {
        return sortDirection === 'asc' 
          ? aVal - bVal 
          : bVal - aVal;
      }
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Grouped records by supplier (Summary view)
  const groupedRecords = useMemo(() => {
    const groups: Record<string, {
      supplier: string;
      latest_date: string;
      latest_created_at: string;
      total_amount: number;
      paid_amount: number;
      remaining_amount: number;
    }> = {};

    filteredRecords.forEach(r => {
      const key = r.supplier.trim().toUpperCase();
      if (!groups[key]) {
        groups[key] = {
          supplier: r.supplier,
          latest_date: r.date,
          latest_created_at: r.created_at || '',
          total_amount: 0,
          paid_amount: 0,
          remaining_amount: 0
        };
      }
      groups[key].total_amount += Number(r.total_amount || 0);
      groups[key].paid_amount += Number(r.paid_amount || 0);
      groups[key].remaining_amount += Number(r.remaining_amount || 0);
      if (r.date > groups[key].latest_date) {
        groups[key].latest_date = r.date;
      }
      if (r.created_at && (!groups[key].latest_created_at || r.created_at > groups[key].latest_created_at)) {
        groups[key].latest_created_at = r.created_at;
      }
    });

    const list = Object.values(groups);

    // Sort grouped list based on sortField
    list.sort((a, b) => {
      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];

      if (aVal === undefined) {
        if (sortField === 'date') {
          // Sort by latest_date primary, and latest_created_at secondary as tie-breaker
          if (a.latest_date !== b.latest_date) {
            return sortDirection === 'asc'
              ? a.latest_date.localeCompare(b.latest_date)
              : b.latest_date.localeCompare(a.latest_date);
          }
          return sortDirection === 'asc'
            ? a.latest_created_at.localeCompare(b.latest_created_at)
            : b.latest_created_at.localeCompare(a.latest_created_at);
        } else {
          aVal = a.supplier;
          bVal = b.supplier;
        }
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'tr')
          : bVal.localeCompare(aVal, 'tr');
      } else {
        return sortDirection === 'asc'
          ? aVal - bVal
          : bVal - aVal;
      }
    });

    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination lists
  const paginatedGrouped = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedRecords.slice(start, start + pageSize);
  }, [groupedRecords, currentPage]);

  const paginatedDetailed = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedDetailedRecords.slice(start, start + pageSize);
  }, [sortedDetailedRecords, currentPage]);

  const totalPages = viewMode === 'summary' 
    ? Math.ceil(groupedRecords.length / pageSize)
    : Math.ceil(sortedDetailedRecords.length / pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortHeader = (label: string, field: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = sortField === field;
    const arrow = isSorted ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕';
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    return (
      <th 
        onClick={() => handleSort(field)}
        className={`px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none ${alignClass}`}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <span className="text-[10px] text-gray-400 font-bold">{arrow}</span>
        </span>
      </th>
    );
  };

  // CRUD Operations
  const handleSaveField = async (recordId: string, field: string, value: any) => {
    setActionLoading(true);
    try {
      const record = records.find(r => r.id === recordId);
      if (!record) return;

      const updatedRecord = { ...record, [field]: value };
      const totalVal = Number(updatedRecord.total_amount) || 0;
      const paidVal = Number(updatedRecord.paid_amount) || 0;
      const remVal = totalVal - paidVal;

      const payload: Record<string, any> = {
        [field]: value
      };

      if (['total_amount', 'paid_amount'].includes(field)) {
        payload.remaining_amount = remVal;
      }

      // Optimistic update
      setRecords(prev => prev.map(r => r.id === recordId ? {
        ...r,
        ...payload
      } : r));

      const { error } = await supabase
        .from('cekten_hesabi')
        .update(payload)
        .eq('id', recordId);

      if (error) throw error;
      notify('Kayıt başarıyla güncellendi.', 'success');
    } catch (e: any) {
      notify('Güncelleme hatası: ' + e.message, 'error');
      void fetchRecords(); // rollback
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    setActionLoading(true);
    try {
      // Optimistic delete
      setRecords(prev => prev.filter(r => r.id !== recordId));

      const { error } = await supabase
        .from('cekten_hesabi')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
      notify('Kayıt başarıyla silindi.', 'success');
    } catch (e: any) {
      notify('Silme hatası: ' + e.message, 'error');
      void fetchRecords(); // rollback
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (r: CektenRecord) => {
    const isBorc = r.total_amount > 0;
    setNewRecord({
      date: r.date,
      supplier: r.supplier,
      total_amount: isBorc ? formatNumberString(String(r.total_amount)) : '',
      paid_amount: isBorc ? '' : formatNumberString(String(r.paid_amount)),
      payment_date: r.payment_date || 'CARİ',
      notes: r.notes || ''
    });
    setNewRecordTxType(isBorc ? 'borc' : 'odeme');
    setEditingRecordId(r.id);
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    if (!newRecord.supplier.trim()) {
      notify('Lütfen cari/tedarikçi adını girin.', 'error');
      return;
    }
    const isBorc = newRecordTxType === 'borc';
    const amount = isBorc
      ? parseFormattedNumber(newRecord.total_amount)
      : parseFormattedNumber(newRecord.paid_amount);

    if (amount <= 0) {
      notify('Lütfen geçerli bir tutar girin.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        organization_id: user?.organizationId,
        date: newRecord.date,
        supplier: newRecord.supplier.trim(),
        total_amount: isBorc ? amount : 0,
        paid_amount: isBorc ? 0 : amount,
        remaining_amount: isBorc ? amount : -amount,
        notes: newRecord.notes.trim() || null,
        payment_date: isBorc ? (newRecord.payment_date || 'CARİ') : formatDateForDB(newRecord.date)
      };

      if (editingRecordId) {
        // Edit Mode
        const { error } = await supabase
          .from('cekten_hesabi')
          .update(payload)
          .eq('id', editingRecordId);

        if (error) throw error;
        notify('Kayıt başarıyla güncellendi.', 'success');
      } else {
        // Create Mode
        const { error } = await supabase
          .from('cekten_hesabi')
          .insert(payload);

        if (error) throw error;
        notify('Yeni kayıt başarıyla eklendi.', 'success');
      }

      setIsModalOpen(false);
      setEditingRecordId(null);
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        supplier: '',
        total_amount: '',
        paid_amount: '',
        payment_date: 'CARİ',
        notes: ''
      });
      void fetchRecords();
    } catch (e: any) {
      notify('Kayıt kaydetme hatası: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecordId(null);
    setNewRecord({
      date: new Date().toISOString().split('T')[0],
      supplier: '',
      total_amount: '',
      paid_amount: '',
      payment_date: 'CARİ',
      notes: ''
    });
  };

  const handleUpdateSupplierName = async (newName: string) => {
    if (!user?.organizationId || !selectedSupplierDetail) return;
    if (!newName.trim()) {
      notify('Cari hesap adı boş olamaz.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const oldName = selectedSupplierDetail;
      const { error } = await supabase
        .from('cekten_hesabi')
        .update({ supplier: newName.trim() })
        .eq('organization_id', user.organizationId)
        .eq('supplier', oldName);

      if (error) throw error;
      
      notify('Cari kart adı başarıyla güncellendi.', 'success');
      setSelectedSupplierDetail(newName.trim());
      setIsSupplierEditModalOpen(false);
      await fetchRecords();
    } catch (e: any) {
      notify('Güncelleme hatası: ' + e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId || !selectedSupplierDetail) return;
    
    const amount = parseFormattedNumber(paymentFormAmount);
    if (amount <= 0) {
      notify('Lütfen geçerli bir tutar girin.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const isBorc = paymentFormTxType === 'borc';
      const payload = {
        organization_id: user.organizationId,
        date: paymentFormDate,
        supplier: selectedSupplierDetail,
        total_amount: isBorc ? amount : 0,
        paid_amount: isBorc ? 0 : amount,
        remaining_amount: isBorc ? amount : -amount,
        notes: paymentFormNotes.trim() || null,
        payment_date: isBorc ? 'CARİ' : formatDateForDB(paymentFormDate)
      };

      const { error } = await supabase
        .from('cekten_hesabi')
        .insert(payload);

      if (error) throw error;
      notify(isBorc ? 'Borç kaydı başarıyla eklendi.' : 'Ödeme kaydı başarıyla eklendi.', 'success');
      setIsPaymentModalOpen(false);
      setPaymentFormAmount('');
      setPaymentFormNotes('');
      void fetchRecords();
    } catch (err: any) {
      notify('İşlem kaydedilirken hata oluştu: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = () => {
    try {
      let dataToExport: any[] = [];
      if (viewMode === 'summary') {
        dataToExport = groupedRecords.map(g => ({
          'Tedarikçi / Cari Hesap': g.supplier,
          'Son İşlem Tarihi': formatDateForDB(g.latest_date),
          'Toplam Tutar': g.total_amount,
          'Toplam Ödenen': g.paid_amount,
          'Kalan Bakiye': g.remaining_amount
        }));
      } else {
        dataToExport = sortedDetailedRecords.map(r => ({
          'Tarih': formatDateForDB(r.date),
          'Tedarikçi / Cari Hesap': r.supplier,
          'Toplam Tutar': r.total_amount,
          'Ödenen': r.paid_amount,
          'Kalan Bakiye': r.remaining_amount,
          'Ödeme Tarihi': r.payment_date,
          'Açıklama': r.notes || ''
        }));
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, viewMode === 'summary' ? 'Özet' : 'Detay');
      
      const fileName = `Cekten_Hesabi_Raporu_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      notify('Excel dosyası başarıyla indirildi.', 'success');
    } catch (e: any) {
      notify('Excel çıktısı alınırken hata oluştu: ' + e.message, 'error');
    }
  };

  const renderSupplierDetailPage = () => {
    let balance = 0;
    const ledger = supplierRecords.map(r => {
      balance += Number(r.remaining_amount || 0);
      return {
        ...r,
        runningBalance: balance
      };
    });

    const latestTx = supplierRecords.length > 0 ? supplierRecords[supplierRecords.length - 1].date : '—';
    const latestTxFormatted = latestTx !== '—' ? new Date(latestTx).toLocaleDateString('tr-TR') : '—';

    const handlePrint = () => {
      let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-iframe';
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cari Hesap Ekstrası Detaylı</title>
            <style>
              @page {
                size: A4;
                margin: 0;
              }
              * {
                box-sizing: border-box !important;
              }
              html, body {
                width: 210mm;
              }
              body {
                font-family: 'Tahoma', sans-serif;
                color: black;
                background-color: white;
                margin: 0;
                padding: 10mm 8mm 15mm 8mm;
                font-size: 11px;
                line-height: 1.25;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
              }
              .header-table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse;
                margin-bottom: 6px !important;
              }
               .header-left h1 {
                font-size: 21px !important; /* 16pt */
                font-weight: normal !important;
                margin: 0 0 5px 0 !important;
                font-family: 'Tahoma', sans-serif !important;
                line-height: 1.1 !important;
              }
              .header-left .supplier {
                font-size: 12px !important;
                font-weight: bold !important;
                margin: 7px 0 4px 0 !important;
                text-transform: uppercase !important;
                line-height: 1.1 !important;
              }
              .header-left .date {
                font-size: 11px !important; /* 8pt */
                color: black !important;
                margin: 7px 0 0 2mm !important;
                line-height: 1.1 !important;
              }
              .header-right {
                text-align: right;
                vertical-align: top;
              }
              .brand-box {
                display: inline-block;
                border: 1px solid #9ca3af;
                padding: 6px 12px;
                text-align: center;
                min-width: 120px;
              }
              .brand-box .brand-title {
                display: block;
                font-size: 13px;
                font-weight: bold;
                color: #dc2626; /* Red-600 */
                letter-spacing: 1px;
              }
              .brand-box .brand-subtitle {
                display: block;
                font-size: 7.5px;
                font-weight: bold;
                color: #4b5563;
                margin-top: 2px;
                letter-spacing: 0.5px;
              }
              .separator-line {
                border-bottom: 2px solid black;
                margin: 5px 0 10px 0;
              }
              .ledger-table, 
              .ledger-table thead, 
              .ledger-table tbody, 
              .ledger-table tr {
                border: none !important;
                box-shadow: none !important;
              }
              .ledger-table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: separate !important;
                border-spacing: 0px 0px !important;
              }
              .ledger-table th {
                border-top: none !important;
                border-bottom: none !important;
                border-left: 1px solid black !important;
                border-right: 8px solid white !important;
                box-shadow: inset 0px 1px 0px black, inset 0px -1px 0px black, inset -1px 0px 0px black !important;
                padding: 3px 4px !important;
                font-size: 11px; /* 8pt */
                font-family: 'Tahoma', sans-serif;
                background-color: white !important;
                font-weight: bold !important;
                text-align: center !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                white-space: nowrap !important;
                line-height: 1.1 !important;
              }
              .ledger-table th:last-child {
                border-right: 1px solid black !important;
                box-shadow: inset 0px 1px 0px black, inset 0px -1px 0px black !important;
              }
              .ledger-table td {
                border: none !important;
                padding: 3px 4px !important;
                font-size: 11px !important; /* 8pt */
                font-family: 'Tahoma', sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                white-space: nowrap;
              }
              .ledger-table td.notes-cell {
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
              }
              .ledger-table th.center, .ledger-table td.center {
                text-align: center;
              }
              .ledger-table th.right, .ledger-table td.right {
                text-align: right;
              }
              .ledger-table tr.zebra td {
                background-color: #B9D1EA !important; /* clGradientActiveCaption (ETAŞ ET Custom Blue) */
              }
              .ledger-table tr.devreden {
                font-weight: bold !important;
              }
              .ledger-table tr.devreden td {
                padding-top: 6px !important;
                padding-bottom: 6px !important;
              }
              .ledger-table tfoot tr {
                font-weight: normal;
              }
              .total-separator-line {
                border-top: 1px solid black;
                margin-top: 12px;
                margin-bottom: 8px;
                margin-left: 2mm;
                margin-right: 2mm;
              }
              .grand-total-box {
                text-align: right;
                font-family: 'Tahoma', sans-serif !important;
                font-size: 12px !important; /* 9pt */
                font-weight: bold !important;
                margin-right: 2mm;
              }
              .footer-info {
                position: fixed;
                bottom: 14mm;
                left: 10mm;
                right: 10mm;
                border-top: 1px solid black;
                padding-top: 7px;
                display: flex;
                justify-content: space-between;
                font-size: 12px; /* 9pt */
                font-weight: bold;
                color: black;
                background-color: white;
              }
            </style>
          </head>
          <body>
            <table class="header-table">
              <tr>
                <td style="width: 80%; vertical-align: top;">
                  <div class="header-left">
                    <h1>Cari Hesap Ekstrası Detaylı</h1>
                    <div class="supplier">${selectedSupplierDetail}</div>
                    <div class="date">Çıktı Tarihi : ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  </div>
                </td>
                <td class="header-right" style="width: 20%; vertical-align: top; text-align: right;">
                  <img src="/etas_et_logo.png" style="width: 1.7cm; height: 1.6cm; object-fit: contain; margin-right: 2mm;" />
                </td>
              </tr>
            </table>

            <table class="ledger-table">
              <thead>
                <tr>
                  <th class="center" style="width: 7.5%;">Tarih</th>
                  <th class="center" style="width: 13.5%;">Malın Cinsi</th>
                  <th class="center" style="width: 7.5%;">İzahat</th>
                  <th class="center" style="width: 25.5%;">Açıklama</th>
                  <th class="center" style="width: 12%;">Malın Miktarı</th>
                  <th class="center" style="width: 10%;">Birim Fiyat</th>
                  <th class="center" style="width: 10.5%;">Alacak</th>
                  <th class="center" style="width: 13.5%;">Toplam Bakiye</th>
                </tr>
              </thead>
              <tbody>
                <tr class="devreden">
                  <td class="center"></td>
                  <td></td>
                  <td class="center"></td>
                  <td>Önceki Dönemden Devreden :</td>
                  <td class="center"></td>
                  <td class="center">0.00</td>
                  <td class="center">0.00</td>
                  <td class="center">0.00 (-) TL</td>
                </tr>
                ${ledger.map((r, index) => {
                  const isPayment = r.total_amount === 0;
                  const rowClass = index % 2 === 0 ? 'zebra' : '';
                  const amountVal = isPayment ? r.paid_amount : r.total_amount;
                  const balanceSuffix = r.runningBalance > 0 ? ' (B)' : r.runningBalance < 0 ? ' (A)' : ' (-)';
                  return `
                    <tr class="${rowClass}">
                      <td class="center">${new Date(r.date).toLocaleDateString('tr-TR')}</td>
                      <td class="center">${isPayment ? 'ALACAK' : 'BORÇ'}</td>
                      <td class="center">${isPayment ? 'CarÇık' : 'StkGir'}</td>
                      <td class="notes-cell center">${r.notes || '—'}</td>
                      <td class="center">${isPayment ? 'Dekont/Kredi' : '1 (ADET)'}</td>
                      <td class="center">${isPayment ? new Date(r.date).toLocaleDateString('tr-TR') : Number(amountVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                      <td class="center">${Number(amountVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                      <td class="right">
                        ${Math.abs(r.runningBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL${balanceSuffix}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="total-separator-line"></div>
            <div class="grand-total-box">
              Genel Toplam : &nbsp;&nbsp; ${Math.abs(supplierStats.remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL${supplierStats.remaining > 0 ? ' (B)' : supplierStats.remaining < 0 ? ' (A)' : ' (-)'}
            </div>

            <div class="footer-info">
              <span>Sayfa : 1</span>
              <span>www.amasyaetas.com</span>
              <span>"Et Bizim Tek İşimiz.."</span>
            </div>
          </body>
        </html>
      `;

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 300);
      }
    };

    return (
      <div className="space-y-6 font-sans print-container">
        {/* Breadcrumb Navigation */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => setSelectedSupplierDetail(null)}
              className="group flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-brand-600 transition-colors uppercase tracking-wider mb-1 no-print"
            >
              <ChevronLeft size={16} /> Çekten Hesabına Dön
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{selectedSupplierDetail}</h1>
            <p className="text-sm text-gray-500">Cari Kart Detay ve Çekten Hesap Hareket Dökümü</p>
          </div>

          <div className="flex items-center gap-3 no-print">
            <button
              onClick={() => setSelectedSupplierDetail(null)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Geri Dön
            </button>
            <button
              onClick={() => {
                setSupplierEditName(selectedSupplierDetail || '');
                setIsSupplierEditModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              <Pencil size={16} />
              Düzenle
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              <Printer size={16} />
              Yazdır
            </button>
            <button
              onClick={() => {
                setPaymentFormDate(new Date().toISOString().split('T')[0]);
                setPaymentFormAmount('');
                setPaymentFormNotes('');
                setPaymentFormTxType('odeme');
                setIsPaymentModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none"
            >
              <Plus size={16} />
              İşlem Ekle
            </button>
          </div>
        </div>

        {/* Cari Kart Detay Bilgileri and Net Bakiye Row */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Cari Kart Detay Bilgileri</h3>
            <div className="mt-4 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Cari Kodu</span>
                <span className="font-semibold text-gray-700">CEKTEN-HESAP-{(selectedSupplierDetail || '').toUpperCase().substring(0, 10)}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Firma Tipi</span>
                <span className="font-semibold text-gray-700">Tedarikçi (Manuel Cari)</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Vergi No / T.C.</span>
                <span className="font-semibold text-gray-700">—</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Son İşlem Tarihi</span>
                <span className="font-semibold text-gray-700">{latestTxFormatted}</span>
              </div>
            </div>
          </div>

          {!loading && (
            <div className={`rounded-xl text-white p-6 shadow-sm flex flex-col justify-between min-h-[160px] transition-all duration-300 net-bakiye-card ${
              supplierStats.remaining > 0 ? 'bg-rose-900' : supplierStats.remaining < 0 ? 'bg-brand-900' : 'bg-emerald-900'
            }`}>
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  supplierStats.remaining > 0 ? 'text-rose-200' : supplierStats.remaining < 0 ? 'text-blue-200' : 'text-emerald-200'
                }`}>
                  Net Bakiye
                </span>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {Math.abs(supplierStats.remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </div>
              </div>
              <div className={`mt-4 border-t pt-3 flex items-center justify-between text-xs font-semibold ${
                supplierStats.remaining > 0 ? 'border-rose-800 text-rose-200' : supplierStats.remaining < 0 ? 'border-blue-800 text-blue-200' : 'border-emerald-800 text-emerald-200'
              }`}>
                <span>Bakiye Durumu:</span>
                <span className={`text-[15px] font-bold ${
                  supplierStats.remaining > 0 ? "text-rose-200 animate-pulse" : supplierStats.remaining < 0 ? "text-blue-200 animate-pulse" : "text-emerald-300"
                }`}>
                  {supplierStats.remaining > 0 ? "Borcumuz Var" : supplierStats.remaining < 0 ? "Alacaklıyız" : "Bakiye Sıfır / Tamamlandı"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Warning Banner */}
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-700 flex items-center gap-2 no-print">
          <Info size={16} className="text-blue-500 shrink-0" />
          <span>Aşağıdaki hareket dökümü, Çekten Hesabı modülüne girilen borç ve ödeme kayıtlarını göstermektedir. Bilgileri satır içi hızlı düzenleyebilirsiniz.</span>
        </div>

        {/* Ledger Table Box */}
        <div className="overflow-hidden border border-gray-200 bg-white rounded-xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs font-semibold">
              <thead className="bg-gray-50 uppercase tracking-wider text-[13px] font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-4 text-left">Tarih</th>
                  <th className="px-6 py-4">İşlem Türü</th>
                  <th className="px-6 py-4">Açıklama / İzahat</th>
                  <th className="px-6 py-4 text-right pr-10">Borç Tutarı</th>
                  <th className="px-6 py-4 text-right pr-10">Ödenen</th>
                  <th className="px-6 py-4 text-right pr-10">Toplam Bakiye</th>
                  <th className="px-6 py-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-900 font-semibold">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-medium">
                       Bu cariye ait kayıtlı hareket bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  ledger.map((r) => {
                    const isPayment = r.total_amount === 0;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-left text-[17px] text-gray-900 font-semibold">
                          <InlineEdit
                            value={r.date}
                            displayValue={new Date(r.date).toLocaleDateString('tr-TR')}
                            onSave={(val) => void handleSaveField(r.id, 'date', val)}
                            type="date"
                            align="left"
                            className="justify-start"
                            iconType="calendar"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                            isPayment ? 'bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-800/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                          }`}>
                            {isPayment ? 'ALACAK / ÖDEME' : 'BORÇ'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[17px] text-gray-900 font-normal max-w-xs truncate" title={r.notes || ''}>
                          {r.notes || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-semibold text-gray-900">
                          {!isPayment ? `${Number(r.total_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-semibold">
                          {isPayment || r.paid_amount > 0 ? (
                            <span className="!text-rose-800">
                              {Number(r.paid_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </span>
                          ) : '—'}
                        </td>
                        <td className={`whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-semibold ${
                          r.runningBalance > 0 ? 'text-rose-600' : r.runningBalance < 0 ? 'text-brand-600' : 'text-emerald-600'
                        }`}>
                          {Math.abs(r.runningBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                          <span className="text-[13px] ml-1 font-bold">
                            {r.runningBalance > 0 ? ' (Borç)' : r.runningBalance < 0 ? ' (Alacak)' : ' (Sıfır)'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="text-gray-400 hover:text-brand-600 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-gray-100 transition-colors"
                            title="Hareketi Sil"
                          >
                            <Trash2 size={16} />
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

        {/* Manual Payment Input Modal */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h2 className="text-lg font-bold text-gray-900">
                  {paymentFormTxType === 'borc' ? 'Yeni Borç Girişi' : 'Yeni Alacak Girişi'}
                </h2>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSavePayment} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">İşlem Türü</label>
                  <select
                    value={paymentFormTxType}
                    onChange={(e) => setPaymentFormTxType(e.target.value as 'borc' | 'odeme')}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="odeme">Alacak Girişi (Ödeme)</option>
                    <option value="borc">Borç Girişi (Borç)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {paymentFormTxType === 'borc' ? 'Borç Tutarı (TL)' : 'Ödenen Tutar (TL)'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 15.000,00"
                    value={paymentFormAmount}
                    onChange={(e) => setPaymentFormAmount(formatNumberString(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Açıklama (Opsiyonel)</label>
                  <textarea
                    value={paymentFormNotes}
                    onChange={(e) => setPaymentFormNotes(e.target.value)}
                    placeholder={paymentFormTxType === 'borc' ? "Borca dair ek açıklamalar yazın..." : "Ödemeye dair ek notlar yazın..."}
                    className="mt-1 w-full h-20 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {paymentFormTxType === 'borc' ? 'İşlem Tarihi' : 'Ödeme Tarihi'}
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentFormDate}
                    onChange={(e) => setPaymentFormDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="btn btn-outline"
                    disabled={actionLoading}
                  >
                    İptal
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-primary bg-brand-600 hover:bg-brand-700 text-white font-bold"
                    disabled={actionLoading}
                  >
                    {paymentFormTxType === 'borc' ? 'Borcu Kaydet' : 'Alacağı Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cari Kart Düzenleme Modalı */}
        {isSupplierEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h2 className="text-lg font-bold text-gray-900">Cari Kart Bilgilerini Düzenle</h2>
                <button
                  onClick={() => setIsSupplierEditModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cari / Tedarikçi Adı</label>
                  <input
                    type="text"
                    value={supplierEditName}
                    onChange={(e) => setSupplierEditName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                    placeholder="Yeni cari adını yazın..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t pt-4 mt-6">
                <button 
                  onClick={() => setIsSupplierEditModalOpen(false)}
                  className="btn btn-outline"
                  disabled={actionLoading}
                >
                  İptal
                </button>
                <button 
                  onClick={() => void handleUpdateSupplierName(supplierEditName)}
                  className="btn btn-primary bg-brand-600 hover:bg-brand-700 text-white font-bold"
                  disabled={actionLoading}
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Official ETAŞ ET Print Document & Stylesheet */}
        <div className="hidden print:block print-document text-black" style={{ fontFamily: 'Tahoma, Calibri, Arial, sans-serif' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              html, body, #root, main, .app-layout, .content-layout, .page-container, .print-container {
                height: auto !important;
                overflow: visible !important;
                background: white !important;
                color: black !important;
                font-family: 'Tahoma', 'Calibri', 'Arial', sans-serif !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
              }
              /* Hide all other layout and screen elements on print */
              .sidebar, .navbar, .topbar, header, footer, nav, aside, 
              .no-print, button, .warning-banner {
                display: none !important;
              }
              /* Hide screen-specific children of print-container */
              .print-container > *:not(.print-document) {
                display: none !important;
              }
              .print-document {
                display: block !important;
                width: 100% !important;
                padding: 30px 20px !important;
                background: white !important;
                color: black !important;
              }
              .print-document table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-top: 15px !important;
              }
              .print-document th, .print-document td {
                border: 1px solid #4b5563 !important;
                padding: 6px 8px !important;
                color: black !important;
                font-size: 11px !important;
                line-height: 1.25 !important;
              }
              .print-document th {
                background-color: #ffffff !important;
                font-weight: bold !important;
                text-align: center !important;
              }
              .no-screen {
                display: flex !important;
              }
            }
          `}} />

          {/* Header Block */}
          <div className="flex items-start justify-between pb-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-black" style={{ fontFamily: 'Tahoma' }}>Cari Hesap Ekstrası Detaylı</h1>
              <p className="text-[9px] text-gray-600 mt-0.5">
                Çıktı Tarihi : {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <h2 className="text-sm font-bold text-black mt-4 tracking-wide uppercase" style={{ fontFamily: 'Tahoma' }}>
                {selectedSupplierDetail}
              </h2>
            </div>
            <div className="text-right">
              {/* ETAŞ ET Brand Emblem Box */}
              <div className="border border-gray-400 p-2 text-center" style={{ minWidth: '110px' }}>
                <span className="block text-xs font-bold text-red-600 tracking-wider">ETAŞ ET</span>
                <span className="block text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">Et Bizim Tek İşimiz</span>
              </div>
            </div>
          </div>

          {/* Thick solid separator line */}
          <div className="border-b-2 border-black w-full mb-2"></div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white font-bold text-black text-[11px]">
                <th className="py-2 px-2 text-center" style={{ width: '8%' }}>Tarih</th>
                <th className="py-2 px-2 text-left" style={{ width: '15%' }}>Malın Cinsi</th>
                <th className="py-2 px-2 text-center" style={{ width: '8%' }}>İşlem Türü</th>
                <th className="py-2 px-2 text-left" style={{ width: '32%' }}>Açıklama / İzahat</th>
                <th className="py-2 px-2 text-center" style={{ width: '11%' }}>Malın Miktarı</th>
                <th className="py-2 px-2 text-right" style={{ width: '10%' }}>Birim Fiyat</th>
                <th className="py-2 px-2 text-right" style={{ width: '11%' }}>Alacak / Tutar</th>
                <th className="py-2 px-2 text-right" style={{ width: '13%' }}>Toplam Bakiye</th>
              </tr>
            </thead>
            <tbody>
              {/* Devreden Row directly integrated into table body */}
              <tr className="font-bold text-black bg-white">
                <td className="py-2 px-2 text-center"></td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2 text-center"></td>
                <td className="py-2 px-2 text-left">Önceki Dönemden Devreden :</td>
                <td className="py-2 px-2 text-center"></td>
                <td className="py-2 px-2 text-right">0,00</td>
                <td className="py-2 px-2 text-right">0,00</td>
                <td className="py-2 px-2 text-right">0,00 (-) TL</td>
              </tr>

              {ledger.map((r, index) => {
                const isPayment = r.total_amount === 0;
                const rowBg = index % 2 === 1 ? 'bg-gray-50/70' : 'bg-white';
                const amountVal = isPayment ? r.paid_amount : r.total_amount;
                return (
                  <tr key={r.id} className={`${rowBg} text-black`}>
                    <td className="py-2 px-2 text-center whitespace-nowrap">{new Date(r.date).toLocaleDateString('tr-TR')}</td>
                    <td className="py-2 px-2 font-semibold">{isPayment ? 'ALACAK / ÖDEME' : 'BORÇ GİRİŞİ'}</td>
                    <td className="py-2 px-2 text-center">{isPayment ? 'CarÇık' : 'StkGir'}</td>
                    <td className="py-2 px-2 max-w-[220px] truncate" title={r.notes || ''}>{r.notes || '—'}</td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">{isPayment ? 'Dekont/Kredi' : '1 (ADET)'}</td>
                    <td className="py-2 px-2 text-right whitespace-nowrap">
                      {isPayment ? new Date(r.date).toLocaleDateString('tr-TR') : `${Number(amountVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold whitespace-nowrap">
                      {Number(amountVal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                    </td>
                    <td className="py-2 px-2 text-right font-bold whitespace-nowrap">
                      {Math.abs(r.runningBalance).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                      <span className="text-[9px] ml-1 font-bold">
                        {r.runningBalance > 0 ? ' (B)' : r.runningBalance < 0 ? ' (A)' : ' (-)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-white font-bold text-[11px] text-black">
                <td colSpan={3} className="border-r-0"></td>
                <td className="py-2.5 px-2 text-right border-l-0" colSpan={3}>Genel Toplam :</td>
                <td className="py-2.5 px-2 text-right whitespace-nowrap">
                  {Math.abs(supplierStats.remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                </td>
                <td className="py-2.5 px-2 text-right whitespace-nowrap">
                  {Math.abs(supplierStats.remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  <span className="text-[10px] ml-1 font-bold">
                    {supplierStats.remaining > 0 ? ' (B)' : supplierStats.remaining < 0 ? ' (A)' : ' (-)'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Footer Info */}
          <div className="hidden justify-between border-t border-gray-400 pt-2 mt-8 text-[9px] font-bold text-gray-500 no-screen">
            <span>Sayfa : 1</span>
            <span>www.amasyaetas.com</span>
            <span>"Et Bizim Tek İşimiz.."</span>
          </div>
        </div>
        {renderAddEditModal()}
      </div>
    );
  };

  const renderAddEditModal = () => {
    if (!isModalOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-lg font-bold text-gray-900">
              {editingRecordId ? 'Çekten Hesabını Düzenle' : 'Yeni Çekten Hesabı Ekle'}
            </h2>
            <button 
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Cari / Supplier Input */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tedarikçi / Cari Hesap</label>
              <input
                type="text"
                className="input w-full font-semibold"
                placeholder="Cari hesap adını yazın veya seçin..."
                value={newRecord.supplier}
                onChange={(e) => {
                  setNewRecord(prev => ({ ...prev, supplier: e.target.value }));
                  setShowSupplierSuggestions(true);
                }}
                onFocus={() => setShowSupplierSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSupplierSuggestions(false), 200);
                }}
              />

              {showSupplierSuggestions && existingSuppliers.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {(() => {
                    const query = newRecord.supplier.toLocaleLowerCase('tr-TR');
                    const filtered = existingSuppliers.filter(name =>
                      name.toLocaleLowerCase('tr-TR').includes(query)
                    );
                    if (filtered.length === 0) {
                      return (
                        <div className="px-4 py-2 text-sm text-gray-400">
                          Yeni cari hesap oluşturulacak...
                        </div>
                      );
                    }
                    return filtered.map(name => (
                      <button
                        key={name}
                        type="button"
                        onMouseDown={() => {
                          setNewRecord(prev => ({ ...prev, supplier: name }));
                          setShowSupplierSuggestions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none font-semibold transition-colors"
                      >
                        {name}
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* İşlem Türü Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">İşlem Türü</label>
              <select
                value={newRecordTxType}
                onChange={(e) => setNewRecordTxType(e.target.value as 'borc' | 'odeme')}
                className="input w-full font-semibold"
              >
                <option value="borc">Borç Girişi (Borç)</option>
                <option value="odeme">Alacak Girişi (Ödeme)</option>
              </select>
            </div>


            {/* Amount Input */}
            {newRecordTxType === 'borc' ? (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Toplam Tutar (TL)</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="0,00"
                  value={newRecord.total_amount}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, total_amount: formatNumberString(e.target.value) }))}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Ödenen Tutar (TL)</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="0,00"
                  value={newRecord.paid_amount}
                  onChange={(e) => setNewRecord(prev => ({ ...prev, paid_amount: formatNumberString(e.target.value) }))}
                />
              </div>
            )}

            {/* Notes Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Açıklama</label>
              <textarea
                className="input w-full h-20 resize-none py-2"
                placeholder={newRecordTxType === 'borc' ? "Varsa borç ile ilgili not ekleyin..." : "Varsa ödeme ile ilgili not ekleyin..."}
                value={newRecord.notes}
                onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tarih</label>
              <input
                type="date"
                className="input w-full"
                value={newRecord.date}
                onChange={(e) => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-4 mt-2">
            <button 
              onClick={handleCloseModal}
              className="btn btn-outline"
              disabled={actionLoading}
            >
              İptal
            </button>
            <button 
              onClick={handleCreate}
              className="btn btn-primary bg-brand-600 hover:bg-brand-700 text-white font-bold"
              disabled={actionLoading}
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (selectedSupplierDetail) {
    return renderSupplierDetailPage();
  }

  return (
    <div className="space-y-6 p-6 font-sans">
      {/* Top Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Çekten Hesabı</h1>
          <p className="text-sm text-gray-500">
            Çekten hesabı kapsamındaki bağımsız cari borç ve manuel ödemeleri takip edin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchRecords} 
            className="btn btn-outline flex items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
          <button 
            onClick={handleExportExcel} 
            className="btn btn-outline flex items-center gap-1.5"
          >
            <FileSpreadsheet size={16} />
            Excel'e Aktar
          </button>
          <button 
            onClick={() => {
              setNewRecord({
                date: new Date().toISOString().split('T')[0],
                supplier: '',
                total_amount: '',
                paid_amount: '',
                payment_date: 'CARİ',
                notes: ''
              });
              setNewRecordTxType('borc');
              setEditingRecordId(null);
              setIsModalOpen(true);
            }} 
            className="btn btn-primary flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold"
          >
            <Plus size={16} />
            Yeni Kayıt Ekle
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Kayıt Adedi */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <Database size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Kayıt Adedi</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalQty} Adet</p>
          </div>
        </div>

        {/* Card 2: Toplam Tutar */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-brand-50 p-3 text-brand-600">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Toplam Tutar</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </p>
          </div>
        </div>

        {/* Card 3: Toplam Ödenen */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-rose-50 p-3 text-rose-800">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Toplam Ödenen</p>
            <p className="text-2xl font-bold text-rose-800">
              {stats.totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </p>
          </div>
        </div>

        {/* Card 4: Kalan Bakiye */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="rounded-lg bg-rose-50 p-3 text-rose-600">
            <Info size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Kalan Açık Bakiye</p>
            <p className="text-2xl font-bold text-rose-600">
              {stats.totalRem.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left Side: Search query */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="input pl-10 w-full"
            placeholder="Cari hesap adı veya açıklamalarda ara..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Right Side: Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="input text-xs"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-gray-400 text-xs">—</span>
            <input
              type="date"
              className="input text-xs"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Toggle View Mode buttons */}
          {activeTab === 'main' && (
            <div className="flex border border-gray-200 rounded-lg overflow-hidden p-0.5 bg-gray-50">
              <button
                onClick={() => {
                  setViewMode('summary');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  viewMode === 'summary' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Cari Özet
              </button>
              <button
                onClick={() => {
                  setViewMode('detail');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  viewMode === 'detail' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Tüm Kayıtlar Liste
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Menu Selector (Çekten Hesapları / Son İşlemler) */}
      <div className="flex items-center gap-2 my-4">
        <button
          onClick={() => {
            setActiveTab('main');
            setCurrentPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
            activeTab === 'main'
              ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 font-bold'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold'
          }`}
        >
          Çekten Hesapları
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            setCurrentPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
            activeTab === 'history'
              ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 font-bold'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-semibold'
          }`}
        >
          Çekten Hesabı Son İşlemler
        </button>
      </div>

      {activeTab === 'main' ? (
        <>
          {/* Main Records Table Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
            <RefreshCw size={36} className="animate-spin text-brand-600" />
            <span className="text-sm font-medium">Veriler yükleniyor...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Database size={48} className="text-gray-300 mb-3" />
            <span className="text-sm font-medium">Kayıt bulunamadı.</span>
          </div>
        ) : viewMode === 'summary' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-[13px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  {renderSortHeader('Son İşlem Tarihi', 'date')}
                  {renderSortHeader('Tedarikçi / Cari Hesap', 'supplier')}
                  {renderSortHeader('Toplam Tutar', 'total_amount', 'right')}
                  {renderSortHeader('Toplam Ödenen', 'paid_amount', 'right')}
                  {renderSortHeader('Kalan Bakiye', 'remaining_amount', 'right')}
                  <th className="px-6 py-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-900 font-semibold">
                {paginatedGrouped.map((g) => (
                  <tr key={g.supplier} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-left text-gray-700 font-semibold text-[17px]">
                      {new Date(g.latest_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-[17px]">
                      <span
                        onClick={() => setSelectedSupplierDetail(g.supplier)}
                        className="cursor-pointer hover:underline text-brand-600 hover:text-brand-700 font-bold"
                        title="Detaylı Harekete Git"
                      >
                        {g.supplier}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-semibold text-gray-900">
                      {g.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-semibold">
                      <span className="!text-rose-800">
                        {g.paid_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-bold ${
                      g.remaining_amount > 0 ? 'text-rose-600' : g.remaining_amount < 0 ? 'text-brand-600' : 'text-emerald-600'
                    }`}>
                      {Math.abs(g.remaining_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      <span className="text-[13px] ml-1 font-bold">
                        {g.remaining_amount > 0 ? ' (Borç)' : g.remaining_amount < 0 ? ' (Alacak)' : ' (Sıfır)'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedSupplierDetail(g.supplier)}
                        className="text-brand-600 hover:text-brand-900 font-bold text-xs bg-brand-50 px-2.5 py-1 rounded border border-brand-100 hover:bg-brand-100 transition-colors"
                      >
                        Detay Göster
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200 text-[17px]">
                  <td colSpan={2} className="px-6 py-4 text-left">TOPLAM</td>
                  <td className="px-6 py-4 text-right">
                    {stats.totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="px-6 py-4 text-right text-rose-800">
                    {stats.totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="px-6 py-4 text-right text-rose-600">
                    {stats.totalRem.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-[13px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  {renderSortHeader('Tarih', 'date')}
                  {renderSortHeader('Tedarikçi / Cari Hesap', 'supplier')}
                  {renderSortHeader('Toplam Tutar', 'total_amount', 'right')}
                  {renderSortHeader('Ödenen', 'paid_amount', 'right')}
                  {renderSortHeader('Kalan Bakiye', 'remaining_amount', 'right')}
                  {renderSortHeader('Ödeme Tarihi', 'payment_date', 'center')}
                  {renderSortHeader('Açıklama', 'notes')}
                  <th className="px-6 py-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-900 font-semibold">
                {paginatedDetailed.map((r: CektenRecord) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-left text-[17px] text-gray-900 font-semibold">
                      <InlineEdit
                        value={r.date}
                        displayValue={new Date(r.date).toLocaleDateString('tr-TR')}
                        onSave={(val) => void handleSaveField(r.id, 'date', val)}
                        type="date"
                        align="left"
                        className="justify-start"
                        iconType="calendar"
                      />
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 text-[17px]">
                      <InlineEdit
                        value={r.supplier}
                        displayValue={
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSupplierDetail(r.supplier);
                            }}
                            className="cursor-pointer hover:underline text-brand-600 hover:text-brand-700 font-bold"
                          >
                            {r.supplier}
                          </span>
                        }
                        onSave={(val) => void handleSaveField(r.id, 'supplier', val)}
                        className="font-bold text-gray-900"
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-semibold text-gray-900">
                      {r.total_amount > 0 ? `${Number(r.total_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-semibold">
                      {r.paid_amount > 0 ? (
                        <span className="!text-rose-800">
                          {Number(r.paid_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </span>
                      ) : '—'}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-bold ${
                      r.remaining_amount > 0 ? 'text-rose-600' : r.remaining_amount < 0 ? 'text-brand-600' : 'text-emerald-600'
                    }`}>
                      {Math.abs(r.remaining_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      <span className="text-[13px] ml-1 font-bold">
                        {r.remaining_amount > 0 ? ' (Borç)' : r.remaining_amount < 0 ? ' (Alacak)' : ' (Sıfır)'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      <InlinePaymentDate
                        value={r.payment_date || 'CARİ'}
                        onSave={(val) => void handleSaveField(r.id, 'payment_date', val)}
                      />
                    </td>
                    <td className="px-6 py-4 text-[17px] max-w-xs truncate text-gray-900 font-normal" title={r.notes || ''}>
                      {r.notes || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="text-gray-400 hover:text-brand-600 p-1"
                        title="Düzenle"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-gray-400 hover:text-rose-600 p-1"
                        title="Sil"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200 text-[17px]">
                  <td colSpan={2} className="px-6 py-4 text-left">TOPLAM</td>
                  <td className="px-6 py-4 text-right">
                    {stats.totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="px-6 py-4 text-right text-rose-800">
                    {stats.totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="px-6 py-4 text-right text-rose-600">
                    {stats.totalRem.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td colSpan={3} className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-xl border shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Önceki
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-gray-700">
                Toplam <span className="font-semibold">{viewMode === 'summary' ? groupedRecords.length : sortedDetailedRecords.length}</span> kayıttan{' '}
                <span className="font-semibold">{(currentPage - 1) * pageSize + 1}</span> ile{' '}
                <span className="font-semibold">
                  {Math.min(currentPage * pageSize, viewMode === 'summary' ? groupedRecords.length : sortedDetailedRecords.length)}
                </span>{' '}
                arası gösteriliyor.
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    aria-current={currentPage === i + 1 ? 'page' : undefined}
                    className={`relative inline-flex items-center px-4 py-2 text-xs font-semibold ${
                      currentPage === i + 1
                        ? 'z-10 bg-brand-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

        </>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-[13px] font-bold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Kayıt Zamanı</th>
                  <th className="px-6 py-4 text-left">İşlem Tarihi</th>
                  <th className="px-6 py-4">Tedarikçi / Cari Hesap</th>
                  <th className="px-6 py-4">İşlem Türü</th>
                  <th className="px-6 py-4 text-right pr-10">Tutar</th>
                  <th className="px-6 py-4">Açıklama / İzahat</th>
                  <th className="px-6 py-4 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-900 font-semibold">
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-medium">
                      Henüz kaydedilmiş bir işlem bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((r) => {
                    const isPayment = r.total_amount === 0;
                    const recordTime = new Date(r.created_at).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 text-left text-gray-700 font-semibold text-[17px]">
                          {recordTime}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-left text-[17px] text-gray-900 font-semibold">
                          {new Date(r.date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 text-[17px]">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSupplierDetail(r.supplier);
                            }}
                            className="cursor-pointer hover:underline text-brand-600 hover:text-brand-700 font-bold"
                          >
                            {r.supplier}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                            isPayment ? 'bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-800/20' : 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                          }`}>
                            {isPayment ? 'ALACAK / ÖDEME' : 'BORÇ'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right pr-10 text-[17px] font-semibold">
                          <span className={isPayment ? '!text-rose-800' : 'text-gray-900'}>
                            {((isPayment ? r.paid_amount : r.total_amount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[17px] text-gray-900 font-semibold max-w-xs truncate" title={r.notes || ''}>
                          {r.notes || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="text-gray-400 hover:text-brand-600 p-1"
                            title="Düzenle"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-gray-400 hover:text-rose-600 p-1"
                            title="İşlemi Sil"
                          >
                            <Trash2 size={16} />
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
      )}

      {/* Add/Edit Modal */}
      {renderAddEditModal()}
    </div>
  );
}
