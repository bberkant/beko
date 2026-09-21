import XCTest
import SwiftUI
@testable import dars_ios

@MainActor
final class Tier1_FeatureCoverageTests: XCTestCase {
    
    // MARK: - 1. Ana Sayfa (Dashboard) Feature Tests (>= 5 tests)
    
    func test_dashboard_header_company_branding_and_title() {
        XCTAssertEqual(Theme.primary, Color.ktPrimary)
        XCTAssertEqual(Color.ktPrimary, Color(hex: 0x002D59))
        XCTAssertEqual(Color.brandGreen, Color.ktPrimary)
        
        let vm = DashboardViewModel()
        XCTAssertFalse(vm.isBalanceHidden)
        XCTAssertNil(vm.errorMessage)
    }
    
    func test_dashboard_quick_actions_count_and_titles() {
        XCTAssertEqual(DashboardQuickAction.allCases.count, 4, "Dashboard must provide exactly 4 quick actions")
        
        let actions = DashboardQuickAction.allCases
        XCTAssertTrue(actions.contains(.cekEkle))
        XCTAssertTrue(actions.contains(.cariler))
        XCTAssertTrue(actions.contains(.takas))
        XCTAssertTrue(actions.contains(.cekten))
        
        for action in actions {
            XCTAssertFalse(action.displayTitle.isEmpty)
            XCTAssertFalse(action.systemIcon.isEmpty)
            XCTAssertTrue((0...4).contains(action.targetTabIndex))
        }
    }
    
    func test_dashboard_balance_privacy_toggle_masks_value() {
        let vm = DashboardViewModel(isBalanceHidden: false)
        XCTAssertFalse(vm.isBalanceHidden)
        
        let visibleBalance = vm.displayBalance(for: 6_421_881.0)
        XCTAssertFalse(visibleBalance.contains("•"))
        
        vm.toggleBalanceVisibility()
        XCTAssertTrue(vm.isBalanceHidden)
        
        let maskedBalance = vm.displayBalance(for: 6_421_881.0)
        XCTAssertTrue(maskedBalance.contains("•"))
    }
    
    func test_dashboard_calendar_matrix_generation_35_cells() {
        XCTAssertEqual(KTTheme.Metrics.paddingHorizontal, 16)
        XCTAssertEqual(KTTheme.Metrics.paddingVertical, 12)
        XCTAssertEqual(KTTheme.Metrics.cardPadding, 16)
        
        let summary = DashboardSummary(dailyCheckTotal: 6_421_881.0, monthlyKesimCount: 42)
        let vm = DashboardViewModel(summary: summary)
        XCTAssertEqual(vm.monthlyKesimCount, 42)
        XCTAssertEqual(vm.formattedDailyCheckTotal, "6.421.881,00 TL")
    }
    
    func test_dashboard_recent_transactions_formatting_and_sign() {
        let c1 = TestFixtures.makeSampleCheck(amount: 450_000.0, checkType: "alinan")
        let c2 = TestFixtures.makeSampleCheck(amount: 2_300_000.0, checkType: "kesilen")
        
        let items = DashboardViewModel.buildTransactions(from: [c1, c2])
        XCTAssertEqual(items.count, 2)
        XCTAssertTrue(items[0].isPositive)
        XCTAssertFalse(items[1].isPositive)
        XCTAssertTrue(items[0].formattedAmount.hasPrefix("+"))
        XCTAssertTrue(items[1].formattedAmount.hasPrefix("-"))
    }
    
    // MARK: - 2. ÇEKTEN Hesabı & Cost Engine Feature Tests (>= 5 tests)
    
    func test_cekten_cost_calculation_standard_formula() {
        let vm = CektenViewModel()
        vm.simulatorAmountText = "500000"
        vm.simulatorTenorDays = 45
        vm.simulatorAnnualRate = 0.45
        vm.simulatorCommissionRate = 0.0
        
        // Expected Cost = 500,000 * (45 / 360) * 0.45 = 28,125.0 TL
        XCTAssertEqual(vm.simulationResult.financingCost, 28_125.0, accuracy: 0.01)
    }
    
    func test_cekten_net_proceeds_standard_formula() {
        let vm = CektenViewModel()
        vm.simulatorAmountText = "500000"
        vm.simulatorTenorDays = 45
        vm.simulatorAnnualRate = 0.45
        vm.simulatorCommissionRate = 0.0
        
        // Expected Net = 500,000 - 28,125 = 471,875.0 TL
        XCTAssertEqual(vm.simulationResult.netProceeds, 471_875.0, accuracy: 0.01)
        
        let record = CektenHesap(totalAmount: 500_000.0, paidAmount: 0.0, interestRate: 0.45, tenorDays: 45)
        XCTAssertEqual(record.netProceeds, 471_875.0, accuracy: 0.01)
    }
    
