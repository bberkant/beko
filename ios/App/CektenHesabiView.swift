import SwiftUI

struct CektenHesabiView: View {
    // Kuveyt Turk Blue
    let ktPrimary = Color(red: 0.0, green: 0.176, blue: 0.349)
    let bgF8FAFC = Color(red: 0.973, green: 0.980, blue: 0.988)
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 0) {
                Color.clear.frame(height: 1).padding(.top, 40)
                
                HStack {
                    Button(action: {}) {
                        Text("Menü")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color(.darkGray))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(red: 0.945, green: 0.957, blue: 0.976)) // slate-100
                            .cornerRadius(20)
                    }
                    
                    Spacer()
                    
                    Text("ÇEKTEN Hesabı")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Color(.darkText))
                        .tracking(-0.3)
                    
                    Spacer()
                    
                    Button(action: {}) {
                        Text("+ Kayıt Ekle")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(ktPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(20)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 14)
            }
            .background(Color.white)
            .overlay(Rectangle().frame(height: 1).foregroundColor(Color.gray.opacity(0.1)), alignment: .bottom)
            
            ScrollView {
                VStack(spacing: 12) {
                    HStack {
                        Text("Çekten Kayıtları & Tedarikçiler")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color(.darkText))
                        Spacer()
                        Text("Toplam 4 Kayıt")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    
                    // Mock records
                    VStack(spacing: 10) {
                        CektenRow(title: "Marif Et - Açık Mal", amount: "120.000 TL", date: "12 Haz", isPaid: false)
                        CektenRow(title: "Asil Yem Ticaret", amount: "45.500 TL", date: "10 Haz", isPaid: true)
                        CektenRow(title: "Bereket Lojistik", amount: "18.250 TL", date: "05 Haz", isPaid: true)
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.bottom, 80)
            }
            .background(bgF8FAFC)
        }
    }
}

struct CektenRow: View {
    let title: String
    let amount: String
    let date: String
    let isPaid: Bool
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color(.darkText))
                Text(date)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.gray)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(amount)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(.darkText))
                Text(isPaid ? "Ödendi" : "Bekliyor")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(isPaid ? .green : .orange)
            }
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.04), radius: 2)
    }
}
