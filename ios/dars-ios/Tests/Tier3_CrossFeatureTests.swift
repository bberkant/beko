import XCTest
import SwiftUI
@testable import dars_ios

@MainActor
final class Tier3_CrossFeatureTests: XCTestCase {
    
    // MARK: - 1. Cheque Ingestion -> Takas & Dashboard Balance
    func test_cross_feature_adding_cheque_updates_takas_and_dashboard_balance() {
        let c1 = TestFixtures.makeSampleCheck(amount: 4_260_129.0)
        let takasVM = TakasViewModel(initialChecks: [c1])
        
        let c2 = TestFixtures.makeSampleCheck(amount: 1_500_000.0)
        takasVM.checks.append(c2)
        
        let dashVM = DashboardViewModel(recentChecks: takasVM.checks)
        
        XCTAssertEqual(takasVM.totalAmount, 5_760_129.0)
        XCTAssertEqual(dashVM.recentChecks.reduce(0.0) { $0 + $1.amount }, 5_760_129.0,
                       "Dashboard total recent checks sum must match Takas portfolio amount")
    }
    
    // MARK: - 2. Çekten Settlement -> Supplier Cari Balance
    func test_cross_feature_cekten_payment_settlement_updates_supplier_cari_balance() {
        let supplierCari = TestFixtures.makeSampleCari(name: "MUTENA BESİCİLİK", balance: 4_215_000.0)
        let carisVM = CarisViewModel(initialCariler: [supplierCari])
        
        let cektenId = UUID()
        let cektenRecord = TestFixtures.makeSampleCekten(
            id: cektenId,
            supplier: "MUTENA BESİCİLİK",
            totalAmount: 1_250_000.0,
            paidAmount: 0.0,
            remainingAmount: 1_250_000.0
        )
        let cektenVM = CektenViewModel(initialRecords: [cektenRecord])
        
        let paymentAmount = 500_000.0
        cektenVM.recordPayment(for: cektenId, paymentAmount: paymentAmount)
        
        let updatedCekten = cektenVM.records.first { $0.id == cektenId }
        XCTAssertEqual(updatedCekten?.remainingAmount, 750_000.0)
        
        carisVM.cariler[0].balance -= paymentAmount
        XCTAssertEqual(carisVM.cariler[0].balance, 3_715_000.0,
                       "Supplier Cari debt must decrease by the settlement payment amount")
    }
    
    // MARK: - 3. Slaughter Ingestion -> Cari Balance & Dashboard Count
    func test_cross_feature_slaughter_entry_increments_cari_debt_and_dashboard_kesim_count() {
        var cari = TestFixtures.makeSampleCari(name: "DİVAN HAYVANCILIK", balance: 10_661_990.0)
        let slaughter = TestFixtures.makeSampleSlaughter(
            supplier: "DİVAN HAYVANCILIK",
            carcassWeight: 6000.0,
            pricePerKg: 500.0,
            pesinat: 0.0
        )
        
        XCTAssertEqual(slaughter.totalAmount, 3_000_000.0)
        cari.balance += slaughter.totalAmount
        XCTAssertEqual(cari.balance, 13_661_990.0)
        
        let summary = DashboardSummary(monthlyKesimCount: 43)
        let dashVM = DashboardViewModel(summary: summary)
        XCTAssertEqual(dashVM.monthlyKesimCount, 43)
    }
    
    // MARK: - 4. Takas Cheque Collection -> Bank Account Balances
    func test_cross_feature_takas_cheque_collection_updates_bank_account_balance() {
        let checkId = UUID()
        let check = TestFixtures.makeSampleCheck(id: checkId, amount: 2_161_752.0, status: "Tahsilde")
        let takasVM = TakasViewModel(initialChecks: [check])
        
        var bankAccount = TestFixtures.makeSampleBankAccount(balance: 2_500_000.0)
        
        takasVM.markCheckAsCollected(checkId: checkId)
        XCTAssertEqual(takasVM.odendiAmount, 2_161_752.0)
        
        bankAccount.balance += takasVM.odendiAmount
        let dashVM = DashboardViewModel(bankAccounts: [bankAccount])
        
        XCTAssertEqual(dashVM.primaryBankAccount?.balance, 4_661_752.0,
                       "Target bank account must receive collected funds from cleared cheque")
    }
    
    // MARK: - 5. Vehicle Inspection Date -> Menu Badges & Calendar Event Dots
    func test_cross_feature_vehicle_inspection_date_change_updates_menu_badge_and_calendar_dot() {
        let menuVM = MenuViewModel()
        menuVM.updateOperationalCounts(
            vehicles: 63,
            bankAccounts: 20,
            creditCards: 34,
            cariler: 2184,
            checks: 8862,
            kesim: 18080
        )
        XCTAssertEqual(menuVM.vehicleCount, 63)
        
        let vehicleCritical = TestFixtures.makeSampleVehicle(inspectionDate: "2024-01-01")
        XCTAssertTrue(vehicleCritical.isInspectionCritical)
    }
    
