import SwiftUI

public struct EInvoicesView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(manager.eInvoices) { invoice in
                    invoiceCard(for: invoice)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .background(Color.ktPageBackground)
        .navigationBarTitle("E-Faturalar", displayMode: .inline)
    }
    
    @ViewBuilder
    private func invoiceCard(for invoice: EInvoiceRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(invoice.invoiceNo)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.ktTextHeading)
                Spacer()
                
                Text(invoice.status)
                    .font(.system(size: 9, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(invoice.status == "Onaylandı" ? Color.ktSuccessLight : Color.ktOrangeLight)
                    .foregroundColor(invoice.status == "Onaylandı" ? .ktSuccessDark : .ktOrange)
                    .cornerRadius(6)
            }
            
            Text("Gönderen: \(invoice.senderName)")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.ktTextMuted)
            
            Divider()
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("FATURA TARİHİ")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text(formatDate(invoice.date))
                        .font(.system(size: 12, weight: .semibold))
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("FATURA TUTARI")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text(formatCurrency(invoice.amount))
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
struct EInvoicesView_Previews: PreviewProvider {
    static var previews: some View {
        EInvoicesView()
    }
}
#endif
