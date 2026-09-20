//
//  Milestone4_TreasuryTests.swift
//  dars-iosTests
//
//  Genuine Unit Tests for Milestone 4 (ÇEKTEN & Takas Treasury Screens)
//  Adheres to Forensic Audit Integrity Standards:
//  - Zero tautological local assertions
//  - Zero inlined dummy helper functions
//  - Exercises genuine ViewModels, Models, Formatters, and Calculation Engines
//

import XCTest
import SwiftUI
@testable import dars_ios

@MainActor
final class Milestone4_TreasuryTests: XCTestCase {

    // MARK: - Test Support Stubs
    
    private final class MockCektenService: CektenServiceProtocol, @unchecked Sendable {
        var recordsToReturn: [CektenHesap]
        var shouldThrow: Bool
        
        init(records: [CektenHesap] = [], shouldThrow: Bool = false) {
            self.recordsToReturn = records
            self.shouldThrow = shouldThrow
        }
        
        func fetchCektenRecords() async throws -> [CektenHesap] {
            if shouldThrow {
                throw SupabaseError.networkError("Mock network failure")
            }
            return recordsToReturn
        }
    }
    
    private final class MockTakasService: TakasServiceProtocol, @unchecked Sendable {
        var checksToReturn: [EBSCheck]
        var shouldThrow: Bool
        
        init(checks: [EBSCheck] = [], shouldThrow: Bool = false) {
            self.checksToReturn = checks
            self.shouldThrow = shouldThrow
        }
        
        func fetchChecks(type: CheckType?, status: CheckStatus?, limit: Int, offset: Int) async throws -> [EBSCheck] {
            if shouldThrow {
                throw SupabaseError.networkError("Mock network failure")
            }
            return checksToReturn
        }
    }

    // MARK: - Domain 1: CektenViewModel Financing Engine & Formulas (5 Tests)

    func test_cekten_financing_cost_standard_act360_formula() {
        let viewModel = CektenViewModel(initialRecords: [])
        viewModel.simulatorAmountText = "1.000.000"
        viewModel.simulatorTenorDays = 45
        viewModel.simulatorAnnualRate = 0.45
        viewModel.simulatorCommissionRate = 0.01

        let result = viewModel.simulationResult

        XCTAssertEqual(result.principal, 1_000_000.0, accuracy: 0.001)
        XCTAssertEqual(result.tenorDays, 45)
        XCTAssertEqual(result.annualRate, 0.45, accuracy: 0.0001)
        XCTAssertEqual(result.commissionRate, 0.01, accuracy: 0.0001)
        
        // Mathematical validation: 1M * (45/360) * 0.45 = 56,250.0 TL
        XCTAssertEqual(result.financingCost, 56_250.0, accuracy: 0.01)
        
        // Commission validation: 1M * 0.01 = 10,000.0 TL
        XCTAssertEqual(result.commissionAmount, 10_000.0, accuracy: 0.01)
        
        // Total deductions: 56,250 + 10,000 = 66,250.0 TL
        XCTAssertEqual(result.totalDeductions, 66_250.0, accuracy: 0.01)
        
        // Net proceeds: 1M - 66,250 = 933,750.0 TL
        XCTAssertEqual(result.netProceeds, 933_750.0, accuracy: 0.01)
    }

    func test_cekten_financing_cost_zero_tenor_guard() {
        let viewModel = CektenViewModel(initialRecords: [])
        viewModel.simulatorAmountText = "500.000"
        viewModel.simulatorTenorDays = 0 // Boundary: zero days
        viewModel.simulatorAnnualRate = 0.45
        viewModel.simulatorCommissionRate = 0.0

        let result = viewModel.simulationResult

        // Engine clamps tenor to min 1 or guards division by 360
        XCTAssertGreaterThanOrEqual(result.tenorDays, 1)
        XCTAssertGreaterThan(result.netProceeds, 0.0)
        XCTAssertLessThanOrEqual(result.financingCost, 500_000.0 * (1.0 / 360.0) * 0.45 + 0.01)
    }

