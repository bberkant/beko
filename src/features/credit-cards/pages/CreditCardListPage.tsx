import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Upload, Download, SlidersHorizontal, Search,
  AlertTriangle, CreditCard as CreditCardIcon, Wallet, Clock, Gauge, AlertOctagon, Eye, ReceiptText, Pencil, ChevronDown,
  Archive, RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../lib/toast';
import { useStore, type NewCardInput } from '../data/store';
import type { CreditCard as CreditCardType, StatementStatus } from '../types';
import * as XLSX from 'xlsx';
import {
  formatTRY, limitUsage, usageLevel,
  cardStatusLabel, cardStatusCls,
  statementStatusLabel, statementStatusCls,
} from '../data/labels';
import { CardRowMenu } from '../components/CardRowMenu';
import { DueDateCell } from '../components/DueDateCell';
import { UploadStatementModalBody, UploadProgress, type StatementUploadData } from '../components/UploadStatementModal';
import { BulkPaymentModalBody, type BulkPaymentData } from '../components/BulkPaymentModalBody';
import { PaymentModalBody } from '../components/PaymentModalBody';
import type { Payment } from '../types';
import { resolveCardDueDate, resolveCardOutstandingDebt } from '../lib/billingDateEngine';

interface Filters {
  bank: string;
  status: string;
  dueRange: string;
  holder: string;
  usageRange: string;
  statementStatus: string;
}

const emptyFilters: Filters = {
  bank: '', status: '', dueRange: '', holder: '', usageRange: '', statementStatus: '',
};

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

  const isRightOrCenter = className.includes('text-right') || className.includes('text-center') || className.includes('justify-end') || className.includes('justify-center');
  const justifyClass = 
    className.includes('text-right') || className.includes('justify-end') ? 'justify-end' :
    className.includes('text-center') || className.includes('justify-center') ? 'justify-center' :
    'justify-between';

  return (
    <td className={`table-td !px-2 ${className} relative overflow-visible ${isRightOrCenter ? 'pr-8' : ''}`}>
      <div className={`flex items-center ${justifyClass} w-full gap-1 group/item`}>
        <span className="truncate">{displayValue || <span className="text-gray-400 font-medium">{placeholder}</span>}</span>
        <button
          onClick={startEdit}
          className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2 shrink-0"
          title="Düzenle"
        >
          <Pencil size={16} />
        </button>
      </div>
    </td>
  );
}

