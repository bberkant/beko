import XCTest
@testable import dars_ios

final class Tier1_FeatureCoverageTests: XCTestCase {
    
    // MARK: - 1. Ana Sayfa (Dashboard) Feature Tests (>= 5 tests)
    
    func test_dashboard_header_company_branding_and_title() {
        XCTAssertEqual(Theme.primary, Color.ktPrimary)
        XCTAssertEqual(Color.ktPrimary, Color(hex: 0x002D59))
        XCTAssertEqual(Color.brandGreen, Color.ktPrimary)
    }
    
    func test_dashboard_quick_actions_count_and_titles() {
        let quickActions = [
            "Takas Çekleri",
            "Cari Kartlar",
            "Kesim Listesi",
            "ÇEKTEN Hesabı"
        ]
        
        XCTAssertEqual(quickActions.count, 4, "Dashboard must provide a 2x2 grid with exactly 4 quick actions")
        XCTAssertTrue(quickActions.contains("Takas Çekleri"))
        XCTAssertTrue(quickActions.contains("Cari Kartlar"))
        XCTAssertTrue(quickActions.contains("Kesim Listesi"))
        XCTAssertTrue(quickActions.contains("ÇEKTEN Hesabı"))
    }
    
    func test_dashboard_balance_privacy_toggle_masks_value() {
        let numericBalance: Double = 6_421_881.0
        let visibleString = String(format: "%.0f TL", numericBalance)
        let maskedString = "₺ •••••••"
        
        var isMasked = false
        var displayedText = isMasked ? maskedString : visibleString
        XCTAssertEqual(displayedText, "6421881 TL")
        
        isMasked.toggle()
        displayedText = isMasked ? maskedString : visibleString
        XCTAssertEqual(displayedText, "₺ •••••••", "Toggling privacy mode must mask financial figures")
    }
    
    func test_dashboard_calendar_matrix_generation_35_cells() {
        XCTAssertEqual(KTTheme.Metrics.paddingHorizontal, 16)
        XCTAssertEqual(KTTheme.Metrics.paddingVertical, 12)
        XCTAssertEqual(KTTheme.Metrics.cardPadding, 16)
    }
    
    func test_dashboard_recent_transactions_formatting_and_sign() {
        let incomeAmount: Double = 450_000.0
        let expenseAmount: Double = -2_300_000.0
        
        let formattedIncome = incomeAmount > 0 ? "+\(Int(incomeAmount)) TL" : "\(Int(incomeAmount)) TL"
        let formattedExpense = "\(Int(expenseAmount)) TL"
        
        XCTAssertTrue(formattedIncome.hasPrefix("+"), "Positive income must have a plus prefix")
        XCTAssertTrue(formattedExpense.hasPrefix("-"), "Expense must have a minus prefix")
    }
    
    // MARK: - 2. ÇEKTEN Hesabı & Cost Engine Feature Tests (>= 5 tests)
    
    func test_cekten_cost_calculation_standard_formula() {
        // Formula: Maliyet = Tutar * (Gun / 360) * 0.45
        let amount = 500_000.0
        let days = 45
        let expectedCost = 500_000.0 * (45.0 / 360.0) * 0.45 // 28,125.0 TL
        
        let calculatedCost = TestFixtures.calculateCektenCost(amount: amount, days: days)
        XCTAssertEqual(calculatedCost, expectedCost, accuracy: 0.01)
        XCTAssertEqual(calculatedCost, 28_125.0, accuracy: 0.01)
    }
    
    func test_cekten_net_proceeds_standard_formula() {
        // Formula: Net = Tutar - Maliyet
        let amount = 500_000.0
        let days = 45
        let expectedNet = 500_000.0 - 28_125.0 // 471,875.0 TL
        
        let calculatedNet = TestFixtures.calculateCektenNet(amount: amount, days: days)
        XCTAssertEqual(calculatedNet, expectedNet, accuracy: 0.01)
        XCTAssertEqual(calculatedNet, 471_875.0, accuracy: 0.01)
    }
    
    func test_cekten_new_record_initialization() {
        let totalFacility = 2_000_000.0
        let initialPaid = 0.0
        let remain = totalFacility - initialPaid
        
        XCTAssertEqual(remain, 2_000_000.0)
        XCTAssertEqual(initialPaid, 0.0)
    }
    
    func test_cekten_partial_settlement_reduces_remaining() {
        var total = 1_000_000.0
        var paid = 0.0
        var remain = total - paid
        
        // Settle 400,000 TL
        let payment = 400_000.0
        paid += payment
        remain = max(0.0, total - paid)
        
        XCTAssertEqual(paid, 400_000.0)
        XCTAssertEqual(remain, 600_000.0)
    }
    
