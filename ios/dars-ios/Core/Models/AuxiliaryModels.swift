import Foundation

// MARK: - CariSummary
/// Aggregated slaughter summary per supplier for the Cariler screen.
public struct CariSummary: Identifiable, Hashable, Sendable, Codable {
    public var id: String { supplier }
    public var supplier: String
    public var headCount: Int
    public var carcassWeight: Double
    public var totalAmount: Double
    public var pesinat: Double
    public var kalanTutar: Double
    public var lastSlaughterDate: String
    
    public init(
        supplier: String,
        headCount: Int,
        carcassWeight: Double,
        totalAmount: Double,
        pesinat: Double,
        kalanTutar: Double,
        lastSlaughterDate: String
    ) {
        self.supplier = supplier
        self.headCount = headCount
        self.carcassWeight = carcassWeight
        self.totalAmount = totalAmount
        self.pesinat = pesinat
        self.kalanTutar = kalanTutar
        self.lastSlaughterDate = lastSlaughterDate
    }
}

// MARK: - TenderRecord (İhaleler)
public struct TenderRecord: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var name: String
    public var tenderNo: String
    public var date: String
    public var amount: Double
    public var status: String // "Beklemede", "Kazanıldı", "Kaybedildi", "hazirlaniyor"
    public var institution: String?
    public var teminatMektubu: String?
    public var createdAt: String?
    
    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        name: String,
        tenderNo: String,
        date: String,
        amount: Double,
        status: String,
        institution: String? = nil,
        teminatMektubu: String? = nil,
        createdAt: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.name = name
        self.tenderNo = tenderNo
        self.date = date
        self.amount = amount
        self.status = status
        self.institution = institution
        self.teminatMektubu = teminatMektubu
        self.createdAt = createdAt
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case name = "title"
        case legacyName = "name"
        case tenderNo = "tender_number"
        case legacyTenderNo = "tender_no"
        case date = "deadline_at"
        case legacyDate = "date"
        case amount = "estimated_amount"
        case legacyAmount = "amount"
        case status
        case institution
        case teminatMektubu = "teminat_mektubu"
        case createdAt = "created_at"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = (try? container.decode(UUID.self, forKey: .id)) ?? UUID()
        self.organizationId = try? container.decodeIfPresent(UUID.self, forKey: .organizationId)
        self.name = (try? container.decodeIfPresent(String.self, forKey: .name)) ??
                    (try? container.decodeIfPresent(String.self, forKey: .legacyName)) ?? ""
        self.tenderNo = (try? container.decodeIfPresent(String.self, forKey: .tenderNo)) ??
                        (try? container.decodeIfPresent(String.self, forKey: .legacyTenderNo)) ?? ""
        self.date = (try? container.decodeIfPresent(String.self, forKey: .date)) ??
                    (try? container.decodeIfPresent(String.self, forKey: .legacyDate)) ?? ""
        self.amount = (try? container.decodeIfPresent(Double.self, forKey: .amount)) ??
                      (try? container.decodeIfPresent(Double.self, forKey: .legacyAmount)) ?? 0.0
        self.status = (try? container.decodeIfPresent(String.self, forKey: .status)) ?? "Beklemede"
        self.institution = try? container.decodeIfPresent(String.self, forKey: .institution)
        self.teminatMektubu = try? container.decodeIfPresent(String.self, forKey: .teminatMektubu)
        self.createdAt = try? container.decodeIfPresent(String.self, forKey: .createdAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(organizationId, forKey: .organizationId)
        try container.encode(name, forKey: .name)
        try container.encode(name, forKey: .legacyName)
        try container.encode(tenderNo, forKey: .tenderNo)
        try container.encode(tenderNo, forKey: .legacyTenderNo)
        try container.encode(date, forKey: .date)
        try container.encode(amount, forKey: .amount)
        try container.encode(status, forKey: .status)
        try container.encodeIfPresent(institution, forKey: .institution)
        try container.encodeIfPresent(teminatMektubu, forKey: .teminatMektubu)
    }
}

