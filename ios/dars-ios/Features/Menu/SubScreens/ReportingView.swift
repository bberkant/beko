import SwiftUI

struct ReportingView: View {
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
                    Text("Raporlama & Analiz")
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
                    VStack(spacing: 16) {
                        // Monthly Revenue & Profit Chart Card
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Aylık Ciro & Karlılık Trendi (2026)")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                            
                            HStack(alignment: .bottom, spacing: 16) {
                                BarChartColumn(month: "May", heightPct: 0.6, value: "₺12M")
                                BarChartColumn(month: "Haz", heightPct: 0.75, value: "₺15M")
                                BarChartColumn(month: "Tem", heightPct: 0.85, value: "₺18M")
                                BarChartColumn(month: "Ağu", heightPct: 0.95, value: "₺21M")
                                BarChartColumn(month: "Eyl", heightPct: 0.70, value: "₺14M", isCurrent: true)
                            }
                            .frame(height: 140)
                            .padding(.top, 8)
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        // KPI Cards Grid
                        HStack(spacing: 12) {
                            ReportKpiBox(title: "Yıllık Toplam Ciro", value: "₺148.5M", change: "+%18.4", isPositive: true)
                            ReportKpiBox(title: "Net Kar Marjı", value: "%14.2", change: "+%2.1", isPositive: true)
                        }
                        
                        // Downloadable PDF Reports
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Hazır Finansal Raporlar (PDF / Excel)")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                            
                            DownloadableReportRow(title: "Ağustos 2026 Gelir Tablosu & Bilanço", date: "01.09.2026", size: "2.4 MB")
                            DownloadableReportRow(title: "2026 3. Çeyrek Nakit Akış Projeksiyonu", date: "15.09.2026", size: "1.8 MB")
                            DownloadableReportRow(title: "Cari Yaşlandırma & Risk Raporu", date: "22.09.2026", size: "3.1 MB")
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct BarChartColumn: View {
    let month: String
    let heightPct: CGFloat
    let value: String
    var isCurrent: Bool = false
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(Color(hex: "64748B"))
            
            Spacer()
            
            RoundedRectangle(cornerRadius: 6)
                .fill(isCurrent ? Color(hex: "008556") : Color(hex: "002D59"))
                .frame(height: 100 * heightPct)
            
            Text(month)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(isCurrent ? Color(hex: "008556") : Color(hex: "64748B"))
        }
        .frame(maxWidth: .infinity)
    }
}

private struct ReportKpiBox: View {
    let title: String
    let value: String
    let change: String
    let isPositive: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color(hex: "64748B"))
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Color(hex: "1E293B"))
            Text(change)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(isPositive ? Color(hex: "008556") : Color(hex: "EA3829"))
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}

private struct DownloadableReportRow: View {
    let title: String
    let date: String
    let size: String
    
    var body: some View {
        HStack {
            Image(systemName: "doc.text.fill")
                .font(.system(size: 20))
                .foregroundColor(Color(hex: "002D59"))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(hex: "1E293B"))
                Text("\(date) • \(size)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
            
            Spacer()
            
            Image(systemName: "arrow.down.circle")
                .font(.system(size: 18))
                .foregroundColor(Color(hex: "008556"))
        }
        .padding(10)
        .background(Color(hex: "F8FAFC"))
        .cornerRadius(10)
    }
}
