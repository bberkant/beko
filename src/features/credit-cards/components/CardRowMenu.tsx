import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Pencil, Upload, CreditCard, Pause } from 'lucide-react';
import { useToast } from '../../../lib/toast';
import { useStore } from '../data/store';
import type { CreditCard as CreditCardType } from '../types';

interface CardRowMenuProps {
  card: CreditCardType;
  onUploadStatement: () => void;
  onAddPayment: () => void;
}

export function CardRowMenu({ card, onUploadStatement, onAddPayment }: CardRowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notify } = useToast();
  const { updateCard } = useStore();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const itemCls = 'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="İşlemler"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-card">
          <button className={itemCls} onClick={() => { setOpen(false); navigate(`/finance/credit-cards/${card.id}`); }}>
            <Eye size={15} className="text-gray-400" /> Görüntüle
          </button>
          <button className={itemCls} onClick={() => { setOpen(false); navigate(`/finance/credit-cards/${card.id}/edit`); }}>
            <Pencil size={15} className="text-gray-400" /> Düzenle
          </button>
          <button className={itemCls} onClick={() => { setOpen(false); onUploadStatement(); }}>
            <Upload size={15} className="text-gray-400" /> PDF Yükle
          </button>
          <button className={itemCls} onClick={() => { setOpen(false); onAddPayment(); }}>
            <CreditCard size={15} className="text-gray-400" /> Ödeme Kaydı Ekle
          </button>
          <button
            className={`${itemCls} text-amber-600 hover:bg-amber-50`}
            onClick={() => {
              setOpen(false);
              updateCard(card.id, {
                bank: card.bank, cardName: card.cardName, cardType: card.cardType,
                last4: card.last4, holder: card.holder, department: card.department,
                limit: card.limit, currency: card.currency, statementDay: card.statementDay,
                dueDay: card.dueDay, minPaymentRate: card.minPaymentRate, startDate: card.startDate,
                expiryMonth: card.expiryMonth, expiryYear: card.expiryYear,
                status: 'pasif', description: card.description,
              });
              notify(`${card.cardName} •••• ${card.last4} pasife alındı.`, 'info');
            }}
          >
            <Pause size={15} /> Pasife Al
          </button>
        </div>
      )}
    </div>
  );
}
