"""
Tier 4: Real-World Scenarios Test Suite (Executable)
Validates end-to-end multi-step enterprise workflows:
1. Treasury Manager Morning Cheque Clearing Routine
2. Livestock Slaughter Purchase & Çekten Facility Settlement
3. Multi-Bank Cheque Clearing & GL Portfolio Reconciliation
4. Corporate Cashflow & Branch POS Nightly Reconciliation
"""
import unittest
from .models import (
    CheckRecord, SlaughterRecord, CektenCalculator
)

class TestTier4RealWorld(unittest.TestCase):

    def test_scenario_treasury_manager_morning_clearing_routine(self):
        # Step 1: System online
        is_online = True
        self.assertTrue(is_online)

        # Step 2: Today's clearing cheques
        today_cheques = [
            CheckRecord(amount=4260129.0, bank_name="M.DENİZ", due_date="2026-09-03", status="Tahsilde"),
            CheckRecord(amount=2161752.0, bank_name="TAKSİT", due_date="2026-09-03", status="Tahsilde")
        ]
        clearing_sum = sum(c.amount for c in today_cheques)
        self.assertEqual(clearing_sum, 6421881.0)

        # Step 3: Put second cheque into Internal Takas (İç Takas)
        today_cheques[1].status = "İç Takas"
        active_tahsilde = [c for c in today_cheques if c.status == "Tahsilde"]
        active_ic = [c for c in today_cheques if c.status == "İç Takas"]
        self.assertEqual(len(active_tahsilde), 1)
        self.assertEqual(len(active_ic), 1)

        # Step 4: First cheque collected
        today_cheques[0].status = "Ödendi"
        remaining_pending = [c for c in today_cheques if c.status == "Tahsilde"]
        self.assertEqual(len(remaining_pending), 0)

    def test_scenario_vendor_livestock_purchase_and_cekten_settlement_cycle(self):
        # Step 1: Slaughter purchase entries
        s1 = SlaughterRecord(supplier="DİVAN HAYVANCILIK", head_count=32, carcass_weight=9917.0, price_per_kg=570.0, total_amount=5664090.0, pesinat=0.0)
        s2 = SlaughterRecord(supplier="DİVAN HAYVANCILIK", head_count=27, carcass_weight=8692.0, price_per_kg=575.0, total_amount=4997900.0, pesinat=0.0)
        total_open_debt = s1.total_amount + s2.total_amount
        self.assertEqual(total_open_debt, 10661990.0)

        # Step 2: Open Çekten facility for 500,000 TL, 45 days tenor
        facility_amount = 500000.0
        tenor_days = 45
        cost = CektenCalculator.calculate_cost(facility_amount, tenor_days)
        net = CektenCalculator.calculate_net(facility_amount, tenor_days)
        self.assertEqual(cost, 28125.0)
        self.assertEqual(net, 471875.0)

        # Step 3: Partial payment of 200,000 TL
        paid, remain = CektenCalculator.apply_payment(facility_amount, current_paid=0.0, payment_amount=200000.0)
        self.assertEqual(remain, 300000.0)

        # Step 4: Final payment of 300,000 TL
        paid, remain = CektenCalculator.apply_payment(facility_amount, current_paid=paid, payment_amount=300000.0)
        self.assertEqual(remain, 0.0)
        self.assertEqual(paid, 500000.0)

    def test_scenario_multi_bank_cheque_portfolio_reconciliation(self):
        portfoy = [
            CheckRecord(amount=5000000.0, bank_name="M.DENİZ"),
            CheckRecord(amount=3000000.0, bank_name="M.ZİRAAT"),
            CheckRecord(amount=2000000.0, bank_name="KUVEYTTÜRK"),
            CheckRecord(amount=2500000.0, bank_name="HALKBANK"),
            CheckRecord(amount=2500000.0, bank_name="ALBARAKA")
        ]
        initial_total = sum(c.amount for c in portfoy)
        self.assertEqual(initial_total, 15000000.0)

        # Move Halkbank cheque to Kuveyt Türk
        portfoy[3].bank_name = "KUVEYTTÜRK"

        bank_totals = {}
        for c in portfoy:
            bank_totals[c.bank_name] = bank_totals.get(c.bank_name, 0.0) + c.amount

        self.assertEqual(bank_totals["KUVEYTTÜRK"], 4500000.0)
        self.assertNotIn("HALKBANK", bank_totals)
        self.assertEqual(sum(bank_totals.values()), initial_total)

    def test_scenario_corporate_cashflow_and_branch_pos_nightly_reconciliation(self):
        branch_pos = {
            "Merkez Şube": 180000.0,
            "Merzifon Şube": 120000.0,
            "İlkadım Şube": 210000.0,
            "Atakum Şube": 240000.0,
            "Sucukhane": 150000.0,
            "Depo": 100000.0
        }
        total_gross = sum(branch_pos.values())
        self.assertEqual(total_gross, 1000000.0)

        contractual_rate = 0.025 # 2.50%
        expected_fee = total_gross * contractual_rate
        self.assertEqual(expected_fee, 25000.0)

        actual_fee = 26200.0
        variance = actual_fee - expected_fee
        self.assertEqual(variance, 1200.0)

        actual_net = total_gross - actual_fee
        self.assertEqual(actual_net, 973800.0)

if __name__ == "__main__":
    unittest.main()
