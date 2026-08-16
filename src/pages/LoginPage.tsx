import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? '';
  const { login, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(inviteToken ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        if (!name.trim() || (!inviteToken && !companyName.trim())) throw new Error(inviteToken ? 'Ad soyad zorunludur.' : 'Ad soyad ve şirket adı zorunludur.');
        const result = await signUp(name.trim(), companyName.trim(), email.trim(), password, inviteToken || undefined);
        setMessage(result);
        if (!result.includes('doğrulama')) navigate('/dashboard');
      } else {
        await login(email.trim(), password, remember);
        navigate('/dashboard');
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === '{}' || err.message === '') {
          setError('Supabase sunucu hatası (500). Lütfen veritabanı durumunu kontrol edin veya birkaç dakika sonra tekrar deneyin.');
        } else {
          setError(err.message);
        }
      } else {
        setError('İşlem tamamlanamadı.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600">
            <div className="h-[20px] w-[7px] bg-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">DARS</span>
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-gray-900">{mode === 'login' ? 'Giriş Yap' : 'Güvenli Hesap Oluştur'}</h1>
          <p className="mt-1 text-sm text-gray-500">{mode === 'login' ? 'Devam etmek için giriş yapın.' : inviteToken ? 'Şirket davetinizi kabul etmek için hesabınızı oluşturun.' : 'İlk kullanıcı şirket yöneticisi olur.'}</p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'signup' && <><div><label className="label">Ad Soyad</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>{!inviteToken&&<div><label className="label">Şirket Adı</label><input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required /></div>}</>}
            <div><label className="label">{mode === 'login' ? 'Kullanıcı adı veya e-posta' : 'E-posta'}</label><input type={mode === 'login' ? 'text' : 'email'} className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={mode === 'login' ? 'Kullanıcı adınızı yazın' : 'kullanici@sirket.com'} required /></div>
            <div><label className="label">Şifre</label><input type="password" minLength={mode === 'signup' ? 8 : 6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'En az 8 karakter' : 'Şifrenizi yazın'} required /></div>
            {mode === 'login' && <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />Beni hatırla</label>}
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            {message && <p className="text-sm font-medium text-emerald-600">{message}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'İşleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}</button>
          </form>
          {!inviteToken&&<button className="mt-4 w-full text-sm font-medium text-brand-600" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>
            {mode === 'login' ? 'Yeni şirket hesabı oluştur' : 'Zaten hesabım var'}
          </button>}
        </div>
      </div>
    </div>
  );
}