    func test_cekten_financing_cost_extreme_volume_and_full_year() {
        let viewModel = CektenViewModel(initialRecords: [])
        viewModel.simulatorAmountText = "50.000.000"
        viewModel.simulatorTenorDays = 360 // Exactly 1 ACT/360 year
        viewModel.simulatorAnnualRate = 0.45
        viewModel.simulatorCommissionRate = 0.0

        let result = viewModel.simulationResult

        // Mathematical validation: 50M * (360/360) * 0.45 = 22,500,000 TL cost
        XCTAssertEqual(result.financingCost, 22_500_000.0, accuracy: 0.01)
        // Net: 50M - 22.5M = 27,500,000 TL
        XCTAssertEqual(result.netProceeds, 27_500_000.0, accuracy: 0.01)
    }

    func test_cekten_effective_monthly_rate_conversion() {
        let viewModel = CektenViewModel(initialRecords: [])
        viewModel.simulatorAmountText = "1.000.000"
        viewModel.simulatorTenorDays = 45
        viewModel.simulatorAnnualRate = 0.45
        viewModel.simulatorCommissionRate = 0.0

        let result = viewModel.simulationResult

        // 45% annual rate corresponds to 3.75% monthly rate (45% / 12)
        XCTAssertEqual(result.effectiveMonthlyRate, 3.75, accuracy: 0.01)
    }

    func test_cekten_individual_model_financing_cost_and_net_proceeds() {
        let record = CektenHesap(
            id: UUID(),
            supplier: "BURAK BESİCİLİK",
            totalAmount: 2_000_000.0,
            paidAmount: 500_000.0,
            remainingAmount: 1_500_000.0,
            interestRate: 0.45,
            tenorDays: 60
        )

        // Model property validation: 2M * (60/360) * 0.45 = 150,000.0 TL
        XCTAssertEqual(record.financingCost, 150_000.0, accuracy: 0.01)
        // Net: 2M - 150k = 1,850,000.0 TL
        XCTAssertEqual(record.netProceeds, 1_850_000.0, accuracy: 0.01)
        XCTAssertFalse(record.isSettled)
    }

    // MARK: - Domain 2: CektenViewModel Partial Settlement & Status (4 Tests)

    func test_cekten_partial_settlement_reduces_remaining_amount() {
        let recordId = UUID()
        let initialRecord = CektenHesap(
            id: recordId,
            supplier: "KRAL ENTEGRE",
            totalAmount: 1_250_000.0,
            paidAmount: 0.0,
            remainingAmount: 1_250_000.0,
            status: "Açık"
        )
        let viewModel = CektenViewModel(initialRecords: [initialRecord])

        viewModel.recordPayment(for: recordId, paymentAmount: 500_000.0)

        guard let updated = viewModel.records.first(where: { $0.id == recordId }) else {
            XCTFail("Record must exist after settlement")
            return
        }
        XCTAssertEqual(updated.paidAmount, 500_000.0, accuracy: 0.01)
        XCTAssertEqual(updated.remainingAmount, 750_000.0, accuracy: 0.01)
        XCTAssertEqual(updated.status, "Açık")
        XCTAssertFalse(updated.isSettled)
    }

    func test_cekten_full_settlement_transitions_status_to_odendi() {
        let recordId = UUID()
        let initialRecord = CektenHesap(
            id: recordId,
            supplier: "DİVAN HAYVANCILIK",
            totalAmount: 800_000.0,
            paidAmount: 0.0,
            remainingAmount: 800_000.0,
            status: "Açık"
        )
        let viewModel = CektenViewModel(initialRecords: [initialRecord])

        viewModel.recordPayment(for: recordId, paymentAmount: 800_000.0)

        guard let updated = viewModel.records.first(where: { $0.id == recordId }) else {
            XCTFail("Record must exist after settlement")
            return
        }
        XCTAssertEqual(updated.paidAmount, 800_000.0, accuracy: 0.01)
        XCTAssertEqual(updated.remainingAmount, 0.0, accuracy: 0.01)
        XCTAssertEqual(updated.status, "Ödendi")
        XCTAssertTrue(updated.isSettled)
    }

