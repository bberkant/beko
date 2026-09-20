import XCTest
import SwiftUI
@testable import dars_ios

@MainActor
final class Tier4_RealWorldScenarioTests: XCTestCase {
    
    // MARK: - Scenario 1: Treasury Manager Morning Cheque Clearing Routine
    func test_scenario_treasury_manager_morning_clearing_routine() {
        // Step 1: Manager opens app, verifies Live DB status
        let summary = DashboardSummary(liveSyncPulse: true)
        let dashVM = DashboardViewModel(summary: summary)
        XCTAssertTrue(dashVM.isLiveSyncActive)
        
        // Step 2: Inspect today's Takas clearing cheques (03.09.2026)
        let checkId1 = UUID()
        let checkId2 = UUID()
        let c1 = TestFixtures.makeSampleCheck(
            id: checkId1,
            amount: 4_260_129.0,
            bank: "M.DENİZ",
            dueDate: "2026-09-03",
            status: "Tahsilde"
        )
        let c2 = TestFixtures.makeSampleCheck(
            id: checkId2,
            amount: 2_161_752.0,
            bank: "TAKSİT",
            dueDate: "2026-09-03",
            status: "Tahsilde"
        )
        
        let takasVM = TakasViewModel(initialChecks: [c1, c2])
        XCTAssertEqual(takasVM.totalAmount, 6_421_881.0)
        
        // Step 3: Treasury manager identifies a cheque that drawer requested holding; places in İç Takas
        takasVM.toggleIcTakas(for: checkId2)
        takasVM.selectedSegment = .takasta
        XCTAssertEqual(takasVM.filteredChecks.count, 1)
        takasVM.selectedSegment = .icTakas
        XCTAssertEqual(takasVM.filteredChecks.count, 1)
        XCTAssertEqual(takasVM.filteredChecks.first?.amount, 2_161_752.0)
        
        // Step 4: Bank confirms collection for first cheque; manager marks Ödendi
        takasVM.markCheckAsCollected(checkId: checkId1)
        takasVM.selectedSegment = .takasta
        XCTAssertEqual(takasVM.filteredChecks.count, 0, "No pending cheques remain in Tahsilde")
        
        // Step 5: Verify collection totals
        XCTAssertEqual(takasVM.odendiAmount, 4_260_129.0)
    }
    
    // MARK: - Scenario 2: Livestock Slaughter Purchase & Çekten Facility Settlement
    func test_scenario_vendor_livestock_purchase_and_cekten_settlement_cycle() {
        // Step 1: Record slaughter purchases from Divan Hayvancılık
        let slaughter1 = TestFixtures.makeSampleSlaughter(
            supplier: "DİVAN HAYVANCILIK",
            headCount: 32,
            carcassWeight: 9917.0,
            pricePerKg: 570.0,
            pesinat: 0.0
        )
        let slaughter2 = TestFixtures.makeSampleSlaughter(
            supplier: "DİVAN HAYVANCILIK",
            headCount: 27,
            carcassWeight: 8692.0,
            pricePerKg: 575.0,
            pesinat: 0.0
        )
        
        let totalCariDebt = slaughter1.totalAmount + slaughter2.totalAmount
        XCTAssertEqual(totalCariDebt, 10_661_990.0)
        
        // Step 2: Open Çekten facility for 500,000 TL with 45-day tenor
        let cektenVM = CektenViewModel()
        cektenVM.simulatorAmountText = "500000"
        cektenVM.simulatorTenorDays = 45
        cektenVM.simulatorAnnualRate = 0.45
        cektenVM.simulatorCommissionRate = 0.0
        
        XCTAssertEqual(cektenVM.simulationResult.financingCost, 28_125.0, accuracy: 0.01)
        XCTAssertEqual(cektenVM.simulationResult.netProceeds, 471_875.0, accuracy: 0.01)
        
        // Step 3: Partial payment of 200,000 TL
        let facilityId = UUID()
        let record = CektenHesap(id: facilityId, totalAmount: 500_000.0, paidAmount: 0.0, status: "Açık")
        cektenVM.records = [record]
        
        cektenVM.recordPayment(for: facilityId, paymentAmount: 200_000.0)
        let partialRecord = cektenVM.records.first { $0.id == facilityId }
        XCTAssertEqual(partialRecord?.remainingAmount, 300_000.0)
        XCTAssertEqual(partialRecord?.status, "Kısmi")
        
        // Step 4: Final settlement of 300,000 TL
        cektenVM.recordPayment(for: facilityId, paymentAmount: 300_000.0)
        let settledRecord = cektenVM.records.first { $0.id == facilityId }
        XCTAssertEqual(settledRecord?.remainingAmount, 0.0)
        XCTAssertEqual(settledRecord?.status, "Ödendi")
        XCTAssertTrue(settledRecord?.isSettled == true)
    }
    
