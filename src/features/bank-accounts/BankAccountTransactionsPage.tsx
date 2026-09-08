import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Upload,
  FileSpreadsheet,
  FileText,
  Trash2,
  Filter,
  DollarSign,
  Layers,
  Sparkles,
  PieChart as PieIcon,
  Download,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../lib/toast';
import { useBankAccounts } from './store';
import type { BankTransactionInput } from './types';
import * as XLSX from 'xlsx';

const categories = [
  { id: 'transfer', label: 'EFT / Havale' },
  { id: 'payment', label: 'Fatura / Ödeme' },
  { id: 'salary', label: 'Maaş Ödemesi' },
  { id: 'tax', label: 'Vergi / SGK' },
  { id: 'credit_card', label: 'Kredi Kartı Borcu' },
  { id: 'pos', label: 'POS Tahsilatı' },
  { id: 'interest', label: 'Faiz Geliri / Gideri' },
  { id: 'diger', label: 'Diğer' }
];

const categoryLabels: Record<string, string> = {
  transfer: 'EFT / Havale',
  payment: 'Fatura / Ödeme',
  salary: 'Maaş Ödemesi',
  tax: 'Vergi / SGK',
  credit_card: 'Kredi Kartı Borcu',
  pos: 'POS Tahsilatı',
  interest: 'Faiz Geliri / Gideri',
  diger: 'Diğer'
};

const categoryColors: Record<string, string> = {
  transfer: 'bg-blue-50 text-blue-700 border-blue-100',
  payment: 'bg-amber-50 text-amber-700 border-amber-100',
  salary: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  tax: 'bg-red-50 text-red-700 border-red-100',
  credit_card: 'bg-purple-50 text-purple-700 border-purple-100',
  pos: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  interest: 'bg-orange-50 text-orange-700 border-orange-100',
  diger: 'bg-gray-50 text-gray-700 border-gray-100'
};

const formatTRY = (n: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2
  }).format(n);

