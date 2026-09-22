import SwiftUI

struct PersonnelView: View {
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
                    Text("Personel & Bordro Yönetimi")
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
                        HStack(spacing: 16) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Toplam Personel")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                Text("24 Çalışan")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(Color(hex: "002D59"))
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("Aylık Bordro Yükü")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                Text("₺1.150.000,00")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(Color(hex: "EA3829"))
                            }
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        // Personnel Cards
                        PersonnelCard(name: "Ahmet Yılmaz", role: "Mezbaha Sorumlusu & Sevkiyat", department: "Üretim / Kesimhane", phone: "0532 111 2233", salary: "₺45.000,00")
                        PersonnelCard(name: "Murat Can", role: "Ağır Vasıta Şoförü", department: "Lojistik & Filo", phone: "0544 222 3344", salary: "₺38.000,00")
                        PersonnelCard(name: "Ayşe Kaya", role: "Ön Muhasebe & Finans", department: "Merkez Ofis", phone: "0505 333 4455", salary: "₺42.000,00")
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct PersonnelCard: View {
    let name: String
    let role: String
    let department: String
    let phone: String
    let salary: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Text("\(role) • \(department)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(Color(hex: "64748B"))
                }
                Spacer()
                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(Color(hex: "002D59").opacity(0.8))
            }
            
            Divider()
            
            HStack {
                Text(phone)
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundColor(Color(hex: "64748B"))
                Spacer()
                Text(salary)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(Color(hex: "002D59"))
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}
