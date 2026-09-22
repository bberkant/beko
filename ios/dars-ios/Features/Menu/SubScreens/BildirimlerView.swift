import SwiftUI

struct BildirimlerView: View {
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
                    Text("Bildirimler & Uyarılar")
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
                        NotificationCard(title: "Çek Vadesi Hatırlatması", desc: "480.000 TL tutarındaki tedarikçi çekinin vadesine 2 gün kaldı.", time: "10 dk önce", icon: "exclamationmark.circle.fill", iconColor: "FF9800", isUnread: true)
                        NotificationCard(title: "Banka Tahsilatı Başarılı", desc: "Eti Maden İşletmeleri tarafından 350.000 TL Kuveyt Türk hesabınıza aktarıldı.", time: "2 saat önce", icon: "checkmark.circle.fill", iconColor: "008556", isUnread: true)
                        NotificationCard(title: "Yeni E-Fatura Geldi", desc: "Aksa Gaz Dağıtım firmasından 130,00 TL tutarında e-fatura sisteme düştü.", time: "5 saat önce", icon: "doc.text.fill", iconColor: "002D59", isUnread: false)
                        NotificationCard(title: "Kredi Kartı Son Ödeme", desc: "Sağlam Business kartınızın asgari ödeme tarihi 28 Eylül'dür.", time: "1 gün önce", icon: "creditcard.fill", iconColor: "EA3829", isUnread: false)
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct NotificationCard: View {
    let title: String
    let desc: String
    let time: String
    let icon: String
    let iconColor: String
    let isUnread: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 22))
                .foregroundColor(Color(hex: iconColor))
                .padding(.top, 2)
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(title)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Spacer()
                    Text(time)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: "94A3B8"))
                }
                
                Text(desc)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color(hex: "64748B"))
                    .lineLimit(2)
            }
        }
        .padding(14)
        .background(isUnread ? Color(hex: "F0F4F8") : Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}
