import Foundation

/// Swift data model for `cekten_hesabi` table matching live Supabase PostgreSQL schema.
/// Conforms to `Identifiable`, `Codable`, `Sendable`, `Hashable`, and `Equatable`.
public struct CektenHesap: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var facilityNo: String
    public var supplier: String
    public var totalAmount: Double
    public var paidAmount: Double
    public var remainingAmount: Double
    public var interestRate: Double // e.g. 0.45 for 45% annual rate
    public var tenorDays: Int // e.g. 45 days
    public var status: String // "Açık", "Ödendi", "Kısmi"
    public var dueDate: String // YYYY-MM-DD or date string
    
    // PostgreSQL native fields
    public var date: String
    public var notes: String?
    public var paymentDate: String?
    public var createdAt: String?
    public var updatedAt: String?

    // Convenience Aliases
    public var total: Double { totalAmount }
    public var paid: Double { paidAmount }
    public var remain: Double { remainingAmount }
    public var isSettled: Bool { remainingAmount <= 0 }

    /// Financial Engine: Calculates trade financing cost
    /// Formula: Maliyet = Tutar * (Gun / 360) * 0.45
    public var financingCost: Double {
        guard tenorDays > 0 && totalAmount > 0 else { return 0.0 }
        return totalAmount * (Double(tenorDays) / 360.0) * interestRate
    }

    /// Financial Engine: Calculates net yield / proceeds
    /// Formula: Net = Tutar - Maliyet
    public var netProceeds: Double {
        return totalAmount - financingCost
    }

    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        facilityNo: String? = nil,
        supplier: String = "",
        totalAmount: Double = 0.0,
        paidAmount: Double = 0.0,
        remainingAmount: Double? = nil,
        interestRate: Double = 0.45,
        tenorDays: Int = 45,
        status: String? = nil,
        dueDate: String = "",
        date: String = "",
        notes: String? = nil,
        paymentDate: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.facilityNo = facilityNo ?? "CH-\(id.uuidString.prefix(6).uppercased())"
        self.supplier = supplier
        self.totalAmount = totalAmount
        self.paidAmount = paidAmount
        let computedRemain = remainingAmount ?? max(0.0, totalAmount - paidAmount)
        self.remainingAmount = computedRemain
        self.interestRate = interestRate
        self.tenorDays = tenorDays
        self.status = status ?? (computedRemain <= 0 ? "Ödendi" : "Açık")
        self.dueDate = dueDate.isEmpty ? (paymentDate ?? date) : dueDate
        self.date = date.isEmpty ? dueDate : date
        self.notes = notes
        self.paymentDate = paymentDate ?? dueDate
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case facilityNo = "facility_no"
        case supplier
        case totalAmount = "total_amount"
        case total
        case paidAmount = "paid_amount"
        case paid
        case remainingAmount = "remaining_amount"
        case remain
        case interestRate = "interest_rate"
        case tenorDays = "tenor_days"
        case status
        case dueDate = "due_date"
        case date
        case notes
        case paymentDate = "payment_date"
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

        let decodedFacNo = try? container.decodeIfPresent(String.self, forKey: .facilityNo)
        self.facilityNo = decodedFacNo ?? "CH-\(self.id.uuidString.prefix(6).uppercased())"
        
        self.supplier = (try? container.decodeIfPresent(String.self, forKey: .supplier)) ?? ""

        // totalAmount
        if let totDouble = try? container.decodeIfPresent(Double.self, forKey: .totalAmount) {
            self.totalAmount = totDouble
        } else if let totInt = try? container.decodeIfPresent(Int.self, forKey: .totalAmount) {
            self.totalAmount = Double(totInt)
        } else if let totAlias = try? container.decodeIfPresent(Double.self, forKey: .total) {
            self.totalAmount = totAlias
        } else {
            self.totalAmount = 0.0
        }

        // paidAmount
        if let paidDouble = try? container.decodeIfPresent(Double.self, forKey: .paidAmount) {
            self.paidAmount = paidDouble
        } else if let paidInt = try? container.decodeIfPresent(Int.self, forKey: .paidAmount) {
            self.paidAmount = Double(paidInt)
        } else if let paidAlias = try? container.decodeIfPresent(Double.self, forKey: .paid) {
            self.paidAmount = paidAlias
        } else {
            self.paidAmount = 0.0
        }

        // remainingAmount
        if let remDouble = try? container.decodeIfPresent(Double.self, forKey: .remainingAmount) {
            self.remainingAmount = remDouble
        } else if let remInt = try? container.decodeIfPresent(Int.self, forKey: .remainingAmount) {
            self.remainingAmount = Double(remInt)
        } else if let remAlias = try? container.decodeIfPresent(Double.self, forKey: .remain) {
            self.remainingAmount = remAlias
        } else {
            self.remainingAmount = max(0.0, self.totalAmount - self.paidAmount)
        }

        self.interestRate = (try? container.decodeIfPresent(Double.self, forKey: .interestRate)) ?? 0.45
        self.tenorDays = (try? container.decodeIfPresent(Int.self, forKey: .tenorDays)) ?? 45

        let decodedStatus = try? container.decodeIfPresent(String.self, forKey: .status)
        self.status = decodedStatus ?? (self.remainingAmount <= 0 ? "Ödendi" : "Açık")

        let decodedDueDate = try? container.decodeIfPresent(String.self, forKey: .dueDate)
        let decodedPaymentDate = try? container.decodeIfPresent(String.self, forKey: .paymentDate)
        let decodedDate = (try? container.decodeIfPresent(String.self, forKey: .date)) ?? ""

        self.dueDate = decodedDueDate ?? (decodedPaymentDate ?? decodedDate)
        self.paymentDate = decodedPaymentDate
        self.date = decodedDate
        self.notes = try? container.decodeIfPresent(String.self, forKey: .notes)
        self.createdAt = try? container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try? container.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(organizationId, forKey: .organizationId)
        try container.encode(facilityNo, forKey: .facilityNo)
        try container.encode(supplier, forKey: .supplier)
        try container.encode(totalAmount, forKey: .totalAmount)
        try container.encode(paidAmount, forKey: .paidAmount)
        try container.encode(remainingAmount, forKey: .remainingAmount)
        try container.encode(interestRate, forKey: .interestRate)
        try container.encode(tenorDays, forKey: .tenorDays)
        try container.encode(status, forKey: .status)
        try container.encode(dueDate, forKey: .dueDate)
        try container.encode(date, forKey: .date)
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encodeIfPresent(paymentDate, forKey: .paymentDate)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

public typealias CektenRecord = CektenHesap