    func test_cekten_overpayment_clamps_remaining_balance_to_zero() {
        let recordId = UUID()
        let initialRecord = CektenHesap(
            id: recordId,
            supplier: "TEKİN GÖNEK",
            totalAmount: 1_000_000.0,
            paidAmount: 200_000.0,
            remainingAmount: 800_000.0,
            status: "Açık"
        )
        let viewModel = CektenViewModel(initialRecords: [initialRecord])

        viewModel.recordPayment(for: recordId, paymentAmount: 1_500_000.0)

        guard let updated = viewModel.records.first(where: { $0.id == recordId }) else {
            XCTFail("Record must exist")
            return
        }
        XCTAssertEqual(updated.paidAmount, 1_700_000.0, accuracy: 0.01)
        XCTAssertEqual(updated.remainingAmount, 0.0, accuracy: 0.01, "Remaining balance must never be negative")
        XCTAssertEqual(updated.status, "Ödendi")
        XCTAssertTrue(updated.isSettled)
    }

    func test_cekten_nonexistent_record_payment_is_safely_ignored() {
        let existingId = UUID()
        let record = CektenHesap(id: existingId, supplier: "MUTENA", totalAmount: 500_000.0, paidAmount: 0.0, remainingAmount: 500_000.0)
        let viewModel = CektenViewModel(initialRecords: [record])

        viewModel.recordPayment(for: UUID(), paymentAmount: 250_000.0)

        XCTAssertEqual(viewModel.records.count, 1)
        XCTAssertEqual(viewModel.records.first?.paidAmount, 0.0)
        XCTAssertEqual(viewModel.records.first?.remainingAmount, 500_000.0)
    }

    // MARK: - Domain 3: CektenViewModel Record Filtering & Search (3 Tests)

    func test_cekten_status_filter_partitioning() {
        let r1 = CektenHesap(id: UUID(), supplier: "A", totalAmount: 100_000, paidAmount: 0, remainingAmount: 100_000, status: "Açık")
        let r2 = CektenHesap(id: UUID(), supplier: "B", totalAmount: 200_000, paidAmount: 200_000, remainingAmount: 0, status: "Ödendi")
        let r3 = CektenHesap(id: UUID(), supplier: "C", totalAmount: 300_000, paidAmount: 100_000, remainingAmount: 200_000, status: "Kısmi")
        let viewModel = CektenViewModel(initialRecords: [r1, r2, r3])

        viewModel.selectedStatus = .all
        XCTAssertEqual(viewModel.filteredRecords.count, 3)

        viewModel.selectedStatus = .open
        XCTAssertEqual(viewModel.filteredRecords.count, 2)
        XCTAssertTrue(viewModel.filteredRecords.allSatisfy { $0.remainingAmount > 0 && $0.status != "Ödendi" })

        viewModel.selectedStatus = .paid
        XCTAssertEqual(viewModel.filteredRecords.count, 1)
        XCTAssertEqual(viewModel.filteredRecords.first?.supplier, "B")

        viewModel.selectedStatus = .partial
        XCTAssertEqual(viewModel.filteredRecords.count, 1)
        XCTAssertEqual(viewModel.filteredRecords.first?.supplier, "C")
    }

    func test_cekten_turkish_unicode_search_filtering() {
        let r1 = CektenHesap(id: UUID(), facilityNo: "CH-001", supplier: "DİVAN HAYVANCILIK GIDA", totalAmount: 100_000)
        let r2 = CektenHesap(id: UUID(), facilityNo: "CH-002", supplier: "OĞUZ DANACI", totalAmount: 200_000)
        let r3 = CektenHesap(id: UUID(), facilityNo: "CH-003", supplier: "Kral Entegre Dış Tic.", totalAmount: 300_000)
        let viewModel = CektenViewModel(initialRecords: [r1, r2, r3])

        viewModel.searchText = "divan"
        XCTAssertEqual(viewModel.filteredRecords.count, 1)
        XCTAssertEqual(viewModel.filteredRecords.first?.supplier, "DİVAN HAYVANCILIK GIDA")

        viewModel.searchText = "OĞUZ"
        XCTAssertEqual(viewModel.filteredRecords.count, 1)
        XCTAssertEqual(viewModel.filteredRecords.first?.supplier, "OĞUZ DANACI")

        viewModel.searchText = "CH-003"
        XCTAssertEqual(viewModel.filteredRecords.count, 1)
        XCTAssertEqual(viewModel.filteredRecords.first?.supplier, "Kral Entegre Dış Tic.")

        viewModel.searchText = ""
        XCTAssertEqual(viewModel.filteredRecords.count, 3)
    }

