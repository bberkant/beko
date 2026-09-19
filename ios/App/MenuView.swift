import SwiftUI

struct MenuView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Button(action: {}) {
                    Text("Çıkış")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.red)
                }
                Spacer()
                Text("Menü")
                    .font(.system(size: 16, weight: .bold))
                Spacer()
                HStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    Text("Düzenle")
                        .font(.system(size: 14))
                        .foregroundColor(.brandGreen)
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 16)
            .background(Color(.systemBackground))
            
            // List of options matching Kuveyt Turk Menu and site modules
            ScrollView {
                VStack(spacing: 12) {
                    
                    // Group 1: Kesim ve Finans
                    VStack(spacing: 1) {
                        NavigationLink(destination: SlaughtersView()) {
                            MenuRow(icon: "scissors", text: "Kesim Listesi")
                        }
                        NavigationLink(destination: ChecksView().navigationBarBackButtonHidden(false)) {
                            MenuRow(icon: "doc.text.fill", text: "Çek & Senet İşlemleri")
                        }
                        NavigationLink(destination: CarisView().navigationBarBackButtonHidden(false)) {
                            MenuRow(icon: "person.2.fill", text: "Cari Hesap Listesi")
                        }
                        NavigationLink(destination: EInvoicesView()) {
                            MenuRow(icon: "envelope.fill", text: "E-Faturalar")
                        }
                    }
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    
                    // Group 2: Operasyon ve Varlıklar
                    VStack(spacing: 1) {
                        NavigationLink(destination: VehiclesView()) {
                            MenuRow(icon: "car.fill", text: "Araç Yönetimi")
                        }
                        NavigationLink(destination: TendersView()) {
                            MenuRow(icon: "briefcase.fill", text: "İhaleler")
                        }
                        NavigationLink(destination: RealEstatesView()) {
                            MenuRow(icon: "building.2.fill", text: "Gayrimenkul Listesi")
                        }
                        NavigationLink(destination: LegalCasesView()) {
                            MenuRow(icon: "gavel.fill", text: "Hukuki İşlemler")
                        }
                    }
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    
                    // Group 3: Sistem
                    VStack(spacing: 1) {
                        NavigationLink(destination: SettingsView()) {
                            MenuRow(icon: "gearshape.fill", text: "Ayarlar")
                        }
                    }
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)
                .padding(.bottom, 90)
            }
            .background(Color(red: 0.96, green: 0.97, blue: 0.98))
        }
    }
}

struct MenuRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.brandGreen)
                .frame(width: 24, height: 24)
            Text(text)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(.label))
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 20)
        .background(Color(.systemBackground))
    }
}