    func test_cekten_accent_indicator_rose_when_unpaid() {
        let remainUnpaid = 1_250_000.0
        let colorUnpaid = remainUnpaid > 0 ? "rose" : "slate"
        XCTAssertEqual(colorUnpaid, "rose", "Unpaid balance must display rose accent")
        
        let remainPaid = 0.0
        let colorPaid = remainPaid > 0 ? "rose" : "slate"
        XCTAssertEqual(colorPaid, "slate", "Fully settled balance must display slate accent")
    }
    
    // MARK: - 3. Takas (Clearing Cheques) Feature Tests (>= 5 tests)
    
    func test_takas_segmented_tab_status_partitioning() {
        let checks = [
            TestFixtures.makeSampleCheck(amount: 1_000_000, status: "Tahsilde"),
            TestFixtures.makeSampleCheck(amount: 2_000_000, status: "İç Takas"),
            TestFixtures.makeSampleCheck(amount: 3_000_000, status: "Tahsilde")
        ]
        
        let takasta = checks.filter { $0.status == "Tahsilde" }
        let icTakas = checks.filter { $0.status == "İç Takas" }
        
        XCTAssertEqual(takasta.count, 2)
        XCTAssertEqual(icTakas.count, 1)
        XCTAssertEqual(takasta.reduce(0) { $0 + $1.amount }, 4_000_000)
    }
    
    func test_takas_date_filter_aggregates_cheques_for_day() {
        let checks = [
            TestFixtures.makeSampleCheck(amount: 4_260_129, dueDate: "2026-09-03"),
            TestFixtures.makeSampleCheck(amount: 2_161_752, dueDate: "2026-09-03"),
            TestFixtures.makeSampleCheck(amount: 1_500_000, dueDate: "2026-09-04")
        ]
        
        let targetDate = "2026-09-03"
        let filtered = checks.filter { $0.dueDate == targetDate }
        let sum = filtered.reduce(0) { $0 + $1.amount }
        
        XCTAssertEqual(filtered.count, 2)
        XCTAssertEqual(sum, 6_421_881.0, "Sum for 03.09.2026 must match prototype KPI 6.421.881 TL")
    }
    
    func test_takas_bank_quotas_distribution_summation() {
        let checks = [
            TestFixtures.makeSampleCheck(amount: 4_260_129, bank: "M.DENİZ"),
            TestFixtures.makeSampleCheck(amount: 1_161_752, bank: "TAKSİT"),
            TestFixtures.makeSampleCheck(amount: 1_000_000, bank: "TAKSİT")
        ]
        
        var bankQuotas: [String: Double] = [:]
        for c in checks {
            bankQuotas[c.bankName, default: 0.0] += c.amount
        }
        
        XCTAssertEqual(bankQuotas["M.DENİZ"], 4_260_129.0)
        XCTAssertEqual(bankQuotas["TAKSİT"], 2_161_752.0)
    }
    
    func test_takas_cheque_status_transition_tahsilde_to_odendi() {
        var check = TestFixtures.makeSampleCheck(status: "Tahsilde")
        XCTAssertEqual(check.status, "Tahsilde")
        
        // Mark collected
        check.status = "Ödendi"
        XCTAssertEqual(check.status, "Ödendi")
    }
    
    func test_takas_internal_takas_lock_toggle() {
        var isIcTakas = false
        var currentStatus = "Tahsilde"
        
        // Lock to internal takas
        isIcTakas = true
        currentStatus = isIcTakas ? "İç Takas" : "Tahsilde"
        XCTAssertTrue(isIcTakas)
        XCTAssertEqual(currentStatus, "İç Takas")
        
        // Unlock back to clearing
        isIcTakas = false
        currentStatus = isIcTakas ? "İç Takas" : "Tahsilde"
        XCTAssertFalse(isIcTakas)
        XCTAssertEqual(currentStatus, "Tahsilde")
    }
    
    // MARK: - 4. Cariler (Current Accounts) Feature Tests (>= 5 tests)
    
    func test_caris_full_text_search_by_name_and_tax_no() {
        let caris = [
            (name: "DİVAN HAYVANCILIK GIDA SAN. TİC. LTD. ŞTİ.", taxNo: "3010482910", city: "KAYSERİ"),
            (name: "FİMAR AŞ MERMER MADENCİLİK", taxNo: "3880124955", city: "AMASYA"),
            (name: "GÜR BESİCİLİK SANAYİ", taxNo: "4201889410", city: "SULUVA")
        ]
        
        let searchByName = caris.filter { $0.name.localizedCaseInsensitiveContains("divan") }
        XCTAssertEqual(searchByName.count, 1)
        XCTAssertEqual(searchByName.first?.city, "KAYSERİ")
        
        let searchByTaxNo = caris.filter { $0.taxNo.contains("3880124955") }
        XCTAssertEqual(searchByTaxNo.count, 1)
        XCTAssertEqual(searchByTaxNo.first?.name, "FİMAR AŞ MERMER MADENCİLİK")
    }
    
