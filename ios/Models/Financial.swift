import Foundation

public struct CreditCard: Identifiable, Codable, Hashable {
    public let id: String
    public let bank: String?
    public let cardName: String?
    public let cardType: String?
    public let last4: String?
    public let cardLimit: Double?
    public let currentDebt: Double?
    public let statementDay: Int?
    public let dueDay: Int?
    public let organizationId: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case bank
        case cardName = "card_name"
        case cardType = "card_type"
        case last4
        case cardLimit = "card_limit"
        case currentDebt = "current_debt"
        case statementDay = "statement_day"
        case dueDay = "due_day"
        case organizationId = "organization_id"
    }
    
    public var formattedLimit: String {
        return Formatters.currency(cardLimit ?? 0)
    }
    
    public var formattedDebt: String {
        return Formatters.currency(currentDebt ?? 0)
    }
    
    public var formattedAvailable: String {
        let lim = cardLimit ?? 0
        let debt = currentDebt ?? 0
        return Formatters.currency(max(0, lim - debt))
    }
}

public struct BankAccount: Identifiable, Codable, Hashable {
    public let id: String
    public let bank: String?
    public let accountName: String?
    public let accountType: String?
    public let iban: String?
    public let balance: Double?
    public let currency: String?
    public let organizationId: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case bank
        case accountName = "account_name"
        case accountType = "account_type"
        case iban
        case balance
        case currency
        case organizationId = "organization_id"
    }
    
    public var formattedBalance: String {
        return Formatters.currency(balance ?? 0)
    }
}

public struct BankTransaction: Identifiable, Codable, Hashable {
    public let id: String
    public let accountId: String?
    public let date: String?
    public let description: String?
    public let amount: Double?
    public let transactionType: String? // "in" or "out"
    public let balanceAfter: Double?
    
    enum CodingKeys: String, CodingKey {
        case id
        case accountId = "account_id"
        case date
        case description
        case amount
        case transactionType = "transaction_type"
        case balanceAfter = "balance_after"
    }
}
