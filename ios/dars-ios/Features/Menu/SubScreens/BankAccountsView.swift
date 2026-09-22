import SwiftUI

struct BankAccountsView: View {
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
                    Text("Banka Hesapları & IBAN")
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
                        BankAccountCard(
                            bankName: "Kuveyt Türk Katılım Bankası",
                            accountName: "Ticari Cari Hesap (TL)",
                            iban: "TR44 0020 5000 0986 4547 7000 01",
                            balance: "₺2.450.000,00",
                            themeColorHex: "008556"
                        )
                        
                        BankAccountCard(
                            bankName: "T.C. Ziraat Bankası",
                            accountName: "Kurumsal Tahsilat Hesabı (TL)",
                            iban: "TR82 0001 0005 8291 4410 5001 02",
                            balance: "₺1.120.000,00",
                            themeColorHex: "EA3829"
                        )
                        
                        BankAccountCard(
                            bankName: "Garanti BBVA",
                            accountName: "POS & Şirket Hesabı (TL)",
                            iban: "TR19 0006 2000 1284 9912 3001 04",
                            balance: "₺680.000,00",
                            themeColorHex: "002D59"
                        )
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct BankAccountCard: View {
    let bankName: String
    let accountName: String
    let iban: String
    let balance: String
    let themeColorHex: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(bankName)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(hex: "1E293B"))
                Spacer()
                Circle()
                    .fill(Color(hex: themeColorHex))
                    .frame(width: 10, height: 10)
            }
            
            Text(accountName)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color(hex: "94A3B8"))
            
            HStack {
                Text(iban)
                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    .foregroundColor(Color(hex: "64748B"))
                Spacer()
                Button(action: {
                    UIPasteboard.general.string = iban
                }) {
                    Image(systemName: "doc.on.doc")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "002D59"))
                }
            }
            .padding(10)
            .background(Color(hex: "F8FAFC"))
            .cornerRadius(8)
            
            Divider()
            
            HStack {
                Text("Kullanılabilir Bakiye")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color(hex: "64748B"))
                Spacer()
                Text(balance)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color(hex: "008556"))
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}
