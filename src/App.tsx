import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { VehiclesProvider } from './features/vehicles/store';
import { VehicleListPage, VehicleFormPage, VehicleDetailPage } from './features/vehicles/pages';
import { TrafficFinesPage, DriversPage } from './features/vehicles/subpages';
import { UsersPage } from './features/users/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { TendersPage } from './features/tenders/TendersPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<StoreProvider><VehiclesProvider><AppLayout /></VehiclesProvider></StoreProvider>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/finance/credit-cards" element={<CreditCardListPage />} />
                <Route path="/finance/credit-cards/new" element={<CreditCardFormPage />} />
                <Route path="/finance/credit-cards/statements" element={<StatementsPage />} />
                <Route path="/finance/credit-cards/:id" element={<CreditCardDetailPage />} />
                <Route path="/finance/credit-cards/:id/edit" element={<CreditCardFormPage />} />
                <Route path="/finance/credit-cards/:id/statements/:statementId" element={<StatementDetailPage />} />
                <Route path="/finans" element={<Navigate to="/finance/credit-cards" replace />} />
                <Route path="/finans/banka-hesaplari/*" element={<Navigate to="/finance/credit-cards" replace />} />
                <Route path="/finans/cekler/*" element={<Navigate to="/finance/credit-cards" replace />} />
                <Route path="/arac-yonetimi" element={<VehicleListPage />} />
                <Route path="/arac-yonetimi/yeni" element={<VehicleFormPage />} />
                <Route path="/arac-yonetimi/trafik-cezalari" element={<TrafficFinesPage />} />
                <Route path="/arac-yonetimi/soforler" element={<DriversPage />} />
                <Route path="/arac-yonetimi/:id" element={<VehicleDetailPage />} />
                <Route path="/arac-yonetimi/:id/duzenle" element={<VehicleFormPage />} />
                <Route path="/ihaleler" element={<TendersPage />} />
                <Route path="/belgeler" element={<PlaceholderPage />} />
                <Route path="/takvim" element={<PlaceholderPage />} />
                <Route path="/ai-asistan" element={<PlaceholderPage />} />
                <Route path="/bildirimler" element={<PlaceholderPage />} />
                <Route path="/kullanicilar" element={<UsersPage />} />
                <Route path="/ayarlar" element={<SettingsPage />} />
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
