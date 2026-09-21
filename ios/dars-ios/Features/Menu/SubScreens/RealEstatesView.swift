import SwiftUI

public struct RealEstatesView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(manager.realEstates) { property in
                    VStack(alignment: .left, spacing: 8) {
                        HStack {
                            Text(property.title)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(Color(.label))
                                .lineLimit(1)
                            Spacer()
                            
                            Text(property.propertyType)
                                .font(.system(size: 10, weight: .semibold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.blue.opacity(0.05))
                                .foregroundColor(.blue)
                                .cornerRadius(6)
                        }
                        
                        Text("\(property.district) / \(property.city)")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                        
                        Divider()
                        
                        HStack {
                            Spacer()
                            VStack(alignment: .right, spacing: 4) {
                                Text("TAHMİNİ DEĞER")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text(formatCurrency(property.estimatedValue))
                                    .font(.system(size: 14, weight: .black))
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
        .navigationBarTitle("Gayrimenkul Listesi", displayMode: .inline)
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        return "₺" + NumberFormatter.localizedString(from: NSNumber(value: amount), number: .decimal)
    }
}

#if DEBUG
struct RealEstatesView_Previews: PreviewProvider {
    static var previews: some View {
        RealEstatesView()
    }
}
#endif
