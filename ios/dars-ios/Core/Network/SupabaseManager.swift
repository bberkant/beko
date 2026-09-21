import Foundation
import Combine

public class SupabaseManager: ObservableObject {
    public static let shared = SupabaseManager()
    
    @Published public var records: [SlaughterRecord] = []
    @Published public var checks: [CheckRecord] = []
    @Published public var vehicles: [VehicleRecord] = []
    @Published public var tenders: [TenderRecord] = []
    @Published public var realEstates: [RealEstateRecord] = []
    @Published public var legalCases: [LegalCaseRecord] = []
    @Published public var eInvoices: [EInvoiceRecord] = []
    
    @Published public var loading: Bool = false
    @Published public var organizationId: UUID = SupabaseConfig.defaultOrganizationId
    
    private let useMockData = true
    
    public init() {
        if useMockData {
            loadMockData()
        }
    }
    
    public func fetchRecords() {}
    public func fetchChecks() {}
    
    public func addCheck(supplier: String, amount: Double, dueDate: String, bankName: String, checkNo: String, type: String = "cek") {
        let newCheck = CheckRecord(
            id: UUID(),
            amount: amount,
            bankName: bankName,
            bankBranch: "Merkez",
            checkNo: checkNo,
            checkType: "alinan",
            documentType: type,
            dueDate: dueDate,
            kesideci: supplier,
            status: "Portföy",
            organizationId: organizationId
        )
        
        DispatchQueue.main.async {
            self.checks.insert(newCheck, at: 0)
        }
    }
    
    // Aggregated Caris (from Slaughter records)
    public var aggregatedCaris: [CariSummary] {
        var groups: [String: CariSummary] = [:]
        
        for item in records {
            let key = item.supplier.trimmingCharacters(in: .whitespacesAndNewlines)
            if key.isEmpty { continue }
            
            if var existing = groups[key] {
                existing.headCount += item.headCount
                existing.carcassWeight += item.carcassWeight
                existing.totalAmount += item.totalAmount
                existing.pesinat += item.pesinat
                existing.kalanTutar += item.kalanTutar
                if item.slaughterDate > existing.lastSlaughterDate {
                    existing.lastSlaughterDate = item.slaughterDate
                }
                groups[key] = existing
            } else {
                groups[key] = CariSummary(
                    supplier: item.supplier,
                    headCount: item.headCount,
                    carcassWeight: item.carcassWeight,
                    totalAmount: item.totalAmount,
                    pesinat: item.pesinat,
                    kalanTutar: item.kalanTutar,
                    lastSlaughterDate: item.slaughterDate
                )
            }
        }
        
        return Array(groups.values).sorted { $0.totalAmount > $1.totalAmount }
    }
    
