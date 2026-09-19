import SwiftUI
import UIKit

struct CarisView: View {
    @ObservedObject var manager = SupabaseManager.shared
    @State private var searchText = ""
    @State private var selectedCari: CariSummary? = nil
    
    var body: some View {
        VStack(spacing: 0) {
            // Header Search Input
            VStack(spacing: 12) {
                HStack {
                    Text("Cari Hesaplar")
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(Color(.label))
                        .tracking(-0.5)
                    Spacer()
                }
                
                // Search Input Field (Kuveyt Turk style)
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Cari adı veya unvanı ara...", text: $searchText)
                        .font(.system(size: 13))
                }
                .padding(10)
                .background(Color(.systemGroupedBackground))
                .cornerRadius(12)
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 12)
            .background(Color(.systemBackground))
            
            // Cariler list
            ScrollView {
                VStack(spacing: 12) {
                    let list = manager.aggregatedCaris.filter {
                        searchText.isEmpty ? true : $0.supplier.localizedCaseInsensitiveContains(searchText)
                    }
                    
                    if list.isEmpty {
                        Text("Cari hesap bulunamadı.")
                            .font(.system(size: 13))
                            .foregroundColor(.gray)
                            .padding(.top, 40)
                    } else {
                        ForEach(list) { cari in
                            Button(action: { selectedCari = cari }, label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(cari.supplier)
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.brandGreen) // Green color style matching Kuveyt Turk
                                            .multilineTextAlignment(.leading)
                                        Text("Cari Hesap Bakiyesi")
                                            .font(.system(size: 10))
                                            .foregroundColor(.gray)
                                    }
                                    Spacer()
                                    VStack(alignment: .trailing, spacing: 4) {
                                        Text(formatCurrency(cari.kalanTutar))
                                            .font(.system(size: 14, weight: .black))
                                            .foregroundColor(Color(.label))
                                        
                                        Text(cari.kalanTutar > 0 ? "Tedarikçi Alacaklı" : "Ödeme Tamamlandı")
                                            .font(.system(size: 9, weight: .bold))
                                            .foregroundColor(cari.kalanTutar > 0 ? .red : .brandGreen)
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
                            })
                        }
                    }
                }
                .padding(.top, 12)
                .padding(.bottom, 90)
            }
            .background(Color(red: 0.96, green: 0.97, blue: 0.98))
        }
        .sheet(item: $selectedCari) { cari in
            CariDetailSheet(cari: cari)
        }
    }
    
    // UI Helpers
    private func formatCurrency(_ amount: Double) -> String {
        return NumberFormatter.localizedString(from: NSNumber(value: amount), number: .decimal) + " TL"
    }
}

// Detail Popup Bottom Sheet for Cari Account
struct CariDetailSheet: View {
    let cari: CariSummary
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        VStack(spacing: 24) {
            // Drag Indicator
            Capsule()
                .fill(Color(.systemGray4))
                .frame(width: 48, height: 4)
                .padding(.top, 10)
            
            // Header Title
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("TEDARİKÇİ CARİ HESAP")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.gray)
                        .tracking(1.5)
                    Text(cari.supplier)
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(Color(.label))
                }
                Spacer()
                Button(action: { presentationMode.wrappedValue.dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.gray)
                        .frame(width: 32, height: 32)
                        .background(Color(.systemGray6))
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 24)
            
            // Financial cards grid
            GridStatsView(cari: cari)
            
            // Trends mock bar chart (Exact Kuveyt Turk style Gold/Green layout)
            VStack(alignment: .leading, spacing: 12) {
                Text("Kesim & Bakiye Eğilimi")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.gray)
                    .tracking(1)
                    .padding(.horizontal, 24)
                
                VStack(spacing: 12) {
                    HStack(alignment: .bottom, spacing: 20) {
                        ChartBar(label: "Haz", value1: 40, value2: 20)
                        ChartBar(label: "Tem", value1: 60, value2: 40)
                        ChartBar(label: "Ağu", value1: 85, value2: 75)
                    }
                    .frame(height: 120)
                    .padding(.horizontal, 16)
                    
                    // Legends
                    HStack(spacing: 16) {
                        HStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color.brandGreen.opacity(0.4))
                                .frame(width: 10, height: 10)
                            Text("Toplam Kesim")
                                .font(.system(size: 9))
                                .foregroundColor(.gray)
                        }
                        HStack(spacing: 4) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color.brandGreen)
                                .frame(width: 10, height: 10)
                            Text("Kalan Borç")
                                .font(.system(size: 9))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.top, 8)
                }
                .padding(16)
                .background(Color(red: 0.11, green: 0.15, blue: 0.22))
                .cornerRadius(20)
                .padding(.horizontal, 24)
            }
            
            // Action button links
            HStack(spacing: 12) {
                Button(action: {}) {
                    Text("Mutabakat Mektubu (PDF)")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.brandGreen)
                        .cornerRadius(12)
                }
                
                Button(action: {}) {
                    Image(systemName: "phone.fill")
                        .foregroundColor(.brandGreen)
                        .font(.system(size: 16))
                        .frame(width: 48, height: 48)
                        .background(Color.brandGreen.opacity(0.1))
                        .cornerRadius(12)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 20)
        }
    }
}

// Financial widgets helper
struct GridStatsView: View {
    let cari: CariSummary
    
    var body: some View {
        HStack(spacing: 10) {
            StatBox(title: "Toplam Kesim", val: cari.totalAmount, bg: .brandGreen.opacity(0.03), fg: .brandGreen)
            StatBox(title: "Ödenen", val: cari.pesinat, bg: .orange.opacity(0.03), fg: .orange)
            StatBox(title: "Bakiye", val: cari.kalanTutar, bg: .red.opacity(0.03), fg: .red)
        }
        .padding(.horizontal, 24)
    }
}

struct StatBox: View {
    let title: String
    let val: Double
    let bg: Color
    let fg: Color
    
    var body: some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.system(size: 8, weight: .bold))
                .foregroundColor(fg)
            Text(formatCurrency(val))
                .font(.system(size: 11, weight: .black))
                .foregroundColor(fg)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(bg)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(fg.opacity(0.1), lineWidth: 1)
        )
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        return NumberFormatter.localizedString(from: NSNumber(value: amount), number: .decimal) + " TL"
    }
}

// Custom bar drawing helper
struct ChartBar: View {
    let label: String
    let value1: CGFloat // Percentage height
    let value2: CGFloat // Percentage height
    
    var body: some View {
        VStack(spacing: 8) {
            HStack(alignment: .bottom, spacing: 4) {
                // Bar 1 (Total Slaughter)
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.brandGreen.opacity(0.4))
                    .frame(width: 14, height: value1)
                
                // Bar 2 (Remaining Debt)
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.brandGreen)
                    .frame(width: 14, height: value2)
            }
            Text(label)
                .font(.system(size: 8, weight: .bold))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
    }
}

struct CarisView_Previews: PreviewProvider {
    static var previews: some View {
        CarisView()
    }
}





