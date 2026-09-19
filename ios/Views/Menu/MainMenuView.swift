import SwiftUI

public struct MenuItem: Identifiable {
    public let id: String
    public let title: String
    public let screen: String
    
    public init(id: String, title: String, screen: String) {
        self.id = id
        self.title = title
        self.screen = screen
    }
}

public struct MenuGroup: Identifiable {
    public let id: String
    public let title: String
    public let iconName: String
    public let items: [MenuItem]
    
    public init(id: String, title: String, iconName: String, items: [MenuItem]) {
        self.id = id
        self.title = title
        self.iconName = iconName
        self.items = items
    }
}

public struct MainMenuView: View {
    public let onNavigate: (String) -> Void
    @State private var expandedGroupId: String? = "cekler"
    
    let groups: [MenuGroup] = [
        MenuGroup(id: "finans", title: "Finans & Bankacılık", iconName: "creditcard.fill", items: [
            MenuItem(id: "f1", title: "Banka Hesapları", screen: "bank_accounts"),
            MenuItem(id: "f2", title: "Hesap Hareketleri", screen: "transactions"),
            MenuItem(id: "f3", title: "Kredi Kartları", screen: "credit_cards"),
            MenuItem(id: "f4", title: "Kurum Faturaları & Ekstreler", screen: "bills"),
            MenuItem(id: "f5", title: "Findeks Çek İstihbarat", screen: "findeks"),
            MenuItem(id: "f6", title: "Çek Vade & Komisyon", screen: "check_valuation"),
            MenuItem(id: "f7", title: "POS Fark Hesaplama", screen: "pos_differences"),
            MenuItem(id: "f8", title: "ÇEKTEN Hesabı", screen: "cekten"),
            MenuItem(id: "f9", title: "Takas Çekleri", screen: "takas"),
            MenuItem(id: "f10", title: "Çek & Senet Listesi", screen: "checks")
        ]),
        MenuGroup(id: "whatsapp", title: "WhatsApp Operasyon Masası", iconName: "bubble.left.and.bubble.right.fill", items: [
            MenuItem(id: "w1", title: "WhatsApp Sohbetleri", screen: "whatsapp_chat"),
            MenuItem(id: "w2", title: "Belgeler & Medya Havuzu", screen: "whatsapp_media"),
            MenuItem(id: "w3", title: "Operasyonel Görevler", screen: "whatsapp_tasks")
        ]),
        MenuGroup(id: "muhasebe", title: "Muhasebe & Cari Yönetimi", iconName: "chart.bar.doc.horizontal.fill", items: [
            MenuItem(id: "m1", title: "Vega Cari Kart Listesi", screen: "caris"),
            MenuItem(id: "m2", title: "Stok & Envanter", screen: "stocks"),
            MenuItem(id: "m3", title: "E-Fatura & E-Arşiv", screen: "e_invoices"),
            MenuItem(id: "m4", title: "Personel & Maaşlar", screen: "personnel"),
            MenuItem(id: "m5", title: "Dış Muhasebe & Beyannameler", screen: "dis_muhasebe")
        ]),
        MenuGroup(id: "operasyon", title: "Operasyon & Şubeler", iconName: "storefront.fill", items: [
            MenuItem(id: "o1", title: "Şubelerimiz & Performans", screen: "subeler"),
            MenuItem(id: "o2", title: "Kesim Listesi", screen: "slaughters"),
            MenuItem(id: "o3", title: "Açık Mal Ödemeleri", screen: "acik_mal"),
            MenuItem(id: "o4", title: "Kesim Listesi Cari", screen: "kesim_cari"),
            MenuItem(id: "o5", title: "Günlük POS Takip", screen: "pos"),
            MenuItem(id: "o6", title: "Ana Kasa Giriş-Çıkış", screen: "cashbox")
        ]),
        MenuGroup(id: "araclar", title: "Araç Filosu & Lojistik", iconName: "car.2.fill", items: [
            MenuItem(id: "a1", title: "Araç Filo Listesi", screen: "vehicles"),
            MenuItem(id: "a2", title: "Güncel Araç Değerleri", screen: "vehicle_prices"),
            MenuItem(id: "a3", title: "HGS & Trafik Cezaları", screen: "vehicle_fines"),
            MenuItem(id: "a4", title: "Yakıt Tüketim Takip", screen: "vehicle_fuel"),
            MenuItem(id: "a5", title: "Şoförler & Belgeler", screen: "vehicle_drivers"),
            MenuItem(id: "a6", title: "Sanayi & Bakım Giderleri", screen: "vehicle_maintenance")
        ]),
        MenuGroup(id: "hukuk", title: "Hukuk & İhaleler & Raporlar", iconName: "scalemass.fill", items: [
            MenuItem(id: "h1", title: "Hukuki İşlemler & UYAP", screen: "hukuk"),
            MenuItem(id: "h2", title: "İhaleler & Doğrudan Temin", screen: "tenders"),
            MenuItem(id: "h3", title: "Tapu & Gayrimenkuller", screen: "real_estates"),
            MenuItem(id: "h4", title: "Yönetim Raporları", screen: "reports"),
            MenuItem(id: "h5", title: "Kullanıcı & Şirket Profili", screen: "settings")
        ])
    ]
    
    public init(onNavigate: @escaping (String) -> Void) {
        self.onNavigate = onNavigate
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Header
                HStack {
                    Text("Menü & Modüller")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(AppColors.textPrimary)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                
                // Group Accordions
                ForEach(groups) { group in
                    VStack(spacing: 0) {
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                if expandedGroupId == group.id {
                                    expandedGroupId = nil
                                } else {
                                    expandedGroupId = group.id
                                }
                            }
                        }) {
                            HStack(spacing: 12) {
                                Image(systemName: group.iconName)
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(AppColors.primary)
                                    .frame(width: 32, height: 32)
                                    .background(AppColors.primary.opacity(0.1))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                
                                Text(group.title)
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(AppColors.textPrimary)
                                
                                Spacer()
                                
                                Image(systemName: expandedGroupId == group.id ? "chevron.up" : "chevron.down")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(AppColors.textMuted)
                            }
                            .padding(14)
                            .background(AppColors.surface)
                        }
                        .buttonStyle(.plain)
                        
                        if expandedGroupId == group.id {
                            VStack(spacing: 0) {
                                Divider()
                                    .background(AppColors.divider)
                                
                                ForEach(group.items) { item in
                                    Button(action: { onNavigate(item.screen) }) {
                                        HStack {
                                            Text(item.title)
                                                .font(.system(size: 13, weight: .medium))
                                                .foregroundColor(AppColors.textPrimary)
                                                .padding(.leading, 44)
                                            
                                            Spacer()
                                            
                                            Image(systemName: "chevron.right")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundColor(AppColors.textMuted)
                                        }
                                        .padding(.vertical, 12)
                                        .padding(.trailing, 16)
                                        .background(AppColors.surface)
                                    }
                                    .buttonStyle(.plain)
                                    
                                    if item.id != group.items.last?.id {
                                        Divider()
                                            .padding(.leading, 44)
                                            .background(AppColors.divider)
                                    }
                                }
                            }
                        }
                    }
                    .cornerRadius(14)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(AppColors.border, lineWidth: 1)
                    )
                    .padding(.horizontal, 16)
                }
            }
            .padding(.bottom, 20)
        }
        .background(AppColors.background)
    }
}
