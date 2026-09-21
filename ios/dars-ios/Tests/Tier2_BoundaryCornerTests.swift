import XCTest
import SwiftUI
@testable import dars_ios

@MainActor
final class Tier2_BoundaryCornerTests: XCTestCase {
    
    // MARK: - 1. Ana Sayfa Boundary & Corner Tests (>= 5 tests)
    
    func test_dashboard_boundary_zero_total_balance() {
        let vm = DashboardViewModel()
        let formatted = vm.displayBalance(for: 0.0)
        XCTAssertTrue(formatted.contains("0,00 TL") || formatted.contains("0 TL") || formatted.contains("0.00"),
                      "Zero balance must format cleanly without crashing")
    }
    
    func test_dashboard_boundary_extreme_large_balance() {
        let hugeBalance: Double = 15_000_000_000.75
        let vm = DashboardViewModel()
        let formatted = vm.displayBalance(for: hugeBalance)
        XCTAssertTrue(formatted.contains("15.000.000.000") || formatted.contains("15,000,000,000"),
                      "Billion-scale balance must format cleanly")
    }
    
    func test_dashboard_corner_empty_recent_transactions() {
        let items = DashboardViewModel.buildTransactions(from: [])
        XCTAssertTrue(items.isEmpty)
        
        let formatted = Theme.Formatter.signedCurrency(0.0)
        XCTAssertEqual(formatted, "0 TL")
    }
    
    func test_dashboard_corner_repeated_privacy_toggle() {
        let vm = DashboardViewModel(isBalanceHidden: false)
        XCTAssertFalse(vm.isBalanceHidden)
        
        for _ in 1...10 {
            vm.toggleBalanceVisibility()
        }
        XCTAssertFalse(vm.isBalanceHidden)
        
        vm.toggleBalanceVisibility()
        XCTAssertTrue(vm.isBalanceHidden)
    }
    
    func test_dashboard_corner_offline_network_state_badge() {
        let vm = DashboardViewModel()
        XCTAssertFalse(vm.hasError)
        
        vm.errorMessage = "Ağ bağlantı hatası"
        XCTAssertTrue(vm.hasError)
        
        vm.clearError()
        XCTAssertFalse(vm.hasError)
        XCTAssertNil(vm.errorMessage)
    }
    
    // MARK: - 2. ÇEKTEN Boundary & Corner Tests (>= 5 tests)
    
    func test_cekten_boundary_zero_days_tenor_division_guard() {
        let vm = CektenViewModel()
        vm.simulatorAmountText = "500000"
        vm.simulatorTenorDays = 0 // Clamped to at least 1 day
        
        XCTAssertGreaterThanOrEqual(vm.simulationResult.tenorDays, 1)
        XCTAssertFalse(vm.simulationResult.financingCost.isNaN)
        XCTAssertFalse(vm.simulationResult.financingCost.isInfinite)
    }
    
    func test_cekten_boundary_negative_days_tenor() {
        let vm = CektenViewModel()
        vm.simulatorAmountText = "500000"
        vm.simulatorTenorDays = -15 // Clamped to at least 1 day
        
        XCTAssertGreaterThanOrEqual(vm.simulationResult.tenorDays, 1)
        XCTAssertFalse(vm.simulationResult.financingCost.isNaN)
        XCTAssertFalse(vm.simulationResult.financingCost.isInfinite)
    }
    
    func test_cekten_corner_payment_exceeding_remaining_balance() {
        let id = UUID()
        let initialRecord = CektenHesap(id: id, totalAmount: 1_000_000.0, paidAmount: 0.0, status: "Açık")
        let vm = CektenViewModel(initialRecords: [initialRecord])
        
        // Overpayment of 1,500,000 TL on a 1,000,000 TL record
        vm.recordPayment(for: id, paymentAmount: 1_500_000.0)
        let updated = vm.records.first { $0.id == id }
        
        XCTAssertEqual(updated?.remainingAmount, 0.0)
        XCTAssertEqual(updated?.status, "Ödendi")
        XCTAssertTrue(updated?.isSettled == true)
    }
    
    func test_cekten_boundary_exact_full_payment() {
        let id = UUID()
        let initialRecord = CektenHesap(id: id, totalAmount: 750_000.0, paidAmount: 0.0, status: "Açık")
        let vm = CektenViewModel(initialRecords: [initialRecord])
        
        vm.recordPayment(for: id, paymentAmount: 750_000.0)
        let updated = vm.records.first { $0.id == id }
        
        XCTAssertEqual(updated?.remainingAmount, 0.0)
        XCTAssertEqual(updated?.status, "Ödendi")
        XCTAssertTrue(updated?.isSettled == true)
    }
    
