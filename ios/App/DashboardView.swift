import SwiftUI

struct DashboardView: View {
    @Binding var selectedTab: Int
    @ObservedObject var manager = SupabaseManager.shared
    @State private var subTabSelected = 0 // 0: Hesabım, 1: Kartım
    @State private var isBalanceMasked = false
    
    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 16) {
                // Header (Exact Kuveyt Turk Header)
                HStack(spacing: 12) {
                    // Circle Logo
                    Circle()
                        .fill(Color(.systemGray5))
                        .frame(width: 40, height: 40)
                        .overlay(
                            Image(systemName: "building.columns.fill")
                                .foregroundColor(.gray)
                        )
                    
                    // Center title
                    VStack(alignment: .left, spacing: 2) {
                        Text("Marif Et Ve Et Ürünleri")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(Color(.label))
                        Text("Gıda Tarım Hayvancılık...")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                    }
                    
                    Spacer()
                    
                    // Icons right
                    HStack(spacing: 14) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.gray)
                        Image(systemName: "bell")
                            .foregroundColor(.gray)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 12)
                
                // Helper Banner ("Size yardımcı olabilmek için buradayım.")
                HStack {
                    Text("Size yardımcı olabilmek için buradayım.")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.brandGreen)
                    Spacer()
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 16)
                .background(Color.brandGreen.opacity(0.05))
                .cornerRadius(10)
                .padding(.horizontal, 24)
                
                // Sub-tabs ("Hesabım", "Kartım")
                HStack(spacing: 24) {
                    VStack(spacing: 6) {
                        Text("Hesabım")
                            .font(.system(size: 15, weight: subTabSelected == 0 ? .bold : .medium))
                            .foregroundColor(subTabSelected == 0 ? .brandGreen : .gray)
                        if subTabSelected == 0 {
                            Rectangle()
                                .fill(Color.brandGreen)
                                .frame(height: 2)
                                .cornerRadius(1)
                        } else {
                            Rectangle()
                                .fill(Color.clear)
                                .frame(height: 2)
                        }
                    }
                    .onTapGesture { subTabSelected = 0 }
                    
                    VStack(spacing: 6) {
                        Text("Kartım")
                            .font(.system(size: 15, weight: subTabSelected == 1 ? .bold : .medium))
                            .foregroundColor(subTabSelected == 1 ? .brandGreen : .gray)
                        if subTabSelected == 1 {
                            Rectangle()
                                .fill(Color.brandGreen)
                                .frame(height: 2)
                                .cornerRadius(1)
                        } else {
                            Rectangle()
                                .fill(Color.clear)
                                .frame(height: 2)
                        }
                    }
                    .onTapGesture { subTabSelected = 1 }
                    
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                
                // Accounts/Kasa Card container
                VStack(spacing: 0) {
                    HStack(alignment: .top) {
                        Image(systemName: subTabSelected == 0 ? "wallet.pass.fill" : "creditcard.fill")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 36, height: 36)
                            .foregroundColor(subTabSelected == 0 ? .orange : .brandGreen)
                        
                        VStack(alignment: .left, spacing: 4) {
                            Text(subTabSelected == 0 ? "ONE DARS KASA" : "SAĞLAM BUSINESS FİNANSMAN")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(Color(.label))
                            Text(subTabSelected == 0 ? "98645477 - 1" : "9792 •••• •••• 3678")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                        }
                        
                        Spacer()
                        
                        HStack(spacing: 12) {
                            Button(action: {
                                isBalanceMasked.toggle()
                            }) {
                                Image(systemName: isBalanceMasked ? "eye.slash" : "eye")
                            }
                            Image(systemName: "square.and.arrow.up")
                            Image(systemName: "ellipsis")
                        }
                        .foregroundColor(.brandGreen)
                        .font(.system(size: 14))
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    // Main Balance
                    HStack(alignment: .firstTextBaseline) {
                        Spacer()
                        Text(subTabSelected == 0 ? "Bakiye:" : "Borç:")
                            .font(.system(size: 14))
                            .foregroundColor(.gray)
                        Text(isBalanceMasked ? "••••••" : (subTabSelected == 0 ? "₺44.922.400,00" : "₺771.672,20"))
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(Color(.label))
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    
                    if subTabSelected == 1 {
                        Divider()
                            .padding(.top, 10)
                        HStack {
                            Text("Kullanılabilir Limit: ")
                                .foregroundColor(.gray) +
                            Text("₺2.472,25")
                                .fontWeight(.bold)
                                .foregroundColor(Color(.label))
                            Spacer()
                            Text("Son Ödeme: 02.09.2026")
                                .foregroundColor(.red)
                                .fontWeight(.semibold)
                        }
                        .font(.system(size: 10))
                        .padding(.horizontal, 20)
                        .padding(.top, 10)
                    }
                    
                    // Footer Link
                    Divider()
                        .padding(.top, 20)
                    
                    Button(action: { selectedTab = 1 }) {
                        HStack {
                            Spacer()
                            Text("Tüm Hesaplarım")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.brandGreen)
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.brandGreen)
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 20)
                    }
                }
                .background(Color(.systemBackground))
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color(.systemGray5), lineWidth: 1)
                )
                .padding(.horizontal, 24)
                
                // Hızlı İşlemler Section
                VStack(spacing: 12) {
                    HStack {
                        Text("Hızlı İşlemler")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color(.label))
                        Spacer()
                        Button(action: {}) {
                            Text("Düzenle")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.brandGreen)
                        }
                    }
                    
                    HStack(spacing: 12) {
                        // Quick Action 1
                        Button(action: { selectedTab = 1 }) {
                            HStack(spacing: 8) {
                                Image(systemName: "doc.text.fill")
                                    .foregroundColor(.brandGreen)
                                VStack(alignment: .left) {
                                    Text("Çek Ekle")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(Color(.label))
                                    Text("Yeni Kayıt")
                                        .font(.system(size: 10))
                                        .foregroundColor(.gray)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 14)
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color(.systemGray5), lineWidth: 1)
                            )
                        }
                        
                        // Quick Action 2
                        Button(action: { selectedTab = 3 }) {
                            HStack(spacing: 8) {
                                Image(systemName: "person.2.fill")
                                    .foregroundColor(.brandGreen)
                                VStack(alignment: .left) {
                                    Text("Cariler")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(Color(.label))
                                    Text("Hesap Arama")
                                        .font(.system(size: 10))
                                        .foregroundColor(.gray)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 14)
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color(.systemGray5), lineWidth: 1)
                            )
                        }
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                
                // Son İşlem Section
                VStack(spacing: 12) {
                    HStack {
                        Text("Son İşlem")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color(.label))
                        Spacer()
                        Button(action: { selectedTab = 1 }) {
                            Text("Tümünü Gör")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.brandGreen)
                        }
                    }
                    
                    if let firstCheck = manager.checks.first {
                        VStack(alignment: .left, spacing: 12) {
                            HStack {
                                Text(formatDateString(firstCheck.dueDate))
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.gray)
                                Spacer()
                                Text("-\(formatCurrencyString(firstCheck.amount))")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.red)
                            }
                            
                            HStack(alignment: .top) {
                                VStack(alignment: .left, spacing: 4) {
                                    Text("Gönderen: \(firstCheck.kesideci)")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(Color(.label))
                                    Text(firstCheck.checkNo)
                                        .font(.system(size: 11))
                                        .foregroundColor(.gray)
                                }
                                Spacer()
                                Image(systemName: "doc.text.fill")
                                    .foregroundColor(.orange)
                            }
                        }
                        .padding(16)
                        .background(Color(.systemBackground))
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color(.systemGray5), lineWidth: 1)
                        )
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                
                // Campaign banner image simulation
                VStack(alignment: .left, spacing: 8) {
                    HStack {
                        Text("Size Özel")
                            .font(.system(size: 14, weight: .bold))
                        Spacer()
                        Text("Tümünü Gör")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.brandGreen)
                    }
                    
                    // Banner card
                    HStack {
                        VStack(alignment: .left, spacing: 6) {
                            Text("CebimPOS'ta")
                                .font(.system(size: 14, weight: .black))
                                .foregroundColor(.brandGreen)
                            Text("Kuveyt Türk Kartlarına\nTaksit Fırsatı!")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(Color(.label))
                        }
                        Spacer()
                        Image(systemName: "creditcard.circle.fill")
                            .resizable()
                            .frame(width: 44, height: 44)
                            .foregroundColor(.brandGreen)
                    }
                    .padding(16)
                    .background(Color.brandGreen.opacity(0.04))
                    .cornerRadius(16)
                }
                .padding(.horizontal, 24)
                .padding(.top, 8)
                .padding(.bottom, 90)
            }
        }
        .background(Color(red: 0.96, green: 0.97, blue: 0.98))
    }
    
    // Format helpers
    private func formatCurrencyString(_ amount: Double) -> String {
        return NumberFormatter.localizedString(from: NSNumber(value: amount), number: .decimal) + " TL"
    }
    
    private func formatDateString(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        return "\(parts[2]).\(parts[1]).\(parts[0])"
    }
}

struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView(selectedTab: .constant(0))
    }
}
