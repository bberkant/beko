import { useEffect, useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Trash2, 
  Eye, 
  Plus, 
  Loader2, 
  X, 
  Folder, 
  FolderOpen,
  Grid,
  List,
  ChevronRight,
  ArrowLeft,
  ArrowUp,
  HardDrive,
  Info,
  CreditCard,
  Building2,
  Car,
  ShieldAlert,
  Users2,
  FileSpreadsheet,
  FileText as FileIcon
} from 'lucide-react';
import { supabase, normalizeFileName } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';

interface DocumentItem {
  id: string;
  organization_id: string;
  module: string;
  file_name: string;
  file_path: string;
  note: string | null;
  created_at: string;
  created_by: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

interface StatementItem {
  id: string;
  card_id: string;
  period: string;
  file_name: string | null;
  file_path: string | null;
  note: string | null;
  created_at: string;
  total_debt: number;
}

interface CreditCardInfo {
  id: string;
  bank: string;
  card_name: string;
  last4: string;
}

interface PathSegment {
  id: string;
  name: string;
  moduleId?: string;
  cardId?: string;
}

const moduleLabels: Record<string, string> = {
  bank_accounts: 'Banka Makbuzları',
  vehicles: 'Araç Belgeleri',
  traffic_fines: 'Trafik Cezaları',
  drivers: 'Şoför Belgeleri',
  tenders: 'İhale Evrakları',
  real_estates: 'Tapular & Gayrimenkuller',
  main_cashbox: 'Kasa Belgeleri',
  kart_ekstreleri: 'Kart Ekstreleri',
};

const moduleIcons: Record<string, any> = {
  bank_accounts: Building2,
  vehicles: Car,
  traffic_fines: ShieldAlert,
  drivers: Users2,
  tenders: FileText,
  real_estates: FileSpreadsheet,
  main_cashbox: HardDrive,
  kart_ekstreleri: CreditCard,
};

function getFileExtensionIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 shadow-sm"><FileIcon size={24} /></div>;
  }
  if (['xls', 'xlsx'].includes(ext || '')) {
    return <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm"><FileIcon size={24} /></div>;
  }
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
    return <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500 border border-blue-100 shadow-sm"><FileIcon size={24} /></div>;
  }
  return <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-500 border border-gray-100 shadow-sm"><FileIcon size={24} /></div>;
}

function getFileExtensionSmallIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-500 border border-red-100"><FileIcon size={14} /></div>;
  }
  if (['xls', 'xlsx'].includes(ext || '')) {
    return <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100"><FileIcon size={14} /></div>;
  }
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
    return <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-500 border border-blue-100"><FileIcon size={14} /></div>;
  }
  return <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-50 text-gray-500 border border-gray-100"><FileIcon size={14} /></div>;
}

