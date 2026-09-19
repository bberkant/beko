import Foundation

public struct VehicleDescriptionMetadata: Codable {
    public let insuranceCompany: String?
    public let kaskoCompany: String?
    public let kaskoStartDate: String?
    public let dainiMurtehin: String?
}

public struct Vehicle: Identifiable, Codable, Hashable {
    public let id: String
    public let plate: String
    public let brand: String?
    public let model: String?
    public let modelYear: Int?
    public let vehicleType: String?
    public let currentKm: Double?
    public let inspectionDate: String?
    public let insuranceDate: String?
    public let cascoDate: String?
    public let assignedTo: String?
    public let department: String?
    public let purchasePrice: Double?
    public let description: String?
    public let organizationId: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case plate
        case brand
        case model
        case modelYear = "model_year"
        case vehicleType = "vehicle_type"
        case currentKm = "current_km"
        case inspectionDate = "inspection_date"
        case insuranceDate = "insurance_date"
        case cascoDate = "casco_date"
        case assignedTo = "assigned_to"
        case department
        case purchasePrice = "purchase_price"
        case description
        case organizationId = "organization_id"
    }
    
    public var parsedMetadata: VehicleDescriptionMetadata? {
        guard let desc = description, desc.starts(with: "{") else { return nil }
        guard let data = desc.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(VehicleDescriptionMetadata.self, from: data)
    }
    
    public var displayTitle: String {
        let b = brand ?? "Araç"
        let m = (model != nil && model != "Standart") ? model! : ""
        let y = modelYear != nil ? "(\(modelYear!))" : ""
        return "\(b) \(m) \(y)".trimmingCharacters(in: .whitespaces)
    }
    
    public var inspectionDaysRemaining: Int {
        guard let date = inspectionDate else { return 999 }
        return Formatters.daysRemaining(from: date)
    }
    
    public var isInspectionCritical: Bool {
        return inspectionDaysRemaining <= 15
    }
    
    public var formattedKm: String {
        guard let km = currentKm else { return "-" }
        return "\(Formatters.number(km)) KM"
    }
    
    public var insuranceCompany: String {
        return parsedMetadata?.insuranceCompany ?? "Mert Sigorta"
    }
    
    public var kaskoCompany: String {
        return parsedMetadata?.kaskoCompany ?? "Güneş Sigorta"
    }
    
    public var dainiMurtehin: String? {
        return parsedMetadata?.dainiMurtehin
    }
}
