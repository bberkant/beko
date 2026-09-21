"""
Master Test Runner for DARS iOS App E2E Test Suite.
Executes Tiers 1 through 4 and outputs structured verification logs.
"""
import sys
import os
import unittest
import argparse
import time

# Ensure root directory is on PYTHONPATH
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from Tests.runner.test_tier1_feature_coverage import TestTier1FeatureCoverage
from Tests.runner.test_tier2_boundary_corner import TestTier2BoundaryCorner
from Tests.runner.test_tier3_cross_feature import TestTier3CrossFeature
from Tests.runner.test_tier4_real_world import TestTier4RealWorld

def build_suite(tier: int = 0) -> unittest.TestSuite:
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()

    if tier == 0 or tier == 1:
        suite.addTests(loader.loadTestsFromTestCase(TestTier1FeatureCoverage))
    if tier == 0 or tier == 2:
        suite.addTests(loader.loadTestsFromTestCase(TestTier2BoundaryCorner))
    if tier == 0 or tier == 3:
        suite.addTests(loader.loadTestsFromTestCase(TestTier3CrossFeature))
    if tier == 0 or tier == 4:
        suite.addTests(loader.loadTestsFromTestCase(TestTier4RealWorld))

    return suite

def main():
    parser = argparse.ArgumentParser(description="DARS iOS App E2E Test Suite Master Runner")
    parser.add_argument("--tier", type=int, default=0, choices=[0, 1, 2, 3, 4],
                        help="Select test tier to run (0 runs all tiers)")
    parser.add_argument("--verbosity", type=int, default=2,
                        help="Test runner verbosity level")
    args = parser.parse_args()

    print("=" * 70)
    print("DARS iOS Mobile Banking App - E2E Verification Suite")
    print(f"Target: Apple iOS 17.0+ / Kuveyt Türk Design System / Supabase Live")
    print(f"Executing Tier Selection: {'All Tiers (1-4)' if args.tier == 0 else f'Tier {args.tier}'}")
    print("=" * 70)

    start_time = time.time()
    suite = build_suite(args.tier)
    runner = unittest.TextTestRunner(verbosity=args.verbosity)
    result = runner.run(suite)
    elapsed = time.time() - start_time

    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print(f"Total Tests Executed: {result.testsRun}")
    print(f"Passed: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Execution Duration: {elapsed:.2f} seconds")
    status_str = "SUCCESS (100% PASS)" if result.wasSuccessful() else "FAILED"
    print(f"Final Status: {status_str}")
    print("=" * 70)

    sys.exit(0 if result.wasSuccessful() else 1)

if __name__ == "__main__":
    main()
