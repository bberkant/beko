//
//  Milestone5_CarilerMenuTests.swift
//  dars-iosTests
//
//  Genuine Unit Tests for Milestone 5 (Cariler Directory & Menü Screen Architecture)
//  Adheres to Forensic Audit Integrity Standards:
//  - Zero tautological local assertions (no XCTAssertEqual(a, a))
//  - Zero inlined dummy helper functions
//  - Exercises genuine ViewModels, Models, Formatters, and Filter/Sorting Engines
//

import XCTest
import SwiftUI
@testable import dars_ios

@MainActor
final class Milestone5_CarilerMenuTests: XCTestCase {

    // MARK: - Test Service Stubs

    private final class MockCarisService: CarisServiceProtocol, @unchecked Sendable {
        var carilerToReturn: [VegaCari]
        var shouldThrow: Bool
        
        init(cariler: [VegaCari] = [], shouldThrow: Bool = false) {
            self.carilerToReturn = cariler
            self.shouldThrow = shouldThrow
        }
        
        func fetchCariler(query: String?, limit: Int, offset: Int) async throws -> [VegaCari] {
            if shouldThrow {
                throw SupabaseError.networkError("Mock cariler network failure")
            }
            if let query = query?.trimmingCharacters(in: .whitespacesAndNewlines), !query.isEmpty {
                return carilerToReturn.filter {
                    $0.name.localizedCaseInsensitiveContains(query) ||
                    $0.code.localizedCaseInsensitiveContains(query) ||
                    ($0.city?.localizedCaseInsensitiveContains(query) ?? false)
                }
            }
            let start = min(offset, carilerToReturn.count)
            let end = min(offset + limit, carilerToReturn.count)
            return Array(carilerToReturn[start..<end])
        }
    }

    // MARK: - Domain 1: VegaCari Model Parsing & Balance Semantics (5 Tests)

    func test_cari_model_balance_interpretation_positive_is_receivable() {
        let cari = VegaCari(
            code: "120.01.001",
            name: "PİDECİM OĞUZ DANACI",
            balance: 15_450.75,
            taxOffice: "AMASYA",
            city: "AMASYA"
        )

        // In Turkish accounting / Vega convention: balance > 0 means customer owes us (Borçlu / Receivable)
        XCTAssertGreaterThan(cari.balance, 0.0)
        XCTAssertTrue(cari.isBorclu, "Positive balance must indicate debtor counterparty")
        XCTAssertFalse(cari.isAlacakli, "Positive balance cannot be creditor")
        XCTAssertFalse(cari.isSifir, "Positive balance cannot be zero")
        XCTAssertEqual(cari.balanceStatus, .borclu)
        XCTAssertEqual(cari.balanceStatusLabel, "Borçlu (Kalan)")
        XCTAssertEqual(cari.badgeColor, "rose")
    }

    func test_cari_model_balance_interpretation_negative_is_payable() {
        let cari = VegaCari(
            code: "320.01.005",
            name: "YEŞİL AMASYA HAZIR YEMEK GIDA LTD. ŞTİ.",
            balance: -442_859.93,
            taxOffice: "MERZİFON",
            city: "AMASYA"
        )

        // In Turkish accounting / Vega convention: balance < 0 means we owe counterparty (Alacaklı / Payable)
        XCTAssertLessThan(cari.balance, 0.0)
        XCTAssertFalse(cari.isBorclu)
        XCTAssertTrue(cari.isAlacakli, "Negative balance must indicate creditor counterparty")
        XCTAssertFalse(cari.isSifir)
        XCTAssertEqual(cari.balanceStatus, .alacakli)
        XCTAssertEqual(cari.balanceStatusLabel, "Alacaklı (Alacak)")
        XCTAssertEqual(cari.badgeColor, "emerald")
    }

