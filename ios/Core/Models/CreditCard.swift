import Foundation

/// Swift data model for `credit_cards` table matching live Supabase PostgreSQL schema.
/// Conforms to `Identifiable`, `Codable`, `Sendable`, `Hashable`, and `Equatable`.
public struct CreditCard: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var cardName: String
    public var bank: String
    public var cardNumberMasked: String
    public var limitAmount: Double
    public var currentDebt: Double
    public var cutOffDate: Int // Statement cut-off day (1-31)
    public var minPayment: Double
    
    // PostgreSQL native fields
    public var last4: String
    public var dueDay: Int
    public var minPaymentRate: Double
    public var bankShort: String?
    public var cardType: String? // "business", "individual"
    public var holder: String?
    public var department: String?
    public var currency: String?
    public var startDate: String?
    public var expiryMonth: Int?
    public var expiryYear: Int?
    public var status: String? // "aktif", "pasif"
    public var statementStatus: String? // "bekleniyor", "odendi"
    public var description: String?
    public var createdAt: String?
    public var updatedAt: String?

    // Convenience Aliases
    public var cardLimit: Double {
        get { limitAmount }
        set { limitAmount = newValue }
    }
    public var statementDay: Int {
        get { cutOffDate }
        set { cutOffDate = newValue }
    }
    public var availableLimit: Double {
        return max(0.0, limitAmount - currentDebt)
    }
    public var utilizationPercentage: Double {
        guard limitAmount > 0 else { return 0.0 }
        return min(100.0, (currentDebt / limitAmount) * 100.0)
    }

    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        cardName: String,
        bank: String,
        cardNumberMasked: String? = nil,
        limitAmount: Double = 0.0,
        currentDebt: Double = 0.0,
        cutOffDate: Int = 1,
        minPayment: Double? = nil,
        last4: String = "",
        dueDay: Int = 10,
        minPaymentRate: Double = 0.20,
        bankShort: String? = nil,
        cardType: String? = "business",
        holder: String? = nil,
        department: String? = nil,
        currency: String? = "TRY",
        startDate: String? = nil,
        expiryMonth: Int? = nil,
        expiryYear: Int? = nil,
        status: String? = "aktif",
        statementStatus: String? = "bekleniyor",
        description: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.cardName = cardName
        self.bank = bank
        let extractedLast4 = last4.isEmpty ? (cardNumberMasked?.suffix(4).description ?? "0000") : last4
        self.last4 = extractedLast4
        self.cardNumberMasked = cardNumberMasked ?? "**** **** **** \(extractedLast4)"
        self.limitAmount = limitAmount
        self.currentDebt = currentDebt
        self.cutOffDate = cutOffDate
        self.dueDay = dueDay
        self.minPaymentRate = minPaymentRate
        self.minPayment = minPayment ?? (currentDebt * minPaymentRate)
        self.bankShort = bankShort
        self.cardType = cardType
        self.holder = holder
        self.department = department
        self.currency = currency
        self.startDate = startDate
        self.expiryMonth = expiryMonth
        self.expiryYear = expiryYear
        self.status = status
        self.statementStatus = statementStatus
        self.description = description
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case cardName = "card_name"
        case bank
        case bankShort = "bank_short"
        case cardType = "card_type"
        case last4
        case cardNumberMasked = "card_number_masked"
        case limitAmount = "limit_amount"
        case cardLimit = "card_limit"
        case currentDebt = "current_debt"
        case cutOffDate = "cut_off_date"
        case statementDay = "statement_day"
        case dueDay = "due_day"
        case minPayment = "min_payment"
        case minPaymentRate = "min_payment_rate"
        case holder
        case department
        case currency
        case startDate = "start_date"
        case expiryMonth = "expiry_month"
        case expiryYear = "expiry_year"
        case status
        case statementStatus = "statement_status"
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

        self.cardName = (try? container.decodeIfPresent(String.self, forKey: .cardName)) ?? ""
        self.bank = (try? container.decodeIfPresent(String.self, forKey: .bank)) ?? ""
        
        let rawLast4 = (try? container.decodeIfPresent(String.self, forKey: .last4)) ?? ""
        self.last4 = rawLast4

        if let explicitMasked = try? container.decodeIfPresent(String.self, forKey: .cardNumberMasked) {
            self.cardNumberMasked = explicitMasked
        } else if !rawLast4.isEmpty {
            self.cardNumberMasked = "**** **** **** \(rawLast4)"
        } else {
            self.cardNumberMasked = "**** **** **** 0000"
        }

        self.limitAmount = (try? container.decodeIfPresent(Double.self, forKey: .limitAmount)) ??
                           (try? container.decodeIfPresent(Double.self, forKey: .cardLimit)) ?? 0.0

        self.currentDebt = (try? container.decodeIfPresent(Double.self, forKey: .currentDebt)) ?? 0.0

        self.cutOffDate = (try? container.decodeIfPresent(Int.self, forKey: .cutOffDate)) ??
                          (try? container.decodeIfPresent(Int.self, forKey: .statementDay)) ?? 1

        self.dueDay = (try? container.decodeIfPresent(Int.self, forKey: .dueDay)) ?? 10
        self.minPaymentRate = (try? container.decodeIfPresent(Double.self, forKey: .minPaymentRate)) ?? 0.20

        if let explicitMinPay = try? container.decodeIfPresent(Double.self, forKey: .minPayment) {
            self.minPayment = explicitMinPay
        } else {
            self.minPayment = self.currentDebt * self.minPaymentRate
        }

        self.bankShort = try? container.decodeIfPresent(String.self, forKey: .bankShort)
        self.cardType = try? container.decodeIfPresent(String.self, forKey: .cardType)
        self.holder = try? container.decodeIfPresent(String.self, forKey: .holder)
        self.department = try? container.decodeIfPresent(String.self, forKey: .department)
        self.currency = try? container.decodeIfPresent(String.self, forKey: .currency)
        self.startDate = try? container.decodeIfPresent(String.self, forKey: .startDate)
        self.expiryMonth = try? container.decodeIfPresent(Int.self, forKey: .expiryMonth)
        self.expiryYear = try? container.decodeIfPresent(Int.self, forKey: .expiryYear)
        self.status = try? container.decodeIfPresent(String.self, forKey: .status)
        self.statementStatus = try? container.decodeIfPresent(String.self, forKey: .statementStatus)
        self.description = try? container.decodeIfPresent(String.self, forKey: .description)
        self.createdAt = try? container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try? container.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(organizationId, forKey: .organizationId)
        try container.encode(cardName, forKey: .cardName)
        try container.encode(bank, forKey: .bank)
        try container.encode(last4, forKey: .last4)
        try container.encode(cardNumberMasked, forKey: .cardNumberMasked)
        try container.encode(limitAmount, forKey: .limitAmount)
        try container.encode(limitAmount, forKey: .cardLimit)
        try container.encode(currentDebt, forKey: .currentDebt)
        try container.encode(cutOffDate, forKey: .cutOffDate)
        try container.encode(cutOffDate, forKey: .statementDay)
        try container.encode(dueDay, forKey: .dueDay)
        try container.encode(minPayment, forKey: .minPayment)
        try container.encode(minPaymentRate, forKey: .minPaymentRate)
        try container.encodeIfPresent(bankShort, forKey: .bankShort)
        try container.encodeIfPresent(cardType, forKey: .cardType)
        try container.encodeIfPresent(holder, forKey: .holder)
        try container.encodeIfPresent(department, forKey: .department)
        try container.encodeIfPresent(currency, forKey: .currency)
        try container.encodeIfPresent(status, forKey: .status)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

public typealias CreditCardRecord = CreditCard
