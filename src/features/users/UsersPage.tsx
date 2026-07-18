import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Search, ShieldCheck, UserCheck, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth, type OrganizationRole } from '../../lib/auth';
import { useToast } from '../../lib/toast';

interface Member { user_id: string; full_name: string; email: string; role: OrganizationRole; active: boolean; joined_at: string }
const roleLabels: Record<OrganizationRole, string> = { admin: 'Yönetici', muhasebe: 'Muhasebe', finans: 'Finans', goruntuleyici: 'Görüntüleyici' };
const roleStyles: Record<OrganizationRole, string> = { admin: 'bg-violet-50 text-violet-700', muhasebe: 'bg-blue-50 text-blue-700', finans: 'bg-cyan-50 text-cyan-700', goruntuleyici: 'bg-gray-100 text-gray-600' };

export function UsersPage() {
  const { user } = useAuth(); const { notify } = useToast();
  const [members, setMembers] = useState<Member[]>([]); const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(''); const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState(''); const [inviteRole, setInviteRole] = useState<OrganizationRole>('goruntuleyici');
  const [inviteUrl, setInviteUrl] = useState(''); const [saving, setSaving] = useState(false);
  const isAdmin = user?.role === 'Yönetici';

  const refresh = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('list_organization_users');
    if (error) notify(error.message, 'error'); else setMembers((data ?? []) as Member[]);
    setLoading(false);
  }, [isAdmin, notify]);
  useEffect(() => { void refresh(); }, [refresh]);
  const filtered = useMemo(() => members.filter(m => `${m.full_name} ${m.email} ${roleLabels[m.role]}`.toLowerCase().includes(query.toLowerCase())), [members, query]);

  const createInvite = async () => {
    if (!email.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.rpc('create_organization_invitation', { invite_email: email.trim(), invite_role: inviteRole });
    setSaving(false);
    if (error) { notify(error.message, 'error'); return; }
    const url = `${window.location.origin}/login?invite=${data}`; setInviteUrl(url); notify('Davet bağlantısı oluşturuldu.', 'success');
  };
  const manage = async (member: Member, role: OrganizationRole, active: boolean) => {
    const { error } = await supabase.rpc('manage_organization_user', { target_user: member.user_id, new_role: role, new_active: active });
    if (error) notify(error.message, 'error'); else { notify('Kullanıcı güncellendi.', 'success'); await refresh(); }
  };

  if (!isAdmin) return <div className="mx-auto max-w-7xl"><PageHeader title="Yetkisiz Erişim" description="Kullanıcılar modülünü yalnızca yöneticiler görüntüleyebilir."/></div>;
  return <div className="mx-auto max-w-7xl">
    <PageHeader title="Kullanıcılar" description="Şirket kullanıcılarını, rollerini ve erişim durumlarını yönetin."
      actions={isAdmin ? <button className="btn-primary" onClick={() => { setInviteOpen(true); setInviteUrl(''); }}><UserPlus size={16}/> Kullanıcı Davet Et</button> : undefined}/>
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      <Metric icon={<Users size={17}/>} value={members.length} label="Toplam Kullanıcı" />
      <Metric icon={<UserCheck size={17}/>} value={members.filter(m=>m.active).length} label="Aktif Kullanıcı" />
      <Metric icon={<ShieldCheck size={17}/>} value={members.filter(m=>m.active&&m.role==='admin').length} label="Yönetici" />
    </div>
    <div className="relative mb-4 max-w-md"><Search className="absolute left-3 top-3 text-gray-400" size={16}/><input className="input pl-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ad, e-posta veya rol ara..."/></div>
    <div className="card overflow-x-auto"><table className="min-w-full"><thead><tr><th className="table-th">Kullanıcı</th><th className="table-th">Rol</th><th className="table-th">Durum</th><th className="table-th">Katılım</th><th className="table-th">İşlem</th></tr></thead>
      <tbody>{loading ? <tr><td className="table-td py-10 text-center text-gray-400" colSpan={5}>Kullanıcılar yükleniyor...</td></tr> : filtered.length===0 ? <tr><td className="table-td py-10 text-center text-gray-400" colSpan={5}>Kullanıcı bulunamadı.</td></tr> : filtered.map(m=><tr key={m.user_id} className="border-t border-gray-100">
        <td className="table-td"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700">{(m.full_name||m.email).slice(0,1).toUpperCase()}</div><div><div className="font-medium text-gray-900">{m.full_name||'İsimsiz Kullanıcı'}{m.user_id===user?.id&&<span className="ml-2 text-xs text-gray-400">Siz</span>}</div><div className="text-xs text-gray-500">{m.email}</div></div></div></td>
        <td className="table-td">{isAdmin ? <select className="input max-w-[160px] py-2" value={m.role} onChange={e=>void manage(m,e.target.value as OrganizationRole,m.active)}>{Object.entries(roleLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select> : <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleStyles[m.role]}`}>{roleLabels[m.role]}</span>}</td>
        <td className="table-td"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${m.active?'bg-emerald-50 text-emerald-700':'bg-gray-100 text-gray-500'}`}>{m.active?'Aktif':'Pasif'}</span></td>
        <td className="table-td text-gray-500">{new Date(m.joined_at).toLocaleDateString('tr-TR')}</td>
        <td className="table-td">{isAdmin&&<button className="btn-secondary py-2" onClick={()=>void manage(m,m.role,!m.active)}>{m.active?'Pasifleştir':'Aktifleştir'}</button>}</td>
      </tr>)}</tbody></table></div>
    <Modal open={inviteOpen} onClose={()=>setInviteOpen(false)} title="Kullanıcı Davet Et" description="Bağlantı 7 gün geçerlidir ve yalnızca yazılan e-posta adresiyle kullanılabilir.">
      {!inviteUrl ? <div className="space-y-4"><div><label className="label">E-posta adresi</label><input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="kullanici@sirket.com"/></div><div><label className="label">Rol</label><select className="input" value={inviteRole} onChange={e=>setInviteRole(e.target.value as OrganizationRole)}>{Object.entries(roleLabels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><p className="mt-2 text-xs text-gray-500">Görüntüleyici kayıtları yalnızca görür; Muhasebe finansal kayıtları düzenler; Yönetici kullanıcıları da yönetir.</p></div><button className="btn-primary w-full" disabled={saving} onClick={()=>void createInvite()}>{saving?'Oluşturuluyor...':'Davet Bağlantısı Oluştur'}</button></div>
      : <div className="space-y-4"><div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"><Check size={18}/> Davet bağlantısı hazır.</div><div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm break-all text-gray-600">{inviteUrl}</div><button className="btn-primary w-full" onClick={async()=>{await navigator.clipboard.writeText(inviteUrl);notify('Bağlantı kopyalandı.','success');}}><Copy size={16}/> Bağlantıyı Kopyala</button></div>}
    </Modal>
  </div>;
}

function Metric({icon,value,label}:{icon:React.ReactNode;value:number;label:string}) { return <div className="card p-4"><div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">{icon}</div><div className="text-xl font-semibold">{value}</div><div className="text-xs text-gray-500">{label}</div></div>; }
