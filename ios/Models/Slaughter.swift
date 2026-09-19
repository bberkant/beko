import Foundation

public struct SlaughterRecord: Identifiable, Codable, Hashable {
    public let id: String
    public let slaughterDate: String?
    public let supplier: String?
    public let carcassWeight: Double?
    public let animalType: String?
    public let pricePerKg: Double?
    public let totalAmount: Double?
    public let organizationId: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case slaughterDate = "slaughter_date"
        case supplier
        case carcassWeight = "carcass_weight"
        case animalType = "animal_type"
        case pricePerKg = "price_per_kg"
        case totalAmount = "total_amount"
        case organizationId = "organization_id"
    }
    
    public var formattedWeight: String {
        guard let w = carcassWeight else { return "0 KG" }
        return "\(Formatters.number(w, decimals: 1)) KG"
    }
    
    public var formattedPrice: String {
        guard let p = pricePerKg else { return "0 TL" }
        return "\(Formatters.currency(p)) / KG"
    }
    
    public var formattedTotal: String {
        if let t = totalAmount {
            return Formatters.currency(t)
        }
        let w = carcassWeight ?? 0
        let p = pricePerKg ?? 0
        return Formatters.currency(w * p)
    }
}

public struct CektenPayment: Identifiable, Codable, Hashable {
    public let id: String
    public let supplierName: String
    public let totalAmount: Double
    public let paidAmount: Double
    public let remainingAmount: Double
    public let date: String
    public let status: String // "acik_mal", "cek", "kismen_odendi"
    
    enum CodingKeys: String, CodingKey {
        case id
        case supplierName = "supplier_name"
        case totalAmount = "total_amount"
        case paidAmount = "paid_amount"
        case remainingAmount = "remaining_amount"
        case date
        case status
    }
}
