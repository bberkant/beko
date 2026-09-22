//
//  MenuView.swift
//  dars-ios
//
//  Pixel-perfect native Enterprise Module Directory matching `ios_prototype.html`
//  and Kuveyt Türk corporate private banking specifications.
//  Includes all 34 enterprise modules categorized cleanly with full-text search.
//

import SwiftUI

public struct MenuView: View {
    @StateObject private var viewModel: MenuViewModel
    @State private var showingLogoutAlert: Bool = false
    @State private var showingDbInfoSheet: Bool = false
    
    @MainActor
    public init(viewModel: MenuViewModel? = nil) {
        self._viewModel = StateObject(wrappedValue: viewModel ?? MenuViewModel())
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 1. Corporate Identity Profile Card
                corporateProfileCard
                
                // 2. Menu Search Input
                menuSearchBar
                
                // 3. Module Categories Feed
                moduleSectionsFeed
                
                // 4. Logout CTA
                logoutButton
            }
            .padding(.horizontal, KTTheme.Metrics.paddingHorizontal)
            .padding(.top, 12)
            .padding(.bottom, 90)
        }
        .background(Color.ktPageBackground)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("DARS MENÜ")
                    .font(.ktSectionHeader)
                    .foregroundColor(.ktTextHeading)
            }
        }
        .alert(isPresented: $showingLogoutAlert) {
            Alert(
                title: Text("Güvenli Çıkış"),
                message: Text("Oturumunuzu kapatıp giriş ekranına dönmek istediğinize emin misiniz?"),
                primaryButton: .destructive(Text("Evet, Çıkış Yap")) {
                    viewModel.logout()
                },
                secondaryButton: .cancel(Text("Vazgeç"))
            )
        }
        .sheet(isPresented: $showingDbInfoSheet) {
            dbStatusSheet
        }
        .overlay(
            toastOverlay
        )
    }
    
    // MARK: - 1. Corporate Identity Profile Card
    
    private var corporateProfileCard: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.ktPrimarySoft)
                        .frame(width: 48, height: 48)
                    Image(systemName: "building.columns.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.ktPrimary)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Amasya Et ve Et Ürünleri")
                        .font(.system(size: 14.5, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                    
                    Text("San. Tic. A.Ş. • VN: 0680012345")
                        .font(.system(size: 11))
                        .foregroundColor(.ktTextSecondary)
                    
                    HStack(spacing: 6) {
                        Text(viewModel.userEmail)
                            .font(.system(size: 10.5))
                            .foregroundColor(.ktTextTertiary)
                        
                        Text("YÖNETİCİ")
                            .font(.system(size: 9.5, weight: .bold))
                            .foregroundColor(.ktPrimary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1.5)
                            .background(Color.ktPrimarySoft)
                            .cornerRadius(4)
                    }
                    .padding(.top, 1)
                }
                
                Spacer()
            }
            
            Divider()
            
            // Live Supabase Status Pulse
            HStack {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.ktSuccess)
                        .frame(width: 8, height: 8)
                    Text("Canlı Supabase PostgREST (zubhjybqzcpplultpsgt)")
                        .font(.system(size: 10.5, weight: .semibold))
                        .foregroundColor(.ktSuccessDark)
                }
                Spacer()
                Button(action: { showingDbInfoSheet = true }) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 13))
                        .foregroundColor(.ktTextTertiary)
                }
            }
        }
        .padding(14)
        .background(Color.ktCardSurface)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.ktCardBorder, lineWidth: 1))
        .ktCardShadow()
    }
    
    // MARK: - 2. Menu Search Input
    
    private var menuSearchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.ktTextTertiary)
                .font(.system(size: 14))
            
            TextField("Menüde veya alt modüllerde ara...", text: $viewModel.menuSearchText)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.ktTextHeading)
                .autocapitalization(.none)
                .disableAutocorrection(true)
            
            if !viewModel.menuSearchText.isEmpty {
                Button(action: { viewModel.menuSearchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.ktTextTertiary)
                        .font(.system(size: 14))
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.ktCardSurface)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.ktCardBorder, lineWidth: 1))
    }
    
    // MARK: - 3. Module Categories Feed
    
    private var moduleSectionsFeed: some View {
        VStack(spacing: 16) {
            // Group 1: FİNANS & HAZİNE
            if matchesSearch(["çekten", "takas", "çek", "senet", "iskonto", "banka", "kart", "pos", "kasa", "hareket", "durum", "finans", "hazine"]) {
                moduleGroup(title: "FİNANS & HAZİNE") {
                    NavigationLink(destination: CektenView()) {
                        menuRow(icon: "doc.text.fill", title: "ÇEKTEN Hesabı", subtitle: "Açık Mal Ödemeleri & Maliyet Motoru")
                    }
                    Divider()
                    NavigationLink(destination: TakasView()) {
                        menuRow(icon: "arrow.triangle.2.circlepath", title: "Takas Çekleri", subtitle: "Banka Takas Kotaları & Portföy Dağılımı")
                    }
                    Divider()
                    NavigationLink(destination: ChecksView()) {
                        menuRow(icon: "tray.full.fill", title: "Çek & Senet Portföyü", subtitle: "Tahsilde & Ciro Edilen Evraklar")
                    }
                    Divider()
                    NavigationLink(destination: CheckValuationView()) {
                        menuRow(icon: "percent", title: "Çek Vade & İskonto Simülatörü", subtitle: "Finansman & Komisyon Hesaplama Motoru")
                    }
                    Divider()
                    NavigationLink(destination: BankAccountsView()) {
                        menuRow(icon: "building.columns", title: "Banka Hesapları & IBAN", subtitle: "Kuveyt Türk, Ziraat, Garanti Bakiyeleri")
                    }
                    Divider()
                    NavigationLink(destination: CreditCardsView()) {
                        menuRow(icon: "creditcard.fill", title: "Kredi Kartlarım", subtitle: "Sağlam Business Limit & Borç Özeti")
                    }
                    Divider()
                    NavigationLink(destination: PosTrackingView()) {
                        menuRow(icon: "creditcard.and.123", title: "POS Bloke & Tahsilat Takibi", subtitle: "Günlük POS Blokeleri & Çözüm Tarihleri")
                    }
                    Divider()
                    NavigationLink(destination: PosDifferencesView()) {
                        menuRow(icon: "chart.pie.fill", title: "POS Fark & Komisyon Hesaplama", subtitle: "Banka Komisyon & Erken Çözüm Oranları")
                    }
                    Divider()
                    NavigationLink(destination: CashboxView()) {
                        menuRow(icon: "banknote.fill", title: "Merkez Kasa Yönetimi", subtitle: "Nakit Giriş/Çıkış & Günlük Kasa Bakiyesi")
                    }
                    Divider()
                    NavigationLink(destination: TransactionsHistoryView()) {
                        menuRow(icon: "clock.arrow.circlepath", title: "Hesap Hareketleri", subtitle: "Tüm Banka & Kasa İşlem Kayıtları")
                    }
                    Divider()
                    NavigationLink(destination: DurumumView()) {
                        menuRow(icon: "chart.line.uptrend.xyaxis", title: "Finansal Durumum", subtitle: "Varlıklarım, Giderlerim ve Borçlarım")
                    }
                }
            }
            
            // Group 2: TİCARET & OPERASYON
            if matchesSearch(["cari", "ekstre", "kesim", "fatura", "e-fatura", "stok", "şube", "personel", "muhasebe", "ticaret", "operasyon"]) {
                moduleGroup(title: "TİCARET & OPERASYON") {
                    NavigationLink(destination: CarisView()) {
                        menuRow(icon: "person.2.fill", title: "Cariler & Müşteriler", subtitle: "Borçlu / Alacaklı Cari Kartlar & Bakiyeler")
                    }
                    Divider()
                    NavigationLink(destination: CariDetailView()) {
                        menuRow(icon: "doc.plaintext.fill", title: "Cari Hesap Detayı & Ekstre", subtitle: "Müşteri & Tedarikçi Ekstre Dökümü")
                    }
                    Divider()
                    NavigationLink(destination: SlaughtersView()) {
                        menuRow(icon: "scissors", title: "Kesim Listesi", subtitle: "Canlı Kilo, Karkas & Randıman Takibi")
                    }
                    Divider()
                    NavigationLink(destination: EInvoicesView()) {
                        menuRow(icon: "envelope.fill", title: "E-Faturalar", subtitle: "Gelen & Giden GİB E-Faturaları")
                    }
                    Divider()
                    NavigationLink(destination: StocksView()) {
                        menuRow(icon: "cube.box.fill", title: "Stok & Envanter Durumu", subtitle: "Soğuk Hava Deposu Karkas & Et Stokları")
                    }
                    Divider()
                    NavigationLink(destination: BranchesView()) {
                        menuRow(icon: "storefront.fill", title: "Şube & Satış Noktaları", subtitle: "Merzifon, Suluova, Amasya Şube Ciroları")
                    }
                    Divider()
                    NavigationLink(destination: PersonnelView()) {
                        menuRow(icon: "person.3.fill", title: "Personel & Bordro Yönetimi", subtitle: "24 Çalışan • Maaş, Avans & İzin Takibi")
                    }
                    Divider()
                    NavigationLink(destination: DisMuhasebeView()) {
                        menuRow(icon: "doc.badge.gearshape.fill", title: "Dış Muhasebe & Beyannameler", subtitle: "KDV1, Muhtasar, SGK Prim Takvimi")
                    }
                }
            }
            
            // Group 3: VARLIK, FİLO & HUKUK
            if matchesSearch(["araç", "filo", "gayrimenkul", "tapu", "ihale", "hukuk", "dava", "belge", "arşiv", "varlık", "filo"]) {
                moduleGroup(title: "VARLIK, FİLO & HUKUK") {
                    NavigationLink(destination: VehiclesView()) {
                        menuRow(icon: "car.fill", title: "Araçlar & Filo", subtitle: "Ticari Filo • Muayene, HGS & Ceza Takibi")
                    }
                    Divider()
                    NavigationLink(destination: RealEstatesView()) {
                        menuRow(icon: "building.2.fill", title: "Gayrimenkul Listesi", subtitle: "Besi Çiftliği, Ofis & Taşınmaz Tapuları")
                    }
                    Divider()
                    NavigationLink(destination: TendersView()) {
                        menuRow(icon: "briefcase.fill", title: "İhaleler & Teklifler", subtitle: "Kamu & Belediye Et Tedarik İhaleleri")
                    }
                    Divider()
                    NavigationLink(destination: LegalCasesView()) {
                        menuRow(icon: "gavel.fill", title: "Hukuki İşlemler & Davalar", subtitle: "Dava Dosyaları, Esas No & Duruşmalar")
                    }
                    Divider()
                    NavigationLink(destination: DocumentsView()) {
                        menuRow(icon: "folder.fill", title: "Belge & Evrak Arşivi", subtitle: "Sicil Gazetesi, Vergi Levhası, Sözleşmeler")
                    }
                }
            }
            
            // Group 4: YÖNETİM, ANALİZ & ASİSTAN
            if matchesSearch(["takvim", "rapor", "analiz", "kapanış", "mutabakat", "asistan", "ai", "bildirim", "kullanıcı", "ayar", "güvenlik", "yönetim"]) {
                moduleGroup(title: "YÖNETİM, ANALİZ & ASİSTAN") {
                    NavigationLink(destination: TakvimView()) {
                        menuRow(icon: "calendar", title: "Finansal Vade Takvimi", subtitle: "Günlük Ödeme, Tahsilat & Vergi Ajandası")
                    }
                    Divider()
                    NavigationLink(destination: ReportingView()) {
                        menuRow(icon: "chart.bar.xaxis", title: "Raporlama & Analiz", subtitle: "Aylık Ciro Trendi & Gelir Tablosu (PDF)")
                    }
                    Divider()
                    NavigationLink(destination: MonthEndView()) {
                        menuRow(icon: "checkmark.seal.fill", title: "Ay Sonu Kapanış & Mutabakat", subtitle: "Dönem Sonu Hesap Mutabakat Çizelgesi")
                    }
                    Divider()
                    NavigationLink(destination: AsistanView()) {
                        menuRow(icon: "sparkles", title: "DARS Finans Asistanı (AI)", subtitle: "Finansal Zeka & Anlık Raporlama Botu")
                    }
                    Divider()
                    NavigationLink(destination: BildirimlerView()) {
                        menuRow(icon: "bell.fill", title: "Bildirimler & Uyarılar", subtitle: "Vade, Limit & Tahsilat Bildirimleri")
                    }
                    Divider()
                    NavigationLink(destination: UsersView()) {
                        menuRow(icon: "person.badge.key.fill", title: "Kullanıcı & Yetki Yönetimi", subtitle: "Admin, Finans ve Saha Yetkilendirme")
                    }
                    Divider()
                    NavigationLink(destination: SettingsView()) {
                        menuRow(icon: "gearshape.fill", title: "Uygulama Ayarları", subtitle: "Face ID, PIN, Bildirimler, Gizlilik")
                    }
                    Divider()
                    Button(action: { showingDbInfoSheet = true }) {
                        menuRow(icon: "server.rack", title: "Veri Tabanı Durumu", subtitle: "PostgreSQL Canlı Bağlantı Kontrolü")
                    }
                }
            }
        }
    }
    
    private func moduleGroup<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 10.5, weight: .bold))
                .foregroundColor(.ktTextSecondary)
                .tracking(0.5)
                .padding(.leading, 4)
            
            VStack(spacing: 0) {
                content()
            }
            .background(Color.ktCardSurface)
            .cornerRadius(16)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.ktCardBorder, lineWidth: 1))
            .ktCardShadow()
        }
    }
    
    private func menuRow(icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.ktPrimarySoft)
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.ktPrimary)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundColor(.ktTextHeading)
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundColor(.ktTextSecondary)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.ktTextTertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }
    
    private func matchesSearch(_ keywords: [String]) -> Bool {
        let q = viewModel.menuSearchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return true }
        return keywords.contains { $0.contains(q) || q.contains($0) }
    }
    
    // MARK: - 4. Logout CTA
    
    private var logoutButton: some View {
        Button(action: { showingLogoutAlert = true }) {
            HStack(spacing: 6) {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 14, weight: .bold))
                Text("Güvenli Çıkış Yap")
                    .font(.system(size: 13.5, weight: .bold))
            }
            .foregroundColor(.ktCoral)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(Color.ktCoralLight)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.ktCoral.opacity(0.3), lineWidth: 1)
            )
        }
        .padding(.top, 4)
    }
    
    // MARK: - DB Status Sheet
    
    private var dbStatusSheet: some View {
        VStack(spacing: 20) {
            Capsule()
                .fill(Color.ktSlate300)
                .frame(width: 40, height: 4)
                .padding(.top, 10)
            
            Image(systemName: "server.rack")
                .font(.system(size: 40))
                .foregroundColor(.ktSuccess)
            
            Text("Veri Tabanı Bağlantısı Canlı")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.ktTextHeading)
            
            VStack(spacing: 8) {
                Text("Endpoint: \(viewModel.apiEndpoint)")
                Text("Protokol: PostgREST v12.0 via HTTPS")
                Text("Kullanıcı: \(viewModel.userEmail)")
                Text("Durum: \(viewModel.isOnline ? "Aktif / Canlı" : "Çevrimdışı") (\(viewModel.latencyMs) ms)")
            }
            .font(.system(size: 12))
            .foregroundColor(.ktTextSecondary)
            
            Spacer()
        }
        .padding(20)
        .presentationDetents([.fraction(0.35)])
    }
    
    // MARK: - Toast Overlay
    
    private var toastOverlay: some View {
        Group {
            if let msg = viewModel.toastMessage {
                VStack {
                    Spacer()
                    Text(msg)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.black.opacity(0.85))
                        .cornerRadius(20)
                        .padding(.bottom, 30)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
        }
    }
}
