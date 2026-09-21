import SwiftUI

public struct SlaughtersView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(manager.records) { record in
                    slaughterCard(for: record)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .background(Color.ktPageBackground)
        .navigationBarTitle("Kesim Listesi", displayMode: .inline)
    }
    
    @ViewBuilder
    private func slaughterCard(for record: SlaughterRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(record.supplier)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.ktPrimary)
                Spacer()
                Text(formatDate(record.slaughterDate))
                    .font(.system(size: 11))
                    .foregroundColor(.ktTextMuted)
            }
            
            Divider()
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("CİNSİ / ADET")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text("\(record.animalType) • \(record.headCount) Baş")
                        .font(.system(size: 12, weight: .bold))
                }
                Spacer()
                VStack(alignment: .center, spacing: 4) {
                    Text("AĞIRLIK")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text("\(formatNumber(record.carcassWeight)) kg")
                        .font(.system(size: 12, weight: .bold))
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("TOPLAM TUTAR")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text(formatCurrency(record.totalAmount))
                        .font(.system(size: 12, weight: .black))
                }
            }
            
            HStack {
                Text("Kalan Bakiye:")
                    .font(.system(size: 10))
                    .foregroundColor(.ktTextMuted)
                Spacer()
                Text(formatCurrency(record.kalanTutar))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(record.kalanTutar > 0 ? .ktCoral : .ktSuccess)
            }
            .padding(.top, 4)
        }
        .padding(16)
        .background(Color.ktCardSurface)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.ktCardBorder, lineWidth: 1)
        )
        .padding(.horizontal, 24)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        return "₺" + NumberFormatter.localizedString(from: NSNumber(value: amount), number: .decimal)
    }
    
    private func formatNumber(_ num: Double) -> String {
        return NumberFormatter.localizedString(from: NSNumber(value: num), number: .decimal)
    }
    
    private func formatDate(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        return "\(parts[2]).\(parts[1]).\(parts[0])"
    }
}

#if DEBUG
struct SlaughtersView_Previews: PreviewProvider {
    static var previews: some View {
        SlaughtersView()
    }
}
#endif