export function BankAccountTransactionsPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { accounts, transactions, addTransactions } = useBankAccounts();

  // Filter States
  const [q, setQ] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'giris' | 'cikis'>('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Upload Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadAccountId, setUploadAccountId] = useState('');
  const [uploadMode, setUploadMode] = useState<'excel' | 'paste'>('excel');
  const [pastedText, setPastedText] = useState('');
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Add Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualTx, setManualTx] = useState({
    accountId: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'giris' as 'giris' | 'cikis',
    category: 'diger',
    amount: '',
    counterparty: '',
    description: ''
  });

  // Reset import
  const resetUploadState = () => {
    setUploadAccountId('');
    setPastedText('');
    setParsedItems([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Excel statement parser
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadAccountId) {
      notify('Lütfen önce işlem yapılacak banka hesabını seçin.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Dosya okunamadı.');

        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (rows.length < 2) {
          throw new Error('Dosyada yeterli veri satırı bulunamadı.');
        }

        // Find header row by scanning first 15 rows
        let headerIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const r = rows[i];
          if (r && r.some(cell => typeof cell === 'string' && (
            cell.toUpperCase().includes('TARİH') ||
            cell.toUpperCase().includes('TUTAR') ||
            cell.toUpperCase().includes('AÇIKLAMA')
          ))) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx === -1) headerIdx = 0;

        const headers = rows[headerIdx].map(h => String(h || '').trim().toUpperCase());
        const colMap = {
          tarih: headers.findIndex(h => h.includes('TARİH') || h.includes('DATE') || h.includes('GÜN')),
          aciklama: headers.findIndex(h => h.includes('AÇIKLAMA') || h.includes('DESCRIPTION') || h.includes('TANIM') || h.includes('NOT')),
          tutar: headers.findIndex(h => h.includes('TUTAR') || h.includes('AMOUNT') || h.includes('MİKTAR') || h.includes('BAKİYE') === false && (h.includes('İŞLEM') || h.includes('HACİM'))),
          borc: headers.findIndex(h => h.includes('BORÇ') || h.includes('DEBIT') || h.includes('ÇIKIŞ') || h.includes('ÖDENEN')),
          alacak: headers.findIndex(h => h.includes('ALACAK') || h.includes('CREDIT') || h.includes('GİRİŞ') || h.includes('ALINAN')),
          karsi_taraf: headers.findIndex(h => h.includes('ALICI') || h.includes('GÖNDERİCİ') || h.includes('KARŞI') || h.includes('ÜNVAN') || h.includes('ADI')),
          kategori: headers.findIndex(h => h.includes('KATEGORİ') || h.includes('TÜR') || h.includes('SÜTUN'))
        };

        if (colMap.tarih === -1) {
          throw new Error('Ekstrede "Tarih" sütunu tespit edilemedi.');
        }

        const items: any[] = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0 || r[colMap.tarih] === undefined) continue;

          // Parse date
          let dateStr = '';
          const dateVal = r[colMap.tarih];
          if (dateVal) {
            if (typeof dateVal === 'number') {
              const dateObj = new Date((dateVal - 25569) * 86400 * 1000);
              dateStr = dateObj.toISOString().slice(0, 10);
            } else {
              const str = String(dateVal).trim();
              const matches = str.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
              if (matches) {
                dateStr = `${matches[3]}-${matches[2].padStart(2, '0')}-${matches[1].padStart(2, '0')}`;
              } else {
                try {
                  const dObj = new Date(str);
                  if (!isNaN(dObj.getTime())) {
                    dateStr = dObj.toISOString().slice(0, 10);
                  }
                } catch {
                  continue;
                }
              }
            }
          }

          if (!dateStr || dateStr.includes('NaN')) continue;

          // Parse amount & type
          let amount = 0;
          let type: 'giris' | 'cikis' = 'giris';

          if (colMap.tutar !== -1 && r[colMap.tutar] !== undefined) {
            const rawVal = String(r[colMap.tutar]).replace(/\./g, '').replace(/,/g, '.');
            const val = parseFloat(rawVal) || 0;
            amount = Math.abs(val);
            type = val >= 0 ? 'giris' : 'cikis';
          } else if (colMap.borc !== -1 || colMap.alacak !== -1) {
            const rawBorc = colMap.borc !== -1 && r[colMap.borc] !== undefined ? String(r[colMap.borc]).replace(/\./g, '').replace(/,/g, '.') : '';
            const rawAlacak = colMap.alacak !== -1 && r[colMap.alacak] !== undefined ? String(r[colMap.alacak]).replace(/\./g, '').replace(/,/g, '.') : '';
            
            const borcVal = parseFloat(rawBorc) || 0;
            const alacakVal = parseFloat(rawAlacak) || 0;

            if (alacakVal > 0) {
              amount = alacakVal;
              type = 'giris';
            } else if (borcVal > 0) {
              amount = borcVal;
              type = 'cikis';
            } else {
              continue;
            }
          } else {
            continue;
          }

          const description = colMap.aciklama !== -1 && r[colMap.aciklama] ? String(r[colMap.aciklama]).trim() : 'Banka Hareketi';
          const counterparty = colMap.karsi_taraf !== -1 && r[colMap.karsi_taraf] ? String(r[colMap.karsi_taraf]).trim() : (description ? description.slice(0, 30) : 'Bilinmeyen');
          
          // Auto-categorize based on description text
          let category = 'diger';
          const descUpper = description.toUpperCase();
          if (descUpper.includes('MAAS') || descUpper.includes('MAAŞ')) category = 'salary';
          else if (descUpper.includes('EFT') || descUpper.includes('HAVALE') || descUpper.includes('FAST') || descUpper.includes('GÖNDEREN')) category = 'transfer';
          else if (descUpper.includes('FATURA') || descUpper.includes('TELEKOM') || descUpper.includes('SU ') || descUpper.includes('ELEKTRİK')) category = 'payment';
          else if (descUpper.includes('VERGİ') || descUpper.includes('SGK') || descUpper.includes('DEVLET') || descUpper.includes('MUHTASAR')) category = 'tax';
          else if (descUpper.includes('KART') || descUpper.includes('KK ') || descUpper.includes('EKSTRE')) category = 'credit_card';
          else if (descUpper.includes('POS') || descUpper.includes('BLOKE') || descUpper.includes('SLIP')) category = 'pos';
          else if (descUpper.includes('FAİZ') || descUpper.includes('KOMİSYON')) category = 'interest';

          items.push({
            date: dateStr,
            type,
            amount,
            counterparty,
            description,
            category
          });
        }

        setParsedItems(items);
        notify(`${items.length} adet hareket başarıyla okundu.`, 'success');
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Eşleştirme başarısız.', 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Text copy-paste statement parser
  const handleTextPasteParse = () => {
    if (!uploadAccountId) {
      notify('Lütfen önce işlem yapılacak banka hesabını seçin.', 'error');
      return;
    }

    if (!pastedText.trim()) {
      notify('Lütfen yapıştırılmış ekstre metni girin.', 'error');
      return;
    }

    try {
      const lines = pastedText.split('\n');
      const items: any[] = [];

      lines.forEach((line) => {
        const text = line.trim();
        if (!text) return;

        // Try to find a date like DD.MM.YYYY or DD/MM/YYYY
        const dateMatch = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
        if (!dateMatch) return;

        const dateStr = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;

        // Find monetary values (like 1.250,00 or 500.00 or -450,00)
        // Match numbers at the end or separated by spaces/tabs
        const moneyMatches = text.match(/(-?\d{1,3}(?:\.\d{3})*(?:,\d{2}))|(-?\d+(?:\.\d{2})?)/g);
        if (!moneyMatches) return;

        // Grab the largest or the last matching money number
        let parsedAmount = 0;
        let type: 'giris' | 'cikis' = 'giris';
        
        // Find a token that is likely the transaction amount
        for (let idx = moneyMatches.length - 1; idx >= 0; idx--) {
          const rawNum = moneyMatches[idx];
          // Skip date patterns matched as money
          if (rawNum.includes('.') && rawNum.includes('/') || rawNum.length < 3) continue;

          const cleanNum = rawNum.replace(/\./g, '').replace(/,/g, '.');
          const val = parseFloat(cleanNum);
          if (!isNaN(val) && val !== 0) {
            parsedAmount = Math.abs(val);
            type = val >= 0 ? 'giris' : 'cikis';
            break;
          }
        }

        if (parsedAmount === 0) return;

        // Description is the rest of the text excluding the date and amount
        let description = text.replace(dateMatch[0], '').trim();
        moneyMatches.forEach(m => {
          description = description.replace(m, '');
        });
        description = description.replace(/\s+/g, ' ').trim() || 'Banka Hareketi';

        // Auto-categorize
        let category = 'diger';
        const descUpper = description.toUpperCase();
        if (descUpper.includes('MAAS') || descUpper.includes('MAAŞ')) category = 'salary';
        else if (descUpper.includes('EFT') || descUpper.includes('HAVALE') || descUpper.includes('FAST') || descUpper.includes('GÖNDEREN')) category = 'transfer';
        else if (descUpper.includes('FATURA') || descUpper.includes('TELEKOM') || descUpper.includes('SU ') || descUpper.includes('ELEKTRİK')) category = 'payment';
        else if (descUpper.includes('VERGİ') || descUpper.includes('SGK') || descUpper.includes('DEVLET') || descUpper.includes('MUHTASAR')) category = 'tax';
        else if (descUpper.includes('KART') || descUpper.includes('KK ') || descUpper.includes('EKSTRE')) category = 'credit_card';
        else if (descUpper.includes('POS') || descUpper.includes('BLOKE') || descUpper.includes('SLIP')) category = 'pos';
        else if (descUpper.includes('FAİZ') || descUpper.includes('KOMİSYON')) category = 'interest';

        items.push({
          date: dateStr,
          type,
          amount: parsedAmount,
          counterparty: description.slice(0, 35) || 'Bilinmeyen',
          description,
          category
        });
      });

      setParsedItems(items);
      notify(`${items.length} adet satır başarıyla çözümlendi.`, 'success');
    } catch (err) {
      notify('Metin çözümlenirken hata oluştu.', 'error');
    }
  };

  // Bulk save parsed items
  const handleSaveImport = async () => {
    if (!uploadAccountId) return;
    if (parsedItems.length === 0) return;

    try {
      const inputs: BankTransactionInput[] = parsedItems.map(item => ({
        accountId: uploadAccountId,
        date: item.date,
        type: item.type,
        category: item.category,
        amount: item.amount,
        counterparty: item.counterparty,
        description: item.description
      }));

      await addTransactions(inputs);
      notify(`${inputs.length} adet işlem başarıyla içe aktarıldı. Banka bakiyeleri güncellendi.`, 'success');
      setUploadModalOpen(false);
      resetUploadState();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Kayıt sırasında hata oluştu.', 'error');
    }
  };

  // Manual save single transaction
  const handleSaveManual = async () => {
    if (!manualTx.accountId) {
      notify('Lütfen bir banka hesabı seçin.', 'error');
      return;
    }
    const val = parseFloat(manualTx.amount) || 0;
    if (val <= 0) {
      notify('Lütfen geçerli bir tutar girin.', 'error');
      return;
    }

    try {
      const input: BankTransactionInput = {
        accountId: manualTx.accountId,
        date: manualTx.date,
        type: manualTx.type,
        category: manualTx.category,
        amount: val,
        counterparty: manualTx.counterparty || 'Bilinmeyen',
        description: manualTx.description || 'Manuel Kayıt'
      };

      await addTransactions([input]);
      notify('İşlem başarıyla eklendi.', 'success');
      setManualModalOpen(false);
      setManualTx({
        accountId: '',
        date: new Date().toISOString().slice(0, 10),
        type: 'giris',
        category: 'diger',
        amount: '',
        counterparty: '',
        description: ''
      });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Kayıt yapılamadı.', 'error');
    }
  };

  // Filter & Search Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Text Search
      if (q.trim()) {
        const query = q.toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const party = (t.counterparty || '').toLowerCase();
        if (!desc.includes(query) && !party.includes(query)) return false;
      }

      // 2. Account
      if (selectedAccountId && t.accountId !== selectedAccountId) return false;

      // 3. Type
      if (selectedType !== 'all' && t.type !== selectedType) return false;

      // 4. Category
      if (selectedCategory && t.category !== selectedCategory) return false;

      // 5. Date Range
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;

      // 6. Amount Range
      if (minAmount && t.amount < parseFloat(minAmount)) return false;
      if (maxAmount && t.amount > parseFloat(maxAmount)) return false;

      return true;
    });
  }, [transactions, q, selectedAccountId, selectedType, selectedCategory, startDate, endDate, minAmount, maxAmount]);

  // Analytics Calculations
  const stats = useMemo(() => {
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === 'giris') {
        totalDeposits += t.amount;
      } else {
        totalWithdrawals += t.amount;
      }
    });

    return {
      count: filteredTransactions.length,
      deposits: totalDeposits,
      withdrawals: totalWithdrawals,
      net: totalDeposits - totalWithdrawals
    };
  }, [filteredTransactions]);

  // Custom Chart Data: Category Breakdown (SVG Progress Bars)
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    let totalVolume = 0;

    filteredTransactions.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
      totalVolume += t.amount;
    });

    return Object.entries(map)
      .map(([cat, amount]) => ({
        id: cat,
        label: categoryLabels[cat] || cat,
        amount,
        percent: totalVolume > 0 ? (amount / totalVolume) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  // Custom Chart Data: Monthly / Daily Cashflow (SVG Bar Charts)
  const dailyFlows = useMemo(() => {
    const dates = Array.from(new Set(filteredTransactions.map(t => t.date)))
      .sort()
      .slice(-7); // Last 7 active days

    const depositsMap: Record<string, number> = {};
    const withdrawalsMap: Record<string, number> = {};

    filteredTransactions.forEach(t => {
      if (t.type === 'giris') {
        depositsMap[t.date] = (depositsMap[t.date] || 0) + t.amount;
      } else {
        withdrawalsMap[t.date] = (withdrawalsMap[t.date] || 0) + t.amount;
      }
    });

    const maxVal = Math.max(
      ...dates.map(d => Math.max(depositsMap[d] || 0, withdrawalsMap[d] || 0)),
      1 // avoid dividing by zero
    );

    return dates.map(d => {
      const dep = depositsMap[d] || 0;
      const wit = withdrawalsMap[d] || 0;
      return {
        date: new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        deposit: dep,
        withdrawal: wit,
        depPercent: (dep / maxVal) * 80, // max height 80%
        witPercent: (wit / maxVal) * 80
      };
    });
  }, [filteredTransactions]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredTransactions.map((t, idx) => {
      const acc = accounts.find(a => a.id === t.accountId);
      return {
        '#': idx + 1,
        'Banka Hesabı': acc ? `${acc.bank} (${acc.accountName})` : 'Bilinmeyen',
        'Tarih': t.date,
        'İşlem Tipi': t.type === 'giris' ? 'Giriş (Gelir)' : 'Çıkış (Gider)',
        'Karşı Taraf': t.counterparty,
        'Açıklama': t.description,
        'Kategori': categoryLabels[t.category] || t.category,
        'Tutar': t.amount
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Banka Hareketleri');
    XLSX.writeFile(workbook, 'Banka_Hesap_Hareketleri.xlsx');
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Banka Hesap Hareketleri"
        description="Şirket banka hesaplarınızın tüm hareketlerini yükleyin, filtreleyin ve grafiklerle analiz edin."
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={() => navigate('/finans/banka-hesaplari')}>
              <Building2 size={16} />
              Banka Hesapları
            </button>
            <button className="btn-primary" onClick={() => setUploadModalOpen(true)}>
              <Upload size={16} />
              Ekstre Yükle (Excel/PDF)
            </button>
            <button className="btn-primary bg-indigo-600 hover:bg-indigo-700" onClick={() => setManualModalOpen(true)}>
              <Plus size={16} />
              İşlem Ekle
            </button>
          </div>
        }
      />

      {/* Analytics Summary Widgets */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Toplam İşlem</span>
            <div className="p-2 rounded bg-indigo-50 text-indigo-600">
              <Layers size={18} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-gray-900">{stats.count} Adet</p>
          <p className="mt-1 text-xs text-gray-500">Filtrelenmiş işlem sayısı</p>
        </div>

        <div className="card p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Toplam Giriş (Gelir)</span>
            <div className="p-2 rounded bg-emerald-50 text-emerald-600">
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-emerald-600">{formatTRY(stats.deposits)}</p>
          <p className="mt-1 text-xs text-gray-500">Banka hesaplarına girişler</p>
        </div>

        <div className="card p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Toplam Çıkış (Gider)</span>
            <div className="p-2 rounded bg-red-50 text-red-600">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-red-600">{formatTRY(stats.withdrawals)}</p>
          <p className="mt-1 text-xs text-gray-500">Banka hesaplarından çıkışlar</p>
        </div>

        <div className="card p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-500">Net Değişim</span>
            <div className={`p-2 rounded ${stats.net >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <DollarSign size={18} />
            </div>
          </div>
          <p className={`mt-4 text-2xl font-bold ${stats.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatTRY(stats.net)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Net nakit akış bakiyesi</p>
        </div>
      </div>

      {/* Analytics Charts (Custom SVG Panels) */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* SVG Daily Cashflow Chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
              <Sparkles size={16} className="text-brand-600" />
              Nakit Akışı (Son Etkin Günler)
            </h3>
            <span className="text-xs text-gray-400">Girişler yeşil, Çıkışlar kırmızı</span>
          </div>

          {dailyFlows.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-gray-400">
              <AlertCircle size={32} className="text-gray-300 mb-2" />
              <span className="text-xs">Görüntülenecek nakit akışı verisi bulunamadı.</span>
            </div>
          ) : (
            <div className="flex h-60 items-end justify-between px-2 pt-4">
              {dailyFlows.map((flow, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 w-32 pointer-events-none">
                    <p className="font-semibold text-center mb-1">{flow.date}</p>
                    <p className="text-emerald-400">Gelir: {formatTRY(flow.deposit)}</p>
                    <p className="text-red-400">Gider: {formatTRY(flow.withdrawal)}</p>
                  </div>

                  {/* Double bars */}
                  <div className="flex items-end gap-1.5 w-full justify-center h-44 border-b border-gray-100 pb-1">
                    {/* Deposit Bar */}
                    <div 
                      style={{ height: `${flow.depPercent}%` }} 
                      className="w-3.5 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-sm hover:from-emerald-600 hover:to-emerald-500 transition-all cursor-pointer"
                    />
                    {/* Withdrawal Bar */}
                    <div 
                      style={{ height: `${flow.witPercent}%` }} 
                      className="w-3.5 bg-gradient-to-t from-red-500 to-red-400 rounded-t-sm hover:from-red-600 hover:to-red-500 transition-all cursor-pointer"
                    />
                  </div>
                  <span className="mt-2 text-[10px] text-gray-500 font-semibold">{flow.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SVG Horizontal Category Progress Bars */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
              <PieIcon size={16} className="text-brand-600" />
              Kategori Dağılımı (Hacim Payı)
            </h3>
            <span className="text-xs text-gray-400">Toplam hacme göre oran</span>
          </div>

          <div className="h-60 overflow-y-auto space-y-4 pr-1">
            {categoryStats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <AlertCircle size={32} className="text-gray-300 mb-2" />
                <span className="text-xs">Kategori bazlı işlem verisi bulunamadı.</span>
              </div>
            ) : (
              categoryStats.map((cat) => (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-700">{cat.label}</span>
                    <span className="text-gray-900">{formatTRY(cat.amount)} ({cat.percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      style={{ width: `${cat.percent}%` }}
                      className={`h-2 rounded-full ${
                        cat.id === 'transfer' ? 'bg-blue-500' :
                        cat.id === 'payment' ? 'bg-amber-500' :
                        cat.id === 'salary' ? 'bg-emerald-500' :
                        cat.id === 'tax' ? 'bg-red-500' :
                        cat.id === 'credit_card' ? 'bg-purple-500' :
                        cat.id === 'pos' ? 'bg-cyan-500' :
                        cat.id === 'interest' ? 'bg-orange-500' : 'bg-gray-500'
                      }`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4 font-bold text-gray-700 text-sm">
          <Filter size={16} />
          Gelişmiş Arama ve Filtreleme
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label text-[11px] font-semibold text-gray-400 uppercase">Açıklama / Karşı Taraf</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                className="input pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Metin ara..."
              />
            </div>
          </div>

          <div>
            <label className="label text-[11px] font-semibold text-gray-400 uppercase">Banka Hesabı</label>
            <select
              className="input"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="">Tüm Banka Hesapları</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.bank} - {a.accountName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-[11px] font-semibold text-gray-400 uppercase">İşlem Türü</label>
            <select
              className="input"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
            >
              <option value="all">Tümü</option>
              <option value="giris">Giriş (Gelir)</option>
              <option value="cikis">Çıkış (Gider)</option>
            </select>
          </div>

          <div>
            <label className="label text-[11px] font-semibold text-gray-400 uppercase">Kategori</label>
            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label text-[11px] font-semibold text-gray-400 uppercase">Tarih Aralığı (Başlangıç)</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label text-[11px] font-semibold text-gray-400 uppercase">Tarih Aralığı (Bitiş)</label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="label text-[11px] font-semibold text-gray-400 uppercase">Minimum Tutar</label>
            <input
              type="number"
              className="input"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="Min ₺"
            />
          </div>

          <div>
            <label className="label text-[11px] font-semibold text-gray-400 uppercase">Maksimum Tutar</label>
            <input
              type="number"
              className="input"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="Max ₺"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-4">
          <span className="text-xs font-semibold text-gray-400">
            Toplam {filteredTransactions.length} eşleşen kayıt listeleniyor.
          </span>
          <div className="flex gap-2">
            <button 
              className="btn-secondary !py-1 text-xs" 
              onClick={() => {
                setQ(''); setSelectedAccountId(''); setSelectedType('all'); setSelectedCategory('');
                setStartDate(''); setEndDate(''); setMinAmount(''); setMaxAmount('');
              }}
            >
              Filtreleri Temizle
            </button>
            <button className="btn-secondary !py-1 text-xs text-emerald-600 hover:text-emerald-700" onClick={handleExportExcel}>
              <Download size={14} />
              Excel Raporu Al
            </button>
          </div>
        </div>
      </div>

      {/* Main Transactions List */}
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Banka Hesabı</th>
              <th className="px-6 py-4 text-center">Tarih</th>
              <th className="px-6 py-4">Kategori</th>
              <th className="px-6 py-4">Karşı Taraf / Açıklama</th>
              <th className="px-6 py-4 text-right">Tutar</th>
              <th className="px-6 py-4 text-center">Tür</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white font-medium text-gray-900">
            {filteredTransactions.map((t) => {
              const acc = accounts.find(a => a.id === t.accountId);
              return (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-900 block">{acc?.bank || 'Bilinmeyen'}</span>
                    <span className="text-xs text-gray-400 block font-normal">{acc?.accountName}</span>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap text-gray-500 font-semibold">
                    {new Date(t.date).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`${categoryColors[t.category] || categoryColors.diger} border text-[11px] font-bold uppercase`}>
                      {categoryLabels[t.category] || t.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold block truncate max-w-xs">{t.counterparty}</span>
                    <span className="text-xs text-gray-400 block font-normal truncate max-w-xs" title={t.description}>
                      {t.description}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold text-[15px] ${t.type === 'giris' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'giris' ? '+' : '-'} {formatTRY(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      t.type === 'giris' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {t.type === 'giris' ? 'Gelir' : 'Gider'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            <Building2 size={48} className="text-gray-300 mx-auto mb-3" />
            <span className="text-sm font-semibold">Filtrelere uygun hesap hareketi bulunamadı.</span>
          </div>
        )}
      </div>

      {/* Upload Statement Modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => { setUploadModalOpen(false); resetUploadState(); }}
        title="Banka Ekstresi Yükle"
      >
        <div className="space-y-4">
          <div>
            <label className="label font-semibold text-xs text-gray-500">Hedef Banka Hesabı</label>
            <select
              className="input"
              value={uploadAccountId}
              onChange={(e) => setUploadAccountId(e.target.value)}
            >
              <option value="">Lütfen banka hesabı seçin...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.bank} ({a.accountName})</option>
              ))}
            </select>
          </div>

          <div className="flex rounded-lg bg-gray-100 p-0.5">
            <button
              onClick={() => setUploadMode('excel')}
              className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 ${
                uploadMode === 'excel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileSpreadsheet size={14} />
              Excel Ekstresi
            </button>
            <button
              onClick={() => setUploadMode('paste')}
              className={`flex-1 py-1.5 text-center text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 ${
                uploadMode === 'paste' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText size={14} />
              Metin Kopyala-Yapıştır
            </button>
          </div>

          {uploadMode === 'excel' ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-brand-500 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
              />
              <Upload size={32} className="text-gray-400 mx-auto mb-2" />
              <span className="text-sm font-semibold text-gray-700 block">Excel Dosyasını Seçin</span>
              <span className="text-xs text-gray-400 block mt-1">.xlsx veya .xls banka ekstresi</span>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="label font-semibold text-xs text-gray-500">Ekstre Metnini Buraya Yapıştırın</label>
              <textarea
                className="input min-h-[120px] font-mono text-xs"
                placeholder="Örn: 10.08.2026   MAAŞ ÖDEMESİ BEKO   -25.000,00"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
              <button className="btn-primary w-full text-xs" onClick={handleTextPasteParse}>
                Metni Çözümle
              </button>
            </div>
          )}

          {parsedItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Okunan Hareketler ({parsedItems.length} Adet)</span>
                <button className="text-red-500 flex items-center gap-1" onClick={() => setParsedItems([])}>
                  <Trash2 size={12} />
                  Temizle
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-100 rounded text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0 font-bold">
                    <tr>
                      <th className="p-2">Tarih</th>
                      <th className="p-2">Açıklama</th>
                      <th className="p-2 text-right">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="p-2">{new Date(item.date).toLocaleDateString('tr-TR')}</td>
                        <td className="p-2 max-w-[150px] truncate">{item.description}</td>
                        <td className={`p-2 text-right font-bold ${item.type === 'giris' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {item.type === 'giris' ? '+' : '-'} {formatTRY(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="btn-primary w-full bg-emerald-600 hover:bg-emerald-700 font-bold mt-4" onClick={handleSaveImport}>
                İçe Aktarımı Tamamla ({parsedItems.length} İşlem)
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Manual Insert Modal */}
      <Modal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Hesap Hareketi Ekle"
      >
        <div className="space-y-4">
          <div>
            <label className="label font-semibold text-xs text-gray-500">Banka Hesabı</label>
            <select
              className="input"
              value={manualTx.accountId}
              onChange={(e) => setManualTx({ ...manualTx, accountId: e.target.value })}
            >
              <option value="">Lütfen banka hesabı seçin...</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.bank} ({a.accountName})</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="label font-semibold text-xs text-gray-500">Tarih</label>
              <input
                type="date"
                className="input"
                value={manualTx.date}
                onChange={(e) => setManualTx({ ...manualTx, date: e.target.value })}
              />
            </div>

            <div>
              <label className="label font-semibold text-xs text-gray-500">İşlem Türü</label>
              <select
                className="input"
                value={manualTx.type}
                onChange={(e) => setManualTx({ ...manualTx, type: e.target.value as any })}
              >
                <option value="giris">Para Girişi (Gelir)</option>
                <option value="cikis">Para Çıkışı (Gider)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="label font-semibold text-xs text-gray-500">Tutar</label>
              <input
                type="number"
                className="input"
                placeholder="Tutar ₺"
                value={manualTx.amount}
                onChange={(e) => setManualTx({ ...manualTx, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="label font-semibold text-xs text-gray-500">Kategori</label>
              <select
                className="input"
                value={manualTx.category}
                onChange={(e) => setManualTx({ ...manualTx, category: e.target.value })}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label font-semibold text-xs text-gray-500">Alıcı / Gönderen (Karşı Taraf)</label>
            <input
              type="text"
              className="input"
              placeholder="Firma veya şahıs ismi"
              value={manualTx.counterparty}
              onChange={(e) => setManualTx({ ...manualTx, counterparty: e.target.value })}
            />
          </div>

          <div>
            <label className="label font-semibold text-xs text-gray-500">Açıklama</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="İşlem detayı..."
              value={manualTx.description}
              onChange={(e) => setManualTx({ ...manualTx, description: e.target.value })}
            />
          </div>

          <button className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700 font-bold pt-3" onClick={handleSaveManual}>
            Hareketi Kaydet
          </button>
        </div>
      </Modal>
    </div>
  );
}
