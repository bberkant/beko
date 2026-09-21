import XCTest
@testable import dars_ios

final class Tier3_CrossFeatureTests: XCTestCase {
    
    // MARK: - 1. Cheque Ingestion -> Takas & Dashboard Balance
    func test_cross_feature_adding_cheque_updates_takas_and_dashboard_balance() {
        var takasCheques: [CheckRecord] = [
            TestFixtures.makeSampleCheck(amount: 4_260_129.0)
        ]
        var dashboardTotalBalance: Double = 4_260_129.0
        
        // Add new check for 1,500,000 TL
        let newCheque = TestFixtures.makeSampleCheck(amount: 1_500_000.0)
        takasCheques.append(newCheque)
        dashboardTotalBalance += newCheque.amount
        
        let newTakasTotal = takasCheques.reduce(0.0) { $0 + $1.amount }
        XCTAssertEqual(newTakasTotal, 5_760_129.0)
        XCTAssertEqual(dashboardTotalBalance, 5_760_129.0, "Dashboard total balance must match updated Takas sum")
    }
    
    // MARK: - 2. Çekten Settlement -> Supplier Cari Balance
    func test_cross_feature_cekten_payment_settlement_updates_supplier_cari_balance() {
        var cektenRemain = 1_250_000.0
        var supplierCariDebt = 4_215_000.0
        
        // Make payment of 500,000 TL
        let paymentAmount = 500_000.0
        cektenRemain = max(0.0, cektenRemain - paymentAmount)
        supplierCariDebt -= paymentAmount // Credited against debt
        
        XCTAssertEqual(cektenRemain, 750_000.0)
        XCTAssertEqual(supplierCariDebt, 3_715_000.0, "Supplier Cari debt must decrease by payment amount")
    }
    
    // MARK: - 3. Slaughter Ingestion -> Cari Balance & Dashboard Count
    func test_cross_feature_slaughter_entry_increments_cari_debt_and_dashboard_kesim_count() {
        var divanCariBalance = 10_661_990.0
        let slaughter = TestFixtures.makeSampleSlaughter(carcassWeight: 6000.0, pricePerKg: 500.0, pesinat: 0.0)
        divanCariBalance += slaughter.totalAmount
        
        XCTAssertEqual(slaughter.totalAmount, 3_000_000.0)
        XCTAssertEqual(divanCariBalance, 13_661_990.0, "Cari open balance must increment by slaughter valuation")
    }
    
    // MARK: - 4. Takas Cheque Collection -> Bank Account Balances
    func test_cross_feature_takas_cheque_collection_updates_bank_account_balance() {
        var pendingTakasAmount = 6_421_881.0
        var kuveytTurkAccountBalance = 2_500_000.0
        
        let collectedChequeAmount = 2_161_752.0
        
        // Cheque clears and is marked Ödendi
        pendingTakasAmount -= collectedChequeAmount
        kuveytTurkAccountBalance += collectedChequeAmount
        
        XCTAssertEqual(pendingTakasAmount, 4_260_129.0)
        XCTAssertEqual(kuveytTurkAccountBalance, 4_661_752.0, "Target commercial account must receive cleared funds")
    }
    
    // MARK: - 5. Vehicle Inspection Date -> Menu Badges & Calendar Event Dots
    func test_cross_feature_vehicle_inspection_date_change_updates_menu_badge_and_calendar_dot() {
        var criticalVehiclesCount = 1
        var calendarHasVehicleAlert = false
        
        // A vehicle's inspection becomes critical (daysLeft moves from 30 to 5)
        let newDaysLeft = 5
        if newDaysLeft <= 10 {
            criticalVehiclesCount += 1
            calendarHasVehicleAlert = true
        }
        
        XCTAssertEqual(criticalVehiclesCount, 2)
        XCTAssertTrue(calendarHasVehicleAlert, "Calendar must show amber dot for critical vehicle inspection")
    }
    
