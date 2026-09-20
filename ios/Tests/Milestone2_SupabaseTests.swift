import XCTest
import Foundation
@testable import dars_ios

final class Milestone2_SupabaseTests: XCTestCase {

    // MARK: - 1. Model Payload Tests (Live Production Schemas)

    func test_vega_cari_decoding_from_production_payload() throws {
        let json = """
        {
            "id": "e4e6c5f6-b4b0-45cd-9977-828c063f8a0d",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "code": "246",
            "name": "PİDECİM OĞUZ DANACI",
            "company_code": "PİDECİM DÜKKAN",
            "company_tracking_code": "0425",
            "tax_office": "AMASYA",
            "tax_no": null,
            "type": "Müşteri",
            "city": "AMASYA",
            "last_transaction_date": "2026-08-31T16:48:58+00:00",
            "balance": 9871.72,
            "created_at": "2026-08-08T16:05:18.568517+00:00",
            "updated_at": "2026-08-08T16:05:18.568517+00:00"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        let cari = try decoder.decode(VegaCari.self, from: json)

        XCTAssertEqual(cari.id.uuidString.lowercased(), "e4e6c5f6-b4b0-45cd-9977-828c063f8a0d")
        XCTAssertEqual(cari.organizationId?.uuidString.lowercased(), "13b8da90-27d1-440d-a8f4-eb50dadd6391")
        XCTAssertEqual(cari.code, "246")
        XCTAssertEqual(cari.name, "PİDECİM OĞUZ DANACI")
        XCTAssertEqual(cari.taxOffice, "AMASYA")
        XCTAssertNil(cari.taxNo)
        XCTAssertEqual(cari.city, "AMASYA")
        XCTAssertEqual(cari.balance, 9871.72, accuracy: 0.001)

        // Roundtrip JSON serialization check
        let encoded = try JSONEncoder().encode(cari)
        let redecoded = try decoder.decode(VegaCari.self, from: encoded)
        XCTAssertEqual(redecoded.id, cari.id)
        XCTAssertEqual(redecoded.balance, cari.balance, accuracy: 0.001)
    }

    func test_vega_cari_null_optional_handling_and_balance_classification() throws {
        let json = """
        {
            "id": "046005fe-e9f4-4238-bbe1-807ce2d64afc",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "code": "120",
            "name": "MURAT KARAGÖL",
            "company_code": null,
            "company_tracking_code": null,
            "tax_office": null,
            "tax_no": null,
            "type": "Müşteri",
            "city": null,
            "last_transaction_date": null,
            "balance": 0.0,
            "created_at": "2026-08-08T16:05:18.568517+00:00",
            "updated_at": "2026-08-08T16:05:18.568517+00:00"
        }
        """.data(using: .utf8)!

        let cari = try JSONDecoder().decode(VegaCari.self, from: json)
        XCTAssertNil(cari.taxOffice)
        XCTAssertNil(cari.city)
        XCTAssertEqual(cari.balance, 0.0)

        // Verify balance classification helpers
        XCTAssertEqual(cari.balanceStatus, .sifir)

        let debitCari = VegaCari(
            id: UUID(), organizationId: UUID(), code: "1", name: "Borclu Test",
            companyCode: nil, companyTrackingCode: nil, taxOffice: nil, taxNo: nil,
            type: "Müşteri", city: nil, lastTransactionDate: nil, balance: 1500.0,
            createdAt: nil, updatedAt: nil
        )
        XCTAssertEqual(debitCari.balanceStatus, .borclu)

        let creditCari = VegaCari(
            id: UUID(), organizationId: UUID(), code: "2", name: "Alacakli Test",
            companyCode: nil, companyTrackingCode: nil, taxOffice: nil, taxNo: nil,
            type: "Müşteri", city: nil, lastTransactionDate: nil, balance: -3500.0,
            createdAt: nil, updatedAt: nil
        )
        XCTAssertEqual(creditCari.balanceStatus, .alacakli)
    }

    func test_ebs_check_decoding_from_production_payload() throws {
        let json = """
        {
            "id": "00968577-5685-4fbe-bb36-e0edcc301ec1",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "check_type": "kesilen",
            "issue_date": "2025-09-09",
            "due_date": "2026-06-08",
            "amount": 779194.0,
            "check_no": "CK-0024057",
            "debtor": "TAKSİT",
            "creditor": "ALBARAKA-7.000.000",
            "bank_name": "TAKSİT",
            "bank_branch": "Merkez",
            "status": "Ödendi",
            "created_at": "2026-07-22T01:56:34.653336+00:00",
            "updated_at": "2026-08-31T08:03:45.032+00:00",
            "local_id": 10343,
            "para_birimi": "TL",
            "ozel_alan": "TAKSİT",
            "kesideci": "BURAK BESİCİLİK",
            "keside_yeri": "Amasya",
            "tahsildar_banka": "Kuveyt Türk",
            "ciro_edilen": "FİMAR AŞ",
            "document_type": "cek"
        }
        """.data(using: .utf8)!

        let check = try JSONDecoder().decode(EBSCheck.self, from: json)
        XCTAssertEqual(check.checkNo, "CK-0024057")
        XCTAssertEqual(check.amount, 779194.0, accuracy: 0.01)
        XCTAssertEqual(check.dueDate, "2026-06-08")
        XCTAssertEqual(check.bankName, "TAKSİT")
        XCTAssertEqual(check.bankBranch, "Merkez")
        XCTAssertEqual(check.status, "Ödendi")
        XCTAssertEqual(check.checkType, "kesilen")
        XCTAssertEqual(check.documentType, "cek")
        XCTAssertEqual(check.kesideci, "BURAK BESİCİLİK")

        let encoded = try JSONEncoder().encode(check)
        let redecoded = try JSONDecoder().decode(EBSCheck.self, from: encoded)
        XCTAssertEqual(redecoded.id, check.id)
        XCTAssertEqual(redecoded.amount, check.amount, accuracy: 0.01)
    }

    func test_kesim_item_decoding_from_production_payload() throws {
        let json = """
        {
            "id": "d28ce2f1-6159-4185-82b0-a42e675f6b45",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "slaughter_date": "2022-01-02",
            "supplier": "HALİL AY",
            "ear_tag_no": "TR0500123456",
            "animal_type": "Dana",
            "live_weight": 520.0,
            "carcass_weight": 283.0,
            "yield_rate": 54.4,
            "price_per_kg": 500.0,
            "total_amount": 141500.0,
            "notes": "Veteriner Onaylı",
            "created_at": "2026-08-14T22:09:32.892448+00:00",
            "updated_at": "2026-08-14T22:09:32.892448+00:00",
            "head_count": 13,
            "pesinat": 41500.0,
            "kalan_tutar": 100000.0,
            "payment_date": "PEŞİN",
            "is_acik_mal": false
        }
        """.data(using: .utf8)!

        let item = try JSONDecoder().decode(KesimItem.self, from: json)
        XCTAssertEqual(item.supplier, "HALİL AY")
        XCTAssertEqual(item.headCount, 13)
        XCTAssertEqual(item.carcassWeight, 283.0, accuracy: 0.01)
        XCTAssertEqual(item.pricePerKg, 500.0, accuracy: 0.01)
        XCTAssertEqual(item.totalAmount, 141500.0, accuracy: 0.01)
        XCTAssertEqual(item.kalanTutar, 100000.0, accuracy: 0.01)
        XCTAssertEqual(item.isAcikMal, false)
    }

    func test_cekten_hesap_decoding_from_production_payload() throws {
        let json = """
        {
            "id": "368b8977-5d97-4b36-ba49-b5260b18fc19",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "date": "2026-08-24",
            "supplier": "MUTENA",
            "total_amount": 500000.0,
            "paid_amount": 150000.0,
            "remaining_amount": 350000.0,
            "notes": "Haftalık kesinti",
            "payment_date": "CARİ",
            "created_at": "2026-08-24T08:18:44.02155+00:00",
            "updated_at": "2026-08-24T08:18:44.02155+00:00"
        }
        """.data(using: .utf8)!

        let cekten = try JSONDecoder().decode(CektenHesap.self, from: json)
        XCTAssertEqual(cekten.supplier, "MUTENA")
        XCTAssertEqual(cekten.date, "2026-08-24")
        XCTAssertEqual(cekten.totalAmount, 500000.0, accuracy: 0.01)
        XCTAssertEqual(cekten.paidAmount, 150000.0, accuracy: 0.01)
        XCTAssertEqual(cekten.remainingAmount, 350000.0, accuracy: 0.01)
        XCTAssertEqual(cekten.paymentDate, "CARİ")
    }

    func test_vehicle_decoding_from_production_payload() throws {
        let json = """
        {
            "id": "04a6cb1f-446e-4900-9794-49be67e0a4e2",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "plate": "05 ER 120",
            "brand": "Tırsan 2018 Model Dorse",
            "model": "Standart",
            "model_year": 2008,
            "vehicle_type": "kamyon",
            "fuel_type": "dizel",
            "current_km": 142000,
            "assigned_to": "Ahmet Yılmaz",
            "department": "Lojistik",
            "purchase_date": "2018-05-10",
            "inspection_date": "2026-11-15",
            "insurance_date": "2026-10-01",
            "casco_date": "2026-10-01",
            "status": "aktif",
            "description": "Muayene geçerli",
            "purchase_price": 150000.0,
            "current_price": 150000.0
        }
        """.data(using: .utf8)!

        let vehicle = try JSONDecoder().decode(Vehicle.self, from: json)
        XCTAssertEqual(vehicle.plate, "05 ER 120")
        XCTAssertEqual(vehicle.brand, "Tırsan 2018 Model Dorse")
        XCTAssertEqual(vehicle.model, "Standart")
        XCTAssertEqual(vehicle.modelYear, 2008)
        XCTAssertEqual(vehicle.vehicleType, "kamyon")
        XCTAssertEqual(vehicle.fuelType, "dizel")
        XCTAssertEqual(vehicle.status, "aktif")
    }

    func test_bank_account_decoding_from_production_payload() throws {
        let json = """
        {
            "id": "e10bd999-cdb3-4438-91f0-46bb10ff2228",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "bank": "ETİK FİNANSBANK",
            "account_name": "ETİK ET VE ET ÜRÜNLERİ GIDA TAR HAY SAN TİC LTD ŞTİ",
            "account_type": "vadesiz",
            "iban": "TR140011100000000061766073",
            "account_number": "61766073",
            "branch_name": "Amasya Merkez",
            "currency": "TRY",
            "balance": 1825000.50,
            "available_balance": 1825000.50,
            "status": "aktif",
            "description": "Ana Ticari Hesap"
        }
        """.data(using: .utf8)!

        let account = try JSONDecoder().decode(BankAccount.self, from: json)
        XCTAssertEqual(account.bank, "ETİK FİNANSBANK")
        XCTAssertEqual(account.iban, "TR140011100000000061766073")
        XCTAssertEqual(account.accountNumber, "61766073")
        XCTAssertEqual(account.currency, "TRY")
        XCTAssertEqual(account.balance, 1825000.50, accuracy: 0.01)
        XCTAssertEqual(account.status, "aktif")
    }

    func test_credit_card_decoding_from_production_payload() throws {
        let json = """
        {
            "id": "5adf1d39-19c2-49ab-9c90-1b23b16adbe1",
            "organization_id": "13b8da90-27d1-440d-a8f4-eb50dadd6391",
            "bank": "ETİK ALBARAKA",
            "bank_short": "EA",
            "card_name": "EK KART",
            "card_type": "business",
            "last4": "9132",
            "holder": "Berkant Güler",
            "department": "Yönetim",
            "card_limit": 500000.0,
            "current_debt": 125400.0,
            "currency": "TRY",
            "statement_day": 10,
            "due_day": 20,
            "min_payment_rate": 0.4,
            "start_date": "2026-07-18",
            "expiry_month": 1,
            "expiry_year": 2028,
            "status": "aktif",
            "statement_status": "bekleniyor"
        }
        """.data(using: .utf8)!

        let card = try JSONDecoder().decode(CreditCard.self, from: json)
        XCTAssertEqual(card.bank, "ETİK ALBARAKA")
        XCTAssertEqual(card.cardName, "EK KART")
        XCTAssertEqual(card.last4, "9132")
        XCTAssertEqual(card.cardLimit, 500000.0, accuracy: 0.01)
        XCTAssertEqual(card.currentDebt, 125400.0, accuracy: 0.01)
        XCTAssertEqual(card.minPaymentRate, 0.4, accuracy: 0.001)
        XCTAssertEqual(card.availableLimit, 374600.0, accuracy: 0.01)
    }

    func test_dashboard_summary_initialization_and_aggregation() {
        let summary = DashboardSummary(
            totalBalance: 42150800.50,
            totalReceivable: 18450000.00,
            totalPayable: 9870000.00,
            dailyCheckTotal: 3450000.00,
            monthlyKesimCount: 428,
            liveSyncPulse: true
        )

        XCTAssertEqual(summary.totalBalance, 42150800.50, accuracy: 0.01)
        XCTAssertEqual(summary.totalReceivable, 18450000.00, accuracy: 0.01)
        XCTAssertEqual(summary.totalPayable, 9870000.00, accuracy: 0.01)
        XCTAssertEqual(summary.dailyCheckTotal, 3450000.00, accuracy: 0.01)
        XCTAssertEqual(summary.monthlyKesimCount, 428)
        XCTAssertTrue(summary.liveSyncPulse)
    }

    // MARK: - 2. SupabaseConfig Tests

    func test_supabase_config_url_validity_and_scheme() {
        let url = SupabaseConfig.url
        XCTAssertEqual(url.scheme, "https")
        XCTAssertEqual(url.host, "zubhjybqzcpplultpsgt.supabase.co")
        XCTAssertNil(url.port)
        XCTAssertTrue(url.path.isEmpty || url.path == "/")
    }

    func test_supabase_config_api_key_format_and_security() {
        let apiKey = SupabaseConfig.apiKey
        XCTAssertFalse(apiKey.isEmpty, "API Key must not be empty")
        XCTAssertTrue(
            apiKey.hasPrefix("sb_publishable_") || apiKey.count >= 40,
            "API key must start with standard prefix or be a valid JWT length"
        )
        XCTAssertFalse(apiKey.contains(" "), "API key must not contain whitespace")
        XCTAssertFalse(apiKey.contains("\n"), "API key must not contain line breaks")
    }

    func test_supabase_config_admin_credentials_and_org_id() {
        let email = SupabaseConfig.adminEmail
        XCTAssertEqual(email, "admin@ops360.local")
        XCTAssertTrue(email.contains("@") && email.contains("."))

        let orgId = SupabaseConfig.defaultOrganizationId
        XCTAssertEqual(orgId.uuidString.lowercased(), "13b8da90-27d1-440d-a8f4-eb50dadd6391")
    }

    func test_supabase_config_endpoint_builders() {
        let restVegaURL = SupabaseConfig.restURL(for: "vega_cariler")
        XCTAssertEqual(
            restVegaURL.absoluteString,
            "https://zubhjybqzcpplultpsgt.supabase.co/rest/v1/vega_cariler"
        )

        let authURL = SupabaseConfig.authURL
        XCTAssertEqual(
            authURL.absoluteString,
            "https://zubhjybqzcpplultpsgt.supabase.co/auth/v1/token?grant_type=password"
        )
    }

    // MARK: - 3. JWT Token Parsing & Expiration Mathematics

    func test_jwt_parsing_valid_three_part_structure() throws {
        // Authentic header: {"alg":"HS256","typ":"JWT"} -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
        // Authentic payload: {"email":"admin@ops360.local","role":"authenticated","exp":1900000000,"sub":"13b8da90-27d1-440d-a8f4-eb50dadd6391"}
        // -> eyJlbWFpbCI6ImFkbWluQG9wczM2MC5sb2NhbCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxOTAwMDAwMDAwLCJzdWIiOiIxM2I4ZGE5MC0yN2QxLTQ0MGQtYThmNC1lYjUwZGFkZDYzOTEifQ
        let validJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQG9wczM2MC5sb2NhbCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxOTAwMDAwMDAwLCJzdWIiOiIxM2I4ZGE5MC0yN2QxLTQ0MGQtYThmNC1lYjUwZGFkZDYzOTEifQ.signaturePlaceholder"

        let claims = try SupabaseAuthToken.parseJWT(validJWT)
        XCTAssertEqual(claims.email, "admin@ops360.local")
        XCTAssertEqual(claims.role, "authenticated")
        XCTAssertEqual(claims.sub, "13b8da90-27d1-440d-a8f4-eb50dadd6391")
        XCTAssertEqual(claims.exp, 1900000000)
    }

    func test_jwt_expiration_active_token() {
        let futureExp = Int(Date().timeIntervalSince1970) + 3600
        let token = SupabaseAuthToken(
            accessToken: "test.active.token",
            tokenType: "bearer",
            expiresIn: 3600,
            expirationDate: Date(timeIntervalSince1970: TimeInterval(futureExp)),
            email: "admin@ops360.local",
            role: "authenticated",
            userId: "13b8da90-27d1-440d-a8f4-eb50dadd6391"
        )

        XCTAssertFalse(token.isExpired)
        XCTAssertGreaterThan(token.timeRemaining, 3500.0)
    }

    func test_jwt_expiration_expired_token() {
        let pastExp = Int(Date().timeIntervalSince1970) - 600
        let token = SupabaseAuthToken(
            accessToken: "test.expired.token",
            tokenType: "bearer",
            expiresIn: 3600,
            expirationDate: Date(timeIntervalSince1970: TimeInterval(pastExp)),
            email: "admin@ops360.local",
            role: "authenticated",
            userId: "13b8da90-27d1-440d-a8f4-eb50dadd6391"
        )

        XCTAssertTrue(token.isExpired)
        XCTAssertLessThanOrEqual(token.timeRemaining, 0.0)
    }

    func test_jwt_parsing_malformed_token_rejection() {
        let singlePart = "not-a-jwt"
        XCTAssertThrowsError(try SupabaseAuthToken.parseJWT(singlePart)) { error in
            XCTAssertEqual(error as? SupabaseAuthError, .malformedToken)
        }

        let invalidBase64 = "header.???not-valid-b64???.sig"
        XCTAssertThrowsError(try SupabaseAuthToken.parseJWT(invalidBase64)) { error in
            XCTAssertEqual(error as? SupabaseAuthError, .invalidBase64Encoding)
        }
    }

    // MARK: - 4. PostgREST Query Filter String Construction

    func test_query_filter_due_date_construction() {
        let exactFilter = SupabaseQueryFilter.dueDateEquals("2026-09-03")
        XCTAssertEqual(exactFilter, "due_date=eq.2026-09-03")

        let rangeFilter = SupabaseQueryFilter.dueDateRange(from: "2026-01-01", to: "2026-12-31")
        XCTAssertEqual(rangeFilter, "due_date=gte.2026-01-01&due_date=lte.2026-12-31")
    }

    func test_query_filter_is_ic_takas_construction() {
        let icTakasTrue = SupabaseQueryFilter.isIcTakas(true)
        XCTAssertEqual(icTakasTrue, "is_ic_takas=eq.true")

        let icTakasFalse = SupabaseQueryFilter.isIcTakas(false)
        XCTAssertEqual(icTakasFalse, "is_ic_takas=eq.false")
    }

    func test_query_filter_balance_comparison_construction() {
        let debitFilter = SupabaseQueryFilter.balanceGreaterThan(0)
        XCTAssertEqual(debitFilter, "balance=gt.0")

        let creditFilter = SupabaseQueryFilter.balanceLessThan(0)
        XCTAssertEqual(creditFilter, "balance=lt.0")

        let zeroFilter = SupabaseQueryFilter.balanceEquals(0)
        XCTAssertEqual(zeroFilter, "balance=eq.0")
    }

    func test_query_filter_compound_postgrest_url_construction() {
        let url = SupabaseQueryFilter.buildURL(
            table: "ebs_checks",
            select: "*",
            filters: [
                "status": "eq.Tahsilde",
                "due_date": "gte.2026-01-01"
            ],
            order: "due_date.asc",
            limit: 50,
            offset: 100
        )

        let queryString = url.query ?? ""
        XCTAssertTrue(queryString.contains("select=*"))
        XCTAssertTrue(queryString.contains("status=eq.Tahsilde"))
        XCTAssertTrue(queryString.contains("due_date=gte.2026-01-01"))
        XCTAssertTrue(queryString.contains("order=due_date.asc"))
        XCTAssertTrue(queryString.contains("limit=50"))
        XCTAssertTrue(queryString.contains("offset=100"))
        XCTAssertEqual(url.path, "/rest/v1/ebs_checks")
    }
}
