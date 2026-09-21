import Foundation

/// Swift data model for `vehicles` table matching live Supabase PostgreSQL schema.
/// Conforms to `Identifiable`, `Codable`, `Sendable`, `Hashable`, and `Equatable`.
public struct Vehicle: Identifiable, Codable, Sendable, Hashable, Equatable {
    public var id: UUID
    public var organizationId: UUID?
    public var plate: String
    public var brand: String
    public var model: String
    public var year: Int
    public var activeDriver: String?
    public var inspectionDate: String? // YYYY-MM-DD
    public var insuranceDate: String? // YYYY-MM-DD
    public var status: String // "aktif", "bakimda", "pasif", "satildi"
    
    // PostgreSQL native fields
    public var cascoDate: String?
    public var vehicleType: String?
    public var fuelType: String?
    public var currentKm: Int?
    public var department: String?
    public var purchaseDate: String?
    public var description: String?
    public var dainiMurtehin: String?
    public var purchasePrice: Double?
    public var currentPrice: Double?
    public var createdAt: String?
    public var updatedAt: String?

    // Convenience Aliases
    public var modelYear: Int {
        get { year }
        set { year = newValue }
    }
    public var assignedTo: String? {
        get { activeDriver }
        set { activeDriver = newValue }
    }

    /// Inspection criticality indicator (<= 10 days or expired)
    public var isInspectionCritical: Bool {
        guard let dateStr = inspectionDate, !dateStr.isEmpty else { return false }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let target = formatter.date(from: dateStr) else { return false }
        let days = Calendar.current.dateComponents([.day], from: Date(), to: target).day ?? 0
        return days <= 10
    }

    public init(
        id: UUID = UUID(),
        organizationId: UUID? = nil,
        plate: String,
        brand: String,
        model: String,
        year: Int,
        activeDriver: String? = nil,
        inspectionDate: String? = nil,
        insuranceDate: String? = nil,
        status: String = "aktif",
        cascoDate: String? = nil,
        vehicleType: String? = "otomobil",
        fuelType: String? = "dizel",
        currentKm: Int? = 0,
        department: String? = nil,
        purchaseDate: String? = nil,
        description: String? = nil,
        dainiMurtehin: String? = nil,
        purchasePrice: Double? = nil,
        currentPrice: Double? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.organizationId = organizationId
        self.plate = plate
        self.brand = brand
        self.model = model
        self.year = year
        self.activeDriver = activeDriver
        self.inspectionDate = inspectionDate
        self.insuranceDate = insuranceDate
        self.status = status
        self.cascoDate = cascoDate
        self.vehicleType = vehicleType
        self.fuelType = fuelType
        self.currentKm = currentKm
        self.department = department
        self.purchaseDate = purchaseDate
        self.description = description
        self.dainiMurtehin = dainiMurtehin
        self.purchasePrice = purchasePrice
        self.currentPrice = currentPrice
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Convenience initializer matching legacy `VehicleRecord`
    public init(
        id: UUID = UUID(),
        plate: String,
        brand: String,
        model: String,
        year: Int,
        activeDriver: String? = nil
    ) {
        self.init(
            id: id,
            organizationId: nil,
            plate: plate,
            brand: brand,
            model: model,
            year: year,
            activeDriver: activeDriver
        )
    }

    enum CodingKeys: String, CodingKey {
        case id
        case organizationId = "organization_id"
        case plate
        case brand
        case model
        case year
        case modelYear = "model_year"
        case activeDriver = "active_driver"
        case assignedTo = "assigned_to"
        case inspectionDate = "inspection_date"
        case insuranceDate = "insurance_date"
        case cascoDate = "casco_date"
        case status
        case vehicleType = "vehicle_type"
        case fuelType = "fuel_type"
        case currentKm = "current_km"
        case department
        case purchaseDate = "purchase_date"
        case description
        case dainiMurtehin = "daini_murtehin"
        case purchasePrice = "purchase_price"
        case currentPrice = "current_price"
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

        self.plate = (try? container.decodeIfPresent(String.self, forKey: .plate)) ?? ""
        self.brand = (try? container.decodeIfPresent(String.self, forKey: .brand)) ?? ""
        self.model = (try? container.decodeIfPresent(String.self, forKey: .model)) ?? ""

        self.year = (try? container.decodeIfPresent(Int.self, forKey: .year)) ??
                    (try? container.decodeIfPresent(Int.self, forKey: .modelYear)) ?? 2020

        self.activeDriver = (try? container.decodeIfPresent(String.self, forKey: .activeDriver)) ??
                            (try? container.decodeIfPresent(String.self, forKey: .assignedTo))

        self.inspectionDate = try? container.decodeIfPresent(String.self, forKey: .inspectionDate)
        self.insuranceDate = try? container.decodeIfPresent(String.self, forKey: .insuranceDate)
        self.cascoDate = try? container.decodeIfPresent(String.self, forKey: .cascoDate)
        self.status = (try? container.decodeIfPresent(String.self, forKey: .status)) ?? "aktif"
        self.vehicleType = try? container.decodeIfPresent(String.self, forKey: .vehicleType)
        self.fuelType = try? container.decodeIfPresent(String.self, forKey: .fuelType)
        self.currentKm = try? container.decodeIfPresent(Int.self, forKey: .currentKm)
        self.department = try? container.decodeIfPresent(String.self, forKey: .department)
        self.purchaseDate = try? container.decodeIfPresent(String.self, forKey: .purchaseDate)
        self.description = try? container.decodeIfPresent(String.self, forKey: .description)
        self.dainiMurtehin = try? container.decodeIfPresent(String.self, forKey: .dainiMurtehin)
        self.purchasePrice = try? container.decodeIfPresent(Double.self, forKey: .purchasePrice)
        self.currentPrice = try? container.decodeIfPresent(Double.self, forKey: .currentPrice)
        self.createdAt = try? container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try? container.decodeIfPresent(String.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encodeIfPresent(organizationId, forKey: .organizationId)
        try container.encode(plate, forKey: .plate)
        try container.encode(brand, forKey: .brand)
        try container.encode(model, forKey: .model)
        try container.encode(year, forKey: .year)
        try container.encode(year, forKey: .modelYear)
        try container.encodeIfPresent(activeDriver, forKey: .activeDriver)
        try container.encodeIfPresent(activeDriver, forKey: .assignedTo)
        try container.encodeIfPresent(inspectionDate, forKey: .inspectionDate)
        try container.encodeIfPresent(insuranceDate, forKey: .insuranceDate)
        try container.encodeIfPresent(cascoDate, forKey: .cascoDate)
        try container.encode(status, forKey: .status)
        try container.encodeIfPresent(vehicleType, forKey: .vehicleType)
        try container.encodeIfPresent(fuelType, forKey: .fuelType)
        try container.encodeIfPresent(currentKm, forKey: .currentKm)
        try container.encodeIfPresent(department, forKey: .department)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}

public typealias VehicleRecord = Vehicle