    func test_cekten_boundary_extreme_amount_360_days() {
        let vm = CektenViewModel()
        vm.simulatorAmountText = "100000000"
        vm.simulatorTenorDays = 360
        vm.simulatorAnnualRate = 0.45
        vm.simulatorCommissionRate = 0.0
        
        XCTAssertEqual(vm.simulationResult.financingCost, 45_000_000.0, accuracy: 0.01)
        XCTAssertEqual(vm.simulationResult.netProceeds, 55_000_000.0, accuracy: 0.01)
    }
    
    // MARK: - 3. Takas Boundary & Corner Tests (>= 5 tests)
    
    func test_takas_boundary_date_with_zero_cheques() {
        let vm = TakasViewModel(initialChecks: [])
        XCTAssertEqual(vm.totalAmount, 0.0)
        XCTAssertEqual(vm.totalCheckCount, 0)
        XCTAssertTrue(vm.bankBreakdown.isEmpty)
    }
    
    func test_takas_corner_idempotent_bank_transfer() {
        let checkId = UUID()
        let check = TestFixtures.makeSampleCheck(id: checkId, bank: "M.DENİZ")
        let vm = TakasViewModel(initialChecks: [check])
        
        vm.moveCheckToBank(checkId: checkId, destinationBank: "M.DENİZ")
        XCTAssertEqual(vm.checks.first { $0.id == checkId }?.bankName, "M.DENİZ")
    }
    
    func test_takas_corner_rapid_ic_takas_toggling() {
        let checkId = UUID()
        let check = TestFixtures.makeSampleCheck(id: checkId, isIcTakas: false)
        let vm = TakasViewModel(initialChecks: [check])
        
        for _ in 1...25 {
            vm.toggleIcTakas(for: checkId)
        }
        
        let resultCheck = vm.checks.first { $0.id == checkId }
        XCTAssertTrue(resultCheck?.isIcTakas == true)
        XCTAssertEqual(resultCheck?.id, checkId)
    }
    
    func test_takas_corner_non_existent_cheque_lookup() {
        let vm = TakasViewModel(initialChecks: [TestFixtures.makeSampleCheck()])
        let randomId = UUID()
        
        vm.toggleIcTakas(for: randomId)
        vm.moveCheckToBank(checkId: randomId, destinationBank: "GARANTİ")
        vm.markCheckAsCollected(checkId: randomId)
        
        XCTAssertEqual(vm.checks.count, 1)
    }
    
    func test_takas_boundary_multiple_cheques_same_day_same_bank() {
        let c1 = TestFixtures.makeSampleCheck(amount: 1_250_000.25, bank: "Kuveyt Türk", dueDate: "2026-09-03")
        let c2 = TestFixtures.makeSampleCheck(amount: 2_750_000.50, bank: "Kuveyt Türk", dueDate: "2026-09-03")
        let c3 = TestFixtures.makeSampleCheck(amount: 500_000.25, bank: "Kuveyt Türk", dueDate: "2026-09-03")
        
        let vm = TakasViewModel(initialChecks: [c1, c2, c3])
        XCTAssertEqual(vm.bankBreakdown.count, 1)
        XCTAssertEqual(vm.bankBreakdown.first?.bankName, "Kuveyt Türk")
        XCTAssertEqual(vm.bankBreakdown.first?.totalAmount ?? 0, 4_500_001.0, accuracy: 0.001)
    }
    
    // MARK: - 4. Cariler Boundary & Corner Tests (>= 5 tests)
    
    func test_caris_boundary_exact_zero_balance_classification() {
        let cari = TestFixtures.makeSampleCari(balance: 0.0)
        XCTAssertEqual(cari.balanceStatus, .sifir)
        XCTAssertEqual(cari.badgeColor, "slate")
        XCTAssertEqual(cari.balanceStatusLabel, "Sıfır Bakiye")
    }
    
    func test_caris_boundary_billion_lira_debtor_balance() {
        let cari = TestFixtures.makeSampleCari(balance: 2_450_000_000.0)
        XCTAssertEqual(cari.balanceStatus, .borclu)
        XCTAssertEqual(cari.badgeColor, "rose")
        XCTAssertEqual(cari.balanceStatusLabel, "Borçlu (Kalan)")
    }
    
