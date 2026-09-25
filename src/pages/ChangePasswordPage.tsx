import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck, Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

export function ChangePasswordPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      notify('Şifre en az 8 karakter olmalıdır.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      notify('Girdiğiniz şifreler birbiriyle uyuşmuyor.', 'error');
      return;
    }

    setSaving(true);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      notify('Şifreniz başarıyla güncellendi.', 'success');
    } catch (err: any) {
      notify('Şifre güncellenemedi: ' + (err.message || 'Bilinmeyen hata'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const isMinLength = password.length >= 8;
  const isMatching = password.length > 0 && password === confirmPassword;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Şifre Değiştir"
        description="Hesabınızın güvenliği için yeni ve güçlü bir şifre belirleyin."
        onBack={() => navigate(-1)}
        backLabel="Geri Dön"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Info Card */}
        <div className="md:col-span-1 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Güvenlik Önerileri</h3>
                <p className="text-xs text-gray-500">Güçlü şifre kuralları</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-gray-100 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${isMinLength ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  ✓
                </span>
                <span>En az 8 karakter uzunluğunda olmalı</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${isMatching ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  ✓
                </span>
                <span>Şifreler birbiriyle eşleşmeli</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  •
                </span>
                <span>Rakam, büyük ve küçük harf içermesi önerilir</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Aktif Kullanıcı</span>
            <p className="text-sm font-bold text-gray-900">{user?.name ?? 'Kullanıcı'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <div className="pt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-brand-50 text-brand-700">
                {user?.role ?? 'Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Yeni Şifre Tanımlama</h2>
                <p className="text-xs text-gray-500">Değişiklik anında yürürlüğe girecektir.</p>
              </div>
            </div>

            {success && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                <span>Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 8 karakter yazın"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2.5 pl-4 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Yeni şifrenizi tekrar yazın"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50/50 py-2.5 pl-4 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {password.length > 0 && confirmPassword.length > 0 && !isMatching && (
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
                  <AlertCircle size={14} />
                  <span>Şifreler eşleşmiyor, lütfen kontrol edin.</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving || !isMinLength || !isMatching}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <KeyRound size={16} />
                  {saving ? 'Güncelleniyor...' : 'Şifreyi Değiştir'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
