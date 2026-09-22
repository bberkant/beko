import SwiftUI

struct PosTrackingView: View {
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
                    Text("POS Bloke & Tahsilat Takibi")
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
                        // Summary Card
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Toplam Blokeli POS Tutarı")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                Text("₺485.650,00")
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundColor(Color(hex: "002D59"))
                            }
                            Spacer()
                            Image(systemName: "creditcard.and.123")
                                .font(.system(size: 28))
                                .foregroundColor(Color(hex: "008556"))
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        // POS List
                        PosRow(bank: "Kuveyt Türk POS", terminalNo: "TRM-08941", amount: "₺215.400,00", releaseDate: "24.09.2026", status: "Blokede", statusColor: "FF9800")
                        PosRow(bank: "Garanti BBVA POS", terminalNo: "TRM-11205", amount: "₺142.250,00", releaseDate: "26.09.2026", status: "Blokede", statusColor: "FF9800")
                        PosRow(bank: "Ziraat Bankası POS", terminalNo: "TRM-33041", amount: "₺128.000,00", releaseDate: "Bugün Hesaba Geçti", status: "Çözüldü", statusColor: "008556")
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct PosRow: View {
    let bank: String
    let terminalNo: String
    let amount: String
    let releaseDate: String
    let status: String
    let statusColor: String
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(bank)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Text(terminalNo)
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
                Text(releaseDate)
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
