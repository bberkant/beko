import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { StoreProvider } from './features/credit-cards/data/store';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { CreditCardListPage } from './features/credit-cards/pages/CreditCardListPage';
import { CreditCardFormPage } from './features/credit-cards/pages/CreditCardFormPage';
import { CreditCardDetailPage } from './features/credit-cards/pages/CreditCardDetailPage';
import { StatementsPage } from './features/credit-cards/pages/StatementsPage';
import { StatementDetailPage } from './features/credit-cards/pages/StatementDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<StoreProvider><AppLayout /></StoreProvider>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/finance/credit-cards" element={<CreditCardListPage />} />
                <Route path="/finance/credit-cards/new" element={<CreditCardFormPage />} />
                <Route path="/finance/credit-cards/statements" element={<StatementsPage />} />
                <Route path="/finance/credit-cards/:id" element={<CreditCardDetailPage />} />
                <Route path="/finance/credit-cards/:id/edit" element={<CreditCardFormPage />} />
                <Route path="/finance/credit-cards/:id/statements/:statementId" element={<StatementDetailPage />} />
                <Route path="/finans" element={<PlaceholderPage />} />
                <Route path="/finans/banka-hesaplari" element={<PlaceholderPage />} />
                <Route path="/finans/cekler" element={<PlaceholderPage />} />
                <Route path="/finans/odemeler" element={<PlaceholderPage />} />
                <Route path="/arac-yonetimi" element={<PlaceholderPage />} />
                <Route path="/ihaleler" element={<PlaceholderPage />} />
                <Route path="/belgeler" element={<PlaceholderPage />} />
                <Route path="/takvim" element={<PlaceholderPage />} />
                <Route path="/ai-asistan" element={<PlaceholderPage />} />
                <Route path="/bildirimler" element={<PlaceholderPage />} />
                <Route path="/kullanicilar" element={<PlaceholderPage />} />
                <Route path="/ayarlar" element={<PlaceholderPage />} />
                <Route path="/" element={<DashboardPage />} />
                <Route path="*" element={<PlaceholderPage />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