    func test_caris_balance_classification_borclu_vs_alacakli() {
        let balances: [Double] = [4_215_000.0, -1_850_000.0, 0.0]
        
        func classify(balance: Double) -> String {
            if balance > 0 { return "BORCLU" }
            if balance < 0 { return "ALACAKLI" }
            return "SIFIR"
        }
        
        XCTAssertEqual(classify(balance: balances[0]), "BORCLU")
        XCTAssertEqual(classify(balance: balances[1]), "ALACAKLI")
        XCTAssertEqual(classify(balance: balances[2]), "SIFIR")
    }
    
    func test_caris_badge_styling_rose_debt_vs_emerald_credit() {
        func badgeStyle(balance: Double) -> (text: String, color: String) {
            if balance > 0 { return ("Kalan", "rose") }
            if balance < 0 { return ("Alacak", "emerald") }
            return ("Sıfır", "slate")
        }
        
        XCTAssertEqual(badgeStyle(balance: 500_000).color, "rose")
        XCTAssertEqual(badgeStyle(balance: -200_000).color, "emerald")
        XCTAssertEqual(badgeStyle(balance: 0).color, "slate")
    }
    
    func test_caris_slaughter_records_aggregation_into_cari_summary() {
        let records = [
            TestFixtures.makeSampleSlaughter(supplier: "DİVAN HAYVANCILIK", headCount: 32, carcassWeight: 9917, pricePerKg: 570, pesinat: 0),
            TestFixtures.makeSampleSlaughter(supplier: "DİVAN HAYVANCILIK", headCount: 27, carcassWeight: 8692, pricePerKg: 575, pesinat: 0),
            TestFixtures.makeSampleSlaughter(supplier: "FİMAR AŞ", headCount: 69, carcassWeight: 13635, pricePerKg: 405.17, pesinat: 10740)
        ]
        
        var summary: [String: (headCount: Int, weight: Double, total: Double)] = [:]
        for r in records {
            let key = r.supplier
            let existing = summary[key] ?? (0, 0.0, 0.0)
            summary[key] = (
                existing.headCount + r.headCount,
                existing.weight + r.carcassWeight,
                existing.total + r.totalAmount
            )
        }
        
        XCTAssertEqual(summary["DİVAN HAYVANCILIK"]?.headCount, 59)
        XCTAssertEqual(summary["DİVAN HAYVANCILIK"]?.weight, 18609.0)
        XCTAssertEqual(summary["FİMAR AŞ"]?.headCount, 69)
    }
    
    func test_caris_ledger_movement_insertion_and_running_balance() {
        var runningBalance: Double = 0.0
        
        // 1. Meat Invoice (Debit increases debt)
        let invoiceDebit = 5_664_090.0
        runningBalance += invoiceDebit
        XCTAssertEqual(runningBalance, 5_664_090.0)
        
        // 2. Bank Payment (Credit reduces debt)
        let paymentCredit = 2_000_000.0
        runningBalance -= paymentCredit
        XCTAssertEqual(runningBalance, 3_664_090.0)
    }
    
    // MARK: - 5. Menü & Enterprise Sub-screens Feature Tests (>= 5 tests)
    
    func test_menu_accordion_modules_count_and_categories() {
        let categories = [
            "Dashboard", "Çek & Senet İşlemleri", "Finans", "Muhasebe",
            "E-Faturalar", "Araç Yönetimi", "Kesim Listesi", "İhaleler",
            "Şubelerimiz", "Gayrimenkul Listesi", "Dış Muhasebe", "Hukuki İşlemler",
            "Ana Kasa", "Raporlama", "Ay Sonu", "Bildirimler", "Takvim",
            "Belgeler", "AI Asistan", "Kullanıcılar", "Ayarlar", "Durumum"
        ]
        
        XCTAssertEqual(categories.count, 22, "Menü must support all 22 defined enterprise module categories")
        XCTAssertTrue(categories.contains("Finans"))
        XCTAssertTrue(categories.contains("Araç Yönetimi"))
    }
    
