import Foundation
import SwiftUI
import UIKit

// MARK: - Color Extension (Kuveyt Turk Brand Green)
extension Color {
    static let brandGreen = Color(red: 0.0, green: 0.53, blue: 0.35) // #008556
    static let systemLightGray = Color(red: 0.96, green: 0.97, blue: 0.98)
}

// MARK: - CheckRecord (Çek/Senet)
struct CheckRecord: Identifiable, Codable {
    var id: UUID
    var amount: Double
    var bankName: String
    var bankBranch: String
    var checkNo: String
    var checkType: String // "alinan" / "verilen"
    var documentType: String // "cek" / "senet"
    var dueDate: String // YYYY-MM-DD
    var kesideci: String // Supplier / Debtor
    var status: String // "Portföy", "Ciro Edildi", "Tahsilde", "Ödendi"
    var organizationId: UUID
    
    enum CodingKeys: String, CodingKey {
        case id
        case amount
        case bankName = "bank_name"
        case bankBranch = "bank_branch"
        case checkNo = "check_no"
        case checkType = "check_type"
        case documentType = "document_type"
        case dueDate = "due_date"
        case kesideci
        case status
        case organizationId = "organization_id"
    }
}

// MARK: - SlaughterRecord (Kesim Listesi)
struct SlaughterRecord: Identifiable, Codable {
    var id: UUID
    var slaughterDate: String // YYYY-MM-DD
    var supplier: String
    var headCount: Int
    var animalType: String // "Dana", "Düve", etc.
    var carcassWeight: Double
    var pricePerKg: Double
    var totalAmount: Double
    var pesinat: Double
    var kalanTutar: Double
    var paymentDate: String?
    var notes: String?
    var organizationId: UUID
    
    enum CodingKeys: String, CodingKey {
        case id
        case slaughterDate = "slaughter_date"
        case supplier
        case headCount = "head_count"
        case animalType = "animal_type"
        case carcassWeight = "carcass_weight"
        case pricePerKg = "price_per_kg"
        case totalAmount = "total_amount"
        case pesinat
        case kalanTutar = "kalan_tutar"
        case paymentDate = "payment_date"
        case notes
        case organizationId = "organization_id"
    }
}

// MARK: - CariSummary
struct CariSummary: Identifiable, Hashable {
    var id: String { supplier }
    var supplier: String
    var headCount: Int
    var carcassWeight: Double
    var totalAmount: Double
    var pesinat: Double
    var kalanTutar: Double
    var lastSlaughterDate: String
}

// MARK: - VehicleRecord (Araç Yönetimi)
struct VehicleRecord: Identifiable, Codable {
    var id: UUID
    var plate: String
    var brand: String
    var model: String
    var year: Int
    var activeDriver: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case plate
        case brand
        case model
        case year
        case activeDriver = "active_driver"
    }
}

// MARK: - TenderRecord (İhaleler)
struct TenderRecord: Identifiable, Codable {
    var id: UUID
    var name: String
    var tenderNo: String
    var date: String
    var amount: Double
    var status: String // "Beklemede", "Kazanıldı", "Kaybedildi"
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case tenderNo = "tender_no"
        case date
        case amount
        case status
    }
}

// MARK: - RealEstateRecord (Gayrimenkuller)
struct RealEstateRecord: Identifiable, Codable {
    var id: UUID
    var title: String
    var propertyType: String // "Arsa", "Daire", "Bina"
    var city: String
    var district: String
    var estimatedValue: Double
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case propertyType = "property_type"
        case city
        case district
        case estimatedValue = "estimated_value"
    }
}

// MARK: - LegalCaseRecord (Hukuk Davaları)
struct LegalCaseRecord: Identifiable, Codable {
    var id: UUID
    var caseNo: String
    var courtName: String
    var caseSubject: String
    var status: String // "Devam Ediyor", "Karara Bağlandı"
    
    enum CodingKeys: String, CodingKey {
        case id
        case caseNo = "case_no"
        case courtName = "court_name"
        case caseSubject = "case_subject"
        case status
    }
}

// MARK: - EInvoiceRecord (E-Faturalar)
struct EInvoiceRecord: Identifiable, Codable {
    var id: UUID
    var invoiceNo: String
    var date: String
    var amount: Double
    var senderName: String
    var status: String // "Onaylandı", "Beklemede", "Reddedildi"
    
    enum CodingKeys: String, CodingKey {
        case id
        case invoiceNo = "invoice_no"
        case date
        case amount
        case senderName = "sender_name"
        case status
    }
}

