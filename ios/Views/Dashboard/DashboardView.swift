import SwiftUI

public struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    public let onNavigate: (String) -> Void
    
    public init(onNavigate: @escaping (String) -> Void) {
        self.onNavigate = onNavigate
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Corporate Header Card
                HStack(spacing: 12) {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 20))
                        .foregroundColor(AppColors.primary)
                        .frame(width: 44, height: 44)
                        .background(AppColors.primary.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text("Marif Et Ve Et Ürünleri")
                                .font(.system(size: 15, weight: .black))
                                .foregroundColor(AppColors.textPrimary)
                            
                            StatusBadge(text: "Canlı", color: AppColors.success, isAnimated: true)
                        }
                        
                        Text("Gıda Tarım Hayvancılık A.Ş.")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(AppColors.textMuted)
                    }
                    
                    Spacer()
                    
                    Button(action: {}) {
                        Image(systemName: "bell.badge.fill")
                            .foregroundColor(AppColors.textSecondary)
                            .font(.system(size: 18))
                    }
                }
                .padding(14)
                .background(AppColors.surface)
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(AppColors.border, lineWidth: 1)
                )
                
                // 4'lü Finansal Nabız
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                    MetricCard(
                        title: "Bugünkü Evrak",
                        value: viewModel.formattedTodayDue,
                        subtitle: "5 Adet Takas/Çek",
                        iconName: "flame.fill",
                        themeColor: AppColors.danger,
                        action: { onNavigate("checks") }
                    )
                    
                    MetricCard(
                        title: "Yarınki Evrak",
                        value: viewModel.formattedTomorrowDue,
                        subtitle: "12 Adet Evrak",
                        iconName: "bolt.fill",
                        themeColor: AppColors.warning,
                        action: { onNavigate("checks") }
                    )
                    
                    MetricCard(
                        title: "Banka Mevcutları",
                        value: viewModel.formattedCash,
                        subtitle: "12 Banka Hesabı",
                        iconName: "building.columns.fill",
                        themeColor: AppColors.primary,
                        action: { onNavigate("bank_accounts") }
                    )
                    
                    MetricCard(
                        title: "Haftalık Evrak",
                        value: viewModel.formattedWeeklyDue,
                        subtitle: "Toplam Takip",
                        iconName: "calendar",
                        themeColor: AppColors.success,
                        action: { onNavigate("checks") }
                    )
                }
                
                // Hızlı Modül Butonları
                VStack(alignment: .leading, spacing: 10) {
                    Text("Hızlı İşlemler")
                        .font(.system(size: 13.5, weight: .bold))
                        .foregroundColor(AppColors.textPrimary)
                    
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        QuickActionTile(title: "Takas Çekleri", subtitle: "2.91M TL Takas", icon: "arrow.triangle.swap", color: AppColors.primary) {
                            onNavigate("takas")
                        }
                        
                        QuickActionTile(title: "Çek & Senet Listesi", subtitle: "EBS Yönetimi", icon: "doc.text.magnifyingglass", color: AppColors.primary) {
                            onNavigate("checks")
                        }
                        
                        QuickActionTile(title: "Araç Filosu", subtitle: "63 Aktif Araç", icon: "car.2.fill", color: AppColors.primary) {
                            onNavigate("vehicles")
                        }
                        
                        QuickActionTile(title: "Cari Kartlar", subtitle: "Vega Entegre", icon: "person.2.fill", color: AppColors.primary) {
                            onNavigate("caris")
                        }
                        
                        QuickActionTile(title: "Kredi Kartları", subtitle: "31 Şirket Kartı", icon: "creditcard.fill", color: AppColors.primary) {
                            onNavigate("credit_cards")
                        }
                        
                        QuickActionTile(title: "ÇEKTEN Hesabı", subtitle: "15M Limit", icon: "banknote.fill", color: AppColors.primary) {
                            onNavigate("cekten")
                        }
                    }
                }
                
                // 1. DARS Finansal Takvim Widget (Üst Sırada)
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("DARS Finansal Takvim")
                            .font(.system(size: 13.5, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        
                        Spacer()
                        
                        Button(action: { onNavigate("checks") }) {
                            Text("Tümünü Gör >")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(AppColors.primary)
                        }
                    }
                    
                    VStack(spacing: 8) {
                        HStack {
                            Image(systemName: "calendar.badge.clock")
                                .foregroundColor(AppColors.primary)
                                .font(.system(size: 16, weight: .bold))
                            
                            Text("Eylül 2026 • 15 Önemli Finansal Etkinlik")
                                .font(.system(size: 12.5, weight: .bold))
                                .foregroundColor(AppColors.textPrimary)
                            
                            Spacer()
                        }
                        .padding(12)
                        .background(AppColors.primary.opacity(0.08))
                        .cornerRadius(12)
                    }
                    .padding(12)
                    .background(AppColors.surface)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AppColors.border, lineWidth: 1)
                    )
                }
                
                // 2. Son 10 İşlem (En Altta)
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        HStack(spacing: 6) {
                            Text("Son İşlemler")
                                .font(.system(size: 13.5, weight: .bold))
                                .foregroundColor(AppColors.textPrimary)
                            
                            Text("Son 10 İşlem")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(AppColors.textSecondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(AppColors.background)
                                .cornerRadius(8)
                        }
                        
                        Spacer()
                        
                        Button(action: { onNavigate("transactions") }) {
                            Text("Tümünü Gör >")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(AppColors.primary)
                        }
                    }
                    
                    VStack(spacing: 8) {
                        TransactionRowView(title: "ÖNDER BCH (Kredi Ödemesi)", subtitle: "31.08.2026 • Banka Tahakkuku", amount: "-2.300.000 TL", isIncome: false)
                        TransactionRowView(title: "Ö. ZİRAAT (Ticari Tahsilat)", subtitle: "31.08.2026 • EFT Girişi", amount: "+1.417.639 TL", isIncome: true)
                        TransactionRowView(title: "KUVEYT TÜRK (Ticari Fon)", subtitle: "31.08.2026 • Kuveyt Türk Kasa", amount: "+914.121 TL", isIncome: true)
                        TransactionRowView(title: "ZİRAAT BANKASI (Tahsilat)", subtitle: "31.08.2026 • Havale Girişi", amount: "+597.990 TL", isIncome: true)
                        TransactionRowView(title: "GARANTİ BBVA (POS Gün Sonu)", subtitle: "31.08.2026 • Blokaj Çözümü", amount: "+176.219 TL", isIncome: true)
                        TransactionRowView(title: "BURAK BESİCİLİK (Kesim Ödemesi)", subtitle: "31.08.2026 • Açık Mal", amount: "-125.000 TL", isIncome: false)
                        TransactionRowView(title: "DENİZBANK (Şube Tahsilatı)", subtitle: "31.08.2026 • Kasa Yatırma", amount: "+63.114 TL", isIncome: true)
                        TransactionRowView(title: "ALBARAKA TÜRK (Katılım Getirisi)", subtitle: "31.08.2026 • Fon Getirisi", amount: "+27.541 TL", isIncome: true)
                        TransactionRowView(title: "HALKBANK (Masraf Tahsilatı)", subtitle: "31.08.2026 • Virman", amount: "+17.968 TL", isIncome: true)
                        TransactionRowView(title: "AKBANK (İlkadım Şube Cirosu)", subtitle: "31.08.2026 • Günlük Ciro", amount: "+17.340 TL", isIncome: true)
                    }
                }
            }
            .padding(16)
        }
        .background(AppColors.background)
    }
}

public struct TransactionRowView: View {
    public let title: String
    public let subtitle: String
    public let amount: String
    public let isIncome: Bool
    
    public var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 12.5, weight: .bold))
                    .foregroundColor(AppColors.textPrimary)
                Text(subtitle)
                    .font(.system(size: 10.5, weight: .medium))
                    .foregroundColor(AppColors.textMuted)
            }
            
            Spacer()
            
            Text(amount)
                .font(.system(size: 13, weight: .black))
                .foregroundColor(isIncome ? AppColors.success : AppColors.danger)
        }
        .padding(12)
        .background(AppColors.surface)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppColors.border, lineWidth: 1)
        )
    }
}

public struct QuickActionTile: View {
    public let title: String
    public let subtitle: String
    public let icon: String
    public let color: Color
    public let action: () -> Void
    
    public init(title: String, subtitle: String, icon: String, color: Color, action: @escaping () -> Void) {
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.color = color
        self.action = action
    }
    
    public var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(color)
                    .frame(width: 32, height: 32)
                    .background(color.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)
                    Text(subtitle)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(AppColors.textMuted)
                }
                Spacer()
            }
            .padding(10)
            .background(AppColors.surface)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(AppColors.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
