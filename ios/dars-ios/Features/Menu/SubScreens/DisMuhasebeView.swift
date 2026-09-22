import SwiftUI

struct DisMuhasebeView: View {
    @Environment(\.dismiss) private var dismiss
    
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
                    Text("Dış Muhasebe & Beyannameler")
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
                    VStack(spacing: 14) {
                        // Summary Tax Alert
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Ağustos 2026 KDV1 Beyannamesi")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Color(hex: "1E293B"))
                                Text("Son Ödeme: 26.09.2026 (4 Gün Kaldı)")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(Color(hex: "FF9800"))
                            }
                            Spacer()
                            Image(systemName: "clock.badge.exclamationmark")
                                .font(.system(size: 28))
                                .foregroundColor(Color(hex: "FF9800"))
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        TaxItemCard(name: "KDV1 Beyannamesi", period: "Ağustos 2026", deadline: "26.09.2026", amount: "₺345.890,00", status: "Onay Bekliyor", statusColor: "FF9800")
                        TaxItemCard(name: "Muhtasar ve Prim Hizmet Beyannamesi", period: "Ağustos 2026", deadline: "26.09.2026", amount: "₺284.120,00", status: "Hazırlandı", statusColor: "002D59")
                        TaxItemCard(name: "SGK Prim Ödemesi", period: "Ağustos 2026", deadline: "30.09.2026", amount: "₺412.500,00", status: "Beklemede", statusColor: "64748B")
                        TaxItemCard(name: "Geçici Vergi (2. Dönem)", period: "2026 / 2. Çeyrek", deadline: "17.08.2026", amount: "₺1.250.000,00", status: "Ödendi", statusColor: "008556")
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct TaxItemCard: View {
    let name: String
    let period: String
    let deadline: String
    let amount: String
    let status: String
    let statusColor: String
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Text("\(period) • Son Tarih: \(deadline)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(Color(hex: "94A3B8"))
                }
                Spacer()
                Text(status)
                    .font(.system(size: 11, weight: .semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(hex: statusColor).opacity(0.12))
                    .foregroundColor(Color(hex: statusColor))
                    .cornerRadius(8)
            }
            
            Divider()
            
            HStack {
                Text("Ödenecek Tutar")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color(hex: "64748B"))
                Spacer()
                Text(amount)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(Color(hex: "002D59"))
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}
