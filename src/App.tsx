import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
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
import { VehicleListPage, VehicleFormPage, VehicleDetailPage, VehiclePricesPage } from './features/vehicles/pages';
import { DriversPage } from './features/vehicles/subpages';
import { UsersPage } from './features/users/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { BackupsPage } from './features/settings/BackupsPage';
import { ReportingPage } from './features/reporting/ReportingPage';
import { TendersPage } from './features/tenders/TendersPage';
import { DogrudanTeminPage } from './features/tenders/DogrudanTeminPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { HgsAndFinesPage } from './features/vehicles/HgsAndFinesPage';
import { FuelTrackingPage } from './features/vehicles/FuelTrackingPage';
import { SanayiGiderleriPage } from './features/vehicles/SanayiGiderleriPage';
import { CheckValuationPage } from './features/check-valuation/CheckValuationPage';
import { PosDifferencesPage } from './features/pos-valuation/PosDifferencesPage';
import { ChecksPage } from './features/checks/ChecksPage';
import { PosPage } from './features/pos/PosPage';
import { RealEstatesPage } from './features/real-estates/RealEstatesPage';
import { MainCashboxPage } from './features/main-cashbox/MainCashboxPage';
import { GirisCikisPage } from './features/main-cashbox/GirisCikisPage';
import { KesimListesiPage } from './features/kesim-listesi/KesimListesiPage';
import { KesimListesiCariPage } from './features/kesim-listesi/KesimListesiCariPage';
import { ActivityLogsPage } from './features/activity-logs/ActivityLogsPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { AiAssistantPage } from './features/ai-assistant/AiAssistantPage';
import { DocumentsPage } from './features/documents/DocumentsPage';
import { VegaArctosCarilerPage } from './features/accounting/VegaArctosCarilerPage';
import { VegaArctosPersonelPage } from './features/accounting/VegaArctosPersonelPage';
import { VegaArctosSonIslemlerPage } from './features/accounting/VegaArctosSonIslemlerPage';
import { VegaArctosStokPage } from './features/accounting/VegaArctosStokPage';
import { VegaArctosEfaturaPage } from './features/accounting/VegaArctosEfaturaPage';
import { AcikMalOdemeleriPage } from './features/accounting/AcikMalOdemeleriPage';
import { CektenHesabiPage } from './features/cekten-hesabi/CektenHesabiPage';
import { BankAccountsProvider } from './features/bank-accounts/store';
import { BankAccountListPage, BankAccountFormPage, BankAccountDetailPage } from './features/bank-accounts/pages';
import { BankAccountTransactionsPage } from './features/bank-accounts/BankAccountTransactionsPage';
import { MonthEndPage } from './features/month-end/MonthEndPage';
import { DisMuhasebePage } from './features/dis-muhasebe/DisMuhasebePage';
import { HukukiIslemlerPage } from './features/hukuk/HukukiIslemlerPage';
import { SubelerPage } from './features/subeler/SubelerPage';
import { WhatsAppOperasyonPage } from './features/whatsapp-operasyon/WhatsAppOperasyonPage';
import { FindeksPage } from './features/findeks/pages/FindeksPage';
import { BillsProvider, BillListPage, BillDetailPage } from './features/bills';
import { PosDevicesProvider, PosDevicesPage } from './features/pos-devices';

function SuperAdminRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-550">Oturum kontrol ediliyor...</div>;
  }
  const isAuthorized = user?.role === 'Süper Admin' || user?.role === 'Developer' || user?.role === 'Süper Yönetici' || user?.rawRole === 'super_admin' || user?.rawRole === 'developer';
  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-550">Oturum kontrol ediliyor...</div>;
  }
  const isDeveloper = user?.role === 'Developer' || user?.rawRole === 'developer';
  const isAuthorized = (user?.role === 'Admin' || user?.role === 'Süper Admin' || user?.role === 'Yönetici' || user?.role === 'Süper Yönetici' || user?.rawRole === 'admin' || user?.rawRole === 'super_admin' || user?.email === 'admin@dars.local' || user?.email === 'admin@ets360.local') && !isDeveloper;
  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

function AdminOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-gray-550">Oturum kontrol ediliyor...</div>;
  }
  const isAuthorized = user?.role === 'Admin' || user?.role === 'Süper Admin' || user?.role === 'Developer' || user?.role === 'Yönetici' || user?.role === 'Süper Yönetici' || user?.rawRole === 'admin' || user?.rawRole === 'super_admin' || user?.rawRole === 'developer' || user?.email === 'admin@dars.local' || user?.email === 'admin@ets360.local';
  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<StoreProvider><VehiclesProvider><BankAccountsProvider><BillsProvider><AppLayout /></BillsProvider></BankAccountsProvider></VehiclesProvider></StoreProvider>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* WhatsApp Sohbetleri (Yeni WhatsApp Web) HERKESE AÇIKTIR */}
                <Route path="/whatsapp" element={<WhatsAppOperasyonPage initialTab="chat" />} />
                <Route path="/whatsapp/sohbetler" element={<WhatsAppOperasyonPage initialTab="chat" />} />
                
                {/* WhatsApp Operasyon Masası ve Yönetim Masası SADECE ADMIN KULLANICIYA ÖZELDİR (GİZLİ) */}
                <Route element={<AdminRoute />}>
                  <Route path="/whatsapp/belgeler" element={<WhatsAppOperasyonPage initialTab="media" />} />
                  <Route path="/whatsapp/gorevler" element={<WhatsAppOperasyonPage initialTab="tasks" />} />
                  <Route path="/whatsapp/ayarlar" element={<WhatsAppOperasyonPage initialTab="settings" />} />
                  <Route path="/whatsapp-operasyon" element={<WhatsAppOperasyonPage initialTab="media" />} />
                </Route>
                
                <Route path="/finans/kredi-kartlari" element={<CreditCardListPage />} />
                <Route path="/finans/kredi-kartlari/yeni" element={<CreditCardFormPage />} />
                <Route path="/finans/kredi-kartlari/ekstreler" element={<StatementsPage />} />
                <Route path="/finans/kredi-kartlari/:id" element={<CreditCardDetailPage />} />
                <Route path="/finans/kredi-kartlari/:id/duzenle" element={<CreditCardFormPage />} />
                <Route path="/finans/kredi-kartlari/:id/ekstreler/:statementId" element={<StatementDetailPage />} />
                
                {/* Şirket Kurum Faturaları & Cari Ekstreleri */}
                <Route path="/finans/faturalar" element={<BillListPage />} />
                <Route path="/finans/faturalar/:id" element={<BillDetailPage />} />

                <Route path="/finans/cek-vade-hesaplama" element={<CheckValuationPage />} />
                <Route path="/finans/pos-fark-hesaplama" element={<PosDifferencesPage />} />
                <Route path="/kesim-listesi/acik-mal-odemeleri" element={<AcikMalOdemeleriPage />} />
                <Route path="/finans/cekten-hesabi" element={<CektenHesabiPage />} />
                
                {/* Findeks Alt Modülü Sadece Admin / Yönetici Kullanıcılara Özeldir */}
                <Route element={<AdminOnlyRoute />}>
                  <Route path="/finans/findeks" element={<FindeksPage />} />
                </Route>
                <Route path="/finans" element={<Navigate to="/finans/kredi-kartlari" replace />} />
                
                {/* Banka Hesapları, Hareketleri ve Ay Sonu Kokpiti Sadece Süper Admin & Developer'a Özeldir */}
                <Route element={<SuperAdminRoute />}>
                  <Route path="/ay-sonu" element={<MonthEndPage />} />
                  <Route path="/finans/banka-hesap-hareketleri" element={<BankAccountTransactionsPage />} />
                  <Route path="/finans/banka-hesaplari" element={<BankAccountListPage />} />
                  <Route path="/finans/banka-hesaplari/yeni" element={<BankAccountFormPage />} />
                  <Route path="/finans/banka-hesaplari/:id" element={<BankAccountDetailPage />} />
                  <Route path="/finans/banka-hesaplari/:id/duzenle" element={<BankAccountFormPage />} />
                </Route>
                <Route path="/muhasebe/cariler" element={<VegaArctosCarilerPage />} />
                <Route path="/muhasebe/personel" element={<VegaArctosPersonelPage />} />
                <Route path="/muhasebe/stoklar" element={<VegaArctosStokPage />} />
                <Route path="/muhasebe/vega-son-islemler" element={<VegaArctosSonIslemlerPage />} />
                <Route path="/e-fatura/etik" element={<VegaArctosEfaturaPage company="etik" />} />
                <Route path="/e-fatura/marif" element={<VegaArctosEfaturaPage company="marif" />} />
                
                {/* Dış Muhasebe Rotaları */}
                <Route path="/dis-muhasebe/veri-gonderimi" element={<DisMuhasebePage activeTab="veri-gonderimi" />} />
                <Route path="/dis-muhasebe/beyannameler" element={<DisMuhasebePage activeTab="beyannameler" />} />
                <Route path="/dis-muhasebe/mutabakatlar" element={<DisMuhasebePage activeTab="mutabakatlar" />} />
                <Route path="/dis-muhasebe/mizan" element={<DisMuhasebePage activeTab="mizan" />} />

                {/* Hukuki İşlemler Rotaları */}
                <Route path="/hukuk/dosyalar" element={<HukukiIslemlerPage activeTab="dosyalar" />} />
                <Route path="/hukuk/takvim" element={<HukukiIslemlerPage activeTab="takvim" />} />
                <Route path="/hukuk/uyap" element={<HukukiIslemlerPage activeTab="uyap" />} />
                <Route path="/hukuk/avukatlar" element={<HukukiIslemlerPage activeTab="avukatlar" />} />

                {/* Şubelerimiz Rotaları */}
                <Route path="/subeler/:branchKey" element={<SubelerPage />} />

                <Route path="/cekler" element={<ChecksPage />} />
                <Route path="/cekler/takas" element={<ChecksPage />} />
                <Route path="/pos" element={<PosPage />} />
                <Route path="/ana-kasa" element={<Navigate to="/ana-kasa/rapor" replace />} />
                <Route path="/ana-kasa/rapor" element={<MainCashboxPage />} />
                <Route path="/ana-kasa/giris-cikis" element={<GirisCikisPage />} />
                <Route path="/ana-kasa/gunluk-hesap" element={<MainCashboxPage />} />
                <Route path="/ana-kasa/pos-cihazlari" element={<PosDevicesProvider><PosDevicesPage /></PosDevicesProvider>} />
                <Route path="/arac-yonetimi/arac-listesi" element={<VehiclePricesPage />} />
                <Route path="/arac-yonetimi" element={<VehicleListPage />} />
                <Route path="/arac-yonetimi/yeni" element={<VehicleFormPage />} />
                <Route path="/arac-yonetimi/guncel-fiyat" element={<VehiclePricesPage />} />
                <Route path="/arac-yonetimi/hgs-ve-cezalari" element={<HgsAndFinesPage />} />
                <Route path="/arac-yonetimi/trafik-cezalari" element={<HgsAndFinesPage />} />
                <Route path="/arac-yonetimi/hgs-gecis" element={<HgsAndFinesPage />} />
                <Route path="/arac-yonetimi/yakit-takip" element={<FuelTrackingPage />} />
                <Route path="/arac-yonetimi/soforler" element={<DriversPage />} />
                <Route path="/arac-yonetimi/sanayi-giderleri" element={<SanayiGiderleriPage />} />
                <Route path="/arac-yonetimi/:id" element={<VehicleDetailPage />} />
                <Route path="/arac-yonetimi/:id/duzenle" element={<VehicleFormPage />} />
                <Route path="/ihaleler" element={<TendersPage />} />
                <Route path="/ihaleler/dogrudan-teminler" element={<DogrudanTeminPage />} />
                <Route path="/gayrimenkul-listesi" element={<RealEstatesPage />} />
                <Route path="/kesim-listesi" element={<KesimListesiPage />} />
                <Route path="/kesim-listesi/cari" element={<KesimListesiCariPage />} />
                <Route path="/belgeler" element={<DocumentsPage />} />
                <Route path="/takvim" element={<CalendarPage />} />
                <Route path="/ai-asistan" element={<AiAssistantPage />} />
                <Route path="/bildirimler" element={<NotificationsPage />} />
                <Route path="/kullanicilar" element={<UsersPage />} />
                <Route path="/aktivite-gunlugu" element={<ActivityLogsPage />} />
                <Route path="/raporlama" element={<ReportingPage />} />
                <Route path="/sifre-degistir" element={<ChangePasswordPage />} />
                <Route path="/ayarlar" element={<SettingsPage />} />
                <Route path="/ayarlar/yedekler" element={<BackupsPage />} />
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
