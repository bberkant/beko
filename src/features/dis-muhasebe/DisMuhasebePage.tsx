import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Send,
  Eye,
  Info
} from 'lucide-react';
import { useToast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { Modal } from '../../components/ui/Modal';
import * as XLSX from 'xlsx';

interface DisMuhasebePageProps {
  activeTab?: 'veri-gonderimi' | 'beyannameler' | 'mutabakatlar' | 'mizan';
}

const TUNNEL_URL = 'https://vega-api.amasyaetas.com';

interface TaxDeclaration {
  id: string;
  company: string;
  tax_type: string;
  period: string;
  amount: number;
  due_date: string;
  payment_status: 'odendi' | 'odenmedi';
  payment_date: string | null;
  file_path: string | null;
}

interface ReconciliationLog {
  id: string;
  company: string;
  period: string;
  cari_code: string;
  cari_name: string;
  tax_no: string;
  doc_count: number;
  total_amount: number;
  type: 'BA' | 'BS';
  status: 'beklemede' | 'onaylandi' | 'reddedildi';
  notes: string | null;
}

interface MizanRecord {
  code: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'Borç' | 'Alacak' | 'Sıfır';
}

interface VegaCari {
  code: string;
  name: string;
  taxNo: string;
  balance: number;
}

export function DisMuhasebePage({ activeTab: initialTab = 'veri-gonderimi' }: DisMuhasebePageProps) {
  const { notify } = useToast();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(initialTab);

  // Tab 1 (Veri Gönderimi) States
  const [exportCompany, setExportCompany] = useState<'etik' | 'marif'>('marif');
  const [exportFormat, setExportFormat] = useState<'luca' | 'zirve'>('luca');
  const [exportType, setExportType] = useState<'sales' | 'purchases' | 'bank'>('sales');
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Ayın 1'i
    return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);

  // Tab 2 (Beyannameler) States
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [decLoading, setDecLoading] = useState(false);
  const [isDecModalOpen, setIsDecModalOpen] = useState(false);
  const [newDec, setNewDec] = useState({
    company: 'marif',
    tax_type: 'KDV',
    period: '',
    amount: '',
    due_date: '',
    file: null as File | null
  });
  const [decFilterCompany, setDecFilterCompany] = useState<string>('all');
  const [decFilterType, setDecFilterType] = useState<string>('all');

  // Tab 3 (Cari Mutabakat) States
  const [mutabakatList, setMutabakatList] = useState<ReconciliationLog[]>([]);
  const [mutLoading, setMutLoading] = useState(false);
  const [mutPeriod, setMutPeriod] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1); // Bir önceki ay
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [mutThreshold, setMutThreshold] = useState(5000);
  const [mutCompany, setMutCompany] = useState<'etik' | 'marif'>('marif');
  const [selectedMutabakat, setSelectedMutabakat] = useState<ReconciliationLog | null>(null);
  const [isMutModalOpen, setIsMutModalOpen] = useState(false);
  const [sendingMut, setSendingMut] = useState(false);

  // Tab 4 (Mizan Karşılaştırma) States
  const [mizanRecords, setMizanRecords] = useState<MizanRecord[]>([]);
  const [vegaCariler, setVegaCariler] = useState<VegaCari[]>([]);
  const [mizanLoading, setMizanLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize Tab State with Prop changes
  useEffect(() => {
    setCurrentTab(initialTab);
  }, [initialTab]);

  // Load Beyannameler (Tab 2)
  const fetchDeclarations = async () => {
    if (!user?.organizationId) return;
    setDecLoading(true);
    try {
      let query = supabase
        .from('tax_declarations')
        .select('*')
        .eq('organization_id', user.organizationId)
        .order('period', { ascending: false });

      if (decFilterCompany !== 'all') {
        query = query.eq('company', decFilterCompany);
      }
      if (decFilterType !== 'all') {
        query = query.eq('tax_type', decFilterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDeclarations((data || []).map(d => ({
        id: d.id,
        company: d.company,
        tax_type: d.tax_type,
        period: d.period,
        amount: Number(d.amount),
        due_date: d.due_date,
        payment_status: d.payment_status,
        payment_date: d.payment_date,
        file_path: d.file_path
      })));
    } catch (e: any) {
      console.error(e);
      notify('Beyannameler yüklenirken hata oluştu.', 'error');
    } finally {
      setDecLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'beyannameler') {
      void fetchDeclarations();
    }
  }, [currentTab, decFilterCompany, decFilterType]);

  // Handle Declaration Upload
  const handleCreateDeclaration = async () => {
    if (!newDec.period || !newDec.amount || !newDec.due_date || !user?.organizationId) {
      notify('Lütfen tüm zorunlu alanları doldurun.', 'info');
      return;
    }

    setDecLoading(true);
    try {
      let file_path: string | null = null;
      if (newDec.file) {
        const fileExt = newDec.file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        file_path = `${user.organizationId}/declarations/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('operations-documents')
          .upload(file_path, newDec.file);

        if (uploadError) throw uploadError;
      }

      const { error } = await supabase.from('tax_declarations').insert({
        organization_id: user.organizationId,
        company: newDec.company,
        tax_type: newDec.tax_type,
        period: newDec.period,
        amount: parseFloat(newDec.amount),
        due_date: newDec.due_date,
        payment_status: 'odenmedi',
        file_path
      });

      if (error) throw error;
      notify('Beyanname kaydı başarıyla eklendi.', 'success');
      setIsDecModalOpen(false);
      setNewDec({
        company: 'marif',
        tax_type: 'KDV',
        period: '',
        amount: '',
        due_date: '',
        file: null
      });
      void fetchDeclarations();
    } catch (e: any) {
      console.error(e);
      notify('Kayıt oluşturulamadı.', 'error');
    } finally {
      setDecLoading(false);
    }
  };

  // Toggle Declaration Payment Status
  const handleTogglePaymentStatus = async (id: string, currentStatus: 'odendi' | 'odenmedi') => {
    const nextStatus = currentStatus === 'odendi' ? 'odenmedi' : 'odendi';
    const nextDate = nextStatus === 'odendi' ? new Date().toISOString().split('T')[0] : null;
    try {
      const { error } = await supabase
        .from('tax_declarations')
        .update({ payment_status: nextStatus, payment_date: nextDate })
        .eq('id', id);

      if (error) throw error;
      notify('Ödeme durumu güncellendi.', 'success');
      void fetchDeclarations();
    } catch (e) {
      console.error(e);
      notify('Ödeme durumu güncellenemedi.', 'error');
    }
  };

  // Delete Declaration
  const handleDeleteDeclaration = async (dec: TaxDeclaration) => {
    if (!window.confirm('Bu beyanname kaydını silmek istediğinize emin misiniz?')) return;
    try {
      if (dec.file_path) {
        await supabase.storage.from('operations-documents').remove([dec.file_path]);
      }
      const { error } = await supabase.from('tax_declarations').delete().eq('id', dec.id);
      if (error) throw error;
      notify('Kayıt başarıyla silindi.', 'success');
      void fetchDeclarations();
    } catch (e) {
      console.error(e);
      notify('Kayıt silinemedi.', 'error');
    }
  };

  // Generate Excel Files for Müşavir (Tab 1)
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      let url = `${TUNNEL_URL}/api/${exportCompany}/efaturalar`;
      if (exportType === 'sales') {
        url += '?direction=giden';
      } else if (exportType === 'purchases') {
        url += '?direction=gelen';
      } else {
        // Bank transactions fallback (placeholder call)
        url += '?direction=giden';
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('API verisi alınamadı.');
      const rawData = await res.json();
      
      const invoices = Array.isArray(rawData) ? rawData : (rawData.value || []);
      const filtered = invoices.filter((inv: any) => {
        const invDate = new Date(inv.date);
        return invDate >= new Date(exportStartDate) && invDate <= new Date(exportEndDate);
      });

      if (filtered.length === 0) {
        notify('Seçilen tarih aralığında aktarılacak kayıt bulunamadı.', 'info');
        return;
      }

      let exportRows: any[] = [];

      if (exportFormat === 'luca') {
        // Luca format: Tarih, Evrak No, Açıklama, Hesap Kodu, Borç, Alacak
        filtered.forEach((inv: any) => {
          const invDateStr = new Date(inv.date).toLocaleDateString('tr-TR');
          const documentNo = inv.invoiceNo;
          const desc = `${inv.cariName} Fatura Kaydı`;
          const matrahVal = Number(inv.matrah) || 0;
          const kdvVal = Number(inv.kdv) || 0;
          const totalVal = Number(inv.amount) || 0;

          if (exportType === 'sales') {
            // Matrah Alacak (600), KDV Alacak (391), Cari Borç (120)
            exportRows.push({
              'Fiş Tarihi': invDateStr,
              'Evrak No': documentNo,
              'Açıklama': desc,
              'Hesap Kodu': '120.01.001',
              'Borç': totalVal,
              'Alacak': 0
            });
            exportRows.push({
              'Fiş Tarihi': invDateStr,
              'Evrak No': documentNo,
              'Açıklama': `${desc} - Matrah`,
              'Hesap Kodu': '600.01.018',
              'Borç': 0,
              'Alacak': matrahVal
            });
            if (kdvVal > 0) {
              exportRows.push({
                'Fiş Tarihi': invDateStr,
                'Evrak No': documentNo,
                'Açıklama': `${desc} - Hesaplanan KDV`,
                'Hesap Kodu': '391.01.018',
                'Borç': 0,
                'Alacak': kdvVal
              });
            }
          } else {
            // Matrah Borç (150/770), KDV Borç (191), Cari Alacak (320)
            exportRows.push({
              'Fiş Tarihi': invDateStr,
              'Evrak No': documentNo,
              'Açıklama': desc,
              'Hesap Kodu': '320.01.001',
              'Borç': 0,
              'Alacak': totalVal
            });
            exportRows.push({
              'Fiş Tarihi': invDateStr,
              'Evrak No': documentNo,
              'Açıklama': `${desc} - Matrah`,
              'Hesap Kodu': '150.01.001',
              'Borç': matrahVal,
              'Alacak': 0
            });
            if (kdvVal > 0) {
              exportRows.push({
                'Fiş Tarihi': invDateStr,
                'Evrak No': documentNo,
                'Açıklama': `${desc} - İndirilecek KDV`,
                'Hesap Kodu': '191.01.018',
                'Borç': kdvVal,
                'Alacak': 0
              });
            }
          }
        });
      } else {
        // Zirve format mapping
        filtered.forEach((inv: any) => {
          exportRows.push({
            'Tarih': new Date(inv.date).toLocaleDateString('tr-TR'),
            'Belge No': inv.invoiceNo,
            'Açıklama': `${inv.cariName} Fatura Kaydı`,
            'Hesap Kodu': exportType === 'sales' ? '120.01.001' : '320.01.001',
            'Borç': exportType === 'sales' ? inv.amount : 0,
            'Alacak': exportType === 'sales' ? 0 : inv.amount,
            'KDV Oranı': 18
          });
        });
      }

      // Generate Workbook
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Muhasebe_Kayıtları');
      
      const fileName = `${exportCompany}_${exportType}_${exportFormat}_${exportStartDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      notify(`${fileName} dosyası başarıyla indirildi.`, 'success');
    } catch (e: any) {
      console.error(e);
      notify('Excel dosyası oluşturulamadı.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Generate BA/BS Mutabakat (Tab 3)
  const calculateReconciliations = async () => {
    setMutLoading(true);
    try {
      // Fetch Sales and Purchases from API
      const [salesRes, purchRes] = await Promise.all([
        fetch(`${TUNNEL_URL}/api/${mutCompany}/efaturalar?direction=giden`),
        fetch(`${TUNNEL_URL}/api/${mutCompany}/efaturalar?direction=gelen`)
      ]);

      const [salesRaw, purchRaw] = await Promise.all([salesRes.json(), purchRes.json()]);
      const sales = Array.isArray(salesRaw) ? salesRaw : (salesRaw.value || []);
      const purchases = Array.isArray(purchRaw) ? purchRaw : (purchRaw.value || []);

      const periodYearMonth = mutPeriod; // 'YYYY-MM'

      // Filter by period
      const periodSales = sales.filter((inv: any) => inv.date && inv.date.startsWith(periodYearMonth));
      const periodPurchases = purchases.filter((inv: any) => inv.date && inv.date.startsWith(periodYearMonth));

      const cariAggregator: Record<string, {
        cari_code: string;
        cari_name: string;
        tax_no: string;
        doc_count: number;
        total_amount: number;
        type: 'BA' | 'BS';
      }> = {};

      // Process BS (Sales)
      periodSales.forEach((inv: any) => {
        const key = `BS-${inv.cariCode}`;
        if (!cariAggregator[key]) {
          cariAggregator[key] = {
            cari_code: inv.cariCode,
            cari_name: inv.cariName,
            tax_no: inv.cariCode,
            doc_count: 0,
            total_amount: 0,
            type: 'BS'
          };
        }
        cariAggregator[key].doc_count += 1;
        cariAggregator[key].total_amount += Number(inv.matrah) || 0;
      });

      // Process BA (Purchases)
      periodPurchases.forEach((inv: any) => {
        const key = `BA-${inv.cariCode}`;
        if (!cariAggregator[key]) {
          cariAggregator[key] = {
            cari_code: inv.cariCode,
            cari_name: inv.cariName,
            tax_no: inv.cariCode,
            doc_count: 0,
            total_amount: 0,
            type: 'BA'
          };
        }
        cariAggregator[key].doc_count += 1;
        cariAggregator[key].total_amount += Number(inv.matrah) || 0;
      });

      // Get mutabakat status logs from Supabase
      const { data: dbMutLogs } = await supabase
        .from('reconciliations')
        .select('*')
        .eq('company', mutCompany)
        .eq('period', mutPeriod);

      const statusMap = new Map<string, 'beklemede' | 'onaylandi' | 'reddedildi'>();
      const dbIdMap = new Map<string, string>();
      const notesMap = new Map<string, string>();
      if (dbMutLogs) {
        dbMutLogs.forEach(row => {
          const key = `${row.type}-${row.cari_code}`;
          statusMap.set(key, row.status);
          dbIdMap.set(key, row.id);
          notesMap.set(key, row.notes);
        });
      }

      // Convert to array and filter by threshold (5000 TL default)
      const list = Object.values(cariAggregator)
        .filter(item => item.total_amount >= mutThreshold)
        .map((item, idx) => {
          const key = `${item.type}-${item.cari_code}`;
          return {
            id: dbIdMap.get(key) || `MOCK-${idx}`,
            company: mutCompany,
            period: mutPeriod,
            cari_code: item.cari_code,
            cari_name: item.cari_name,
            tax_no: item.tax_no,
            doc_count: item.doc_count,
            total_amount: Math.round(item.total_amount * 100) / 100,
            type: item.type,
            status: statusMap.get(key) || 'beklemede',
            notes: notesMap.get(key) || null
          };
        });

      setMutabakatList(list);
      notify('BA/BS raporları başarıyla hesaplandı.', 'success');
    } catch (e) {
      console.error(e);
      notify('BA/BS raporları hesaplanamadı.', 'error');
    } finally {
      setMutLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 'mutabakatlar') {
      void calculateReconciliations();
    }
  }, [currentTab, mutCompany, mutPeriod, mutThreshold]);

  // Send mutabakat request and update state
  const handleSendMutabakat = async () => {
    if (!selectedMutabakat || !user?.organizationId) return;
    setSendingMut(true);
    try {
      const isMockId = selectedMutabakat.id.startsWith('MOCK');
      const payload = {
        organization_id: user.organizationId,
        company: selectedMutabakat.company,
        period: selectedMutabakat.period,
        cari_code: selectedMutabakat.cari_code,
        cari_name: selectedMutabakat.cari_name,
        tax_no: selectedMutabakat.tax_no,
        doc_count: selectedMutabakat.doc_count,
        total_amount: selectedMutabakat.total_amount,
        type: selectedMutabakat.type,
        status: 'onaylandi', // Auto approved for simulation
        notes: `Talebiniz ${new Date().toLocaleDateString('tr-TR')} tarihinde onaylandı.`
      };

      if (isMockId) {
        const { error } = await supabase.from('reconciliations').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reconciliations')
          .update({ status: 'onaylandi', notes: payload.notes })
          .eq('id', selectedMutabakat.id);
        if (error) throw error;
      }

      notify('Mutabakat mektubu başarıyla gönderildi ve onaylandı.', 'success');
      setIsMutModalOpen(false);
      void calculateReconciliations();
    } catch (e) {
      console.error(e);
      notify('Mutabakat işlemi gerçekleştirilemedi.', 'error');
    } finally {
      setSendingMut(false);
    }
  };

  // Tab 4 (Mizan Karşılaştırma) - File Upload & Parse
  const handleMizanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMizanLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        const parsedRecords: MizanRecord[] = [];

        // Parse rows and match standard mizan columns: Account Code (120/320), Account Name, Debit, Credit, Balance
        rows.forEach(row => {
          if (!row || row.length < 3) return;
          const code = String(row[0] || '').trim();
          const name = String(row[1] || '').trim();
          
          if ((code.startsWith('120') || code.startsWith('320')) && code.length >= 6) {
            let debit = 0;
            let credit = 0;
            
            for (let i = 2; i < row.length; i++) {
              const val = Number(String(row[i]).replace(/\./g, '').replace(/,/g, '.'));
              if (!isNaN(val) && val > 0) {
                if (debit === 0) debit = val;
                else if (credit === 0) credit = val;
              }
            }

            const balance = Math.abs(debit - credit);
            const balanceType = debit > credit ? 'Borç' : (credit > debit ? 'Alacak' : 'Sıfır');

            parsedRecords.push({
              code,
              name,
              debit,
              credit,
              balance,
              balanceType
            });
          }
        });

        // Fetch Vega Cariler to compare
        const vegaRes = await fetch(`${TUNNEL_URL}/api/cariler`);
        if (!vegaRes.ok) throw new Error('Vega carileri alınamadı.');
        const vegaData = await vegaRes.json();

        setVegaCariler(vegaData.map((c: any) => ({
          code: c.code,
          name: c.name,
          taxNo: c.taxNo || '',
          balance: Number(c.balance) || 0
        })));

        setMizanRecords(parsedRecords);
        notify('Mizan dosyası başarıyla yüklendi ve ayrıştırıldı.', 'success');
      } catch (err) {
        console.error(err);
        notify('Mizan dosyası ayrıştırılamadı. Formatı kontrol edin.', 'error');
      } finally {
        setMizanLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Trial balance matching comparator
  const matchedMizan = useMemo(() => {
    if (mizanRecords.length === 0) return [];

    return mizanRecords.map(mizan => {
      const cleanMizanName = mizan.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const vegaMatch = vegaCariler.find(vc => {
        const cleanVegaName = vc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanVegaName.includes(cleanMizanName) || cleanMizanName.includes(cleanVegaName);
      });

      const vegaBalance = vegaMatch ? vegaMatch.balance : 0;
      const mizanVal = mizan.balanceType === 'Alacak' ? -mizan.balance : mizan.balance;
      
      const diff = Math.abs(mizanVal - vegaBalance);
      let status: 'uyusuyor' | 'farkli' | 'vega_yok' = 'farkli';
      
      if (!vegaMatch) {
        status = 'vega_yok';
      } else if (diff < 1) {
        status = 'uyusuyor';
      }

      return {
        code: mizan.code,
        name: mizan.name,
        mizanBalance: mizanVal,
        vegaName: vegaMatch ? vegaMatch.name : '—',
        vegaBalance: vegaBalance,
        diff: diff,
        status: status
      };
    });
  }, [mizanRecords, vegaCariler]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="text-[#f37021]" size={28} />
            Dış Muhasebe Portali
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Mali Müşavir veri gönderimleri, beyannameler, BA/BS mutabakatları ve mizan karşılaştırma ekranları.
          </p>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setCurrentTab('veri-gonderimi')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentTab === 'veri-gonderimi'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Veri Gönderim Portalı
        </button>
        <button
          onClick={() => setCurrentTab('beyannameler')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentTab === 'beyannameler'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Beyanname Deposu
        </button>
        <button
          onClick={() => setCurrentTab('mutabakatlar')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentTab === 'mutabakatlar'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Cari Mutabakat (BA/BS)
        </button>
        <button
          onClick={() => setCurrentTab('mizan')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentTab === 'mizan'
              ? 'border-[#f37021] text-[#f37021]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Mizan Eşitleme
        </button>
      </div>

      {/* Tab Contents */}

      {/* SECTION A: VERİ GÖNDERİMİ */}
      {currentTab === 'veri-gonderimi' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                <FileSpreadsheet className="text-brand-500" size={20} />
                Luca & Zirve Uyumlu Excel Aktarım Robotu
              </h2>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Firma</label>
                  <select
                    value={exportCompany}
                    onChange={e => setExportCompany(e.target.value as 'etik' | 'marif')}
                    className="select"
                  >
                    <option value="marif">Marif Et Ürünleri</option>
                    <option value="etik">Etik Et Ürünleri</option>
                  </select>
                </div>
                <div>
                  <label className="label">Uyumlu Format</label>
                  <select
                    value={exportFormat}
                    onChange={e => setExportFormat(e.target.value as 'luca' | 'zirve')}
                    className="select"
                  >
                    <option value="luca">Luca Muhasebe (Excel Fiş Girişi)</option>
                    <option value="zirve">Zirve Müşavir (Fiş Aktarımı)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Veri Türü</label>
                  <select
                    value={exportType}
                    onChange={e => setExportType(e.target.value as 'sales' | 'purchases' | 'bank')}
                    className="select"
                  >
                    <option value="sales">Satış Faturaları</option>
                    <option value="purchases">Alış Faturaları</option>
                    <option value="bank">Banka Hesap Hareketleri</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tarih Aralığı</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={e => setExportStartDate(e.target.value)}
                      className="input"
                    />
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={e => setExportEndDate(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-150 pt-4 flex justify-end">
                <button
                  onClick={() => void handleExportData()}
                  disabled={isExporting}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5"
                >
                  {isExporting ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                  {exportFormat === 'luca' ? 'Luca Excel Dosyası Oluştur' : 'Zirve Excel Dosyası Oluştur'}
                </button>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="rounded-xl border border-gray-200 bg-orange-50/50 p-6 space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
              <Info size={16} className="text-[#f37021]" />
              Müşavir Entegrasyon Bilgilendirmesi
            </h3>
            <p className="text-xs leading-5 text-gray-500">
              Bu robot, iç muhasebe veritabanında (Vega) kayıtlı faturaları okur ve mali müşavirinizin muhasebe sistemine doğrudan import edebileceği biçimde tek düzen hesap planına göre borç/alacak satırlarını otomatik oluşturur.
            </p>
            <div className="text-xs space-y-2 border-t border-gray-200 pt-3">
              <div className="flex justify-between">
                <span className="font-semibold">Müşteri Cari Kodu:</span>
                <span className="font-mono text-gray-500">120.01.*</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Satıcı Cari Kodu:</span>
                <span className="font-mono text-gray-500">320.01.*</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Yurt İçi Satışlar:</span>
                <span className="font-mono text-gray-500">600.01.018</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Hesaplanan KDV:</span>
                <span className="font-mono text-gray-500">391.01.018</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: BEYANNAMELER */}
      {currentTab === 'beyannameler' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={decFilterCompany}
                onChange={e => setDecFilterCompany(e.target.value)}
                className="select-sm w-40"
              >
                <option value="all">Tüm Firmalar</option>
                <option value="marif">Marif Et Ürünleri</option>
                <option value="etik">Etik Et Ürünleri</option>
              </select>
              <select
                value={decFilterType}
                onChange={e => setDecFilterType(e.target.value)}
                className="select-sm w-40"
              >
                <option value="all">Tüm Vergiler</option>
                <option value="KDV">KDV Beyannamesi</option>
                <option value="Muhtasar">Muhtasar (Stopaj)</option>
                <option value="Geçici Vergi">Geçici Vergi</option>
                <option value="Kurumlar Vergisi">Kurumlar Vergisi</option>
                <option value="SGK">SGK Bildirgesi</option>
              </select>
            </div>
            <button
              onClick={() => setIsDecModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              Yeni Beyanname Yükle
            </button>
          </div>

          {/* Declarations Table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {decLoading ? (
                <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="animate-spin text-[#f37021]" size={28} />
                  <span>Beyanname ve Tahakkuk Fişleri Yükleniyor...</span>
                </div>
              ) : declarations.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  Arşivlenmiş yasal beyanname kaydı bulunamadı.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-700">
                      <th className="px-6 py-4">Firma</th>
                      <th className="px-6 py-4">Beyanname Türü</th>
                      <th className="px-6 py-4">Dönem</th>
                      <th className="px-6 py-4 text-right">Vergi Tutarı</th>
                      <th className="px-6 py-4 text-center">Son Ödeme Tarihi</th>
                      <th className="px-6 py-4 text-center">Ödeme Durumu</th>
                      <th className="px-6 py-4 text-center">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-900">
                    {declarations.map(dec => (
                      <tr key={dec.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {dec.company === 'marif' ? 'Marif Et' : 'Etik Et Ürünleri'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            {dec.tax_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-600">
                          {dec.period}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(dec.amount)}
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-500">
                          {new Date(dec.due_date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => void handleTogglePaymentStatus(dec.id, dec.payment_status)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              dec.payment_status === 'odendi'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {dec.payment_status === 'odendi' ? (
                              <>
                                <CheckCircle2 size={12} />
                                Ödendi
                              </>
                            ) : (
                              <>
                                <Clock size={12} />
                                Ödenmedi
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            {dec.file_path && (
                              <a
                                href={supabase.storage.from('operations-documents').getPublicUrl(dec.file_path).data.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-600 hover:text-brand-800"
                                title="Tahakkuk PDF'ini Görüntüle"
                              >
                                <Eye size={16} />
                              </a>
                            )}
                            <button
                              onClick={() => void handleDeleteDeclaration(dec)}
                              className="text-red-500 hover:text-red-700"
                              title="Kaydı Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION C: CARİ MUTABAKAT & BA/BS */}
      {currentTab === 'mutabakatlar' && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={mutCompany}
                onChange={e => setMutCompany(e.target.value as 'etik' | 'marif')}
                className="select-sm w-44"
              >
                <option value="marif">Marif Et Ürünleri</option>
                <option value="etik">Etik Et Ürünleri</option>
              </select>
              <input
                type="month"
                value={mutPeriod}
                onChange={e => setMutPeriod(e.target.value)}
                className="input-sm w-40"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">Mutabakat Limiti:</span>
                <input
                  type="number"
                  value={mutThreshold}
                  onChange={e => setMutThreshold(Number(e.target.value))}
                  className="input-sm w-24"
                />
              </div>
            </div>
            <button
              onClick={() => void calculateReconciliations()}
              className="btn-secondary flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              <RefreshCw size={14} className={mutLoading ? 'animate-spin' : ''} />
              Hesaplamayı Yenile
            </button>
          </div>

          {/* Reconciliations Table */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {mutLoading ? (
                <div className="py-20 text-center text-gray-550 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="animate-spin text-[#f37021]" size={28} />
                  <span>Vega'dan cari hareket verileri okunup limitler hesaplanıyor...</span>
                </div>
              ) : mutabakatList.length === 0 ? (
                <div className="py-20 text-center text-gray-400">
                  Seçilen dönemde 5.000 TL limitini aşan cari mutabakat bulunamadı.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-700">
                      <th className="px-6 py-4">Cari Hesap Unvanı</th>
                      <th className="px-6 py-4">VKN / TCKN</th>
                      <th className="px-6 py-4 text-center">Belge Adedi</th>
                      <th className="px-6 py-4 text-right">KDV Hariç Tutar</th>
                      <th className="px-6 py-4 text-center">Mutabakat Türü</th>
                      <th className="px-6 py-4 text-center">Durum</th>
                      <th className="px-6 py-4 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm text-gray-900">
                    {mutabakatList.map(mut => (
                      <tr key={mut.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{mut.cari_name}</div>
                          {mut.notes && <div className="text-xs text-brand-600 mt-1">{mut.notes}</div>}
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-500">
                          {mut.tax_no}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-800">
                          {mut.doc_count}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(mut.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                            mut.type === 'BA'
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-700/10'
                              : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-700/10'
                          }`}>
                            {mut.type === 'BA' ? 'BA (Alış)' : 'BS (Satış)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            mut.status === 'onaylandi'
                              ? 'bg-emerald-50 text-emerald-700'
                              : mut.status === 'reddedildi'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-yellow-50 text-yellow-700'
                          }`}>
                            {mut.status === 'onaylandi' && <CheckCircle2 size={12} />}
                            {mut.status === 'reddedildi' && <XCircle size={12} />}
                            {mut.status === 'beklemede' && <Clock size={12} />}
                            {mut.status === 'onaylandi' ? 'Mutabıkız' : mut.status === 'reddedildi' ? 'Uyuşmazlık' : 'Beklemede'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedMutabakat(mut);
                              setIsMutModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800 hover:underline"
                          >
                            <Send size={12} />
                            Mektup Gönder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: MİZAN EŞİTLEME */}
      {currentTab === 'mizan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Drag & Drop File Upload */}
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                  <Upload className="text-brand-500" size={20} />
                  Luca/Zirve Mizan Dosyası Yükleme (Excel)
                </h2>

                <div 
                  onClick={() => !mizanLoading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-brand-500 hover:bg-slate-50 transition-all space-y-3 ${mizanLoading ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  {mizanLoading ? (
                    <RefreshCw className="mx-auto text-[#f37021] animate-spin" size={40} />
                  ) : (
                    <FileSpreadsheet className="mx-auto text-gray-400" size={40} />
                  )}
                  <div className="text-sm font-semibold text-gray-700">
                    {mizanLoading ? 'Mizan Excel Tablosu Ayrıştırılıyor...' : 'Mizan Excel Dosyasını Sürükleyin veya Seçin'}
                  </div>
                  <p className="text-xs text-gray-400">Luca veya Zirve'den dışa aktarılan .xlsx/.xls formatındaki mizan tablolarını destekler.</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMizanUpload}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Mizan Guide */}
            <div className="rounded-xl border border-gray-200 bg-[#f8fafc] p-6 space-y-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                <Info size={16} className="text-brand-500" />
                Mizan Eşleştirme Nasıl Çalışır?
              </h3>
              <p className="text-xs leading-5 text-gray-500">
                1. Müşavirinizden aldığınız aylık cari mizan Excel dosyasını soldaki panele yükleyin.<br/>
                2. Sistem, mizandaki **120** (Alıcılar) ve **320** (Satıcılar) hesaplarını ayrıştırır.<br/>
                3. Ayrıştırılan cari bakiye kayıtları, Vega Arctos veritabanındaki güncel bakiyelerle cari kart unvanına göre otomatik eşleştirilir ve uyuşmazlıklar anında raporlanır.
              </p>
            </div>
          </div>

          {/* Mizan Comparison Results */}
          {mizanRecords.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">
                  Mizan Karşılaştırma Sonuçları ({matchedMizan.length} Cari Hesap)
                </h3>
                <button
                  onClick={() => {
                    setMizanRecords([]);
                    setVegaCariler([]);
                  }}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  Sonuçları Temizle
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-700 sticky top-0">
                        <th className="px-6 py-4">Hesap Kodu</th>
                        <th className="px-6 py-4">Mizan Cari Adı (Luca)</th>
                        <th className="px-6 py-4 text-right">Mizan Bakiye</th>
                        <th className="px-6 py-4">Vega Cari Kartı</th>
                        <th className="px-6 py-4 text-right">Vega Bakiye</th>
                        <th className="px-6 py-4 text-right">Fark Tutarı</th>
                        <th className="px-6 py-4 text-center">Durum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm text-gray-900">
                      {matchedMizan.map((item, idx) => (
                        <tr 
                          key={`${item.code}-${idx}`} 
                          className={`hover:bg-slate-50 transition-colors ${
                            item.status === 'farkli' ? 'bg-red-50/20' : item.status === 'vega_yok' ? 'bg-amber-50/10' : ''
                          }`}
                        >
                          <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.code}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900">{item.name}</td>
                          <td className="px-6 py-4 text-right font-medium text-gray-700">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.mizanBalance)}
                          </td>
                          <td className="px-6 py-4 text-gray-650">{item.vegaName}</td>
                          <td className="px-6 py-4 text-right font-medium text-gray-700">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.vegaBalance)}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${item.diff > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {item.diff > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.diff) : '—'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.status === 'uyusuyor'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.status === 'vega_yok'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
                            }`}>
                              {item.status === 'uyusuyor' && <CheckCircle2 size={12} />}
                              {item.status === 'vega_yok' && <AlertTriangle size={12} />}
                              {item.status === 'farkli' && <XCircle size={12} />}
                              {item.status === 'uyusuyor' ? 'Uyuşuyor' : item.status === 'vega_yok' ? 'Vega\'da Yok' : 'Fark Var'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: YENİ BEYANNAME YÜKLEME MODALİ */}
      <Modal
        open={isDecModalOpen}
        onClose={() => setIsDecModalOpen(false)}
        title="Yeni Beyanname & Tahakkuk Kaydı Ekle"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Firma</label>
            <select
              value={newDec.company}
              onChange={e => setNewDec({ ...newDec, company: e.target.value })}
              className="select"
            >
              <option value="marif">Marif Et Ürünleri</option>
              <option value="etik">Etik Et Ürünleri</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vergi Türü</label>
              <select
                value={newDec.tax_type}
                onChange={e => setNewDec({ ...newDec, tax_type: e.target.value })}
                className="select"
              >
                <option value="KDV">KDV Beyannamesi</option>
                <option value="Muhtasar">Muhtasar (Stopaj)</option>
                <option value="Geçici Vergi">Geçici Vergi</option>
                <option value="Kurumlar Vergisi">Kurumlar Vergisi</option>
                <option value="SGK">SGK Bildirgesi</option>
              </select>
            </div>
            <div>
              <label className="label">Dönem (Ay/Yıl)</label>
              <input
                type="text"
                placeholder="Örn: 2026-08"
                value={newDec.period}
                onChange={e => setNewDec({ ...newDec, period: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vergi Tutarı (TL)</label>
              <input
                type="number"
                placeholder="0.00"
                value={newDec.amount}
                onChange={e => setNewDec({ ...newDec, amount: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Son Ödeme Tarihi</label>
              <input
                type="date"
                value={newDec.due_date}
                onChange={e => setNewDec({ ...newDec, due_date: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Tahakkuk Dosyası (PDF)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={e => setNewDec({ ...newDec, file: e.target.files?.[0] || null })}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          
          <div className="border-t border-gray-150 pt-4 flex justify-end gap-3">
            <button
              onClick={() => setIsDecModalOpen(false)}
              className="btn-secondary px-4 py-2"
            >
              İptal
            </button>
            <button
              onClick={() => void handleCreateDeclaration()}
              disabled={decLoading}
              className="btn-primary px-6 py-2"
            >
              {decLoading ? <RefreshCw className="animate-spin" size={16} /> : 'Kaydet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: CARİ MUTABAKAT MEKTUBU MODALİ */}
      <Modal
        open={isMutModalOpen}
        onClose={() => setIsMutModalOpen(false)}
        title="BA/BS Mutabakat Mektubu Talebi"
        size="md"
      >
        {selectedMutabakat && (
          <div className="space-y-6">
            <div className="rounded-lg bg-gray-50 p-4 border border-gray-200 text-sm space-y-4 leading-6 select-none font-serif text-gray-800">
              <div className="text-center font-bold border-b border-gray-200 pb-2 mb-2 uppercase text-gray-900">
                BA/BS MUTABAKAT MEKTUBU
              </div>
              <div>
                <strong>Sayın Yetkili,</strong> ({selectedMutabakat.cari_name})
              </div>
              <p>
                Şirketimiz ile {selectedMutabakat.period} dönemine ait olan KDV hariç fatura alım/satım işlemlerimiz aşağıdaki gibidir:
              </p>
              <div className="pl-4 space-y-1">
                <div>• Mutabakat Türü: <strong>{selectedMutabakat.type === 'BA' ? 'BA (Alışlarımız)' : 'BS (Satışlarımız)'}</strong></div>
                <div>• Fatura Adedi: <strong>{selectedMutabakat.doc_count} Adet</strong></div>
                <div>• KDV Hariç Toplam Tutar: <strong>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(selectedMutabakat.total_amount)}</strong></div>
                <div>• Vergi Numaranız: <strong>{selectedMutabakat.tax_no}</strong></div>
              </div>
              <p>
                Kayıtlarınızın bizimle mutabık olup olmadığını kontrol ederek onaylamanızı rica ederiz.
              </p>
              <div className="text-right italic font-semibold text-xs text-gray-500">
                Amasya Et A.Ş. Mali İşler Bölümü
              </div>
            </div>

            <div className="border-t border-gray-150 pt-4 flex justify-end gap-3">
              <button
                onClick={() => setIsMutModalOpen(false)}
                className="btn-secondary px-4 py-2"
              >
                Kapat
              </button>
              <button
                onClick={() => void handleSendMutabakat()}
                disabled={sendingMut}
                className="btn-primary flex items-center gap-1.5 px-6 py-2"
              >
                {sendingMut ? (
                  <RefreshCw className="animate-spin" size={16} />
                ) : (
                  <Send size={16} />
                )}
                Mutabakat Talebini İmzala ve Gönder
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
