import Foundation

/// Swift data model for `bank_accounts` table matching live Supabase PostgreSQL schema.
/// Conforms to `Identifiable`, `Codable`, `Sendable`, `Hashable`, and `Equatable`.
public struct BankAccount: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var bankName: String
    public var branch: String
    public var accountNo: String
    public var iban: String
    public var currency: String
    public var balance: Double
    
    // PostgreSQL native fields
    public var accountName: String?
    public var accountType: String? // "vadesiz", "vadeli", "kredi", "pos"
    public var availableBalance: Double?
    public var status: String? // "aktif", "pasif", "bloke"
    public var description: String?
    public var createdAt: String?
    public var updatedAt: String?

    // Convenience Aliases
    public var bank: String {
        get { bankName }
        set { bankName = newValue }
    }
    public var branchName: String {
        get { branch }
        set { branch = newValue }
    }
    public var accountNumber: String {
        get { accountNo }
        set { accountNo = newValue }
    }

    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        bankName: String,
        branch: String = "",
        accountNo: String = "",
        iban: String,
        currency: String = "TRY",
        balance: Double = 0.0,
        accountName: String? = nil,
        accountType: String? = "vadesiz",
        availableBalance: Double? = nil,
        status: String? = "aktif",
        description: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.bankName = bankName
        self.branch = branch
        self.accountNo = accountNo
        self.iban = iban
        self.currency = currency
        self.balance = balance
        self.accountName = accountName
        self.accountType = accountType
        self.availableBalance = availableBalance ?? balance
        self.status = status
        self.description = description
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case bankName = "bank_name"
        case bank
        case branch
        case branchName = "branch_name"
        case accountNo = "account_no"
        case accountNumber = "account_number"
        case iban
        case currency
        case balance
        case accountName = "account_name"
        case accountType = "account_type"
        case availableBalance = "available_balance"
        case status
        case description
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
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

        self.bankName = (try? container.decodeIfPresent(String.self, forKey: .bankName)) ??
                        (try? container.decodeIfPresent(String.self, forKey: .bank)) ?? ""

        self.branch = (try? container.decodeIfPresent(String.self, forKey: .branch)) ??
                      (try? container.decodeIfPresent(String.self, forKey: .branchName)) ?? ""

        self.accountNo = (try? container.decodeIfPresent(String.self, forKey: .accountNo)) ??
                         (try? container.decodeIfPresent(String.self, forKey: .accountNumber)) ?? ""

        self.iban = (try? container.decodeIfPresent(String.self, forKey: .iban)) ?? ""
        self.currency = (try? container.decodeIfPresent(String.self, forKey: .currency)) ?? "TRY"

        if let balDouble = try? container.decodeIfPresent(Double.self, forKey: .balance) {
            self.balance = balDouble
        } else if let balInt = try? container.decodeIfPresent(Int.self, forKey: .balance) {
            self.balance = Double(balInt)
        } else {
            self.balance = 0.0
        }

        self.accountName = try? container.decodeIfPresent(String.self, forKey: .accountName)
        self.accountType = try? container.decodeIfPresent(String.self, forKey: .accountType)
        self.availableBalance = try? container.decodeIfPresent(Double.self, forKey: .availableBalance)
        self.status = try? container.decodeIfPresent(String.self, forKey: .status)
        self.description = try? container.decodeIfPresent(String.self, forKey: .description)
        self.createdAt = try? container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try? container.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(organizationId, forKey: .organizationId)
        try container.encode(bankName, forKey: .bankName)
        try container.encode(bankName, forKey: .bank)
        try container.encode(branch, forKey: .branch)
        try container.encode(branch, forKey: .branchName)
        try container.encode(accountNo, forKey: .accountNo)
        try container.encode(accountNo, forKey: .accountNumber)
        try container.encode(iban, forKey: .iban)
        try container.encode(currency, forKey: .currency)
        try container.encode(balance, forKey: .balance)
        try container.encodeIfPresent(accountName, forKey: .accountName)
        try container.encodeIfPresent(accountType, forKey: .accountType)
        try container.encodeIfPresent(availableBalance, forKey: .availableBalance)
        try container.encodeIfPresent(status, forKey: .status)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}
