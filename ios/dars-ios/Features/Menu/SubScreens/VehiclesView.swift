import SwiftUI

public struct VehiclesView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(manager.vehicles) { vehicle in
                    vehicleCard(for: vehicle)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .background(Color.ktPageBackground)
        .navigationBarTitle("Araç Yönetimi", displayMode: .inline)
    }
    
    @ViewBuilder
    private func vehicleCard(for vehicle: VehicleRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(vehicle.plate)
                    .font(.system(size: 13, weight: .bold))
                    .padding(.vertical, 4)
                    .padding(.horizontal, 8)
                    .background(Color.blue.opacity(0.1))
                    .foregroundColor(.blue)
                    .cornerRadius(6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color.blue.opacity(0.3), lineWidth: 1.5)
                    )
                
                Spacer()
                
                Text("\(String(vehicle.year)) Model")
                    .font(.system(size: 11))
                    .foregroundColor(.ktTextMuted)
            }
            
            Divider()
            
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("MARKA / MODEL")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text("\(vehicle.brand) \(vehicle.model)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("AKTİF SÜRÜCÜ")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.ktTextMuted)
                    Text(vehicle.activeDriver ?? "—")
                        .font(.system(size: 12, weight: .semibold))
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
}

#if DEBUG
struct VehiclesView_Previews: PreviewProvider {
    static var previews: some View {
        VehiclesView()
    }
}
#endif