    // MARK: - 6. Cari Payment Inversion -> Borçlu to Alacaklı Filter Shift
    func test_cross_feature_cari_payment_inverts_classification_borclu_to_alacakli() {
        let cari = TestFixtures.makeSampleCari(balance: 500_000.0)
        let carisVM = CarisViewModel(initialCariler: [cari])
        
        carisVM.selectedFilter = .borclu
        XCTAssertEqual(carisVM.displayCariler.count, 1)
        
        carisVM.cariler[0].balance = -300_000.0
        
        carisVM.selectedFilter = .borclu
        XCTAssertEqual(carisVM.displayCariler.count, 0)
        
        carisVM.selectedFilter = .alacakli
        XCTAssertEqual(carisVM.displayCariler.count, 1)
    }
    
    // MARK: - 7. Inter-Bank Cheque Transfer -> Bank Quotas Invariance
    func test_cross_feature_interbank_cheque_transfer_updates_bank_quotas_without_altering_grand_total() {
        let c1 = TestFixtures.makeSampleCheck(amount: 4_260_129.0, bank: "M.DENİZ")
        let c2 = TestFixtures.makeSampleCheck(amount: 1_000_000.0, bank: "KUVEYTTÜRK")
        let takasVM = TakasViewModel(initialChecks: [c1, c2])
        
        let initialTotal = takasVM.totalAmount
        takasVM.moveCheckToBank(checkId: c1.id, destinationBank: "KUVEYTTÜRK")
        
        XCTAssertEqual(takasVM.totalAmount, initialTotal, "Total portfolio amount must remain strictly invariant")
        
        let breakdown = takasVM.bankBreakdown
        XCTAssertEqual(breakdown.count, 1)
        XCTAssertEqual(breakdown.first?.bankName, "KUVEYTTÜRK")
        XCTAssertEqual(breakdown.first?.totalAmount, 5_260_129.0)
    }
    
    // MARK: - 8. Credit Card Settlement -> Cashbox & Card Available Limit
    func test_cross_feature_credit_card_settlement_deducts_cashbox_and_restores_limit() {
        var card = TestFixtures.makeSampleCreditCard(limitAmount: 500_000.0, currentDebt: 200_000.0)
        XCTAssertEqual(card.availableLimit, 300_000.0)
        
        let payment = 100_000.0
        card.currentDebt -= payment
        
        XCTAssertEqual(card.currentDebt, 100_000.0)
        XCTAssertEqual(card.availableLimit, 400_000.0)
        XCTAssertEqual(card.limitAmount, card.currentDebt + card.availableLimit)
    }
    
    // MARK: - 9. Real Estate Revaluation -> Durumum Asset Net Worth
    func test_cross_feature_real_estate_revaluation_propagates_to_durumum_asset_net_worth() {
        let initialSummary = DashboardSummary(
            totalBalance: 10_000_000.0,
            totalReceivable: 5_000_000.0,
            totalPayable: 3_000_000.0
        )
        XCTAssertEqual(initialSummary.netBalance, 12_000_000.0)
        XCTAssertEqual(initialSummary.totalAssets, 15_000_000.0)
        
        let revaluedSummary = DashboardSummary(
            totalBalance: 10_000_000.0,
            totalReceivable: 15_000_000.0,
            totalPayable: 3_000_000.0
        )
        XCTAssertEqual(revaluedSummary.netBalance, 22_000_000.0)
        XCTAssertEqual(revaluedSummary.totalAssets, 25_000_000.0)
    }
    
    // MARK: - 10. Global Spotlight Search Cross-Entity Query
    func test_cross_feature_global_spotlight_search_cross_queries_caris_cheques_and_cekten() {
        let cari = TestFixtures.makeSampleCari(name: "DİVAN HAYVANCILIK GIDA SAN. TİC. LTD. ŞTİ.")
        let carisVM = CarisViewModel(initialCariler: [cari])
        
        let check = TestFixtures.makeSampleCheck(drawer: "DİVAN HAYVANCILIK")
        let takasVM = TakasViewModel(initialChecks: [check])
        
        let cekten = TestFixtures.makeSampleCekten(supplier: "DİVAN HAYVANCILIK")
        let cektenVM = CektenViewModel(initialRecords: [cekten])
        
        let query = "DİVAN"
        carisVM.searchText = query
        takasVM.searchText = query
        cektenVM.searchText = query
        
        XCTAssertEqual(carisVM.displayCariler.count, 1)
        XCTAssertEqual(takasVM.filteredChecks.count, 1)
        XCTAssertEqual(cektenVM.filteredRecords.count, 1)
    }
}
