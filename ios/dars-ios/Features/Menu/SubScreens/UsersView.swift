import SwiftUI

struct UsersView: View {
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
                    Text("Kullanıcı & Yetki Yönetimi")
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
                    VStack(spacing: 12) {
                        UserAuthCard(name: "Berkant Kaplan", email: "berkantkaplan@gmail.com", role: "Sistem Yöneticisi (Admin)", permissions: "Tüm Modüllere Tam Erişim", isActive: true)
                        UserAuthCard(name: "Cem Kaplan", email: "cemkaplan@amasyaetas.com", role: "Yönetici (Finans / Operasyon)", permissions: "Finans, Çek, Kasa, Raporlama", isActive: true)
                        UserAuthCard(name: "Ahmet Yılmaz", email: "ahmet@amasyaetas.com", role: "Saha & Üretim Sorumlusu", permissions: "Kesim Listesi, Araçlar, Stok", isActive: true)
                        UserAuthCard(name: "Ayşe Kaya", email: "ayse@amasyaetas.com", role: "Ön Muhasebe Uzmanı", permissions: "E-Faturalar, Cariler, Ekstre", isActive: true)
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct UserAuthCard: View {
    let name: String
    let email: String
    let role: String
    let permissions: String
    let isActive: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Text(email)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(Color(hex: "64748B"))
                }
                Spacer()
                Text(isActive ? "Aktif" : "Pasif")
                    .font(.system(size: 11, weight: .semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(hex: isActive ? "008556" : "64748B").opacity(0.12))
                    .foregroundColor(Color(hex: isActive ? "008556" : "64748B"))
                    .cornerRadius(8)
            }
            
            Divider()
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Rol: \(role)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Color(hex: "002D59"))
                Text("Yetki Kapsamı: \(permissions)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}
