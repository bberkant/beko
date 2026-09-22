import SwiftUI

struct BranchesView: View {
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
                    Text("Şube & Satış Noktaları")
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
                        BranchCard(branchName: "Merzifon Merkez Perakende Satış", manager: "Kemal Demir", phone: "0358 513 1200", dailyRevenue: "₺84.500,00", monthlyRevenue: "₺1.850.000,00", status: "Açık", statusColor: "008556")
                        BranchCard(branchName: "Suluova Mezbaha Yanı Toptan Şube", manager: "Osman Çetin", phone: "0358 417 8899", dailyRevenue: "₺210.000,00", monthlyRevenue: "₺4.620.000,00", status: "Açık", statusColor: "008556")
                        BranchCard(branchName: "Amasya Merkez Kasap & Şarküteri", manager: "Ali Vural", phone: "0358 218 4567", dailyRevenue: "₺62.400,00", monthlyRevenue: "₺1.370.000,00", status: "Açık", statusColor: "008556")
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct BranchCard: View {
    let branchName: String
    let manager: String
    let phone: String
    let dailyRevenue: String
    let monthlyRevenue: String
    let status: String
    let statusColor: String
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(branchName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Text("Sorumlu: \(manager) • \(phone)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(Color(hex: "94A3B8"))
                }
                Spacer()
                Text(status)
                    .font(.system(size: 11, weight: .semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(hex: statusColor).opacity(0.12))
                    .foregroundColor(Color(hex: statusColor))
                    .cornerRadius(8)
            }
            
            Divider()
            
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Günlük Ciro")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: "64748B"))
                    Text(dailyRevenue)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "008556"))
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Aylık Ciro")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: "64748B"))
                    Text(monthlyRevenue)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "002D59"))
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}
