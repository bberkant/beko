import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CircleDollarSign, Gavel, Pencil, Plus, Search, Trash2, Trophy } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ModuleFileActions } from '../../components/ui/ModuleFileActions';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { TenderFileManager } from './TenderFileManager';
import { EkapDtCandidates } from './EkapDtCandidates';

type TenderStatus = 'hazirlaniyor'|'teklif-verildi'|'degerlendirme'|'kazanildi'|'kaybedildi'|'iptal';
interface Tender { id:string; tender_number:string; title:string; institution:string; tender_type:string; method:string; status:TenderStatus; estimated_amount:number; bid_amount:number|null; currency:string; publication_date:string|null; deadline_at:string; result_date:string|null; assigned_to:string; description:string|null; teminat_mektubu:string|null }
interface FormState { tenderNumber:string; title:string; institution:string; tenderType:string; method:string; status:TenderStatus; estimatedAmount:string; bidAmount:string; currency:string; publicationDate:string; deadlineAt:string; resultDate:string; assignedTo:string; description:string; teminatMektubu:string }

const emptyForm=():FormState=>({
  tenderNumber:'',
  title:'',
  institution:'',
  tenderType:'mal', // Always default to mal (goods) for DT
  method:'dogrudan', // Always default to dogrudan (direct) for DT
  status:'hazirlaniyor',
  estimatedAmount:'',
  bidAmount:'',
  currency:'TRY',
  publicationDate:'',
  deadlineAt:'',
  resultDate:'',
  assignedTo:'',
  description:'',
  teminatMektubu:''
});

const statusLabels:Record<TenderStatus,string>={hazirlaniyor:'Hazırlanıyor','teklif-verildi':'Teklif Verildi',degerlendirme:'Değerlendirme',kazanildi:'Kazanıldı',kaybedildi:'Kaybedildi',iptal:'İptal'};
const statusCls:Record<TenderStatus,string>={hazirlaniyor:'bg-gray-100 text-gray-600','teklif-verildi':'bg-blue-50 text-blue-700',degerlendirme:'bg-amber-50 text-amber-700',kazanildi:'bg-emerald-50 text-emerald-700',kaybedildi:'bg-red-50 text-red-700',iptal:'bg-gray-100 text-gray-500'};
const money=(n:number,c='TRY')=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:c,maximumFractionDigits:0}).format(n);

