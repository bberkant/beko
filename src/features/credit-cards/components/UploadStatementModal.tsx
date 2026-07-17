import { useState } from 'react';
import { FileText, Loader2, CheckCircle2, X } from 'lucide-react';
import type { CreditCard as CreditCardType } from '../types';

export interface UploadProgress {
  percent: number;
  status: string;
}

interface UploadStatementModalBodyProps {
  card: CreditCardType;
  progress: UploadProgress | null;
  onSubmit: (data: { period: string; statementDate: string; dueDate: string; totalDebt: number; minPayment: number; note: string }) => void;
}

export function UploadStatementModalBody({ card, progress, onSubmit }: UploadStatementModalBodyProps) {
  const [period, setPeriod] = useState('Temmuz 2026');
  const [statementDate, setStatementDate] = useState('2026-07-15');
  const [dueDate, setDueDate] = useState('2026-08-05');
  const [totalDebt, setTotalDebt] = useState(String(card.currentDebt));
  const [minPayment, setMinPayment] = useState('');
  const [note, setNote] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (progress) {
    return (
      <div className="py-4">
        <div className="flex items-center gap-3">
          {progress.percent >= 100 ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : (
            <Loader2 size={20} className="animate-spin text-brand-600" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {progress.percent >= 100 ? 'Yükleme tamamlandı' : 'Dosya yükleniyor...'}
            </p>
            <p className="text-xs text-gray-500">{progress.status}</p>
          </div>
          <span className="text-sm font-semibold text-gray-700">%{progress.percent}</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Ekstre analiz için sıraya alındı. AI Analiz Durumu: <span className="font-medium text-gray-600">Analiz Bekliyor</span>
        </p>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!fileName) {
      setError('Lütfen bir PDF ekstresi seçin.');
      return;
    }
    if (!period || !statementDate || !dueDate || Number(totalDebt) < 0 || Number(minPayment) < 0) {
      setError('Lütfen ekstre bilgilerini eksiksiz ve geçerli girin.');
      return;
    }
    setError('');
    onSubmit({
      period,
      statementDate,
      dueDate,
      totalDebt: Number(totalDebt) || 0,
      minPayment: Number(minPayment) || 0,
      note,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Kart</label>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[10px] font-semibold text-gray-600">
            {card.bankShort}
          </span>
          <span className="text-sm font-medium text-gray-900">
            {card.bank} {card.cardName} •••• {card.last4}
          </span>
          <span className="ml-auto text-xs text-gray-400">otomatik dolu</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Ekstre Dönemi</label>
          <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option>Temmuz 2026</option>
            <option>Haziran 2026</option>
            <option>Mayıs 2026</option>
            <option>Nisan 2026</option>
          </select>
        </div>
        <div>
          <label className="label">Ekstre Tarihi</label>
          <input type="date" className="input" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Son Ödeme Tarihi</label>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Toplam Borç (₺)</label>
          <input type="number" className="input" value={totalDebt} onChange={(e) => setTotalDebt(e.target.value)} />
        </div>
        <div>
          <label className="label">Asgari Ödeme (₺)</label>
          <input type="number" className="input" value={minPayment} onChange={(e) => setMinPayment(e.target.value)} placeholder="0" />
        </div>
      </div>

      <div>
        <label className="label">PDF Dosyası</label>
        {fileName ? (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
            <FileText size={18} className="text-brand-600" />
            <span className="flex-1 truncate text-sm text-gray-700">{fileName}</span>
            <button onClick={() => setFileName(null)} className="rounded-md p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center hover:border-brand-400 hover:bg-brand-50/30">
            <FileText size={28} className="text-gray-400" />
            <p className="text-sm text-gray-600">PDF dosyasını sürükleyin veya tıklayın</p>
            <p className="text-xs text-gray-400">Maksimum 10 MB · PDF</p>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
                  setError('Yalnızca PDF dosyası yükleyebilirsiniz.');
                  return;
                }
                if (f.size > 10 * 1024 * 1024) {
                  setError('PDF dosyası 10 MB’dan küçük olmalıdır.');
                  return;
                }
                setError('');
                setFileName(f.name);
              }}
            />
          </label>
        )}
      </div>

      <div>
        <label className="label">Not</label>
        <textarea className="input min-h-[72px] resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ekstreyle ilgili not (opsiyonel)" />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <button
        className="btn-primary w-full"
        onClick={handleSubmit}
      >
        <FileText size={16} /> Yükle ve analiz için sıraya al
      </button>
    </div>
  );
}