export function CreditCardListPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { cards, statements, loading, addStatement, addPayment, updateCard } = useStore();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [uploadCard, setUploadCard] = useState<CreditCardType | null>(null);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [bulkPaymentOpen, setBulkPaymentOpen] = useState(false);
  const [bulkPaymentSubmitting, setBulkPaymentSubmitting] = useState(false);
  const [paymentCard, setPaymentCard] = useState<CreditCardType | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ vehicleId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pickerSearch, setPickerSearch] = useState('');
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [passiveCardsModalOpen, setPassiveCardsModalOpen] = useState(false);

  const passiveCards = useMemo(() => cards.filter((c) => c.status === 'pasif'), [cards]);
  const banks = useMemo(() => Array.from(new Set(cards.map((c) => c.bank))), [cards]);
  const holders = useMemo(() => Array.from(new Set(cards.map((c) => c.holder).filter(Boolean))), [cards]);

  const pickerFilteredCards = useMemo(() => {
    if (!pickerSearch) return cards;
    const q = pickerSearch.toLocaleLowerCase('tr-TR');
    return cards.filter(card => 
      card.bank.toLocaleLowerCase('tr-TR').includes(q) ||
      card.cardName.toLocaleLowerCase('tr-TR').includes(q) ||
      card.last4.includes(q) ||
      (card.holder || '').toLocaleLowerCase('tr-TR').includes(q)
    );
  }, [cards, pickerSearch]);

  const filtered = useMemo(() => {
    const dueDates = new Map(
      cards.map((card) => [card.id, resolveCardDueDate(card, statements).date]),
    );

    return cards.filter((c) => {
      // Pasife alınan kartlar bu ana listede gösterilmez (İşlemler > Pasife Alınan Kartlar altında gösterilir)
      if (c.status === 'pasif') return false;

      if (search) {
        const q = search.toLocaleLowerCase('tr-TR');
        const hit =
          c.bank.toLocaleLowerCase('tr-TR').includes(q) ||
          c.cardName.toLocaleLowerCase('tr-TR').includes(q) ||
          c.last4.includes(q) ||
          c.holder.toLocaleLowerCase('tr-TR').includes(q);
        if (!hit) return false;
      }
      if (filters.bank && c.bank !== filters.bank) return false;
      if (filters.status && c.status !== filters.status) return false;
      if (filters.holder && c.holder !== filters.holder) return false;
      if (filters.statementStatus && c.statementStatus !== filters.statementStatus) return false;
      const usage = limitUsage(c.currentDebt, c.limit);
      if (filters.usageRange === 'normal' && usage >= 70) return false;
      if (filters.usageRange === 'dikkat' && (usage < 70 || usage >= 90)) return false;
      if (filters.usageRange === 'kritik' && usage < 90) return false;
      if (filters.dueRange) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(`${dueDates.get(c.id)}T00:00:00`);
        const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

        if (filters.dueRange === 'overdue' && diff >= 0) return false;
        if (filters.dueRange === '7days' && (diff < 0 || diff > 7)) return false;
        if (filters.dueRange === '30days' && (diff < 0 || diff > 30)) return false;
      }
      return true;
    }).sort((a, b) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const limitA = Number(a.limit) || 0;
      const limitB = Number(b.limit) || 0;
      const hasLimitA = limitA > 0;
      const hasLimitB = limitB > 0;

      // Limiti 0 olan kartlar tablonun en altında durur
      if (hasLimitA && !hasLimitB) return -1;
      if (!hasLimitA && hasLimitB) return 1;
      if (!hasLimitA && !hasLimitB) {
        return a.bank.localeCompare(b.bank, 'tr');
      }

      const debtA = resolveCardOutstandingDebt(a, statements);
      const debtB = resolveCardOutstandingDebt(b, statements);
      const hasDebtA = debtA > 0;
      const hasDebtB = debtB > 0;

      // 1. ÖNCELİK: Ödenmemiş borcu olan kartlar (>0) üstte, borcu ödenen / 0 ₺ olan kartlar alt sıralarda yer alır!
      if (hasDebtA && !hasDebtB) return -1;
      if (!hasDebtA && hasDebtB) return 1;

      const dateA = dueDates.get(a.id) ?? '';
      const dateB = dueDates.get(b.id) ?? '';

      const diffA = dateA ? Math.round((new Date(`${dateA}T00:00:00`).getTime() - today.getTime()) / 86400000) : 999;
      const diffB = dateB ? Math.round((new Date(`${dateB}T00:00:00`).getTime() - today.getTime()) / 86400000) : 999;

      // 2. ÖNCELİK: Tarihe göre artan sıra (en yakın son ödeme tarihi önce)
      if (diffA !== diffB) return diffA - diffB;

      // 3. ÖNCELİK: Vade aynıysa borca göre, sonra bankaya göre
      if (debtA !== debtB) return debtB - debtA;

      return a.bank.localeCompare(b.bank, 'tr');
    });
  }, [cards, statements, search, filters]);

  const kpis = useMemo(() => {
    const activeCards = cards.filter((c) => (Number(c.limit) || 0) > 0);
    const totalLimit = activeCards.reduce((s, c) => s + c.limit, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cardsWithBilling = activeCards.map((card) => ({
      card,
      debt: Number(card.currentDebt) || 0,
      dueDate: resolveCardDueDate(card, statements).date,
    }));
    const totalDebt = cardsWithBilling.reduce((sum, item) => sum + item.debt, 0);
    const in7 = cardsWithBilling.reduce((sum, item) => {
      const due = new Date(`${item.dueDate}T00:00:00`);
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
      return diff >= 0 && diff <= 7 ? sum + item.debt : sum;
    }, 0);
    const avgUsage = activeCards.length > 0
      ? Math.round(cardsWithBilling.reduce((sum, item) => sum + limitUsage(item.debt, item.card.limit), 0) / activeCards.length)
      : 0;
    const critical = cardsWithBilling.filter(({ dueDate }) => {
      const due = new Date(`${dueDate}T00:00:00`);
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
      return diff >= 0 && diff <= 2;
    }).length;
    return { total: activeCards.length, totalLimit, totalDebt, in7, avgUsage, critical };
  }, [cards, statements]);

  const handleUploadSubmit = async (data: StatementUploadData) => {
    if (!uploadCard) return;
    setProgress({ percent: 0, status: 'Yükleniyor' });
    let p = 0;
    const timer = window.setInterval(() => {
      p += 15;
      if (p >= 90) {
        p = 90;
        window.clearInterval(timer);
        setProgress({ percent: 90, status: 'Dosya işleniyor...' });
      } else {
        setProgress({ percent: p, status: 'Dosya yükleniyor...' });
      }
    }, 100);

    try {
      await addStatement({
        cardId: uploadCard.id,
        period: data.period,
        statementDate: data.statementDate,
        dueDate: data.dueDate,
        totalDebt: data.totalDebt,
        minPayment: data.minPayment,
        note: data.note,
        fileName: data.fileName,
        file: data.file,
        transactions: data.transactions,
      });
      window.clearInterval(timer);
      setProgress({ percent: 100, status: 'Tamamlandı' });
      notify(`${uploadCard.cardName} •••• ${uploadCard.last4} için ${data.period} ekstresi yüklendi.`, 'success');
      window.setTimeout(() => {
        setUploadCard(null);
        setProgress(null);
      }, 500);
    } catch (err) {
      window.clearInterval(timer);
      setProgress(null);
      console.error(err);
      notify(err instanceof Error ? err.message : 'Ekstre yüklenirken bir hata oluştu.', 'error');
    }
  };

  const handleBulkPaymentSubmit = async (data: BulkPaymentData) => {
    if (data.payments.length === 0) {
      notify('En az bir kart seçin ve sıfırdan büyük ödeme tutarı girin.', 'error');
      return;
    }
    setBulkPaymentSubmitting(true);
    try {
      await Promise.all(data.payments.map((payment) => addPayment({
        cardId: payment.cardId,
        date: data.date,
        amount: payment.amount,
        type: data.type,
        bankAccount: data.bankAccount,
        description: data.description,
      })));
      notify(`${data.payments.length} kart için ödeme kaydı eklendi.`, 'success');
      setBulkPaymentOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ödeme kayıtları eklenemedi.';
      notify(`Toplu ödeme kaydedilemedi: ${message}`, 'error');
    } finally {
      setBulkPaymentSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (data: { date: string; amount: number; type: Payment['type']; bankAccount: string; description: string }) => {
    if (!paymentCard) return;
    if (data.amount <= 0) {
      notify('Ödeme tutarı sıfırdan büyük olmalıdır.', 'error');
      return;
    }
    setPaymentSubmitting(true);
    try {
      await addPayment({ cardId: paymentCard.id, ...data });
      notify(`${paymentCard.bank} •••• ${paymentCard.last4} için ödeme kaydı eklendi.`, 'success');
      setPaymentCard(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ödeme kaydı eklenemedi.';
      notify(`Ödeme kaydı eklenemedi: ${message}`, 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleCardInlineSave = async (card: CreditCardType, field: string, value: string) => {
    const trimmed = value.trim();
    let finalValue: any = trimmed;

    if (field === "limit") {
      finalValue = parseFloat(trimmed) || 0;
    } else if (field === "currentDebt") {
      finalValue = parseFloat(trimmed) || 0;
    } else if (field === "statementDay") {
      finalValue = parseInt(trimmed, 10);
      if (isNaN(finalValue) || finalValue < 1 || finalValue > 31) {
        notify("Geçersiz gün girdiniz (1-31 arası olmalıdır).", "error");
        return;
      }
    } else if (field === "dueDay") {
      finalValue = parseInt(trimmed, 10);
      if (isNaN(finalValue) || finalValue < 1 || finalValue > 31) {
        notify("Geçersiz gün girdiniz (1-31 arası olmalıdır).", "error");
        return;
      }
    } else if (field === "last4") {
      if (!/^[0-9]{4}$/.test(trimmed)) {
        notify("Son 4 hane tam olarak 4 rakam olmalıdır.", "error");
        return;
      }
    }

    if (finalValue === (card as any)[field]) {
      setEditingCell(null);
      return;
    }

    try {
      const input: NewCardInput = {
        bank: card.bank,
        cardName: card.cardName,
        cardType: card.cardType,
        last4: card.last4,
        holder: card.holder,
        department: card.department,
        limit: card.limit,
        currency: card.currency,
        statementDay: card.statementDay,
        dueDay: card.dueDay,
        minPaymentRate: card.minPaymentRate,
        startDate: card.startDate,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        status: card.status,
        description: card.description,
      };

      (input as any)[field] = finalValue;
      await updateCard(card.id, input);
      setEditingCell(null);
      notify("Kart bilgileri başarıyla güncellendi.", "success");
    } catch (error: any) {
      notify(error.message || "Güncelleme başarısız oldu.", "error");
    }
  };

  const handleReactivateCard = async (card: CreditCardType) => {
    try {
      const input: NewCardInput = {
        bank: card.bank,
        cardName: card.cardName,
        cardType: card.cardType,
        last4: card.last4,
        holder: card.holder,
        department: card.department,
        limit: card.limit,
        currency: card.currency,
        statementDay: card.statementDay,
        dueDay: card.dueDay,
        minPaymentRate: card.minPaymentRate,
        startDate: card.startDate,
        expiryMonth: card.expiryMonth,
        expiryYear: card.expiryYear,
        status: 'aktif',
        description: card.description,
      };
      await updateCard(card.id, input);
      notify(`${card.bank} •••• ${card.last4} kartı başarıyla tekrar aktif edildi.`, 'success');
    } catch (err: any) {
      notify(err?.message || 'Kart durumu güncellenemedi.', 'error');
    }
  };

  const exportCardsToExcel = () => {
    if (!filtered.length) { notify('Dışa aktarılacak kayıt bulunamadı.', 'error'); return; }
    try {
      const data = filtered.map(c => ({
        'Banka': c.bank,
        'Kart Adı': c.cardName,
        'Son 4': c.last4,
        'Hesap Kesim Tarihi': `${c.statementDay}. gün`,
        'Limit': c.limit,
        'Mevcut Borç': c.currentDebt,
        'Kullanan': c.holder || '—',
        'Durum': c.status
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Kartlar");
      XLSX.writeFile(workbook, `Kredi-Kartlari-${new Date().toISOString().slice(0,10)}.xlsx`);
      notify('Excel başarıyla indirildi.', 'success');
    } catch (err) {
      notify('Excel dışa aktarma başarısız oldu.', 'error');
    }
  };

  const exportCardsToPdf = () => {
    if (!filtered.length) { notify('Dışa aktarılacak kayıt bulunamadı.', 'error'); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify('Açılır pencere engelleyiciyi devre dışı bırakın.', 'error');
      return;
    }
    const html = `
      <html>
        <head>
          <title>Kredi Kartları Listesi</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 18px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 11px; }
            th { background-color: #f8fafc; color: #475569; font-weight: 600; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Kredi Kartları Listesi</h1>
          <table>
            <thead>
              <tr>
                <th>Banka</th>
                <th>Kart Adı</th>
                <th>Son 4</th>
                <th>Hesap Kesim</th>
                <th>Limit</th>
                <th>Borç</th>
                <th>Kullanan</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(c => `
                <tr>
                  <td>${c.bank}</td>
                  <td>${c.cardName}</td>
                  <td>•••• ${c.last4}</td>
                  <td>${c.statementDay}. gün</td>
                  <td>${formatTRY(c.limit)}</td>
                  <td>${formatTRY(c.currentDebt)}</td>
                  <td>${c.holder || '—'}</td>
                  <td>${c.status}</td>
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

  const kpiList = [
    { id: 'total', label: 'Toplam Kart Sayısı', value: String(kpis.total), icon: CreditCardIcon, hint: 'tüm kartlar' },
    { id: 'limit', label: 'Toplam Kart Limiti', value: formatTRY(kpis.totalLimit), icon: Wallet, hint: 'birleşik limit' },
    { id: 'debt', label: 'Toplam Güncel Borç', value: formatTRY(kpis.totalDebt), icon: CreditCardIcon, hint: 'tüm kartlar' },
    { id: 'in7', label: '7 Gün İçinde Ödenecek', value: formatTRY(kpis.in7), icon: Clock, hint: 'yaklaşan' },
    { id: 'avg', label: 'Ortalama Limit Kullanımı', value: `%${kpis.avgUsage}`, icon: Gauge, hint: 'tüm kartlar' },
    { id: 'crit', label: 'Son Ödemesine 2 Gün Kalan Kartlar', value: String(kpis.critical), icon: AlertOctagon, hint: 'yaklaşan' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Kredi Kartları"
        description="Şirket kredi kartlarını, borçlarını, limitlerini ve son ödeme tarihlerini yönetin."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="btn-secondary flex items-center gap-1.5"
                onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
              >
                İşlemler
                <ChevronDown size={16} className={`transition-transform duration-200 ${actionsMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {actionsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-20 flex flex-col">
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        setCardPickerOpen(true);
                        setActionsMenuOpen(false);
                      }}
                    >
                      <Upload size={14} className="text-gray-400" /> Ekstre Yükle
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        setBulkPaymentOpen(true);
                        setActionsMenuOpen(false);
                      }}
                    >
                      <ReceiptText size={14} className="text-gray-400" /> Toplu Ödeme Gir
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        exportCardsToExcel();
                        setActionsMenuOpen(false);
                      }}
                    >
                      <Download size={14} className="text-gray-400" /> Excel Dışa Aktar
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        exportCardsToPdf();
                        setActionsMenuOpen(false);
                      }}
                    >
                      <Download size={14} className="text-gray-400" /> PDF Dışa Aktar
                    </button>
                    <hr className="my-1 border-gray-100" />
                    <button
                      className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        setPassiveCardsModalOpen(true);
                        setActionsMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Archive size={14} className="text-gray-400" />
                        <span>Pasife Alınan Kartlar</span>
                      </div>
                      {passiveCards.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          {passiveCards.length}
                        </span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button className="btn-primary" onClick={() => navigate('/finans/kredi-kartlari/yeni')}>
              <Plus size={16} /> Yeni Kart Ekle
            </button>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {loading && cards.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <span className="h-8 w-8 rounded-lg bg-gray-100" />
              </div>
              <div className="mt-3 h-6 w-24 bg-gray-200 rounded" />
              <div className="mt-1.5 h-3 w-28 bg-gray-100 rounded" />
              <div className="mt-1 h-2.5 w-16 bg-gray-50 rounded" />
            </div>
          ))
        ) : (
          kpiList.map((k) => {
            const Icon = k.icon;
            const isCritical = k.id === 'crit' && kpis.critical > 0;
            return (
              <div key={k.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                    <Icon size={15} />
                  </span>
                  {isCritical && <span className="h-2 w-2 rounded-full bg-red-500" />}
                </div>
                <p className="mt-3 text-lg font-semibold tracking-tight text-gray-900">{k.value}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-600">{k.label}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{k.hint}</p>
              </div>
            );
          })
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Banka, kart adı, son 4 hane veya personel ara..."
            className="input pl-9" />
        </div>
        <button className="btn-secondary" onClick={() => setShowFilters((s) => !s)}>
          <SlidersHorizontal size={16} /> Filtrele
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 card p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Banka</label>
              <select className="input" value={filters.bank} onChange={(e) => setFilters((f) => ({ ...f, bank: e.target.value }))}>
                <option value="">Tüm bankalar</option>
                {banks.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Durum</label>
              <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                <option value="">Tüm durumlar</option>
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
                <option value="bloke">Bloke</option>
                <option value="yenileme-bekliyor">Yenileme Bekliyor</option>
              </select>
            </div>
            <div>
              <label className="label">Son ödeme aralığı</label>
              <select className="input" value={filters.dueRange} onChange={(e) => setFilters((f) => ({ ...f, dueRange: e.target.value }))}>
                <option value="">Tümü</option>
                <option value="overdue">Gecikmiş</option>
                <option value="7days">7 gün içinde</option>
                <option value="30days">30 gün içinde</option>
              </select>
            </div>
            <div>
              <label className="label">Kartı kullanan personel</label>
              <select className="input" value={filters.holder} onChange={(e) => setFilters((f) => ({ ...f, holder: e.target.value }))}>
                <option value="">Tüm personel</option>
                {holders.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Limit kullanım oranı</label>
              <select className="input" value={filters.usageRange} onChange={(e) => setFilters((f) => ({ ...f, usageRange: e.target.value }))}>
                <option value="">Tümü</option>
                <option value="normal">Normal (%0–69)</option>
                <option value="dikkat">Dikkat (%70–89)</option>
                <option value="kritik">Kritik (%90+)</option>
              </select>
            </div>
            <div>
              <label className="label">Ekstre durumu</label>
              <select className="input" value={filters.statementStatus} onChange={(e) => setFilters((f) => ({ ...f, statementStatus: e.target.value }))}>
                <option value="">Tümü</option>
                <option value="yuklendi">Yüklendi</option>
                <option value="bekleniyor">Bekleniyor</option>
                <option value="isleniyor">İşleniyor</option>
                <option value="hata">Hata</option>
                <option value="bu-ay-eksik">Bu ay eksik</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button className="btn-ghost" onClick={() => setFilters(emptyFilters)}>Filtreleri Temizle</button>
          </div>
        </div>
      )}

      {/* Desktop table — hidden below lg */}
      <div className="hidden lg:block card overflow-visible">
        <div>
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="table-th w-[4%] !px-1 text-center">#</th>
                <th className="table-th w-[14%] !px-2">Kart</th>
                <th className="table-th w-[7%] !px-2 text-center">Son 4</th>
                <th className="table-th w-[10%] !px-2 text-center pr-8">Hesap Kesim Tarihi</th>
                <th className="table-th w-[15%] !px-2 text-center pr-8">Son Ödeme</th>
                <th className="table-th w-[9%] !px-2 text-center pr-8">Limit</th>
                <th className="table-th w-[9%] !px-2 text-center pr-8">Borç</th>
                <th className="table-th w-[10%] !px-2">Kullanan</th>
                <th className="table-th w-[8%] !px-2">Ekstre</th>
                <th className="table-th w-[7%] !px-2">Durum</th>
                <th className="table-th w-[5%] !px-1 text-center" aria-label="İşlemler"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && cards.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="table-td text-center !px-1"><div className="h-4 w-4 bg-gray-100 rounded mx-auto" /></td>
                    <td className="table-td !px-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-gray-200 shrink-0" />
                        <div className="space-y-1 w-full">
                          <div className="h-4 w-28 bg-gray-200 rounded" />
                          <div className="h-3 w-16 bg-gray-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-center"><div className="h-4 w-12 bg-gray-100 rounded mx-auto" /></td>
                    <td className="table-td text-center pr-8"><div className="h-4 w-16 bg-gray-100 rounded mx-auto" /></td>
                    <td className="table-td text-center pr-8"><div className="h-4 w-24 bg-gray-200 rounded mx-auto" /></td>
                    <td className="table-td text-center pr-8"><div className="h-4 w-20 bg-gray-200 rounded mx-auto" /></td>
                    <td className="table-td text-center pr-8"><div className="h-4 w-20 bg-gray-200 rounded mx-auto" /></td>
                    <td className="table-td"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-5 w-16 bg-gray-100 rounded-full" /></td>
                    <td className="table-td"><div className="h-5 w-14 bg-gray-100 rounded-full" /></td>
                    <td className="table-td text-center"><div className="h-6 w-6 bg-gray-100 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : (
                filtered.map((c, index) => {
                  const dueDate = resolveCardDueDate(c, statements);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/40">
                      <td className="table-td text-center text-gray-500 font-medium text-xs !px-1">{index + 1}</td>
                      <td className="table-td !px-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-[10px] font-semibold text-gray-600">{c.bankShort}</span>
                          <div className="min-w-0 flex-1">
                            {editingCell && editingCell.vehicleId === c.id && editingCell.field === 'bank' ? (
                              <input
                                type="text"
                                className="input !py-0.5 !px-1.5 !text-xs w-full mb-1"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCardInlineSave(c, 'bank', editValue);
                                  else if (e.key === 'Escape') setEditingCell(null);
                                }}
                                onBlur={() => handleCardInlineSave(c, 'bank', editValue)}
                                autoFocus
                              />
                            ) : (
                              <div className="relative flex items-center justify-between gap-1 group/item">
                                <button className="block max-w-full truncate font-bold text-brand-600 hover:text-brand-700 text-left" onClick={() => navigate(`/finans/kredi-kartlari/${c.id}`)}>{c.bank}</button>
                                <button
                                  onClick={() => {
                                    setEditingCell({ vehicleId: c.id, field: 'bank' });
                                    setEditValue(c.bank);
                                  }}
                                  className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2 shrink-0"
                                  title="Bankayı Düzenle"
                                >
                                  <Pencil size={16} />
                                </button>
                              </div>
                            )}

                            {editingCell && editingCell.vehicleId === c.id && editingCell.field === 'cardName' ? (
                              <input
                                type="text"
                                className="input !py-0.5 !px-1.5 !text-[11px] w-full"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCardInlineSave(c, 'cardName', editValue);
                                  else if (e.key === 'Escape') setEditingCell(null);
                                }}
                                onBlur={() => handleCardInlineSave(c, 'cardName', editValue)}
                                autoFocus
                              />
                            ) : (
                              <div className="relative flex items-center justify-between gap-1 group/item">
                                <span className="block truncate text-[11px] text-gray-500 font-bold">{c.cardName}</span>
                                <button
                                  onClick={() => {
                                    setEditingCell({ vehicleId: c.id, field: 'cardName' });
                                    setEditValue(c.cardName);
                                  }}
                                  className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2 shrink-0"
                                  title="Kart Adını Düzenle"
                                >
                                  <Pencil size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <InlineTextCell
                        value={c.last4}
                        displayValue={
                          <span className="font-mono text-sm">
                            <span className="text-gray-400 tracking-tight">•••• </span>
                            <span className="font-bold text-gray-900 text-[15px]">{c.last4}</span>
                          </span>
                        }
                        onSave={(val) => handleCardInlineSave(c, "last4", val)}
                        className="!text-sm text-gray-700"
                        inputClassName="font-mono text-center max-w-[80px]"
                      />
                      <InlineTextCell
                        value={String(c.statementDay)}
                        displayValue={`${c.statementDay}. gün`}
                        onSave={(val) => handleCardInlineSave(c, "statementDay", val)}
                        className="!text-sm font-semibold text-gray-900 text-center"
                        inputClassName="text-center max-w-[60px]"
                      />
                      <td className="table-td !px-2 !text-xs relative overflow-visible pr-8">
                        {editingCell && editingCell.vehicleId === c.id && editingCell.field === 'dueDay' ? (
                          <input
                            type="text"
                            className="input !py-0.5 !px-1.5 !text-xs max-w-[60px] text-center"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCardInlineSave(c, 'dueDay', editValue);
                              else if (e.key === 'Escape') setEditingCell(null);
                            }}
                            onBlur={() => handleCardInlineSave(c, 'dueDay', editValue)}
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full gap-1 group/item">
                            <DueDateCell dueDate={dueDate.date} statementStatus={c.statementStatus} currentDebt={Number(c.currentDebt) || 0} cardLimit={c.limit} />
                            <button
                              onClick={() => {
                                setEditingCell({ vehicleId: c.id, field: 'dueDay' });
                                setEditValue(String(c.dueDay));
                              }}
                              className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2 shrink-0"
                              title="Son Ödeme Gününü Düzenle"
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                      <InlineTextCell
                        value={String(c.limit)}
                        displayValue={formatTRY(c.limit)}
                        onSave={(val) => handleCardInlineSave(c, "limit", val)}
                        className="!text-xs text-gray-700 text-center"
                        inputClassName="text-center"
                      />
                      <InlineTextCell
                        value={String(c.currentDebt)}
                        displayValue={formatTRY(c.currentDebt)}
                        onSave={(val) => handleCardInlineSave(c, "currentDebt", val)}
                        className="!text-xs font-normal text-gray-900 text-center"
                        inputClassName="text-center"
                      />
                      <InlineTextCell
                        value={c.holder || ""}
                        displayValue={c.holder}
                        onSave={(val) => handleCardInlineSave(c, "holder", val)}
                        className="!text-xs text-gray-700"
                        placeholder="—"
                      />
                      <td className="table-td !px-2">
                        <div className="flex items-center gap-1.5">
                          {(c.statementStatus === 'bu-ay-eksik' || c.statementStatus === 'bekleniyor') && <AlertTriangle size={13} className="text-amber-400" />}
                          <Badge className={statementStatusCls[c.statementStatus as StatementStatus]}>{statementStatusLabel[c.statementStatus as StatementStatus]}</Badge>
                        </div>
                      </td>
                      <td className="table-td !px-2"><Badge className={cardStatusCls[c.status]}>{cardStatusLabel[c.status]}</Badge></td>
                      <td className="table-td !px-1 text-center">
                        <CardRowMenu card={c} onUploadStatement={() => { setUploadCard(c); setProgress(null); }} onAddPayment={() => setPaymentCard(c)} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Filtrelere uyan kart bulunamadı.</div>}
      </div>

      {/* Mobile/tablet cards — shown below lg */}
      <div className="space-y-3 lg:hidden">
        {loading && cards.length === 0 ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="card p-4 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-gray-200 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            </div>
          ))
        ) : (
          filtered.map((c) => {
            const usage = limitUsage(c.currentDebt, c.limit);
            const level = usageLevel(usage);
            const available = c.limit - c.currentDebt;
            const dueDate = resolveCardDueDate(c, statements);
            return (
              <div key={c.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600">{c.bankShort}</span>
                    <div>
                      <button className="text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={() => navigate(`/finans/kredi-kartlari/${c.id}`)}>
                        {c.bank}
                      </button>
                      <p className="text-xs text-gray-500">
                        {c.cardName} ·{' '}
                        <span className="font-mono">
                          <span className="text-gray-400">•••• </span>
                          <span className="font-semibold text-gray-800">{c.last4}</span>
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge className={cardStatusCls[c.status]}>{cardStatusLabel[c.status]}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400">Kartı Kullanan</p>
                    <p className="font-medium text-gray-700">{c.holder || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Güncel Borç</p>
                    <p className="font-medium text-gray-700">{formatTRY(c.currentDebt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Kart Limiti</p>
                    <p className="font-medium text-gray-700">{formatTRY(c.limit)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Kullanılabilir</p>
                    <p className="font-medium text-gray-700">{formatTRY(available)}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Limit Kullanımı</span>
                  </div>
                  <ProgressBar value={usage} level={level} showLabel />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400">Son Ödeme</p>
                    <DueDateCell dueDate={dueDate.date} statementStatus={c.statementStatus} currentDebt={Number(c.currentDebt) || 0} cardLimit={c.limit} />
                  </div>
                  <div>
                    <p className="text-gray-400">Ekstre Durumu</p>
                    <div className="flex items-center gap-1.5">
                      {(c.statementStatus === 'bu-ay-eksik' || c.statementStatus === 'bekleniyor') && <AlertTriangle size={13} className="text-amber-400" />}
                      <Badge className={statementStatusCls[c.statementStatus as StatementStatus]}>{statementStatusLabel[c.statementStatus as StatementStatus]}</Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => navigate(`/finans/kredi-kartlari/${c.id}`)}>
                    <Eye size={14} /> Görüntüle
                  </button>
                  <CardRowMenu card={c} onUploadStatement={() => { setUploadCard(c); setProgress(null); }} onAddPayment={() => setPaymentCard(c)} />
                </div>
              </div>
            );
          })
        )}
        {!loading && filtered.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Filtrelere uyan kart bulunamadı.</div>}
      </div>

      {/* Upload statement modal */}
      <Modal
        open={cardPickerOpen}
        onClose={() => { setCardPickerOpen(false); setPickerSearch(''); }}
        title="Ekstre Yüklenecek Kartı Seçin"
        description="Ekstreyi ilişkilendirmek istediğiniz kredi kartını seçin."
        size="md"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={pickerSearch} 
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Banka, kart adı, son 4 hane veya personel ara..."
              className="input pl-9 !py-1.5 !text-sm" 
            />
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {pickerFilteredCards.map((card) => (
              <button
                key={card.id}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-brand-300 hover:bg-brand-50/40"
                onClick={() => { setCardPickerOpen(false); setUploadCard(card); setProgress(null); setPickerSearch(''); }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600">{card.bankShort}</span>
                <span>
                  <span className="block text-sm font-medium text-gray-900">{card.bank} {card.cardName}</span>
                  <span className="block text-xs text-gray-500">•••• {card.last4}{card.holder ? ` · ${card.holder}` : ''}</span>
                </span>
              </button>
            ))}
            {pickerFilteredCards.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">
                {cards.length === 0 ? "Önce bir kredi kartı eklemelisiniz." : "Aranan kriterlere uygun kart bulunamadı."}
              </p>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(uploadCard)}
        onClose={() => { setUploadCard(null); setProgress(null); }}
        title="Ekstre Yükle"
        description={uploadCard ? `${uploadCard.bank} ${uploadCard.cardName} •••• ${uploadCard.last4}` : ''}
        size="md"
      >
        {uploadCard && (
          <UploadStatementModalBody card={uploadCard} progress={progress} onSubmit={handleUploadSubmit} />
        )}
      </Modal>

      <Modal
        open={bulkPaymentOpen}
        onClose={() => { if (!bulkPaymentSubmitting) setBulkPaymentOpen(false); }}
        title="Toplu Ödeme Gir"
        description="Birden fazla kredi kartı için tek işlemde ödeme kaydı oluşturun."
        size="lg"
      >
        <BulkPaymentModalBody
          cards={cards.filter((card) => card.status !== 'pasif')}
          statements={statements}
          submitting={bulkPaymentSubmitting}
          onSubmit={(data) => void handleBulkPaymentSubmit(data)}
        />
      </Modal>

      <Modal
        open={Boolean(paymentCard)}
        onClose={() => { if (!paymentSubmitting) setPaymentCard(null); }}
        title="Ödeme Kaydı Ekle"
        description={paymentCard ? `${paymentCard.bank} ${paymentCard.cardName} •••• ${paymentCard.last4}` : ''}
        size="md"
      >
        {paymentCard && (
          <PaymentModalBody
            initialAmount={Number(paymentCard.currentDebt) || 0}
            onSubmit={(data) => void handlePaymentSubmit(data)}
          />
        )}
      </Modal>

      {/* Pasife Alınan Kartlar Modalı */}
      <Modal
        open={passiveCardsModalOpen}
        onClose={() => setPassiveCardsModalOpen(false)}
        title={`Pasife Alınan Kartlar (${passiveCards.length})`}
        description="Şirketin pasife alınmış kredi kartları burada listelenir. Dilediğiniz kartı tekrar aktif duruma getirebilirsiniz."
        size="lg"
      >
        <div className="space-y-4">
          {passiveCards.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Henüz pasife alınmış bir kredi kartı bulunmuyor.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white shadow-sm">
              {passiveCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-4 hover:bg-gray-50/80 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xs font-bold text-gray-600 border border-gray-200">
                      {card.bankShort}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{card.bank}</span>
                        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                          •••• {card.last4}
                        </span>
                        <Badge className={cardStatusCls[card.status]}>{cardStatusLabel[card.status]}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>{card.cardName}</span>
                        <span>•</span>
                        <span>Limit: <strong className="text-gray-700">{formatTRY(card.limit)}</strong></span>
                        <span>•</span>
                        <span>Borç: <strong className="text-gray-700">{formatTRY(card.currentDebt)}</strong></span>
                        {card.holder && (
                          <>
                            <span>•</span>
                            <span>Kullanan: <strong className="text-gray-700">{card.holder}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="btn-secondary !py-1.5 !px-3 !text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300 font-semibold"
                      onClick={() => void handleReactivateCard(card)}
                      title="Kartı Tekrar Aktif Et"
                    >
                      <RotateCcw size={13} className="inline mr-1" /> Aktife Al
                    </button>
                    <button
                      className="btn-secondary !py-1.5 !px-3 !text-xs font-medium"
                      onClick={() => {
                        setPassiveCardsModalOpen(false);
                        navigate(`/finans/kredi-kartlari/${card.id}`);
                      }}
                    >
                      <Eye size={13} className="inline mr-1" /> Detay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button className="btn-secondary !px-4 !py-2 text-sm" onClick={() => setPassiveCardsModalOpen(false)}>
              Kapat
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
