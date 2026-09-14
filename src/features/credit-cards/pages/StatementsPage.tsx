import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Search, Trash2, Eye } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../lib/toast';
import { useStore } from '../data/store';
import type { CreditCard as CreditCardType } from '../types';
import * as XLSX from 'xlsx';
import { UploadStatementModalBody, type UploadProgress } from '../components/UploadStatementModal';
import {
  formatTRY, formatDate,
  aiStatusLabel, aiStatusCls,
  paymentStatusLabel, paymentStatusCls,
} from '../data/labels';

export function StatementsPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { statements, cards, deleteStatement, addStatement, loading, refresh } = useStore();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [uploadCard, setUploadCard] = useState<CreditCardType | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const pickerFilteredCards = useMemo(() => {
    if (!pickerSearch) return cards;
    const q = pickerSearch.toLowerCase();
    return cards.filter(card => 
      card.bank.toLowerCase().includes(q) ||
      card.cardName.toLowerCase().includes(q) ||
      card.last4.includes(q) ||
      (card.holder || '').toLowerCase().includes(q)
    );
  }, [cards, pickerSearch]);

  const handleUploadSubmit = (data: { period: string; statementDate: string; dueDate: string; totalDebt: number; minPayment: number; note: string }) => {
    if (!uploadCard) return;
    setProgress({ percent: 25, status: 'Yükleniyor' });
    window.setTimeout(() => setProgress({ percent: 70, status: 'Ekstre işleniyor' }), 250);
    window.setTimeout(() => {
      addStatement({ cardId: uploadCard.id, ...data });
      setProgress({ percent: 100, status: 'Analiz Bekliyor' });
      notify(`${uploadCard.cardName} •••• ${uploadCard.last4} için ${data.period} ekstresi eklendi.`, 'success');
      window.setTimeout(() => { setUploadCard(null); setProgress(null); }, 700);
    }, 600);
  };

  const cardMap = useMemo(() => {
    const m = new Map<string, string>();
    cards.forEach((c) => m.set(c.id, `${c.bank} ${c.cardName} •••• ${c.last4}`));
    return m;
  }, [cards]);

  const filtered = useMemo(() => {
    if (!search) return statements;
    const q = search.toLowerCase();
    return statements.filter((s) => {
      const cardLabel = cardMap.get(s.cardId) ?? '';
      return s.period.toLowerCase().includes(q) || cardLabel.toLowerCase().includes(q);
    });
  }, [statements, search, cardMap]);

  const exportStatementsToExcel = () => {
    if (!filtered.length) { notify('Dışa aktarılacak kayıt bulunamadı.', 'error'); return; }
    try {
      const data = filtered.map(s => {
        const cardName = cardMap.get(s.cardId) || 'Bilinmeyen Kart';
        return {
          'Kart': cardName,
          'Dönem': s.period,
          'Toplam Borç': s.totalDebt,
          'Asgari Ödeme': s.minPayment,
          'Son Ödeme Tarihi': formatDate(s.dueDate),
          'Yükleme Tarihi': formatDate(s.statementDate),
          'Durum': s.aiStatus
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ekstreler");
      XLSX.writeFile(workbook, `Ekstreler-${new Date().toISOString().slice(0,10)}.xlsx`);
      notify('Excel başarıyla indirildi.', 'success');
    } catch (err) {
      notify('Excel dışa aktarma başarısız oldu.', 'error');
    }
  };

  const exportStatementsToPdf = () => {
    if (!filtered.length) { notify('Dışa aktarılacak kayıt bulunamadı.', 'error'); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify('Açılır pencere engelleyiciyi devre dışı bırakın.', 'error');
      return;
    }
    const html = `
      <html>
        <head>
          <title>Ekstreler Listesi</title>
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
          <h1>Ekstreler Listesi</h1>
          <table>
            <thead>
              <tr>
                <th>Kart</th>
                <th>Dönem</th>
                <th>Toplam Borç</th>
                <th>Asgari Ödeme</th>
                <th>Son Ödeme Tarihi</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(s => {
                const cardName = cardMap.get(s.cardId) || 'Bilinmeyen Kart';
                return `
                  <tr>
                    <td>${cardName}</td>
                    <td>${s.period}</td>
                    <td>${formatTRY(s.totalDebt)}</td>
                    <td>${formatTRY(s.minPayment)}</td>
                    <td>${formatDate(s.dueDate)}</td>
                    <td>${s.aiStatus}</td>
                  </tr>
                `;
              }).join('')}
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

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteStatement(deleteTarget);
    notify('Ekstre silindi.', 'info');
    setDeleteTarget(null);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Ekstreler"
        description="Tüm kredi kartı ekstrelerini görüntüleyin ve yönetin."
        actions={
          <>
            <button className="btn-secondary" onClick={() => setCardPickerOpen(true)}>
              <Upload size={16} /> Ekstre Yükle
            </button>
            <button className="btn-secondary" onClick={exportStatementsToExcel}>
              <Download size={16} /> Excel Dışa Aktar
            </button>
            <button className="btn-secondary" onClick={exportStatementsToPdf}>
              <Download size={16} /> PDF Dışa Aktar
            </button>
          </>
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Dönem veya kart ara..."
          className="input pl-9" />
      </div>

      <div className="hidden lg:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/60">
              <tr>
                <th className="table-th">Kart</th>
                <th className="table-th">Dönem</th>
                <th className="table-th">Ekstre Tarihi</th>
                <th className="table-th">Son Ödeme</th>
                <th className="table-th">Toplam Borç</th>
                <th className="table-th">Asgari Ödeme</th>
                <th className="table-th">İşlem</th>
                <th className="table-th">AI Analiz</th>
                <th className="table-th">Ödeme</th>
                <th className="table-th text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && statements.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="table-td"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                    <td className="table-td"><div className="h-4 w-16 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
                    <td className="table-td"><div className="h-4 w-20 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-4 w-10 bg-gray-100 rounded" /></td>
                    <td className="table-td"><div className="h-5 w-16 bg-gray-100 rounded-full" /></td>
                    <td className="table-td"><div className="h-5 w-16 bg-gray-100 rounded-full" /></td>
                    <td className="table-td text-right"><div className="h-6 w-12 bg-gray-100 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : (
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="table-td font-medium text-gray-900">{cardMap.get(s.cardId) ?? '-'}</td>
                    <td className="table-td text-gray-600">{s.period}</td>
                    <td className="table-td text-gray-600">{formatDate(s.statementDate)}</td>
                    <td className="table-td text-gray-600">{formatDate(s.dueDate)}</td>
                    <td className="table-td font-medium text-gray-900">{formatTRY(s.totalDebt)}</td>
                    <td className="table-td text-gray-600">{formatTRY(s.minPayment)}</td>
                    <td className="table-td text-gray-600">{s.transactionCount}</td>
                    <td className="table-td"><Badge className={aiStatusCls[s.aiStatus]}>{aiStatusLabel[s.aiStatus]}</Badge></td>
                    <td className="table-td"><Badge className={paymentStatusCls[s.paymentStatus]}>{paymentStatusLabel[s.paymentStatus]}</Badge></td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" onClick={() => {
                          const card = cards.find((c) => c.id === s.cardId);
                          if (card) navigate(`/finans/kredi-kartlari/${card.id}/ekstreler/${s.id}`);
                        }}>
                          <Eye size={16} />
                        </button>
                        <button className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleteTarget(s.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Ekstre bulunamadı.</div>}
      </div>

      <div className="space-y-3 lg:hidden">
        {loading && statements.length === 0 ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="card p-4 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-36 bg-gray-200 rounded" />
                <div className="h-5 w-16 bg-gray-100 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-8 bg-gray-100 rounded" />
                <div className="h-8 bg-gray-100 rounded" />
              </div>
            </div>
          ))
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{cardMap.get(s.cardId) ?? '-'}</p>
                  <p className="text-xs text-gray-500">{s.period} · {formatDate(s.statementDate)}</p>
                </div>
                <Badge className={paymentStatusCls[s.paymentStatus]}>{paymentStatusLabel[s.paymentStatus]}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-gray-400">Toplam Borç</p>
                  <p className="font-medium text-gray-700">{formatTRY(s.totalDebt)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Asgari Ödeme</p>
                  <p className="font-medium text-gray-700">{formatTRY(s.minPayment)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Son Ödeme</p>
                  <p className="font-medium text-gray-700">{formatDate(s.dueDate)}</p>
                </div>
                <div>
                  <p className="text-gray-400">AI Analiz</p>
                  <Badge className={aiStatusCls[s.aiStatus]}>{aiStatusLabel[s.aiStatus]}</Badge>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => {
                  const card = cards.find((c) => c.id === s.cardId);
                  if (card) navigate(`/finans/kredi-kartlari/${card.id}/ekstreler/${s.id}`);
                }}>
                  <Eye size={14} /> Görüntüle
                </button>
                <button className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDeleteTarget(s.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
        {!loading && filtered.length === 0 && <div className="py-12 text-center text-sm text-gray-400">Ekstre bulunamadı.</div>}
      </div>

      <Modal
        open={cardPickerOpen}
        onClose={() => { setCardPickerOpen(false); setPickerSearch(''); }}
        title="Ekstre Yüklenecek Kartı Seçin"
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
              <button key={card.id} className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-brand-300 hover:bg-brand-50/40"
                onClick={() => { setCardPickerOpen(false); setUploadCard(card); setProgress(null); setPickerSearch(''); }}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-600">{card.bankShort}</span>
                <span>
                  <span className="block text-sm font-medium text-gray-900">{card.bank} {card.cardName}</span>
                  <span className="block text-xs text-gray-500">•••• {card.last4} · {card.holder}</span>
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

      <Modal open={Boolean(uploadCard)} onClose={() => { setUploadCard(null); setProgress(null); }} title="Ekstre Yükle"
        description={uploadCard ? `${uploadCard.bank} ${uploadCard.cardName} •••• ${uploadCard.last4}` : ''} size="md">
        {uploadCard && <UploadStatementModalBody card={uploadCard} progress={progress} onSubmit={handleUploadSubmit} />}
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Ekstreyi Sil"
        size="sm"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleteTarget(null)}>İptal</button>
            <button className="btn-primary !bg-red-600 hover:!bg-red-700" onClick={handleDelete}>Sil</button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Bu ekstreyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
      </Modal>
    </div>
  );
}
