import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Pencil, Upload, CreditCard, Pause, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const navigate = useNavigate();
  const { notify } = useToast();
  const { updateCard, deleteCard, addPayment, revertCardPayment } = useStore();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 208;
      const menuHeight = 310;
      setPosition({
        left: Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth)),
        top: rect.bottom + menuHeight > window.innerHeight - 8 ? rect.top - menuHeight - 4 : rect.bottom + 4,
      });
    };
    place();
    window.addEventListener('mousedown', onClick);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  const itemCls = 'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50';

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="İşlemler"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && createPortal(
        <div ref={menuRef} className="fixed z-[100] w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-card" style={{top:position.top,left:position.left}}>
          <button className={itemCls} onClick={() => { setOpen(false); navigate(`/finans/kredi-kartlari/${card.id}`); }}>
            <Eye size={15} className="text-gray-400" /> Görüntüle
          </button>
          <button className={itemCls} onClick={() => { setOpen(false); navigate(`/finans/kredi-kartlari/${card.id}/duzenle`); }}>
            <Pencil size={15} className="text-gray-400" /> Düzenle
          </button>
          <button className={itemCls} onClick={() => { setOpen(false); onUploadStatement(); }}>
            <Upload size={15} className="text-gray-400" /> Ekstre Yükle
          </button>
          <button className={itemCls} onClick={() => { setOpen(false); onAddPayment(); }}>
            <CreditCard size={15} className="text-gray-400" /> Ödeme Kaydı Ekle
          </button>
          <button
            className={`${itemCls} text-emerald-700 hover:bg-emerald-50 font-medium`}
            onClick={async () => {
              setOpen(false);
              const currentDebt = Number(card.currentDebt) || 0;
              if (currentDebt <= 0) {
                notify(`${card.bank} •••• ${card.last4} kartının zaten ödenecek borcu bulunmuyor (0 ₺).`, 'info');
                return;
              }
              try {
                await addPayment({
                  cardId: card.id,
                  date: new Date().toISOString().slice(0, 10),
                  amount: currentDebt,
                  type: 'tam-odeme',
                  bankAccount: `${card.bank} Hesabı`,
                  description: 'Ödendi: Otomatik tüm borç kapatıldı',
                });
                notify(`✅ ${card.bank} •••• ${card.last4} için ₺${currentDebt.toLocaleString('tr-TR')} tam ödeme girildi ve borç kapatıldı.`, 'success');
              } catch (e: any) {
                notify(`Ödeme kaydedilemedi: ${e.message}`, 'error');
              }
            }}
          >
            <CheckCircle2 size={15} className="text-emerald-600" /> Ödendi
          </button>
          <button
            className={`${itemCls} text-amber-700 hover:bg-amber-50 font-medium`}
            onClick={async () => {
              setOpen(false);
              try {
                const restoredAmount = await revertCardPayment(card.id);
                notify(`↩️ ${card.bank} •••• ${card.last4} ödemesi kaldırıldı, ₺${restoredAmount.toLocaleString('tr-TR')} borç geri yüklendi.`, 'info');
              } catch (e: any) {
                notify(`Ödeme kaldırılamadı: ${e.message}`, 'error');
              }
            }}
          >
            <RotateCcw size={15} className="text-amber-600" /> Ödemeyi Kaldır
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
          <div className="my-1 border-t border-gray-100" />
          <button
            className={`${itemCls} text-red-600 hover:bg-red-50`}
            onClick={async () => {
              setOpen(false);
              const confirmed = window.confirm(
                `${card.bank} ${card.cardName} •••• ${card.last4} kartını kalıcı olarak silmek istediğinize emin misiniz?\n\nKarta bağlı ekstre, hareket ve ödeme kayıtları da silinecek.`,
              );
              if (!confirmed) return;
              try {
                await deleteCard(card.id);
                notify('Kart ve bağlı kayıtları silindi.', 'success');
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Kart silinemedi.';
                notify(`Kart silinemedi: ${message}`, 'error');
              }
            }}
          >
            <Trash2 size={15} /> Kartı Sil
          </button>
        </div>, document.body
      )}
    </div>
  );
}
