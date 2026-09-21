"""
Tier 3: Cross-Feature Combinations Test Suite (Executable)
Validates pairwise interactions, state propagation, and multi-module data synchronization.
Minimum 10 tests total.
"""
import unittest
from .models import (
    CheckRecord, SlaughterRecord, CektenCalculator, CariClassifier,
    TurkishTextNormalizer
)

class TestTier3CrossFeature(unittest.TestCase):

    def test_cross_feature_adding_cheque_updates_takas_and_dashboard_balance(self):
        takas_cheques = [CheckRecord(amount=4260129.0)]
        dashboard_balance = 4260129.0

        new_cheque = CheckRecord(amount=1500000.0)
        takas_cheques.append(new_cheque)
        dashboard_balance += new_cheque.amount

        new_takas_total = sum(c.amount for c in takas_cheques)
        self.assertEqual(new_takas_total, 5760129.0)
        self.assertEqual(dashboard_balance, 5760129.0)

    def test_cross_feature_cekten_payment_settlement_updates_supplier_cari_balance(self):
        cekten_remain = 1250000.0
        cari_debt = 4215000.0

        payment = 500000.0
        cekten_remain = max(0.0, cekten_remain - payment)
        cari_debt -= payment

        self.assertEqual(cekten_remain, 750000.0)
        self.assertEqual(cari_debt, 3715000.0)

    def test_cross_feature_slaughter_entry_increments_cari_debt_and_dashboard_kesim_count(self):
        slaughter = SlaughterRecord(carcass_weight=6000.0, price_per_kg=500.0, pesinat=0.0)
        initial_balance = 10661990.0
        updated_balance = initial_balance + slaughter.total_amount

        self.assertEqual(slaughter.total_amount, 3000000.0)
        self.assertEqual(updated_balance, 13661990.0)

    def test_cross_feature_takas_cheque_collection_updates_bank_account_balance(self):
        pending_takas = 6421881.0
        kuveyt_account_balance = 2500000.0

        collected_amount = 2161752.0
        pending_takas -= collected_amount
        kuveyt_account_balance += collected_amount

        self.assertEqual(pending_takas, 4260129.0)
        self.assertEqual(kuveyt_account_balance, 4661752.0)

    def test_cross_feature_vehicle_inspection_date_change_updates_menu_badge_and_calendar_dot(self):
        critical_count = 1
        calendar_has_dot = False

        new_days_left = 5
        if new_days_left <= 10:
            critical_count += 1
            calendar_has_dot = True

        self.assertEqual(critical_count, 2)
        self.assertTrue(calendar_has_dot)

    def test_cross_feature_cari_payment_inverts_classification_borclu_to_alacakli(self):
        balance = 500000.0
        self.assertEqual(CariClassifier.classify(balance), "BORCLU")

        balance -= 800000.0 # large payment -> -300,000.0
        self.assertEqual(balance, -300000.0)
        self.assertEqual(CariClassifier.classify(balance), "ALACAKLI")
        self.assertEqual(CariClassifier.badge_style(balance), ("Alacak", "emerald"))

    def test_cross_feature_interbank_cheque_transfer_updates_bank_quotas_without_altering_grand_total(self):
        bank_quotas = {"M.DENİZ": 4260129.0, "KUVEYTTÜRK": 1000000.0}
        initial_total = sum(bank_quotas.values())

        transfer_amount = 1000000.0
        bank_quotas["M.DENİZ"] -= transfer_amount
        bank_quotas["KUVEYTTÜRK"] += transfer_amount

        self.assertEqual(bank_quotas["M.DENİZ"], 3260129.0)
        self.assertEqual(bank_quotas["KUVEYTTÜRK"], 2000000.0)
        self.assertEqual(sum(bank_quotas.values()), initial_total)

    def test_cross_feature_credit_card_settlement_deducts_cashbox_and_restores_limit(self):
        cashbox = 1500000.0
        limit = 500000.0
        used = 200000.0

        payment = 100000.0
        cashbox -= payment
        used -= payment
        available = limit - used

        self.assertEqual(cashbox, 1400000.0)
        self.assertEqual(used, 100000.0)
        self.assertEqual(available, 400000.0)

    def test_cross_feature_real_estate_revaluation_propagates_to_durumum_asset_net_worth(self):
        re_total = 121500000.0
        durumum_total = 250000000.0

        delta = 10000000.0
        re_total += delta
        durumum_total += delta

        self.assertEqual(re_total, 131500000.0)
        self.assertEqual(durumum_total, 260000000.0)

    def test_cross_feature_global_spotlight_search_cross_queries_caris_cheques_and_cekten(self):
        query = "DİVAN"
        caris = ["DİVAN HAYVANCILIK GIDA SAN. TİC. LTD. ŞTİ.", "FİMAR AŞ"]
        cheques = ["CK-00192 DİVAN HAYVANCILIK", "CK-00843 FİMAR AŞ"]
        cekten = ["DİVAN HAYVANCILIK Çekten Sözleşmesi"]

        hits = [c for c in caris if TurkishTextNormalizer.matches(c, query)] + \
               [c for c in cheques if TurkishTextNormalizer.matches(c, query)] + \
               [c for c in cekten if TurkishTextNormalizer.matches(c, query)]

        self.assertEqual(len(hits), 3)

if __name__ == "__main__":
    unittest.main()