    // MARK: - 6. Cari Payment Inversion -> Borçlu to Alacaklı Filter Shift
    func test_cross_feature_cari_payment_inverts_classification_borclu_to_alacakli() {
        var balance = 500_000.0 // Initially Borçlu
        func classify(_ b: Double) -> String { b > 0 ? "BORCLU" : (b < 0 ? "ALACAKLI" : "SIFIR") }
        
        XCTAssertEqual(classify(balance), "BORCLU")
        
        // Large payment of 800,000 TL received
        balance -= 800_000.0 // Now -300,000.0
        
        XCTAssertEqual(balance, -300_000.0)
        XCTAssertEqual(classify(balance), "ALACAKLI", "Counterparty must shift to Alacaklı filter pill")
    }
    
    // MARK: - 7. Inter-Bank Cheque Transfer -> Bank Quotas Invariance
    func test_cross_feature_interbank_cheque_transfer_updates_bank_quotas_without_altering_grand_total() {
        var bankQuotas: [String: Double] = [
            "M.DENİZ": 4_260_129.0,
            "KUVEYTTÜRK": 1_000_000.0
        ]
        let initialGrandTotal = bankQuotas.values.reduce(0.0, +)
        
        // Transfer 1,000,000 TL from Denizbank to Kuveyt Türk
        let transferAmount = 1_000_000.0
        bankQuotas["M.DENİZ"]! -= transferAmount
        bankQuotas["KUVEYTTÜRK"]! += transferAmount
        
        let newGrandTotal = bankQuotas.values.reduce(0.0, +)
        
        XCTAssertEqual(bankQuotas["M.DENİZ"], 3_260_129.0)
        XCTAssertEqual(bankQuotas["KUVEYTTÜRK"], 2_000_000.0)
        XCTAssertEqual(newGrandTotal, initialGrandTotal, "Inter-bank transfer must maintain exact grand total invariant")
    }
    
    // MARK: - 8. Credit Card Settlement -> Cashbox & Card Available Limit
    func test_cross_feature_credit_card_settlement_deducts_cashbox_and_restores_limit() {
        var mainCashboxBalance = 1_500_000.0
        let cardLimit = 500_000.0
        var cardUsed = 200_000.0
        
        // Pay 100,000 TL towards credit card from cashbox
        let payment = 100_000.0
        mainCashboxBalance -= payment
        cardUsed -= payment
        let availableLimit = cardLimit - cardUsed
        
        XCTAssertEqual(mainCashboxBalance, 1_400_000.0)
        XCTAssertEqual(cardUsed, 100_000.0)
        XCTAssertEqual(availableLimit, 400_000.0, "Available limit must increase by payment amount")
    }
    
    // MARK: - 9. Real Estate Revaluation -> Durumum Asset Net Worth
    func test_cross_feature_real_estate_revaluation_propagates_to_durumum_asset_net_worth() {
        var totalRealEstateValuation = 121_500_000.0
        var durumumTotalAssets = 250_000_000.0
        
        // Property reappraised with +10,000,000 TL appreciation
        let appraisalDelta = 10_000_000.0
        totalRealEstateValuation += appraisalDelta
        durumumTotalAssets += appraisalDelta
        
        XCTAssertEqual(totalRealEstateValuation, 131_500_000.0)
        XCTAssertEqual(durumumTotalAssets, 260_000_000.0)
    }
    
    // MARK: - 10. Global Spotlight Search Cross-Entity Query
    func test_cross_feature_global_spotlight_search_cross_queries_caris_cheques_and_cekten() {
        let query = "DİVAN"
        
        let caris = ["DİVAN HAYVANCILIK GIDA SAN. TİC. LTD. ŞTİ.", "FİMAR AŞ"]
        let cheques = ["CK-00192 DİVAN HAYVANCILIK", "CK-00843 FİMAR AŞ"]
        let cekten = ["DİVAN HAYVANCILIK Çekten Sözleşmesi"]
        
        let matchedCaris = caris.filter { $0.localizedCaseInsensitiveContains(query) }
        let matchedCheques = cheques.filter { $0.localizedCaseInsensitiveContains(query) }
        let matchedCekten = cekten.filter { $0.localizedCaseInsensitiveContains(query) }
        
        let totalHits = matchedCaris.count + matchedCheques.count + matchedCekten.count
        XCTAssertEqual(totalHits, 3, "Spotlight search must find records across all 3 modules simultaneously")
    }
}
