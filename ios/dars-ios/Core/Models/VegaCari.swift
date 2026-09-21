import Foundation

/// Balance status classification enum for VegaCari accounts
public enum BalanceStatus: String, Codable, Sendable, Equatable {
    case borclu
    case alacakli
    case sifir
}

/// Swift data model for `vega_cariler` table matching live Supabase PostgreSQL schema.
/// Conforms to `Identifiable`, `Codable`, `Sendable`, `Hashable`, and `Equatable`.
public struct VegaCari: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var code: String
    public var name: String
    public var balance: Double
    public var taxNumber: String?
    public var taxOffice: String?
    public var city: String?
    public var district: String?
    public var phone: String?
    public var email: String?
    public var isActive: Bool
    
    // PostgreSQL native fields
    public var companyCode: String?
    public var companyTrackingCode: String?
    public var type: String?
    public var lastTransactionDate: String?
    public var createdAt: String?
    public var updatedAt: String?
    
    // Convenience Aliases
    public var taxNo: String? { taxNumber }
    public var isBorclu: Bool { balance > 0 }
    public var isAlacakli: Bool { balance < 0 }
    public var isSifir: Bool { balance == 0 }
    
    public var balanceStatus: BalanceStatus {
        if balance > 0 { return .borclu }
        if balance < 0 { return .alacakli }
        return .sifir
    }
    
    public var badgeColor: String {
        if balance > 0 { return "rose" }
        if balance < 0 { return "emerald" }
        return "slate"
    }
    
    public var balanceStatusLabel: String {
        if balance > 0 { return "Borçlu (Kalan)" }
        if balance < 0 { return "Alacaklı (Alacak)" }
        return "Sıfır Bakiye"
    }

    /// Primary initializer with detailed named parameters
    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        code: String,
        name: String,
        companyCode: String? = nil,
        companyTrackingCode: String? = nil,
        taxOffice: String? = nil,
        taxNo: String? = nil,
        type: String? = "Müşteri",
        city: String? = nil,
        lastTransactionDate: String? = nil,
        balance: Double = 0.0,
        createdAt: String? = nil,
        updatedAt: String? = nil,
        district: String? = nil,
        phone: String? = nil,
        email: String? = nil,
        isActive: Bool = true
    ) {
        self.id = id
        self.organizationId = organizationId
        self.code = code
        self.name = name
        self.companyCode = companyCode
        self.companyTrackingCode = companyTrackingCode
        self.taxOffice = taxOffice
        self.taxNumber = taxNo
        self.type = type
        self.city = city
        self.lastTransactionDate = lastTransactionDate
        self.balance = balance
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.district = district
        self.phone = phone
        self.email = email
        self.isActive = isActive
    }

    /// Secondary convenience initializer with taxNumber and balance first
    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        code: String,
        name: String,
        balance: Double = 0.0,
        taxNumber: String? = nil,
        taxOffice: String? = nil,
        city: String? = nil,
        district: String? = nil,
        phone: String? = nil,
        email: String? = nil,
        isActive: Bool = true,
        companyCode: String? = nil,
        companyTrackingCode: String? = nil,
        type: String? = "Müşteri",
        lastTransactionDate: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.code = code
        self.name = name
        self.balance = balance
        self.taxNumber = taxNumber
        self.taxOffice = taxOffice
        self.city = city
        self.district = district
        self.phone = phone
        self.email = email
        self.isActive = isActive
        self.companyCode = companyCode
        self.companyTrackingCode = companyTrackingCode
        self.type = type
        self.lastTransactionDate = lastTransactionDate
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case code
        case name
        case balance
        case taxNumber = "tax_number"
        case taxNo = "tax_no"
        case taxOffice = "tax_office"
        case city
        case district
        case phone
        case email
        case isActive = "is_active"
        case companyCode = "company_code"
        case companyTrackingCode = "company_tracking_code"
        case type
        case lastTransactionDate = "last_transaction_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Handle id as UUID or String UUID
        if let uuid = try? container.decode(UUID.self, forKey: .id) {
            self.id = uuid
        } else if let uuidStr = try? container.decode(String.self, forKey: .id), let uuid = UUID(uuidString: uuidStr) {
            self.id = uuid
        } else {
            self.id = UUID()
        }

        if let orgStr = try? container.decodeIfPresent(String.self, forKey: .organizationId), let orgUuid = UUID(uuidString: orgStr) {
            self.organizationId = orgUuid
        } else {
            self.organizationId = try? container.decodeIfPresent(UUID.self, forKey: .organizationId)
        }

        self.code = (try? container.decodeIfPresent(String.self, forKey: .code)) ?? ""
        self.name = (try? container.decodeIfPresent(String.self, forKey: .name)) ?? ""
        
        // Balance can be Double, Int, or String in edge cases
        if let balDouble = try? container.decodeIfPresent(Double.self, forKey: .balance) {
            self.balance = balDouble
        } else if let balInt = try? container.decodeIfPresent(Int.self, forKey: .balance) {
            self.balance = Double(balInt)
        } else if let balStr = try? container.decodeIfPresent(String.self, forKey: .balance), let parsed = Double(balStr) {
            self.balance = parsed
        } else {
            self.balance = 0.0
        }

        self.taxNumber = (try? container.decodeIfPresent(String.self, forKey: .taxNumber)) ?? (try? container.decodeIfPresent(String.self, forKey: .taxNo))
        self.taxOffice = try? container.decodeIfPresent(String.self, forKey: .taxOffice)
        self.city = try? container.decodeIfPresent(String.self, forKey: .city)
        self.district = try? container.decodeIfPresent(String.self, forKey: .district)
        self.phone = try? container.decodeIfPresent(String.self, forKey: .phone)
        self.email = try? container.decodeIfPresent(String.self, forKey: .email)
        self.isActive = (try? container.decodeIfPresent(Bool.self, forKey: .isActive)) ?? true
        
        self.companyCode = try? container.decodeIfPresent(String.self, forKey: .companyCode)
        self.companyTrackingCode = try? container.decodeIfPresent(String.self, forKey: .companyTrackingCode)
        self.type = try? container.decodeIfPresent(String.self, forKey: .type)
        self.lastTransactionDate = try? container.decodeIfPresent(String.self, forKey: .lastTransactionDate)
        self.createdAt = try? container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try? container.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(organizationId, forKey: .organizationId)
        try container.encode(code, forKey: .code)
        try container.encode(name, forKey: .name)
        try container.encode(balance, forKey: .balance)
        try container.encodeIfPresent(taxNumber, forKey: .taxNo)
        try container.encodeIfPresent(taxNumber, forKey: .taxNumber)
        try container.encodeIfPresent(taxOffice, forKey: .taxOffice)
        try container.encodeIfPresent(city, forKey: .city)
        try container.encodeIfPresent(district, forKey: .district)
        try container.encodeIfPresent(phone, forKey: .phone)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encode(isActive, forKey: .isActive)
        try container.encodeIfPresent(companyCode, forKey: .companyCode)
        try container.encodeIfPresent(companyTrackingCode, forKey: .companyTrackingCode)
        try container.encodeIfPresent(type, forKey: .type)
        try container.encodeIfPresent(lastTransactionDate, forKey: .lastTransactionDate)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

public typealias CariRecord = VegaCari
