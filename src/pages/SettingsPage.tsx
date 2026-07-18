import { useEffect, useState } from 'react';
import { Mail, Save, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

export function SettingsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => setEmail(user?.email ?? ''), [user?.email]);

  const updateEmail = async () => {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || nextEmail === user?.email.toLowerCase()) {
      notify('Farklı ve geçerli bir e-posta adresi girin.', 'error'); return;
    }
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setEmailSaving(false);
    if (error) { notify(error.message, 'error'); return; }
    notify('Doğrulama bağlantısı gönderildi. Yeni e-posta adresinizi kontrol edin.', 'success');
  };

  const updatePassword = async () => {
    if (password.length < 8) { notify('Şifre en az 8 karakter olmalıdır.', 'error'); return; }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordSaving(false);
    if (error) { notify(error.message, 'error'); return; }
    setPassword(''); notify('Şifreniz başarıyla güncellendi.', 'success');
  };

  return <div className="mx-auto max-w-4xl">
    <PageHeader title="Ayarlar" description="Hesap ve güvenlik bilgilerinizi yönetin." />
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card p-6">
        <div className="mb-5 flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Mail size={19}/></div><div><h2 className="font-semibold text-gray-900">E-posta Adresi</h2><p className="mt-1 text-sm text-gray-500">Giriş yaptığınız e-posta adresini değiştirin.</p></div></div>
        <div className="space-y-4"><div><label className="label">Mevcut e-posta</label><div className="rounded-lg bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600">{user?.email}</div></div><div><label className="label">Yeni e-posta</label><input type="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="yeni@sirket.com"/></div><button className="btn-primary w-full" disabled={emailSaving} onClick={()=>void updateEmail()}><Save size={16}/>{emailSaving?'Gönderiliyor...':'E-postayı Değiştir'}</button><p className="text-xs leading-5 text-gray-500">Güvenli e-posta değişikliği açıksa Supabase eski ve yeni adresin ikisine de doğrulama gönderebilir. Değişiklik bağlantılar onaylandıktan sonra tamamlanır.</p></div>
      </section>
      <section className="card p-6">
        <div className="mb-5 flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><ShieldCheck size={19}/></div><div><h2 className="font-semibold text-gray-900">Şifre Güvenliği</h2><p className="mt-1 text-sm text-gray-500">Hesabınız için güçlü bir şifre belirleyin.</p></div></div>
        <div className="space-y-4"><div><label className="label">Yeni şifre</label><input type="password" minLength={8} className="input" value={password} onChange={e=>setPassword(e.target.value)} placeholder="En az 8 karakter"/></div><button className="btn-secondary w-full" disabled={passwordSaving} onClick={()=>void updatePassword()}><ShieldCheck size={16}/>{passwordSaving?'Güncelleniyor...':'Şifreyi Güncelle'}</button></div>
      </section>
    </div>
  </div>;
}
