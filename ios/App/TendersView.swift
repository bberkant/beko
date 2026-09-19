import SwiftUI
import UIKit

struct TendersView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(manager.tenders) { tender in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(tender.name)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(Color(.label))
                                .lineLimit(1)
                            Spacer()
                            
                            // Status badge
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
                            .foregroundColor(.gray)
                        
                        Divider()
                        
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("İHALE TARİHİ")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text(formatDate(tender.date))
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("TUTAR")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text(formatCurrency(tender.amount))
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
        .navigationBarTitle("İhaleler", displayMode: .inline)
    }
    
    private func statusBg(_ status: String) -> Color {
        switch status {
        case "Kazanıldı": return .brandGreen.opacity(0.1)
        case "Beklemede": return .orange.opacity(0.1)
        default: return .red.opacity(0.1)
        }
    }
    
    private func statusFg(_ status: String) -> Color {
        switch status {
        case "Kazanıldı": return .brandGreen
        case "Beklemede": return .orange
        default: return .red
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