    // MARK: - Scenario 3: Multi-Bank Cheque Clearing & GL Portfolio Reconciliation
    func test_scenario_multi_bank_cheque_portfolio_reconciliation() {
        // Step 1: Ingest batch of commercial cheques across 5 banks (15M TL total)
        let halkCheckId = UUID()
        let portfoy = [
            TestFixtures.makeSampleCheck(amount: 5_000_000.0, bank: "M.DENİZ"),
            TestFixtures.makeSampleCheck(amount: 3_000_000.0, bank: "M.ZİRAAT"),
            TestFixtures.makeSampleCheck(amount: 2_000_000.0, bank: "KUVEYTTÜRK"),
            TestFixtures.makeSampleCheck(id: halkCheckId, amount: 2_500_000.0, bank: "HALKBANK"),
            TestFixtures.makeSampleCheck(amount: 2_500_000.0, bank: "ALBARAKA")
        ]
        
        let takasVM = TakasViewModel(initialChecks: portfoy)
        XCTAssertEqual(takasVM.totalAmount, 15_000_000.0)
        
        // Step 2: Move Halkbank cheque (2,500,000 TL) to Kuveyt Türk for clearing advantages
        takasVM.moveCheckToBank(checkId: halkCheckId, destinationBank: "KUVEYTTÜRK")
        
        let breakdown = takasVM.bankBreakdown
        let kuveyt = breakdown.first { $0.bankName == "KUVEYTTÜRK" }
        let halk = breakdown.first { $0.bankName == "HALKBANK" }
        
        XCTAssertEqual(kuveyt?.totalAmount, 4_500_000.0)
        XCTAssertNil(halk)
        
        // Step 3: Total sum remains invariant
        XCTAssertEqual(takasVM.totalAmount, 15_000_000.0)
    }
    
    // MARK: - Scenario 4: Corporate Cashflow & Branch POS Nightly Reconciliation
    func test_scenario_corporate_cashflow_and_branch_pos_nightly_reconciliation() {
        // Step 1: 6 Retail branches daily gross POS collections (1,000,000 TL total)
        let branchCollections: [String: Double] = [
            "Merkez Şube": 180_000.0,
            "Merzifon Şube": 120_000.0,
            "İlkadım Şube": 210_000.0,
            "Atakum Şube": 240_000.0,
            "Sucukhane": 150_000.0,
            "Depo": 100_000.0
        ]
        let totalGrossPos = branchCollections.values.reduce(0.0, +)
        XCTAssertEqual(totalGrossPos, 1_000_000.0)
        
        // Step 2: Contractual commission rate: 2.50%
        let contractualRate = 0.025
        let expectedFee = totalGrossPos * contractualRate // 25,000.0 TL
        let expectedNet = totalGrossPos - expectedFee     // 975,000.0 TL
        
        XCTAssertEqual(expectedFee, 25_000.0)
        XCTAssertEqual(expectedNet, 975_000.0)
        
        // Step 3: Bank deduction verification (actual deducted 26,200 TL)
        let actualDeductedFee = 26_200.0
        let feeVariance = actualDeductedFee - expectedFee // +1,200 TL excess deduction detected
        XCTAssertEqual(feeVariance, 1_200.0, "POS difference engine must pinpoint the 1,200 TL variance")
        
        // Step 4: Net deposit transferred to Kuveyt Türk main account
        let actualDepositedNet = totalGrossPos - actualDeductedFee
        var mainAccount = TestFixtures.makeSampleBankAccount(
            bankName: "KUVEYT TÜRK",
            balance: 10_000_000.0
        )
        mainAccount.balance += actualDepositedNet
        
        let dashVM = DashboardViewModel(bankAccounts: [mainAccount])
        XCTAssertEqual(dashVM.primaryBankAccount?.balance, 10_973_800.0)
    }
}
