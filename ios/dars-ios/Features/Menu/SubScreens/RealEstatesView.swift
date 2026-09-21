import SwiftUI

public struct RealEstatesView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(manager.realEstates) { property in
                    propertyCard(for: property)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .background(Color.ktPageBackground)
        .navigationBarTitle("Gayrimenkul Listesi", displayMode: .inline)
    }
    
    @ViewBuilder
    private func propertyCard(for property: RealEstateRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(property.title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.ktTextHeading)
                    .lineLimit(1)
                Spacer()
                
                Text(property.propertyType)
                    .font(.system(size: 10, weight: .semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.ktPrimarySoft)
                    .foregroundColor(.ktPrimary)
                    .cornerRadius(6)
            }
            
            Text("\(property.district) / \(property.city)")
                .font(.system(size: 11))
                .foregroundColor(.ktTextMuted)
            
            Divider()
            
            HStack {
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("TAHMİNİ DEĞER")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text(formatCurrency(property.estimatedValue))
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.ktPrimary)
                }
            }
        }
        .padding(16)
        .background(Color.ktCardSurface)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.ktCardBorder, lineWidth: 1)
        )
        .padding(.horizontal, 24)
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