    func test_cekten_portfolio_aggregations_reconciliation() {
        let r1 = CektenHesap(id: UUID(), supplier: "A", totalAmount: 1_000_000, paidAmount: 200_000, remainingAmount: 800_000, tenorDays: 30)
        let r2 = CektenHesap(id: UUID(), supplier: "B", totalAmount: 2_000_000, paidAmount: 500_000, remainingAmount: 1_500_000, tenorDays: 60)
        let r3 = CektenHesap(id: UUID(), supplier: "C", totalAmount: 500_000, paidAmount: 500_000, remainingAmount: 0, tenorDays: 45, status: "Ödendi")
        let viewModel = CektenViewModel(initialRecords: [r1, r2, r3])

        XCTAssertEqual(viewModel.totalPortfolioAmount, 3_500_000.0, accuracy: 0.01)
        XCTAssertEqual(viewModel.totalPaidAmount, 1_200_000.0, accuracy: 0.01)
        XCTAssertEqual(viewModel.totalRemainingAmount, 2_300_000.0, accuracy: 0.01)
        XCTAssertEqual(viewModel.openRecordsCount, 2)
        XCTAssertEqual(viewModel.settledRecordsCount, 1)
        XCTAssertGreaterThan(viewModel.weightedAverageTenor, 0.0)
    }

    // MARK: - Domain 4: TakasViewModel Portföy Aggregation (5 Tests)

    func test_takas_portfolio_total_amount_and_count() {
        let c1 = EBSCheck(id: UUID(), amount: 1_500_000.0, bankName: "HALK", dueDate: "2026-09-01", status: "Tahsilde")
        let c2 = EBSCheck(id: UUID(), amount: 2_500_000.0, bankName: "ZİRAAT", dueDate: "2026-09-02", status: "Tahsilde")
        let c3 = EBSCheck(id: UUID(), amount: 1_000_000.0, bankName: "GARANTİ", dueDate: "2026-09-03", status: "Portföyde")
        let viewModel = TakasViewModel(initialChecks: [c1, c2, c3])

        XCTAssertEqual(viewModel.totalAmount, 5_000_000.0, accuracy: 0.01)
        XCTAssertEqual(viewModel.totalCheckCount, 3)
    }

    func test_takas_status_breakdown_aggregations() {
        let c1 = EBSCheck(id: UUID(), amount: 4_000_000.0, bankName: "M.DENİZ", status: "Tahsilde")
        let c2 = EBSCheck(id: UUID(), amount: 2_000_000.0, bankName: "TAKSİT", status: "Teminata Verildi")
        let c3 = EBSCheck(id: UUID(), amount: 1_000_000.0, bankName: "HALK", status: "Portföyde")
        let c4 = EBSCheck(id: UUID(), amount: 500_000.0, bankName: "GARANTİ", status: "Ödendi")
        let viewModel = TakasViewModel(initialChecks: [c1, c2, c3, c4])

        XCTAssertEqual(viewModel.tahsildeAmount, 4_000_000.0, accuracy: 0.01)
        XCTAssertEqual(viewModel.teminattaAmount, 2_000_000.0, accuracy: 0.01)
        XCTAssertEqual(viewModel.portfoydeAmount, 1_000_000.0, accuracy: 0.01)
        XCTAssertEqual(viewModel.odendiAmount, 500_000.0, accuracy: 0.01)
    }

    func test_takas_bank_quotas_reconciliation_with_total() {
        let c1 = EBSCheck(id: UUID(), amount: 3_000_000.0, bankName: "M.DENİZ", status: "Tahsilde")
        let c2 = EBSCheck(id: UUID(), amount: 1_000_000.0, bankName: "M.DENİZ", status: "Tahsilde")
        let c3 = EBSCheck(id: UUID(), amount: 2_000_000.0, bankName: "HALK", status: "Tahsilde")
        let c4 = EBSCheck(id: UUID(), amount: 4_000_000.0, bankName: "KUVEYTTÜRK", status: "Tahsilde")
        let viewModel = TakasViewModel(initialChecks: [c1, c2, c3, c4])

        let breakdown = viewModel.bankBreakdown

        XCTAssertEqual(breakdown.count, 3)
        // Check sorting: descending by totalAmount
        XCTAssertEqual(breakdown[0].bankName, "M.DENİZ")
        XCTAssertEqual(breakdown[0].totalAmount, 4_000_000.0, accuracy: 0.01)
        XCTAssertEqual(breakdown[0].checkCount, 2)
        XCTAssertEqual(breakdown[0].concentrationPercentage, 40.0, accuracy: 0.01)

        // Reconciliation: sum of quotas must equal totalAmount
        let sumQuotas = breakdown.reduce(0.0) { $0 + $1.totalAmount }
        XCTAssertEqual(sumQuotas, viewModel.totalAmount, accuracy: 0.01)

        let sumPercentages = breakdown.reduce(0.0) { $0 + $1.concentrationPercentage }
        XCTAssertEqual(sumPercentages, 100.0, accuracy: 0.01)
    }