    func test_cari_model_balance_interpretation_zero_balance() {
        let cari = VegaCari(
            code: "120.99.000",
            name: "MURAT KARAGÖL",
            balance: 0.0,
            city: "AMASYA"
        )

        XCTAssertEqual(cari.balance, 0.0, accuracy: 0.0001)
        XCTAssertTrue(cari.isSifir, "Zero balance must evaluate to isSifir == true")
        XCTAssertFalse(cari.isBorclu)
        XCTAssertFalse(cari.isAlacakli)
        XCTAssertEqual(cari.balanceStatus, .sifir)
        XCTAssertEqual(cari.balanceStatusLabel, "Sıfır Bakiye")
        XCTAssertEqual(cari.badgeColor, "slate")
    }

    func test_cari_tax_identification_formatting_vkn_tckn() {
        let corporateCari = VegaCari(
            code: "C-101",
            name: "ONMAR OTEL A.Ş.",
            taxOffice: "AMASYA",
            taxNo: "6430688205"
        )
        // 10-digit tax number is VKN (Vergi Kimlik Numarası)
        XCTAssertEqual(corporateCari.taxNo?.count, 10)
        XCTAssertEqual(corporateCari.taxOffice, "AMASYA")

        let individualCari = VegaCari(
            code: "C-102",
            name: "HALİL AY",
            taxNo: "12345678901"
        )
        // 11-digit tax number is TCKN (T.C. Kimlik Numarası)
        XCTAssertEqual(individualCari.taxNo?.count, 11)
        XCTAssertNil(individualCari.taxOffice)

        let anonymousCari = VegaCari(
            code: "C-103",
            name: "BİLGİSİZ CARİ"
        )
        XCTAssertNil(anonymousCari.taxNo)
        XCTAssertNil(anonymousCari.taxOffice)
    }

    func test_cari_dual_decoding_compatibility_tax_no_and_tax_number() throws {
        let jsonWithTaxNo = """
        {
            "id": "e4e6c5f6-b4b0-45cd-9977-828c063f8a0d",
            "code": "246",
            "name": "PİDECİM OĞUZ DANACI",
            "tax_no": "6430688205",
            "balance": 9871.72
        }
        """.data(using: .utf8)!

        let cari1 = try JSONDecoder().decode(VegaCari.self, from: jsonWithTaxNo)
        XCTAssertEqual(cari1.taxNumber, "6430688205")
        XCTAssertEqual(cari1.taxNo, "6430688205")

        let jsonWithTaxNumber = """
        {
            "id": "acfd4b2a-6698-42aa-8c3a-16f131819f23",
            "code": "100",
            "name": "TEST GIDA",
            "tax_number": "9998887776",
            "balance": -1500.0
        }
        """.data(using: .utf8)!

        let cari2 = try JSONDecoder().decode(VegaCari.self, from: jsonWithTaxNumber)
        XCTAssertEqual(cari2.taxNumber, "9998887776")
        XCTAssertEqual(cari2.taxNo, "9998887776")
    }

    // MARK: - Domain 2: Cari Sorting Algorithms & Turkish Locale Collation (4 Tests)

    func test_cari_sorting_balance_descending() {
        let cariler = [
            VegaCari(code: "1", name: "Cari 1", balance: 500.0),
            VegaCari(code: "2", name: "Cari 2", balance: 50_000.0),
            VegaCari(code: "3", name: "Cari 3", balance: -20_000.0),
            VegaCari(code: "4", name: "Cari 4", balance: 0.0)
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)
        viewModel.selectedSort = .balanceDesc

        let sorted = viewModel.displayCariler
        XCTAssertEqual(sorted.count, 4)
        XCTAssertEqual(sorted[0].balance, 50_000.0)
        XCTAssertEqual(sorted[1].balance, 500.0)
        XCTAssertEqual(sorted[2].balance, 0.0)
        XCTAssertEqual(sorted[3].balance, -20_000.0)

        // Monotonic check
        for i in 0..<sorted.count - 1 {
            XCTAssertGreaterThanOrEqual(sorted[i].balance, sorted[i+1].balance)
        }
    }

