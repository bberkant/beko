import SwiftUI

struct DurumumView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { dismiss() }) {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                            Text("Geri")
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Color(hex: "002D59"))
                    }
                    Spacer()
                    Text("Finansal Durumum")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Spacer()
                    Color.clear.frame(width: 48, height: 24)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .overlay(Rectangle().frame(height: 1).foregroundColor(Color(hex: "E2E8F0")), alignment: .bottom)
                
                // Segmented Tabs
                HStack(spacing: 4) {
                    TabButton(title: "Varlıklarım", index: 0, selectedIndex: $selectedTab)
                    TabButton(title: "Giderlerim", index: 1, selectedIndex: $selectedTab)
                    TabButton(title: "Borçlarım", index: 2, selectedIndex: $selectedTab)
                }
                .padding(4)
                .background(Color(hex: "EEF2F6"))
                .cornerRadius(12)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                
                ScrollView {
                    VStack(spacing: 16) {
                        if selectedTab == 0 {
                            // Varlıklarım Card
                            VStack(spacing: 16) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Toplam Varlık")
                                            .font(.system(size: 12, weight: .medium))
                                            .foregroundColor(Color(hex: "64748B"))
                                        Text("₺18.450.000,00")
                                            .font(.system(size: 24, weight: .bold))
                                            .foregroundColor(Color(hex: "008556"))
                                    }
                                    Spacer()
                                    Image(systemName: "chart.line.uptrend.xyaxis")
                                        .font(.system(size: 28))
                                        .foregroundColor(Color(hex: "008556"))
                                }
                                
                                Divider()
                                
                                DurumItemRow(title: "Banka Hesapları", subtitle: "4 Aktif Hesap", amount: "₺4.250.000,00", colorHex: "002D59")
                                DurumItemRow(title: "Tahsildeki Çekler", subtitle: "18 Portföy Çeki", amount: "₺6.800.000,00", colorHex: "008556")
                                DurumItemRow(title: "Cari Alacaklar", subtitle: "32 Borçlu Müşteri", amount: "₺7.400.000,00", colorHex: "FF9800")
                            }
                            .padding(16)
                            .background(Color.white)
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                            
                        } else if selectedTab == 1 {
                            // Giderlerim Card
                            VStack(spacing: 16) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Aylık Toplam Gider")
                                            .font(.system(size: 12, weight: .medium))
                                            .foregroundColor(Color(hex: "64748B"))
                                        Text("₺3.250.000,00")
                                            .font(.system(size: 24, weight: .bold))
                                            .foregroundColor(Color(hex: "EA3829"))
                                    }
                                    Spacer()
                                    Image(systemName: "arrow.down.right.circle.fill")
                                        .font(.system(size: 28))
                                        .foregroundColor(Color(hex: "EA3829"))
                                }
                                
                                Divider()
                                
                                DurumItemRow(title: "Personel & Maaşlar", subtitle: "24 Personel", amount: "₺1.150.000,00", colorHex: "EA3829")
                                DurumItemRow(title: "Kredi Kartı Ödemeleri", subtitle: "Kurumsal Kartlar", amount: "₺771.672,20", colorHex: "EA3829")
                                DurumItemRow(title: "Akaryakıt & Araç Giderleri", subtitle: "Filo Masrafları", amount: "₺328.327,80", colorHex: "EA3829")
                                DurumItemRow(title: "Mezbaha & Kesim Giderleri", subtitle: "Haftalık İşletme", amount: "₺1.000.000,00", colorHex: "EA3829")
                            }
                            .padding(16)
                            .background(Color.white)
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                            
                        } else {
                            // Borçlarım Card
                            VStack(spacing: 16) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Toplam Borç Yükümlülüğü")
                                            .font(.system(size: 12, weight: .medium))
                                            .foregroundColor(Color(hex: "64748B"))
                                        Text("₺9.850.000,00")
                                            .font(.system(size: 24, weight: .bold))
                                            .foregroundColor(Color(hex: "FF9800"))
                                    }
                                    Spacer()
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.system(size: 28))
                                        .foregroundColor(Color(hex: "FF9800"))
                                }
                                
                                Divider()
                                
                                DurumItemRow(title: "Verilen Çekler (Borç)", subtitle: "12 Vadeli Çek", amount: "₺5.600.000,00", colorHex: "EA3829")
                                DurumItemRow(title: "Tedarikçi Cari Borçları", subtitle: "15 Tedarikçi", amount: "₺3.478.327,80", colorHex: "FF9800")
                                DurumItemRow(title: "Banka Kredi Taksitleri", subtitle: "Kuveyt Türk / Ziraat", amount: "₺771.672,20", colorHex: "002D59")
                            }
                            .padding(16)
                            .background(Color.white)
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        }
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct TabButton: View {
    let title: String
    let index: Int
    @Binding var selectedIndex: Int
    
    var body: some View {
        Button(action: { selectedIndex = index }) {
            Text(title)
                .font(.system(size: 13, weight: selectedIndex == index ? .semibold : .medium))
                .foregroundColor(selectedIndex == index ? Color(hex: "0F172A") : Color(hex: "64748B"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(selectedIndex == index ? Color.white : Color.clear)
                .cornerRadius(10)
                .shadow(color: selectedIndex == index ? Color.black.opacity(0.06) : Color.clear, radius: 2, y: 1)
        }
    }
}

private struct DurumItemRow: View {
    let title: String
    let subtitle: String
    let amount: String
    let colorHex: String
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Color(hex: "1E293B"))
                Text(subtitle)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
            Spacer()
            Text(amount)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Color(hex: colorHex))
        }
        .padding(.vertical, 4)
    }
}
