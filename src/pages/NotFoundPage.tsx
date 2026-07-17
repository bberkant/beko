import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">Sayfa Bulunamadı</h1>
      <p className="mt-2 text-sm text-gray-500">Aradığınız sayfa mevcut değil.</p>
      <button className="btn-primary mt-6" onClick={() => navigate('/dashboard')}>
        Dashboard'a Dön
      </button>
    </div>
  );
}