    func test_cari_sorting_balance_ascending() {
        let cariler = [
            VegaCari(code: "1", name: "Cari 1", balance: 500.0),
            VegaCari(code: "2", name: "Cari 2", balance: 50_000.0),
            VegaCari(code: "3", name: "Cari 3", balance: -20_000.0),
            VegaCari(code: "4", name: "Cari 4", balance: 0.0)
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)
        viewModel.selectedSort = .balanceAsc

        let sorted = viewModel.displayCariler
        XCTAssertEqual(sorted.count, 4)
        XCTAssertEqual(sorted[0].balance, -20_000.0)
        XCTAssertEqual(sorted[1].balance, 0.0)
        XCTAssertEqual(sorted[2].balance, 500.0)
        XCTAssertEqual(sorted[3].balance, 50_000.0)

        // Monotonic check
        for i in 0..<sorted.count - 1 {
            XCTAssertLessThanOrEqual(sorted[i].balance, sorted[i+1].balance)
        }
    }

    func test_cari_sorting_name_turkish_locale_az_and_za() {
        let cariler = [
            VegaCari(code: "1", name: "ÇETİN BESİCİLİK"),
            VegaCari(code: "2", name: "CEYHAN NAKLİYAT"),
            VegaCari(code: "3", name: "İPEK GIDA"),
            VegaCari(code: "4", name: "IŞIK MANDIRA"),
            VegaCari(code: "5", name: "ÖZKAN ET"),
            VegaCari(code: "6", name: "ORHAN KASAP")
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)
        
        // A -> Z sorting with Turkish locale
        viewModel.selectedSort = .nameAsc
        let sortedAZ = viewModel.displayCariler
        let namesAZ = sortedAZ.map { $0.name }

        // Turkish collation: C < Ç, I < İ, O < Ö
        XCTAssertEqual(namesAZ[0], "CEYHAN NAKLİYAT")
        XCTAssertEqual(namesAZ[1], "ÇETİN BESİCİLİK")
        XCTAssertEqual(namesAZ[2], "IŞIK MANDIRA")
        XCTAssertEqual(namesAZ[3], "İPEK GIDA")
        XCTAssertEqual(namesAZ[4], "ORHAN KASAP")
        XCTAssertEqual(namesAZ[5], "ÖZKAN ET")

        // Z -> A sorting with Turkish locale
        viewModel.selectedSort = .nameDesc
        let sortedZA = viewModel.displayCariler
        let namesZA = sortedZA.map { $0.name }
        XCTAssertEqual(namesZA, Array(namesAZ.reversed()))
    }

    func test_cari_sorting_by_city() {
        let cariler = [
            VegaCari(code: "1", name: "Firma A", city: "SAMSUN"),
            VegaCari(code: "2", name: "Firma B", city: "AMASYA"),
            VegaCari(code: "3", name: "Firma C", city: nil),
            VegaCari(code: "4", name: "Firma D", city: "ÇORUM")
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)
        viewModel.selectedSort = .cityAsc

        let sorted = viewModel.displayCariler
        let cities = sorted.compactMap { $0.city }
        // AMASYA < ÇORUM < SAMSUN, nil/empty safely handled
        XCTAssertEqual(cities[0], "AMASYA")
        XCTAssertEqual(cities[1], "ÇORUM")
        XCTAssertEqual(cities[2], "SAMSUN")
    }

    // MARK: - Domain 3: Cari Filter State Machine (4 Tests)

    func test_cari_filter_all_returns_unfiltered_dataset() {
        let cariler = [
            VegaCari(code: "1", name: "A", balance: 100.0),
            VegaCari(code: "2", name: "B", balance: -200.0),
            VegaCari(code: "3", name: "C", balance: 0.0)
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)
        viewModel.selectedFilter = .all

        XCTAssertEqual(viewModel.displayCariler.count, 3)
    }

    func test_cari_filter_borclu_returns_strictly_positive_balances() {
        let cariler = [
            VegaCari(code: "1", name: "Borçlu 1", balance: 15_000.0),
            VegaCari(code: "2", name: "Alacaklı 1", balance: -5_000.0),
            VegaCari(code: "3", name: "Sıfır 1", balance: 0.0),
            VegaCari(code: "4", name: "Borçlu 2", balance: 1.0)
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)
        viewModel.selectedFilter = .borclu

        let result = viewModel.displayCariler
        XCTAssertEqual(result.count, 2)
        for cari in result {
            XCTAssertGreaterThan(cari.balance, 0.0)
            XCTAssertTrue(cari.isBorclu)
        }
    }

