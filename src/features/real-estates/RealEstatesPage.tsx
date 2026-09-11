import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, FileText, Landmark, Pencil, Plus, Search, Trash2, TrendingUp, Sparkles, Image } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ModuleFileActions } from '../../components/ui/ModuleFileActions';
import { supabase, normalizeFileName } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

type RealEstateStatus = 'aktif' | 'satildi' | 'kirada' | 'diger';
interface RealEstate {
  id: string;
  city: string;
  district: string;
  neighborhood: string | null;
  ada: string | null;
  parsel: string | null;
  property_type: string;
  area_sqm: number;
  share: string;
  purchase_date: string | null;
  purchase_amount: number;
  current_value: number;
  currency: string;
  status: RealEstateStatus;
  deed_no: string | null;
  description: string | null;
  file_path: string | null;
}

interface FormState {
  city: string;
  district: string;
  neighborhood: string;
  ada: string;
  parsel: string;
  propertyType: string;
  areaSqm: string;
  share: string;
  purchaseDate: string;
  purchaseAmount: string;
  currentValue: string;
  currency: string;
  status: RealEstateStatus;
  deedNo: string;
  description: string;
}

const emptyForm = (): FormState => ({
  city: '',
  district: '',
  neighborhood: '',
  ada: '',
  parsel: '',
  propertyType: 'Arsa',
  areaSqm: '',
  share: '1/1',
  purchaseDate: '',
  purchaseAmount: '',
  currentValue: '',
  currency: 'TRY',
  status: 'aktif',
  deedNo: '',
  description: ''
});

const statusLabels: Record<RealEstateStatus, string> = {
  aktif: 'Aktif',
  satildi: 'Satıldı',
  kirada: 'Kirada',
  diger: 'Diğer'
};

const statusCls: Record<RealEstateStatus, string> = {
  aktif: 'bg-emerald-50 text-emerald-700',
  satildi: 'bg-gray-100 text-gray-500',
  kirada: 'bg-blue-50 text-blue-700',
  diger: 'bg-amber-50 text-amber-700'
};

const formatMoney = (n: number, c = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 0
  }).format(n);
};

const formatNumberString = (str: string) => {
  const clean = str.replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('tr-TR');
};