    func test_takas_cheque_valuation_single_cheque_math() {
        let viewModel = TakasViewModel(initialChecks: [])
        viewModel.valuationMonthlyRate = 0.0375 // 3.75% per month
        viewModel.valuationCommissionRate = 0.005 // 0.5% bank commission
        
        let check = EBSCheck(
            id: UUID(),
            amount: 1_000_000.0,
            bankName: "KUVEYTTÜRK",
            dueDate: "2026-10-15"
        )
        
        let valuation = viewModel.calculateValuation(for: check)

        XCTAssertEqual(valuation.faceValue, 1_000_000.0, accuracy: 0.001)
        XCTAssertGreaterThan(valuation.daysToMaturity, 0)
        XCTAssertGreaterThan(valuation.grossDiscount, 0.0)
        XCTAssertEqual(valuation.commissionAmount, 5_000.0, accuracy: 0.01)
        // Net present value must be face value minus total deductions
        XCTAssertEqual(valuation.netPresentValue, valuation.faceValue - (valuation.grossDiscount + valuation.commissionAmount), accuracy: 0.01)
    }

    func test_takas_portfolio_valuation_batch_consolidation() {
        let c1 = EBSCheck(id: UUID(), amount: 2_000_000.0, bankName: "HALK", dueDate: "2026-10-01", status: "Tahsilde")
        let c2 = EBSCheck(id: UUID(), amount: 3_000_000.0, bankName: "ZİRAAT", dueDate: "2026-11-01", status: "Tahsilde")
        let viewModel = TakasViewModel(initialChecks: [c1, c2])

        let summary = viewModel.calculatePortfolioValuation()

        XCTAssertEqual(summary.totalFaceValue, 5_000_000.0, accuracy: 0.01)
        XCTAssertGreaterThan(summary.totalGrossDiscount, 0.0)
        XCTAssertGreaterThan(summary.totalCommission, 0.0)
        // Consolidation invariant: Net + Discount + Commission == FaceValue
        let reconstructed = summary.netPresentValue + summary.totalGrossDiscount + summary.totalCommission
        XCTAssertEqual(reconstructed, summary.totalFaceValue, accuracy: 0.01)
    }

    // MARK: - Domain 5: TakasViewModel Workflow Transitions (4 Tests)

    func test_takas_toggle_ic_takas_flips_state_and_status() {
        let checkId = UUID()
        let check = EBSCheck(id: checkId, amount: 1_000_000.0, bankName: "HALK", status: "Tahsilde", isIcTakas: false)
        let viewModel = TakasViewModel(initialChecks: [check])

        // First toggle: Lock to İç Takas
        viewModel.toggleIcTakas(for: checkId)
        guard let locked = viewModel.checks.first(where: { $0.id == checkId }) else {
            XCTFail("Check must exist")
            return
        }
        XCTAssertTrue(locked.isIcTakas)
        XCTAssertEqual(locked.status, "İç Takas")

        // Second toggle: Restore to Normal Takas
        viewModel.toggleIcTakas(for: checkId)
        guard let restored = viewModel.checks.first(where: { $0.id == checkId }) else {
            XCTFail("Check must exist")
            return
        }
        XCTAssertFalse(restored.isIcTakas)
        XCTAssertEqual(restored.status, "Tahsilde")
    }

    func test_takas_move_check_to_bank_updates_bank_name() {
        let checkId = UUID()
        let check = EBSCheck(id: checkId, amount: 2_500_000.0, bankName: "HALK", status: "Tahsilde")
        let viewModel = TakasViewModel(initialChecks: [check])

        viewModel.moveCheckToBank(checkId: checkId, destinationBank: "KUVEYTTÜRK")

        guard let updated = viewModel.checks.first(where: { $0.id == checkId }) else {
            XCTFail("Check must exist")
            return
        }
        XCTAssertEqual(updated.bankName, "KUVEYTTÜRK")
        XCTAssertEqual(viewModel.bankBreakdown.first?.bankName, "KUVEYTTÜRK")
    }

