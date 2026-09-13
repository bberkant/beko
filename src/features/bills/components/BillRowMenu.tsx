import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const navigate = useNavigate();

  const calcPosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const menuWidth = 208;
    const menuHeight = 210;

    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
    const shouldOpenUp = rect.bottom + menuHeight > window.innerHeight - 12;
    const top = shouldOpenUp ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;

    return { top, left };
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) {
      const pos = calcPosition();
      if (pos) {
        setPosition(pos);
      }
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const pos = calcPosition();
      if (pos) setPosition(pos);
    };

    update();

    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', onClick);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, calcPosition]);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        onClick={handleToggle}
        title="İşlemler"
        aria-label="İşlemler"
      >
        <MoreVertical size={16} />
      </button>

      {open && position &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100] w-52 rounded-xl border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5"
            style={{ top: position.top, left: position.left }}
          >
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
              onClick={() => {
                setOpen(false);
                navigate(`/finans/faturalar/${bill.id}`);
              }}
            >
              <ExternalLink size={14} />
              Cari Detayını Aç
            </button>

            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
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
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
              onClick={() => {
                setOpen(false);
                onAddInvoice();
              }}
            >
              <Plus size={14} className="text-blue-500" />
              Yeni Dönem Faturası Ekle
            </button>

            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
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
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
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
          </div>,
          document.body
        )}
    </div>
  );
}
