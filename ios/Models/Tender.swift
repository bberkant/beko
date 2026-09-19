import Foundation

public struct Tender: Identifiable, Codable, Hashable {
    public let id: String
    public let registrationNo: String? // İhale Kayıt No (e.g. 2026/123456)
    public let administration: String? // İdare Adı
    public let workName: String? // İşin Adı
    public let tenderDate: String?
    public let tenderType: String?
    public let status: String?
    public let approximateCost: Double?
    public let offerAmount: Double?
    public let guaranteeAmount: Double?
    public let guaranteeExpiryDate: String?
    public let organizationId: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case registrationNo = "registration_no"
        case administration
        case workName = "work_name"
        case tenderDate = "tender_date"
        case tenderType = "tender_type"
        case status
        case approximateCost = "approximate_cost"
        case offerAmount = "offer_amount"
        case guaranteeAmount = "guarantee_amount"
        case guaranteeExpiryDate = "guarantee_expiry_date"
        case organizationId = "organization_id"
    }
    
    public var formattedOffer: String {
        return Formatters.currency(offerAmount ?? 0)
    }
    
    public var formattedGuarantee: String {
        return Formatters.currency(guaranteeAmount ?? 0)
    }
}

public struct RealEstate: Identifiable, Codable, Hashable {
    public let id: String
    public let title: String
    public let estateType: String? // Arsa, Dükkan, Fabrika, vb.
    public let city: String?
    public let district: String?
    public let neighborhood: String?
    public let adaParsel: String?
    public let areaM2: Double?
    public let currentValuation: Double?
    public let organizationId: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case estateType = "estate_type"
        case city
        case district
        case neighborhood
        case adaParsel = "ada_parsel"
        case areaM2 = "area_m2"
        case currentValuation = "current_valuation"
        case organizationId = "organization_id"
    }
    
    public var formattedValuation: String {
        return Formatters.currency(currentValuation ?? 0)
    }
    
    public var formattedArea: String {
        return "\(Formatters.number(areaM2 ?? 0)) m²"
    }
}
