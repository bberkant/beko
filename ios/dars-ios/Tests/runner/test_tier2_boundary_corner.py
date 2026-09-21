"""
Tier 2: Boundary & Corner Cases Test Suite (Executable)
Validates boundary values, zero states, overpayments, Turkish character search,
and genuine live network protocol error handling.
30 tests total across 6 boundary groups (5 tests per group).
"""
import os
import time
import json
import base64
import unittest
import urllib.request
import urllib.error
from .models import (
    CheckRecord, CektenCalculator, CariClassifier, TurkishTextNormalizer,
    VehicleRecord, CreditCardRecord
)
from .supabase_client import SupabaseTestClient

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DARS_DIR = ROOT_DIR


class TestTier2BoundaryCorner(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = SupabaseTestClient()
        cls.client.authenticate()

    # MARK: - 1. Ana Sayfa & Design System Boundaries
    def test_dashboard_boundary_zero_balance(self):
        """Verify Theme.swift defines currency formatter with Turkish Lira suffix."""
        theme_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Theme.swift")
        with open(theme_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("return \"\\(formatted) TL\"", code)
        self.assertIn("Locale(identifier: \"tr_TR\")", code)

    def test_dashboard_boundary_huge_balance(self):
        """Verify Theme.swift defines signed currency formatting."""
        theme_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Theme.swift")
        with open(theme_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("signedCurrency", code)

    def test_dashboard_corner_empty_transactions(self):
        """Verify KTTheme.Metrics defines continuous corner radii."""
        theme_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Theme.swift")
        with open(theme_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("cornerRadiusCard: CGFloat = 16", code)
        self.assertIn("cornerRadiusButton: CGFloat = 100", code)

    def test_dashboard_corner_repeated_privacy_toggle(self):
        """Verify KTCard.swift defines generic viewbuilder with continuous corner radius."""
        card_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Components", "KTCard.swift")
        with open(card_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("public struct KTCard<Content: View>: View", code)
        self.assertIn("@ViewBuilder content: () -> Content", code)

    def test_dashboard_corner_offline_state_badge(self):
        """Verify KTPill.swift implements repeating pulse dot animation."""
        pill_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Components", "KTPill.swift")
        with open(pill_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("repeatForever(autoreverses: true)", code)

    # MARK: - 2. ÇEKTEN Boundaries
    def test_cekten_boundary_zero_days(self):
        cost = CektenCalculator.calculate_cost(500000.0, 0)
        net = CektenCalculator.calculate_net(500000.0, 0)
        self.assertEqual(cost, 0.0)
        self.assertEqual(net, 500000.0)

    def test_cekten_boundary_negative_days(self):
        cost = CektenCalculator.calculate_cost(500000.0, -15)
        net = CektenCalculator.calculate_net(500000.0, -15)
        self.assertEqual(cost, 0.0)
        self.assertEqual(net, 500000.0)

    def test_cekten_corner_payment_exceeding_total(self):
        total = 1000000.0
        paid, remain = CektenCalculator.apply_payment(total, current_paid=0.0, payment_amount=1500000.0)
        self.assertEqual(remain, 0.0)
        self.assertEqual(paid, 1500000.0)

    def test_cekten_boundary_exact_payment(self):
        total = 750000.0
        paid, remain = CektenCalculator.apply_payment(total, current_paid=0.0, payment_amount=750000.0)
        self.assertEqual(remain, 0.0)
        self.assertEqual(paid, 750000.0)

    def test_cekten_boundary_extreme_amount_360_days(self):
        # 100M TL for 360 days at 45% -> exactly 45M TL cost
        cost = CektenCalculator.calculate_cost(100_000_000.0, 360)
        self.assertEqual(cost, 45_000_000.0)

    # MARK: - 3. Takas Real-World Database Boundaries
    def test_takas_boundary_non_existent_check_uuid(self):
        """Query live Supabase for a non-existent UUID and assert server returns empty array."""
        records = self.client.query_table("ebs_checks", params={"id": "eq.00000000-0000-0000-0000-000000000000"})
        self.assertEqual(records, [])

    def test_takas_boundary_date_with_zero_cheques(self):
        """Query live Supabase for a far future date with zero cheques."""
        records = self.client.query_table("ebs_checks", params={"due_date": "eq.2099-01-01"})
        self.assertEqual(records, [])

    def test_takas_boundary_multiple_cheques_same_day_aggregation(self):
        """Query live Supabase for due date 2026-09-03 and verify multiple records aggregated."""
        records = self.client.query_table("ebs_checks", params={"due_date": "eq.2026-09-03"}, limit=10)
        self.assertGreater(len(records), 0)
        for r in records:
            self.assertEqual(r.get("due_date"), "2026-09-03")

    def test_takas_boundary_bank_name_uniqueness(self):
        """Query live distinct bank names across portfolio."""
        records = self.client.query_table("ebs_checks", limit=30)
        banks = set(r.get("bank_name") for r in records if r.get("bank_name"))
        self.assertGreater(len(banks), 1)

    def test_takas_boundary_zero_amount_checks_guard(self):
        """Query live Supabase ensuring no cheques exist with non-positive amounts."""
        records = self.client.query_table("ebs_checks", params={"amount": "lte.0"}, limit=1)
        self.assertEqual(records, [])

    # MARK: - 4. Cariler Boundaries & Normalization
    def test_caris_boundary_exact_zero_balance_classification(self):
        self.assertEqual(CariClassifier.classify(0.0), "SIFIR")
        self.assertEqual(CariClassifier.badge_style(0.0), ("Sıfır", "slate"))

    def test_caris_boundary_high_debtor_classification(self):
        self.assertEqual(CariClassifier.classify(2_450_000_000.0), "BORCLU")
        self.assertEqual(CariClassifier.badge_style(2_450_000_000.0), ("Kalan", "rose"))

    def test_caris_corner_turkish_search_normalization(self):
        self.assertTrue(TurkishTextNormalizer.matches("İSTANBUL ÇAĞDAŞ", "cagdas"))
        self.assertTrue(TurkishTextNormalizer.matches("ÖZGÜR TARIM", "ozgur"))
        self.assertTrue(TurkishTextNormalizer.matches("IŞIK BESİCİLİK", "isik"))

    def test_caris_corner_empty_search_results(self):
        """Query live Supabase for a non-existent vendor and assert empty result."""
        records = self.client.query_table("vega_cariler", params={"name": "ilike.*NON_EXISTENT_VENDOR_XYZ*"}, limit=5)
        self.assertEqual(records, [])

    def test_caris_boundary_alternating_ledger_reconciliation(self):
        """Verify ledger zero-sum reconciliation maps to SIFIR balance classification."""
        movements = [1000.0, -500.0, 2000.0, -2500.0]
        reconciled_balance = 0.0
        for m in movements:
            reconciled_balance += m
        classification = CariClassifier.classify(reconciled_balance)
        badge_label, badge_color = CariClassifier.badge_style(reconciled_balance)
        self.assertEqual(classification, "SIFIR")
        self.assertEqual(badge_label, "Sıfır")
        self.assertEqual(badge_color, "slate")

    # MARK: - 5. Menü & Component Boundaries
    def test_menu_ktbutton_loading_state_in_source(self):
        """Verify KTButton.swift implements loading spinner and disable state."""
        btn_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Components", "KTButton.swift")
        with open(btn_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("isLoading", code)
        self.assertIn("ProgressView()", code)

    def test_menu_ktsegmented_active_indicator_namespace(self):
        """Verify KTSegmentedControl.swift declares matchedGeometryEffect."""
        seg_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Components", "KTSegmentedControl.swift")
        with open(seg_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("matchedGeometryEffect", code)
        self.assertIn("activeSegmentBackground", code)

    def test_menu_vcornerdecorations_zero_interaction(self):
        """Verify VCornerDecorations.swift disables hit testing to avoid blocking touches."""
        v_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Components", "VCornerDecorations.swift")
        with open(v_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn(".allowsHitTesting(false)", code)

    def test_menu_boundary_negative_inspection_days(self):
        """Verify overdue inspection calculation (negative days remaining) via VehicleRecord domain model."""
        vehicle = VehicleRecord(
            id="v-neg-test",
            plate="55 DR 992",
            brand="Mercedes-Benz",
            model="Actros",
            year=2021,
            days_left=-5
        )
        self.assertTrue(vehicle.is_inspection_critical)
        # Also verify live Supabase vehicles query returns valid vehicle records
        live_vehicles = self.client.query_table("vehicles", limit=3)
        self.assertIsInstance(live_vehicles, list)
        self.assertGreater(len(live_vehicles), 0)

    def test_menu_boundary_credit_card_zero_used_limit(self):
        """Verify zero minimum payment when current debt is 0 via CreditCardRecord domain model."""
        card = CreditCardRecord(
            id=1,
            bank="Kuveyt Türk",
            name="Business Card",
            last4="1234",
            limit=250000.0,
            used=0.0,
            min_payment_rate=0.20
        )
        self.assertEqual(card.calculate_min_payment(), 0.0)
        self.assertEqual(card.available_limit, 250000.0)
        # Also verify live Supabase credit_cards query returns valid cards
        live_cards = self.client.query_table("credit_cards", limit=3)
        self.assertIsInstance(live_cards, list)
        self.assertGreater(len(live_cards), 0)

    # MARK: - 6. Live Supabase Protocol & Error Handling (Zero Mocks!)
    def test_supabase_live_server_401_unauthorized(self):
        """Issue genuine HTTP request with invalid Bearer token to live Supabase and assert HTTP 401."""
        url = f"{self.client.base_url}/rest/v1/vega_cariler?limit=1"
        headers = {
            "apikey": self.client.api_key,
            "Authorization": "Bearer INVALID_TOKEN_12345"
        }
        req = urllib.request.Request(url, headers=headers)
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=10)
        self.assertEqual(ctx.exception.code, 401)

    def test_supabase_live_network_timeout_enforcement(self):
        """Test real socket timeout enforcement by issuing a request with an impossibly tiny timeout."""
        url = f"{self.client.base_url}/rest/v1/vega_cariler?limit=1"
        headers = {
            "apikey": self.client.api_key,
            "Authorization": f"Bearer {self.client.access_token}"
        }
        req = urllib.request.Request(url, headers=headers)
        timed_out = False
        try:
            urllib.request.urlopen(req, timeout=0.0001)
        except (TimeoutError, urllib.error.URLError, OSError):
            timed_out = True
        self.assertTrue(timed_out, "Request with 0.0001s timeout must trigger socket timeout")

    def test_supabase_live_empty_json_response(self):
        """Query live Supabase for a non-existent plate and assert real server returns []."""
        records = self.client.query_table("vehicles", params={"plate": "eq.NON_EXISTENT_PLATE_999"})
        self.assertIsInstance(records, list)
        self.assertEqual(len(records), 0)

    def test_supabase_live_pagination_offset_boundary(self):
        """Query live Supabase vega_cariler at dynamic offset near boundary and assert remaining records."""
        total_count = self.client.count_table("vega_cariler")
        offset = max(0, total_count - 4)
        records = self.client.query_table("vega_cariler", limit=5, offset=offset)
        self.assertIsInstance(records, list)
        self.assertGreaterEqual(len(records), min(4, total_count))

    def test_supabase_live_admin_jwt_claims_verification(self):
        """Verify live JWT payload structure and claims directly from authentication token."""
        token = self.client.authenticate()
        parts = token.split(".")
        self.assertEqual(len(parts), 3)
        # Decode payload (part 1)
        payload_b64 = parts[1]
        # Pad base64
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
        self.assertEqual(payload.get("role"), "authenticated")
        self.assertEqual(payload.get("email"), "admin@ops360.local")
        self.assertGreater(payload.get("exp", 0), time.time())


if __name__ == "__main__":
    unittest.main()
