import SwiftUI
import UIKit

struct VehiclesView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(manager.vehicles) { vehicle in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            // Plate styled as a real Turkish plate
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
                                .foregroundColor(.gray)
                        }
                        
                        Divider()
                        
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("MARKA / MODEL")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text("\(vehicle.brand) \(vehicle.model)")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Color(.label))
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("AKTİF SÜRÜCÜ")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.gray)
                                Text(vehicle.activeDriver ?? "—")
                                    .font(.system(size: 12, weight: .semibold))
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
        .navigationBarTitle("Araç Yönetimi", displayMode: .inline)
    }
}



