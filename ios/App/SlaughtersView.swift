import SwiftUI

struct SlaughtersView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(manager.records) { record in
                    VStack(alignment: .left, spacing: 8) {
                        HStack {
                            Text(record.supplier)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.brandGreen)
                            Spacer()
                            Text(formatDate(record.slaughterDate))
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                        }
                        
                        Divider()
                        
                        HStack {
                            VStack(alignment: .left, spacing: 4) {
                                Text("CİNSİ / ADET")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text("\(record.animalType) • \(record.headCount) Baş")
                                    .font(.system(size: 12, weight: .bold))
                            }
                            Spacer()
                            VStack(alignment: .center, spacing: 4) {
                                Text("AĞIRLIK")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text("\(formatNumber(record.carcassWeight)) kg")
                                    .font(.system(size: 12, weight: .bold))
                            }
                            Spacer()
                            VStack(alignment: .right, spacing: 4) {
                                Text("TOPLAM TUTAR")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text(formatCurrency(record.totalAmount))
                                    .font(.system(size: 12, weight: .black))
                            }
                        }
                        
                        HStack {
                            Text("Kalan Bakiye:")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                            Spacer()
                            Text(formatCurrency(record.kalanTutar))
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(record.kalanTutar > 0 ? .red : .brandGreen)
                        }
                        .padding(.top, 4)
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
        .navigationBarTitle("Kesim Listesi", displayMode: .inline)
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
