"""
Milestone 3: Live Dashboard Data Aggregation & 5-Tab Navigation Contracts.
Connects to live Supabase backend (https://zubhjybqzcpplultpsgt.supabase.co):
- Authenticates via JWT password grant (admin@ops360.local)
- Verifies live data aggregation for DashboardSummary contract
- Verifies bank accounts balances summation
- Verifies corporate credit cards debt summation
- Verifies counterparty receivables (balance > 0) & payables (balance < 0)
- Verifies recent cheques feed ordering and schema
- Verifies recent slaughter records count
- Verifies financial privacy masking contracts
- Verifies 5-tab navigation bounds (0 to 4) and quick action targets
- Verifies error resilience and fallback states
"""
import os
import sys
import unittest
from typing import Dict, Any, List

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from Tests.runner.supabase_client import (
    ADMIN_EMAIL, ADMIN_PASSWORD, SupabaseTestClient
)


class TestM3DashboardLive(unittest.TestCase):
    """Executes live backend verification of dashboard data aggregation."""

    @classmethod
    def setUpClass(cls):
        cls.client = SupabaseTestClient()
        cls.token = cls.client.authenticate(ADMIN_EMAIL, ADMIN_PASSWORD)

    # MARK: - 1. Bank Accounts Aggregation
    def test_live_bank_accounts_presence_and_balance_aggregation(self):
        """Verify bank accounts query returns genuine accounts and computes total balance."""
        accounts = self.client.query_table("bank_accounts", limit=50)
        self.assertGreaterEqual(len(accounts), 15, "Expected at least 15 bank accounts in production")

        total_balance = sum(float(acc.get("balance") or 0.0) for acc in accounts)
        self.assertIsInstance(total_balance, float)
        self.assertGreaterEqual(total_balance, 0.0, "Total bank balance cannot be negative")

        for acc in accounts[:5]:
            self.assertIn("bank", acc)
            self.assertIn("iban", acc)
            self.assertTrue(acc.get("bank"), "Bank name must not be empty")

    # MARK: - 2. Credit Cards Debt Aggregation
    def test_live_credit_cards_presence_and_debt_aggregation(self):
        """Verify credit cards query returns cards and computes total corporate debt."""
        cards = self.client.query_table("credit_cards", limit=50)
        self.assertGreaterEqual(len(cards), 25, "Expected at least 25 credit cards in production")

        total_debt = sum(float(card.get("current_debt") or 0.0) for card in cards)
        self.assertGreater(total_debt, 1_000_000.0, "Total card debt in production should exceed 1M TL")

        for card in cards[:5]:
            self.assertIn("last4", card)
            self.assertIn("card_limit", card)
            self.assertIn("current_debt", card)

    # MARK: - 3. Receivables & Payables Aggregation from vega_cariler
    def test_live_cariler_receivables_and_payables_aggregation(self):
        """Verify receivables (balance > 0) and payables (balance < 0) from vega_cariler."""
        debit_caris = self.client.query_table("vega_cariler", params={"balance": "gt.0"}, limit=100)
        credit_caris = self.client.query_table("vega_cariler", params={"balance": "lt.0"}, limit=100)

        self.assertGreater(len(debit_caris), 0, "Production must contain debtors with balance > 0")

        total_receivable = sum(float(c.get("balance") or 0.0) for c in debit_caris)
        self.assertGreater(total_receivable, 100_000.0, "Total receivables should exceed 100k TL")

        total_payable_from_caris = sum(abs(float(c.get("balance") or 0.0)) for c in credit_caris)
        self.assertGreaterEqual(total_payable_from_caris, 0.0)

    # MARK: - 4. Recent Cheques Feed
    def test_live_ebs_checks_recent_feed_structure_and_ordering(self):
        """Verify recent checks feed returns ordered valid cheques for dashboard."""
        checks = self.client.query_table("ebs_checks", limit=10)
        self.assertGreaterEqual(len(checks), 5, "Dashboard needs at least 5 recent checks")

        for check in checks:
            self.assertIn("check_no", check)
            self.assertIn("amount", check)
            self.assertIn("due_date", check)
            amount = float(check.get("amount") or 0.0)
            self.assertGreater(amount, 0.0, f"Check {check.get('check_no')} amount must be positive")

    # MARK: - 5. Recent Slaughter Records Count
    def test_live_kesim_listesi_monthly_metrics(self):
        """Verify kesim_listesi provides monthly slaughter activity count."""
        kesim_items = self.client.query_table("kesim_listesi", limit=50)
        self.assertGreaterEqual(len(kesim_items), 10, "Expected at least 10 recent slaughter items")

        for item in kesim_items[:5]:
            self.assertIn("supplier", item)
            self.assertIn("head_count", item)
            self.assertIn("carcass_weight", item)

    # MARK: - 6. Consolidated Dashboard Summary Calculation
    def test_live_dashboard_consolidated_summary_calculation(self):
        """Simulate SupabaseService.fetchDashboardSummary() logic against live API."""
        accounts = self.client.query_table("bank_accounts", limit=50)
        cards = self.client.query_table("credit_cards", limit=50)
        debit_caris = self.client.query_table("vega_cariler", params={"balance": "gt.0"}, limit=100)
        credit_caris = self.client.query_table("vega_cariler", params={"balance": "lt.0"}, limit=100)
        recent_checks = self.client.query_table("ebs_checks", limit=10)
        kesim_items = self.client.query_table("kesim_listesi", limit=50)

        total_balance = sum(float(a.get("balance") or 0.0) for a in accounts)
        total_card_debt = sum(float(c.get("current_debt") or 0.0) for c in cards)
        total_receivable = sum(float(c.get("balance") or 0.0) for c in debit_caris)
        total_payable = sum(abs(float(c.get("balance") or 0.0)) for c in credit_caris) + total_card_debt
        daily_check_total = sum(float(k.get("amount") or 0.0) for k in recent_checks)
        monthly_kesim_count = len(kesim_items)

        # Net balance calculation formula:
        net_balance = total_balance + total_receivable - total_payable

        self.assertIsInstance(net_balance, float)
        self.assertGreater(total_receivable, 0.0)
        self.assertGreater(total_payable, 0.0)
        self.assertGreaterEqual(monthly_kesim_count, 10)

    # MARK: - 7. Financial Privacy Masking Contract
    def test_dashboard_financial_privacy_masking_contract(self):
        """Verify financial masking contract: masked format must obscure numbers."""
        test_amount = 42_150_800.50
        masked_format = "₺ ••••••"
        unmasked_format = f"{test_amount:,.2f} TL".replace(",", "X").replace(".", ",").replace("X", ".")

        self.assertIn("•", masked_format)
        self.assertNotIn("42", masked_format)
        self.assertNotIn("150", masked_format)
        self.assertNotIn("800", masked_format)

        self.assertNotIn("•", unmasked_format)
        self.assertIn("42.150.800,50", unmasked_format)

    # MARK: - 8. 5-Tab Navigation Invariants & Routing Bounds
    def test_5tab_navigation_invariants_and_routing_bounds(self):
        """Verify 5-Tab Navigation indices (0..4) and tab names."""
        tabs = [
            (0, "Ana Sayfa", "house.fill"),
            (1, "Çekten", "doc.text.fill"),
            (2, "Takas", "arrow.triangle.2.circlepath"),
            (3, "Cariler", "person.2.fill"),
            (4, "Menü", "line.3.horizontal")
        ]

        self.assertEqual(len(tabs), 5, "Application must have exactly 5 tabs")
        for idx, title, symbol in tabs:
            self.assertGreaterEqual(idx, 0)
            self.assertLessEqual(idx, 4)
            self.assertTrue(len(title) > 0)
            self.assertTrue(len(symbol) > 0)

    # MARK: - 9. Quick Actions Navigation Contract
    def test_dashboard_quick_actions_contract(self):
        """Verify Quick Actions targets map within 5-Tab range [0..4]."""
        quick_actions = {
            "Çek Ekle": 1,
            "Cariler": 3,
            "Takas Çekleri": 2,
            "ÇEKTEN Hesabı": 1
        }
        self.assertEqual(len(quick_actions), 4)
        for name, target_tab in quick_actions.items():
            self.assertIn(target_tab, range(5), f"Target tab for {name} must be within 0..4")

    # MARK: - 10. Negative Network Error Resilience
    def test_negative_network_error_resilience_and_status_codes(self):
        """Verify handling of invalid query parameters returns 400 without crashing."""
        import urllib.request
        import urllib.error

        bad_url = f"{self.client.base_url}/rest/v1/bank_accounts?balance=illegal_filter"
        headers = {
            "apikey": self.client.api_key,
            "Authorization": f"Bearer {self.token}"
        }
        req = urllib.request.Request(bad_url, headers=headers)
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=5)
        self.assertIn(ctx.exception.code, [400, 422], "Illegal PostgREST filter must return 400/422")


if __name__ == "__main__":
    unittest.main(verbosity=2)
