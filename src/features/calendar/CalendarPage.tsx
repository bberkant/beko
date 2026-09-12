import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Car, ChevronLeft, ChevronRight, CreditCard, Gavel, ShieldCheck, Plus, Trash2, CheckSquare, Square, ListTodo, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { useStore } from '../credit-cards/data/store';
import { useVehicles } from '../vehicles/store';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { resolveCardDueDate, resolveCardOutstandingDebt } from '../credit-cards/lib/billingDateEngine';

type EventType = 'credit-card' | 'inspection' | 'insurance' | 'tender' | 'note';
interface CalendarEvent { 
  id: string; 
  date: string; 
  code: string;
  title: string; 
  subtitle?: string; 
  institution?: string; 
  detail: string; 
  type: EventType; 
  to: string; 
  amount?: string; 
  teminat?: string; 
  statusLabel?: string; 
  statusClass?: string; 
  timeStr?: string; 
}
interface TenderRow { 
  id: string; 
  tender_number: string; 
  title: string; 
  institution: string; 
  deadline_at: string; 
  status: string; 
  tender_type?: string; 
  bid_amount?: number | null; 
  currency?: string; 
  teminat_mektubu?: string; 
}

const styles:Record<EventType,{label:string;dot:string;badge:string}>={
  'credit-card':{label:'KART',dot:'bg-red-500',badge:'bg-red-50 text-red-700 border border-red-200'},
  inspection:{label:'MUAYENE',dot:'bg-amber-500',badge:'bg-amber-50 text-amber-700 border border-amber-200'},
  insurance:{label:'SİGORTA',dot:'bg-blue-500',badge:'bg-blue-50 text-blue-700 border border-blue-200'},
  tender:{label:'İHALE',dot:'bg-purple-500',badge:'bg-purple-50 text-purple-700 border border-purple-200'},
  note:{label:'NOT',dot:'bg-emerald-500',badge:'bg-emerald-50 text-emerald-700 border border-emerald-200'},
};
const dateKey=(value:string)=>value.slice(0,10);
const parseDate=(value:string)=>{const [y,m,d]=dateKey(value).split('-').map(Number);return new Date(y,m-1,d)};
const formatDate=(value:string)=>parseDate(value).toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});

