import SwiftUI

struct PosDifferencesView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var grossAmount: String = "100.000"
    @State private var commissionRate: String = "2.89"
    @State private var blockDays: String = "28"
    
    private var commissionCost: Double {
        let gross = Double(grossAmount.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")) ?? 0
        let rate = (Double(commissionRate) ?? 0) / 100.0
        return gross * rate
    }
    
    private var netAmount: Double {
        let gross = Double(grossAmount.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")) ?? 0
        return max(0, gross - commissionCost)
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
                    Text("POS Fark & Komisyon Hesaplama")
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
                        // Calculation Result Card
                        VStack(spacing: 12) {
                            Text("Hesaba Geçecek Net Tutar")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(Color(hex: "64748B"))
                            Text(String(format: "₺%.2f", netAmount))
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(Color(hex: "008556"))
                            
                            HStack(spacing: 24) {
                                VStack {
                                    Text("POS Komisyonu")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(Color(hex: "94A3B8"))
                                    Text(String(format: "₺%.2f", commissionCost))
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Color(hex: "EA3829"))
                                }
                                
                                VStack {
                                    Text("Bloke Süresi")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(Color(hex: "94A3B8"))
                                    Text("\(blockDays) Gün")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Color(hex: "002D59"))
                                }
                            }
                        }
                        .padding(20)
                        .frame(maxWidth: .infinity)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        // Inputs Card
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Hesaplama Parametreleri")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Brüt POS Çekim Tutarı (TL)")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                TextField("100.000", text: $grossAmount)
                                    .keyboardType(.numberPad)
                                    .padding(12)
                                    .background(Color(hex: "F8FAFC"))
                                    .cornerRadius(10)
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "CBD5E1"), lineWidth: 1))
                            }
                            
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Komisyon Oranı (%)")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(Color(hex: "64748B"))
                                    TextField("2.89", text: $commissionRate)
                                        .keyboardType(.decimalPad)
                                        .padding(12)
                                        .background(Color(hex: "F8FAFC"))
                                        .cornerRadius(10)
                                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "CBD5E1"), lineWidth: 1))
                                }
                                
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Bloke Gün Sayısı")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(Color(hex: "64748B"))
                                    TextField("28", text: $blockDays)
                                        .keyboardType(.numberPad)
                                        .padding(12)
                                        .background(Color(hex: "F8FAFC"))
                                        .cornerRadius(10)
                                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(hex: "CBD5E1"), lineWidth: 1))
                                }
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