// MARK: - RealEstateRecord (Gayrimenkuller)
public struct RealEstateRecord: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var title: String
    public var propertyType: String // "Arsa", "Daire", "Bina", "Mesken", "Depo"
    public var city: String
    public var district: String
    public var estimatedValue: Double
    public var neighborhood: String?
    public var ada: String?
    public var parsel: String?
    public var areaSqm: Double?
    public var share: String?
    public var deedNo: String?
    public var filePath: String?
    
    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        title: String,
        propertyType: String,
        city: String,
        district: String,
        estimatedValue: Double,
        neighborhood: String? = nil,
        ada: String? = nil,
        parsel: String? = nil,
        areaSqm: Double? = nil,
        share: String? = nil,
        deedNo: String? = nil,
        filePath: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.title = title
        self.propertyType = propertyType
        self.city = city
        self.district = district
        self.estimatedValue = estimatedValue
        self.neighborhood = neighborhood
        self.ada = ada
        self.parsel = parsel
        self.areaSqm = areaSqm
        self.share = share
        self.deedNo = deedNo
        self.filePath = filePath
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case title = "description"
        case legacyTitle = "title"
        case propertyType = "property_type"
        case city
        case district
        case estimatedValue = "current_value"
        case legacyEstimatedValue = "estimated_value"
        case neighborhood
        case ada
        case parsel
        case areaSqm = "area_sqm"
        case share
        case deedNo = "deed_no"
        case filePath = "file_path"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = (try? container.decode(UUID.self, forKey: .id)) ?? UUID()
        self.organizationId = try? container.decodeIfPresent(UUID.self, forKey: .organizationId)
        self.title = (try? container.decodeIfPresent(String.self, forKey: .title)) ??
                     (try? container.decodeIfPresent(String.self, forKey: .legacyTitle)) ?? ""
        self.propertyType = (try? container.decodeIfPresent(String.self, forKey: .propertyType)) ?? "Mesken"
        self.city = (try? container.decodeIfPresent(String.self, forKey: .city)) ?? ""
        self.district = (try? container.decodeIfPresent(String.self, forKey: .district)) ?? ""
        self.estimatedValue = (try? container.decodeIfPresent(Double.self, forKey: .estimatedValue)) ??
                             (try? container.decodeIfPresent(Double.self, forKey: .legacyEstimatedValue)) ?? 0.0
        self.neighborhood = try? container.decodeIfPresent(String.self, forKey: .neighborhood)
        self.ada = try? container.decodeIfPresent(String.self, forKey: .ada)
        self.parsel = try? container.decodeIfPresent(String.self, forKey: .parsel)
        self.areaSqm = try? container.decodeIfPresent(Double.self, forKey: .areaSqm)
        self.share = try? container.decodeIfPresent(String.self, forKey: .share)
        self.deedNo = try? container.decodeIfPresent(String.self, forKey: .deedNo)
        self.filePath = try? container.decodeIfPresent(String.self, forKey: .filePath)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(organizationId, forKey: .organizationId)
        try container.encode(title, forKey: .title)
        try container.encode(title, forKey: .legacyTitle)
        try container.encode(propertyType, forKey: .propertyType)
        try container.encode(city, forKey: .city)
        try container.encode(district, forKey: .district)
        try container.encode(estimatedValue, forKey: .estimatedValue)
        try container.encode(estimatedValue, forKey: .legacyEstimatedValue)
    }
}

// MARK: - LegalCaseRecord (Hukuk Davaları)
public struct LegalCaseRecord: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var caseNo: String
    public var courtName: String
    public var caseSubject: String
    public var status: String // "Devam Ediyor", "Karara Bağlandı"
    
    public init(
        id: UUID = UUID(),
        caseNo: String,
        courtName: String,
        caseSubject: String,
        status: String
    ) {
        self.id = id
        self.caseNo = caseNo
        self.courtName = courtName
        self.caseSubject = caseSubject
        self.status = status
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case caseNo = "case_no"
        case courtName = "court_name"
        case caseSubject = "case_subject"
        case status
    }
}

// MARK: - EInvoiceRecord (E-Faturalar)
public struct EInvoiceRecord: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var invoiceNo: String
    public var date: String
    public var amount: Double
    public var senderName: String
    public var status: String // "Onaylandı", "Beklemede", "Reddedildi"
    
    public init(
        id: UUID = UUID(),
        invoiceNo: String,
        date: String,
        amount: Double,
        senderName: String,
        status: String
    ) {
        self.id = id
        self.invoiceNo = invoiceNo
        self.date = date
        self.amount = amount
        self.senderName = senderName
        self.status = status
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case invoiceNo = "invoice_no"
        case date
        case amount
        case senderName = "sender_name"
        case status
    }
}

// MARK: - CompanyBillRecord (Şirket Faturaları)
public struct CompanyBillRecord: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var name: String
    public var subscriberNo: String
    public var category: String // "elektrik", "su", "dogalgaz", "telekom"
    public var company: String
    public var currentAmount: Double
    public var dueDate: String
    public var billStatus: String // "odenecek", "odendi"
    
    public init(
        id: UUID = UUID(),
        name: String,
        subscriberNo: String,
        category: String,
        company: String,
        currentAmount: Double,
        dueDate: String,
        billStatus: String
    ) {
        self.id = id
        self.name = name
        self.subscriberNo = subscriberNo
        self.category = category
        self.company = company
        self.currentAmount = currentAmount
        self.dueDate = dueDate
        self.billStatus = billStatus
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case subscriberNo = "subscriber_no"
        case category
        case company
        case currentAmount = "current_amount"
        case dueDate = "due_date"
        case billStatus = "bill_status"
    }
}

// MARK: - CariMovementRecord (Cari Hesap Hareketleri)
public struct CariMovementRecord: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var cariCode: String
    public var date: String
    public var invoiceNo: String
    public var description: String
    public var borc: Double
    public var alacak: Double
    public var type: String
    public var amount: Double
    
    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        cariCode: String,
        date: String,
        invoiceNo: String,
        description: String,
        borc: Double,
        alacak: Double,
        type: String,
        amount: Double
    ) {
        self.id = id
        self.organizationId = organizationId
        self.cariCode = cariCode
        self.date = date
        self.invoiceNo = invoiceNo
        self.description = description
        self.borc = borc
        self.alacak = alacak
        self.type = type
        self.amount = amount
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case cariCode = "cari_code"
        case date
        case invoiceNo = "invoice_no"
        case description
        case borc
        case alacak
        case type
        case amount
    }
}
