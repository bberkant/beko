import SwiftUI

struct StocksView: View {
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
                    Text("Stok & Envanter Durumu")
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
                        // Summary Card
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Toplam Soğuk Hava Depo Stoku")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                Text("38.450 KG")
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundColor(Color(hex: "002D59"))
                            }
                            Spacer()
                            Image(systemName: "cube.box.fill")
                                .font(.system(size: 28))
                                .foregroundColor(Color(hex: "008556"))
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        StockItemCard(title: "Dana Karkas (1. Kalite)", location: "Suluova Mezbaha Depo-1", quantity: "18.250 KG", estimatedValue: "₺7.665.000,00", status: "Yeterli", statusColor: "008556")
                        StockItemCard(title: "Kuzu Karkas", location: "Suluova Mezbaha Depo-2", quantity: "6.800 KG", estimatedValue: "₺3.196.000,00", status: "Kritik", statusColor: "FF9800")
                        StockItemCard(title: "Kıyma & Parça Et (Vakumlu)", location: "Merzifon İşleme Tesisi", quantity: "8.400 KG", estimatedValue: "₺3.948.000,00", status: "Yeterli", statusColor: "008556")
                        StockItemCard(title: "Sakatat & Yan Ürünler", location: "Suluova Şoklama", quantity: "5.000 KG", estimatedValue: "₺1.250.000,00", status: "Normal", statusColor: "002D59")
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct StockItemCard: View {
    let title: String
    let location: String
    let quantity: String
    let estimatedValue: String
    let status: String
    let statusColor: String
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Text(location)
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
                Text(quantity)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(hex: "002D59"))
                Spacer()
                Text(estimatedValue)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color(hex: "008556"))
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
    }
}
