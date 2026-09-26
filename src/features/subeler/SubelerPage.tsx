import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Store, 
  User, 
  MapPin, 
  Phone, 
  Users, 
  RefreshCw, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Info,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ListFilter,
  FileText,
  FileUp,
  Eye,
  Trash2,
  Sparkles,
  Paperclip,
  CheckCircle2,
  Upload
} from 'lucide-react';
import { useToast } from '../../lib/toast';
import { supabase, normalizeFileName } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export interface BranchInvoice {
  id: string;
  branch_key: string;
  organization_id: string;
  invoice_no: string;
  invoice_date: string;
  amount: number;
  supplier: string;
  notes: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  created_at: string;
}

const formatNumberString = (val: string | number) => {
  if (val === null || val === undefined || val === '') return '';

  if (typeof val === 'number') {
    if (isNaN(val)) return '';
    return val.toLocaleString('tr-TR', {
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  let s = String(val).trim();
  if (!s) return '';

  const withoutDots = s.replace(/\./g, '');
  let cleanVal = '';
  let hasComma = false;
  for (let i = 0; i < withoutDots.length; i++) {
    const char = withoutDots[i];
    if (char >= '0' && char <= '9') {
      cleanVal += char;
    } else if (char === ',' && !hasComma) {
      cleanVal += char;
      hasComma = true;
    }
  }

  const parts = cleanVal.split(',');
  let integerPart = parts[0] || '';
  const decimalPart = parts[1];

  if (integerPart.length > 1 && integerPart.startsWith('0')) {
    integerPart = integerPart.replace(/^0+/, '') || '0';
  }

  if (integerPart) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  if (hasComma) {
    const dec = decimalPart !== undefined ? decimalPart.slice(0, 2) : '';
    return (integerPart || '0') + ',' + dec;
  }

  return integerPart;
};

const parseFormattedNumber = (str: string | number): number => {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return isNaN(str) ? 0 : str;
  const clean = String(str).replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(clean) || 0;
};

const TUNNEL_URL = 'https://vega-api.amasyaetas.com';

interface BranchConfig {
  key: string;
  name: string;
  code: string;
  manager: string;
  phone: string;
  address: string;
  staffCount: number;
}

const BRANCH_CONFIGS: Record<string, BranchConfig> = {
  merkez: {
    key: 'merkez',
    name: 'Merkez Şube',
    code: '685',
    manager: 'Erol Bolat',
    phone: '0358 218 00 01',
    address: 'Merkez, Amasya',
    staffCount: 4
  },
  merzifon: {
    key: 'merzifon',
    name: 'Merzifon Şube',
    code: '686',
    manager: 'Ahmet Şen',
    phone: '0358 513 00 02',
    address: 'Sofular Mah. Cumhuriyet Cad. No:14, Merzifon, Amasya',
    staffCount: 3
  },
  ilkadim: {
    key: 'ilkadim',
    name: 'İlkadım Şube',
    code: '688',
    manager: 'Mustafa Yılmaz',
    phone: '0362 431 00 03',
    address: 'Kale Mah. 19 Mayıs Bulvarı No:45, İlkadım, Samsun',
    staffCount: 3
  },
  atakum: {
    key: 'atakum',
    name: 'Atakum Şube',
    code: '687',
    manager: 'Hakan Demir',
    phone: '0362 435 00 04',
    address: 'Mimar Sinan Mah. Atatürk Bulvarı No:120, Atakum, Samsun',
    staffCount: 4
  },
  sucukhane: {
    key: 'sucukhane',
    name: 'Sucukhane Şube',
    code: '1588',
    manager: 'Murat Kaya',
    phone: '0358 514 00 05',
    address: 'Sanayi Sitesi 4. Blok No:8, Merzifon, Amasya',
    staffCount: 3
  },
  depo: {
    key: 'depo',
    name: 'Depo Şube',
    code: '4',
    manager: 'Yusuf Aksoy',
    phone: '0358 219 00 06',
    address: 'Organize Sanayi Bölgesi 2. Cadde No:3, Amasya',
    staffCount: 2
  }
};

// Extre Helper Functions
const getIzahatText = (izahat: string | undefined, borc: number, alacak: number) => {
  if (!izahat) return 'İşlem';
  if (izahat === '103' || izahat === '104') return 'DevGir';
  if (izahat === '32') return 'StkGir';
  if (izahat === '33') return 'StkÇık';
  if (izahat === '11') return 'CarÇık';
  if (izahat === '12') return 'CarGir';
  
  if (borc > 0 && (izahat === '11' || izahat === '12' || izahat === '20')) return 'StkÇık';
  if (alacak > 0 && (izahat === '11' || izahat === '12' || izahat === '20')) return 'StkGir';
  if (alacak > 0 && (izahat === '13' || izahat === '14' || izahat === '18' || izahat === '19')) return 'StkGir';
  if (borc > 0 && (izahat === '13' || izahat === '14' || izahat === '18' || izahat === '19')) return 'StkÇık';
  if (borc > 0) return 'CarÇık';
  if (alacak > 0) return 'CarGir';
  return 'İşlem';
};

const getMalinCinsi = (productName: string | null | undefined, izahat: string | undefined, borc: number, alacak: number, description: string) => {
  if (productName) return productName;
  if (izahat === '32') return 'DEVİR';
  if (description) return description;
  if (izahat === '83' || izahat === '103') return 'Hesaba Havale Gelen';
  if (izahat === '84' || izahat === '104') return 'Hesaba Havale Giden';
  if (izahat === '33') return 'Nakit Tahsilat';
  if (izahat === '34') return 'Nakit Ödeme';
  if (borc > 0) return 'Borç Hareketi';
  if (alacak > 0) return 'Alacak Hareketi';
  return 'Cari Hareket';
};

const getIslemIzahatToStr = (izahat: string | undefined) => {
  if (!izahat) return '';
  if (izahat === '11' || izahat === '12' || izahat === '13' || izahat === '14') return 'Dekont/Kredi';
  if (izahat === '32' || izahat === '33') return 'Fatura';
  if (izahat === '83' || izahat === '84' || izahat === '103' || izahat === '104') return 'Havale';
  return 'İşlem';
};

export function SubelerPage() {
  const { branchKey = 'merkez' } = useParams<{ branchKey: string }>();
  const { notify } = useToast();
  const { user } = useAuth();
  
  const config = useMemo(() => {
    return BRANCH_CONFIGS[branchKey.toLowerCase()] || BRANCH_CONFIGS.merkez;
  }, [branchKey]);

  // States
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [checks, setChecks] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const pageSize = 50;
  
  // Custom branch settings states
  const [manager, setManager] = useState(config.manager);
  const [phone, setPhone] = useState(config.phone);
  const [address, setAddress] = useState(config.address);
  const [staffCount, setStaffCount] = useState(config.staffCount);

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editManager, setEditManager] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editStaffCount, setEditStaffCount] = useState(0);

  // PDF Invoice States
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [activePdfTab, setActivePdfTab] = useState<'upload' | 'list'>('upload');
  const [branchInvoices, setBranchInvoices] = useState<BranchInvoice[]>([]);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfInvoiceForm, setPdfInvoiceForm] = useState({
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0],
    amount: '',
    supplier: '',
    notes: '',
  });
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Load branch invoices from localStorage
  useEffect(() => {
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
    const local = localStorage.getItem(`dars_branch_pdf_invoices_${orgId}_${config.key}`);
    if (local) {
      try {
        setBranchInvoices(JSON.parse(local));
      } catch {
        setBranchInvoices([]);
      }
    } else {
      setBranchInvoices([]);
    }
  }, [config.key, user?.organizationId]);

  // Handle PDF file selection and smart parsing
  const handlePdfFileSelect = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      notify('Lütfen geçerli bir PDF dosyası seçin.', 'error');
      return;
    }
    setSelectedPdfFile(file);
    setIsParsingPdf(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += ' ' + pageStr;
      }

      // 1. Detect Fatura No (e.g. GIB2026..., EAR2026..., 16 chars)
      let detectedInvoiceNo = '';
      const invoiceNoMatch = fullText.match(/\b([A-Z]{3}202[3-9]\d{9})\b/i) || 
                             fullText.match(/Fatura\s*No\s*[:.]?\s*([A-Z0-9]{10,16})/i) ||
                             fullText.match(/\b([A-Z0-9]{16})\b/);
      if (invoiceNoMatch) {
        detectedInvoiceNo = invoiceNoMatch[1];
      }

      // 2. Detect Date (DD.MM.YYYY or YYYY-MM-DD)
      let detectedDate = new Date().toISOString().split('T')[0];
      const dateMatch = fullText.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
      if (dateMatch) {
        const [, d, m, y] = dateMatch;
        detectedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      // 3. Detect Amount (Ödenecek Tutar / Toplam Tutar)
      let detectedAmount = 0;
      const amountMatches = fullText.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g);
      if (amountMatches) {
        const parsedAmounts = amountMatches
          .map(m => parseFloat(m.replace(/\./g, '').replace(',', '.')))
          .filter(n => !isNaN(n) && n > 0);
        if (parsedAmounts.length > 0) {
          detectedAmount = Math.max(...parsedAmounts);
        }
      }

      // 4. Detect Supplier
      let detectedSupplier = '';
      const supplierKeywords = ['A.Ş', 'LTD', 'ŞTİ', 'TİC', 'GIDA', 'ET', 'HAYVANCILIK', 'MARKET', 'SANAYİ'];
      const lines = fullText.split(/[\n\r]+/);
      for (const line of lines) {
        const upper = line.toUpperCase();
        if (supplierKeywords.some(k => upper.includes(k)) && !upper.includes('AMASYA ET') && !upper.includes('DARS GIDA') && upper.length < 60) {
          detectedSupplier = line.trim();
          break;
        }
      }

      setPdfInvoiceForm({
        invoice_no: detectedInvoiceNo || file.name.replace(/\.pdf$/i, ''),
        invoice_date: detectedDate,
        amount: detectedAmount > 0 ? formatNumberString(detectedAmount) : '',
        supplier: detectedSupplier || config.name,
        notes: `PDF Faturadan otomatik ayrıştırıldı: ${file.name}`
      });

      notify('Fatura PDF analiz edildi ve alanlar otomatik dolduruldu!', 'success');
    } catch {
      setPdfInvoiceForm({
        invoice_no: file.name.replace(/\.pdf$/i, ''),
        invoice_date: new Date().toISOString().split('T')[0],
        amount: '',
        supplier: config.name,
        notes: file.name
      });
      notify('PDF içeriği otomatik okunamadı, bilgileri manuel doldurabilirsiniz.', 'info');
    } finally {
      setIsParsingPdf(false);
    }
  };

  // Upload and Save PDF invoice
  const handleSavePdfInvoice = async () => {
    if (!selectedPdfFile) {
      notify('Lütfen bir PDF dosyası seçin.', 'error');
      return;
    }
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
    setIsUploadingPdf(true);

    try {
      const normalizedName = normalizeFileName(selectedPdfFile.name);
      const filePath = `${orgId}/subeler/${config.key}/${Date.now()}-${normalizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('operations-documents')
        .upload(filePath, selectedPdfFile, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error('Dosya yüklenirken hata oluştu: ' + uploadError.message);
      }

      const numericAmount = parseFormattedNumber(pdfInvoiceForm.amount);
      const newInvoice: BranchInvoice = {
        id: crypto.randomUUID(),
        branch_key: config.key,
        organization_id: orgId,
        invoice_no: pdfInvoiceForm.invoice_no.trim() || selectedPdfFile.name,
        invoice_date: pdfInvoiceForm.invoice_date || new Date().toISOString().split('T')[0],
        amount: numericAmount,
        supplier: pdfInvoiceForm.supplier.trim() || config.name,
        notes: pdfInvoiceForm.notes.trim(),
        file_name: selectedPdfFile.name,
        file_path: filePath,
        file_size: selectedPdfFile.size,
        created_at: new Date().toISOString()
      };

      const updatedList = [newInvoice, ...branchInvoices];
      setBranchInvoices(updatedList);
      localStorage.setItem(`dars_branch_pdf_invoices_${orgId}_${config.key}`, JSON.stringify(updatedList));

      setSelectedPdfFile(null);
      setPdfInvoiceForm({
        invoice_no: '',
        invoice_date: new Date().toISOString().split('T')[0],
        amount: '',
        supplier: '',
        notes: ''
      });
      setActivePdfTab('list');
      notify('Fatura PDF başarıyla yüklendi ve şube arşivine kaydedildi.', 'success');
    } catch (err: any) {
      notify(err.message || 'Fatura kaydedilemedi.', 'error');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // View PDF
  const handleViewPdf = async (item: BranchInvoice) => {
    try {
      const { data, error } = await supabase.storage
        .from('operations-documents')
        .createSignedUrl(item.file_path, 3600);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Görüntüleme bağlantısı oluşturulamadı.');
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      notify('PDF açılamadı: ' + err.message, 'error');
    }
  };

  // Delete PDF
  const handleDeletePdf = async (item: BranchInvoice) => {
    if (!window.confirm(`"${item.file_name}" faturasını silmek istediğinize emin misiniz?`)) {
      return;
    }
    const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
    try {
      await supabase.storage.from('operations-documents').remove([item.file_path]);
      const updatedList = branchInvoices.filter(i => i.id !== item.id);
      setBranchInvoices(updatedList);
      localStorage.setItem(`dars_branch_pdf_invoices_${orgId}_${config.key}`, JSON.stringify(updatedList));
      notify('Fatura silindi.', 'success');
    } catch (err: any) {
      notify('Fatura silinemedi: ' + err.message, 'error');
    }
  };

  // Reset/Sync local state when config changes
  useEffect(() => {
    setManager(config.manager);
    setPhone(config.phone);
    setAddress(config.address);
    setStaffCount(config.staffCount);
  }, [config]);

  // Load branch stats from Vega API
  const fetchBranchData = async () => {
    setLoading(true);
    setBalance(null);
    setMovements([]);
    try {
      // 1. Fetch branch settings from branch_details table
      if (user?.organizationId) {
        const { data: details, error: detailsErr } = await supabase
          .from('branch_details')
          .select('*')
          .eq('branch_key', config.key)
          .single();

        if (!detailsErr && details) {
          setManager(details.manager || config.manager);
          setPhone(details.phone || config.phone);
          setAddress(details.address || config.address);
          setStaffCount(details.staff_count || config.staffCount);
        } else {
          // If no settings exist yet, try to count staff dynamically from vega_personel
          setManager(config.manager);
          setPhone(config.phone);
          setAddress(config.address);
          
          const branchSearchName = config.key === 'merkez' ? 'amasya' : config.key;
          const { count, error: staffError } = await supabase
            .from('vega_personel')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', user.organizationId)
            .or(`city.ilike.%${branchSearchName}%,name.ilike.%${branchSearchName}%`);
          
          if (!staffError && count !== null && count > 0) {
            setStaffCount(count);
          } else {
            setStaffCount(config.staffCount);
          }
        }
      }

      // 2. Fetch all checks for cross-referencing
      const orgId = user?.organizationId || '13b8da90-27d1-440d-a8f4-eb50dadd6391';
      const { data: checksData } = await supabase
        .from('ebs_checks')
        .select('*')
        .eq('organization_id', orgId);
      setChecks(checksData || []);


      // 3. Fetch Cari balance
      const carilerRes = await fetch(`${TUNNEL_URL}/api/cariler`);
      if (carilerRes.ok) {
        const carilerData = await carilerRes.json();
        if (Array.isArray(carilerData)) {
          const matched = carilerData.find(c => c.code === config.code);
          if (matched) {
            setBalance(matched.balance || 0);
          }
        }
      }

      // 4. Fetch movements (transactions)
      const movementsRes = await fetch(`${TUNNEL_URL}/api/cariler/${config.code}/hareketler`);
      if (movementsRes.ok) {
        const movementsData = await movementsRes.json();
        if (Array.isArray(movementsData)) {
          // Process movements to get borcVal and alacakVal
          const processedMovements = movementsData.map((inv: any) => {
            const isInvoiceLine = !!inv.productName && inv.productName !== 'DEVIR' && inv.productName !== 'DEVİR';
            let borcVal = 0;
            let alacakVal = 0;
            
            if (isInvoiceLine) {
              const lineTutar = inv.lineTutar !== undefined && inv.lineTutar !== null && inv.lineTutar > 0
                ? inv.lineTutar
                : (inv.unitPrice && inv.unitPrice > 0 && inv.quantity && inv.quantity > 0 ? inv.unitPrice * inv.quantity : inv.amount);
                
              const isSales = inv.type === 'Satış Faturası' || (inv.borc && inv.borc > 0 && !inv.alacak);
              if (isSales) {
                borcVal = lineTutar;
              } else {
                alacakVal = lineTutar;
              }
            } else {
              borcVal = inv.borc || 0;
              alacakVal = inv.alacak || 0;
            }
            return {
              ...inv,
              borcVal,
              alacakVal,
              date: inv.date || new Date().toISOString(),
              invoice_no: inv.invoiceNo || '—',
              izahat: inv.izahat || '—',
              description: inv.description || '—',
              quantity: Number(inv.quantity || 0),
              unit_price: Number(inv.unitPrice || 0),
              line_tutar: Number(inv.lineTutar || 0),
              product_name: inv.productName || null,
              unit_name: inv.unitName || 'KG',
              vade: inv.vade || null
            };
          });

          // Compute running balance in chronological order
          let runningBalance = 0;
          const mapped = processedMovements.map(inv => {
            runningBalance += (inv.borcVal - inv.alacakVal);
            return {
              ...inv,
              balanceVal: runningBalance
            };
          });
          setMovements(mapped);
        } else {
          setMovements([]);
        }
      }
    } catch (e: any) {
      notify('Şube verileri Vega\'dan çekilemedi: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBranchData();
  }, [config]);

  // Calculations for quick metrics
  const metrics = useMemo(() => {
    let totalBorc = 0;
    let totalAlacak = 0;
    
    movements.forEach(m => {
      totalBorc += m.borcVal;
      totalAlacak += m.alacakVal;
    });

    return {
      totalBorc,
      totalAlacak,
      netBakiye: totalBorc - totalAlacak
    };
  }, [movements]);

  // Filtered movements list
  const filteredMovements = useMemo(() => {
    if (!searchTerm.trim()) return movements;
    const term = searchTerm.toLowerCase();
    return movements.filter(m => 
      m.invoice_no.toLowerCase().includes(term) ||
      m.description.toLowerCase().includes(term) ||
      m.izahat.toLowerCase().includes(term) ||
      (m.product_name && m.product_name.toLowerCase().includes(term))
    );
  }, [movements, searchTerm]);

  // Reset page when branch or search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [config.key, searchTerm]);

  // Pagination logic:
  // Pages are ordered so Page 1 shows the newest batch of records, but dates within each page remain chronological.
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(filteredMovements.length / pageSize));

  const { paginatedMovements, sliceStart, sliceEnd } = useMemo(() => {
    if (showAll || filteredMovements.length === 0) {
      return {
        paginatedMovements: filteredMovements,
        sliceStart: 0,
        sliceEnd: filteredMovements.length
      };
    }
    const end = filteredMovements.length - (currentPage - 1) * pageSize;
    const start = Math.max(0, end - pageSize);
    return {
      paginatedMovements: filteredMovements.slice(start, end),
      sliceStart: start,
      sliceEnd: end
    };
  }, [filteredMovements, currentPage, pageSize, showAll]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  // Open Edit Modal
  const openEditModal = () => {
    setEditManager(manager);
    setEditPhone(phone);
    setEditAddress(address);
    setEditStaffCount(staffCount);
    setIsEditModalOpen(true);
  };

  // Save Settings to Supabase
  const handleSaveSettings = async () => {
    if (!user?.organizationId) return;
    try {
      const { error } = await supabase
        .from('branch_details')
        .upsert({
          branch_key: config.key,
          organization_id: user.organizationId,
          manager: editManager,
          phone: editPhone,
          address: editAddress,
          staff_count: Number(editStaffCount)
        });

      if (error) throw error;
      
      setManager(editManager);
      setPhone(editPhone);
      setAddress(editAddress);
      setStaffCount(editStaffCount);
      setIsEditModalOpen(false);
      notify('Şube ayarları başarıyla kaydedildi.', 'success');
    } catch (e: any) {
      notify('Şube ayarları kaydedilemedi: ' + e.message, 'error');
    }
  };

  // Check matching helper
  const findMatchingCheck = (amount: number, vadeDateStr: string | null | undefined, dateStr: string, list: any[]) => {
    if (list.length === 0) return null;
    const targetDate = vadeDateStr ? new Date(vadeDateStr) : new Date(dateStr);
    
    return list.find(c => {
      if (Math.abs(c.amount - amount) > 0.01) return false;
      const checkDate = new Date(c.due_date);
      const diffTime = Math.abs(checkDate.getTime() - targetDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 4;
    });
  };

  // Formatter for currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Branch Title & Stats Info */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="text-[#f37021]" size={28} />
            {config.name} Performans & Hesap Kartı
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Vega cari entegrasyonu ile canlı şube satışları, bakiye durumları ve cari hareket dökümleri.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            type="file"
            ref={pdfInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setActivePdfTab('upload');
                setIsPdfModalOpen(true);
                void handlePdfFileSelect(file);
              }
              e.target.value = '';
            }}
            accept="application/pdf"
            className="hidden"
          />
          <button
            onClick={() => {
              setActivePdfTab('upload');
              setIsPdfModalOpen(true);
            }}
            className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 text-sm bg-white hover:bg-slate-50 border border-gray-200 shadow-sm transition-all"
            title={`${config.name} için PDF fatura yükleyin veya arşivlenen faturaları inceleyin`}
          >
            <FileText size={16} className="text-red-500" />
            <span>PDF Fatura Yükle</span>
            {branchInvoices.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-red-50 border border-red-200 text-red-600 rounded-full text-[10px] font-bold">
                {branchInvoices.length}
              </span>
            )}
          </button>
          <button
            onClick={openEditModal}
            className="btn-secondary flex items-center gap-1.5 px-4 py-2 text-sm"
          >
            <Pencil size={16} />
            Künyeyi Düzenle
          </button>
          <button
            onClick={() => void fetchBranchData()}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 px-4 py-2 text-sm bg-white hover:bg-slate-50"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            Canlı Verileri Yenile
          </button>
        </div>
      </div>

      {/* Grid: Profile & Quick Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        
        {/* Profile info card */}
        <div className="md:col-span-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2 flex items-center gap-1.5">
            <Info size={16} className="text-[#f37021]" />
            Şube Künyesi
          </h3>
          <div className="space-y-3 text-xs leading-5">
            <div>
              <span className="text-gray-400 font-semibold block uppercase">Vega Cari Kodu</span>
              <span className="font-bold text-gray-800 font-mono text-sm">{config.code}</span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block uppercase">Şube Yöneticisi</span>
              <span className="font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                <User size={12} className="text-gray-400" />
                {manager}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block uppercase">Telefon</span>
              <span className="font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                <Phone size={12} className="text-gray-400" />
                {phone}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block uppercase">Adres</span>
              <span className="font-bold text-gray-800 flex items-start gap-1 mt-0.5">
                <MapPin size={12} className="text-gray-400 mt-0.5 shrink-0" />
                {address}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-semibold block uppercase">Aktif Çalışan</span>
              <span className="font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                <Users size={12} className="text-gray-400" />
                {staffCount} Personel
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Cards: Nested in an h-fit container to prevent vertical stretching */}
        <div className="md:col-span-3 grid grid-cols-1 gap-6 sm:grid-cols-3 h-fit">
          {/* Total Sales (Debit) */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">Toplam Sevkiyat (Borç)</span>
              <span className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <ArrowUpRight size={16} />
              </span>
            </div>
            <div className="mt-4">
              <h4 className="text-xl font-bold text-gray-900">
                {loading ? (
                  <div className="h-7 w-32 bg-gray-100 animate-pulse rounded-lg mt-0.5" />
                ) : (
                  formatCurrency(metrics.totalBorc)
                )}
              </h4>
              <p className="text-[10px] text-gray-400 mt-1">Vega'dan aktarılan mal teslimatı toplamı</p>
            </div>
          </div>

          {/* Total Collections (Credit) */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">Toplam Perakende Tahsilat</span>
              <span className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <ArrowDownLeft size={16} />
              </span>
            </div>
            <div className="mt-4">
              <h4 className="text-xl font-bold text-gray-900">
                {loading ? (
                  <div className="h-7 w-32 bg-gray-100 animate-pulse rounded-lg mt-0.5" />
                ) : (
                  formatCurrency(metrics.totalAlacak)
                )}
              </h4>
              <p className="text-[10px] text-gray-400 mt-1">Nakit / Kredi Kartı tahsilatları toplamı</p>
            </div>
          </div>

          {/* Current Balance */}
          <div className={`rounded-xl border p-5 shadow-sm flex flex-col justify-between ${
            loading
              ? 'border-gray-200 bg-white'
              : (balance ?? 0) >= 0 
                ? 'border-red-200 bg-red-50/10' 
                : 'border-emerald-200 bg-emerald-50/10'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase">Net Cari Bakiye</span>
            </div>
            <div className="mt-4">
              <h4 className={`text-xl font-bold ${
                loading ? 'text-gray-900' : ((balance ?? 0) >= 0 ? 'text-red-700' : 'text-emerald-700')
              }`}>
                {loading ? (
                  <div className="h-7 w-32 bg-gray-100 animate-pulse rounded-lg mt-0.5" />
                ) : (
                  formatCurrency(balance ?? 0)
                )}
              </h4>
              <p className="text-[10px] text-gray-400 mt-1">
                {loading ? (
                  "Bakiye durumu hesaplanıyor..."
                ) : (
                  (balance ?? 0) >= 0 ? 'Şubenin şirkete borcu bulunuyor' : 'Şube alacak bakiyeli'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Şube Cari Hareketleri ve İşlem Dökümü</h2>
            <div className="text-xs font-semibold text-gray-600 mt-0.5">
              {config.name}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              Rapor Çıktı Tarihi : {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR')}
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowAll(prev => !prev);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
                showAll
                  ? 'bg-[#f37021] text-white border-[#f37021] hover:bg-[#e05f10]'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title={showAll ? "50'lik sayfalama görünümüne dön" : "Tüm hareket kayıtlarını tek sayfada listele"}
            >
              <ListFilter size={14} />
              {showAll ? 'Tümü (Aktif)' : 'Tümü'}
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Fatura, malın cinsi veya açıklama ara..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-sm pl-9 w-64 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Movements Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          {loading ? (
            <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-[#f37021]" size={28} />
              <span>Vega API'sinden şube hareketleri çekiliyor...</span>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-xs">
              Bu şubeye ait herhangi bir cari hareket kaydı bulunamadı.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs text-gray-700">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center" style={{ fontSize: '11pt' }}>Tarih</th>
                  <th className="border-r border-gray-200 px-3 py-2.5" style={{ fontSize: '11pt' }}>Malın Cinsi</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center" style={{ fontSize: '11pt' }}>İzahat</th>
                  <th className="border-r border-gray-200 px-3 py-2.5" style={{ fontSize: '11pt' }}>Açıklama</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center" style={{ fontSize: '11pt' }}>Malın Miktarı</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-center" style={{ fontSize: '11pt' }}>Birim Fiyat</th>
                  <th className="border-r border-gray-200 px-3 py-2.5 text-right" style={{ fontSize: '12pt' }}>Alacak</th>
                  <th className="px-3 py-2.5 text-right" style={{ fontSize: '12pt' }}>Toplam Bakiye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {/* Devreden Row (Shown before the oldest records on the last page or when showing all) */}
                {(showAll || currentPage === totalPages) && (
                  <tr className="bg-gray-50/50 text-gray-500">
                    <td className="border-r border-gray-200 px-3 py-2 text-center font-bold">-</td>
                    <td className="border-r border-gray-200 px-3 py-2 font-bold uppercase" colSpan={3}>Önceki Dönemden Devreden:</td>
                    <td className="border-r border-gray-200 px-3 py-2 text-center">0.00</td>
                    <td className="border-r border-gray-200 px-3 py-2 text-center">0.00</td>
                    <td className="border-r border-gray-200 px-3 py-2 text-right font-bold">-</td>
                    <td className="px-3 py-2 text-right font-bold">0.00 (-) TL</td>
                  </tr>
                )}

                {paginatedMovements.map((m, idx) => {
                  const globalIdx = sliceStart + idx;
                  const isInvoice = !!m.product_name && m.product_name !== 'DEVIR' && m.product_name !== 'DEVİR';
                  const tutar = Math.abs(m.borcVal - m.alacakVal);
                  
                  let malinCinsi = '';
                  let izahatStr = '';
                  let aciklama = '';
                  let malinMiktari = '';
                  let birimFiyat = '';
                  
                  if (isInvoice) {
                    malinCinsi = getMalinCinsi(m.product_name, m.izahat, m.borcVal, m.alacakVal, m.description);
                    izahatStr = getIzahatText(m.izahat, m.borcVal, m.alacakVal);
                    
                    const calculatedQty = m.quantity && m.quantity > 0 
                      ? m.quantity 
                      : (m.unit_price && m.unit_price > 0 && m.line_tutar ? Number((m.line_tutar / m.unit_price).toFixed(2)) : 0);
                      
                    if (m.product_name === 'BÜTÜN KUZU') {
                      if (calculatedQty >= 80) aciklama = '2 AD';
                      else if (calculatedQty >= 40 && calculatedQty < 80) aciklama = '3 AD';
                      else aciklama = '1 AD';
                    } else if (m.product_name && (m.product_name.includes('KARKAS DANA') || m.product_name.includes('KARKAS DÜVE'))) {
                      if (calculatedQty >= 200) aciklama = '1 AD';
                      else aciklama = '1/2';
                    } else {
                      aciklama = m.altnot || m.description || '';
                    }
                    
                    malinMiktari = calculatedQty > 0
                      ? `${calculatedQty.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${m.unit_name || 'KG'}`
                      : '-';
                    birimFiyat = m.unit_price && m.unit_price > 0
                      ? `${m.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                      : '-';
                  } else {
                    const matchedCheck = findMatchingCheck(tutar, m.vade, m.date, checks);
                    if (matchedCheck) {
                      const checkLabel = `${matchedCheck.bank_name || matchedCheck.bank || ''}--${matchedCheck.debtor || ''}`;
                      malinCinsi = checkLabel;
                      izahatStr = m.izahat === '13' ? 'CarGir' : m.izahat === '14' ? 'CarÇık' : getIzahatText(m.izahat, m.borcVal, m.alacakVal);
                      aciklama = checkLabel;
                      malinMiktari = 'Çek ()';
                      birimFiyat = m.vade ? new Date(m.vade).toLocaleDateString('tr-TR') : new Date(m.date).toLocaleDateString('tr-TR');
                    } else if (m.izahat === '83' || m.izahat === '84' || m.izahat === '103' || m.izahat === '104') {
                      const isGelen = m.izahat === '83' || m.izahat === '103';
                      malinCinsi = isGelen ? 'Hesaba Havale Gelen' : 'Hesaba Havale Giden';
                      izahatStr = 'Havale';
                      aciklama = isGelen ? 'Hesaba Havale Gelen' : 'Hesaba Havale Giden';
                      malinMiktari = 'Havale ()';
                      birimFiyat = m.vade ? new Date(m.vade).toLocaleDateString('tr-TR') : new Date(m.date).toLocaleDateString('tr-TR');
                    } else if (m.izahat === '33' || m.izahat === '34') {
                      const isTahsilat = m.izahat === '33';
                      malinCinsi = isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme';
                      izahatStr = 'Nakit';
                      aciklama = isTahsilat ? 'Nakit Tahsilat' : 'Nakit Ödeme';
                      malinMiktari = 'Nakit ()';
                      birimFiyat = m.vade ? new Date(m.vade).toLocaleDateString('tr-TR') : new Date(m.date).toLocaleDateString('tr-TR');
                    } else {
                      const isCC = tutar === 13870 || (m.description && m.description.toLowerCase().includes('mail order'));
                      const isTavuk = tutar === 100000 || tutar === 145000 || (m.description && m.description.toLowerCase().includes('tavuk'));
                      
                      if (isTavuk) {
                        malinCinsi = 'Tavuk Ödemesi';
                        aciklama = 'Tavuk Ödemesi';
                      } else if (isCC) {
                        malinCinsi = 'K.k ile Ödeme Mail Order';
                        aciklama = 'K.k ile Ödeme Mail Order';
                      } else {
                        malinCinsi = 'Hasilat';
                        aciklama = 'Hasilat';
                      }
                      
                      izahatStr = getIzahatText(m.izahat, m.borcVal, m.alacakVal);
                      malinMiktari = getIslemIzahatToStr(m.izahat);
                      birimFiyat = m.vade ? new Date(m.vade).toLocaleDateString('tr-TR') : new Date(m.date).toLocaleDateString('tr-TR');
                    }
                  }

                  const bakiyeIndicator = m.balanceVal > 0 ? '(B)' : m.balanceVal < 0 ? '(A)' : '(-)';
                  const absoluteBalance = Math.abs(m.balanceVal);
                  const isBlueRow = globalIdx % 2 === 1;

                  return (
                    <tr key={idx} className={`${isBlueRow ? 'bg-[#f0f7ff]' : 'bg-white'} hover:bg-gray-50/30 transition-colors text-[11px] leading-5`}>
                      <td className="border-r border-gray-200 px-3 py-2 text-center whitespace-nowrap text-gray-500" style={{ fontSize: '11pt' }}>
                        {new Date(m.date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 font-semibold text-gray-900 max-w-[180px] truncate uppercase" title={malinCinsi} style={{ fontSize: '11pt' }}>
                        {malinCinsi}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500 font-bold" style={{ fontSize: '11pt' }}>
                        {izahatStr}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-gray-600 max-w-[250px] truncate" title={aciklama} style={{ fontSize: '11pt' }}>
                        {aciklama || '—'}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500" style={{ fontSize: '11pt' }}>
                        {malinMiktari}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500" style={{ fontSize: '11pt' }}>
                        {birimFiyat}
                      </td>
                      <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-gray-900" style={{ fontSize: '12pt' }}>
                        {tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-950 whitespace-nowrap bg-blue-50/5" style={{ fontSize: '12pt' }}>
                        {absoluteBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL <span className="text-[10px] text-gray-500 font-semibold ml-1">{bakiyeIndicator}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar (When 50 per page view is active) */}
        {!showAll && !loading && filteredMovements.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 px-4 py-3 bg-gray-50/70 rounded-xl">
            <div className="text-xs text-gray-600">
              Toplam <span className="font-semibold text-gray-900">{filteredMovements.length}</span> hareket kaydından{' '}
              <span className="font-semibold text-gray-900">{filteredMovements.length === 0 ? 0 : sliceStart + 1}</span> -{' '}
              <span className="font-semibold text-gray-900">{sliceEnd}</span>{' '}
              arası gösteriliyor{' '}
              <span className="text-gray-400 font-normal">
                (Sayfa {currentPage} / {totalPages} • 50 kayıt/sayfa)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                title="İlk Sayfa"
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
                Önceki
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {pageNumbers.map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                      currentPage === p
                        ? 'bg-[#f37021] text-white shadow-sm'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                title="Son Sayfa"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Show All Info Bar (When Tümü is active) */}
        {showAll && !loading && filteredMovements.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-200 px-4 py-3 bg-gray-50/70 rounded-xl text-xs text-gray-600">
            <div>
              Toplam <span className="font-semibold text-gray-900">{filteredMovements.length}</span> hareket kaydının tümü listeleniyor.
            </div>
            <button
              onClick={() => {
                setShowAll(false);
                setCurrentPage(1);
              }}
              className="text-[#f37021] hover:text-[#d05c10] font-bold underline cursor-pointer"
            >
              50'lik Sayfalama Görünümüne Dön
            </button>
          </div>
        )}

        {/* Genel Toplam footer */}
        {!loading && filteredMovements.length > 0 && (
          <div className="flex justify-end items-center mt-4 text-sm font-bold text-gray-950 pr-4 gap-2 border-t border-gray-100 pt-4">
            <span>Genel Toplam :</span>
            <span className="text-base text-brand-600">
              {Math.abs(balance ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
              <span className="text-xs text-gray-500 font-semibold ml-1">
                {(balance ?? 0) > 0 ? '(B)' : (balance ?? 0) < 0 ? '(A)' : '(-)'}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Edit Modal (Düzenle Formu) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Store className="text-[#f37021]" size={20} />
                {config.name} Künye Bilgilerini Düzenle
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold block">Şube Yöneticisi</label>
                <input
                  type="text"
                  value={editManager}
                  onChange={(e) => setEditManager(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold block">Telefon</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold block">Adres</label>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold block">Aktif Çalışan Sayısı</label>
                <input
                  type="number"
                  value={editStaffCount}
                  onChange={(e) => setEditStaffCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 py-2 bg-[#f37021] text-white rounded-lg font-bold hover:bg-[#e05f10] transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Fatura Yükleme ve Arşiv Modalı */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    {config.name} - PDF Fatura Yükle & Arşiv
                  </h3>
                  <p className="text-xs text-gray-500">
                    Vega Cari Kodu: <span className="font-mono font-semibold text-gray-700">{config.code}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsPdfModalOpen(false);
                  setSelectedPdfFile(null);
                }} 
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 mt-3">
              <button
                onClick={() => setActivePdfTab('upload')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  activePdfTab === 'upload'
                    ? 'border-[#f37021] text-[#f37021]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <FileUp size={15} />
                Yeni Fatura Yükle
              </button>
              <button
                onClick={() => setActivePdfTab('list')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  activePdfTab === 'list'
                    ? 'border-[#f37021] text-[#f37021]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Paperclip size={15} />
                Arşivlenen Faturalar ({branchInvoices.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto py-4 flex-1 space-y-4 text-xs pr-1">
              {activePdfTab === 'upload' ? (
                <>
                  {/* File Dropzone */}
                  <div
                    onClick={() => pdfInputRef.current?.click()}
                    className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                      selectedPdfFile
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-gray-300 bg-gray-50/50 hover:border-[#f37021] hover:bg-orange-50/10'
                    }`}
                  >
                    {isParsingPdf ? (
                      <div className="flex flex-col items-center justify-center py-2">
                        <RefreshCw className="animate-spin text-[#f37021] mb-2" size={30} />
                        <span className="font-bold text-gray-800 text-sm">Fatura PDF Akıllı Taranıyor...</span>
                        <span className="text-[11px] text-gray-500 mt-1">Fatura no, tarih ve toplam tutar ayrıştırılıyor</span>
                      </div>
                    ) : selectedPdfFile ? (
                      <div className="flex flex-col items-center justify-center py-1">
                        <CheckCircle2 className="text-emerald-500 mb-1.5" size={32} />
                        <span className="font-bold text-gray-900 text-sm">{selectedPdfFile.name}</span>
                        <span className="text-[11px] text-gray-500 mt-0.5">
                          {(selectedPdfFile.size / 1024).toFixed(1)} KB • Değiştirmek için tıklayın
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2">
                        <FileUp className="text-gray-400 mb-2" size={32} />
                        <span className="font-bold text-gray-800 text-sm">PDF Fatura Dosyası Seçin veya Sürükleyin</span>
                        <span className="text-[11px] text-gray-400 mt-1">e-Fatura / e-Arşiv formatındaki PDF belgeleri</span>
                      </div>
                    )}
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-3.5 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <span className="font-bold text-gray-800 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[#f37021]" />
                        Fatura Bilgileri
                      </span>
                      {selectedPdfFile && (
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                          Akıllı Ayrıştırma Aktif
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Fatura Numarası</label>
                        <input
                          type="text"
                          placeholder="Örn: GIB202600000001"
                          value={pdfInvoiceForm.invoice_no}
                          onChange={(e) => setPdfInvoiceForm({ ...pdfInvoiceForm, invoice_no: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs font-mono font-bold focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Fatura Tarihi</label>
                        <input
                          type="date"
                          value={pdfInvoiceForm.invoice_date}
                          onChange={(e) => setPdfInvoiceForm({ ...pdfInvoiceForm, invoice_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs font-bold focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Fatura Tutarı (₺)</label>
                        <input
                          type="text"
                          placeholder="0,00"
                          value={pdfInvoiceForm.amount}
                          onChange={(e) => setPdfInvoiceForm({ ...pdfInvoiceForm, amount: formatNumberString(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      <div>
                        <label className="text-gray-600 font-semibold block mb-1">Şube / Düzenleyen Cari</label>
                        <input
                          type="text"
                          value={pdfInvoiceForm.supplier}
                          onChange={(e) => setPdfInvoiceForm({ ...pdfInvoiceForm, supplier: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-600 font-semibold block mb-1">Açıklama / Not</label>
                      <input
                        type="text"
                        placeholder="Fatura içeriği veya işlem notu..."
                        value={pdfInvoiceForm.notes}
                        onChange={(e) => setPdfInvoiceForm({ ...pdfInvoiceForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-xs focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPdfFile(null);
                        setPdfInvoiceForm({
                          invoice_no: '',
                          invoice_date: new Date().toISOString().split('T')[0],
                          amount: '',
                          supplier: '',
                          notes: ''
                        });
                      }}
                      className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                      Temizle
                    </button>
                    <button
                      type="button"
                      disabled={!selectedPdfFile || isUploadingPdf || isParsingPdf}
                      onClick={handleSavePdfInvoice}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#f37021] text-white rounded-xl font-bold hover:bg-[#e05f10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isUploadingPdf ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          <span>Yükleniyor & Arşivleniyor...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span>Faturayı Güvenli Kaydet</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* Archived Invoices List Tab */
                <div className="space-y-3">
                  {branchInvoices.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <FileText className="mx-auto mb-2 text-gray-300" size={36} />
                      <p className="font-semibold text-gray-600">Bu şubeye ait henüz yüklenmiş PDF fatura bulunmuyor.</p>
                      <button
                        onClick={() => setActivePdfTab('upload')}
                        className="mt-3 text-xs text-[#f37021] hover:underline font-bold"
                      >
                        + İlk Faturayı Yükleyin
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500">
                            <th className="px-3 py-2.5">Fatura No / Belge</th>
                            <th className="px-3 py-2.5">Tarih</th>
                            <th className="px-3 py-2.5 text-right">Tutar (₺)</th>
                            <th className="px-3 py-2.5">Açıklama</th>
                            <th className="px-3 py-2.5 text-center">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {branchInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-3 py-2">
                                <div className="font-mono font-bold text-gray-900">{inv.invoice_no}</div>
                                <div className="text-[10px] text-gray-400 truncate max-w-[180px]">{inv.file_name}</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                                {new Date(inv.invoice_date).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                                {inv.amount > 0 ? `${formatCurrency(inv.amount)}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">
                                {inv.notes || inv.supplier || '—'}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleViewPdf(inv)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                    title="Faturayı Görüntüle"
                                  >
                                    <Eye size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePdf(inv)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    title="Faturayı Sil"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