export function DocumentsPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  // Theme & Bulut ERP States
  const [sidebarTheme, setSidebarTheme] = useState<'banking' | 'classic' | 'banking_trial' | 'dia_v3' | 'one_dars_v4' | 'bulut_erp'>(() => {
    try {
      return (localStorage.getItem(`sidebar_theme_${user?.email}`) as any) || 'one_dars_v4';
    } catch {
      return 'one_dars_v4';
    }
  });

  useEffect(() => {
    const handleThemeChange = () => {
      try {
        const theme = (localStorage.getItem(`sidebar_theme_${user?.email}`) as any) || 'one_dars_v4';
        setSidebarTheme(theme);
      } catch (e) {
        setSidebarTheme('one_dars_v4');
      }
    };
    window.addEventListener('sidebar-theme-changed', handleThemeChange);
    return () => window.removeEventListener('sidebar-theme-changed', handleThemeChange);
  }, [user?.email]);

  const [activeErpTab, setActiveErpTab] = useState<'belgeler' | 'efatura' | 'eirsaliye' | 'edefter'>('belgeler');
  
  // Storage data
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [cards, setCards] = useState<CreditCardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Navigation & Path (Windows Explorer)
  const [currentPath, setCurrentPath] = useState<PathSegment[]>([
    { id: 'root', name: 'Belgeler' }
  ]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewStyle, setViewStyle] = useState<'grid' | 'details'>('grid');

  // Modals
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadFile, setFile] = useState<File | null>(null);
  const [uploadModule, setUploadModule] = useState<string>('bank_accounts');
  const [uploadNote, setNote] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = useMemo(() => {
    return ['Süper Admin', 'Admin', 'Developer', 'Süper Yönetici', 'Yönetici', 'Muhasebe', 'Finans'].includes(user?.role || '');
  }, [user?.role]);

  const activeFolder = useMemo(() => {
    return currentPath[currentPath.length - 1];
  }, [currentPath]);

  // Load all document and statements data
  const fetchData = async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    try {
      const [docsRes, statementsRes, cardsRes] = await Promise.all([
        supabase
          .from('module_documents')
          .select('*, profiles:created_by (full_name, email)')
          .eq('organization_id', user.organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('statements')
          .select('id, card_id, period, file_name, file_path, note, created_at, total_debt')
          .eq('organization_id', user.organizationId)
          .not('file_path', 'is', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('credit_cards')
          .select('id, bank, card_name, last4')
          .eq('organization_id', user.organizationId)
      ]);

      if (docsRes.error) throw docsRes.error;
      if (statementsRes.error) throw statementsRes.error;
      if (cardsRes.error) throw cardsRes.error;

      setDocuments((docsRes.data || []) as DocumentItem[]);
      setStatements((statementsRes.data || []) as StatementItem[]);
      setCards((cardsRes.data || []) as CreditCardInfo[]);
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
      notify('Dosya listesi yüklenirken hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [user?.organizationId]);

  // Folder contents mapping based on path
  const explorerItems = useMemo(() => {
    const list: any[] = [];
    const isRoot = activeFolder.id === 'root';
    const isKartEkstreleri = activeFolder.id === 'folder-kart_ekstreleri';
    const isCardSubfolder = activeFolder.id.startsWith('folder-card-');

    if (isRoot) {
      // Show modules as folders
      Object.entries(moduleLabels).forEach(([key, name]) => {
        list.push({
          id: `folder-${key}`,
          name,
          isFolder: true,
          type: 'folder',
          moduleId: key
        });
      });
    } else if (isKartEkstreleri) {
      // Show subfolders for each card
      cards.forEach(card => {
        // Count files under this card
        const fileCount = statements.filter(s => s.card_id === card.id).length;
        list.push({
          id: `folder-card-${card.id}`,
          name: `${card.bank} - ${card.card_name} (${card.last4})`,
          isFolder: true,
          type: 'folder',
          cardId: card.id,
          fileCount
        });
      });
    } else if (isCardSubfolder) {
      // Show statement files
      const cardId = activeFolder.cardId;
      const cardStatements = statements.filter(s => s.card_id === cardId);
      cardStatements.forEach(s => {
        list.push({
          id: `file-statement-${s.id}`,
          name: s.file_name || `${s.period} Ekstresi.pdf`,
          isFolder: false,
          type: 'file',
          filePath: s.file_path,
          bucketName: 'credit-card-statements',
          note: s.note || `${s.period} dönemi, Borç: ${Number(s.total_debt).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`,
          uploadedAt: s.created_at,
          uploadedBy: 'Muhasebe'
        });
      });
    } else {
      // Inside a module folder (like bank_accounts, real_estates, etc.)
      const moduleName = activeFolder.moduleId;
      const moduleDocs = documents.filter(d => d.module === moduleName);
      moduleDocs.forEach(d => {
        list.push({
          id: `file-doc-${d.id}`,
          name: d.file_name,
          isFolder: false,
          type: 'file',
          filePath: d.file_path,
          bucketName: 'operations-documents',
          note: d.note,
          uploadedAt: d.created_at,
          uploadedBy: d.profiles?.full_name || d.profiles?.email?.split('@')[0] || 'Sistem'
        });
      });
    }

    // Filter by search query if typed
    if (search.trim()) {
      return list.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.note || '').toLowerCase().includes(search.toLowerCase())
      );
    }

    return list;
  }, [activeFolder, documents, statements, cards, search]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return explorerItems.find(item => item.id === selectedItemId) || null;
  }, [selectedItemId, explorerItems]);

  // Navigate deeper
  const handleItemDoubleClick = (item: any) => {
    if (item.isFolder) {
      setCurrentPath(prev => [...prev, { id: item.id, name: item.name, moduleId: item.moduleId, cardId: item.cardId }]);
      setSelectedItemId(null);
    } else {
      void handleViewFile(item);
    }
  };

  // Navigation actions
  const handleGoUp = () => {
    if (currentPath.length > 1) {
      setCurrentPath(prev => prev.slice(0, -1));
      setSelectedItemId(null);
    }
  };

  const handleGoBack = () => {
    handleGoUp();
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
    setSelectedItemId(null);
  };

  // File action handlers
  const handleViewFile = async (item: any) => {
    if (!item.filePath) return;
    const bucketName = item.bucketName || 'operations-documents';
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(item.filePath, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Dosya açılamadı:', err);
      notify('Dosya indirme linki oluşturulamadı.', 'error');
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile || !user?.organizationId) {
      notify('Lütfen yüklenecek bir dosya seçin.', 'error');
      return;
    }
    setUploadSaving(true);
    try {
      const normalizedName = normalizeFileName(uploadFile.name);
      const path = `${user.organizationId}/modules/${uploadModule}/${crypto.randomUUID()}-${normalizedName}`;
      
      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('operations-documents')
        .upload(path, uploadFile, { contentType: uploadFile.type });
      
      if (uploadError) throw uploadError;

      // 2. DB insert
      const { error: dbError } = await supabase
        .from('module_documents')
        .insert({
          organization_id: user.organizationId,
          module: uploadModule,
          file_name: uploadFile.name,
          file_path: path,
          note: uploadNote.trim() || null,
        });

      if (dbError) {
        await supabase.storage.from('operations-documents').remove([path]);
        throw dbError;
      }

      notify('Dosya başarıyla yüklendi.', 'success');
      setUploadOpen(false);
      setFile(null);
      setNote('');
      void fetchData();
    } catch (err) {
      console.error('Dosya yüklenemedi:', err);
      notify(err instanceof Error ? err.message : 'Dosya yükleme başarısız.', 'error');
    } finally {
      setUploadSaving(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      // Find the file to delete (statements vs module_documents)
      const isStatement = deleteId.startsWith('file-statement-');
      const realId = deleteId.replace('file-statement-', '').replace('file-doc-', '');

      if (isStatement) {
        // For credit card statements, we delete it using database call or deleteStatement in store
        const stmt = statements.find(s => s.id === realId);
        if (stmt && stmt.file_path) {
          // Delete storage file
          await supabase.storage.from('credit-card-statements').remove([stmt.file_path]);
          // Reset the statement file columns
          await supabase
            .from('statements')
            .update({ file_name: null, file_path: null })
            .eq('id', realId);
        }
      } else {
        // General module document
        const doc = documents.find(d => d.id === realId);
        if (doc) {
          await supabase.from('module_documents').delete().eq('id', realId);
          await supabase.storage.from('operations-documents').remove([doc.file_path]);
        }
      }

      notify('Belge başarıyla silindi.', 'success');
      setDeleteId(null);
      setSelectedItemId(null);
      void fetchData();
    } catch (err) {
      console.error('Belge silinemedi:', err);
      notify('Belge silinirken bir hata oluştu.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Open upload modal with auto-selected active category
  const handleNewUpload = () => {
    if (activeFolder.moduleId) {
      setUploadModule(activeFolder.moduleId);
    } else {
      setUploadModule('bank_accounts');
    }
    setUploadOpen(true);
  };

  // Shortcut directory jumping
  const jumpToFolder = (pathSegments: PathSegment[]) => {
    setCurrentPath(pathSegments);
    setSelectedItemId(null);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Belgeler"
        description="Tüm şirket dokümanlarını ve kredi kartı ekstrelerini Windows klasör yapısı görünümünde yönetin."
        actions={
          canManage && (
            <button className="btn-primary" onClick={handleNewUpload}>
              <Plus size={16} />
              <span>Yeni Dosya Yükle</span>
            </button>
          )
        }
      />

      {/* Bulut ERP Tab Navigation */}
      {sidebarTheme === 'bulut_erp' && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveErpTab('belgeler')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'belgeler' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Belge Yönetim Paneli
          </button>
          <button
            onClick={() => setActiveErpTab('efatura')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'efatura' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            e-Fatura & e-Arşiv
          </button>
          <button
            onClick={() => setActiveErpTab('eirsaliye')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'eirsaliye' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            e-İrsaliye
          </button>
          <button
            onClick={() => setActiveErpTab('edefter')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'edefter' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            e-Defter & Beyannameler
          </button>
        </div>
      )}

      {activeErpTab === 'belgeler' && (
        <>
          <div className="flex flex-col md:flex-row gap-6 bg-white rounded-2xl border border-gray-200 p-5 shadow-card min-h-[620px]">
        
        {/* Left Windows Sidebar Pane */}
        <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4 flex-shrink-0">
          <div className="space-y-6">
            
            {/* Quick Access */}
            <div>
              <h3 className="px-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">Sık Kullanılanlar</h3>
              <nav className="mt-2 space-y-0.5">
                <button
                  onClick={() => jumpToFolder([{ id: 'root', name: 'Belgeler' }])}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    activeFolder.id === 'root' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <HardDrive size={15} className={activeFolder.id === 'root' ? 'text-indigo-600' : 'text-gray-400'} />
                  <span>Belgeler (Ana Dizin)</span>
                </button>
                <button
                  onClick={() => jumpToFolder([
                    { id: 'root', name: 'Belgeler' },
                    { id: 'folder-kart_ekstreleri', name: 'Kart Ekstreleri', moduleId: 'kart_ekstreleri' }
                  ])}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    activeFolder.id === 'folder-kart_ekstreleri' || activeFolder.id.startsWith('folder-card-')
                      ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <CreditCard size={15} className={activeFolder.id === 'folder-kart_ekstreleri' ? 'text-indigo-600' : 'text-gray-400'} />
                  <span>Kart Ekstreleri</span>
                </button>
                <button
                  onClick={() => jumpToFolder([
                    { id: 'root', name: 'Belgeler' },
                    { id: 'folder-real_estates', name: 'Tapular & Gayrimenkuller', moduleId: 'real_estates' }
                  ])}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    activeFolder.moduleId === 'real_estates' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <FileSpreadsheet size={15} className={activeFolder.moduleId === 'real_estates' ? 'text-indigo-600' : 'text-gray-400'} />
                  <span>Tapular (Gayrimenkul)</span>
                </button>
              </nav>
            </div>

            {/* Modules folders tree */}
            <div>
              <h3 className="px-3 text-[11px] font-bold tracking-wider text-gray-400 uppercase">Kategoriler</h3>
              <nav className="mt-2 space-y-0.5">
                {Object.entries(moduleLabels).map(([key, name]) => {
                  const IconComp = moduleIcons[key] || Folder;
                  const isActive = activeFolder.moduleId === key || activeFolder.id === `folder-${key}`;
                  return (
                    <button
                      key={key}
                      onClick={() => jumpToFolder([
                        { id: 'root', name: 'Belgeler' },
                        { id: `folder-${key}`, name, moduleId: key }
                      ])}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <IconComp size={14} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                      <span className="truncate">{name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

          </div>
        </aside>

        {/* Right Content Area (Windows Explorer Pane) */}
        <div className="flex-1 min-w-0 flex flex-col">
          
          {/* Top Address Bar & toolbar controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-b border-gray-100 pb-4 mb-4">
            
            {/* Back & Up navigation arrows */}
            <div className="flex items-center gap-1">
              <button 
                onClick={handleGoBack}
                disabled={currentPath.length <= 1}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Geri"
              >
                <ArrowLeft size={16} />
              </button>
              <button 
                onClick={handleGoUp}
                disabled={currentPath.length <= 1}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Üst Klasöre Çık"
              >
                <ArrowUp size={16} />
              </button>
            </div>

            {/* Explorer Breadcrumb path address input bar */}
            <div className="flex-1 flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 overflow-x-auto scrollbar-none">
              <HardDrive size={14} className="text-gray-400 flex-shrink-0" />
              <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
              {currentPath.map((segment, index) => (
                <div key={index} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className="text-xs font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
                  >
                    {segment.name}
                  </button>
                  {index < currentPath.length - 1 && (
                    <ChevronRight size={12} className="text-gray-300 mx-1 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Layout view selectors */}
            <div className="flex items-center gap-3">
              {/* Search box */}
              <div className="relative w-48 sm:w-56">
                <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Dizinde ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input !py-1.5 !pl-8 !text-xs w-full"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Grid / Details switcher */}
              <div className="flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                <button
                  onClick={() => setViewStyle('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewStyle === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Simge Görünümü"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewStyle('details')}
                  className={`p-1.5 rounded-md transition-colors ${viewStyle === 'details' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Detaylı Liste Görünümü"
                >
                  <List size={14} />
                </button>
              </div>
            </div>

          </div>

          {/* Loader or folder items */}
          <div className="flex-1 flex flex-col justify-between">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                <p className="mt-2 text-xs font-semibold text-gray-500">Klasör içeriği okunuyor...</p>
              </div>
            ) : explorerItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
                  <Folder size={24} className="text-gray-300" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-gray-800">Klasör Boş</h4>
                <p className="mt-1 text-xs text-gray-400 max-w-[280px]">
                  {search ? 'Arama kriterlerinize uygun öge bulunamadı.' : 'Bu klasörde yüklü herhangi bir dosya bulunmuyor.'}
                </p>
                {canManage && activeFolder.id !== 'root' && activeFolder.id !== 'folder-kart_ekstreleri' && (
                  <button className="btn-secondary !py-1.5 !px-3 text-xs mt-4" onClick={handleNewUpload}>
                    <Plus size={12} /> Dosya Yükle
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* 1. Large Icons Grid View (Windows-like explorer) */}
                {viewStyle === 'grid' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {explorerItems.map(item => {
                      const isSelected = selectedItemId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          onDoubleClick={() => handleItemDoubleClick(item)}
                          className={`group flex flex-col items-center justify-start text-center p-3.5 w-full rounded-xl cursor-pointer select-none transition-all duration-150 border ${
                            isSelected 
                              ? 'bg-indigo-50/70 border-indigo-200 shadow-sm ring-1 ring-indigo-200' 
                              : 'border-transparent hover:bg-gray-50/75 hover:border-gray-200'
                          }`}
                        >
                          {/* Folder / File Visual representations */}
                          {item.isFolder ? (
                            <div className="relative mb-2">
                              <Folder className="h-12 w-12 text-amber-400 fill-amber-100/50 group-hover:hidden" />
                              <FolderOpen className="h-12 w-12 text-amber-500 fill-amber-200/50 hidden group-hover:block" />
                              {item.cardId && (
                                <CreditCard size={10} className="absolute bottom-2.5 left-4.5 text-gray-600" />
                              )}
                            </div>
                          ) : (
                            <div className="mb-2">
                              {getFileExtensionIcon(item.name)}
                            </div>
                          )}

                          {/* File / Folder Name label */}
                          <span className={`text-xs font-semibold line-clamp-2 px-1 text-gray-800 break-all leading-tight ${isSelected ? 'text-indigo-900 font-bold' : ''}`}>
                            {item.name}
                          </span>

                          {/* Subfolder file counters */}
                          {item.isFolder && item.fileCount !== undefined && (
                            <span className="text-[10px] text-gray-400 font-bold mt-1">
                              {item.fileCount} dosya
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Details List View (Windows details table) */}
                {viewStyle === 'details' && (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="table !text-xs">
                      <thead>
                        <tr className="bg-gray-50/70 border-b border-gray-100">
                          <th className="w-5/12 !py-2.5">Ad</th>
                          <th className="!py-2.5">Tür</th>
                          <th className="!py-2.5">Açıklama / Not</th>
                          <th className="!py-2.5">Değiştirme Tarihi</th>
                          <th className="!py-2.5">Yükleyen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {explorerItems.map(item => {
                          const isSelected = selectedItemId === item.id;
                          const extension = item.name.split('.').pop()?.toUpperCase() || '';
                          return (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedItemId(item.id)}
                              onDoubleClick={() => handleItemDoubleClick(item)}
                              className={`cursor-pointer select-none transition-colors border-b border-gray-50 ${
                                isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-gray-50/50'
                              }`}
                            >
                              <td className="!py-2 font-semibold text-gray-800">
                                <div className="flex items-center gap-2">
                                  {item.isFolder ? (
                                    <Folder className="h-4.5 w-4.5 text-amber-400 fill-amber-100/50 flex-shrink-0" />
                                  ) : (
                                    getFileExtensionSmallIcon(item.name)
                                  )}
                                  <span className="truncate line-clamp-1">{item.name}</span>
                                </div>
                              </td>
                              <td className="!py-2 font-medium text-gray-400 uppercase">
                                {item.isFolder ? 'Klasör' : `${extension} Dosyası`}
                              </td>
                              <td className="!py-2 text-gray-500 font-medium max-w-xs truncate">
                                {item.note || '—'}
                              </td>
                              <td className="!py-2 text-gray-400 font-medium">
                                {item.uploadedAt 
                                  ? new Date(item.uploadedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : '—'}
                              </td>
                              <td className="!py-2 text-gray-500 font-medium">
                                {item.uploadedBy || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Status bar & Selection actions drawer */}
            <footer className="mt-6 border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Folder status summary */}
              <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
                <span>{explorerItems.length} öge</span>
                {selectedItem && (
                  <div className="flex items-center gap-1.5 border-l border-gray-200 pl-4 text-gray-600">
                    <Info size={13} className="text-indigo-500" />
                    <span className="line-clamp-1 truncate max-w-sm">
                      Seçilen: {selectedItem.name} {selectedItem.note ? `(${selectedItem.note})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Selection actions */}
              {selectedItem && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!selectedItem.isFolder && (
                    <button
                      onClick={() => handleViewFile(selectedItem)}
                      className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 hover:!border-brand-300 hover:!text-brand-700"
                    >
                      <Eye size={13} />
                      <span>Görüntüle / İndir</span>
                    </button>
                  )}
                  {canManage && (!selectedItem.isFolder || selectedItem.fileCount === 0) && (
                    <button
                      onClick={() => setDeleteId(selectedItem.id)}
                      className="btn-secondary hover:!bg-red-50 hover:!text-red-600 hover:!border-red-200 !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>{selectedItem.isFolder ? 'Klasörü Sil' : 'Dosyayı Sil'}</span>
                    </button>
                  )}
                </div>
              )}
            </footer>

          </div>

        </div>

      </div>
      </>)}

      {activeErpTab === 'efatura' && (
        <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">e-Fatura & e-Arşiv Gönderim Paneli</h2>
          <p className="text-xs text-gray-500 mb-6">Müşterilere kesilen e-Faturaların entegratör üzerinden GİB'e iletim durumlarını takip edin.</p>
          
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Fatura No</th>
                  <th className="px-4 py-3">Müşteri / Cari Ünvan</th>
                  <th className="px-4 py-3 text-right">Tutar</th>
                  <th className="px-4 py-3 text-center">İletim Durumu</th>
                  <th className="px-4 py-3 text-center">Fatura Tarihi</th>
                  <th className="px-4 py-3 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {[
                  { id: 'FT-1', no: 'GIB202600000104', customer: 'BERKANT LOJİSTİK A.Ş.', amount: '14.250,00 ₺', status: 'GİB\'e Gönderildi', date: '10.08.2026' },
                  { id: 'FT-2', no: 'GIB202600000105', customer: 'MARİF YAPI TİC. LTD.', amount: '124.500,00 ₺', status: 'Kabul Edildi (Onaylandı)', date: '11.08.2026' },
                  { id: 'FT-3', no: 'GIB202600000106', customer: 'ETİK İŞBANK ENERJİ', amount: '9.400,00 ₺', status: 'Hata Aldı (Şema Geçersiz)', date: '12.08.2026' },
                ].map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-brand-600 font-bold">{item.no}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">{item.customer}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-bold">{item.amount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status.includes('Kabul') ? 'bg-emerald-50 text-emerald-600' : item.status.includes('Hata') ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.date}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => notify(`${item.no} fatura PDF şablonu indiriliyor...`, 'info')}
                        className="text-brand-600 hover:underline font-bold"
                      >
                        PDF İndir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeErpTab === 'eirsaliye' && (
        <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">e-İrsaliye Sevkıyat Takip Ekranı</h2>
          <p className="text-xs text-gray-500 mb-6">Sevkedilen ürünlerin e-İrsaliye dökümleri, plaka numaraları ve fiili teslimat bildirimleri.</p>
          
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">İrsaliye No</th>
                  <th className="px-4 py-3">Alıcı Cari Ünvan</th>
                  <th className="px-4 py-3 text-center">Taşıyıcı / Şoför</th>
                  <th className="px-4 py-3 text-center">Plaka No</th>
                  <th className="px-4 py-3 text-center">Durum</th>
                  <th className="px-4 py-3 text-center">Sevk Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {[
                  { no: 'IRS202600000054', client: 'ATAKUM ET ENTEGRE', driver: 'Ahmet Şoför', plate: '55 RS 192', status: 'Kabul Edildi', date: '08.08.2026' },
                  { no: 'IRS202600000055', client: 'ULUDAĞ ET PAZARI', driver: 'Mehmet Şoför', plate: '16 BKO 98', status: 'Kısmi Kabul (Eksik Ürün)', date: '10.08.2026' },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-brand-600 font-bold">{item.no}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">{item.client}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.driver}</td>
                    <td className="px-4 py-3 text-center text-gray-800 font-semibold">{item.plate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Kabul Edildi' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeErpTab === 'edefter' && (
        <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">e-Defter & Resmi Beyanname Hazırlama</h2>
          <p className="text-xs text-gray-500 mb-6">Aylık defter kebir ve yevmiye beratı imzalanması, KDV1, KDV2 ve Muhtasar XML taslak dökümleri.</p>
          
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <button 
              onClick={() => notify('KDV1 XML şablon dosyası başarıyla üretildi.', 'success')}
              className="p-5 text-left border border-gray-150 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-9 w-9 rounded-lg bg-orange-50 text-[#f37021] flex items-center justify-center mb-3">
                  <FileText size={18} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">KDV 1 Beyannamesi</h3>
                <p className="text-xs text-gray-400 mt-1">Önceki ay satış ve alış KDV oranları analizi.</p>
              </div>
              <span className="text-xs text-[#f37021] font-semibold mt-4">XML Oluştur →</span>
            </button>

            <button 
              onClick={() => notify('KDV2 XML şablon dosyası başarıyla üretildi.', 'success')}
              className="p-5 text-left border border-gray-150 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-9 w-9 rounded-lg bg-orange-50 text-[#f37021] flex items-center justify-center mb-3">
                  <FileText size={18} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">KDV 2 Beyannamesi</h3>
                <p className="text-xs text-gray-400 mt-1">Tevkifatlı faturalar ve KDV2 beyan dökümleri.</p>
              </div>
              <span className="text-xs text-[#f37021] font-semibold mt-4">XML Oluştur →</span>
            </button>

            <button 
              onClick={() => notify('e-Defter Kebir Beratı başarıyla oluşturuldu ve imzalandı.', 'success')}
              className="p-5 text-left border border-gray-150 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <FileSpreadsheet size={18} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">e-Defter Kebir Beratı</h3>
                <p className="text-xs text-gray-400 mt-1">Yevmiye ve Defter-i Kebir beratlarının gönderimi.</p>
              </div>
              <span className="text-xs text-emerald-600 font-semibold mt-4">Berat İmzala →</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setFile(null); setNote(''); }}
        title="Dosya Yükle"
        description="PDF, Excel veya görsel dosyaları ilgili kategoriye güvenle yükleyin."
      >
        <div className="space-y-4">
          <div>
            <label className="label">Kategori / Modül</label>
            <select
              className="input w-full font-medium"
              value={uploadModule}
              onChange={(e) => setUploadModule(e.target.value)}
            >
              {Object.entries(moduleLabels).filter(([k]) => k !== 'kart_ekstreleri').map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Dosya Seçin</label>
            {uploadFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                <FileText size={18} className="text-brand-600" />
                <span className="flex-1 truncate text-sm text-gray-700 font-semibold">{uploadFile.name}</span>
                <button onClick={() => setFile(null)} className="rounded-md p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center hover:border-brand-400 hover:bg-brand-50/30 transition-all">
                <Folder size={28} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">Dosyayı sürükleyin veya seçin</p>
                <p className="text-xs text-gray-400">Maksimum 10 MB · PDF, Excel, Görsel</p>
                <input
                  type="file"
                  accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 10 * 1024 * 1024) {
                      notify('Dosya boyutu 10 MB’dan küçük olmalıdır.', 'error');
                      return;
                    }
                    setFile(f);
                  }}
                />
              </label>
            )}
          </div>

          <div>
            <label className="label">Not / Açıklama</label>
            <textarea
              className="input min-h-[72px] resize-none"
              placeholder="Dosyaya ait açıklayıcı not (opsiyonel)"
              value={uploadNote}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              className="btn-secondary w-full" 
              onClick={() => { setUploadOpen(false); setFile(null); setNote(''); }}
              disabled={uploadSaving}
            >
              İptal
            </button>
            <button 
              type="button" 
              className="btn-primary w-full" 
              disabled={uploadSaving || !uploadFile}
              onClick={handleUploadSubmit}
            >
              {uploadSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>{uploadSaving ? 'Dosya Yükleniyor...' : 'Dosyayı Yükle'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Silme İşlemini Onayla"
        description="Seçilen ögeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve dosya depolama alanından tamamen kaldırılacaktır."
      >
        <div className="flex gap-3 pt-2">
          <button 
            type="button" 
            className="btn-secondary w-full" 
            onClick={() => setDeleteId(null)}
            disabled={deleting}
          >
            İptal
          </button>
          <button 
            type="button" 
            className="btn-primary hover:!bg-red-700 !bg-red-600 hover:!border-red-700 !border-red-600 text-white w-full" 
            disabled={deleting}
            onClick={handleDeleteSubmit}
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            <span>{deleting ? 'Siliniyor...' : 'Evet, Sil'}</span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