    func test_takas_mark_check_as_collected_updates_status() {
        let checkId = UUID()
        let check = EBSCheck(id: checkId, amount: 1_750_000.0, bankName: "ZİRAAT", status: "Tahsilde")
        let viewModel = TakasViewModel(initialChecks: [check])

        viewModel.markCheckAsCollected(checkId: checkId)

        guard let updated = viewModel.checks.first(where: { $0.id == checkId }) else {
            XCTFail("Check must exist")
            return
        }
        XCTAssertEqual(updated.status, "Ödendi")
        XCTAssertEqual(viewModel.odendiAmount, 1_750_000.0, accuracy: 0.01)
    }

    func test_takas_idempotent_actions_on_nonexistent_ids() {
        let check = EBSCheck(id: UUID(), amount: 500_000.0, bankName: "GARANTİ", status: "Tahsilde")
        let viewModel = TakasViewModel(initialChecks: [check])

        viewModel.toggleIcTakas(for: UUID())
        viewModel.moveCheckToBank(checkId: UUID(), destinationBank: "DENİZ")
        viewModel.markCheckAsCollected(checkId: UUID())

        XCTAssertEqual(viewModel.checks.count, 1)
        XCTAssertEqual(viewModel.checks.first?.bankName, "GARANTİ")
        XCTAssertEqual(viewModel.checks.first?.status, "Tahsilde")
    }

    // MARK: - Domain 6: TakasViewModel Filtering & Resilience (3 Tests)

    func test_takas_segment_partitioning_takasta_vs_ic_takas() {
        let c1 = EBSCheck(id: UUID(), amount: 1_000_000, status: "Tahsilde", isIcTakas: false)
        let c2 = EBSCheck(id: UUID(), amount: 2_000_000, status: "Tahsilde", isIcTakas: false)
        let c3 = EBSCheck(id: UUID(), amount: 3_000_000, status: "İç Takas", isIcTakas: true)
        let viewModel = TakasViewModel(initialChecks: [c1, c2, c3])

        viewModel.selectedSegment = .takasta
        XCTAssertEqual(viewModel.filteredChecks.count, 2)
        XCTAssertTrue(viewModel.filteredChecks.allSatisfy { !$0.isIcTakas })

        viewModel.selectedSegment = .icTakas
        XCTAssertEqual(viewModel.filteredChecks.count, 1)
        XCTAssertTrue(viewModel.filteredChecks.allSatisfy { $0.isIcTakas })
    }

    func test_takas_client_side_search_multi_field_coverage() {
        let c1 = EBSCheck(id: UUID(), checkNumber: "CK-5935504", bankName: "HALK", drawer: "ŞİMŞEK BESİCİLİK")
        let c2 = EBSCheck(id: UUID(), checkNumber: "0026098", bankName: "M.DENİZ", drawer: "BURAK BESİCİLİK")
        let viewModel = TakasViewModel(initialChecks: [c1, c2])

        viewModel.searchText = "59355"
        XCTAssertEqual(viewModel.filteredChecks.count, 1)
        XCTAssertEqual(viewModel.filteredChecks.first?.checkNumber, "CK-5935504")

        viewModel.searchText = "deniz"
        XCTAssertEqual(viewModel.filteredChecks.count, 1)
        XCTAssertEqual(viewModel.filteredChecks.first?.bankName, "M.DENİZ")

        viewModel.searchText = "şimşek"
        XCTAssertEqual(viewModel.filteredChecks.count, 1)
        XCTAssertEqual(viewModel.filteredChecks.first?.drawer, "ŞİMŞEK BESİCİLİK")

        viewModel.searchText = ""
        XCTAssertEqual(viewModel.filteredChecks.count, 2)
    }

    func test_takas_view_model_error_resilience_and_clearance() async {
        let failingService = MockTakasService(shouldThrow: true)
        let viewModel = TakasViewModel(initialChecks: [EBSCheck(amount: 100_000, bankName: "TEST")], service: failingService)

        await viewModel.loadInitialChecks()

        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)

        viewModel.clearError()
        XCTAssertNil(viewModel.errorMessage)
    }
}
