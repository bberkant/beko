import SwiftUI

struct EInvoicesView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(manager.eInvoices) { invoice in
                    VStack(alignment: .left, spacing: 8) {
                        HStack {
                            Text(invoice.invoiceNo)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(Color(.label))
                            Spacer()
                            
                            Text(invoice.status)
                                .font(.system(size: 9, weight: .bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(invoice.status == "Onaylandı" ? Color.brandGreen.opacity(0.1) : Color.orange.opacity(0.1))
                                .foregroundColor(invoice.status == "Onaylandı" ? .brandGreen : .orange)
                                .cornerRadius(6)
                        }
                        
                        Text("Gönderen: \(invoice.senderName)")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.gray)
                        
                        Divider()
                        
                        HStack {
                            VStack(alignment: .left, spacing: 4) {
                                Text("FATURA TARİHİ")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text(formatDate(invoice.date))
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .right, spacing: 4) {
                                Text("FATURA TUTARI")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text(formatCurrency(invoice.amount))
                                    .font(.system(size: 13, weight: .black))
                                    .foregroundColor(.brandGreen)
                            }
                        }
                    }
                    .padding(16)
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color(.systemGray5), lineWidth: 1)
                    )
                    .padding(.horizontal, 24)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .background(Color(red: 0.96, green: 0.97, blue: 0.98))
        .navigationBarTitle("E-Faturalar", displayMode: .inline)
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
