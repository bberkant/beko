import Foundation
import XCTest
@testable import dars_ios

/// Reusable authentic test fixtures and mock model factories for DARS iOS Test Suites.
/// Uses exclusively genuine Codable production models matching live Supabase schemas.
public enum TestFixtures {
    public static let testOrgId = UUID(uuidString: "13b8da90-27d1-440d-a8f4-eb50dadd6391")!
    
    // MARK: - Sample Cheques (EBSCheck)
    public static func makeSampleCheck(
        id: UUID = UUID(),
        amount: Double = 4_260_129.0,
        bank: String = "M.DENİZ",
        branch: String = "Merkez",
        checkNo: String = "CK-5935504",
        checkType: String = "alinan",
        docType: String = "cek",
        dueDate: String = "2026-09-03",
        drawer: String = "BURAK BESİCİLİK-KRŞ",
        status: String = "Tahsilde",
        isIcTakas: Bool = false
    ) -> EBSCheck {
        EBSCheck(
            id: id,
            organizationId: testOrgId,
            checkNumber: checkNo,
            bankName: bank,
            branchName: branch,
            accountNumber: "TR1200205000000000000001",
            amount: amount,
            dueDate: dueDate,
            drawer: drawer,
            status: status,
            isIcTakas: isIcTakas,
            checkType: checkType,
            documentType: docType,
            kesideci: drawer
        )
    }
    
    // MARK: - Sample Slaughter Records (KesimItem)
    public static func makeSampleSlaughter(
        id: UUID = UUID(),
        date: String = "2026-08-12",
        supplier: String = "DİVAN HAYVANCILIK",
        headCount: Int = 27,
        animalType: String = "DÜVE",
        carcassWeight: Double = 8692.0,
        pricePerKg: Double = 575.0,
        pesinat: Double = 0.0,
        status: String = "pending"
    ) -> KesimItem {
        let total = carcassWeight * pricePerKg
        let kalan = max(0.0, total - pesinat)
        return KesimItem(
            id: id,
            organizationId: testOrgId,
            receiptNo: "KSM-2026-001",
            slaughterDate: date,
            supplierName: supplier,
            animalType: animalType,
            earTag: "TR0500012345",
            carcassWeight: carcassWeight,
            unitPrice: pricePerKg,
            totalAmount: total,
            status: status,
            headCount: headCount,
            pesinat: pesinat,
            kalanTutar: kalan,
            isAcikMal: false,
            notes: "Test Kesim"
        )
    }
    
    // MARK: - Sample Cari (VegaCari)
    public static func makeSampleCari(
        id: UUID = UUID(),
        code: String = "120.01.001",
        name: String = "DİVAN HAYVANCILIK GIDA LTD. ŞTİ.",
        balance: Double = 4_215_000.0,
        taxNumber: String? = "1234567890",
        taxOffice: String? = "Amasya V.D.",
        city: String? = "Amasya",
        isActive: Bool = true
    ) -> VegaCari {
        VegaCari(
            id: id,
            organizationId: testOrgId,
            code: code,
            name: name,
            balance: balance,
            taxNumber: taxNumber,
            taxOffice: taxOffice,
            city: city,
            isActive: isActive
        )
    }
    
    // MARK: - Sample Çekten Record (CektenHesap)
    public static func makeSampleCekten(
        id: UUID = UUID(),
        facilityNo: String = "FAC-2026-001",
        supplier: String = "MUTENA BESİCİLİK",
        totalAmount: Double = 2_000_000.0,
        paidAmount: Double = 0.0,
        remainingAmount: Double? = nil,
        interestRate: Double = 0.45,
        tenorDays: Int = 45,
        status: String = "Açık",
        dueDate: String = "2026-10-15"
    ) -> CektenHesap {
        CektenHesap(
            id: id,
            organizationId: testOrgId,
            facilityNo: facilityNo,
            supplier: supplier,
            totalAmount: totalAmount,
            paidAmount: paidAmount,
            remainingAmount: remainingAmount ?? (totalAmount - paidAmount),
            interestRate: interestRate,
            tenorDays: tenorDays,
            status: status,
            dueDate: dueDate,
            date: "2026-09-01"
        )
    }
    
    // MARK: - Sample Vehicle (Vehicle)
    public static func makeSampleVehicle(
        id: UUID = UUID(),
        plate: String = "05 ER 120",
        brand: String = "TIRSAN",
        model: String = "DORSE",
        year: Int = 2021,
        activeDriver: String? = "Ahmet Yılmaz",
        inspectionDate: String? = "2026-12-31",
        status: String = "aktif"
    ) -> Vehicle {
        Vehicle(
            id: id,
            organizationId: testOrgId,
            plate: plate,
            brand: brand,
            model: model,
            year: year,
            activeDriver: activeDriver,
            inspectionDate: inspectionDate,
            status: status
        )
    }
    
    // MARK: - Sample Bank Account (BankAccount)
    public static func makeSampleBankAccount(
        id: UUID = UUID(),
        bankName: String = "KUVEYT TÜRK",
        branch: String = "Merkez Şube",
        accountNo: String = "12345678-5001",
        iban: String = "TR120020500000000012345678",
        currency: String = "TRY",
        balance: Double = 15_850_000.0
    ) -> BankAccount {
        BankAccount(
            id: id,
            organizationId: testOrgId,
            bankName: bankName,
            branch: branch,
            accountNo: accountNo,
            iban: iban,
            currency: currency,
            balance: balance,
            accountType: "vadesiz",
            status: "aktif"
        )
    }
    
    // MARK: - Sample Credit Card (CreditCard)
    public static func makeSampleCreditCard(
        id: UUID = UUID(),
        cardName: String = "KUVEYT TÜRK BUSINESS",
        bank: String = "Kuveyt Türk",
        limitAmount: Double = 250_000.0,
        currentDebt: Double = 50_000.0,
        cutOffDate: Int = 15,
        dueDay: Int = 25,
        minPaymentRate: Double = 0.20
    ) -> CreditCard {
        CreditCard(
            id: id,
            organizationId: testOrgId,
            cardName: cardName,
            bank: bank,
            cardNumberMasked: "**** **** **** 5824",
            limitAmount: limitAmount,
            currentDebt: currentDebt,
            cutOffDate: cutOffDate,
            dueDay: dueDay,
            minPaymentRate: minPaymentRate
        )
    }
}
