import SwiftUI

public struct TendersView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(manager.tenders) { tender in
                    tenderCard(for: tender)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .background(Color.ktPageBackground)
        .navigationBarTitle("İhaleler", displayMode: .inline)
    }
    
    @ViewBuilder
    private func tenderCard(for tender: TenderRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(tender.name)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.ktTextHeading)
                    .lineLimit(1)
                Spacer()
                
                Text(tender.status)
                    .font(.system(size: 9, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusBg(tender.status))
                    .foregroundColor(statusFg(tender.status))
                    .cornerRadius(6)
            }
            
            Text("No: \(tender.tenderNo)")
                .font(.system(size: 10))
                .foregroundColor(.ktTextMuted)
            
            Divider()
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("İHALE TARİHİ")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text(formatDate(tender.date))
                        .font(.system(size: 12, weight: .semibold))
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("TUTAR")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text(formatCurrency(tender.amount))
                        .font(.system(size: 13, weight: .black))
                        .foregroundColor(.ktPrimary)
                }
            }
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
    
    private func statusBg(_ status: String) -> Color {
        switch status {
        case "Kazanıldı": return Color.ktSuccessLight
        case "Beklemede": return Color.ktOrangeLight
        default: return Color.ktCoralLight
        }
    }
    
    private func statusFg(_ status: String) -> Color {
        switch status {
        case "Kazanıldı": return Color.ktSuccessDark
        case "Beklemede": return Color.ktOrange
        default: return Color.ktCoral
        }
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        return "₺" + NumberFormatter.localizedString(from: NSNumber(value: amount), number: .decimal)
    }
    
    private func formatDate(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        return "\(parts[2]).\(parts[1]).\(parts[0])"
    }
}

#if DEBUG
struct TendersView_Previews: PreviewProvider {
    static var previews: some View {
        TendersView()
    }
}
#endif
