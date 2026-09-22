import SwiftUI

struct MonthEndView: View {
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
                    Text("Ay Sonu Kapanış & Mutabakat")
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
                        // Month Status
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Ağustos 2026 Dönem Kapanışı")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Color(hex: "1E293B"))
                                Text("Kapanış Durumu: Tamamlandı")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(Color(hex: "008556"))
                            }
                            Spacer()
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 28))
                                .foregroundColor(Color(hex: "008556"))
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        // Checklist items
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Eylül 2026 Ön Kapanış Kontrol Listesi")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                            
                            ClosingCheckItem(title: "Banka Ekstre & Hareket Eşleştirmesi", isDone: true)
                            ClosingCheckItem(title: "Kesimhane Karkas Ağırlık Mutabakatı", isDone: true)
                            ClosingCheckItem(title: "Tedarikçi Cari Bakiye Teyitleri", isDone: false)
                            ClosingCheckItem(title: "E-Fatura & İrsaliye İcmal Kontrolü", isDone: true)
                            ClosingCheckItem(title: "POS Bloke & Komisyon Hesabı Kapanışı", isDone: false)
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

private struct ClosingCheckItem: View {
    let title: String
    let isDone: Bool
    
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                .foregroundColor(isDone ? Color(hex: "008556") : Color(hex: "CBD5E1"))
                .font(.system(size: 18))
            
            Text(title)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(isDone ? Color(hex: "1E293B") : Color(hex: "64748B"))
            
            Spacer()
        }
        .padding(10)
        .background(Color(hex: "F8FAFC"))
        .cornerRadius(8)
    }
}