    private func loadMockData() {
        // 1. Slaughter records (Kesim listesi)
        self.records = [
            SlaughterRecord(id: UUID(), slaughterDate: "2026-08-04", supplier: "DİVAN HAYVANCILIK", headCount: 32, animalType: "DÜVE", carcassWeight: 9917, pricePerKg: 570, totalAmount: 5664090, pesinat: 0, kalanTutar: 5664090, organizationId: organizationId),
            SlaughterRecord(id: UUID(), slaughterDate: "2026-08-12", supplier: "DİVAN HAYVANCILIK", headCount: 27, animalType: "DÜVE", carcassWeight: 8692, pricePerKg: 575, totalAmount: 4997900, pesinat: 0, kalanTutar: 4997900, organizationId: organizationId),
            SlaughterRecord(id: UUID(), slaughterDate: "2026-08-12", supplier: "FİMAR AŞ", headCount: 69, animalType: "DANA", carcassWeight: 13635, pricePerKg: 405.17, totalAmount: 5524510, pesinat: 10740, kalanTutar: 5513770, organizationId: organizationId),
            SlaughterRecord(id: UUID(), slaughterDate: "2026-08-01", supplier: "SAMED YAĞIZ", headCount: 30, animalType: "DANA", carcassWeight: 6416, pricePerKg: 510, totalAmount: 3272160, pesinat: 0, kalanTutar: 3272160, organizationId: organizationId),
            SlaughterRecord(id: UUID(), slaughterDate: "2026-08-02", supplier: "MUSTAFA ÇUHADAR", headCount: 4, animalType: "DANA", carcassWeight: 848, pricePerKg: 320.28, totalAmount: 271600, pesinat: 19108, kalanTutar: 252492, organizationId: organizationId),
            SlaughterRecord(id: UUID(), slaughterDate: "2026-08-01", supplier: "DOĞAN ÖZEL", headCount: 2, animalType: "DANA", carcassWeight: 476, pricePerKg: 470, totalAmount: 223720, pesinat: 8174, kalanTutar: 215546, organizationId: organizationId)
        ]
        
        // 2. Checks (Çek & Senet)
        self.checks = [
            CheckRecord(id: UUID(), amount: 3500000, bankName: "Kuveyt Türk", bankBranch: "Samsun Şb.", checkNo: "CK-00192", checkType: "alinan", documentType: "cek", dueDate: "2026-09-10", kesideci: "DİVAN HAYVANCILIK", status: "Portföy", organizationId: organizationId),
            CheckRecord(id: UUID(), amount: 5400000, bankName: "Halkbank", bankBranch: "Merzifon Şb.", checkNo: "CK-00843", checkType: "alinan", documentType: "cek", dueDate: "2026-09-15", kesideci: "FİMAR AŞ", status: "Portföy", organizationId: organizationId),
            CheckRecord(id: UUID(), amount: 1636080, bankName: "Ziraat Bankası", bankBranch: "Amasya Şb.", checkNo: "CK-11943", checkType: "alinan", documentType: "cek", dueDate: "2026-09-22", kesideci: "SAMED YAĞIZ", status: "Portföy", organizationId: organizationId),
            CheckRecord(id: UUID(), amount: 1914000, bankName: "Vakıfbank", bankBranch: "Suluova Şb.", checkNo: "CK-55321", checkType: "alinan", documentType: "cek", dueDate: "2026-10-01", kesideci: "MUSTAFA ÇUHADAR", status: "Portföy", organizationId: organizationId),
            CheckRecord(id: UUID(), amount: 2500000, bankName: "Kuveyt Türk", bankBranch: "Samsun Şb.", checkNo: "CK-00142", checkType: "alinan", documentType: "cek", dueDate: "2026-08-20", kesideci: "DİVAN HAYVANCILIK", status: "Ödendi", organizationId: organizationId),
            CheckRecord(id: UUID(), amount: 2982680, bankName: "Garanti Bankası", bankBranch: "Merzifon Şb.", checkNo: "CK-33214", checkType: "alinan", documentType: "cek", dueDate: "2026-08-25", kesideci: "ARHAHAN ET", status: "Ciro Edildi", organizationId: organizationId)
        ]
        
        // 3. Vehicles (Araç Yönetimi)
        self.vehicles = [
            VehicleRecord(id: UUID(), plate: "55 DR 992", brand: "Mercedes-Benz", model: "Actros 1845", year: 2021, activeDriver: "Ahmet Yılmaz"),
            VehicleRecord(id: UUID(), plate: "05 AC 124", brand: "Ford", model: "F-Max", year: 2022, activeDriver: "Murat Can"),
            VehicleRecord(id: UUID(), plate: "34 FG 4521", brand: "Fiat", model: "Doblo Cargo", year: 2020, activeDriver: "Mehmet Demir")
        ]
        
        // 4. Tenders (İhaleler)
        self.tenders = [
            TenderRecord(id: UUID(), name: "Amasya Belediye Et Tedariği İhalesi", tenderNo: "IH-2026/89", date: "2026-09-05", amount: 14500000, status: "Beklemede"),
            TenderRecord(id: UUID(), name: "Samsun Kamu Hastaneleri Kırmızı Et Alımı", tenderNo: "IH-2026/102", date: "2026-08-20", amount: 28900000, status: "Kazanıldı"),
            TenderRecord(id: UUID(), name: "Tokat Askeri Birliği Yemeklik Karkas İhalesi", tenderNo: "IH-2026/95", date: "2026-08-15", amount: 9600000, status: "Kaybedildi")
        ]
        
        // 5. Real Estates (Gayrimenkuller)
        self.realEstates = [
            RealEstateRecord(id: UUID(), title: "Suluova Mezbaha Yanı Besi Çiftliği", propertyType: "Arsa/Çiftlik", city: "Amasya", district: "Suluova", estimatedValue: 75000000),
            RealEstateRecord(id: UUID(), title: "Merzifon Merkez Ofis Katı", propertyType: "Ofis", city: "Amasya", district: "Merzifon", estimatedValue: 12500000),
            RealEstateRecord(id: UUID(), title: "Samsun Lojistik Depo Alanı", propertyType: "Depo", city: "Samsun", district: "Tekkeköy", estimatedValue: 34000000)
        ]
        
        // 6. Legal Cases (Hukuk Davaları)
        self.legalCases = [
            LegalCaseRecord(id: UUID(), caseNo: "2026/142 Esas", courtName: "Suluova 1. Asliye Hukuk Mahkemesi", caseSubject: "Tedarik Sözleşmesi İhlali Alacak Davası", status: "Devam Ediyor"),
            LegalCaseRecord(id: UUID(), caseNo: "2025/389 Esas", courtName: "Samsun İcra Hukuk Mahkemesi", caseSubject: "Çek İcra Takibi İtirazı", status: "Karara Bağlandı")
        ]
        
        // 7. E-Invoices (E-Faturalar)
        self.eInvoices = [
            EInvoiceRecord(id: UUID(), invoiceNo: "MAR202600000142", date: "2026-08-30", amount: 155000, senderName: "ETİK ET VE ET ÜRÜNLERİ", status: "Onaylandı"),
            EInvoiceRecord(id: UUID(), invoiceNo: "ALB202600000985", date: "2026-08-29", amount: 670000, senderName: "ALBARAKA TÜRK A.Ş.", status: "Beklemede"),
            EInvoiceRecord(id: UUID(), invoiceNo: "ZIR202600000412", date: "2026-08-28", amount: 340000, senderName: "TEKİN GÖNEK", status: "Onaylandı")
        ]
    }
}
