import { useState } from 'react';
import { FileText, X } from 'lucide-react';
import type { Payment } from '../types';

interface PaymentModalBodyProps {
  initialAmount?: number;
  onSubmit: (data: { date: string; amount: number; type: Payment['type']; bankAccount: string; description: string }) => void;
}

export function PaymentModalBody({ initialAmount, onSubmit }: PaymentModalBodyProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [amount, setAmount] = useState(initialAmount && initialAmount > 0 ? String(initialAmount) : '');
  const [type, setType] = useState<Payment['type']>('tam-odeme');
  const [bankAccount, setBankAccount] = useState('Garanti TL - 3214');
  const [description, setDescription] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleSubmit = () => {
    onSubmit({ date, amount: Number(amount) || 0, type, bankAccount, description });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Ödeme Tarihi</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Ödenen Tutar (₺)</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div>
        <label className="label">Ödeme Yapılan Banka Hesabı</label>
        <select className="input" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
          <option>Garanti TL - 3214</option>
          <option>İş Bankası TL - 9982</option>
          <option>Akbank TL - 5521</option>
          <option>Yapı Kredi TL - 8821</option>
        </select>
      </div>
      <div>
        <label className="label">Ödeme Tipi</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value as Payment['type'])}>
          <option value="tam-odeme">Tam Ödeme</option>
          <option value="asgari-odeme">Asgari Ödeme</option>
          <option value="kismi-odeme">Kısmi Ödeme</option>
          <option value="duzeltme">Düzeltme</option>
        </select>
      </div>
      <div>
        <label className="label">Açıklama</label>
        <textarea className="input min-h-[64px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Açıklama (opsiyonel)" />
      </div>
      <div>
        <label className="label">Makbuz Yükleme</label>
        {fileName ? (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
            <FileText size={18} className="text-brand-600" />
            <span className="flex-1 truncate text-sm text-gray-700">{fileName}</span>
            <button onClick={() => setFileName(null)} className="rounded-md p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:border-brand-400 hover:bg-brand-50/30">
            <FileText size={22} className="text-gray-400" />
            <p className="text-xs text-gray-500">Makbuz PDF veya görsel yükleyin</p>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFileName(f.name); }} />
          </label>
        )}
      </div>
      <button className="btn-primary w-full" onClick={handleSubmit}>
        Ödemeyi Kaydet
      </button>
    </div>
  );
}
