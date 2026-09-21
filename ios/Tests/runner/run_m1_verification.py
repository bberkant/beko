"""
Milestone 1 Verification CLI Runner.
Executes exclusively the three genuine Milestone 1 test suites:
1. test_project_yml.py (XcodeGen project specification & PyYAML parsing)
2. test_source_integrity.py (Layout modularization, 32+ Swift files, syntax balance, design system tokens)
3. test_supabase_live_connectivity.py (Live Supabase JWT auth, row counts, negative auth tests)
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
    print("DARS iOS Mobile Banking App — Milestone 1 Forensic Verification")
    print("Suites: project.yml | Source Integrity | Supabase Live Connectivity")
    print("Target: Apple iOS 17.0+ / Kuveyt Türk Design System / Supabase Live")
    print("=" * 70)

    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestProjectYmlSpecification))
    suite.addTests(loader.loadTestsFromTestCase(TestSourceIntegrity))
    suite.addTests(loader.loadTestsFromTestCase(TestSupabaseLiveConnectivity))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "=" * 70)
    print(f"Total Milestone 1 Tests Executed: {result.testsRun}")
    print(f"Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    status_str = "SUCCESS (100% PASS)" if result.wasSuccessful() else "FAILED"
    print(f"Final Status: {status_str}")
    print("=" * 70)

    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
