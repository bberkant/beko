import Foundation
import XCTest
@testable import dars_ios

/// Reusable test fixtures, mock data builders, and helper utilities for DARS iOS Test Suites
enum TestFixtures {
    static let testOrgId = UUID(uuidString: "13b8da90-27d1-440d-a8f4-eb50dadd6391")!
    
    // MARK: - Sample Cheques
    static func makeSampleCheck(
        id: UUID = UUID(),
        amount: Double = 4_260_129.0,
        bank: String = "M.DENİZ",
        branch: String = "Merkez",
        checkNo: String = "CK-5935504",
        checkType: String = "alinan",
        docType: String = "cek",
        dueDate: String = "2026-09-03",
        kesideci: String = "BURAK BESİCİLİK-KRŞ",
        status: String = "Tahsilde"
    ) -> CheckRecord {
        CheckRecord(
            id: id,
            amount: amount,
            bankName: bank,
            bankBranch: branch,
            checkNo: checkNo,
            checkType: checkType,
            documentType: docType,
            dueDate: dueDate,
            kesideci: kesideci,
            status: status,
            organizationId: testOrgId
        )
    }
    
    // MARK: - Sample Slaughter Records
    static func makeSampleSlaughter(
        id: UUID = UUID(),
        date: String = "2026-08-12",
        supplier: String = "DİVAN HAYVANCILIK",
        headCount: Int = 27,
        animalType: String = "DÜVE",
        carcassWeight: Double = 8692.0,
        pricePerKg: Double = 575.0,
        pesinat: Double = 0.0
    ) -> SlaughterRecord {
        let total = carcassWeight * pricePerKg
        let kalan = max(0.0, total - pesinat)
        return SlaughterRecord(
            id: id,
            slaughterDate: date,
            supplier: supplier,
            headCount: headCount,
            animalType: animalType,
            carcassWeight: carcassWeight,
            pricePerKg: pricePerKg,
            totalAmount: total,
            pesinat: pesinat,
            kalanTutar: kalan,
            paymentDate: nil,
            notes: "Test Kesim",
            organizationId: testOrgId
        )
    }
    
    // MARK: - Sample Cari Summary
    static func makeSampleCariSummary(
        supplier: String = "DİVAN HAYVANCILIK",
        headCount: Int = 59,
        carcassWeight: Double = 18609.0,
        totalAmount: Double = 10_661_990.0,
        pesinat: Double = 0.0,
        kalanTutar: Double = 10_661_990.0,
        lastDate: String = "2026-08-12"
    ) -> CariSummary {
        CariSummary(
            supplier: supplier,
            headCount: headCount,
            carcassWeight: carcassWeight,
            totalAmount: totalAmount,
            pesinat: pesinat,
            kalanTutar: kalanTutar,
            lastSlaughterDate: lastDate
        )
    }
    
    // MARK: - Mathematical Oracles
    /// Calculates Çekten cost using the formula: Cost = Amount * (Days / 360) * 0.45
    static func calculateCektenCost(amount: Double, days: Int) -> Double {
        guard days > 0 else { return 0.0 }
        return amount * (Double(days) / 360.0) * 0.45
    }
    
    /// Calculates Çekten net proceeds: Net = Amount - Cost
    static func calculateCektenNet(amount: Double, days: Int) -> Double {
        let cost = calculateCektenCost(amount: amount, days: days)
        return amount - cost
    }
}
