import SwiftUI

struct DashboardView: View {
    @Binding var selectedTab: Int
    
    let ktPrimary = Color(red: 0.0, green: 0.176, blue: 0.349) // #002D59
    let bgF8FAFC = Color(red: 0.973, green: 0.980, blue: 0.988)
    
    var body: some View {
        VStack(spacing: 0) {
            // APP HEADER (Always visible on Dashboard)
            HStack(spacing: 12) {
                // Left Icon
                Circle()
                    .fill(Color(red: 0.945, green: 0.957, blue: 0.976)) // slate-100
                    .frame(width: 36, height: 36)
                    .overlay(
                        Circle().stroke(Color.gray.opacity(0.2), lineWidth: 1)
                    )
                    .overlay(
                        Image(systemName: "building.2")
                            .foregroundColor(.gray)
                    )
                
                // Titles
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text("Marif Et Ve Et Ürünleri")
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundColor(Color(.darkText))
                            .lineLimit(1)
                        
                        // Live badge
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 6, height: 6)
                            Text("Canlı")
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundColor(Color(red: 0.0, green: 0.4, blue: 0.2))
                        }
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(4)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(Color.green.opacity(0.2), lineWidth: 1)
                        )
                    }
                    
                    Text("Gıda Tarım Hayvancılık A.Ş.")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
                
                Spacer()
                
                // Right Icons
                HStack(spacing: 8) {
                    Button(action: {}) {
                        Circle()
                            .fill(Color(red: 0.933, green: 0.957, blue: 1.0))
                            .frame(width: 36, height: 36)
                            .overlay(
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(ktPrimary)
                            )
                    }
                    
                    Circle()
                        .fill(Color.gray.opacity(0.2))
                        .frame(width: 36, height: 36)
                        .overlay(
                            Circle().stroke(Color.blue.opacity(0.3), lineWidth: 1)
                        )
                        .overlay(
                            Image(systemName: "person.fill")
                                .foregroundColor(.white)
                        )
                    
                    Button(action: {}) {
                        ZStack(alignment: .topTrailing) {
                            Circle()
                                .fill(Color(red: 0.933, green: 0.957, blue: 1.0))
                                .frame(width: 36, height: 36)
                                .overlay(
                                    Image(systemName: "bell")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(ktPrimary)
                                )
                            
                            Circle()
                                .fill(Color.red)
                                .frame(width: 10, height: 10)
                                .overlay(Circle().stroke(Color.white, lineWidth: 2))
                                .offset(x: -2, y: 2)
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 40) // Status bar safe area padding
            .padding(.bottom, 12)
            .background(Color.white)
            .overlay(
                Rectangle().frame(height: 1).foregroundColor(Color.gray.opacity(0.1)),
                alignment: .bottom
            )
            
            // MAIN DASHBOARD CONTENT
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 16) {
                    
                    // Assistant Banner
                    HStack {
                        HStack(spacing: 8) {
                            Text("👋")
                                .font(.system(size: 12))
                            Text("Size yardımcı olabilmek için buradayım.")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                        }
                        Spacer()
                        Button(action: {}) {
                            Text("Soru Sor")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.white.opacity(0.2))
                                .cornerRadius(6)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        LinearGradient(colors: [Color(red: 0.07, green: 0.29, blue: 0.47), Color(red: 0.0, green: 0.17, blue: 0.29)], startPoint: .leading, endPoint: .trailing)
                    )
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.05), radius: 2)
                    
                    // Hızlı İşlemler
                    VStack(spacing: 8) {
                        HStack {
                            Text("Hızlı İşlemler")
                                .font(.system(size: 13.5, weight: .bold))
                                .foregroundColor(Color(.darkText))
                            Spacer()
                            Button(action: {}) {
                                Text("Tüm Menü")
                                    .font(.system(size: 12.5, weight: .medium))
                                    .foregroundColor(ktPrimary)
                            }
                        }
                        .padding(.horizontal, 4)
                        
                        // Grid
                        VStack(spacing: 12) {
                            HStack(spacing: 12) {
                                QuickActionCard(icon: "arrow.triangle.2.circlepath", title: "Takas Çekleri", subtitle: "6.421.881 TL", action: { selectedTab = 2 })
                                QuickActionCard(icon: "person.2.fill", title: "Cari Kartlar", subtitle: "Bakiye & Mutabakat", action: { selectedTab = 3 })
                            }
                            HStack(spacing: 12) {
                                QuickActionCard(icon: "list.bullet.clipboard.fill", title: "Kesim Listesi", subtitle: "60 Kesim Kaydı", action: {})
                                QuickActionCard(icon: "building.columns.fill", title: "ÇEKTEN Hesabı", subtitle: "Açık Mal Ödemeleri", action: { selectedTab = 1 })
                            }
                        }
                    }
                    
                    // DARS Finansal Takvim
                    VStack(spacing: 10) {
                        HStack {
                            Text("DARS Finansal Takvim")
                                .font(.system(size: 13.5, weight: .bold))
                                .foregroundColor(Color(.darkText))
                            Spacer()
                            Button(action: {}) {
                                HStack(spacing: 2) {
                                    Text("Tümünü Gör")
                                        .font(.system(size: 12.5, weight: .medium))
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 10, weight: .bold))
                                }
                                .foregroundColor(ktPrimary)
                            }
                        }
                        .padding(.horizontal, 4)
                        
                        VStack(spacing: 8) {
                            CalendarWidgetRow(title: "Ödenecek Çekler (Bu Hafta)", amount: "1.250.000 TL", date: "15 Haz")
                            CalendarWidgetRow(title: "Tahsil Edilecek Kesimler", amount: "450.000 TL", date: "16 Haz")
                        }
                    }
                    .padding(.top, 4)
                    
                    // Son İşlemler
                    VStack(spacing: 10) {
                        HStack {
                            HStack(spacing: 6) {
                                Text("Son İşlemler")
                                    .font(.system(size: 13.5, weight: .bold))
                                    .foregroundColor(Color(.darkText))
                                Text("Son 10 İşlem")
                                    .font(.system(size: 10, weight: .bold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.gray.opacity(0.2))
                                    .foregroundColor(Color(.darkGray))
                                    .cornerRadius(10)
                            }
                            Spacer()
                            Button(action: {}) {
                                Text("Tümünü Gör >")
                                    .font(.system(size: 12.5, weight: .medium))
                                    .foregroundColor(ktPrimary)
                            }
                        }
                        .padding(.horizontal, 4)
                        
                        VStack(spacing: 8) {
                            TransactionRow(title: "Marif Et - Dana Kesim", subtitle: "Karkas: 340kg", amount: "+ 120.000 TL", isPositive: true)
                            TransactionRow(title: "Çek Ödemesi", subtitle: "Garanti Bankası - 1241512", amount: "- 45.000 TL", isPositive: false)
                        }
                    }
                    .padding(.top, 4)
                    
                }
                .padding(20)
                .padding(.bottom, 80)
            }
            .background(bgF8FAFC)
        }
    }
}

