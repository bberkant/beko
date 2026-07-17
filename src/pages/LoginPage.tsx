import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(email || 'demo@ops360.ai', password, remember);
    setLoading(false);
    navigate('/dashboard');
  };

  const handleDemo = () => {
    demoLogin();
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
            <span className="text-base font-bold">O</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight text-gray-900">OPS360</span>
            <span className="text-xs font-medium text-gray-500">AI Operations</span>
          </div>
        </div>
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-gray-900">Giriş Yap</h1>
          <p className="mt-1 text-sm text-gray-500">Devam etmek için giriş yapın.</p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="label">E-posta</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="demo@ops360.ai"
              />
            </div>
            <div>
              <label className="label">Şifre</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Beni hatırla
            </label>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
          <div className="mt-4 border-t border-gray-100 pt-4">
            <button onClick={handleDemo} className="btn-secondary w-full">
              Demo Hesabı ile Giriş
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