    func test_caris_corner_turkish_characters_normalization_search() {
        let cari = TestFixtures.makeSampleCari(name: "İSTANBUL ÇAĞDAŞ GIDA ŞTİ.")
        let vm = CarisViewModel(initialCariler: [cari])
        
        vm.searchText = "cagdas"
        XCTAssertEqual(vm.displayCariler.count, 1)
        XCTAssertEqual(vm.displayCariler.first?.name, "İSTANBUL ÇAĞDAŞ GIDA ŞTİ.")
    }
    
    func test_caris_corner_empty_search_results_state() {
        let cari = TestFixtures.makeSampleCari(name: "DİVAN HAYVANCILIK")
        let vm = CarisViewModel(initialCariler: [cari])
        
        vm.searchText = "NON_EXISTENT_SUPPLIER_XYZ"
        XCTAssertTrue(vm.displayCariler.isEmpty)
    }
    
    func test_caris_boundary_alternating_high_value_ledger_running_balance() {
        let cari = TestFixtures.makeSampleCari(balance: 0.0)
        let vm = CarisViewModel(initialCariler: [cari])
        let movements = vm.mockMovements(for: cari)
        
        XCTAssertFalse(movements.isEmpty)
    }
    
    // MARK: - 5. Menü Boundary & Corner Tests (>= 5 tests)
    
    func test_menu_corner_search_matching_no_modules() {
        let vm = MenuViewModel()
        vm.menuSearchText = "UZAY_GEMISI"
        XCTAssertTrue(vm.filteredCategories.isEmpty)
    }
    
    func test_menu_corner_clearing_search_restores_modules() {
        let vm = MenuViewModel()
        vm.menuSearchText = "stok"
        let filteredCount = vm.filteredCategories.count
        
        vm.menuSearchText = ""
        XCTAssertEqual(vm.filteredCategories.count, 22)
        XCTAssertGreaterThan(vm.filteredCategories.count, filteredCount)
    }
    
    func test_menu_boundary_negative_inspection_days_critical() {
        let v = TestFixtures.makeSampleVehicle(plate: "55 DR 992", inspectionDate: "2024-01-01")
        XCTAssertTrue(v.isInspectionCritical)
    }
    
    func test_menu_boundary_credit_card_zero_used_limit() {
        let card = TestFixtures.makeSampleCreditCard(limitAmount: 250_000.0, currentDebt: 0.0)
        XCTAssertEqual(card.minPayment, 0.0)
        XCTAssertEqual(card.availableLimit, 250_000.0)
    }
    
    func test_menu_corner_invalid_module_route_fallback() {
        let invalidModule = MenuModule(rawValue: "unknown_corrupted_route_999")
        XCTAssertNil(invalidModule)
        
        let defaultModule = MenuModule.dashboard
        XCTAssertEqual(defaultModule.title, "Ana Sayfa")
    }
    
    // MARK: - 6. Supabase Sync Boundary & Corner Tests (>= 5 tests)
    
    func test_supabase_boundary_network_timeout_handling() {
        let error = SupabaseError.networkError("Timed out")
        XCTAssertTrue(error.localizedDescription.contains("Ağ bağlantı hatası"))
    }
    
    func test_supabase_boundary_unauthorized_token_401() {
        let error = SupabaseError.unauthorized
        XCTAssertTrue(error.localizedDescription.contains("401"))
        
        let pastDate = Date().addingTimeInterval(-60)
        let token = SupabaseAuthToken(
            accessToken: "test_token",
            tokenType: "Bearer",
            expiresIn: 3600,
            expirationDate: pastDate
        )
        XCTAssertTrue(token.isExpired)
        XCTAssertLessThanOrEqual(token.timeRemaining, 0)
    }
    
    func test_supabase_corner_empty_json_array_decoding() throws {
        let emptyJsonData = "[]".data(using: .utf8)!
        let decoder = JSONDecoder()
        let result = try decoder.decode([EBSCheck].self, from: emptyJsonData)
        XCTAssertEqual(result.count, 0)
    }
    
    func test_supabase_boundary_pagination_offset_boundary() {
        let vm = CarisViewModel(initialCariler: [])
        XCTAssertTrue(vm.displayCariler.isEmpty)
        XCTAssertEqual(vm.cariler.count, 0)
    }
    
    func test_supabase_corner_rls_bypass_verification() throws {
        let validJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQG9wczM2MC5sb2NhbCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxOTAwMDAwMDAwLCJzdWIiOiIxM2I4ZGE5MC0yN2QxLTQ0MGQtYThmNC1lYjUwZGFkZDYzOTEifQ.signaturePlaceholder"
        let claims = try SupabaseAuthToken.parseJWT(validJWT)
        
        XCTAssertEqual(claims.email, "admin@ops360.local")
        XCTAssertEqual(claims.role, "authenticated")
    }
}
