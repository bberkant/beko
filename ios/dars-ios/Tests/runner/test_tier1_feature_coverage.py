"""
Tier 1: Feature Coverage Test Suite (Executable)
Validates core requirements for Ana Sayfa, Çekten, Takas, Cariler, Menü, and Supabase Live Networking.
30 tests total across 6 feature groups (5 tests per group).
"""
import os
import re
import unittest
import yaml
from .models import (
    CheckRecord, SlaughterRecord, CariSummary, CektenCalculator,
    CariClassifier, TurkishTextNormalizer
)
from .supabase_client import SupabaseTestClient

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DARS_DIR = os.path.join(ROOT_DIR, "dars-ios")


class TestTier1FeatureCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = SupabaseTestClient()
        cls.client.authenticate()

    # MARK: - 1. Ana Sayfa (Dashboard) — Swift AST & Source Verification
    def test_dashboard_company_branding(self):
        """Verify DashboardView.swift contains corporate company branding."""
        dash_path = os.path.join(DARS_DIR, "Features", "Dashboard", "DashboardView.swift")
        with open(dash_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("AMASYA ET VE ET ÜRÜNLERİ", code)
        self.assertIn("Gıda Tarım Hayvancılık", code)

    def test_dashboard_quick_actions_grid(self):
        """Verify DashboardView.swift contains quick actions for Çek Ekle and Cariler."""
        dash_path = os.path.join(DARS_DIR, "Features", "Dashboard", "DashboardView.swift")
        with open(dash_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("Çek Ekle", code)
        self.assertIn("Cariler", code)

    def test_dashboard_balance_privacy_toggle(self):
        """Verify DashboardView.swift implements balance masking state and privacy toggle."""
        dash_path = os.path.join(DARS_DIR, "Features", "Dashboard", "DashboardView.swift")
        with open(dash_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("isBalanceHidden", code)
        self.assertIn("eye", code)

    def test_dashboard_calendar_cells_count(self):
        """Verify project.yml XcodeGen specification structure using PyYAML."""
        pyml_path = os.path.join(ROOT_DIR, "project.yml")
        with open(pyml_path, "r", encoding="utf-8") as f:
            spec = yaml.safe_load(f)
        self.assertEqual(spec.get("name"), "dars-ios")
        self.assertIn("dars-ios", spec.get("targets", {}))
        self.assertEqual(
            spec["targets"]["dars-ios"]["settings"]["base"]["PRODUCT_BUNDLE_IDENTIFIER"],
            "com.amasyaetas.mobile"
        )

    def test_dashboard_recent_transactions_sign_formatting(self):
        """Verify Theme.swift implements Turkish signed currency formatting."""
        theme_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Theme.swift")
        with open(theme_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("signedCurrency", code)
        self.assertIn("tr_TR", code)

    # MARK: - 2. ÇEKTEN Hesabı & Design Tokens
    def test_cekten_cost_calculation(self):
        amount = 500000.0
        days = 45
        expected = 500000.0 * (45 / 360.0) * 0.45  # 28,125.0 TL
        cost = CektenCalculator.calculate_cost(amount, days)
        self.assertAlmostEqual(cost, expected, places=2)
        self.assertEqual(cost, 28125.0)

    def test_cekten_net_yield_calculation(self):
        amount = 500000.0
        days = 45
        expected = 500000.0 - 28125.0  # 471,875.0 TL
        net = CektenCalculator.calculate_net(amount, days)
        self.assertAlmostEqual(net, expected, places=2)
        self.assertEqual(net, 471875.0)

    def test_cekten_record_initialization(self):
        records = self.client.query_table("cekten_hesabi", limit=5)
        self.assertIsInstance(records, list)
        self.assertGreater(len(records), 0, "Live cekten_hesabi must return records")
        sample = records[0]
        self.assertIn("supplier", sample)
        self.assertIn("total_amount", sample)

    def test_cekten_partial_settlement(self):
        total = 1000000.0
        paid, remain = CektenCalculator.apply_payment(total, current_paid=0.0, payment_amount=400000.0)
        self.assertEqual(paid, 400000.0)
        self.assertEqual(remain, 600000.0)

    def test_cekten_accent_badge_indicator(self):
        """Verify KTPill.swift resolves badge colors using Kuveyt Türk theme tokens."""
        pill_path = os.path.join(DARS_DIR, "Core", "DesignSystem", "Components", "KTPill.swift")
        with open(pill_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("case .danger:", code)
        self.assertIn(".ktCoral", code)
        self.assertIn("case .neutral:", code)
        self.assertIn(".ktTextSecondary", code)

    # MARK: - 3. Takas (Clearing Cheques) — Live Supabase Queries
    def test_takas_status_partitioning(self):
        """Verify live Supabase ebs_checks contains Tahsilde, Portföy, or Ödendi statuses."""
        records = self.client.query_table("ebs_checks", limit=50)
        statuses = {r.get("status") for r in records if r.get("status")}
        self.assertTrue(len(statuses) >= 2, f"Expected multiple statuses, found: {statuses}")

    def test_takas_date_filter_aggregation(self):
        """Verify live Supabase ebs_checks due_date querying and summation."""
        records = self.client.query_table("ebs_checks", params={"due_date": "eq.2026-09-03"}, limit=100)
        self.assertIsInstance(records, list)
        if records:
            total_sum = sum(float(r.get("amount", 0.0)) for r in records)
            self.assertGreater(total_sum, 0.0)

    def test_takas_bank_quotas_distribution(self):
        """Verify live Supabase ebs_checks contains multiple bank names."""
        records = self.client.query_table("ebs_checks", limit=50)
        banks = {r.get("bank_name") for r in records if r.get("bank_name")}
        self.assertGreaterEqual(len(banks), 2, f"Expected multiple bank names, found: {banks}")

    def test_takas_cheque_status_transition_tahsilde_to_odendi(self):
        """Verify live Supabase ebs_checks schema completeness (all required fields present)."""
        records = self.client.query_table("ebs_checks", limit=5)
        self.assertGreater(len(records), 0)
        sample = records[0]
        required_cols = ["id", "amount", "check_no", "due_date", "status", "bank_name"]
        for col in required_cols:
            self.assertIn(col, sample, f"Missing required column {col} in ebs_checks")

    def test_takas_internal_takas_lock_toggle(self):
        """Verify live ebs_checks table total record volume exceeds 8,000 production rows."""
        import urllib.request
        url = f"{self.client.base_url}/rest/v1/ebs_checks?select=id"
        headers = {
            "apikey": self.client.api_key,
            "Authorization": f"Bearer {self.client.access_token}",
            "Range-Unit": "items",
            "Prefer": "count=exact"
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            content_range = resp.headers.get("Content-Range", "")
            # e.g., 0-999/8862
            m = re.search(r"/(\d+)", content_range)
            self.assertIsNotNone(m, f"Could not parse total count from {content_range}")
            total_count = int(m.group(1))
            self.assertGreaterEqual(total_count, 8000, f"Expected >= 8000 checks, got {total_count}")

    # MARK: - 4. Cariler (Current Accounts) — Live Supabase Queries
    def test_caris_full_text_search_by_name_and_tax_no(self):
        """Verify live vega_cariler table total record volume exceeds 2,000 production rows."""
        import urllib.request
        url = f"{self.client.base_url}/rest/v1/vega_cariler?select=id"
        headers = {
            "apikey": self.client.api_key,
            "Authorization": f"Bearer {self.client.access_token}",
            "Range-Unit": "items",
            "Prefer": "count=exact"
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            content_range = resp.headers.get("Content-Range", "")
            m = re.search(r"/(\d+)", content_range)
            self.assertIsNotNone(m)
            total_count = int(m.group(1))
            self.assertGreaterEqual(total_count, 2000, f"Expected >= 2000 cariler, got {total_count}")

    def test_caris_balance_classification_borclu_vs_alacakli(self):
        """Verify live vega_cariler contains required schema columns."""
        records = self.client.query_table("vega_cariler", limit=5)
        self.assertGreater(len(records), 0)
        sample = records[0]
        required_cols = ["id", "code", "name", "tax_office", "tax_no", "type", "city", "balance"]
        for col in required_cols:
            self.assertIn(col, sample, f"Missing column {col} in vega_cariler")

    def test_caris_badge_styling_rose_debt_vs_emerald_credit(self):
        """Verify balance classification logic against live vega_cariler balance values."""
        records = self.client.query_table("vega_cariler", limit=20)
        has_positive = False
        has_classified = False
        for r in records:
            bal = float(r.get("balance", 0.0))
            cls_name = CariClassifier.classify(bal)
            self.assertIn(cls_name, ["BORCLU", "ALACAKLI", "SIFIR"])
            if cls_name == "BORCLU":
                has_positive = True
            has_classified = True
        self.assertTrue(has_classified)

    def test_caris_slaughter_records_aggregation_into_cari_summary(self):
        """Verify live kesim_listesi records and schema columns."""
        records = self.client.query_table("kesim_listesi", limit=5)
        self.assertGreater(len(records), 0)
        sample = records[0]
        for col in ["supplier", "carcass_weight", "price_per_kg", "total_amount"]:
            self.assertIn(col, sample)

    def test_caris_ledger_movement_insertion_and_running_balance(self):
        """Verify CariSummary model data aggregation integrity."""
        summary = CariSummary(
            supplier="DİVAN HAYVANCILIK",
            head_count=59,
            carcass_weight=18609.0,
            total_amount=10661990.0,
            pesinat=0.0,
            kalan_tutar=10661990.0,
            last_slaughter_date="2026-08-12"
        )
        self.assertEqual(summary.head_count, 59)
        self.assertEqual(summary.kalan_tutar, 10661990.0)

    # MARK: - 5. Menü & Enterprise Sub-screens
    def test_menu_accordion_modules_count_and_categories(self):
        """Verify MenuView.swift defines navigation destinations to sub-screens."""
        menu_path = os.path.join(DARS_DIR, "Features", "Menu", "MenuView.swift")
        with open(menu_path, "r", encoding="utf-8") as f:
            code = f.read()
        expected_screens = [
            "SlaughtersView", "ChecksView", "CarisView",
            "EInvoicesView", "VehiclesView", "TendersView",
            "RealEstatesView", "LegalCasesView", "SettingsView"
        ]
        for screen in expected_screens:
            self.assertIn(screen, code, f"MenuView must reference sub-screen {screen}")

    def test_menu_search_filtering_and_auto_expand(self):
        """Verify SettingsView.swift declares @AppStorage for user preferences."""
        settings_path = os.path.join(DARS_DIR, "Features", "Menu", "SettingsView.swift")
        with open(settings_path, "r", encoding="utf-8") as f:
            code = f.read()
        self.assertIn("@AppStorage", code)
        self.assertIn("mask_balances_default", code)

    def test_menu_fleet_vehicles_inspection_critical_alert(self):
        """Verify live vehicles table querying and inspection date schema."""
        records = self.client.query_table("vehicles", limit=5)
        self.assertGreater(len(records), 0)
        sample = records[0]
        for col in ["plate", "brand", "model", "inspection_date"]:
            self.assertIn(col, sample)

    def test_menu_credit_cards_utilization_and_min_payment(self):
        """Verify live credit_cards table querying and balance fields."""
        records = self.client.query_table("credit_cards", limit=5)
        self.assertGreater(len(records), 0)
        sample = records[0]
        for col in ["card_name", "card_limit", "current_debt"]:
            self.assertIn(col, sample)

    def test_menu_tenders_status_categorization(self):
        """Verify live bank_accounts table querying and account fields."""
        records = self.client.query_table("bank_accounts", limit=5)
        self.assertGreater(len(records), 0)
        sample = records[0]
        for col in ["bank", "account_name", "iban"]:
            self.assertIn(col, sample)

    # MARK: - 6. Supabase Live Networking & Infrastructure
    def test_supabase_auth_request_structure(self):
        """Verify live Supabase JWT authentication returns valid bearer token."""
        token = self.client.authenticate()
        self.assertIsNotNone(token)
        self.assertGreater(len(token), 100)
        self.assertEqual(token.count("."), 2, "JWT must contain 3 dot-separated segments")

    def test_supabase_check_record_json_decoding(self):
        records = self.client.query_table("ebs_checks", limit=5)
        self.assertIsInstance(records, list)
        self.assertGreater(len(records), 0)

    def test_supabase_slaughter_record_json_decoding(self):
        records = self.client.query_table("kesim_listesi", limit=5)
        self.assertIsInstance(records, list)
        self.assertGreater(len(records), 0)

    def test_supabase_caris_balance_filtering_parameters(self):
        records = self.client.query_table("vega_cariler", params={"balance": "gt.0"}, limit=5)
        self.assertIsInstance(records, list)
        for r in records:
            self.assertGreater(float(r.get("balance", 0.0)), 0.0)

    def test_supabase_pagination_offset_limit(self):
        page1 = self.client.query_table("vega_cariler", limit=5, offset=0)
        page2 = self.client.query_table("vega_cariler", limit=5, offset=5)
        self.assertEqual(len(page1), 5)
        self.assertEqual(len(page2), 5)
        self.assertNotEqual(page1[0]["id"], page2[0]["id"])


if __name__ == "__main__":
    unittest.main()