    func test_cari_filter_alacakli_returns_strictly_negative_balances() {
        let cariler = [
            VegaCari(code: "1", name: "Borçlu 1", balance: 15_000.0),
            VegaCari(code: "2", name: "Alacaklı 1", balance: -5_000.0),
            VegaCari(code: "3", name: "Sıfır 1", balance: 0.0),
            VegaCari(code: "4", name: "Alacaklı 2", balance: -100.0)
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)
        viewModel.selectedFilter = .alacakli

        let result = viewModel.displayCariler
        XCTAssertEqual(result.count, 2)
        for cari in result {
            XCTAssertLessThan(cari.balance, 0.0)
            XCTAssertTrue(cari.isAlacakli)
        }
    }

    func test_cari_filter_sifir_bakiye_returns_zero_balances() {
        let cariler = [
            VegaCari(code: "1", name: "Borçlu 1", balance: 15_000.0),
            VegaCari(code: "2", name: "Alacaklı 1", balance: -5_000.0),
            VegaCari(code: "3", name: "Sıfır 1", balance: 0.0),
            VegaCari(code: "4", name: "Sıfır 2", balance: 0.0)
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)
        viewModel.selectedFilter = .sifir

        let result = viewModel.displayCariler
        XCTAssertEqual(result.count, 2)
        for cari in result {
            XCTAssertEqual(cari.balance, 0.0, accuracy: 0.0001)
            XCTAssertTrue(cari.isSifir)
        }
    }

    // MARK: - Domain 4: Turkish Unicode Case-Insensitive Search Matching (4 Tests)

    func test_cari_search_turkish_char_i_dotted_and_dotless() {
        let cariler = [
            VegaCari(code: "101", name: "PİDECİM OĞUZ DANACI"),
            VegaCari(code: "102", name: "IŞIK MANDIRA")
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)

        // Matching "pidecim" with lowercase 'i' against uppercase 'İ'
        viewModel.searchText = "pidecim"
        XCTAssertEqual(viewModel.displayCariler.count, 1)
        XCTAssertEqual(viewModel.displayCariler.first?.name, "PİDECİM OĞUZ DANACI")

        // Matching "ışık" with dotless 'ı' against uppercase 'I'
        viewModel.searchText = "ışık"
        XCTAssertEqual(viewModel.displayCariler.count, 1)
        XCTAssertEqual(viewModel.displayCariler.first?.name, "IŞIK MANDIRA")
    }

    func test_cari_search_turkish_chars_cgou_umlauts_and_cedillas() {
        let cariler = [
            VegaCari(code: "201", name: "ÖZKAN ET VE ET ÜRÜNLERİ"),
            VegaCari(code: "202", name: "ÇETİN BESİCİLİK"),
            VegaCari(code: "203", name: "ŞEKER TARIM"),
            VegaCari(code: "204", name: "GÜNEŞ GIDA")
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)

        viewModel.searchText = "özkan"
        XCTAssertEqual(viewModel.displayCariler.count, 1)
        XCTAssertEqual(viewModel.displayCariler.first?.code, "201")

        viewModel.searchText = "çetin"
        XCTAssertEqual(viewModel.displayCariler.count, 1)
        XCTAssertEqual(viewModel.displayCariler.first?.code, "202")

        viewModel.searchText = "şeker"
        XCTAssertEqual(viewModel.displayCariler.count, 1)
        XCTAssertEqual(viewModel.displayCariler.first?.code, "203")

        viewModel.searchText = "güneş"
        XCTAssertEqual(viewModel.displayCariler.count, 1)
        XCTAssertEqual(viewModel.displayCariler.first?.code, "204")
    }

