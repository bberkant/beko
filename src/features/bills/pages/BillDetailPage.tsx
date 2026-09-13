import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useBills } from '../data/store';
import { billCategoryConfig, formatTRY, formatDateTR } from '../data/labels';
import { BillDueDateCell } from '../components/BillDueDateCell';
import { BillModal } from '../components/BillModal';
import { InvoiceModal } from '../components/InvoiceModal';
import type { BillInvoice, InvoiceFormInput, BillFormInput } from '../types';

export function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    bills,
    loading,
    updateBill,
    getInvoicesByBillId,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    toggleInvoiceStatus
  } = useBills();

  const bill = useMemo(() => bills.find((b) => b.id === id), [bills, id]);
  const invoices = useMemo(() => (id ? getInvoicesByBillId(id) : []), [getInvoicesByBillId, id]);

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<BillInvoice | null>(null);

  // Cari Stats
  const stats = useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;

    invoices.forEach((inv) => {
      totalInvoiced += inv.amount || 0;
      if (inv.status === 'odendi') {
        totalPaid += inv.paidAmount || inv.amount || 0;
      } else {
        totalUnpaid += (inv.amount || 0) - (inv.paidAmount || 0);
      }
    });

    const avgMonthly = invoices.length > 0 ? Math.round(totalInvoiced / invoices.length) : 0;

    return {
      totalInvoiced,
      totalPaid,
      totalUnpaid,
      avgMonthly,
      count: invoices.length
    };
  }, [invoices]);

  if (loading && !bill) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="card p-8 text-center text-gray-400 animate-pulse">
          Fatura detayları yükleniyor...
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <button
          onClick={() => navigate('/finans/faturalar')}
          className="btn-secondary inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Faturalar Listesine Dön
        </button>
        <div className="card p-12 text-center text-gray-500">
          <p className="text-lg font-bold text-gray-800">Fatura kaydı bulunamadı.</p>
          <p className="text-sm text-gray-400 mt-1">İlgili abonelik silinmiş veya taşınmış olabilir.</p>
        </div>
      </div>
    );
  }

  const catLabel = billCategoryConfig[bill.category]?.label || bill.category;

  const handleSaveBill = async (input: BillFormInput) => {
    if (bill) {
      await updateBill(bill.id, input);
    }
  };

  const handleSaveInvoice = async (input: InvoiceFormInput) => {
    if (editingInvoice) {
      await updateInvoice(editingInvoice.id, input);
    } else {
      await addInvoice(input);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Back Navigation & Page Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/finans/faturalar')}
          className="btn-secondary inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft size={16} />
          Tüm Faturalara Dön
        </button>
      </div>

      <PageHeader
        title={`${bill.name} - Cari Ekstre & Fatura Geçmişi`}
        description={`Abone No: ${bill.subscriberNo || 'Belirtilmedi'} | Şirket: ${bill.company} | Hizmet: ${catLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary flex items-center gap-1.5"
              onClick={() => setBillModalOpen(true)}
            >
              <Pencil size={15} />
              Aboneliği Düzenle
            </button>
            <button
              className="btn-primary flex items-center gap-1.5"
              onClick={() => {
                setEditingInvoice(null);
                setInvoiceModalOpen(true);
              }}
            >
              <Plus size={16} />
              Yeni Dönem Faturası Ekle
            </button>
          </div>
        }
      />

      {/* Subscription Summary Info Card (Clean, Minimalist) */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold text-gray-900">{bill.name}</h3>
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                {catLabel}
              </span>
              <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                {bill.company}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 font-medium">
              <span>Abone / Tesisat: <strong className="text-gray-800 font-mono">{bill.subscriberNo || '—'}</strong></span>
              {bill.autoPayment && (
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  Otomatik Ödeme Aktif
                </span>
              )}
              {bill.notes && (
                <span className="text-gray-400">Not: {bill.notes}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-gray-400 block uppercase">Son Fatura Tutarı</span>
              <span className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Calibri, sans-serif' }}>
                {formatTRY(bill.currentAmount)}
              </span>
            </div>
            <div className="border-l border-gray-200 pl-4 text-right">
              <span className="text-[11px] font-semibold text-gray-400 block uppercase">Son Ödeme</span>
              <span className="text-sm font-bold text-gray-700 block">
                {formatDateTR(bill.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards (Clean) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Toplam Ödenen</span>
          <p className="mt-2 text-xl font-bold text-emerald-700" style={{ fontFamily: 'Calibri, sans-serif' }}>
            {formatTRY(stats.totalPaid)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">geçmiş ödemeler toplamı</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Bekleyen Borç</span>
          <p className="mt-2 text-xl font-bold text-red-600" style={{ fontFamily: 'Calibri, sans-serif' }}>
            {formatTRY(stats.totalUnpaid)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">ödenmemiş cari bakiye</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Toplam Fatura Hacmi</span>
          <p className="mt-2 text-xl font-bold text-gray-900" style={{ fontFamily: 'Calibri, sans-serif' }}>
            {formatTRY(stats.totalInvoiced)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{stats.count} adet dönem faturası</p>
        </div>

        <div className="card p-4">
          <span className="text-xs font-medium text-gray-500 block">Aylık Ortalama Tutar</span>
          <p className="mt-2 text-xl font-bold text-gray-800" style={{ fontFamily: 'Calibri, sans-serif' }}>
            {formatTRY(stats.avgMonthly)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">dönem başı ortalama tüketim</p>
        </div>
      </div>

      {/* Monthly Invoices & Cari Ekstre Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Geçmiş Dönem Faturaları ve Ödeme Ekstresi</h3>
            <p className="text-xs text-gray-500 mt-0.5">Kuruma yapılan tüm aylık fatura ödemeleri ve kesilen faturaların dökümü</p>
          </div>

          <button
            className="btn-secondary text-xs flex items-center gap-1.5"
            onClick={() => {
              setEditingInvoice(null);
              setInvoiceModalOpen(true);
            }}
          >
            <Plus size={14} />
            Dönem Ekle
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="table-th w-10 text-center font-bold text-red-600 !text-sm">#</th>
                <th className="table-th text-left font-bold text-red-600 !text-sm">Dönem (Ay/Yıl)</th>
                <th className="table-th text-left font-bold text-red-600 !text-sm">Fatura No</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Fatura Tarihi</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Son Ödeme Tarihi</th>
                <th className="table-th text-right font-bold text-red-600 !text-sm">Fatura Tutarı</th>
                <th className="table-th text-right font-bold text-red-600 !text-sm">Ödenen Tutar</th>
                <th className="table-th text-center font-bold text-red-600 !text-sm">Durum & İşlem</th>
                <th className="table-th text-left font-bold text-red-600 !text-sm">Ödeme Kanalı</th>
                <th className="table-th w-20 text-center font-bold text-red-600 !text-sm">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <p className="font-semibold text-gray-600">Henüz geçmiş fatura kaydı bulunmuyor.</p>
                    <p className="text-xs text-gray-400 mt-1">"Yeni Dönem Faturası Ekle" butonuna tıklayarak ilk faturayı girebilirsiniz.</p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv, idx) => {
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="table-td text-center text-gray-400 font-medium text-xs">
                        {idx + 1}
                      </td>

                      {/* Period */}
                      <td className="table-td font-bold text-gray-900 text-sm">
                        {inv.period}
                      </td>

                      {/* Invoice No */}
                      <td className="table-td font-mono text-xs text-gray-600">
                        {inv.invoiceNo || '—'}
                      </td>

                      {/* Invoice Date */}
                      <td className="table-td text-center text-xs text-gray-600">
                        {formatDateTR(inv.invoiceDate)}
                      </td>

                      {/* Due Date */}
                      <td className="table-td text-center">
                        <BillDueDateCell
                          dueDate={inv.dueDate}
                          billStatus={inv.status === 'odendi' ? 'odendi' : 'odenecek'}
                          lastPaidAt={inv.paidAt}
                        />
                      </td>

                      {/* Amount */}
                      <td className="table-td text-right font-bold text-gray-900 text-base" style={{ fontFamily: 'Calibri, sans-serif' }}>
                        {formatTRY(inv.amount)}
                      </td>

                      {/* Paid Amount */}
                      <td className="table-td text-right font-bold text-emerald-700 text-base" style={{ fontFamily: 'Calibri, sans-serif' }}>
                        {formatTRY(inv.paidAmount)}
                      </td>

                      {/* Status Toggle Button */}
                      <td className="table-td text-center">
                        <button
                          onClick={() => toggleInvoiceStatus(inv.id)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                            inv.status === 'odendi'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                          }`}
                          title="Ödendi / Ödenecek durumunu değiştir"
                        >
                          {inv.status === 'odendi' ? 'Ödendi' : 'Ödenecek'}
                        </button>
                      </td>

                      {/* Payment Method / Date */}
                      <td className="table-td text-xs text-gray-600">
                        {inv.status === 'odendi' ? (
                          <div>
                            <span className="font-semibold text-gray-800 block">{inv.paymentMethod || 'Ödeme Yapıldı'}</span>
                            {inv.paidAt && <span className="text-[11px] text-gray-400">{formatDateTR(inv.paidAt)}</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="table-td text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingInvoice(inv);
                              setInvoiceModalOpen(true);
                            }}
                            className="p-1 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded transition-colors"
                            title="Düzenle"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`${inv.period} dönemi faturasını silmek istediğinize emin misiniz?`)) {
                                deleteInvoice(inv.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* Bill Modal */}
      <BillModal
        open={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        onSubmit={handleSaveBill}
        bill={bill}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        open={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
        onSubmit={handleSaveInvoice}
        billId={bill.id}
        billName={bill.name}
        invoice={editingInvoice}
      />
    </div>
  );
}
