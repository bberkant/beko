import SwiftUI

struct TransactionsHistoryView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    
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
                    Text("Hesap Hareketleri")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Spacer()
                    Color.clear.frame(width: 48, height: 24)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .overlay(Rectangle().frame(height: 1).foregroundColor(Color(hex: "E2E8F0")), alignment: .bottom)
                
                // Search Field
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(Color(hex: "94A3B8"))
                    TextField("İşlem açıklaması veya tutar ara...", text: $searchText)
                        .font(.system(size: 13))
                }
                .padding(10)
                .background(Color.white)
                .cornerRadius(10)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                
                ScrollView {
                    VStack(spacing: 10) {
                        TransactionRow(title: "Eti Maden İşletmeleri", category: "Gelen Transfer (EFT)", date: "22.09.2026 - 14:30", amount: "+₺350.000,00", isIncome: true)
                        TransactionRow(title: "Amasya Mezbaha Kesim Ücreti", category: "Giden Ödeme", date: "22.09.2026 - 11:15", amount: "-₺125.000,00", isIncome: false)
                        TransactionRow(title: "Sağlam Business Kart Otomatik Ödeme", category: "Kart Tahsilatı", date: "21.09.2026 - 18:00", amount: "-₺771.672,20", isIncome: false)
                        TransactionRow(title: "Aksa Gaz Dağıtım Fatura", category: "Otomatik Fatura", date: "21.09.2026 - 09:40", amount: "-₺130,00", isIncome: false)
                        TransactionRow(title: "Samsun Kamu Hastaneleri Tedarik", category: "Hakediş Tahsilatı", date: "20.09.2026 - 16:20", amount: "+₺1.850.000,00", isIncome: true)
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct TransactionRow: View {
    let title: String
    let category: String
    let date: String
    let amount: String
    let isIncome: Bool
    
    var body: some View {
        HStack {
            Image(systemName: isIncome ? "arrow.down.left.circle.fill" : "arrow.up.right.circle.fill")
                .font(.system(size: 24))
                .foregroundColor(isIncome ? Color(hex: "008556") : Color(hex: "EA3829"))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(hex: "1E293B"))
                Text("\(category) • \(date)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
            
            Spacer()
            
            Text(amount)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(isIncome ? Color(hex: "008556") : Color(hex: "EA3829"))
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}