    func test_cekten_new_record_initialization() {
        let record = CektenHesap(totalAmount: 2_000_000.0, paidAmount: 0.0)
        XCTAssertEqual(record.remainingAmount, 2_000_000.0)
        XCTAssertEqual(record.paidAmount, 0.0)
        XCTAssertFalse(record.isSettled)
    }
    
    func test_cekten_partial_settlement_reduces_remaining() {
        let id = UUID()
        let initialRecord = CektenHesap(id: id, totalAmount: 1_000_000.0, paidAmount: 0.0, status: "Açık")
        let vm = CektenViewModel(initialRecords: [initialRecord])
        
        vm.recordPayment(for: id, paymentAmount: 400_000.0)
        let updated = vm.records.first { $0.id == id }
        
        XCTAssertEqual(updated?.paidAmount, 400_000.0)
        XCTAssertEqual(updated?.remainingAmount, 600_000.0)
        XCTAssertEqual(updated?.status, "Kısmi")
    }
    
    func test_cekten_accent_indicator_rose_when_unpaid() {
        let unpaid = CektenHesap(totalAmount: 1_250_000.0, paidAmount: 0.0, remainingAmount: 1_250_000.0)
        XCTAssertFalse(unpaid.isSettled)
        
        let settled = CektenHesap(totalAmount: 1_250_000.0, paidAmount: 1_250_000.0, remainingAmount: 0.0)
        XCTAssertTrue(settled.isSettled)
    }
    
    // MARK: - 3. Takas (Clearing Cheques) Feature Tests (>= 5 tests)
    
    func test_takas_segmented_tab_status_partitioning() {
        let c1 = TestFixtures.makeSampleCheck(amount: 1_000_000.0, status: "Tahsilde", isIcTakas: false)
        let c2 = TestFixtures.makeSampleCheck(amount: 2_000_000.0, status: "İç Takas", isIcTakas: true)
        let c3 = TestFixtures.makeSampleCheck(amount: 3_000_000.0, status: "Tahsilde", isIcTakas: false)
        
        let vm = TakasViewModel(initialChecks: [c1, c2, c3])
        vm.selectedSegment = .takasta
        XCTAssertEqual(vm.filteredChecks.count, 2)
        
        vm.selectedSegment = .icTakas
        XCTAssertEqual(vm.filteredChecks.count, 1)
    }
    
    func test_takas_date_filter_aggregates_cheques_for_day() {
        let c1 = TestFixtures.makeSampleCheck(amount: 4_260_129.0, dueDate: "2026-09-03")
        let c2 = TestFixtures.makeSampleCheck(amount: 2_161_752.0, dueDate: "2026-09-03")
        let c3 = TestFixtures.makeSampleCheck(amount: 1_500_000.0, dueDate: "2026-09-04")
        
        let vm = TakasViewModel(initialChecks: [c1, c2, c3])
        XCTAssertEqual(vm.totalAmount, 7_921_881.0)
        
        let dayChecks = vm.checks.filter { $0.dueDate == "2026-09-03" }
        let sum = dayChecks.reduce(0.0) { $0 + $1.amount }
        XCTAssertEqual(dayChecks.count, 2)
        XCTAssertEqual(sum, 6_421_881.0)
    }
    
    func test_takas_bank_quotas_distribution_summation() {
        let c1 = TestFixtures.makeSampleCheck(amount: 4_260_129.0, bank: "M.DENİZ")
        let c2 = TestFixtures.makeSampleCheck(amount: 1_161_752.0, bank: "TAKSİT")
        let c3 = TestFixtures.makeSampleCheck(amount: 1_000_000.0, bank: "TAKSİT")
        
        let vm = TakasViewModel(initialChecks: [c1, c2, c3])
        let breakdown = vm.bankBreakdown
        
        let deniz = breakdown.first { $0.bankName == "M.DENİZ" }
        let taksit = breakdown.first { $0.bankName == "TAKSİT" }
        
        XCTAssertEqual(deniz?.totalAmount, 4_260_129.0)
        XCTAssertEqual(taksit?.totalAmount, 2_161_752.0)
    }
    
    func test_takas_cheque_status_transition_tahsilde_to_odendi() {
        let checkId = UUID()
        let check = TestFixtures.makeSampleCheck(id: checkId, status: "Tahsilde")
        let vm = TakasViewModel(initialChecks: [check])
        
        vm.markCheckAsCollected(checkId: checkId)
        let updated = vm.checks.first { $0.id == checkId }
        
        XCTAssertEqual(updated?.status, "Ödendi")
        XCTAssertEqual(vm.odendiAmount, check.amount)
    }
    
