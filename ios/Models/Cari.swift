import Foundation

public struct VegaCari: Identifiable, Codable, Hashable {
    public let id: String
    public let code: String
    public let name: String
    public let taxOffice: String?
    public let taxNo: String?
    public let type: String?
    public let city: String?
    public let balance: Double
    public let lastTransactionDate: String?
    public let organizationId: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case code
        case name
        case taxOffice = "tax_office"
        case taxNo = "tax_no"
        case type
        case city
        case balance
        case lastTransactionDate = "last_transaction_date"
        case organizationId = "organization_id"
    }
    
    public var isBorclu: Bool {
        return balance >= 0
    }
    
    public var formattedBalance: String {
        return Formatters.currency(abs(balance))
    }
    
    public var displayType: String {
        return isBorclu ? "Borçlu Cari" : "Alacaklı Cari"
    }
}

public struct VegaCariHareket: Identifiable, Codable, Hashable {
    public let id: String
    public let cariCode: String
    public let date: String
    public let docNo: String?
    public let docType: String?
    public let description: String?
    public let debit: Double // Borç
    public let credit: Double // Alacak
    public let balance: Double
    
    enum CodingKeys: String, CodingKey {
        case id
        case cariCode = "cari_code"
        case date
        case docNo = "doc_no"
        case docType = "doc_type"
        case description
        case debit
        case credit
        case balance
    }
    
    public var formattedAmount: String {
        let amt = debit > 0 ? debit : credit
        return Formatters.currency(amt)
    }
}