function InlineEdit({
  value,
  displayValue,
  onSave,
  className = "",
  inputClassName = "",
  placeholder = "—",
  isNumeric = false
}: {
  value: string;
  displayValue: React.ReactNode;
  onSave: (val: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  isNumeric?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);

  const startEdit = () => {
    setTempVal(isNumeric ? formatNumberString(value) : value);
    setEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const finalVal = isNumeric ? tempVal.replace(/\./g, '') : tempVal;
      onSave(finalVal);
      setEditing(false);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleBlur = () => {
    const finalVal = isNumeric ? tempVal.replace(/\./g, '') : tempVal;
    onSave(finalVal);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="text"
        className={`input !py-0.5 !px-1.5 !text-xs w-full ${inputClassName}`}
        value={tempVal}
        onChange={(e) => setTempVal(isNumeric ? formatNumberString(e.target.value) : e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        autoFocus
      />
    );
  }

  return (
    <div className={`flex items-center justify-between gap-1 group/item truncate ${className}`}>
      <span className="truncate">{displayValue || <span className="text-gray-400 font-medium">{placeholder}</span>}</span>
      <button
        onClick={startEdit}
        className="p-0.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
        title="Düzenle"
      >
        <Pencil size={11} />
      </button>
    </div>
  );
}

function InlineSelect({
  value,
  options,
  onSave,
  className = "",
  badgeClass = ""
}: {
  value: string;
  options: { [key: string]: string };
  onSave: (val: string) => void;
  className?: string;
  badgeClass?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <select
        className="input !py-0.5 !px-1.5 !text-xs w-full"
        value={value}
        onChange={(e) => {
          onSave(e.target.value);
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
        autoFocus
      >
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-1 group/item ${className}`}>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badgeClass}`}>
        {options[value]}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="p-0.5 text-gray-400 hover:text-brand-600 hover:bg-gray-100 rounded opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
        title="Düzenle"
      >
        <Pencil size={11} />
      </button>
    </div>
  );
}

const DEFAULT_ORG_ID = '13b8da90-27d1-440d-a8f4-eb50dadd6391';

export function RealEstatesPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [items, setItems] = useState<RealEstate[]>(() => {
    try {
      const cached = localStorage.getItem('dars_cached_real_estates');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      if (localStorage.getItem('dars_cached_real_estates')) return false;
    } catch {}
    return true;
  });
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RealEstate>();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

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

  const [activeErpTab, setActiveErpTab] = useState<'liste' | 'amortisman'>('liste');

  // Manual File Upload States
  const [manualFile, setManualFile] = useState<File>();

  // AI OCR States
  const [aiOpen, setAiOpen] = useState(false);
  const [aiFile, setAiFile] = useState<File>();
  const [aiApiKey, setAiApiKey] = useState(localStorage.getItem('gemini_api_key') || (import.meta.env.VITE_GEMINI_API_KEY as string) || '');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<FormState | null>(null);

  const canWrite = ['Süper Admin', 'Admin', 'Developer', 'Süper Yönetici', 'Yönetici', 'Muhasebe', 'Finans'].includes(user?.role ?? '');

  const refresh = useCallback(async () => {
    const activeOrg = user?.organizationId || DEFAULT_ORG_ID;
    
    // Load real estates
    const { data, error } = await supabase
      .from('real_estates')
      .select('*')
      .eq('organization_id', activeOrg)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Gayrimenkuller yüklenirken hata oluştu:', error);
    } else {
      const mapped = (data ?? []).map(r => ({
        ...r,
        area_sqm: Number(r.area_sqm),
        purchase_amount: Number(r.purchase_amount),
        current_value: Number(r.current_value)
      })) as RealEstate[];
      setItems(mapped);
      try {
        localStorage.setItem('dars_cached_real_estates', JSON.stringify(mapped));
      } catch {}
    }

    setLoading(false);
  }, [user?.organizationId, notify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);


  const filtered = useMemo(() => {
    return items.filter(x => {
      const matchesSearch = `${x.city} ${x.district} ${x.neighborhood || ''} ${x.ada || ''} ${x.parsel || ''} ${x.property_type}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesType = !typeFilter || x.property_type === typeFilter;
      const matchesStatus = !statusFilter || x.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, query, typeFilter, statusFilter]);

  const openForm = (item?: RealEstate) => {
    setEditing(item);
    setManualFile(undefined); // reset manual file
    setForm(item ? {
      city: item.city,
      district: item.district,
      neighborhood: item.neighborhood ?? '',
      ada: item.ada ?? '',
      parsel: item.parsel ?? '',
      propertyType: item.property_type,
      areaSqm: String(item.area_sqm),
      share: item.share,
      purchaseDate: item.purchase_date ?? '',
      purchaseAmount: String(item.purchase_amount),
      currentValue: String(item.current_value),
      currency: item.currency,
      status: item.status,
      deedNo: item.deed_no ?? '',
      description: item.description ?? ''
    } : emptyForm());
    setOpen(true);
  };

  const save = async () => {
    if (!user?.organizationId || !form.city.trim() || !form.district.trim() || !form.propertyType.trim()) {
      notify('İl, İlçe ve Nitelik alanları zorunludur.', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      organization_id: user.organizationId,
      city: form.city.trim(),
      district: form.district.trim(),
      neighborhood: form.neighborhood.trim() || null,
      ada: form.ada.trim() || null,
      parsel: form.parsel.trim() || null,
      property_type: form.propertyType.trim(),
      area_sqm: Number(form.areaSqm) || 0,
      share: form.share.trim() || '1/1',
      purchase_date: form.purchaseDate || null,
      purchase_amount: Number(form.purchaseAmount) || 0,
      current_value: Number(form.currentValue) || 0,
      currency: form.currency,
      status: form.status,
      deed_no: form.deedNo.trim() || null,
      description: form.description.trim() || null,
      updated_at: new Date().toISOString()
    };

    try {
      const q = editing 
        ? supabase.from('real_estates').update(payload).eq('id', editing.id).eq('organization_id', user.organizationId).select().single()
        : supabase.from('real_estates').insert(payload).select().single();

      const { data: savedRecord, error } = await q;
      if (error) throw error;

      if (manualFile && savedRecord) {
        const normalizedName = normalizeFileName(manualFile.name);
        const path = `${user.organizationId}/modules/real_estates/${crypto.randomUUID()}-${normalizedName}`;
        const { error: uploadError } = await supabase.storage.from('operations-documents').upload(path, manualFile, { contentType: manualFile.type });
        
        if (uploadError) throw uploadError;

        // Link in real_estates
        await supabase.from('real_estates').update({ file_path: path }).eq('id', savedRecord.id);

        // Link in module_documents
        await supabase.from('module_documents').insert({
          organization_id: user.organizationId,
          module: 'real_estates',
          file_name: manualFile.name,
          file_path: path,
          note: `${savedRecord.city}/${savedRecord.district} tapu belgesi`
        });
      }

      notify(editing ? 'Gayrimenkul güncellendi.' : 'Gayrimenkul eklendi.', 'success');
      setOpen(false);
      setManualFile(undefined);
      await refresh();
    } catch (error: any) {
      notify(error.message || 'Hata oluştu.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInlineSave = async (x: RealEstate, field: keyof RealEstate, value: any) => {
    if (!user?.organizationId) return;

    const payload = {
      [field]: value,
      updated_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase
        .from('real_estates')
        .update(payload)
        .eq('id', x.id)
        .eq('organization_id', user.organizationId);

      if (error) throw error;
      notify('Değişiklik kaydedildi.', 'success');
      await refresh();
    } catch (err: any) {
      notify(err.message || 'Güncelleme başarısız.', 'error');
    }
  };



  const openDocument = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('operations-documents')
        .createSignedUrl(filePath, 60);

      if (error) {
        notify(error.message, 'error');
      } else if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      notify(err.message || 'Dosya açılamadı.', 'error');
    }
  };

  const remove = async (item: RealEstate) => {
    if (!confirm(`“${item.property_type} (${item.city}/${item.district})” kaydı silinsin mi?`)) return;
    const { error } = await supabase
      .from('real_estates')
      .delete()
      .eq('id', item.id)
      .eq('organization_id', user?.organizationId);

    if (error) notify(error.message, 'error');
    else {
      notify('Gayrimenkul silindi.', 'success');
      await refresh();
    }
  };

  // AI Tapu Okuma OCR handler
  const handleAiAnalyze = async () => {
    if (!aiFile) {
      notify('Lütfen bir tapu fotoğrafı seçin.', 'error');
      return;
    }
    if (!aiApiKey.trim()) {
      notify('Lütfen bir Gemini API anahtarı girin.', 'error');
      return;
    }

    setAiAnalyzing(true);
    localStorage.setItem('gemini_api_key', aiApiKey.trim());

    try {
      // 1. Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
      });
      reader.readAsDataURL(aiFile);
      const base64Data = await base64Promise;

      // 2. Call Gemini multimodal API
      const prompt = `Bu bir Türkiye Cumhuriyeti Tapu Senedi görselidir. Lütfen bu tapu görselini son derece dikkatli okuyarak aşağıdaki alanları Türkçe karakterlerle ve JSON formatında çıkar:
- city (İl bilgisi, örn: "İSTANBUL", "ANKARA")
- district (İlçe bilgisi, örn: "KADIKÖY", "ÇANKAYA")
- neighborhood (Mahalle veya Köy bilgisi, örn: "GÖZTEPE MAHALLESİ", "KAYALAR KÖYÜ")
- ada (Ada No, yalnızca sayı veya sayı/harf, örn: "104", "104B")
- parsel (Parsel No, yalnızca sayı veya sayı/harf, örn: "12", "5")
- property_type (Nitelik/Tür alanı, örn: "Arsa", "Tarla", "Daire", "Kargir Bina", "Dükkan")
- area_sqm (Alan / Yüzölçümü m² cinsinden, sadece sayı veya ondalık sayı, örn: 450.25, 1200)
- share (Pay/Payda, örn: '1/1', '1/2', '45/100')
- deed_no (Tapu Cilt/Sayfa/Sıra No veya Yevmiye No)
- description (Açıklama veya ek notlar)

Sadece belirtilen alanları içeren geçerli bir JSON objesi döndür, markdown formatında yazma, başka bir açıklama ekleme. Sadece JSON döndür.`;

      // 1. Fallback models to try
      const cachedModel = localStorage.getItem('gemini_active_model');
      let modelsToTry = [
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-3-flash-preview',
        'gemini-2.0-flash-exp'
      ];
      if (cachedModel) {
        modelsToTry = [cachedModel, ...modelsToTry.filter(m => m !== cachedModel)];
      }

      let response = null;
      let lastError = '';

      for (const model of modelsToTry) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${aiApiKey.trim()}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      {
                        inlineData: {
                          mimeType: aiFile.type || 'image/jpeg',
                          data: base64Data
                        }
                      }
                    ]
                  }
                ],
                generationConfig: {
                  responseMimeType: 'application/json'
                }
              })
            }
          );

          if (res.ok) {
            response = res;
            localStorage.setItem('gemini_active_model', model); // Cache the successful model
            break;
          } else {
            const errJson = await res.json();
            lastError = errJson?.error?.message || `HTTP ${res.status}`;
            
            // Break early on rate limit or quota errors to prevent worsening the ban window
            if (res.status === 429 || lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('limit')) {
              break;
            }

            // If model is not found, continue to the next model in the fallback list
            if (res.status === 400 || res.status === 404) {
              continue;
            }
            break; // Stop loop on other errors (auth, etc.)
          }
        } catch (err: any) {
          lastError = err.message || err;
        }
      }

      if (!response) {
        if (lastError.toLowerCase().includes('not found') || lastError.toLowerCase().includes('not supported')) {
          throw new Error(
            `API anahtarınızın bağlı olduğu Google Cloud projesinde 'Generative Language API' etkinleştirilmemiş.\n\nÇözüm: Lütfen Google AI Studio'da sol menüdeki anahtar oluşturma (🔑) ekranında, "Default Gemini Project" yerine "+ Create project" seçeneğine tıklayarak yepyeni bir proje oluşturup oradan yeni bir anahtar almayı deneyin.`
          );
        }
        throw new Error(lastError || 'Tüm model denemeleri başarısız oldu.');
      }

      const resJson = await response.json();
      const textResult = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResult) {
        throw new Error('Gemini modelinden boş yanıt döndü.');
      }

      console.log("Raw AI response:", textResult);

      let cleanText = textResult.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();

      const parsed = JSON.parse(cleanText);
      console.log("Parsed AI JSON:", parsed);

      if (!parsed.city && !parsed.district && !parsed.property_type && !parsed.ada && !parsed.parsel) {
        throw new Error('Yapay zeka belgeden geçerli bir tapu kaydı çıkaramadı. Lütfen belgenin okunaklı olduğundan emin olun.');
      }

      setAiResult({
        city: parsed.city || '',
        district: parsed.district || '',
        neighborhood: parsed.neighborhood || '',
        ada: parsed.ada ? String(parsed.ada) : '',
        parsel: parsed.parsel ? String(parsed.parsel) : '',
        propertyType: parsed.property_type || 'Arsa',
        areaSqm: parsed.area_sqm ? String(parsed.area_sqm) : '',
        share: parsed.share || '1/1',
        purchaseDate: '',
        purchaseAmount: '',
        currentValue: '',
        currency: 'TRY',
        status: 'aktif',
        deedNo: parsed.deed_no ? String(parsed.deed_no) : '',
        description: parsed.description || 'AI Tapu Okuma ile otomatik olarak okundu.'
      });

      notify('Tapu başarıyla çözümlendi! Lütfen bilgileri kontrol edip kaydedin.', 'success');
    } catch (err: any) {
      notify(`Tapu okunamadı: ${err.message || err}`, 'error');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const saveAiResult = async () => {
    if (!aiResult || !user?.organizationId) return;
    if (!aiResult.city.trim() || !aiResult.district.trim() || !aiResult.propertyType.trim()) {
      notify('İl, İlçe ve Nitelik alanları zorunludur.', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      organization_id: user.organizationId,
      city: aiResult.city.trim(),
      district: aiResult.district.trim(),
      neighborhood: aiResult.neighborhood.trim() || null,
      ada: aiResult.ada.trim() || null,
      parsel: aiResult.parsel.trim() || null,
      property_type: aiResult.propertyType.trim(),
      area_sqm: Number(aiResult.areaSqm) || 0,
      share: aiResult.share.trim() || '1/1',
      purchase_date: aiResult.purchaseDate || null,
      purchase_amount: Number(aiResult.purchaseAmount) || 0,
      current_value: Number(aiResult.currentValue) || 0,
      currency: aiResult.currency,
      status: aiResult.status,
      deed_no: aiResult.deedNo.trim() || null,
      description: aiResult.description.trim() || null,
      updated_at: new Date().toISOString()
    };

    try {
      const { error: insertError } = await supabase
        .from('real_estates')
        .insert(payload);

      if (insertError) throw insertError;

      // 2. Upload file to operations-documents bucket
      if (aiFile) {
        const normalizedName = normalizeFileName(aiFile.name);
        const path = `${user.organizationId}/modules/real_estates/${crypto.randomUUID()}-${normalizedName}`;
        const { error: uploadError } = await supabase.storage.from('operations-documents').upload(path, aiFile, { contentType: aiFile.type });
        
        if (!uploadError) {
          // Link document
          await supabase.from('module_documents').insert({
            organization_id: user.organizationId,
            module: 'real_estates',
            file_name: aiFile.name,
            file_path: path,
            note: `${aiResult.city}/${aiResult.district} tapu belgesi`
          });
        }
      }

      notify('Gayrimenkul kaydı ve tapu belgesi başarıyla oluşturuldu.', 'success');
      setAiOpen(false);
      setAiFile(undefined);
      setAiResult(null);
      await refresh();
    } catch (error: any) {
      notify(error.message || 'Kayıt başarısız.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Unique property types for filter select
  const propertyTypes = useMemo(() => {
    return Array.from(new Set(items.map(x => x.property_type))).sort();
  }, [items]);

  const totalArea = items.reduce((s, x) => s + x.area_sqm, 0);
  const totalPurchase = items.reduce((s, x) => s + x.purchase_amount, 0);
  const totalValue = items.reduce((s, x) => s + x.current_value, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Gayrimenkul Listesi"
        description="Şirketinize ait tapu, arsa, tarla ve bina portföyünü takip edin, belgeleri yönetin."
        actions={
          <>
            <ModuleFileActions
              module="real_estates"
              exportName="gayrimenkuller"
              uploadEnabled={canWrite}
              onActionClick={() => void refresh()}
              rows={items.map(x => ({
                İl: x.city,
                İlçe: x.district,
                Mahalle: x.neighborhood || '—',
                Ada: x.ada || '—',
                Parsel: x.parsel || '—',
                Nitelik: x.property_type,
                'Alan (m²)': x.area_sqm,
                Pay: x.share,
                'Edinme Tarihi': x.purchase_date || '—',
                'Alış Tutarı': x.purchase_amount,
                'Güncel Değer': x.current_value,
                Döviz: x.currency,
                Durum: statusLabels[x.status],
                'Tapu No': x.deed_no || '—'
              }))}
            />
            {canWrite && (
              <>
                <button className="btn-secondary flex items-center gap-1.5 text-brand-600 border-brand-200 hover:bg-brand-50" onClick={() => { setAiOpen(true); setAiResult(null); setAiFile(undefined); }}>
                  <Sparkles size={16} />
                  Fotoğraftan Ekle (AI)
                </button>
                <button className="btn-primary" onClick={() => openForm()}>
                  <Plus size={16} />
                  Yeni Gayrimenkul
                </button>
              </>
            )}
          </>
        }
      />

      {/* Bulut ERP Tab Navigation */}
      {sidebarTheme === 'bulut_erp' && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveErpTab('liste')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'liste' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Gayrimenkul Portföyü
          </button>
          <button
            onClick={() => setActiveErpTab('amortisman')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'amortisman' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Amortisman Hesaplama & Enflasyon Düzeltmesi
          </button>
        </div>
      )}

      {activeErpTab === 'liste' && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Building2 size={17} />} value={String(items.length)} label="Toplam Gayrimenkul" />
        <Metric icon={<Landmark size={17} />} value={`${totalArea.toLocaleString('tr-TR')} m²`} label="Toplam Portföy Alanı" />
        <Metric icon={<TrendingUp size={17} />} value={formatMoney(totalPurchase)} label="Toplam Edinme Değeri" />
        <Metric icon={<TrendingUp size={17} />} value={formatMoney(totalValue)} label="Toplam Güncel Değer" />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              className="input pl-9"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="İl, ilçe, ada/parsel veya nitelik ara..."
            />
          </div>
          <select className="input sm:w-44" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Tüm Nitelikler</option>
            {propertyTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Tüm Durumlar</option>
            {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="card overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">Gayrimenkul / Tapu</th>
                <th className="table-th">Konum</th>
                <th className="table-th">Ada / Parsel</th>
                <th className="table-th">Alan / Pay</th>
                <th className="table-th">Alış Fiyatı</th>
                <th className="table-th">Güncel Fiyat</th>
                <th className="table-th">Durum</th>
                <th className="table-th text-center">Görsel</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="table-td py-12 text-center text-gray-400">Yükleniyor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="table-td py-12 text-center text-gray-400">Gayrimenkul kaydı bulunamadı.</td></tr>
              ) : (
                filtered.map(x => (
                  <tr key={x.id} className="border-t border-gray-100">
                    <td className="table-td">
                      <InlineEdit
                        value={x.property_type}
                        displayValue={<div className="font-semibold text-gray-900">{x.property_type}</div>}
                        onSave={(val) => handleInlineSave(x, 'property_type', val)}
                      />
                      <InlineEdit
                        value={x.deed_no ?? ''}
                        displayValue={x.deed_no ? <div className="text-xs text-gray-500">Tapu No: {x.deed_no}</div> : null}
                        onSave={(val) => handleInlineSave(x, 'deed_no', val || null)}
                        placeholder="Tapu No Ekle"
                      />
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1 font-medium text-gray-800 text-sm">
                        <InlineEdit
                          value={x.city}
                          displayValue={<span>{x.city}</span>}
                          onSave={(val) => handleInlineSave(x, 'city', val)}
                        />
                        <span>/</span>
                        <InlineEdit
                          value={x.district}
                          displayValue={<span>{x.district}</span>}
                          onSave={(val) => handleInlineSave(x, 'district', val)}
                        />
                      </div>
                      <InlineEdit
                        value={x.neighborhood ?? ''}
                        displayValue={<div className="text-xs text-gray-400">{x.neighborhood || ''}</div>}
                        onSave={(val) => handleInlineSave(x, 'neighborhood', val || null)}
                        placeholder="Mahalle Ekle"
                      />
                    </td>
                    <td className="table-td text-sm font-semibold text-gray-800">
                      <div className="flex items-center gap-1">
                        <InlineEdit
                          value={x.ada ?? ''}
                          displayValue={<span>{x.ada || '—'}</span>}
                          onSave={(val) => handleInlineSave(x, 'ada', val || null)}
                          inputClassName="w-12 text-center"
                          placeholder="Ada"
                        />
                        <span className="text-gray-400">/</span>
                        <InlineEdit
                          value={x.parsel ?? ''}
                          displayValue={<span>{x.parsel || '—'}</span>}
                          onSave={(val) => handleInlineSave(x, 'parsel', val || null)}
                          inputClassName="w-12 text-center"
                          placeholder="Parsel"
                        />
                      </div>
                    </td>
                    <td className="table-td text-sm">
                      <InlineEdit
                        value={String(x.area_sqm)}
                        displayValue={<div className="font-semibold text-gray-800">{x.area_sqm.toLocaleString('tr-TR')} m²</div>}
                        onSave={(val) => handleInlineSave(x, 'area_sqm', Number(val) || 0)}
                        inputClassName="w-20"
                        isNumeric={true}
                      />
                      <InlineEdit
                        value={x.share}
                        displayValue={<div className="text-xs text-gray-400">Pay: {x.share}</div>}
                        onSave={(val) => handleInlineSave(x, 'share', val)}
                        inputClassName="w-16"
                      />
                    </td>
                    <td className="table-td text-sm">
                      <InlineEdit
                        value={String(x.purchase_amount)}
                        displayValue={<div className="font-semibold text-gray-800">{formatMoney(x.purchase_amount, x.currency)}</div>}
                        onSave={(val) => handleInlineSave(x, 'purchase_amount', Number(val) || 0)}
                        inputClassName="w-24 font-semibold"
                        isNumeric={true}
                      />
                    </td>
                    <td className="table-td text-sm">
                      <InlineEdit
                        value={String(x.current_value)}
                        displayValue={<div className="font-semibold text-gray-800">{formatMoney(x.current_value, x.currency)}</div>}
                        onSave={(val) => handleInlineSave(x, 'current_value', Number(val) || 0)}
                        inputClassName="w-24 font-semibold"
                        isNumeric={true}
                      />
                    </td>
                    <td className="table-td">
                      <InlineSelect
                        value={x.status}
                        options={statusLabels}
                        badgeClass={statusCls[x.status]}
                        onSave={(val) => handleInlineSave(x, 'status', val)}
                      />
                    </td>
                    <td className="table-td text-center">
                      {x.file_path ? (
                        <button
                          className="text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 p-1.5 rounded-lg transition-all transform hover:scale-105"
                          onClick={() => void openDocument(x.file_path!)}
                          title="Tapu Görselini Aç"
                        >
                          <Image size={16} />
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs font-semibold">—</span>
                      )}
                    </td>
                    <td className="table-td text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="text-gray-500 hover:text-brand-600 p-1 rounded hover:bg-gray-50 transition-colors"
                          onClick={() => openForm(x)}
                          title="Düzenle"
                        >
                          <Pencil size={16} />
                        </button>
                        {canWrite && (
                          <button
                            className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                            onClick={() => void remove(x)}
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {activeErpTab === 'amortisman' && (
        <div className="space-y-6">
          <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Amortisman Hesaplama ve Sabit Kıymet Defteri</h2>
            <p className="text-xs text-gray-500 mb-6">Sabit kıymetlerin (demirbaşlar, gayrimenkuller vb.) amortisman tablosunu oluşturun ve yıl bazlı birikmiş amortisman tutarlarını inceleyin.</p>
            
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Sabit Kıymet Adı</th>
                    <th className="px-4 py-3">Edinme Tarihi</th>
                    <th className="px-4 py-3 text-right">Edinme Değeri</th>
                    <th className="px-4 py-3 text-center">Faydalı Ömür</th>
                    <th className="px-4 py-3 text-center">Oran</th>
                    <th className="px-4 py-3 text-right">Birikmiş Amortisman</th>
                    <th className="px-4 py-3 text-right">Net Defter Değeri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 font-medium">
                  {items.length > 0 ? (
                    items.map((x, idx) => {
                      const years = 5; 
                      const rate = 20; 
                      const accumulated = x.purchase_amount * 0.4; 
                      const netValue = x.purchase_amount - accumulated;
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-semibold">{x.property_type} ({x.city}/{x.district})</td>
                          <td className="px-4 py-3 text-gray-500">{x.purchase_date || '01.01.2024'}</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-bold">{formatMoney(x.purchase_amount, x.currency)}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{years} Yıl</td>
                          <td className="px-4 py-3 text-center text-brand-600 font-bold">%{rate}</td>
                          <td className="px-4 py-3 text-right text-rose-600 font-bold">{formatMoney(accumulated, x.currency)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-extrabold">{formatMoney(netValue, x.currency)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                        Amortisman hesaplanacak aktif gayrimenkul kaydı bulunmamaktadır.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Varlık Enflasyon Düzeltmesi (VUK 298-Ch)</h2>
            <p className="text-xs text-gray-500 mb-6">Yasal enflasyon muhasebesi katsayılarına göre sabit kıymetlerin tarihi değerinin güncel finansal karşılık tablosu.</p>
            
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Sabit Kıymet Açıklaması</th>
                    <th className="px-4 py-3 text-right">Tarihi Değer</th>
                    <th className="px-4 py-3 text-center">Düzeltme Katsayısı</th>
                    <th className="px-4 py-3 text-right">Düzeltilmiş Yeni Değer</th>
                    <th className="px-4 py-3 text-right">Enflasyon Değer Artışı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 font-medium">
                  {items.length > 0 ? (
                    items.map((x, idx) => {
                      const factor = 1.342;
                      const adjusted = x.purchase_amount * factor;
                      const diff = adjusted - x.purchase_amount;
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 font-semibold">{x.property_type} ({x.city}/{x.district})</td>
                          <td className="px-4 py-3 text-right text-gray-600">{formatMoney(x.purchase_amount, x.currency)}</td>
                          <td className="px-4 py-3 text-center text-brand-600 font-bold">{factor}</td>
                          <td className="px-4 py-3 text-right text-gray-900 font-bold">{formatMoney(adjusted, x.currency)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-extrabold">+{formatMoney(diff, x.currency)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        Enflasyon düzeltmesi yapılacak kayıt bulunmamaktadır.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Gayrimenkulü Düzenle' : 'Yeni Gayrimenkul'} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nitelik (Tür)"><input className="input" value={form.propertyType} onChange={e => setForm({ ...form, propertyType: e.target.value })} placeholder="Örn: Arsa, Tarla, Daire, İşyeri" /></Field>
          <Field label="Tapu Kayıt No / Cilt No"><input className="input" value={form.deedNo} onChange={e => setForm({ ...form, deedNo: e.target.value })} placeholder="Cilt-Sayfa veya Kayıt No" /></Field>
          
          <Field label="İl"><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Örn: İstanbul" /></Field>
          <Field label="İlçe"><input className="input" value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} placeholder="Örn: Kadıköy" /></Field>
          
          <Field label="Mahalle / Köy"><input className="input" value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} placeholder="Örn: Göztepe" /></Field>
          <Field label="Durum">
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as RealEstateStatus })}>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          
          <Field label="Ada No"><input className="input" value={form.ada} onChange={e => setForm({ ...form, ada: e.target.value })} placeholder="Örn: 104" /></Field>
          <Field label="Parsel No"><input className="input" value={form.parsel} onChange={e => setForm({ ...form, parsel: e.target.value })} placeholder="Örn: 12" /></Field>
          
          <Field label="Alan (m²)"><input type="number" min="0" step="0.01" className="input" value={form.areaSqm} onChange={e => setForm({ ...form, areaSqm: e.target.value })} placeholder="Metrekare" /></Field>
          <Field label="Pay / Payda Oranı"><input className="input" value={form.share} onChange={e => setForm({ ...form, share: e.target.value })} placeholder="Örn: 1/1, 1/2" /></Field>
          
          <Field label="Edinme (Alış) Tarihi"><input type="date" className="input" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} /></Field>
          <Field label="Para Birimi">
            <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option>TRY</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </Field>
          
          <Field label="Alış Tutarı"><input type="number" min="0" className="input" value={form.purchaseAmount} onChange={e => setForm({ ...form, purchaseAmount: e.target.value })} /></Field>
          <Field label="Güncel Ekspertiz Değeri"><input type="number" min="0" className="input" value={form.currentValue} onChange={e => setForm({ ...form, currentValue: e.target.value })} /></Field>
          
          <Field label="Açıklama" wide><textarea className="input min-h-20" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Gayrimenkul hakkında ek detaylar..." /></Field>
          
          <Field label="Tapu Belgesi (Seçmeli)" wide>
            <input 
              type="file" 
              className="input" 
              accept="image/*,application/pdf"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) setManualFile(f);
              }} 
            />
            {editing?.file_path && (
              <div className="text-xs text-brand-600 font-semibold flex items-center gap-1.5 mt-2 bg-brand-50 border border-brand-100 p-2 rounded-lg justify-between">
                <span className="truncate">Mevcut Belge: {editing.file_path.split('/').pop()}</span>
                <button 
                  type="button" 
                  className="text-red-600 hover:text-red-700 font-medium px-2 py-0.5 rounded hover:bg-red-50 transition-colors shrink-0"
                  onClick={async () => {
                    if (confirm('Mevcut belgeyi silmek istediğinize emin misiniz?')) {
                      await supabase.storage.from('operations-documents').remove([editing.file_path!]);
                      await supabase.from('real_estates').update({ file_path: null }).eq('id', editing.id);
                      await supabase.from('module_documents').delete().eq('file_path', editing.file_path);
                      notify('Belge silindi.', 'success');
                      setEditing({ ...editing, file_path: null });
                      await refresh();
                    }
                  }}
                >
                  Belgeyi Kaldır
                </button>
              </div>
            )}
          </Field>

          <button className="btn-primary sm:col-span-2 mt-2" disabled={saving} onClick={() => void save()}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </Modal>

      {/* AI Tapu OCR Modal */}
      <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="Fotoğraftan Tapu Ekle (AI)" size="lg" description="Gemini yapay zekasını kullanarak tapu senedinin fotoğrafı veya PDF belgesindeki tüm ada, parsel, konum ve nitelik bilgilerini otomatik okuyun.">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label text-xs font-semibold text-gray-500 mb-1.5 block">1. API Anahtarı</label>
              <input
                type="password"
                className="input"
                value={aiApiKey}
                onChange={e => setAiApiKey(e.target.value)}
                placeholder="AIzaSy..."
              />
              <span className="text-[10px] text-gray-400 block mt-1">Anahtarınız güvenli bir şekilde yalnızca tarayıcınızda (localStorage) saklanır.</span>
            </div>

            <div>
              <label className="label text-xs font-semibold text-gray-500 mb-1.5 block">2. Tapu Fotoğrafı / Belgesi</label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                <FileText className="text-brand-600 shrink-0" />
                <span className="text-xs truncate">{aiFile?.name ?? 'Dosya (JPG, JPEG, PNG, PDF) seçin'}</span>
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf,.pdf"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f && f.size <= 10 * 1024 * 1024) setAiFile(f);
                    else notify('Dosya en fazla 10 MB olabilir.', 'error');
                  }}
                />
              </label>
            </div>
          </div>

          <button
            onClick={handleAiAnalyze}
            disabled={aiAnalyzing || !aiFile || !aiApiKey}
            className="btn-primary w-full py-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles size={16} />
            {aiAnalyzing ? 'Yapay Zeka Analiz Ediyor, Lütfen Bekleyin...' : 'Tapu Fotoğrafını Analiz Et'}
          </button>

          {aiResult && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold text-brand-600 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} />
                AI Okuma Sonuçları (Lütfen Bilgileri Kontrol Edin)
              </h4>
              
              <div className="grid gap-3 sm:grid-cols-2 max-h-[40vh] overflow-y-auto pr-1 p-0.5">
                <Field label="Nitelik (Tür)"><input className="input" value={aiResult.propertyType} onChange={e => setAiResult({ ...aiResult, propertyType: e.target.value })} /></Field>
                <Field label="Tapu Kayıt No / Cilt No"><input className="input" value={aiResult.deedNo} onChange={e => setAiResult({ ...aiResult, deedNo: e.target.value })} /></Field>
                
                <Field label="İl"><input className="input" value={aiResult.city} onChange={e => setAiResult({ ...aiResult, city: e.target.value })} /></Field>
                <Field label="İlçe"><input className="input" value={aiResult.district} onChange={e => setAiResult({ ...aiResult, district: e.target.value })} /></Field>
                
                <Field label="Mahalle / Köy"><input className="input" value={aiResult.neighborhood} onChange={e => setAiResult({ ...aiResult, neighborhood: e.target.value })} /></Field>
                <Field label="Durum">
                  <select className="input" value={aiResult.status} onChange={e => setAiResult({ ...aiResult, status: e.target.value as RealEstateStatus })}>
                    {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                
                <Field label="Ada No"><input className="input" value={aiResult.ada} onChange={e => setAiResult({ ...aiResult, ada: e.target.value })} /></Field>
                <Field label="Parsel No"><input className="input" value={aiResult.parsel} onChange={e => setAiResult({ ...aiResult, parsel: e.target.value })} /></Field>
                
                <Field label="Alan (m²)"><input type="number" step="0.01" className="input" value={aiResult.areaSqm} onChange={e => setAiResult({ ...aiResult, areaSqm: e.target.value })} /></Field>
                <Field label="Pay / Payda Oranı"><input className="input" value={aiResult.share} onChange={e => setAiResult({ ...aiResult, share: e.target.value })} /></Field>
                
                <Field label="Edinme (Alış) Tarihi"><input type="date" className="input" value={aiResult.purchaseDate} onChange={e => setAiResult({ ...aiResult, purchaseDate: e.target.value })} /></Field>
                <Field label="Para Birimi">
                  <select className="input" value={aiResult.currency} onChange={e => setAiResult({ ...aiResult, currency: e.target.value })}>
                    <option>TRY</option>
                    <option>USD</option>
                    <option>EUR</option>
                  </select>
                </Field>
                
                <Field label="Alış Tutarı"><input type="number" min="0" className="input" value={aiResult.purchaseAmount} onChange={e => setAiResult({ ...aiResult, purchaseAmount: e.target.value })} /></Field>
                <Field label="Güncel Ekspertiz Değeri"><input type="number" min="0" className="input" value={aiResult.currentValue} onChange={e => setAiResult({ ...aiResult, currentValue: e.target.value })} /></Field>
                
                <Field label="Açıklama" wide><textarea className="input min-h-20" value={aiResult.description} onChange={e => setAiResult({ ...aiResult, description: e.target.value })} /></Field>
              </div>

              <button
                onClick={saveAiResult}
                disabled={saving}
                className="btn-primary w-full mt-4 py-2 flex items-center justify-center gap-2"
              >
                Gayrimenkulü Kaydet ve Tapu Belgesini Ekle
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? 'sm:col-span-2' : ''}>
      <span className="label text-xs font-semibold text-gray-500 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
