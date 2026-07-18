import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
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
        if (!name.trim() || !companyName.trim()) throw new Error('Ad soyad ve şirket adı zorunludur.');
        const result = await signUp(name.trim(), companyName.trim(), email.trim(), password);
        setMessage(result);
        if (!result.includes('doğrulama')) navigate('/dashboard');
      } else {
        await login(email.trim(), password, remember);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white"><span className="text-base font-bold">O</span></div>
          <div className="flex flex-col leading-none"><span className="text-lg font-bold tracking-tight text-gray-900">OPS360</span><span className="text-xs font-medium text-gray-500">AI Operations</span></div>
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-gray-900">{mode === 'login' ? 'Giriş Yap' : 'Güvenli Hesap Oluştur'}</h1>
          <p className="mt-1 text-sm text-gray-500">{mode === 'login' ? 'Devam etmek için giriş yapın.' : 'İlk kullanıcı şirket yöneticisi olur.'}</p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'signup' && <><div><label className="label">Ad Soyad</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div><div><label className="label">Şirket Adı</label><input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required /></div></>}
            <div><label className="label">E-posta</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><label className="label">Şifre</label><input type="password" minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 8 karakter" required /></div>
            {mode === 'login' && <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />Beni hatırla</label>}
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            {message && <p className="text-sm font-medium text-emerald-600">{message}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'İşleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}</button>
          </form>
          <button className="mt-4 w-full text-sm font-medium text-brand-600" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>
            {mode === 'login' ? 'Yeni şirket hesabı oluştur' : 'Zaten hesabım var'}
          </button>
        </div>
      </div>
    </div>
  );
}
