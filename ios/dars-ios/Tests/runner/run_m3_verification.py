"""
Milestone 3 Verification CLI Runner.
Executes the unified Milestone 3 test suites:
1. test_m3_dashboard_live.py (10 Live Dashboard Data Aggregation & Navigation Tests)
2. test_source_integrity.py (7 Syntax balance, file inventory >= 32, design system tokens)
3. test_project_yml.py (6 XcodeGen project specification & PyYAML parsing)
4. test_supabase_live_connectivity.py (19 Baseline Supabase schema, count, filter, security tests)

Total Tests: 42 Verification Tests (100% Pass Required for M3 Gate Sign-off)
"""
import sys
import os
import unittest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from Tests.runner.test_m3_dashboard_live import TestM3DashboardLive
from Tests.runner.test_source_integrity import TestSourceIntegrity
from Tests.runner.test_project_yml import TestProjectYmlSpecification
from Tests.runner.test_supabase_live_connectivity import TestSupabaseLiveConnectivity


def main():
    print("=" * 75)
    print("DARS iOS Mobile Banking App — Milestone 3 Forensic Verification")
    print("Suites: Live Dashboard Aggregation | Source Integrity | project.yml | Supabase")
    print("Target: Milestone 3 (Dashboard & 5-Tab Navigation Architecture)")
    print("=" * 75)

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestM3DashboardLive))
    suite.addTests(loader.loadTestsFromTestCase(TestSourceIntegrity))
    suite.addTests(loader.loadTestsFromTestCase(TestProjectYmlSpecification))
    suite.addTests(loader.loadTestsFromTestCase(TestSupabaseLiveConnectivity))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 75)
    print(f"Total Milestone 3 Tests Executed: {result.testsRun}")
    print(f"Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    status_str = "SUCCESS (100% PASS)" if result.wasSuccessful() else "FAILED"
    print(f"Final Status: {status_str}")
    print("=" * 75)

    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
