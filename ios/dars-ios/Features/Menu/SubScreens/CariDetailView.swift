import SwiftUI

struct CariDetailView: View {
    @Environment(\.dismiss) private var dismiss
    var cariName: String = "Marif Et Ve Et Ürünleri"
    var cariCode: String = "120.01.001"
    var balance: String = "₺1.250.000,00"
    var isReceivable: Bool = true
    
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
                    Text("Cari Hesap Detayı")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Spacer()
                    Color.clear.frame(width: 48, height: 24)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .overlay(Rectangle().frame(height: 1).foregroundColor(Color(hex: "E2E8F0")), alignment: .bottom)
                
                ScrollView {
                    VStack(spacing: 16) {
                        // Profile Info Card
                        VStack(spacing: 12) {
                            Circle()
                                .fill(Color(hex: "002D59").opacity(0.1))
                                .frame(width: 50, height: 50)
                                .overlay(
                                    Text(String(cariName.prefix(1)))
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundColor(Color(hex: "002D59"))
                                )
                            
                            Text(cariName)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                                .multilineTextAlignment(.center)
                            
                            Text("Cari Kodu: \(cariCode)")
                                .font(.system(size: 12, weight: .medium, design: .monospaced))
                                .foregroundColor(Color(hex: "64748B"))
                            
                            HStack {
                                Text(isReceivable ? "Alacak Bakiyesi:" : "Borç Bakiyesi:")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                Text(balance)
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(isReceivable ? Color(hex: "008556") : Color(hex: "EA3829"))
                            }
                            .padding(.top, 4)
                        }
                        .padding(20)
                        .frame(maxWidth: .infinity)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        // Recent Transactions in Ekstre
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Son Ekstre Hareketleri")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                            
                            VStack(spacing: 8) {
                                EkstreItemRow(date: "20.09.2026", desc: "Et Satış Faturası (FAT-9912)", amount: "+₺450.000,00", isPositive: true)
                                EkstreItemRow(date: "15.09.2026", desc: "Banka Havalesi / Tahsilat", amount: "-₺200.000,00", isPositive: false)
                                EkstreItemRow(date: "05.09.2026", desc: "Vadeli Çek Girişi", amount: "+₺300.000,00", isPositive: true)
                            }
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct EkstreItemRow: View {
    let date: String
    let desc: String
    let amount: String
    let isPositive: Bool
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(desc)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(hex: "1E293B"))
                Text(date)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
            Spacer()
            Text(amount)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(isPositive ? Color(hex: "008556") : Color(hex: "EA3829"))
        }
        .padding(10)
        .background(Color(hex: "F8FAFC"))
        .cornerRadius(10)
    }
}
