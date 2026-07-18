import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Car, ChevronLeft, ChevronRight, CreditCard, Gavel, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { useStore } from '../credit-cards/data/store';
import { useVehicles } from '../vehicles/store';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

type EventType = 'credit-card' | 'inspection' | 'insurance' | 'tender';
interface CalendarEvent { id:string; date:string; title:string; detail:string; type:EventType; to:string }
interface TenderRow { id:string; tender_number:string; title:string; institution:string; deadline_at:string; status:string }

const styles:Record<EventType,{label:string;dot:string;badge:string}>={
  'credit-card':{label:'Kredi Kartı',dot:'bg-red-500',badge:'bg-red-50 text-red-700'},
  inspection:{label:'Araç Muayene',dot:'bg-amber-500',badge:'bg-amber-50 text-amber-700'},
  insurance:{label:'Araç Sigorta',dot:'bg-blue-500',badge:'bg-blue-50 text-blue-700'},
  tender:{label:'İhale',dot:'bg-violet-500',badge:'bg-violet-50 text-violet-700'},
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
  useEffect(()=>{let active=true;if(!user?.organizationId){setTenders([]);setLoading(false);return}setLoading(true);void supabase.from('tenders').select('id,tender_number,title,institution,deadline_at,status').eq('organization_id',user.organizationId).order('deadline_at').then(({data,error})=>{if(!active)return;if(error)console.error('Takvim ihale verileri yüklenemedi:',error);setTenders((data??[]) as TenderRow[]);setLoading(false)});return()=>{active=false}},[user?.organizationId]);
  const events=useMemo<CalendarEvent[]>(()=>{
    const result:CalendarEvent[]=[];
    for(const statement of statements){if(statement.paymentStatus==='odendi')continue;const card=cards.find(x=>x.id===statement.cardId);result.push({id:`card-${statement.id}`,date:dateKey(statement.dueDate),title:`${card?.bank??'Kredi kartı'} son ödeme`,detail:`${card?.cardName??''} •••• ${card?.last4??''}`.trim(),type:'credit-card',to:`/finance/credit-cards/${statement.cardId}/statements/${statement.id}`})}
    for(const vehicle of vehicles){if(vehicle.inspectionDate)result.push({id:`inspection-${vehicle.id}`,date:dateKey(vehicle.inspectionDate),title:`${vehicle.plate} muayene son günü`,detail:`${vehicle.brand} ${vehicle.model}`,type:'inspection',to:`/arac-yonetimi/${vehicle.id}`});if(vehicle.insuranceDate)result.push({id:`insurance-${vehicle.id}`,date:dateKey(vehicle.insuranceDate),title:`${vehicle.plate} sigorta son günü`,detail:`${vehicle.brand} ${vehicle.model}`,type:'insurance',to:`/arac-yonetimi/${vehicle.id}`})}
    for(const tender of tenders){if(['kazanildi','kaybedildi','iptal'].includes(tender.status))continue;result.push({id:`tender-${tender.id}`,date:dateKey(tender.deadline_at),title:`${tender.tender_number} ihale son tarihi`,detail:`${tender.title} · ${tender.institution}`,type:'tender',to:'/ihaleler'})}
    return result.sort((a,b)=>a.date.localeCompare(b.date));
  },[cards,statements,vehicles,tenders]);
  return {events,loading};
}

