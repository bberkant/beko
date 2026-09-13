import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, ExternalLink, CheckCircle2, RotateCcw, Plus, Pencil, Trash2 } from 'lucide-react';
import type { CompanyBill } from '../types';

interface BillRowMenuProps {
  bill: CompanyBill;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onAddInvoice: () => void;
}

export function BillRowMenu({
  bill,
  onEdit,
  onDelete,
  onToggleStatus,
  onAddInvoice,
}: BillRowMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        onClick={() => setOpen(!open)}
        title="İşlemler"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
              onClick={() => {
                setOpen(false);
                navigate(`/finans/faturalar/${bill.id}`);
              }}
            >
              <ExternalLink size={14} />
              Cari Detayını Aç
            </button>

            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setOpen(false);
                onToggleStatus();
              }}
            >
              {bill.billStatus === 'odendi' ? (
                <>
                  <RotateCcw size={14} className="text-amber-500" />
                  Ödenecek Yap
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  Ödendi Olarak İşaretle
                </>
              )}
            </button>

            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setOpen(false);
                onAddInvoice();
              }}
            >
              <Plus size={14} className="text-blue-500" />
              Yeni Dönem Faturası Ekle
            </button>

            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              <Pencil size={14} className="text-gray-500" />
              Düzenle
            </button>

            <hr className="my-1 border-gray-100" />

            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              onClick={() => {
                setOpen(false);
                if (window.confirm(`"${bill.name}" faturasını silmek istediğinize emin misiniz?`)) {
                  onDelete();
                }
              }}
            >
              <Trash2 size={14} />
              Sil
            </button>
          </div>
        </>
      )}
    </div>
  );
}
