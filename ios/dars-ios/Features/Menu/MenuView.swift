//
//  MenuView.swift
//  dars-ios
//
//  Pixel-perfect native Enterprise Module Directory matching `ios_prototype.html`
//  and Kuveyt Türk corporate private banking specifications.
//  Includes corporate profile header, live database pulse, full-text module search,
//  and 4 enterprise category groupings with sub-screen routing.
//

import SwiftUI

public struct MenuView: View {
    @StateObject private var viewModel: MenuViewModel
    @State private var showingLogoutAlert: Bool = false
    @State private var showingDbInfoSheet: Bool = false
    
    public init(viewModel: MenuViewModel = MenuViewModel()) {
        self._viewModel = StateObject(wrappedValue: viewModel)
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
                // Building Corporate Avatar
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
    
    // MARK: - 3. Module Sections Feed
    
    private var moduleSectionsFeed: some View {
        VStack(spacing: 16) {
            // Section 1: Finans & Hazine
            if matchesSearch(["çekten", "takas", "çek", "banka", "kasa", "pos", "finans"]) {
                moduleGroup(title: "FİNANS & HAZİNE") {
                    NavigationLink(destination: CektenView()) {
                        menuRow(icon: "doc.text.fill", title: "ÇEKTEN Hesabı", subtitle: "Açık Mal Ödemeleri & Maliyet Motoru")
                    }
                    Divider()
                    NavigationLink(destination: TakasView()) {
                        menuRow(icon: "arrow.triangle.2.circlepath", title: "Takas Çekleri", subtitle: "Portföy & Takas Banka Dağılımı (\(viewModel.checkCount) Çek)")
                    }
                    Divider()
                    NavigationLink(destination: ChecksView()) {
                        menuRow(icon: "tray.full.fill", title: "Çek & Senet Portföyü", subtitle: "Tahsilde & Ciro Edilen Evraklar")
                    }
                }
            }
            
            // Section 2: Ticaret & Operasyon
            if matchesSearch(["cari", "kesim", "sipariş", "fatura", "e-fatura", "stok", "ticaret"]) {
                moduleGroup(title: "TİCARET & OPERASYON") {
                    NavigationLink(destination: CarisView()) {
                        menuRow(icon: "person.2.fill", title: "Cariler & Müşteriler", subtitle: "\(viewModel.cariCount) Cari Kart • Ekstre & Bakiye")
                    }
                    Divider()
                    NavigationLink(destination: SlaughtersView()) {
                        menuRow(icon: "scissors", title: "Kesim Listesi", subtitle: "\(viewModel.kesimCount) Kayıt • Canlı Besi Takibi")
                    }
                    Divider()
                    NavigationLink(destination: EInvoicesView()) {
                        menuRow(icon: "envelope.fill", title: "E-Faturalar", subtitle: "Etik & Marif GİB E-Faturaları")
                    }
                }
            }
            
            // Section 3: Varlık & Filo
            if matchesSearch(["araç", "filo", "kart", "gayrimenkul", "tapu", "ihale", "hukuk", "varlık"]) {
                moduleGroup(title: "VARLIK & FİLO") {
                    NavigationLink(destination: VehiclesView()) {
                        menuRow(icon: "car.fill", title: "Araçlar & Filo", subtitle: "\(viewModel.vehicleCount) Ticari Araç • Muayene & Sigorta")
                    }
                    Divider()
                    NavigationLink(destination: RealEstatesView()) {
                        menuRow(icon: "building.2.fill", title: "Gayrimenkul Listesi", subtitle: "Taşınmaz & Tapu Kayıtları")
                    }
                    Divider()
                    NavigationLink(destination: TendersView()) {
                        menuRow(icon: "briefcase.fill", title: "İhaleler & Teklifler", subtitle: "Kamu & Özel İhale Dosyaları")
                    }
                    Divider()
                    NavigationLink(destination: LegalCasesView()) {
                        menuRow(icon: "gavel.fill", title: "Hukuki İşlemler", subtitle: "İcra & Dava Takip Dosyaları")
                    }
                }
            }
            
            // Section 4: Sistem & Destek
            if matchesSearch(["ayar", "sistem", "güvenlik", "veri", "önbellek", "destek"]) {
                moduleGroup(title: "SİSTEM & DESTEK") {
                    NavigationLink(destination: SettingsView()) {
                        menuRow(icon: "gearshape.fill", title: "Uygulama Ayarları", subtitle: "Face ID, PIN, Bildirimler, Gizlilik")
                    }
                    Divider()
                    Button(action: { showingDbInfoSheet = true }) {
                        menuRow(icon: "server.rack", title: "Veri Tabanı Durumu", subtitle: "PostgreSQL Canlı Bağlantı Kontrolü")
                    }
                    Divider()
                    Button(action: { viewModel.clearCache() }) {
                        menuRow(icon: "arrow.clockwise.circle", title: "Önbelleği Temizle", subtitle: "Yerel HTTP ve Görüntü Önbelleğini Sıfırla")
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