export function CalendarPage({embedded=false}:{embedded?:boolean}){
  const {events,loading}=useCalendarEvents();
  const [month,setMonth]=useState(()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1)});
  const [selected,setSelected]=useState(()=>dateKey(new Date().toISOString()));
  const cells=useMemo(()=>{const first=new Date(month.getFullYear(),month.getMonth(),1);const start=new Date(first);start.setDate(1-((first.getDay()+6)%7));return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})},[month]);
  const byDate=useMemo(()=>events.reduce<Record<string,CalendarEvent[]>>((acc,event)=>{(acc[event.date]??=[]).push(event);return acc},{}),[events]);
  const selectedEvents=byDate[selected]??[];
  const today=dateKey(new Date().toISOString());
  return <div className={embedded?'':'mx-auto max-w-7xl'}>{!embedded&&<PageHeader title="Takvim" description="Ödeme, araç ve ihale son tarihlerini tek ekrandan takip edin." actions={<button className="btn-secondary" onClick={()=>{const d=new Date();setMonth(new Date(d.getFullYear(),d.getMonth(),1));setSelected(today)}}>Bugün</button>}/>} 
    <div className="mb-4 flex flex-wrap gap-2">{(Object.entries(styles) as [EventType,typeof styles[EventType]][]).map(([key,s])=><span key={key} className={`rounded-full px-3 py-1 text-xs font-medium ${s.badge}`}><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${s.dot}`}/>{s.label}</span>)}</div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-gray-100 p-4"><button className="btn-secondary !p-2" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label="Önceki ay"><ChevronLeft size={18}/></button><h2 className="text-base font-semibold capitalize">{month.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</h2><button className="btn-secondary !p-2" onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label="Sonraki ay"><ChevronRight size={18}/></button></div><div className="grid grid-cols-7 border-b bg-gray-50">{['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(x=><div key={x} className="p-2 text-center text-xs font-medium text-gray-500">{x}</div>)}</div><div className="grid grid-cols-7">{cells.map(d=>{const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const dayEvents=byDate[key]??[];const current=d.getMonth()===month.getMonth();return <button key={key} onClick={()=>setSelected(key)} className={`min-h-24 border-b border-r p-2 text-left transition-colors hover:bg-gray-50 ${selected===key?'bg-brand-50 ring-1 ring-inset ring-brand-300':''} ${current?'':'bg-gray-50/50 text-gray-300'}`}><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${key===today?'bg-brand-600 font-semibold text-white':''}`}>{d.getDate()}</span><div className="mt-1 space-y-1">{dayEvents.slice(0,3).map(e=><div key={e.id} className="flex items-center gap-1 truncate text-[10px] text-gray-600"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles[e.type].dot}`}/><span className="truncate">{e.title}</span></div>)}{dayEvents.length>3&&<div className="text-[10px] font-medium text-brand-600">+{dayEvents.length-3} etkinlik</div>}</div></button>})}</div></div>
      <SectionCard title={formatDate(selected)} icon={<CalendarDays size={16} className="text-gray-400"/>}>{loading?<p className="py-8 text-center text-sm text-gray-400">Takvim yükleniyor...</p>:selectedEvents.length===0?<p className="py-8 text-center text-sm text-gray-400">Bu tarihte kayıt bulunmuyor.</p>:<div className="space-y-3">{selectedEvents.map(e=><Link key={e.id} to={e.to} className="block rounded-lg border border-gray-100 p-3 hover:border-brand-200 hover:bg-brand-50/30"><div className="mb-1 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${styles[e.type].dot}`}/><span className="text-xs font-medium text-gray-500">{styles[e.type].label}</span></div><p className="text-sm font-medium text-gray-900">{e.title}</p><p className="mt-1 text-xs text-gray-500">{e.detail}</p></Link>)}</div>}</SectionCard></div>
  </div>
}

export function DashboardCalendar(){
  const {events,loading}=useCalendarEvents();
  const today=new Date();today.setHours(0,0,0,0);const limit=new Date(today);limit.setDate(limit.getDate()+45);
  const upcoming=events.filter(e=>{const d=parseDate(e.date);return d>=today&&d<=limit}).slice(0,7);
  const icon={ 'credit-card':CreditCard,inspection:Car,insurance:ShieldCheck,tender:Gavel } as const;
  return <SectionCard title="Yaklaşan Tarihler" icon={<CalendarDays size={16} className="text-gray-400"/>} action={<Link to="/takvim" className="text-xs font-medium text-brand-600 hover:text-brand-700">Takvimi Aç</Link>} className="mb-6" bodyClassName="!p-0"><div className="grid divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">{loading?<p className="p-6 text-center text-sm text-gray-400 md:col-span-2">Tarihler yükleniyor...</p>:upcoming.length===0?<p className="p-6 text-center text-sm text-gray-400 md:col-span-2">Önümüzdeki 45 gün içinde yaklaşan tarih yok.</p>:[upcoming.filter((_,i)=>i%2===0),upcoming.filter((_,i)=>i%2===1)].map((group,index)=><div key={index} className="divide-y divide-gray-100">{group.map(e=>{const Icon=icon[e.type];const days=Math.ceil((parseDate(e.date).getTime()-today.getTime())/86400000);return <Link key={e.id} to={e.to} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500"><Icon size={15}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-800">{e.title}</p><p className="text-xs text-gray-400">{formatDate(e.date)}</p></div><span className={`rounded-md px-2 py-1 text-[10px] font-medium ${styles[e.type].badge}`}>{days===0?'Bugün':`${days} gün`}</span></Link>})}</div>)}</div></SectionCard>
}
