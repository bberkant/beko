"""
Milestone 5 Master Verification CLI Runner.
Executes the unified Milestone 5 test suites:
1. test_m5_cariler_menu_live.py (12 Live Cariler Directory, Unicode Search, Pagination & Menü Metrics Tests)
2. test_m4_treasury_live.py (12 Live Treasury, Cheque Portfolio & ACT/360 Arithmetic Tests)
3. test_m3_dashboard_live.py (10 Live Dashboard Data Aggregation & Navigation Tests)
4. test_source_integrity.py (7 Syntax balance, file inventory >= 32, design system tokens)
5. test_project_yml.py (6 XcodeGen project specification & PyYAML parsing)
6. test_supabase_live_connectivity.py (19 Baseline Supabase schema, count, filter, security tests)

Total Tests: 66 Verification Tests (100% Pass Required for M5 Gate Sign-off)
"""
import sys
import os
import unittest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from Tests.runner.test_m5_cariler_menu_live import TestM5CarilerMenuLive
from Tests.runner.test_m4_treasury_live import TestM4TreasuryLive
from Tests.runner.test_m3_dashboard_live import TestM3DashboardLive
from Tests.runner.test_source_integrity import TestSourceIntegrity
from Tests.runner.test_project_yml import TestProjectYmlSpecification
from Tests.runner.test_supabase_live_connectivity import TestSupabaseLiveConnectivity


def main():
    print("=" * 80)
    print("DARS iOS Mobile Banking App — Milestone 5 Forensic Verification")
    print("Suites: Cariler & Menü Live | Treasury Live | Dashboard Live | Source Integrity | project.yml | Supabase")
    print("Target: Milestone 5 (Cariler Counterparties & Menü Screen Enterprise Architecture)")
    print("=" * 80)

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestM5CarilerMenuLive))
    suite.addTests(loader.loadTestsFromTestCase(TestM4TreasuryLive))
    suite.addTests(loader.loadTestsFromTestCase(TestM3DashboardLive))
    suite.addTests(loader.loadTestsFromTestCase(TestSourceIntegrity))
    suite.addTests(loader.loadTestsFromTestCase(TestProjectYmlSpecification))
    suite.addTests(loader.loadTestsFromTestCase(TestSupabaseLiveConnectivity))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 80)
    print(f"Total Milestone 5 Tests Executed: {result.testsRun}")
    print(f"Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    status_str = "SUCCESS (100% PASS)" if result.wasSuccessful() else "FAILED"
    print(f"Final Status: {status_str}")
    print("=" * 80)

    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