export function useCalendarEvents(){
  const {user}=useAuth();
  const {cards,statements}=useStore();
  const {vehicles}=useVehicles();
  const [tenders,setTenders]=useState<TenderRow[]>([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let active=true;
    if(!user?.organizationId){setTenders([]);setLoading(false);return}
    setLoading(true);
    void supabase.from('tenders')
      .select('id,tender_number,title,institution,deadline_at,status,tender_type,bid_amount,currency,teminat_mektubu')
      .eq('organization_id',user.organizationId)
      .order('deadline_at')
      .then(({data,error})=>{
        if(!active)return;
        if(error)console.error('Takvim ihale verileri yüklenemedi:',error);
        setTenders((data??[]) as TenderRow[]);
        setLoading(false);
      });
    return()=>{active=false};
  },[user?.organizationId]);

  const events=useMemo<CalendarEvent[]>(()=>{
    const result:CalendarEvent[]=[];
    for(const card of cards){
      const debt = resolveCardOutstandingDebt(card, statements);
      if(card.status!=='aktif'||card.limit<=0||debt<=0)continue;
      const dueDate=resolveCardDueDate(card,statements).date;
      result.push({
        id:`card-${card.id}`,
        date:dateKey(dueDate),
        code: `•••• ${card.last4}`,
        title: `${card.bank} (${card.cardName || 'Kart'})`,
        subtitle:`${card.cardName} •••• ${card.last4}`,
        institution: card.holder ? `Kullanan: ${card.holder}` : 'Şirket Kartı',
        detail:`${card.cardName} •••• ${card.last4}`,
        type:'credit-card',
        to:`/finans/kredi-kartlari/${card.id}`,
        amount: `${Number(debt).toLocaleString('tr-TR')} ₺`,
        teminat: '—',
        statusLabel: 'Ödeme Bekliyor',
        statusClass: 'bg-red-50 text-red-700 border border-red-200',
        timeStr: formatDate(dueDate)
      });
    }
    for(const vehicle of vehicles){
      if(vehicle.inspectionDate) {
        result.push({
          id:`inspection-${vehicle.id}`,
          date:dateKey(vehicle.inspectionDate),
          code: vehicle.plate,
          title: `${vehicle.brand} ${vehicle.model}`,
          subtitle: `${vehicle.brand} ${vehicle.model} · Muayene`,
          institution:'Araç Muayene İstasyonu',
          detail:`${vehicle.brand} ${vehicle.model}`,
          type:'inspection',
          to:`/arac-yonetimi/${vehicle.id}`,
          amount:'—',
          teminat:'—',
          statusLabel:'Muayene',
          statusClass:'bg-amber-50 text-amber-700 border border-amber-200',
          timeStr: formatDate(vehicle.inspectionDate)
        });
      }
      if(vehicle.insuranceDate) {
        result.push({
          id:`insurance-${vehicle.id}`,
          date:dateKey(vehicle.insuranceDate),
          code: vehicle.plate,
          title: `${vehicle.brand} ${vehicle.model}`,
          subtitle: `${vehicle.brand} ${vehicle.model} · Sigorta Poliçesi`,
          institution:'Trafik Sigortası / Kasko',
          detail:`${vehicle.brand} ${vehicle.model}`,
          type:'insurance',
          to:`/arac-yonetimi/${vehicle.id}`,
          amount:'—',
          teminat:'—',
          statusLabel:'Sigorta',
          statusClass:'bg-blue-50 text-blue-700 border border-blue-200',
          timeStr: formatDate(vehicle.insuranceDate)
        });
      }
    }
    for(const tender of tenders){
      if(['kazanildi','kaybedildi','iptal'].includes(tender.status))continue;
      const d = new Date(tender.deadline_at);
      const timeStr = !isNaN(d.getTime()) 
        ? `${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
        : formatDate(tender.deadline_at);

      result.push({
        id:`tender-${tender.id}`,
        date:dateKey(tender.deadline_at),
        code: tender.tender_number,
        title: tender.title || `${tender.tender_number} İhale`,
        subtitle:`${tender.tender_number}${tender.tender_type ? ` · ${tender.tender_type}` : ' · İhale'}`,
        institution: tender.institution || '—',
        detail:`${tender.title} · ${tender.institution}`,
        type:'tender',
        to:'/ihaleler',
        amount: tender.bid_amount ? `${Number(tender.bid_amount).toLocaleString('tr-TR')} ${tender.currency || '₺'}` : '—',
        teminat: tender.teminat_mektubu || '—',
        statusLabel: tender.status === 'hazirlaniyor' ? 'Hazırlanıyor' : tender.status === 'teklif_verildi' ? 'Teklif Verildi' : 'Hazırlanıyor',
        statusClass: 'bg-amber-50 text-amber-700 border border-amber-200',
        timeStr: timeStr
      });
    }
    return result.sort((a,b)=>a.date.localeCompare(b.date));
  },[cards,statements,vehicles,tenders]);
  return {events,loading};
}

interface CalendarNote { id: string; content: string; completed: boolean; date: string | null; }

export function CalendarPage({embedded=false}:{embedded?:boolean}){
  const {user}=useAuth();
  const {events,loading}=useCalendarEvents();
  const [month,setMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
  const [selected,setSelected]=useState(()=>dateKey(new Date().toISOString()));

  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newDateNote, setNewDateNote] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showCompletedDateNotes, setShowCompletedDateNotes] = useState(false);

  useEffect(() => {
    if (!user?.organizationId) return;
    let active = true;
    setNotesLoading(true);
    supabase
      .from('calendar_notes')
      .select('id,content,completed,date')
      .eq('organization_id', user.organizationId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn('Notes load error, using local fallback:', error);
          const local = localStorage.getItem('notes-global');
          setNotes(local ? JSON.parse(local) : []);
        } else {
          setNotes(data || []);
          localStorage.setItem('notes-global', JSON.stringify(data || []));
        }
        setNotesLoading(false);
      });
    return () => { active = false; };
  }, [user?.organizationId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newNote.trim();
    if (!text || !user?.organizationId) return;

    const tempId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
    const freshNote: CalendarNote = { id: tempId, content: text, completed: false, date: null };
    const updatedNotes = [...notes, freshNote];
    setNotes(updatedNotes);
    setNewNote('');
    localStorage.setItem('notes-global', JSON.stringify(updatedNotes));

    try {
      const { data, error } = await supabase
        .from('calendar_notes')
        .insert({
          organization_id: user.organizationId,
          content: text,
          completed: false,
          date: null
        })
        .select('id')
        .single();
      if (!error && data) {
        setNotes(prev => prev.map(n => n.id === tempId ? { ...n, id: data.id } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newDateNote.trim();
    if (!text || !user?.organizationId) return;

    const tempId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
    const freshNote: CalendarNote = { id: tempId, content: text, completed: false, date: selected };
    const updatedNotes = [...notes, freshNote];
    setNotes(updatedNotes);
    setNewDateNote('');
    localStorage.setItem('notes-global', JSON.stringify(updatedNotes));

    try {
      const { data, error } = await supabase
        .from('calendar_notes')
        .insert({
          organization_id: user.organizationId,
          content: text,
          completed: false,
          date: selected
        })
        .select('id')
        .single();
      if (!error && data) {
        setNotes(prev => prev.map(n => n.id === tempId ? { ...n, id: data.id } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleNote = async (id: string, completed: boolean) => {
    const updatedNotes = notes.map(n => n.id === id ? { ...n, completed: !completed } : n);
    setNotes(updatedNotes);
    localStorage.setItem('notes-global', JSON.stringify(updatedNotes));
    try {
      await supabase.from('calendar_notes').update({ completed: !completed }).eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const updatedNotes = notes.filter(n => n.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem('notes-global', JSON.stringify(updatedNotes));
    try {
      await supabase.from('calendar_notes').delete().eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNote = async (id: string, newContent: string) => {
    const text = newContent.trim();
    if (!text) {
      setEditingNoteId(null);
      return;
    }
    const updatedNotes = notes.map(n => n.id === id ? { ...n, content: text } : n);
    setNotes(updatedNotes);
    localStorage.setItem('notes-global', JSON.stringify(updatedNotes));
    setEditingNoteId(null);
    try {
      await supabase.from('calendar_notes').update({ content: text }).eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  const cells=useMemo(()=>{const first=new Date(month.getFullYear(),month.getMonth(),1);const start=new Date(first);start.setDate(1-((first.getDay()+6)%7));return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})},[month]);
  
  const noteEvents = useMemo<CalendarEvent[]>(() => {
    return notes
      .filter(n => n.date)
      .map(n => ({
        id: `note-${n.id}`,
        date: n.date!,
        code: 'NOT',
        title: n.content,
        detail: n.completed ? 'Tamamlandı' : 'Yapılacak',
        type: 'note' as const,
        to: ''
      }));
  }, [notes]);

  const allEvents = useMemo(() => {
    return [...noteEvents, ...events];
  }, [events, noteEvents]);

  const byDate = useMemo(() => allEvents.reduce<Record<string,CalendarEvent[]>>((acc,event)=>{(acc[event.date]??=[]).push(event);return acc},{}), [allEvents]);
  
  const hasCompletedNotesForSelectedDate = useMemo(() => {
    const rawEvents = byDate[selected] ?? [];
    return rawEvents.some(e => {
      if (e.type === 'note') {
        const noteId = e.id.replace('note-', '');
        return notes.find(n => n.id === noteId)?.completed;
      }
      return false;
    });
  }, [byDate, selected, notes]);

  const selectedEvents = useMemo(() => {
    const rawEvents = byDate[selected] ?? [];
    return rawEvents.filter(e => {
      if (e.type === 'note') {
        const noteId = e.id.replace('note-', '');
        const note = notes.find(n => n.id === noteId);
        if (note?.completed && !showCompletedDateNotes) return false;
      }
      return true;
    });
  }, [byDate, selected, notes, showCompletedDateNotes]);
  const today=dateKey(new Date().toISOString());

  return <div className={embedded?'':'mx-auto max-w-7xl'}>{!embedded&&<PageHeader title="Takvim" description="Ödeme, araç ve ihale son tarihlerini tek ekrandan takip edin." actions={<button className="btn-secondary" onClick={()=>{const d=new Date();setMonth(new Date(d.getFullYear(),d.getMonth(),1));setSelected(today)}}>Bugün</button>}/>} 
    <div className="mb-4 flex flex-wrap gap-2">{(Object.entries(styles) as [EventType,typeof styles[EventType]][]).map(([key,s])=><span key={key} className={`rounded-full px-3 py-1 text-xs font-medium ${s.badge}`}><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${s.dot}`}/>{s.label}</span>)}</div>
    {/* 1. Üst Kısım: Takvim (Sol) + Genel Yapılacaklar & Notlar (Sağ) */}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] mb-6">
      {/* Sol: Takvim Kartı */}
      <div className="card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-4 bg-white">
          <button className="btn-secondary !p-2" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label="Önceki ay"><ChevronLeft size={18}/></button>
          <h2 className="text-base font-semibold capitalize text-gray-900">{month.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</h2>
          <button className="btn-secondary !p-2" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label="Sonraki ay"><ChevronRight size={18}/></button>
        </div>
        <div className="grid grid-cols-7 border-b bg-gray-50/80">
          {['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(x=>(
            <div key={x} className="p-2 text-center text-xs font-semibold text-gray-500">{x}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(d=>{
            const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const dayEvents = (byDate[key] ?? []).filter(e => {
              if (e.type === 'note') {
                const noteId = e.id.replace('note-', '');
                return !notes.find(n => n.id === noteId)?.completed;
              }
              return true;
            });
            const current=d.getMonth()===month.getMonth();
            return (
              <button 
                key={key} 
                onClick={()=>setSelected(key)} 
                className={`min-h-24 border-b border-r border-gray-100 p-2 text-left transition-colors hover:bg-gray-50 ${selected===key?'bg-brand-50/80 ring-2 ring-inset ring-brand-400':''} ${current?'bg-white':'bg-gray-50/50 text-gray-300'}`}
              >
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${key===today?'bg-brand-600 text-white shadow-sm font-bold': selected===key ? 'bg-brand-100 text-brand-800' : 'text-gray-700'}`}>
                  {d.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map(e => (
                    <div key={e.id} className="flex items-center gap-1 truncate text-[10px] text-gray-600">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles[e.type].dot}`}/>
                      <span className="truncate">{e.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] font-semibold text-brand-600">
                      +{dayEvents.length - 3} etkinlik
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sağ: Genel Yapılacaklar & Notlar */}
      <div className="h-full flex flex-col">
        <SectionCard 
          title="Yapılacaklar & Notlar" 
          icon={<ListTodo size={16} className="text-gray-400"/>}
          className="shadow-sm flex-1 flex flex-col"
        >
          <form onSubmit={handleAddNote} className="mb-4 flex gap-1.5 border-b border-gray-100 pb-3">
            <input 
              type="text" 
              className="input !py-1.5 !text-sm flex-1" 
              placeholder="Yeni not veya görev ekle..." 
              value={newNote} 
              onChange={e => setNewNote(e.target.value)}
            />
            <button type="submit" className="btn-primary !p-2 shrink-0">
              <Plus size={16}/>
            </button>
          </form>

          {notesLoading ? (
            <p className="py-6 text-center text-xs text-gray-400">Notlar yükleniyor...</p>
          ) : notes.filter(n => !n.date).length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">Henüz genel not alınmamış.</p>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {notes.filter(n => !n.date).map(note => (
                <div key={note.id} className="group flex items-start justify-between gap-2.5 rounded-lg border border-gray-100 p-2.5 transition-all hover:border-brand-200 hover:bg-brand-50/30">
                  <button 
                    type="button"
                    onClick={() => void handleToggleNote(note.id, note.completed)}
                    className="mt-0.5 shrink-0 text-gray-400 hover:text-brand-600 transition-colors"
                  >
                    {note.completed ? (
                      <CheckSquare size={18} className="text-brand-600" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                  {editingNoteId === note.id ? (
                    <input
                      type="text"
                      className="flex-1 input !py-1 !px-2 !text-sm font-medium"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleSaveNote(note.id, editContent);
                        else if (e.key === 'Escape') setEditingNoteId(null);
                      }}
                      onBlur={() => void handleSaveNote(note.id, editContent)}
                      autoFocus
                    />
                  ) : (
                    <span className={`flex-1 text-[13.5px] sm:text-sm font-semibold text-gray-800 leading-snug break-words ${note.completed ? 'line-through text-gray-400 font-normal' : ''}`}>
                      {note.content}
                    </span>
                  )}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setEditContent(note.content);
                      }}
                      className="text-gray-400 hover:text-brand-600 transition-colors p-1 rounded hover:bg-white"
                      title="Notu Düzenle"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => void handleDeleteNote(note.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-white"
                      title="Notu Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>

    {/* 2. Alt Kısım: Seçili Günün Detaylı Tablo Listesi (Takas Çekleri Tarzı Tablo) */}
    <div className="pb-10">
      <div className="card overflow-hidden shadow-sm">
        {/* Tablo Başlık Barı */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
              GÜNLÜK DETAYLI ETKİNLİK LİSTESİ ({formatDate(selected).toUpperCase()})
            </h3>
          </div>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 border border-brand-200">
            {selectedEvents.length} Adet
          </span>
        </div>

        {/* Seçili güne özel not ekleme çubuğu */}
        <div className="border-b border-gray-100 bg-gray-50/50 p-3">
          <form onSubmit={handleAddDateNote} className="flex gap-2">
            <input 
              type="text" 
              className="input !py-1.5 !text-xs flex-1 bg-white" 
              placeholder={`${formatDate(selected)} tarihine özel yeni not / hatırlatıcı ekle...`} 
              value={newDateNote} 
              onChange={e => setNewDateNote(e.target.value)}
            />
            <button type="submit" className="btn-primary !px-3 !py-1.5 shrink-0 flex items-center gap-1">
              <Plus size={14}/>
              <span className="text-xs font-bold">Tarihe Not Ekle</span>
            </button>
          </form>
        </div>

        {/* Tablo İçeriği */}
        <div className="w-full">
          <table className="w-full table-fixed text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="table-th w-10 text-center !py-2.5 !px-1">#</th>
                <th className="table-th w-24 text-center !py-2.5 !px-1">TÜR</th>
                <th className="table-th w-32 !py-2.5 !px-2">NO / KOD</th>
                <th className="table-th w-56 lg:w-64 !py-2.5 !px-2">BAŞLIK / KONU</th>
                <th className="table-th !py-2.5 !px-2">KURUM / AÇIKLAMA</th>
                <th className="table-th w-24 text-center !py-2.5 !px-1">VADE / SAAT</th>
                <th className="table-th w-28 text-center !py-2.5 !px-1">TUTAR</th>
                <th className="table-th w-24 text-center !py-2.5 !px-1">DURUM</th>
                <th className="table-th w-16 text-center !py-2.5 !px-1">İŞLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-gray-400">
                    Etkinlikler yükleniyor...
                  </td>
                </tr>
              ) : selectedEvents.length === 0 && !hasCompletedNotesForSelectedDate ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-gray-400">
                    <CalendarDays size={26} className="mx-auto mb-1.5 text-gray-300 stroke-[1.5]" />
                    Bu tarihte ({formatDate(selected)}) herhangi bir ihale, ödeme veya kayıt bulunmuyor.
                  </td>
                </tr>
              ) : (
                selectedEvents.map((e, index) => {
                  if (e.type === 'note') {
                    const noteId = e.id.replace('note-', '');
                    const note = notes.find(n => n.id === noteId);
                    if (!note) return null;

                    return (
                      <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="table-td text-center text-gray-400 font-medium !py-2 !px-1 text-[11px]">{index + 1}</td>
                        <td className="table-td text-center !py-2 !px-1">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wide scale-95 ${styles.note.badge}`}>
                            NOT
                          </span>
                        </td>
                        <td className="table-td font-semibold text-gray-500 !py-2 !px-2">
                          Hatırlatıcı
                        </td>
                        <td className="table-td font-bold text-gray-900 !py-2 !px-2 overflow-hidden" colSpan={2}>
                          {editingNoteId === note.id ? (
                            <input
                              type="text"
                              className="input !py-1 !px-2 !text-sm w-full font-medium"
                              value={editContent}
                              onChange={(ev) => setEditContent(ev.target.value)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') void handleSaveNote(note.id, editContent);
                                else if (ev.key === 'Escape') setEditingNoteId(null);
                              }}
                              onBlur={() => void handleSaveNote(note.id, editContent)}
                              autoFocus
                            />
                          ) : (
                            <div className={`truncate text-xs sm:text-[13px] font-semibold text-gray-900 ${note.completed ? 'line-through text-gray-400 font-normal' : ''}`} title={note.content}>
                              {note.content}
                            </div>
                          )}
                        </td>
                        <td className="table-td text-center font-medium text-gray-700 !py-2 !px-1 whitespace-nowrap text-[11px]">
                          {formatDate(selected)}
                        </td>
                        <td className="table-td text-center !py-2 !px-1 text-gray-400 font-medium">—</td>
                        <td className="table-td text-center !py-2 !px-1">
                          <button
                            type="button"
                            onClick={() => void handleToggleNote(note.id, note.completed)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-colors ${
                              note.completed 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {note.completed ? 'Tamamlandı' : 'Bekliyor'}
                          </button>
                        </td>
                        <td className="table-td text-center !py-2 !px-1">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditContent(note.content);
                              }}
                              className="p-1 text-gray-400 hover:text-brand-600 rounded transition-colors"
                              title="Düzenle"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteNote(note.id)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={e.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="table-td text-center text-gray-400 font-medium !py-2 !px-1 text-[11px]">{index + 1}</td>
                      <td className="table-td text-center !py-2 !px-1">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-wide scale-95 ${styles[e.type].badge}`}>
                          {styles[e.type].label}
                        </span>
                      </td>
                      <td className="table-td font-bold text-gray-800 !py-2 !px-2 overflow-hidden">
                        <div className="truncate" title={e.code}>
                          {e.to ? (
                            <Link to={e.to} className="text-brand-600 hover:text-brand-800 hover:underline">
                              {e.code}
                            </Link>
                          ) : (
                            e.code
                          )}
                        </div>
                      </td>
                      <td className="table-td font-semibold text-gray-900 !py-2 !px-2 overflow-hidden">
                        <div className="truncate" title={e.title}>
                          {e.title}
                        </div>
                      </td>
                      <td className="table-td text-gray-600 font-medium !py-2 !px-2 overflow-hidden">
                        <div className="truncate uppercase text-[11px]" title={e.institution}>
                          {e.institution}
                        </div>
                      </td>
                      <td className="table-td text-center font-semibold text-gray-700 !py-2 !px-1 whitespace-nowrap text-[11px]">
                        {e.timeStr}
                      </td>
                      <td className="table-td text-center font-bold text-gray-900 !py-2 !px-1 whitespace-nowrap text-xs">
                        {e.amount}
                      </td>
                      <td className="table-td text-center !py-2 !px-1">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${e.statusClass}`}>
                          {e.statusLabel}
                        </span>
                      </td>
                      <td className="table-td text-center !py-2 !px-1">
                        {e.to && (
                          <Link 
                            to={e.to} 
                            className="inline-flex items-center justify-center rounded bg-gray-100 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700 transition-colors"
                          >
                            İncele
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {hasCompletedNotesForSelectedDate && (
          <div className="flex justify-center border-t border-gray-100 bg-gray-50/30 py-2">
            <button
              type="button"
              onClick={() => setShowCompletedDateNotes(prev => !prev)}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              {showCompletedDateNotes ? 'Tamamlanan Notları Gizle' : 'Tamamlanan Notları Göster'}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
}

export function DashboardCalendar(){
  const {events,loading}=useCalendarEvents();
  const today=new Date();today.setHours(0,0,0,0);const limit=new Date(today);limit.setDate(limit.getDate()+45);
  const upcoming=events.filter(e=>{const d=parseDate(e.date);return d>=today&&d<=limit}).slice(0,7);
  const icon={ 'credit-card':CreditCard,inspection:Car,insurance:ShieldCheck,tender:Gavel,note:ListTodo } as const;
  return <SectionCard title="Yaklaşan Tarihler" icon={<CalendarDays size={16} className="text-gray-400"/>} action={<Link to="/takvim" className="text-xs font-medium text-brand-600 hover:text-brand-700">Takvimi Aç</Link>} className="mb-6" bodyClassName="!p-0"><div className="grid divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">{loading?<p className="p-6 text-center text-sm text-gray-400 md:col-span-2">Tarihler yükleniyor...</p>:upcoming.length===0?<p className="p-6 text-center text-sm text-gray-400 md:col-span-2">Önümüzdeki 45 gün içinde yaklaşan tarih yok.</p>:[upcoming.filter((_,i)=>i%2===0),upcoming.filter((_,i)=>i%2===1)].map((group,index)=><div key={index} className="divide-y divide-gray-100">{group.map(e=>{const Icon=icon[e.type];const days=Math.ceil((parseDate(e.date).getTime()-today.getTime())/86400000);return <Link key={e.id} to={e.to} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><Icon size={15}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-800">{e.title}</p><p className="text-xs text-gray-400">{formatDate(e.date)}</p></div><span className={`rounded-md px-2 py-1 text-[10px] font-medium ${styles[e.type].badge}`}>{days===0?'Bugün':`${days} gün`}</span></Link>})}</div>)}</div></SectionCard>
}
