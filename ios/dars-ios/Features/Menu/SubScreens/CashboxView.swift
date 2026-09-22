import SwiftUI

struct CashboxView: View {
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
                    Text("Merkez Kasa Yönetimi")
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
                        // Kasa Card
                        VStack(spacing: 12) {
                            Text("Mevcut Nakit Kasa Bakiyesi")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(Color(hex: "64748B"))
                            Text("₺126.193,16")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(Color(hex: "008556"))
                            
                            HStack(spacing: 24) {
                                VStack {
                                    Text("Bugün Giriş")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(Color(hex: "94A3B8"))
                                    Text("+₺45.000,00")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Color(hex: "008556"))
                                }
                                
                                VStack {
                                    Text("Bugün Çıkış")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(Color(hex: "94A3B8"))
                                    Text("-₺18.500,00")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Color(hex: "EA3829"))
                                }
                            }
                        }
                        .padding(20)
                        .frame(maxWidth: .infinity)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        // Recent Cashbox Movements
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Günün Kasa Hareketleri")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                            
                            CashMovementRow(desc: "Perakende Şube Nakit Devri", time: "16:45", amount: "+₺35.000,00", isIncome: true)
                            CashMovementRow(desc: "Mezbaha Acil Mazot Ödemesi", time: "14:10", amount: "-₺12.500,00", isIncome: false)
                            CashMovementRow(desc: "Müşteri Elden Nakit Tahsilat", time: "11:30", amount: "+₺10.000,00", isIncome: true)
                            CashMovementRow(desc: "Ofis Mutfak & Sarf Malzeme", time: "09:15", amount: "-₺6.000,00", isIncome: false)
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

private struct CashMovementRow: View {
    let desc: String
    let time: String
    let amount: String
    let isIncome: Bool
    
    var body: some View {
        HStack {
            Image(systemName: isIncome ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                .foregroundColor(isIncome ? Color(hex: "008556") : Color(hex: "EA3829"))
                .font(.system(size: 20))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(desc)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(hex: "1E293B"))
                Text(time)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
            
            Spacer()
            
            Text(amount)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(isIncome ? Color(hex: "008556") : Color(hex: "EA3829"))
        }
        .padding(.vertical, 4)
    }
}
