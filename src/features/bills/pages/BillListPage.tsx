import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Download, ChevronDown, Filter, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useToast } from '../../../lib/toast';
import { useBills } from '../data/store';
import { billCategoryConfig, billStatusLabels, formatTRY, formatDateTR } from '../data/labels';
import { BillDueDateCell } from '../components/BillDueDateCell';
import { BillRowMenu } from '../components/BillRowMenu';
import { BillModal } from '../components/BillModal';
import { InvoiceModal } from '../components/InvoiceModal';
import type { CompanyBill, BillFormInput, InvoiceFormInput } from '../types';

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
          <Pencil size={14} />
        </button>
      </div>
    </td>
  );
}

export function BillListPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const {
    bills,
    loading,
    addBill,
    updateBill,
    deleteBill,
    toggleBillStatus,
    addInvoice
  } = useBills();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  // Modals
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<CompanyBill | null>(null);
  const [invoiceModalBill, setInvoiceModalBill] = useState<CompanyBill | null>(null);

  // Filtering & Sorting
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (search) {
        const q = search.toLocaleLowerCase('tr-TR');
        const match =
          b.name.toLocaleLowerCase('tr-TR').includes(q) ||
          b.subscriberNo.toLocaleLowerCase('tr-TR').includes(q) ||
          (b.notes || '').toLocaleLowerCase('tr-TR').includes(q);
        if (!match) return false;
      }
      if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
      if (selectedCompany !== 'all' && b.company !== selectedCompany) return false;
      if (selectedStatus !== 'all' && b.billStatus !== selectedStatus) return false;
      return true;
    }).sort((a, b) => {
      // 1. Unpaid first, Paid last
      const isPaidA = a.billStatus === 'odendi';
      const isPaidB = b.billStatus === 'odendi';
      if (!isPaidA && isPaidB) return -1;
      if (isPaidA && !isPaidB) return 1;

      // 2. Sort by Due Date ascending
      const dateA = a.dueDate ? new Date(`${a.dueDate}T00:00:00`).getTime() : 9999999999999;
      const dateB = b.dueDate ? new Date(`${b.dueDate}T00:00:00`).getTime() : 9999999999999;

      if (dateA !== dateB) return dateA - dateB;

      // 3. By amount descending
      return b.currentAmount - a.currentAmount;
    });
  }, [bills, search, selectedCategory, selectedCompany, selectedStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalCount = bills.length;
    const unpaidBills = bills.filter(b => b.billStatus !== 'odendi');
    const totalUnpaidAmount = unpaidBills.reduce((sum, b) => sum + (b.currentAmount || 0), 0);
    
    const paidThisMonth = bills.filter(b => {
      if (b.billStatus === 'odendi' && b.lastPaidAt) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return b.lastPaidAt.startsWith(currentMonth);
      }
      return b.billStatus === 'odendi';
    }).reduce((sum, b) => sum + (b.currentAmount || 0), 0);

    const in7Days = unpaidBills.filter(b => {
      if (!b.dueDate) return false;
      const due = new Date(`${b.dueDate}T00:00:00`);
      const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
      return diff >= 0 && diff <= 7;
    });
    const in7DaysAmount = in7Days.reduce((sum, b) => sum + (b.currentAmount || 0), 0);

    const overdueCount = unpaidBills.filter(b => {
      if (!b.dueDate) return false;
      const due = new Date(`${b.dueDate}T00:00:00`);
      return due.getTime() < today.getTime();
    }).length;

    return {
      totalCount,
      totalUnpaidAmount,
      paidThisMonth,
      in7DaysCount: in7Days.length,
      in7DaysAmount,
      overdueCount
    };
  }, [bills]);

  // Excel Export
  const exportToExcel = () => {
    try {
      const rows = filteredBills.map((b, idx) => ({
        'Sıra': idx + 1,
        'Fatura / Kurum Adı': b.name,
        'Abone / Tesisat No': b.subscriberNo,
        'Hizmet Türü': billCategoryConfig[b.category]?.label || b.category,
        'Şirket': b.company,
        'Son Ödeme Tarihi': formatDateTR(b.dueDate),
        'Fatura Tutarı': b.currentAmount,
        'Durum': billStatusLabels[b.billStatus]?.label || b.billStatus,
        'Otomatik Ödeme': b.autoPayment ? 'Evet' : 'Hayır',
        'Notlar': b.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Faturalar');
      XLSX.writeFile(wb, `Sirket_Faturalari_${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify('Excel dosyası başarıyla indirildi.', 'success');
    } catch {
      notify('Excel dışa aktarma hatası.', 'error');
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
          <title>Şirket Faturaları Listesi</title>
          <style>
            body { font-family: 'Calibri', 'Inter', sans-serif; padding: 20px; font-size: 13px; color: #111; }
            h2 { margin: 0 0 4px 0; font-size: 18px; }
            p { margin: 0 0 16px 0; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f3f4f6; color: #dc2626; font-weight: bold; border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Şirket Faturaları ve Abonelik Listesi</h2>
          <p>Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;" class="text-center">#</th>
                <th>Kurum / Fatura Adı</th>
                <th>Abone No</th>
                <th>Tür</th>
                <th>Şirket</th>
                <th class="text-center">Son Ödeme</th>
                <th class="text-right">Tutar</th>
                <th class="text-center">Durum</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBills.map((b, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="font-bold">${b.name}</td>
                  <td>${b.subscriberNo || '—'}</td>
                  <td>${billCategoryConfig[b.category]?.label || b.category}</td>
                  <td>${b.company}</td>
                  <td class="text-center">${formatDateTR(b.dueDate)}</td>
                  <td class="text-right font-bold">${formatTRY(b.currentAmount)}</td>
                  <td class="text-center">${billStatusLabels[b.billStatus]?.label || b.billStatus}</td>
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

  const handleSaveBill = async (input: BillFormInput) => {
    if (editingBill) {
      await updateBill(editingBill.id, input);
    } else {
      await addBill(input);
    }
  };

  const handleSaveInvoice = async (input: InvoiceFormInput) => {
    await addInvoice(input);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Faturalar"
        description="Şirketin tüm kurum faturalarını, abone numaralarını, son ödeme tarihlerini ve cari ekstrelerini yönetin."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="btn-secondary flex items-center gap-1.5"
                onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
              >
                İşlemler
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${actionsMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {actionsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-20 flex flex-col">
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        exportToExcel();
                        setActionsMenuOpen(false);
                      }}
                    >
                      <Download size={14} className="text-gray-400" /> Excel Dışa Aktar
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
                      onClick={() => {
                        exportToPdf();
                        setActionsMenuOpen(false);
                      }}
                    >
                      <Download size={14} className="text-gray-400" /> PDF Dışa Aktar
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              className="btn-primary flex items-center gap-1.5"
              onClick={() => {
                setEditingBill(null);
                setBillModalOpen(true);
              }}
            >
              <Plus size={16} />
              Yeni Fatura / Kurum Ekle
            </button>
          </div>
        }
      />

      {/* KPI Cards (Clean, Minimalist Design) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Toplam Fatura</span>
          <p className="mt-2 text-xl font-bold text-gray-900">{kpis.totalCount} Kurum</p>
          <p className="text-[11px] text-gray-400 mt-0.5">kayıtlı abonelik</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Ödenecek Tutar</span>
          <p className="mt-2 text-xl font-bold text-red-600" style={{ fontFamily: 'Calibri, sans-serif' }}>
            {formatTRY(kpis.totalUnpaidAmount)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">bekleyen faturalar</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Bu Ay Ödenen</span>
          <p className="mt-2 text-xl font-bold text-emerald-700" style={{ fontFamily: 'Calibri, sans-serif' }}>
            {formatTRY(kpis.paidThisMonth)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">ödenmiş faturalar</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">7 Gün İçinde Vade</span>
          <p className="mt-2 text-xl font-bold text-amber-700" style={{ fontFamily: 'Calibri, sans-serif' }}>
            {formatTRY(kpis.in7DaysAmount)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{kpis.in7DaysCount} fatura yaklaşıyor</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Gecikmiş Fatura</span>
          <p className="mt-2 text-xl font-bold text-red-700">{kpis.overdueCount} Adet</p>
          <p className="text-[11px] text-gray-400 mt-0.5">vadesi geçmiş</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-3.5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input w-full pl-9 pr-4 text-sm"
              placeholder="Fatura adı, abone no veya açıklama ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Filter size={14} className="text-gray-400" />
              <select
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Tüm Hizmetler</option>
                {Object.entries(billCategoryConfig).map(([k, cfg]) => (
                  <option key={k} value={k}>{cfg.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <select
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              >
                <option value="all">Tüm Şirketler</option>
                <option value="ETİK">ETİK</option>
                <option value="MARİF">MARİF</option>
                <option value="GENEL">GENEL</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <select
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tüm Durumlar</option>
                <option value="odenecek">Ödenecekler</option>
                <option value="odendi">Ödenenler</option>
                <option value="gecikmede">Gecikmede Olanlar</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table (Clean, Corporate, Minimalist) */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="table-th w-10 text-center font-bold text-red-600 !text-sm">#</th>
                <th className="table-th text-left font-bold text-red-600 !text-sm">Fatura / Kurum Adı</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Abone / Tesisat No</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Hizmet Türü</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Şirket</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Son Ödeme Tarihi</th>
                <th className="table-th text-right font-bold text-red-600 !text-sm">Fatura Tutarı</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Durum & İşlem</th>
                <th className="table-th w-12 text-center font-bold text-red-600 !text-sm">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && bills.length === 0 ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="table-td text-center"><div className="h-4 w-4 bg-gray-100 rounded mx-auto" /></td>
                    <td className="table-td"><div className="h-4 w-36 bg-gray-200 rounded" /></td>
                    <td className="table-td text-center"><div className="h-4 w-24 bg-gray-100 rounded mx-auto" /></td>
                    <td className="table-td text-center"><div className="h-4 w-16 bg-gray-100 rounded mx-auto" /></td>
                    <td className="table-td text-center"><div className="h-4 w-12 bg-gray-100 rounded mx-auto" /></td>
                    <td className="table-td text-center"><div className="h-4 w-20 bg-gray-100 rounded mx-auto" /></td>
                    <td className="table-td text-right"><div className="h-4 w-20 bg-gray-200 rounded ml-auto" /></td>
                    <td className="table-td text-center"><div className="h-5 w-20 bg-gray-100 rounded-full mx-auto" /></td>
                    <td className="table-td text-center"><div className="h-4 w-4 bg-gray-100 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Kayıtlı fatura veya filtreye uyan sonuç bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b, index) => {
                  const catLabel = billCategoryConfig[b.category]?.label || b.category;

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-gray-50/60 transition-colors group/row"
                    >
                      {/* # */}
                      <td className="table-td text-center text-gray-400 font-medium text-xs !px-1">
                        {index + 1}
                      </td>

                      {/* Name with clickable blue link */}
                      <td className="table-td !py-2.5">
                        <div className="min-w-0">
                          <button
                            onClick={() => navigate(`/finans/faturalar/${b.id}`)}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-left block truncate text-[15px]"
                            title="Cari hareketlerini ve geçmiş faturaları görüntüle"
                          >
                            {b.name}
                          </button>
                          <div className="flex items-center gap-2 mt-0.5">
                            {b.autoPayment && (
                              <span
                                className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/70"
                                title={b.autoPaymentBank ? `Talimat: ${b.autoPaymentBank}` : 'Otomatik Ödeme'}
                              >
                                Otomatik Ödeme{b.autoPaymentBank ? ` • ${b.autoPaymentBank}` : ''}
                              </span>
                            )}
                            {b.notes && (
                              <span className="text-[11px] text-gray-400 truncate max-w-[240px]" title={b.notes}>
                                {b.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subscriber No (Inline edit) */}
                      <InlineTextCell
                        value={b.subscriberNo}
                        displayValue={
                          <span className="font-mono text-sm font-semibold text-gray-800">
                            {b.subscriberNo || <span className="text-gray-300 font-normal">Girilmedi</span>}
                          </span>
                        }
                        onSave={(val) => updateBill(b.id, { subscriberNo: val })}
                        className="text-center"
                        inputClassName="text-center font-mono"
                        placeholder="Abone no..."
                      />

                      {/* Category */}
                      <td className="table-td text-center">
                        <span className="text-xs font-medium text-gray-700">
                          {catLabel}
                        </span>
                      </td>

                      {/* Company */}
                      <td className="table-td text-center">
                        <span className="text-xs font-bold text-gray-800">
                          {b.company}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="table-td text-center !px-2">
                        <BillDueDateCell
                          dueDate={b.dueDate}
                          billStatus={b.billStatus}
                          lastPaidAt={b.lastPaidAt}
                        />
                      </td>

                      {/* Amount */}
                      <InlineTextCell
                        value={String(b.currentAmount)}
                        displayValue={
                          <span className="font-bold text-gray-900 text-base" style={{ fontFamily: 'Calibri, sans-serif' }}>
                            {formatTRY(b.currentAmount)}
                          </span>
                        }
                        onSave={(val) => {
                          const clean = val.replace(/[^0-9.,]/g, '').replace(',', '.');
                          const num = parseFloat(clean) || 0;
                          updateBill(b.id, { currentAmount: num });
                        }}
                        className="text-right"
                        inputClassName="text-right font-bold"
                      />

                      {/* Status Button */}
                      <td className="table-td text-center !px-2">
                        <button
                          onClick={() => toggleBillStatus(b.id)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                            b.billStatus === 'odendi'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                          }`}
                          title="Durumu değiştirmek için tıklayın"
                        >
                          {b.billStatus === 'odendi' ? 'Ödendi' : 'Ödenecek'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="table-td text-center !px-1">
                        <BillRowMenu
                          bill={b}
                          onEdit={() => {
                            setEditingBill(b);
                            setBillModalOpen(true);
                          }}
                          onDelete={() => deleteBill(b.id)}
                          onToggleStatus={() => toggleBillStatus(b.id)}
                          onAddInvoice={() => setInvoiceModalBill(b)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Modal */}
      <BillModal
        open={billModalOpen}
        onClose={() => {
          setBillModalOpen(false);
          setEditingBill(null);
        }}
        onSubmit={handleSaveBill}
        bill={editingBill}
      />

      {/* Invoice Modal */}
      {invoiceModalBill && (
        <InvoiceModal
          open={Boolean(invoiceModalBill)}
          onClose={() => setInvoiceModalBill(null)}
          onSubmit={handleSaveInvoice}
          billId={invoiceModalBill.id}
          billName={invoiceModalBill.name}
        />
      )}
    </div>
  );
}
