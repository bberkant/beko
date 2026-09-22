import SwiftUI

struct CheckValuationView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var nominalAmount: String = "500.000"
    @State private var dayCount: String = "45"
    @State private var annualRate: String = "48"
    @State private var commissionRate: String = "1.5"
    
    private var calculatedNet: Double {
        let amount = Double(nominalAmount.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")) ?? 0
        let days = Double(dayCount) ?? 0
        let rate = (Double(annualRate) ?? 0) / 100.0
        let comRate = (Double(commissionRate) ?? 0) / 100.0
        
        let interestCost = amount * (rate / 360.0) * days
        let commissionCost = amount * comRate
        return max(0, amount - interestCost - commissionCost)
    }
    
    private var totalDeduction: Double {
        let amount = Double(nominalAmount.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")) ?? 0
        return max(0, amount - calculatedNet)
    }
    
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
                    Text("Çek Vade & İskonto Simülatörü")
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
                        // Result Card
                        VStack(spacing: 12) {
                            Text("Net Ele Geçecek Tutar")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(Color(hex: "64748B"))
                            Text(String(format: "₺%.2f", calculatedNet))
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(Color(hex: "008556"))
                            
                            HStack(spacing: 24) {
                                VStack {
                                    Text("Toplam Kesinti")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(Color(hex: "94A3B8"))
                                    Text(String(format: "₺%.2f", totalDeduction))
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Color(hex: "EA3829"))
                                }
                                
                                VStack {
                                    Text("Günlük Maliyet")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(Color(hex: "94A3B8"))
                                    Text(String(format: "₺%.2f", totalDeduction / max(1, Double(dayCount) ?? 1)))
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Color(hex: "FF9800"))
                                }
                            }
                        }
                        .padding(20)
                        .frame(maxWidth: .infinity)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        // Input Controls Card
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Hesaplama Parametreleri")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Çek Nominal Tutarı (TL)")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                TextField("500.000", text: $nominalAmount)
                                    .keyboardType(.numberPad)
                                    .padding(12)
                                    .background(Color(hex: "F8FAFC"))
                                    .cornerRadius(10)
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "CBD5E1"), lineWidth: 1))
                            }
                            
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Vadeye Kalan Gün")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(Color(hex: "64748B"))
                                    TextField("45", text: $dayCount)
                                        .keyboardType(.numberPad)
                                        .padding(12)
                                        .background(Color(hex: "F8FAFC"))
                                        .cornerRadius(10)
                                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "CBD5E1"), lineWidth: 1))
                                }
                                
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Yıllık İskonto Oranı (%)")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(Color(hex: "64748B"))
                                    TextField("48", text: $annualRate)
                                        .keyboardType(.decimalPad)
                                        .padding(12)
                                        .background(Color(hex: "F8FAFC"))
                                        .cornerRadius(10)
                                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "CBD5E1"), lineWidth: 1))
                                }
                            }
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Banka Komisyon Oranı (%)")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                TextField("1.5", text: $commissionRate)
                                    .keyboardType(.decimalPad)
                                    .padding(12)
                                    .background(Color(hex: "F8FAFC"))
                                    .cornerRadius(10)
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "CBD5E1"), lineWidth: 1))
                            }
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
