import Foundation

public struct EBSCheck: Identifiable, Codable, Hashable {
    public let id: String
    public let checkNo: String?
    public let checkType: String // "kesilen" or "alinan"
    public let amount: Double
    public let currency: String?
    public let dueDate: String?
    public let registrationDate: String?
    public let debtor: String?
    public let creditor: String?
    public let bankName: String?
    public let bankBranch: String?
    public let status: String?
    public let ozelAlan: String?
    public let ciroEdilen: String?
    public let organizationId: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case checkNo = "check_no"
        case checkType = "check_type"
        case amount
        case currency
        case dueDate = "due_date"
        case registrationDate = "registration_date"
        case debtor
        case creditor
        case bankName = "bank_name"
        case bankBranch = "bank_branch"
        case status
        case ozelAlan = "ozel_alan"
        case ciroEdilen = "ciro_edilen"
        case organizationId = "organization_id"
    }
    
    // MARK: - Computed Properties for UI
    public var daysRemaining: Int {
        guard let due = dueDate else { return 0 }
        return Formatters.daysRemaining(from: due)
    }
    
    public var isToday: Bool {
        return daysRemaining == 0 || (dueDate?.starts(with: "2026-09-01") ?? false)
    }
    
    public var isTomorrow: Bool {
        return daysRemaining == 1 || (dueDate?.starts(with: "2026-09-02") ?? false)
    }
    
    public var isIcTakas: Bool {
        let note = (ozelAlan ?? "").uppercased()
        let stat = (status ?? "").uppercased()
        return note.contains("İÇ TAKAS") || stat.contains("İÇ TAKAS")
    }
    
    public var isTakas: Bool {
        let note = (ozelAlan ?? "").uppercased()
        let stat = (status ?? "").uppercased()
        if note.contains("TAKASTA OLMAYAN") { return false }
        return stat.contains("TAHSİL") || note.contains("TAKAS") || checkType == "kesilen"
    }
    
    public var displayTitle: String {
        return creditor ?? debtor ?? "Ticari Evrak"
    }
    
    public var displayBank: String {
        return (bankName ?? "BANKA").uppercased()
    }
    
    public var formattedAmount: String {
        return Formatters.currency(amount)
    }
    
    public var formattedDueDate: String {
        guard let due = dueDate else { return "-" }
        if let d = Formatters.parseDate(due) {
            return Formatters.formatDate(d)
        }
        return due
    }
    
    public var formattedRegDate: String {
        guard let reg = registrationDate else { return "-" }
        if let d = Formatters.parseDate(reg) {
            return Formatters.formatDate(d)
        }
        return reg
    }
}
