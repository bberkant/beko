"""
Milestone 2 Verification CLI Runner.
Executes the Milestone 2 test suites:
1. test_supabase_live_connectivity.py (Live Supabase JWT auth, 7 table counts, 7 table schemas, filters, security tests)
2. test_source_integrity.py (Syntax balance, file inventory >= 32, design system tokens)
3. test_project_yml.py (XcodeGen project specification & PyYAML parsing)
"""
import sys
import os
import unittest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from Tests.runner.test_project_yml import TestProjectYmlSpecification
from Tests.runner.test_source_integrity import TestSourceIntegrity
from Tests.runner.test_supabase_live_connectivity import TestSupabaseLiveConnectivity


def main():
    print("=" * 70)
    print("DARS iOS Mobile Banking App — Milestone 2 Forensic Verification")
    print("Suites: Supabase Live Connectivity | Source Integrity | project.yml")
    print("Target: Milestone 2 Live Supabase Networking & Codable Data Models")
    print("=" * 70)

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestSupabaseLiveConnectivity))
    suite.addTests(loader.loadTestsFromTestCase(TestSourceIntegrity))
    suite.addTests(loader.loadTestsFromTestCase(TestProjectYmlSpecification))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 70)
    print(f"Total Milestone 2 Tests Executed: {result.testsRun}")
    print(f"Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    status_str = "SUCCESS (100% PASS)" if result.wasSuccessful() else "FAILED"
    print(f"Final Status: {status_str}")
    print("=" * 70)

    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