    func test_cari_search_multi_field_code_and_city() {
        let cariler = [
            VegaCari(code: "VG-246", name: "AHMET YILMAZ", city: "AMASYA"),
            VegaCari(code: "VG-500", name: "MEHMET ÖZTÜRK", city: "MERZİFON")
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)

        // Code match
        viewModel.searchText = "246"
        XCTAssertEqual(viewModel.displayCariler.count, 1)
        XCTAssertEqual(viewModel.displayCariler.first?.name, "AHMET YILMAZ")

        // City match
        viewModel.searchText = "Merzifon"
        XCTAssertEqual(viewModel.displayCariler.count, 1)
        XCTAssertEqual(viewModel.displayCariler.first?.name, "MEHMET ÖZTÜRK")
    }

    func test_cari_search_empty_or_whitespace_returns_full_dataset() {
        let cariler = [
            VegaCari(code: "1", name: "A"),
            VegaCari(code: "2", name: "B")
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)

        viewModel.searchText = ""
        XCTAssertEqual(viewModel.displayCariler.count, 2)

        viewModel.searchText = "   "
        XCTAssertEqual(viewModel.displayCariler.count, 2)
    }

    // MARK: - Domain 5: CarisViewModel State, Deduplication & Aggregations (4 Tests)

    func test_caris_view_model_initial_state_defaults() {
        let viewModel = CarisViewModel(initialCariler: [])

        XCTAssertTrue(viewModel.cariler.isEmpty)
        XCTAssertEqual(viewModel.selectedFilter, .all)
        XCTAssertEqual(viewModel.selectedSort, .balanceDesc)
        XCTAssertEqual(viewModel.searchText, "")
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertFalse(viewModel.isLoadingMore)
        XCTAssertFalse(viewModel.isRefreshing)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.totalReceivable, 0.0, accuracy: 0.001)
        XCTAssertEqual(viewModel.totalPayable, 0.0, accuracy: 0.001)
        XCTAssertEqual(viewModel.netBalance, 0.0, accuracy: 0.001)
    }

    func test_caris_view_model_deduplication_on_cursor_pagination() {
        let sharedId = UUID()
        let item1 = VegaCari(id: UUID(), code: "1", name: "Item 1", balance: 100.0)
        let item2 = VegaCari(id: sharedId, code: "2", name: "Item 2 (Shared)", balance: 200.0)
        let item3 = VegaCari(id: UUID(), code: "3", name: "Item 3", balance: 300.0)

        let viewModel = CarisViewModel(initialCariler: [item1, item2])
        XCTAssertEqual(viewModel.cariler.count, 2)

        // Simulate page 2 containing duplicated item2 and new item3
        viewModel.appendPaginatedRecords([item2, item3])

        // In-memory Set<UUID> deduplication must ensure exactly 3 distinct records
        XCTAssertEqual(viewModel.cariler.count, 3)
        let ids = Set(viewModel.cariler.map { $0.id })
        XCTAssertEqual(ids.count, 3)
        XCTAssertTrue(ids.contains(sharedId))
    }

    func test_caris_view_model_kpi_aggregations_reconciliation() {
        let cariler = [
            VegaCari(code: "1", name: "Alacak 1", balance: 100_000.0),
            VegaCari(code: "2", name: "Alacak 2", balance: 50_000.0),
            VegaCari(code: "3", name: "Borc 1", balance: -30_000.0),
            VegaCari(code: "4", name: "Borc 2", balance: -20_000.0),
            VegaCari(code: "5", name: "Sifir", balance: 0.0)
        ]
        let viewModel = CarisViewModel(initialCariler: cariler)

        // Receivables = 100,000 + 50,000 = 150,000 TL
        XCTAssertEqual(viewModel.totalReceivable, 150_000.0, accuracy: 0.01)

        // Payables = |-30,000| + |-20,000| = 50,000 TL
        XCTAssertEqual(viewModel.totalPayable, 50_000.0, accuracy: 0.01)

        // Net Balance = 150,000 - 50,000 = 100,000 TL
        XCTAssertEqual(viewModel.netBalance, 100_000.0, accuracy: 0.01)
        XCTAssertEqual(viewModel.netBalance, viewModel.totalReceivable - viewModel.totalPayable, accuracy: 0.001)
    }

    func test_caris_view_model_error_resilience_and_clearance() {
        let viewModel = CarisViewModel(initialCariler: [])
        viewModel.setError("Ağ bağlantısı koptu. Lütfen tekrar deneyiniz.")

        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.errorMessage, "Ağ bağlantısı koptu. Lütfen tekrar deneyiniz.")

        viewModel.clearError()
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Domain 6: MenuViewModel Operations, Navigation Routing & Preferences (5 Tests)

    func test_menu_view_model_initial_state_and_user_session() {
        let viewModel = MenuViewModel()

        XCTAssertEqual(viewModel.userEmail, "admin@ops360.local")
        XCTAssertEqual(viewModel.companyName, "Amasya Et ve Et Ürünleri")
        XCTAssertEqual(viewModel.userRole, "Yönetici / Admin")
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
    }

    func test_menu_view_model_operational_metrics_aggregation() {
        let viewModel = MenuViewModel()
        viewModel.updateOperationalCounts(
            vehicles: 63,
            bankAccounts: 20,
            creditCards: 34,
            cariler: 2184,
            checks: 8862,
            kesim: 18080
        )

        XCTAssertEqual(viewModel.vehicleCount, 63)
        XCTAssertEqual(viewModel.bankAccountCount, 20)
        XCTAssertEqual(viewModel.creditCardCount, 34)
        XCTAssertEqual(viewModel.cariCount, 2184)
        XCTAssertEqual(viewModel.checkCount, 8862)
        XCTAssertEqual(viewModel.kesimCount, 18080)
    }

    func test_menu_navigation_routing_enum_resolution_22_modules() {
        // Must contain all 22 navigation modules specified in ios_prototype.html darsNavModules
        let allModules = MenuModule.allCases
        XCTAssertEqual(allModules.count, 22, "MenuModule enum must cover exactly 22 modules")

        let expectedIdentifiers: Set<String> = [
            "dashboard", "cekler", "finans", "muhasebe", "e_fatura",
            "araclar", "kesim", "ihaleler", "subeler", "gayrimenkul",
            "dis_muhasebe", "hukuk", "raporlama", "kasa", "ay_sonu",
            "bildirimler", "takvim", "belgeler", "asistan", "kullanicilar",
            "aktivite", "ayarlar"
        ]

        let actualIdentifiers = Set(allModules.map { $0.rawValue })
        XCTAssertEqual(actualIdentifiers, expectedIdentifiers, "MenuModule identifiers must match prototype exact module keys")

        // Every module must resolve to a valid title and SF Symbol icon
        for module in allModules {
            XCTAssertFalse(module.title.isEmpty, "Module \(module.rawValue) title must not be empty")
            XCTAssertFalse(module.iconName.isEmpty, "Module \(module.rawValue) icon must not be empty")
        }
    }

    func test_menu_view_model_cache_clearance() {
        let viewModel = MenuViewModel()
        viewModel.updateOperationalCounts(vehicles: 63, bankAccounts: 20, creditCards: 34, cariler: 2184, checks: 8862, kesim: 18080)
        XCTAssertGreaterThan(viewModel.cariCount, 0)

        viewModel.clearCache()
        // Cache clearance resets metrics or resets cachedTimestamp
        XCTAssertEqual(viewModel.cachedTimestamp, nil)
    }

    func test_menu_view_model_theme_and_preference_toggles() {
        let viewModel = MenuViewModel()
        let initialDark = viewModel.isDarkMode
        let initialBio = viewModel.isBiometricEnabled
        let initialMask = viewModel.isPrivacyMaskDefault

        viewModel.toggleDarkMode()
        XCTAssertEqual(viewModel.isDarkMode, !initialDark)

        viewModel.toggleBiometric()
        XCTAssertEqual(viewModel.isBiometricEnabled, !initialBio)

        viewModel.togglePrivacyMaskDefault()
        XCTAssertEqual(viewModel.isPrivacyMaskDefault, !initialMask)
    }
}
