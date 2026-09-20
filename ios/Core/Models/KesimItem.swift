import Foundation

/// Swift data model for `kesim_listesi` table matching live Supabase PostgreSQL schema.
/// Conforms to `Identifiable`, `Codable`, `Sendable`, `Hashable`, and `Equatable`.
public struct KesimItem: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var receiptNo: String?
    public var slaughterDate: String // YYYY-MM-DD
    public var supplierName: String
    public var animalType: String // "Dana", "Düve", etc.
    public var earTag: String?
    public var carcassWeight: Double
    public var unitPrice: Double
    public var totalAmount: Double
    public var status: String // "paid", "acik_mal", "pending"
    
    // PostgreSQL native fields
    public var headCount: Int
    public var liveWeight: Double?
    public var yieldRate: Double?
    public var pesinat: Double
    public var kalanTutar: Double
    public var paymentDate: String?
    public var isAcikMal: Bool
    public var notes: String?
    public var createdAt: String?
    public var updatedAt: String?

    // Convenience Aliases for Compatibility
    public var supplier: String {
        get { supplierName }
        set { supplierName = newValue }
    }
    public var earTagNo: String? {
        get { earTag }
        set { earTag = newValue }
    }
    public var pricePerKg: Double {
        get { unitPrice }
        set { unitPrice = newValue }
    }

    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        receiptNo: String? = nil,
        slaughterDate: String = "",
        supplierName: String = "",
        animalType: String = "Dana",
        earTag: String? = nil,
        carcassWeight: Double = 0.0,
        unitPrice: Double = 0.0,
        totalAmount: Double = 0.0,
        status: String = "pending",
        headCount: Int = 1,
        liveWeight: Double? = nil,
        yieldRate: Double? = nil,
        pesinat: Double = 0.0,
        kalanTutar: Double = 0.0,
        paymentDate: String? = nil,
        isAcikMal: Bool = false,
        notes: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.receiptNo = receiptNo
        self.slaughterDate = slaughterDate
        self.supplierName = supplierName
        self.animalType = animalType
        self.earTag = earTag
        self.carcassWeight = carcassWeight
        self.unitPrice = unitPrice
        self.totalAmount = totalAmount > 0 ? totalAmount : (carcassWeight * unitPrice)
        self.status = status
        self.headCount = headCount
        self.liveWeight = liveWeight
        self.yieldRate = yieldRate
        self.pesinat = pesinat
        self.kalanTutar = kalanTutar > 0 ? kalanTutar : max(0.0, self.totalAmount - pesinat)
        self.paymentDate = paymentDate
        self.isAcikMal = isAcikMal
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Convenience initializer directly matching legacy `SlaughterRecord`
    public init(
        id: UUID = UUID(),
        slaughterDate: String,
        supplier: String,
        headCount: Int = 1,
        animalType: String = "Dana",
        carcassWeight: Double,
        pricePerKg: Double,
        totalAmount: Double? = nil,
        pesinat: Double = 0.0,
        kalanTutar: Double? = nil,
        paymentDate: String? = nil,
        notes: String? = nil,
        organizationId: UUID? = nil
    ) {
        let computedTotal = totalAmount ?? (carcassWeight * pricePerKg)
        let computedKalan = kalanTutar ?? max(0.0, computedTotal - pesinat)
        self.init(
            id: id,
            organizationId: organizationId,
            receiptNo: nil,
            slaughterDate: slaughterDate,
            supplierName: supplier,
            animalType: animalType,
            earTag: nil,
            carcassWeight: carcassWeight,
            unitPrice: pricePerKg,
            totalAmount: computedTotal,
            status: computedKalan <= 0 ? "paid" : "acik_mal",
            headCount: headCount,
            pesinat: pesinat,
            kalanTutar: computedKalan,
            paymentDate: paymentDate,
            notes: notes
        )
    }

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case receiptNo = "receipt_no"
        case slaughterDate = "slaughter_date"
        case supplierName = "supplier_name"
        case supplier
        case animalType = "animal_type"
        case earTag = "ear_tag"
        case earTagNo = "ear_tag_no"
        case carcassWeight = "carcass_weight"
        case unitPrice = "unit_price"
        case pricePerKg = "price_per_kg"
        case totalAmount = "total_amount"
        case status
        case headCount = "head_count"
        case liveWeight = "live_weight"
        case yieldRate = "yield_rate"
        case pesinat
        case kalanTutar = "kalan_tutar"
        case paymentDate = "payment_date"
        case isAcikMal = "is_acik_mal"
        case notes
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

        self.receiptNo = try? container.decodeIfPresent(String.self, forKey: .receiptNo)
        self.slaughterDate = (try? container.decodeIfPresent(String.self, forKey: .slaughterDate)) ?? ""
        
        self.supplierName = (try? container.decodeIfPresent(String.self, forKey: .supplierName)) ??
                            (try? container.decodeIfPresent(String.self, forKey: .supplier)) ?? ""

        self.animalType = (try? container.decodeIfPresent(String.self, forKey: .animalType)) ?? "Dana"
        self.earTag = (try? container.decodeIfPresent(String.self, forKey: .earTag)) ??
                      (try? container.decodeIfPresent(String.self, forKey: .earTagNo))

        self.carcassWeight = (try? container.decodeIfPresent(Double.self, forKey: .carcassWeight)) ?? 0.0
        self.unitPrice = (try? container.decodeIfPresent(Double.self, forKey: .unitPrice)) ??
                         (try? container.decodeIfPresent(Double.self, forKey: .pricePerKg)) ?? 0.0

        if let tot = try? container.decodeIfPresent(Double.self, forKey: .totalAmount) {
            self.totalAmount = tot
        } else {
            self.totalAmount = self.carcassWeight * self.unitPrice
        }

        self.headCount = (try? container.decodeIfPresent(Int.self, forKey: .headCount)) ?? 1
        self.liveWeight = try? container.decodeIfPresent(Double.self, forKey: .liveWeight)
        self.yieldRate = try? container.decodeIfPresent(Double.self, forKey: .yieldRate)
        self.pesinat = (try? container.decodeIfPresent(Double.self, forKey: .pesinat)) ?? 0.0
        self.kalanTutar = (try? container.decodeIfPresent(Double.self, forKey: .kalanTutar)) ?? max(0.0, self.totalAmount - self.pesinat)
        self.paymentDate = try? container.decodeIfPresent(String.self, forKey: .paymentDate)
        self.isAcikMal = (try? container.decodeIfPresent(Bool.self, forKey: .isAcikMal)) ?? false
        self.notes = try? container.decodeIfPresent(String.self, forKey: .notes)

        if let explicitStatus = try? container.decodeIfPresent(String.self, forKey: .status) {
            self.status = explicitStatus
        } else {
            self.status = self.isAcikMal ? "acik_mal" : (self.kalanTutar <= 0 ? "paid" : "pending")
        }

        self.createdAt = try? container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try? container.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(organizationId, forKey: .organizationId)
        try container.encodeIfPresent(receiptNo, forKey: .receiptNo)
        try container.encode(slaughterDate, forKey: .slaughterDate)
        try container.encode(supplierName, forKey: .supplierName)
        try container.encode(supplierName, forKey: .supplier)
        try container.encode(animalType, forKey: .animalType)
        try container.encodeIfPresent(earTag, forKey: .earTag)
        try container.encodeIfPresent(earTag, forKey: .earTagNo)
        try container.encode(carcassWeight, forKey: .carcassWeight)
        try container.encode(unitPrice, forKey: .unitPrice)
        try container.encode(unitPrice, forKey: .pricePerKg)
        try container.encode(totalAmount, forKey: .totalAmount)
        try container.encode(status, forKey: .status)
        try container.encode(headCount, forKey: .headCount)
        try container.encodeIfPresent(liveWeight, forKey: .liveWeight)
        try container.encodeIfPresent(yieldRate, forKey: .yieldRate)
        try container.encode(pesinat, forKey: .pesinat)
        try container.encode(kalanTutar, forKey: .kalanTutar)
        try container.encodeIfPresent(paymentDate, forKey: .paymentDate)
        try container.encode(isAcikMal, forKey: .isAcikMal)
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

public typealias SlaughterRecord = KesimItem
