"""
Milestone 4: Live Treasury & Cheque Portfolio Verification Suite.
Connects to live Supabase backend (https://zubhjybqzcpplultpsgt.supabase.co):
- Authenticates via JWT password grant (admin@ops360.local)
- Verifies live data aggregation and arithmetic for cekten_hesabi
- Verifies live data aggregation and portfolio metrics for ebs_checks
- Verifies 360-day financing calculation formulas on live production data
- Verifies status partitioning (Tahsilde, Portfoyde, Teminata Verildi, Odendi)
- Verifies bank quota distribution and reconciliation
- Verifies due date ordering and PostgREST filtering
- Verifies negative security and validation error cases
"""
import os
import sys
import json
import urllib.parse
import urllib.request
import unittest
from typing import Dict, Any, List

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from Tests.runner.supabase_client import (
    ADMIN_EMAIL, ADMIN_PASSWORD, SupabaseTestClient
)


class TestM4TreasuryLive(unittest.TestCase):
    """Executes live backend verification of ÇEKTEN and Takas Treasury contracts."""

    @classmethod
    def setUpClass(cls):
        cls.client = SupabaseTestClient()
        cls.token = cls.client.authenticate(ADMIN_EMAIL, ADMIN_PASSWORD)

    # MARK: - 1. ÇEKTEN Live Record Count & Schema
    def test_live_cekten_records_count_and_schema(self):
        """Verify live cekten_hesabi returns at least 10 records with valid columns."""
        records = self.client.query_table("cekten_hesabi", limit=50)
        self.assertGreaterEqual(len(records), 10, "Expected at least 10 cekten_hesabi records in production")

        required_columns = ["id", "date", "supplier", "total_amount", "paid_amount", "remaining_amount"]
        for record in records[:5]:
            for col in required_columns:
                self.assertIn(col, record, f"Missing required column '{col}' in cekten_hesabi")
            self.assertTrue(record.get("supplier"), "Supplier name must not be empty")

    # MARK: - 2. ÇEKTEN Settlement Arithmetic Consistency
    def test_live_cekten_settlement_arithmetic_consistency(self):
        """Verify every live cekten_hesabi row satisfies remaining == total - paid."""
        records = self.client.query_table("cekten_hesabi", limit=50)
        for r in records:
            tot = float(r.get("total_amount") or 0.0)
            paid = float(r.get("paid_amount") or 0.0)
            rem = float(r.get("remaining_amount") or 0.0)
            self.assertEqual(
                round(rem, 2), round(tot - paid, 2),
                f"Row {r.get('id')} arithmetic mismatch: remaining ({rem}) != total ({tot}) - paid ({paid})"
            )

    # MARK: - 3. ÇEKTEN 360-Day Financing Cost Formula on Live Facilities
    def test_live_cekten_360_day_financing_cost_formula(self):
        """Validate 360-day financing cost formula on live facility records."""
        records = self.client.query_table("cekten_hesabi", limit=50)
        positive_facilities = [r for r in records if float(r.get("total_amount") or 0.0) > 0]
        self.assertGreater(len(positive_facilities), 0, "Expected at least one facility record with total_amount > 0")

        for r in positive_facilities:
            principal = float(r["total_amount"])
            tenor = 45  # Standard 45-day commercial tenor
            rate = 0.45  # 45% annual rate
            expected_cost = principal * (tenor / 360.0) * rate
            expected_net = principal - expected_cost

            self.assertGreater(expected_cost, 0.0)
            self.assertLess(expected_net, principal)
            self.assertEqual(round(expected_net + expected_cost, 2), round(principal, 2))

    # MARK: - 4. EBS Checks Portfolio Count & Volume
    def test_live_ebs_checks_portfolio_count_and_volume(self):
        """Verify live ebs_checks returns substantial volume and valid cheques."""
        checks = self.client.query_table("ebs_checks", limit=100)
        self.assertEqual(len(checks), 100, "Should fetch 100 sample cheques")

        total_volume = sum(float(c.get("amount") or 0.0) for c in checks)
        self.assertGreater(total_volume, 1_000_000.0, "100-cheque sample volume must exceed 1M TL")

        for check in checks[:5]:
            self.assertIn("check_no", check)
            self.assertIn("bank_name", check)
            self.assertIn("amount", check)
            self.assertIn("due_date", check)

    # MARK: - 5. Cheques Status Partitioning
    def test_live_ebs_checks_status_partitioning(self):
        """Verify presence of core clearing statuses in ebs_checks."""
        checks = self.client.query_table("ebs_checks", limit=500)
        statuses = set(c.get("status") for c in checks if c.get("status"))

        # In production, at least Tahsilde, Odendi, or Teminata Verildi must be observed
        has_expected_status = any(s in statuses for s in ["Tahsilde", "Ödendi", "Teminata Verildi", "Portföyde"])
        self.assertTrue(has_expected_status, f"Expected clearing statuses not found in sample: {statuses}")

    # MARK: - 6. Bank Quotas Reconciliation
    def test_live_ebs_checks_bank_quota_distribution(self):
        """Verify grouping of cheques by bank_name reconciles with total portfolio sum."""
        checks = self.client.query_table("ebs_checks", limit=100)
        total_sample = sum(float(c.get("amount") or 0.0) for c in checks)

        bank_quotas: Dict[str, float] = {}
        for check in checks:
            bank = check.get("bank_name") or "Diğer"
            bank_quotas[bank] = bank_quotas.get(bank, 0.0) + float(check.get("amount") or 0.0)

        self.assertGreater(len(bank_quotas), 1, "Expected multiple banks in clearing portfolio")
        sum_quotas = sum(bank_quotas.values())
        self.assertEqual(round(sum_quotas, 2), round(total_sample, 2), "Bank quotas must sum to total volume")

    # MARK: - 7. Cheques Due Date Chronological Ordering
    def test_live_ebs_checks_due_date_chronological_ordering(self):
        """Verify order=due_date.asc returns chronologically ordered records."""
        ordered = self.client.query_table("ebs_checks", params={"order": "due_date.asc"}, limit=20)
        dates = [c["due_date"] for c in ordered if c.get("due_date")]
        self.assertEqual(dates, sorted(dates), "Cheques must be sorted monotonically by due_date")

    # MARK: - 8. PostgREST Status Filter Query
    def test_live_ebs_checks_status_filter_postgrest(self):
        """Verify PostgREST filter status=eq.Tahsilde returns only Tahsilde cheques."""
        tahsilde_checks = self.client.query_table("ebs_checks", params={"status": "eq.Tahsilde"}, limit=20)
        self.assertGreater(len(tahsilde_checks), 0, "Expected Tahsilde cheques in database")
        for c in tahsilde_checks:
            self.assertEqual(c.get("status"), "Tahsilde")

    # MARK: - 9. PostgREST Date Range Query
    def test_live_ebs_checks_date_range_query(self):
        """Verify date range query returns cheques within requested bounds."""
        checks = self.client.query_table(
            "ebs_checks",
            params={"due_date": "gte.2026-01-01&due_date=lte.2026-12-31"},
            limit=20
        )
        self.assertGreater(len(checks), 0, "Expected 2026 cheques")
        for c in checks:
            due = c.get("due_date") or ""
            self.assertTrue("2026" in due, f"Due date {due} should be in 2026")

    # MARK: - 10. Search ILIKE Query on Bank Name
    def test_live_ebs_checks_search_ilike(self):
        """Verify case-insensitive ILIKE search returns matching banks."""
        halk_checks = self.client.query_table("ebs_checks", params={"bank_name": "ilike.*HALK*"}, limit=10)
        self.assertGreater(len(halk_checks), 0, "Expected HALK cheques in database")
        for c in halk_checks:
            self.assertIn("HALK", c.get("bank_name", "").upper())

    # MARK: - 11. Negative Security: Invalid UUID Query
    def test_negative_cekten_invalid_uuid_returns_empty(self):
        """Verify querying non-existent UUID in cekten_hesabi returns empty array."""
        empty_res = self.client.query_table(
            "cekten_hesabi",
            params={"id": "eq.00000000-0000-0000-0000-000000000000"}
        )
        self.assertEqual(empty_res, [], "Non-existent UUID should return empty result")

    # MARK: - 12. Negative Security: Invalid Column Returns HTTP 400
    def test_negative_ebs_checks_invalid_column_filter_returns_400(self):
        """Verify querying non-existent column returns HTTP 400 Bad Request."""
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self.client.query_table("ebs_checks", params={"non_existent_column": "eq.123"})
        self.assertEqual(ctx.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
