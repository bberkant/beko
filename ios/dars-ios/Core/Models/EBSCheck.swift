import Foundation

/// Swift data model for `ebs_checks` table matching live Supabase PostgreSQL schema.
/// Conforms to `Identifiable`, `Codable`, `Sendable`, `Hashable`, and `Equatable`.
public struct EBSCheck: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var checkNumber: String
    public var bankName: String
    public var branchName: String
    public var accountNumber: String?
    public var amount: Double
    public var dueDate: String // YYYY-MM-DD
    public var drawer: String // Counterparty / Drawer / Keşideci
    public var status: String // "Tahsilde", "Portföy", "İç Takas", "Ödendi", "Ciro Edildi"
    public var isIcTakas: Bool
    public var createdAt: String?
    
    // PostgreSQL native fields
    public var checkType: String // "alinan" / "kesilen"
    public var documentType: String // "cek" / "senet"
    public var issueDate: String?
    public var creditor: String?
    public var debtor: String?
    public var localId: Int?
    public var paraBirimi: String?
    public var ozelAlan: String?
    public var kesideci: String?
    public var kesideYeri: String?
    public var tahsildarBanka: String?
    public var ciroEdilen: String?
    public var updatedAt: String?
    
    // Convenience Aliases for Compatibility
    public var checkNo: String {
        get { checkNumber }
        set { checkNumber = newValue }
    }
    public var bankBranch: String {
        get { branchName }
        set { branchName = newValue }
    }
    
    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        checkNumber: String = "",
        bankName: String = "",
        branchName: String = "",
        accountNumber: String? = nil,
        amount: Double = 0.0,
        dueDate: String = "",
        drawer: String = "",
        status: String = "Tahsilde",
        isIcTakas: Bool = false,
        createdAt: String? = nil,
        checkType: String = "alinan",
        documentType: String = "cek",
        issueDate: String? = nil,
        creditor: String? = nil,
        debtor: String? = nil,
        localId: Int? = nil,
        paraBirimi: String? = "TL",
        ozelAlan: String? = nil,
        kesideci: String? = nil,
        kesideYeri: String? = nil,
        tahsildarBanka: String? = nil,
        ciroEdilen: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.checkNumber = checkNumber
        self.bankName = bankName
        self.branchName = branchName
        self.accountNumber = accountNumber
        self.amount = amount
        self.dueDate = dueDate
        self.drawer = drawer.isEmpty ? (debtor ?? kesideci ?? "") : drawer
        self.status = status
        self.isIcTakas = isIcTakas
        self.createdAt = createdAt
        self.checkType = checkType
        self.documentType = documentType
        self.issueDate = issueDate
        self.creditor = creditor
        self.debtor = debtor ?? drawer
        self.localId = localId
        self.paraBirimi = paraBirimi
        self.ozelAlan = ozelAlan
        self.kesideci = kesideci ?? drawer
        self.kesideYeri = kesideYeri
        self.tahsildarBanka = tahsildarBanka
        self.ciroEdilen = ciroEdilen
        self.updatedAt = updatedAt
    }

    /// Convenience initializer directly matching legacy `CheckRecord`
    public init(
        id: UUID = UUID(),
        amount: Double,
        bankName: String,
        bankBranch: String = "",
        checkNo: String = "",
        checkType: String = "alinan",
        documentType: String = "cek",
        dueDate: String,
        kesideci: String = "",
        status: String = "Tahsilde",
        organizationId: UUID? = nil
    ) {
        self.init(
            id: id,
            organizationId: organizationId,
            checkNumber: checkNo,
            bankName: bankName,
            branchName: bankBranch,
            accountNumber: nil,
            amount: amount,
            dueDate: dueDate,
            drawer: kesideci,
            status: status,
            isIcTakas: status == "İç Takas",
            checkType: checkType,
            documentType: documentType
        )
    }

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case checkNumber = "check_number"
        case checkNo = "check_no"
        case bankName = "bank_name"
        case branchName = "branch_name"
        case bankBranch = "bank_branch"
        case accountNumber = "account_number"
        case amount
        case dueDate = "due_date"
        case drawer
        case debtor
        case kesideci
        case creditor
        case status
        case isIcTakas = "is_ic_takas"
        case checkType = "check_type"
        case documentType = "document_type"
        case issueDate = "issue_date"
        case localId = "local_id"
        case paraBirimi = "para_birimi"
        case ozelAlan = "ozel_alan"
        case kesideYeri = "keside_yeri"
        case tahsildarBanka = "tahsildar_banka"
        case ciroEdilen = "ciro_edilen"
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

        self.checkNumber = (try? container.decodeIfPresent(String.self, forKey: .checkNumber)) ??
                           (try? container.decodeIfPresent(String.self, forKey: .checkNo)) ?? ""

        self.bankName = (try? container.decodeIfPresent(String.self, forKey: .bankName)) ?? ""
        self.branchName = (try? container.decodeIfPresent(String.self, forKey: .branchName)) ??
                          (try? container.decodeIfPresent(String.self, forKey: .bankBranch)) ?? ""
        self.accountNumber = try? container.decodeIfPresent(String.self, forKey: .accountNumber)

        if let amtDouble = try? container.decodeIfPresent(Double.self, forKey: .amount) {
            self.amount = amtDouble
        } else if let amtInt = try? container.decodeIfPresent(Int.self, forKey: .amount) {
            self.amount = Double(amtInt)
        } else if let amtStr = try? container.decodeIfPresent(String.self, forKey: .amount), let parsed = Double(amtStr) {
            self.amount = parsed
        } else {
            self.amount = 0.0
        }

        self.dueDate = (try? container.decodeIfPresent(String.self, forKey: .dueDate)) ?? ""
        
        let kesideciVal = try? container.decodeIfPresent(String.self, forKey: .kesideci)
        let debtorVal = try? container.decodeIfPresent(String.self, forKey: .debtor)
        let drawerVal = try? container.decodeIfPresent(String.self, forKey: .drawer)
        
        self.drawer = drawerVal ?? (debtorVal?.isEmpty == false ? debtorVal! : (kesideciVal ?? ""))
        self.debtor = debtorVal
        self.kesideci = kesideciVal
        self.creditor = try? container.decodeIfPresent(String.self, forKey: .creditor)

        let statusDecoded = (try? container.decodeIfPresent(String.self, forKey: .status)) ?? "Portföy"
        self.status = statusDecoded

        let ozel = try? container.decodeIfPresent(String.self, forKey: .ozelAlan)
        self.ozelAlan = ozel
        
        if let explicitIcTakas = try? container.decodeIfPresent(Bool.self, forKey: .isIcTakas) {
            self.isIcTakas = explicitIcTakas
        } else {
            self.isIcTakas = statusDecoded == "İç Takas" || (ozel?.contains("İÇ TAKAS") == true)
        }

        self.checkType = (try? container.decodeIfPresent(String.self, forKey: .checkType)) ?? "alinan"
        self.documentType = (try? container.decodeIfPresent(String.self, forKey: .documentType)) ?? "cek"
        self.issueDate = try? container.decodeIfPresent(String.self, forKey: .issueDate)
        self.localId = try? container.decodeIfPresent(Int.self, forKey: .localId)
        self.paraBirimi = try? container.decodeIfPresent(String.self, forKey: .paraBirimi)
        self.kesideYeri = try? container.decodeIfPresent(String.self, forKey: .kesideYeri)
        self.tahsildarBanka = try? container.decodeIfPresent(String.self, forKey: .tahsildarBanka)
        self.ciroEdilen = try? container.decodeIfPresent(String.self, forKey: .ciroEdilen)
        self.createdAt = try? container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try? container.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(organizationId, forKey: .organizationId)
        try container.encode(checkNumber, forKey: .checkNumber)
        try container.encode(checkNumber, forKey: .checkNo)
        try container.encode(bankName, forKey: .bankName)
        try container.encode(branchName, forKey: .branchName)
        try container.encode(branchName, forKey: .bankBranch)
        try container.encodeIfPresent(accountNumber, forKey: .accountNumber)
        try container.encode(amount, forKey: .amount)
        try container.encode(dueDate, forKey: .dueDate)
        try container.encode(drawer, forKey: .drawer)
        try container.encode(drawer, forKey: .debtor)
        try container.encode(drawer, forKey: .kesideci)
        try container.encodeIfPresent(creditor, forKey: .creditor)
        try container.encode(status, forKey: .status)
        try container.encode(isIcTakas, forKey: .isIcTakas)
        try container.encode(checkType, forKey: .checkType)
        try container.encode(documentType, forKey: .documentType)
        try container.encodeIfPresent(issueDate, forKey: .issueDate)
        try container.encodeIfPresent(ozelAlan, forKey: .ozelAlan)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

public typealias CheckRecord = EBSCheck
