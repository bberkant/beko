import Foundation
import SwiftUI

@MainActor
public class VehiclesViewModel: ObservableObject {
    @Published public var vehicles: [Vehicle] = []
    @Published public var isLoading: Bool = false
    @Published public var searchQuery: String = ""
    @Published public var selectedFilter: VehicleFilter = .all
    
    public enum VehicleFilter: String, CaseIterable {
        case all = "Tümü (63)"
        case criticalInspection = "Kritik Muayene"
        case active = "Aktif Filo"
    }
    
    public init() {
        loadMockAndFetch()
    }
    
    public var filteredVehicles: [Vehicle] {
        vehicles.filter { v in
            if selectedFilter == .criticalInspection && !v.isInspectionCritical { return false }
            
            if !searchQuery.isEmpty {
                let q = searchQuery.lowercased()
                let matchPlate = v.plate.lowercased().contains(q)
                let matchBrand = (v.brand ?? "").lowercased().contains(q)
                let matchDriver = (v.assignedTo ?? "").lowercased().contains(q)
                if !matchPlate && !matchBrand && !matchDriver { return false }
            }
            return true
        }
        .sorted { $0.inspectionDaysRemaining < $1.inspectionDaysRemaining }
    }
    
    public var criticalCount: Int {
        vehicles.filter { $0.isInspectionCritical }.count
    }
    
    public func fetchVehicles() async {
        isLoading = true
        do {
            let fetched: [Vehicle] = try await SupabaseService.shared.fetch(
                table: "vehicles",
                orderBy: "inspection_date",
                ascending: true
            )
            if !fetched.isEmpty {
                self.vehicles = fetched
            }
        } catch {
            print("Error fetching vehicles: \(error)")
        }
        isLoading = false
    }
    
    private func loadMockAndFetch() {
        self.vehicles = [
            Vehicle(id: "1", plate: "34 KUV 10", brand: "Mercedes-Benz", model: "Actros 1845", modelYear: 2022, vehicleType: "Çekici", currentKm: 142500, inspectionDate: "2026-09-08", insuranceDate: "2026-11-20", cascoDate: "2026-11-20", assignedTo: "Ahmet Yılmaz", department: "Lojistik", purchasePrice: 3200000, description: "{\"insuranceCompany\":\"Mert Sigorta\",\"kaskoCompany\":\"Güneş Sigorta\",\"dainiMurtehin\":\"Kuveyt Türk\"}", organizationId: nil),
            Vehicle(id: "2", plate: "06 MAR 88", brand: "Ford", model: "Transit 350L", modelYear: 2023, vehicleType: "Kamyonet", currentKm: 48900, inspectionDate: "2026-09-12", insuranceDate: "2027-02-14", cascoDate: "2027-02-14", assignedTo: "Mehmet Demir", department: "Sevkiyat", purchasePrice: 1150000, description: "{\"insuranceCompany\":\"Anadolu Sigorta\",\"kaskoCompany\":\"Allianz\",\"dainiMurtehin\":\"Albaraka\"}", organizationId: nil),
            Vehicle(id: "3", plate: "34 ET 2024", brand: "Scania", model: "R 500", modelYear: 2021, vehicleType: "Çekici", currentKm: 218000, inspectionDate: "2026-09-28", insuranceDate: "2026-12-05", cascoDate: "2026-12-05", assignedTo: "Ali Kaya", department: "Lojistik", purchasePrice: 3800000, description: "{\"insuranceCompany\":\"Mert Sigorta\",\"kaskoCompany\":\"Axa\",\"dainiMurtehin\":\"Vakıf Katılım\"}", organizationId: nil),
            Vehicle(id: "4", plate: "34 MRF 44", brand: "Isuzu", model: "NPR 3D Frigo", modelYear: 2020, vehicleType: "Kamyon", currentKm: 184200, inspectionDate: "2026-10-15", insuranceDate: "2026-10-10", cascoDate: "2026-10-10", assignedTo: "Hasan Çelik", department: "Soğuk Zincir", purchasePrice: 1650000, description: "{\"insuranceCompany\":\"Sompo\",\"kaskoCompany\":\"Güneş Sigorta\",\"dainiMurtehin\":\"Ziraat Bankası\"}", organizationId: nil),
            Vehicle(id: "5", plate: "06 MAR 99", brand: "Volkswagen", model: "Crafter Frigo", modelYear: 2022, vehicleType: "Panelvan", currentKm: 89300, inspectionDate: "2026-11-04", insuranceDate: "2027-03-01", cascoDate: "2027-03-01", assignedTo: "Murat Şen", department: "Şube Dağıtım", purchasePrice: 1400000, description: "{\"insuranceCompany\":\"Mert Sigorta\",\"kaskoCompany\":\"Allianz\",\"dainiMurtehin\":\"Garanti BBVA\"}", organizationId: nil)
        ]
        
        Task {
            await fetchVehicles()
        }
    }
}