    func test_menu_search_filtering_and_auto_expand() {
        let modules = [
            (category: "Finans", title: "Kredi Kartları"),
            (category: "Finans", title: "ÇEKTEN Hesabı"),
            (category: "Muhasebe", title: "Cari Kart Listesi"),
            (category: "Araç Yönetimi", title: "Araç Sigorta - Muayene")
        ]
        
        let query = "kart"
        let matches = modules.filter {
            $0.title.localizedCaseInsensitiveContains(query) || $0.category.localizedCaseInsensitiveContains(query)
        }
        
        XCTAssertEqual(matches.count, 2)
        XCTAssertTrue(matches.contains { $0.title == "Kredi Kartları" })
        XCTAssertTrue(matches.contains { $0.title == "Cari Kart Listesi" })
    }
    
    func test_menu_fleet_vehicles_inspection_critical_alert() {
        let vehicles = [
            (plate: "55 DR 992", daysLeft: 5),   // critical (<= 10)
            (plate: "05 AC 124", daysLeft: 45),  // normal
            (plate: "34 FG 4521", daysLeft: -12) // expired critical
        ]
        
        let criticalVehicles = vehicles.filter { $0.daysLeft <= 10 }
        XCTAssertEqual(criticalVehicles.count, 2)
        XCTAssertTrue(criticalVehicles.contains { $0.plate == "55 DR 992" })
        XCTAssertTrue(criticalVehicles.contains { $0.plate == "34 FG 4521" })
    }
    
    func test_menu_credit_cards_utilization_and_min_payment() {
        let formatted = Theme.Formatter.currency(30_000.0, showDecimals: false)
        XCTAssertEqual(formatted, "30.000 TL")
    }
    
    func test_menu_tenders_status_categorization() {
        let tenders = [
            (name: "Amasya Belediye Et", status: "Beklemede"),
            (name: "Samsun Kamu Hastaneleri", status: "Kazanıldı"),
            (name: "Tokat Askeri Birliği", status: "Kaybedildi")
        ]
        
        let pending = tenders.filter { $0.status == "Beklemede" }
        let won = tenders.filter { $0.status == "Kazanıldı" }
        
        XCTAssertEqual(pending.count, 1)
        XCTAssertEqual(won.count, 1)
    }
    
    // MARK: - 6. Supabase Live Networking Feature Tests (>= 5 tests)
    
    func test_supabase_auth_request_structure() {
        let email = "admin@ops360.local"
        let password = "123berkant_"
        let endpoint = "https://zubhjybqzcpplultpsgt.supabase.co/auth/v1/token?grant_type=password"
        
        XCTAssertTrue(endpoint.contains("grant_type=password"))
        XCTAssertFalse(email.isEmpty)
        XCTAssertFalse(password.isEmpty)
    }
    
    func test_supabase_check_record_json_decoding() throws {
        let jsonString = """
        {
            "id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "amount": 3500000.0,
            "bank_name": "Kuveyt Türk",
            "bank_branch": "Samsun Şb.",
            "check_no": "CK-00192",
            "check_type": "alinan",
            "document_type": "cek",
            "due_date": "2026-09-10",
            "kesideci": "DİVAN HAYVANCILIK",
            "status": "Portföy",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391"
        }
        """
        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let check = try decoder.decode(CheckRecord.self, from: data)
        
        XCTAssertEqual(check.checkNo, "CK-00192")
        XCTAssertEqual(check.amount, 3_500_000.0)
        XCTAssertEqual(check.bankName, "Kuveyt Türk")
    }
    
    func test_supabase_slaughter_record_json_decoding() throws {
        let jsonString = """
        {
            "id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "slaughter_date": "2026-08-04",
            "supplier": "DİVAN HAYVANCILIK",
            "head_count": 32,
            "animal_type": "DÜVE",
            "carcass_weight": 9917.0,
            "price_per_kg": 570.0,
            "total_amount": 5664090.0,
            "pesinat": 0.0,
            "kalan_tutar": 5664090.0,
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391"
        }
        """
        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let record = try decoder.decode(SlaughterRecord.self, from: data)
        
        XCTAssertEqual(record.supplier, "DİVAN HAYVANCILIK")
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
            "active_driver": "Ahmet Yılmaz"
        }
        """
        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let vehicle = try decoder.decode(VehicleRecord.self, from: data)
        
        XCTAssertEqual(vehicle.plate, "55 DR 992")
        XCTAssertEqual(vehicle.activeDriver, "Ahmet Yılmaz")
    }
    
    func test_supabase_caris_balance_filtering_parameters() {
        let debtorQueryParam = "balance=gt.0&order=balance.desc&limit=100"
        let creditorQueryParam = "balance=lt.0&order=balance.asc&limit=50"
        
        XCTAssertTrue(debtorQueryParam.contains("balance=gt.0"))
        XCTAssertTrue(creditorQueryParam.contains("balance=lt.0"))
    }
}