struct QuickActionCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let action: () -> Void
    let ktPrimary = Color(red: 0.0, green: 0.176, blue: 0.349)
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(red: 0.933, green: 0.957, blue: 1.0)) // #EEF4FF
                    .frame(width: 32, height: 32)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 14))
                            .foregroundColor(ktPrimary)
                    )
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(Color(.darkText))
                        .lineLimit(1)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            .padding(14)
            .background(Color.white)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.04), radius: 2)
        }
    }
}

struct CalendarWidgetRow: View {
    let title: String
    let amount: String
    let date: String
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(.darkText))
                Text(date)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.gray)
            }
            Spacer()
            Text(amount)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(Color(red: 0.0, green: 0.176, blue: 0.349))
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.04), radius: 2)
    }
}

struct TransactionRow: View {
    let title: String
    let subtitle: String
    let amount: String
    let isPositive: Bool
    
    var body: some View {
        HStack {
            Circle()
                .fill(isPositive ? Color.green.opacity(0.1) : Color.red.opacity(0.1))
                .frame(width: 36, height: 36)
                .overlay(
                    Image(systemName: isPositive ? "arrow.down.left" : "arrow.up.right")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(isPositive ? .green : .red)
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color(.darkText))
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
            }
            Spacer()
            Text(amount)
                .font(.system(size: 13, weight: .heavy))
                .foregroundColor(isPositive ? .green : .red)
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.04), radius: 2)
    }
}
