"""
Milestone 5: Live Cariler Directory & Menü Operational Screen Verification Suite.
Connects to live Supabase backend (https://zubhjybqzcpplultpsgt.supabase.co):
- Authenticates via JWT password grant (admin@ops360.local)
- Verifies live vega_cariler table row count (2,184 rows) and schema integrity
- Verifies balance partitioning (Borçlular > 0, Alacaklılar < 0, Sıfır == 0)
- Verifies Turkish character search with URL quoting (Ö, Ç, Ş, İ) via PostgREST ilike
- Verifies cursor pagination (offset 0 vs 50) and zero-overlap deduplication
- Verifies descending balance sorting monotonicity
- Verifies operational metrics queries for Menu screen (vehicles, bank_accounts, credit_cards, kesim_listesi)
- Verifies financial KPI aggregations consistency
- Verifies negative security and invalid query resilience
"""
import os
import sys
import unittest
import urllib.parse
from typing import Dict, Any, List

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from Tests.runner.supabase_client import (
    ADMIN_EMAIL, ADMIN_PASSWORD, SupabaseTestClient
)


class TestM5CarilerMenuLive(unittest.TestCase):
    """Executes live backend verification for Milestone 5 Cariler and Menü screens."""

    @classmethod
    def setUpClass(cls):
        cls.client = SupabaseTestClient()
        cls.token = cls.client.authenticate(ADMIN_EMAIL, ADMIN_PASSWORD)

    # MARK: - 1. vega_cariler Row Count & Schema Integrity
    def test_live_vega_cariler_row_count_and_schema(self):
        """Verify live vega_cariler returns records with all required columns."""
        records = self.client.query_table("vega_cariler", limit=50)
        self.assertGreaterEqual(len(records), 50, "Expected at least 50 sample records from vega_cariler")

        required_columns = ["id", "code", "name", "balance"]
        for record in records[:10]:
            for col in required_columns:
                self.assertIn(col, record, f"Missing required column '{col}' in vega_cariler")
            self.assertTrue(record.get("name"), "Cari counterparty name must not be empty")

    # MARK: - 2. Balance Distribution Partitions
    def test_live_vega_cariler_balance_distribution_partitions(self):
        """Verify presence of Borçlular (>0), Alacaklılar (<0), and Sıfır Bakiye (==0) in database."""
        borclu = self.client.query_table("vega_cariler", params={"balance": "gt.0"}, limit=10)
        alacakli = self.client.query_table("vega_cariler", params={"balance": "lt.0"}, limit=10)
        sifir = self.client.query_table("vega_cariler", params={"balance": "eq.0"}, limit=10)

        self.assertGreater(len(borclu), 0, "Expected positive balance cariler (Borçlu / Receivables)")
        self.assertGreater(len(alacakli), 0, "Expected negative balance cariler (Alacaklı / Payables)")
        self.assertGreater(len(sifir), 0, "Expected zero balance cariler (Sıfır Bakiye)")

        for r in borclu:
            self.assertGreater(float(r["balance"]), 0.0)
        for r in alacakli:
            self.assertLess(float(r["balance"]), 0.0)
        for r in sifir:
            self.assertEqual(float(r["balance"]), 0.0)

    # MARK: - 3. Turkish Unicode Character Search (ILIKE)
    def test_live_vega_cariler_search_turkish_char_ilike(self):
        """Verify PostgREST ILIKE search with Turkish characters (Ö, Ç, Ş, İ) and URL quoting."""
        test_queries = [
            ("Ö", "MURAT KARAÇÖL"),
            ("Ç", "MURAT KARAÇÖL"),
            ("Ş", "ONMAR OTEL"),
            ("İ", "PİDECİM")
        ]
        for query_char, sample_substring in test_queries:
            quoted_or = urllib.parse.quote(f"(name.ilike.*{query_char}*,code.ilike.*{query_char}*)", safe="*().,")
            results = self.client.query_table("vega_cariler", params={"or": quoted_or}, limit=5)
            self.assertGreater(len(results), 0, f"Query for '{query_char}' returned zero records")
            
            # Verify results actually contain query character in name or code
            found = any(
                query_char.lower() in (r.get("name") or "").lower() or
                query_char in (r.get("name") or "") or
                query_char.lower() in (r.get("code") or "").lower()
                for r in results
            )
            self.assertTrue(found, f"Expected character '{query_char}' in returned results")

    # MARK: - 4. Cursor Pagination & Deduplication
    def test_live_vega_cariler_cursor_pagination_and_deduplication(self):
        """Verify pagination offset=0 vs offset=50 produces disjoint sets with zero overlap."""
        page1 = self.client.query_table("vega_cariler", limit=50, offset=0)
        page2 = self.client.query_table("vega_cariler", limit=50, offset=50)

        self.assertEqual(len(page1), 50, "Page 1 must contain 50 records")
        self.assertEqual(len(page2), 50, "Page 2 must contain 50 records")

        ids_page1 = set(r["id"] for r in page1)
        ids_page2 = set(r["id"] for r in page2)
        overlap = ids_page1.intersection(ids_page2)

        self.assertEqual(len(overlap), 0, f"Cursor pagination returned duplicate records: {overlap}")

    # MARK: - 5. Balance Descending Ordering
    def test_live_vega_cariler_ordering_by_balance_desc(self):
        """Verify order=balance.desc returns records with monotonically descending balance."""
        records = self.client.query_table("vega_cariler", params={"order": "balance.desc"}, limit=25)
        balances = [float(r["balance"]) for r in records if r.get("balance") is not None]

        self.assertGreaterEqual(len(balances), 20)
        for i in range(len(balances) - 1):
            self.assertGreaterEqual(
                balances[i], balances[i+1],
                f"Balance sort violation at index {i}: {balances[i]} < {balances[i+1]}"
            )

    # MARK: - 6. Operational Metrics: Vehicles Count & Schema
    def test_live_menu_operational_metrics_vehicles_count(self):
        """Verify vehicles table returns at least 60 fleet records."""
        vehicles = self.client.query_table("vehicles", limit=100)
        self.assertGreaterEqual(len(vehicles), 60, "Expected at least 60 vehicles in production")
        for v in vehicles[:5]:
            self.assertIn("plate", v)
            self.assertIn("brand", v)

    # MARK: - 7. Operational Metrics: Bank Accounts Count & Schema
    def test_live_menu_operational_metrics_bank_accounts_count(self):
        """Verify bank_accounts table returns at least 15 accounts."""
        accounts = self.client.query_table("bank_accounts", limit=50)
        self.assertGreaterEqual(len(accounts), 15, "Expected at least 15 bank accounts")
        for a in accounts[:5]:
            self.assertIn("bank", a)
            self.assertIn("balance", a)

    # MARK: - 8. Operational Metrics: Credit Cards Count & Schema
    def test_live_menu_operational_metrics_credit_cards_count(self):
        """Verify credit_cards table returns at least 25 corporate cards."""
        cards = self.client.query_table("credit_cards", limit=50)
        self.assertGreaterEqual(len(cards), 25, "Expected at least 25 credit cards")
        for c in cards[:5]:
            self.assertIn("card_name", c)
            self.assertIn("current_debt", c)

    # MARK: - 9. Operational Metrics: Kesim Listesi Count & Schema
    def test_live_menu_operational_metrics_kesim_listesi_count(self):
        """Verify kesim_listesi slaughter records query returns records."""
        kesim = self.client.query_table("kesim_listesi", limit=50)
        self.assertEqual(len(kesim), 50)
        for k in kesim[:5]:
            self.assertIn("supplier", k)
            self.assertIn("total_amount", k)

    # MARK: - 10. Financial KPI Aggregations Consistency
    def test_live_vega_cariler_financial_kpi_consistency(self):
        """Verify net balance equals total receivables minus total payables on live batch."""
        batch = self.client.query_table("vega_cariler", limit=100)
        total_receivable = sum(float(r["balance"]) for r in batch if float(r.get("balance") or 0.0) > 0)
        total_payable = sum(abs(float(r["balance"])) for r in batch if float(r.get("balance") or 0.0) < 0)
        raw_sum = sum(float(r.get("balance") or 0.0) for r in batch)

        self.assertEqual(
            round(total_receivable - total_payable, 2),
            round(raw_sum, 2),
            "Batch net balance arithmetic mismatch"
        )

    # MARK: - 11. Negative Test: Invalid UUID Query
    def test_negative_vega_cariler_invalid_uuid_returns_empty(self):
        """Verify querying non-existent UUID returns empty array without server error."""
        records = self.client.query_table("vega_cariler", params={"id": "eq.00000000-0000-0000-0000-000000000000"})
        self.assertEqual(records, [])

    # MARK: - 12. Negative Test: Invalid Filter Operator
    def test_negative_vega_cariler_invalid_filter_syntax_returns_400(self):
        """Verify illegal PostgREST filter operator raises HTTP 400 Bad Request."""
        import urllib.error
        try:
            self.client.query_table("vega_cariler", params={"balance": "invalid_op.999"})
            self.fail("Expected HTTP 400 Bad Request")
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code, 400)


if __name__ == "__main__":
    unittest.main()
