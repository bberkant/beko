import SwiftUI

struct DocumentsView: View {
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
                    Text("Belge & Evrak Arşivi")
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
                        DocumentItemCard(title: "Ticaret Sicil Gazetesi (2026)", category: "Şirket Resmi Belgeleri", date: "12.01.2026", fileType: "PDF", size: "1.2 MB")
                        DocumentItemCard(title: "Vergi Levhası (2026 Onaylı)", category: "Maliye Evrakları", date: "15.05.2026", fileType: "PDF", size: "450 KB")
                        DocumentItemCard(title: "İmza Sirküleri (Noter Tasdikli)", category: "Yetki Belgeleri", date: "02.02.2026", fileType: "PDF", size: "2.8 MB")
                        DocumentItemCard(title: "Suluova Mezbaha Ruhsat Belgesi", category: "Tarım ve Orman Bakanlığı", date: "10.06.2026", fileType: "PDF", size: "3.4 MB")
                        DocumentItemCard(title: "Kuveyt Türk Teminat Mektubu", category: "Banka Teminatları", date: "18.08.2026", fileType: "PDF", size: "980 KB")
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct DocumentItemCard: View {
    let title: String
    let category: String
    let date: String
    let fileType: String
    let size: String
    
    var body: some View {
        HStack {
            Image(systemName: "doc.fill")
                .font(.system(size: 24))
                .foregroundColor(Color(hex: "002D59"))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(hex: "1E293B"))
                Text("\(category) • \(date) • \(size)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
            
            Spacer()
            
            Image(systemName: "arrow.down.to.line.circle")
                .font(.system(size: 20))
                .foregroundColor(Color(hex: "008556"))
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}
