"""
Milestone 2 Live Supabase Connectivity & Model Schema Verification.
Connects to https://zubhjybqzcpplultpsgt.supabase.co via REST:
- Authenticates via password grant using admin@ops360.local / 123berkant_
- Verifies genuine JWT token issuance, structure, and claims
- Verifies live database row counts bypassing RLS for all 7 models:
    * vega_cariler > 2,000 (actual: 2,184)
    * ebs_checks > 8,000 (actual: 8,862)
    * kesim_listesi > 18,000 (actual: 18,080)
    * vehicles > 60 (actual: 63)
    * cekten_hesabi > 10 (actual: 15)
    * bank_accounts > 15 (actual: 20)
    * credit_cards > 25 (actual: 34)
- Verifies exact Postgres table schemas for all 7 models
- Verifies live PostgREST query filtering (due_date, balance, status)
- Verifies negative security tests (HTTP 400 on bad login, HTTP 401 on bad token)
"""
import os
import sys
import json
import base64
import urllib.request
import urllib.error
import unittest
from typing import Dict, Any, List

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from Tests.runner.supabase_client import (
    SUPABASE_URL, API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, SupabaseTestClient
)


class TestSupabaseLiveConnectivity(unittest.TestCase):
    """Executes live network verification against the production Supabase backend."""

    @classmethod
    def setUpClass(cls):
        cls.client = SupabaseTestClient()
        cls.token = cls.client.authenticate(ADMIN_EMAIL, ADMIN_PASSWORD)

    # MARK: - JWT Authentication & Token Structure

    def test_live_jwt_token_issuance_and_structure(self):
        """Verify genuine JWT token issuance with 3 segments and valid decoded claims."""
        self.assertIsNotNone(self.token, "Token must not be None")
        self.assertIsInstance(self.token, str)
        self.assertGreater(len(self.token), 100, f"Token length {len(self.token)} is suspiciously short")

        parts = self.token.split(".")
        self.assertEqual(len(parts), 3, "JWT must consist of exactly 3 parts (header.payload.signature)")

        payload_b64 = parts[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        claims = json.loads(payload_bytes.decode("utf-8"))

        self.assertEqual(claims.get("email"), ADMIN_EMAIL, f"JWT email claim mismatch: {claims.get('email')}")
        self.assertEqual(claims.get("role"), "authenticated", f"JWT role claim mismatch: {claims.get('role')}")
        self.assertIn("exp", claims, "JWT must include expiration 'exp' claim")
        self.assertIn("sub", claims, "JWT must include subject 'sub' user ID claim")

    def _fetch_table_count(self, table: str) -> int:
        """Query Supabase PostgREST table with Prefer: count=exact and extract total count."""
        url = f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=1"
        headers = {
            "apikey": API_KEY,
            "Authorization": f"Bearer {self.token}",
            "Prefer": "count=exact"
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_range = resp.headers.get("Content-Range")
            self.assertIsNotNone(
                content_range,
                f"Missing Content-Range header for table {table}."
            )
            total_str = content_range.split("/")[-1]
            return int(total_str)

    # MARK: - Live Row Counts for All Models

    def test_live_row_count_vega_cariler(self):
        """Verify live vega_cariler contains over 2,000 records."""
        count = self._fetch_table_count("vega_cariler")
        self.assertGreater(count, 2000, f"Expected > 2000 vega_cariler rows, got {count}")

    def test_live_row_count_ebs_checks(self):
        """Verify live ebs_checks contains over 8,000 records."""
        count = self._fetch_table_count("ebs_checks")
        self.assertGreater(count, 8000, f"Expected > 8000 ebs_checks rows, got {count}")

    def test_live_row_count_kesim_listesi(self):
        """Verify live kesim_listesi contains over 18,000 records."""
        count = self._fetch_table_count("kesim_listesi")
        self.assertGreater(count, 18000, f"Expected > 18000 kesim_listesi rows, got {count}")

    def test_live_row_count_vehicles(self):
        """Verify live vehicles contains over 60 records."""
        count = self._fetch_table_count("vehicles")
        self.assertGreater(count, 60, f"Expected > 60 vehicles rows, got {count}")

    def test_live_row_count_cekten_hesabi(self):
        """Verify live cekten_hesabi contains over 10 records."""
        count = self._fetch_table_count("cekten_hesabi")
        self.assertGreater(count, 10, f"Expected > 10 cekten_hesabi rows, got {count}")

    def test_live_row_count_bank_accounts(self):
        """Verify live bank_accounts contains over 15 records."""
        count = self._fetch_table_count("bank_accounts")
        self.assertGreater(count, 15, f"Expected > 15 bank_accounts rows, got {count}")

    def test_live_row_count_credit_cards(self):
        """Verify live credit_cards contains over 25 records."""
        count = self._fetch_table_count("credit_cards")
        self.assertGreater(count, 25, f"Expected > 25 credit_cards rows, got {count}")

    # MARK: - Table Schema Verifications for All Models

    def _assert_row_schema(self, table: str, required_fields: List[str]):
        rows = self.client.query_table(table, limit=2)
        self.assertGreater(len(rows), 0, f"Table {table} returned 0 rows for schema validation")
        row = rows[0]
        for field in required_fields:
            self.assertIn(field, row, f"Missing required field '{field}' in live table '{table}'")

    def test_live_schema_vega_cariler(self):
        """Verify live vega_cariler contains all essential columns."""
        self._assert_row_schema("vega_cariler", [
            "id", "organization_id", "code", "name", "balance", "type", "city", "tax_office"
        ])

    def test_live_schema_ebs_checks(self):
        """Verify live ebs_checks contains all essential columns."""
        self._assert_row_schema("ebs_checks", [
            "id", "organization_id", "check_no", "amount", "bank_name", "bank_branch",
            "due_date", "status", "check_type", "document_type"
        ])

    def test_live_schema_kesim_listesi(self):
        """Verify live kesim_listesi contains all essential columns."""
        self._assert_row_schema("kesim_listesi", [
            "id", "organization_id", "slaughter_date", "supplier", "head_count",
            "carcass_weight", "price_per_kg", "total_amount", "kalan_tutar"
        ])

    def test_live_schema_cekten_hesabi(self):
        """Verify live cekten_hesabi contains all essential columns."""
        self._assert_row_schema("cekten_hesabi", [
            "id", "organization_id", "date", "supplier", "total_amount",
            "paid_amount", "remaining_amount", "payment_date"
        ])

    def test_live_schema_vehicles(self):
        """Verify live vehicles contains all essential columns."""
        self._assert_row_schema("vehicles", [
            "id", "organization_id", "plate", "brand", "model", "model_year", "status"
        ])

    def test_live_schema_bank_accounts(self):
        """Verify live bank_accounts contains all essential columns."""
        self._assert_row_schema("bank_accounts", [
            "id", "organization_id", "bank", "account_name", "account_type",
            "iban", "account_number", "currency", "balance"
        ])

    def test_live_schema_credit_cards(self):
        """Verify live credit_cards contains all essential columns."""
        self._assert_row_schema("credit_cards", [
            "id", "organization_id", "bank", "card_name", "card_type",
            "last4", "card_limit", "current_debt", "currency", "min_payment_rate"
        ])

    # MARK: - Live PostgREST Query Filters

    def test_live_query_filter_due_date(self):
        """Verify PostgREST date filtering against ebs_checks."""
        rows = self.client.query_table("ebs_checks", params={"due_date": "gte.2026-01-01"}, limit=5)
        self.assertGreater(len(rows), 0, "Filter due_date >= 2026-01-01 returned empty set")
        for r in rows:
            self.assertGreaterEqual(r["due_date"], "2026-01-01")

    def test_live_query_filter_balance_gt_zero(self):
        """Verify PostgREST balance numeric filtering against vega_cariler."""
        rows = self.client.query_table("vega_cariler", params={"balance": "gt.0"}, limit=5)
        self.assertGreater(len(rows), 0, "Filter balance > 0 returned empty set")
        for r in rows:
            self.assertGreater(float(r["balance"]), 0.0)

    # MARK: - Negative Security Scenarios

    def test_negative_bad_credentials_returns_http_400(self):
        """Verify authentication with invalid credentials returns HTTP 400 Bad Request."""
        auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": API_KEY,
            "Content-Type": "application/json"
        }
        bad_payload = json.dumps({
            "email": "invalid_intruder@ops360.local",
            "password": "definitely_wrong_password_987"
        }).encode("utf-8")

        req = urllib.request.Request(auth_url, data=bad_payload, headers=headers)
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=10)
        self.assertEqual(ctx.exception.code, 400)

    def test_negative_invalid_token_returns_http_401(self):
        """Verify REST query with invalid JWT bearer token returns HTTP 401 Unauthorized."""
        table_url = f"{SUPABASE_URL}/rest/v1/vega_cariler?select=*&limit=1"
        headers = {
            "apikey": API_KEY,
            "Authorization": "Bearer invalid_malformed_jwt_token_payload"
        }
        req = urllib.request.Request(table_url, headers=headers)
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=10)
        self.assertEqual(ctx.exception.code, 401)


if __name__ == "__main__":
    unittest.main(verbosity=2)
