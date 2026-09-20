import XCTest
import Foundation
@testable import dars_ios

final class Milestone1_ModelTests: XCTestCase {

    func test_check_record_json_coding_keys_roundtrip() throws {
        let json = """
        {
            "id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "amount": 4260129.0,
            "bank_name": "M.DENİZ",
            "bank_branch": "Merkez",
            "check_no": "CK-5935504",
            "check_type": "alinan",
            "document_type": "cek",
            "due_date": "2026-09-03",
            "kesideci": "BURAK BESİCİLİK-KRŞ",
            "status": "Tahsilde",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        let record = try decoder.decode(CheckRecord.self, from: json)

        XCTAssertEqual(record.checkNo, "CK-5935504")
        XCTAssertEqual(record.bankName, "M.DENİZ")
        XCTAssertEqual(record.bankBranch, "Merkez")
        XCTAssertEqual(record.amount, 4_260_129.0)
        XCTAssertEqual(record.checkType, "alinan")
        XCTAssertEqual(record.documentType, "cek")
        XCTAssertEqual(record.dueDate, "2026-09-03")
        XCTAssertEqual(record.kesideci, "BURAK BESİCİLİK-KRŞ")
        XCTAssertEqual(record.status, "Tahsilde")

        let encoder = JSONEncoder()
        let encodedData = try encoder.encode(record)
        let redecoded = try decoder.decode(CheckRecord.self, from: encodedData)
        XCTAssertEqual(redecoded.checkNo, record.checkNo)
        XCTAssertEqual(redecoded.amount, record.amount)
    }

    func test_slaughter_record_json_coding_keys_roundtrip() throws {
        let json = """
        {
            "id": "24c9eb01-38e2-551e-b9f5-fc61ebef7402",
            "slaughter_date": "2026-08-12",
            "supplier": "DİVAN HAYVANCILIK",
            "head_count": 27,
            "animal_type": "DÜVE",
            "carcass_weight": 8692.0,
            "price_per_kg": 575.0,
            "total_amount": 4997900.0,
            "pesinat": 0.0,
            "kalan_tutar": 4997900.0,
            "payment_date": null,
            "notes": "Amasya Çiftlik",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        let record = try decoder.decode(SlaughterRecord.self, from: json)

        XCTAssertEqual(record.supplier, "DİVAN HAYVANCILIK")
        XCTAssertEqual(record.headCount, 27)
        XCTAssertEqual(record.animalType, "DÜVE")
        XCTAssertEqual(record.carcassWeight, 8692.0)
        XCTAssertEqual(record.pricePerKg, 575.0)
        XCTAssertEqual(record.totalAmount, 4_997_900.0)
        XCTAssertEqual(record.kalanTutar, 4_997_900.0)
        XCTAssertNil(record.paymentDate)
        XCTAssertEqual(record.notes, "Amasya Çiftlik")
    }

    func test_vehicle_record_json_coding_keys() throws {
        let json = """
        {
            "id": "35dafc12-49f3-662f-caf6-0d72fcf08513",
            "plate": "55 DR 992",
            "brand": "Mercedes-Benz",
            "model": "Actros 1845",
            "year": 2021,
            "active_driver": "Ahmet Yılmaz"
        }
        """.data(using: .utf8)!

        let vehicle = try JSONDecoder().decode(VehicleRecord.self, from: json)
        XCTAssertEqual(vehicle.plate, "55 DR 992")
        XCTAssertEqual(vehicle.brand, "Mercedes-Benz")
        XCTAssertEqual(vehicle.activeDriver, "Ahmet Yılmaz")
    }

    func test_cari_summary_initialization_and_hashable() {
        let summary1 = CariSummary(
            supplier: "DİVAN HAYVANCILIK",
            headCount: 59,
            carcassWeight: 18609.0,
            totalAmount: 10_661_990.0,
            pesinat: 0.0,
            kalanTutar: 10_661_990.0,
            lastSlaughterDate: "2026-08-12"
        )
        let summary2 = CariSummary(
            supplier: "DİVAN HAYVANCILIK",
            headCount: 59,
            carcassWeight: 18609.0,
            totalAmount: 10_661_990.0,
            pesinat: 0.0,
            kalanTutar: 10_661_990.0,
            lastSlaughterDate: "2026-08-12"
        )

        XCTAssertEqual(summary1.id, "DİVAN HAYVANCILIK")
        XCTAssertEqual(summary1, summary2, "CariSummary must conform to Equatable and Hashable based on properties")
    }
}