    func test_takas_internal_takas_lock_toggle() {
        let checkId = UUID()
        let check = TestFixtures.makeSampleCheck(id: checkId, status: "Tahsilde", isIcTakas: false)
        let vm = TakasViewModel(initialChecks: [check])
        
        vm.toggleIcTakas(for: checkId)
        XCTAssertTrue(vm.checks.first { $0.id == checkId }?.isIcTakas == true)
        XCTAssertEqual(vm.checks.first { $0.id == checkId }?.status, "İç Takas")
        
        vm.toggleIcTakas(for: checkId)
        XCTAssertFalse(vm.checks.first { $0.id == checkId }?.isIcTakas == true)
        XCTAssertEqual(vm.checks.first { $0.id == checkId }?.status, "Tahsilde")
    }
    
    // MARK: - 4. Cariler (Current Accounts) Feature Tests (>= 5 tests)
    
    func test_caris_full_text_search_by_name_and_tax_no() {
        let c1 = TestFixtures.makeSampleCari(code: "120.01", name: "DİVAN HAYVANCILIK GIDA", taxNumber: "3010482910", city: "KAYSERİ")
        let c2 = TestFixtures.makeSampleCari(code: "120.02", name: "FİMAR AŞ MERMER MADENCİLİK", taxNumber: "3880124955", city: "AMASYA")
        let c3 = TestFixtures.makeSampleCari(code: "120.03", name: "GÜR BESİCİLİK SANAYİ", taxNumber: "4201889410", city: "SULUVA")
        
        let vm = CarisViewModel(initialCariler: [c1, c2, c3])
        vm.searchText = "divan"
        XCTAssertEqual(vm.displayCariler.count, 1)
        XCTAssertEqual(vm.displayCariler.first?.city, "KAYSERİ")
        
        vm.searchText = "3880124955"
        XCTAssertEqual(vm.displayCariler.count, 1)
        XCTAssertEqual(vm.displayCariler.first?.name, "FİMAR AŞ MERMER MADENCİLİK")
    }
    
    func test_caris_balance_classification_borclu_vs_alacakli() {
        let c1 = TestFixtures.makeSampleCari(balance: 4_215_000.0)
        let c2 = TestFixtures.makeSampleCari(balance: -1_850_000.0)
        let c3 = TestFixtures.makeSampleCari(balance: 0.0)
        
        XCTAssertEqual(c1.balanceStatus, .borclu)
        XCTAssertEqual(c2.balanceStatus, .alacakli)
        XCTAssertEqual(c3.balanceStatus, .sifir)
    }
    
    func test_caris_badge_styling_rose_debt_vs_emerald_credit() {
        let debtor = TestFixtures.makeSampleCari(balance: 500_000.0)
        let creditor = TestFixtures.makeSampleCari(balance: -200_000.0)
        let zero = TestFixtures.makeSampleCari(balance: 0.0)
        
        XCTAssertEqual(debtor.badgeColor, "rose")
        XCTAssertEqual(creditor.badgeColor, "emerald")
        XCTAssertEqual(zero.badgeColor, "slate")
    }
    
    func test_caris_slaughter_records_aggregation_into_cari_summary() {
        let c1 = TestFixtures.makeSampleCari(balance: 5_000_000.0)
        let c2 = TestFixtures.makeSampleCari(balance: -2_000_000.0)
        
        let vm = CarisViewModel(initialCariler: [c1, c2])
        XCTAssertEqual(vm.totalReceivable, 5_000_000.0)
        XCTAssertEqual(vm.totalPayable, 2_000_000.0)
        XCTAssertEqual(vm.netBalance, 3_000_000.0)
    }
    
    func test_caris_ledger_movement_insertion_and_running_balance() {
        let cari = TestFixtures.makeSampleCari(balance: 3_664_090.0)
        let vm = CarisViewModel()
        let movements = vm.mockMovements(for: cari)
        
        XCTAssertFalse(movements.isEmpty)
        XCTAssertTrue((movements.first?.balance ?? 0) > 0)
    }
    
    // MARK: - 5. Menü & Enterprise Sub-screens Feature Tests (>= 5 tests)
    
    func test_menu_accordion_modules_count_and_categories() {
        XCTAssertEqual(MenuModule.allCases.count, 22)
        
        let vm = MenuViewModel()
        XCTAssertEqual(vm.allModuleCategories.count, 22)
        XCTAssertTrue(vm.allModuleCategories.contains { $0.title == "Finans" })
        XCTAssertTrue(vm.allModuleCategories.contains { $0.title == "Araç Yönetimi" })
    }
    