export function DogrudanTeminPage(){
  const {user}=useAuth(); const {notify}=useToast(); const [items,setItems]=useState<Tender[]>([]); const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState(''); const [filter,setFilter]=useState(''); const [open,setOpen]=useState(false); const [editing,setEditing]=useState<Tender>(); const [form,setForm]=useState<FormState>(emptyForm());
  const [saving,setSaving]=useState(false);
  const [sortField, setSortField] = useState<'deadline_at' | 'title' | 'institution' | 'bid_amount'>('deadline_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const canWrite=['Süper Admin','Admin','Developer','Süper Yönetici','Yönetici','Muhasebe','Finans'].includes(user?.role??'');

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

  const [activeErpTab, setActiveErpTab] = useState<'dogrudan' | 'satinalma' | 'talep'>('dogrudan');

  const handleSort = (field: 'deadline_at' | 'title' | 'institution' | 'bid_amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  const refresh=useCallback(async()=>{
    if(!user?.organizationId)return;
    setLoading(true);
    
    // Auto-delete expired doğrudan temin items in 'hazirlaniyor' status
    const nowIso = new Date().toISOString();
    await supabase
      .from('tenders')
      .delete()
      .eq('organization_id', user.organizationId)
      .or('method.eq.dogrudan,tender_number.ilike.%DT%')
      .eq('status', 'hazirlaniyor')
      .lt('deadline_at', nowIso);

    // Filter by method = 'dogrudan' or tender_number containing 'DT'
    const{data,error}=await supabase
      .from('tenders')
      .select('*')
      .eq('organization_id',user.organizationId)
      .or('method.eq.dogrudan,tender_number.ilike.%DT%')
      .order('deadline_at',{ascending:true});
      
    if(error) notify(error.message,'error');
    else setItems((data??[]).map(r=>({...r,estimated_amount:Number(r.estimated_amount),bid_amount:r.bid_amount==null?null:Number(r.bid_amount)})) as Tender[]);
    setLoading(false)
  },[user?.organizationId,notify]);
  
  useEffect(()=>{void refresh()},[refresh]);

  const filtered = useMemo(() => {
    const res = items.filter(x => 
      (!filter || x.status === filter) && 
      `${x.tender_number} ${x.title} ${x.institution} ${x.teminat_mektubu||''}`.toLowerCase().includes(query.toLowerCase())
    );

    return res.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === null || valA === undefined) valA = sortField === 'bid_amount' ? 0 : '';
      if (valB === null || valB === undefined) valB = sortField === 'bid_amount' ? 0 : '';

      let cmp = 0;
      if (typeof valA === 'string') {
        cmp = valA.localeCompare(valB, 'tr');
      } else {
        cmp = valA - valB;
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [items, query, filter, sortField, sortOrder]);

  const upcoming=items.filter(x=>!['kazanildi','kaybedildi','iptal'].includes(x.status)&&new Date(x.deadline_at)>=new Date()).length;

  const SortHeader = ({ label, field, className = "" }: { label: string; field: typeof sortField; className?: string }) => {
    const active = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`table-th cursor-pointer select-none hover:bg-gray-150 hover:text-gray-950 transition-colors ${className}`}
      >
        <div className={`flex items-center gap-1.5 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : 'justify-start'}`}>
          <span>{label}</span>
          <span className={`text-[10px] ${active ? 'text-brand-600 font-bold' : 'text-gray-300'}`}>
            {active ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };
  
  const openForm=(item?:Tender)=>{
    setEditing(item);
    setForm(item?{
      tenderNumber:item.tender_number,
      title:item.title,
      institution:item.institution,
      tenderType:item.tender_type,
      method:item.method,
      status:item.status,
      estimatedAmount:String(item.estimated_amount),
      bidAmount:item.bid_amount==null?'':String(item.bid_amount),
      currency:item.currency,
      publicationDate:item.publication_date??'',
      deadlineAt:item.deadline_at.slice(0,16),
      resultDate:item.result_date??'',
      assignedTo:item.assigned_to,
      description:item.description??'',
      teminatMektubu:item.teminat_mektubu??''
    }:emptyForm());
    setOpen(true)
  };
  
  const save=async()=>{
    if(!user?.organizationId||!form.tenderNumber.trim()||!form.title.trim()||!form.institution.trim()||!form.deadlineAt){
      notify('Doğrudan temin no, başlık, kurum ve son teslim tarihi zorunludur.','error');
      return;
    }
    setSaving(true);
    const payload={
      organization_id:user.organizationId,
      tender_number:form.tenderNumber.trim(),
      title:form.title.trim(),
      institution:form.institution.trim(),
      tender_type:'mal', // Always locked to 'mal' for doğrudan temin
      method:'dogrudan', // Always locked to 'dogrudan' for doğrudan temin
      status:form.status,
      estimated_amount:Number(form.estimatedAmount)||0,
      bid_amount:form.bidAmount?Number(form.bidAmount):null,
      currency:form.currency,
      publication_date:form.publicationDate||null,
      deadline_at:new Date(form.deadlineAt).toISOString(),
      result_date:form.resultDate||null,
      assigned_to:form.assignedTo.trim(),
      description:form.description.trim()||null,
      teminat_mektubu:form.teminatMektubu.trim()||null,
      updated_at:new Date().toISOString()
    };
    const q=editing?supabase.from('tenders').update(payload).eq('id',editing.id).eq('organization_id',user.organizationId):supabase.from('tenders').insert(payload);
    const{error}=await q;
    setSaving(false);
    if(error){notify(error.message,'error');return}
    notify(editing?'Doğrudan temin güncellendi.':'Doğrudan temin eklendi.','success');
    setOpen(false);
    await refresh()
  };
  
  const remove=async(item:Tender)=>{
    if(!confirm(`“${item.title}” doğrudan temini silinsin mi?`))return;
    const{error}=await supabase.from('tenders').delete().eq('id',item.id).eq('organization_id',user?.organizationId);
    if(error)notify(error.message,'error');
    else{notify('Doğrudan temin silindi.','success');await refresh()}
  };

  const removeAll = async () => {
    if (!user?.organizationId) return;
    const targetItems = filtered;
    if (targetItems.length === 0) {
      notify('Silinecek doğrudan temin bulunamadı.', 'info');
      return;
    }
    const count = targetItems.length;
    const msg = count === items.length
      ? `Tüm doğrudan teminleri (${count} adet) silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
      : `Filtrelenen ${count} adet doğrudan temini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`;

    if (!confirm(msg)) return;

    const ids = targetItems.map(x => x.id);
    const batchSize = 100;
    let hasError = false;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const { error } = await supabase
        .from('tenders')
        .delete()
        .in('id', batchIds)
        .eq('organization_id', user.organizationId);
      if (error) {
        notify(error.message, 'error');
        hasError = true;
        break;
      }
    }
    if (!hasError) {
      notify(`${count} adet doğrudan temin başarıyla silindi.`, 'success');
      await refresh();
    }
  };
  
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader 
        title="Doğrudan Temin" 
        description="Doğrudan temin süreçlerini, teklif tarihlerini, teslimatları ve sonuçları yönetin." 
        actions={
          <>
            <EkapDtCandidates canWrite={canWrite} onAccepted={refresh}/>
            <TenderFileManager tenders={items.map(x=>({id:x.id,title:x.title,tender_number:x.tender_number}))} canWrite={canWrite}/>
            <ModuleFileActions 
              module="tenders" 
              exportName="dogrudan_teminler" 
              uploadEnabled={false} 
              rows={items.map(x=>({
                'Doğrudan Temin No':x.tender_number,
                Başlık:x.title,
                Kurum:x.institution,
                Durum:statusLabels[x.status],
                'Yaklaşık Tutar':x.estimated_amount,
                'Teklif Tutarı':x.bid_amount,
                'Son Teslim':x.deadline_at,
                'Teminat Mektubu':x.teminat_mektubu
              }))}
            />
            {canWrite&&<button className="btn-primary" onClick={()=>openForm()}><Plus size={16}/>Yeni Doğrudan Temin</button>}
          </>
        }
      />

      {/* Bulut ERP Tab Navigation */}
      {sidebarTheme === 'bulut_erp' && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveErpTab('dogrudan')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'dogrudan' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Doğrudan Temin Yönetimi (Ekap)
          </button>
          <button
            onClick={() => setActiveErpTab('satinalma')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'satinalma' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Satınalma Sipariş Takibi
          </button>
          <button
            onClick={() => setActiveErpTab('talep')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all ${
              activeErpTab === 'talep' ? 'border-[#f37021] text-[#f37021]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            İç Talep & Onay Süreçleri
          </button>
        </div>
      )}

      {activeErpTab === 'dogrudan' && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={<Gavel size={17}/>} value={String(items.length)} label="Toplam Doğrudan Temin"/>
            <Metric icon={<CalendarClock size={17}/>} value={String(upcoming)} label="Aktif / Yaklaşan"/>
            <Metric icon={<Trophy size={17}/>} value={String(items.filter(x=>x.status==='kazanildi').length)} label="Kazanılan"/>
            <Metric icon={<CircleDollarSign size={17}/>} value={money(items.reduce((s,x)=>s+(x.bid_amount??0),0))} label="Toplam Teklif"/>
          </div>
          
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative max-w-lg flex-1">
              <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
              <input className="input pl-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Doğrudan temin no, başlık, kurum veya teminat mektubu ara..."/>
            </div>
            <select className="input sm:w-52" value={filter} onChange={e=>setFilter(e.target.value)}>
              <option value="">Tüm Durumlar</option>
              {Object.entries(statusLabels).map(([v,l])=><option value={v} key={v}>{l}</option>)}
            </select>
          </div>
          
          <div className="card overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <SortHeader label="Doğrudan Temin" field="title" />
                  <SortHeader label="Kurum" field="institution" />
                  <SortHeader label="Son Teslim Tarihi" field="deadline_at" />
                  <SortHeader label="Teklif Tutarı" field="bid_amount" />
                  <th className="table-th text-left">Teminat Mektubu</th>
                  <th className="table-th text-left">Durum</th>
                  <th className="table-th text-right">
                    {canWrite && filtered.length > 0 && (
                      <button
                        onClick={() => void removeAll()}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                        title="Tümünü Sil"
                      >
                        <Trash2 size={13} />
                        <span>Tümünü Sil</span>
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="table-td py-12 text-center text-gray-400">Doğrudan Temin yükleniyor...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="table-td py-12 text-center text-gray-400">Doğrudan temin bulunamadı.</td></tr>
                ) : (
                  filtered.map(x => (
                    <tr key={x.id} className="border-t border-gray-100">
                      <td className="table-td max-w-[280px]">
                        <a 
                          href="https://ekapv2.kik.gov.tr/ekap-dt/search" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={() => { 
                            navigator.clipboard.writeText(x.tender_number); 
                            notify('Doğrudan temin numarası panoya kopyalandı! EKAP sayfasında arama kutusuna Ctrl+V ile yapıştırabilirsiniz.', 'success'); 
                          }} 
                          className="font-medium text-brand-600 hover:text-brand-800 hover:underline truncate block" 
                          title={`${x.title} (EKAP'ta ara - numara panoya kopyalanır)`}
                        >
                          {x.title}
                        </a>
                        <div className="text-xs text-gray-500">{x.tender_number}</div>
                      </td>
                      <td className="table-td max-w-[200px]"><div className="truncate" title={x.institution}>{x.institution}</div></td>
                      <td className="table-td">{new Date(x.deadline_at).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}</td>
                      <td className="table-td font-medium">{x.bid_amount==null?'—':money(x.bid_amount,x.currency)}</td>
                      <td className="table-td text-sm text-gray-500">{x.teminat_mektubu||'—'}</td>
                      <td className="table-td">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusCls[x.status]}`}>{statusLabels[x.status]}</span>
                      </td>
                      <td className="table-td">
                        {canWrite&& (
                          <div className="flex gap-2">
                            <button className="text-gray-500 hover:text-brand-600" onClick={()=>openForm(x)} aria-label="Düzenle"><Pencil size={16}/></button>
                            <button className="text-gray-400 hover:text-red-600" onClick={()=>void remove(x)} aria-label="Sil"><Trash2 size={16}/></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeErpTab === 'satinalma' && (
        <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Satınalma Sipariş Takip Paneli</h2>
          <p className="text-xs text-gray-550 mb-6">Tedarikçilere geçilen siparişlerin onay, sevkıyat ve faturalandırılma süreçlerini anlık izleyin.</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Sipariş Kodu</th>
                  <th className="px-4 py-3">Tedarikçi Firma</th>
                  <th className="px-4 py-3 text-right">Tutar</th>
                  <th className="px-4 py-3 text-center">Durum</th>
                  <th className="px-4 py-3 text-center">Sipariş Tarihi</th>
                  <th className="px-4 py-3 text-center">Teslimat Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {[
                  { code: 'SAS-2026-0094', vendor: 'ETÇİLER A.Ş.', amount: '450.000,00 ₺', status: 'Sevk Edildi', date: '01.08.2026', delivery: '15.08.2026' },
                  { code: 'SAS-2026-0095', vendor: 'ULUDAĞ ET PAZARI', amount: '185.000,00 ₺', status: 'Onay Bekliyor', date: '03.08.2026', delivery: '18.08.2026' },
                  { code: 'SAS-2026-0096', vendor: 'DARS GIDA LTD.', amount: '95.000,00 ₺', status: 'Hazırlanıyor', date: '05.08.2026', delivery: '20.08.2026' },
                  { code: 'SAS-2026-0097', vendor: 'DARS AMBALAJ A.Ş.', amount: '42.000,00 ₺', status: 'Teslim Alındı', date: '10.08.2026', delivery: '12.08.2026' },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-brand-600 font-bold">{item.code}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">{item.vendor}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-bold">{item.amount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Teslim Alındı' ? 'bg-emerald-50 text-emerald-600' : item.status === 'Sevk Edildi' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.date}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.delivery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeErpTab === 'talep' && (
        <div className="card p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-2">İç Talep ve Bütçe Onay Mekanizması</h2>
          <p className="text-xs text-gray-550 mb-6">Şirket içi departmanların satın alma taleplerinin bütçe limitlerine göre incelenmesi ve onaylanması.</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Talep Sahibi / Bölüm</th>
                  <th className="px-4 py-3">Talep Edilen Malzeme</th>
                  <th className="px-4 py-3 text-right">Miktar / Birim</th>
                  <th className="px-4 py-3 text-right">Tahmini Tutar</th>
                  <th className="px-4 py-3 text-center">Bütçe Kontrolü</th>
                  <th className="px-4 py-3 text-center">Onay Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 font-medium">
                {[
                  { requester: 'Ahmet Yılmaz / Üretim', item: 'Karkas Dana Eti', qty: '1.500 Kg', cost: '330.000 ₺', budget: 'Uygundur', status: 'Onaylandı' },
                  { requester: 'Merve Demir / İdari İşler', item: 'Ofis Sarf Malzemeleri', qty: '1 Paket', cost: '12.500 ₺', budget: 'Uygundur', status: 'Yöneticide' },
                  { requester: 'Serkan Kaya / Lojistik', item: 'Araç Bakım Lastiği', qty: '8 Adet', cost: '64.000 ₺', budget: 'Bütçe Aşımı (Ek Onay)', status: 'Beklemede' },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-semibold">{item.requester}</td>
                    <td className="px-4 py-3 text-gray-500">{item.item}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-bold">{item.qty}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">{item.cost}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.budget === 'Uygundur' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {item.budget}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'Onaylandı' ? 'bg-emerald-50 text-emerald-600' : item.status === 'Beklemede' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Doğrudan Temini Düzenle':'Yeni Doğrudan Temin'} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Doğrudan Temin No"><input className="input" value={form.tenderNumber} onChange={e=>setForm({...form,tenderNumber:e.target.value})}/></Field>
          <Field label="Başlık"><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field>
          <Field label="Kurum"><input className="input" value={form.institution} onChange={e=>setForm({...form,institution:e.target.value})}/></Field>
          <Field label="Teminat Mektubu"><input className="input" value={form.teminatMektubu} onChange={e=>setForm({...form,teminatMektubu:e.target.value})} placeholder="Örn: 50.000 TL - Akbank"/></Field>
          <Field label="Para Birimi">
            <select className="input" value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}>
              <option>TRY</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </Field>
          <Field label="Durum">
            <select className="input" value={form.status} onChange={e=>setForm({...form,status:e.target.value as TenderStatus})}>
              {Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Yaklaşık Tutar"><input type="number" min="0" className="input" value={form.estimatedAmount} onChange={e=>setForm({...form,estimatedAmount:e.target.value})}/></Field>
          <Field label="Teklif Tutarı"><input type="number" min="0" className="input" value={form.bidAmount} onChange={e=>setForm({...form,bidAmount:e.target.value})}/></Field>
          <Field label="Yayın Tarihi"><input type="date" className="input" value={form.publicationDate} onChange={e=>setForm({...form,publicationDate:e.target.value})}/></Field>
          <Field label="Son Teslim Tarihi"><input type="datetime-local" className="input" value={form.deadlineAt} onChange={e=>setForm({...form,deadlineAt:e.target.value})}/></Field>
          <Field label="Sonuç Tarihi"><input type="date" className="input" value={form.resultDate} onChange={e=>setForm({...form,resultDate:e.target.value})}/></Field>
          <Field label="Açıklama" wide><textarea className="input min-h-24" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field>
          <button className="btn-primary sm:col-span-2" disabled={saving} onClick={()=>void save()}>{saving?'Kaydediliyor...':'Kaydet'}</button>
        </div>
      </Modal>
    </div>
  );
}

function Metric({icon,value,label}:{icon:React.ReactNode;value:string;label:string}){return <div className="card p-4"><div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">{icon}</div><div className="text-xl font-semibold">{value}</div><div className="text-xs text-gray-500">{label}</div></div>}
function Field({label,children,wide=false}:{label:string;children:React.ReactNode;wide?:boolean}){return <label className={wide?'sm:col-span-2':''}><span className="label">{label}</span>{children}</label>}