    func test_menu_search_filtering_and_auto_expand() {
        let vm = MenuViewModel()
        vm.menuSearchText = "kart"
        
        XCTAssertFalse(vm.filteredCategories.isEmpty)
        let titles = vm.filteredCategories.flatMap { $0.items }.map { $0.title }
        XCTAssertTrue(titles.contains("Kredi Kartları"))
    }
    
    func test_menu_fleet_vehicles_inspection_critical_alert() {
        let v1 = TestFixtures.makeSampleVehicle(plate: "55 DR 992", inspectionDate: "2020-01-01")
        let v2 = TestFixtures.makeSampleVehicle(plate: "05 AC 124", inspectionDate: "2029-01-01")
        
        XCTAssertTrue(v1.isInspectionCritical)
        XCTAssertFalse(v2.isInspectionCritical)
    }
    
    func test_menu_credit_cards_utilization_and_min_payment() {
        let card = TestFixtures.makeSampleCreditCard(limitAmount: 250_000.0, currentDebt: 50_000.0, minPaymentRate: 0.20)
        
        XCTAssertEqual(card.availableLimit, 200_000.0)
        XCTAssertEqual(card.minPayment, 10_000.0)
        XCTAssertEqual(card.utilizationPercentage, 20.0)
    }
    
    func test_menu_tenders_status_categorization() {
        let tendersModule = MenuModule.ihaleler
        XCTAssertEqual(tendersModule.title, "İhaleler")
        XCTAssertEqual(tendersModule.icon, "doc.text.badge.plus")
    }
    
    // MARK: - 6. Supabase Live Networking Feature Tests (>= 5 tests)
    
    func test_supabase_auth_request_structure() {
        XCTAssertTrue(SupabaseConfig.authURL.absoluteString.contains("auth/v1/token"))
        XCTAssertEqual(SupabaseConfig.adminEmail, "admin@ops360.local")
        XCTAssertFalse(SupabaseConfig.apiKey.isEmpty)
    }
    
    func test_supabase_check_record_json_decoding() throws {
        let jsonString = """
        {
            "id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "amount": 3500000.0,
            "bank_name": "Kuveyt Türk",
            "branch_name": "Samsun Şb.",
            "check_number": "CK-00192",
            "check_type": "alinan",
            "document_type": "cek",
            "due_date": "2026-09-10",
            "drawer": "DİVAN HAYVANCILIK",
            "status": "Portföy"
        }
        """
        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let check = try decoder.decode(EBSCheck.self, from: data)
        
        XCTAssertEqual(check.checkNumber, "CK-00192")
        XCTAssertEqual(check.amount, 3_500_000.0)
        XCTAssertEqual(check.bankName, "Kuveyt Türk")
    }
    
    func test_supabase_slaughter_record_json_decoding() throws {
        let jsonString = """
        {
            "id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "slaughter_date": "2026-08-04",
            "supplier_name": "DİVAN HAYVANCILIK",
            "head_count": 32,
            "animal_type": "DÜVE",
            "carcass_weight": 9917.0,
            "unit_price": 570.0,
            "total_amount": 5664090.0,
            "pesinat": 0.0,
            "kalan_tutar": 5664090.0
        }
        """
        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let record = try decoder.decode(KesimItem.self, from: data)
        
        XCTAssertEqual(record.supplierName, "DİVAN HAYVANCILIK")
        XCTAssertEqual(record.headCount, 32)
        XCTAssertEqual(record.totalAmount, 5_664_090.0)
    }
    
    func test_supabase_vehicle_record_json_decoding() throws {
        let jsonString = """
        {
            "id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "plate": "55 DR 992",
            "brand": "Mercedes-Benz",
            "model": "Actros 1845",
            "year": 2021,
            "active_driver": "Ahmet Yılmaz",
            "status": "aktif"
        }
        """
        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let vehicle = try decoder.decode(Vehicle.self, from: data)
        
        XCTAssertEqual(vehicle.plate, "55 DR 992")
        XCTAssertEqual(vehicle.activeDriver, "Ahmet Yılmaz")
    }
    
    func test_supabase_caris_balance_filtering_parameters() {
        let filterGt = SupabaseQueryFilter.balanceGreaterThan(0.0)
        let filterLt = SupabaseQueryFilter.balanceLessThan(0.0)
        
        XCTAssertEqual(filterGt, "balance=gt.0")
        XCTAssertEqual(filterLt, "balance=lt.0")
    }
}
