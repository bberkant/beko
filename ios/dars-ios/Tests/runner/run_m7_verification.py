"""
Milestone 7 Master Verification CLI Runner (run_m7_verification.py).

Comprehensive aggregation runner combining all progressive milestone verification suites
(Milestones 1 through 6, 80 tests) and all end-to-end integration tiers
(Milestone 7 E2E Tiers 1 through 4, 74 tests).

Total Test Inventory: 154 Non-Trivial Verification Tests
- Milestone 6 CI/CD & Fastlane Pipeline: 14 tests (test_m6_cicd_live.py)
- Milestone 5 Cariler & Menü Enterprise: 12 tests (test_m5_cariler_menu_live.py)
- Milestone 4 ÇEKTEN & Takas Treasury: 12 tests (test_m4_treasury_live.py)
- Milestone 3 Dashboard & 5-Tab Navigation: 10 tests (test_m3_dashboard_live.py)
- Milestone 1 Source Code & AST Integrity: 7 tests (test_source_integrity.py)
- Milestone 1 XcodeGen project.yml Spec: 6 tests (test_project_yml.py)
- Milestone 1-2 Supabase Live Connectivity: 19 tests (test_supabase_live_connectivity.py)
- Milestone 7 E2E Tier 1 (Feature Coverage): 26 tests (test_tier1_feature_coverage.py)
- Milestone 7 E2E Tier 2 (Boundary & Corner): 24 tests (test_tier2_boundary_corner.py)
- Milestone 7 E2E Tier 3 (Cross-Feature): 10 tests (test_tier3_cross_feature.py)
- Milestone 7 E2E Tier 4 (Real-World Scenarios): 14 tests (test_tier4_real_world.py)

Usage:
  python Tests/runner/run_m7_verification.py                 # Run all 154 tests
  python Tests/runner/run_m7_verification.py --mode milestones # Run M1-M6 (80 tests)
  python Tests/runner/run_m7_verification.py --mode e2e        # Run E2E Tiers 1-4 (74 tests)
  python Tests/runner/run_m7_verification.py --tier 1          # Run Tier 1 only (26 tests)
"""
import sys
import os
import unittest
import argparse
import time

# Ensure project root directory is on PYTHONPATH
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Milestone 1-6 Baseline & Regression Suites
from Tests.runner.test_m6_cicd_live import TestM6CicdLive
from Tests.runner.test_m5_cariler_menu_live import TestM5CarilerMenuLive
from Tests.runner.test_m4_treasury_live import TestM4TreasuryLive
from Tests.runner.test_m3_dashboard_live import TestM3DashboardLive
from Tests.runner.test_source_integrity import TestSourceIntegrity
from Tests.runner.test_project_yml import TestProjectYmlSpecification
from Tests.runner.test_supabase_live_connectivity import TestSupabaseLiveConnectivity

# Milestone 7 E2E Integration Tiers
from Tests.runner.test_tier1_feature_coverage import TestTier1FeatureCoverage
from Tests.runner.test_tier2_boundary_corner import TestTier2BoundaryCorner
from Tests.runner.test_tier3_cross_feature import TestTier3CrossFeature
from Tests.runner.test_tier4_real_world import TestTier4RealWorld


def build_milestones_suite(loader: unittest.TestLoader) -> unittest.TestSuite:
    """Aggregates all 80 baseline tests across Milestones 1 through 6."""
    suite = unittest.TestSuite()
    suite.addTests(loader.loadTestsFromTestCase(TestM6CicdLive))                    # 14 tests
    suite.addTests(loader.loadTestsFromTestCase(TestM5CarilerMenuLive))            # 12 tests
    suite.addTests(loader.loadTestsFromTestCase(TestM4TreasuryLive))               # 12 tests
    suite.addTests(loader.loadTestsFromTestCase(TestM3DashboardLive))              # 10 tests
    suite.addTests(loader.loadTestsFromTestCase(TestSourceIntegrity))              #  7 tests
    suite.addTests(loader.loadTestsFromTestCase(TestProjectYmlSpecification))       #  6 tests
    suite.addTests(loader.loadTestsFromTestCase(TestSupabaseLiveConnectivity))      # 19 tests
    return suite


def build_e2e_suite(loader: unittest.TestLoader, tier: int = 0) -> unittest.TestSuite:
    """Aggregates Milestone 7 E2E integration test tiers (74 tests total)."""
    suite = unittest.TestSuite()
    if tier == 0 or tier == 1:
        suite.addTests(loader.loadTestsFromTestCase(TestTier1FeatureCoverage))      # 26 tests
    if tier == 0 or tier == 2:
        suite.addTests(loader.loadTestsFromTestCase(TestTier2BoundaryCorner))       # 24 tests
    if tier == 0 or tier == 3:
        suite.addTests(loader.loadTestsFromTestCase(TestTier3CrossFeature))         # 10 tests
    if tier == 0 or tier == 4:
        suite.addTests(loader.loadTestsFromTestCase(TestTier4RealWorld))            # 14 tests
    return suite


def build_m7_master_suite(loader: unittest.TestLoader, mode: str = "all", tier: int = 0) -> unittest.TestSuite:
    """Builds unified test suite according to user selection."""
    master_suite = unittest.TestSuite()

    if mode == "milestones":
        master_suite.addTests(build_milestones_suite(loader))
    elif mode == "e2e":
        master_suite.addTests(build_e2e_suite(loader, tier=tier))
    elif mode == "all":
        master_suite.addTests(build_milestones_suite(loader))
        master_suite.addTests(build_e2e_suite(loader, tier=0))
    else:
        raise ValueError(f"Unknown execution mode: {mode}")

    return master_suite


def main():
    parser = argparse.ArgumentParser(
        description="DARS iOS Native Banking App — Milestone 7 Master Verification Runner"
    )
    parser.add_argument(
        "--mode",
        type=str,
        default="all",
        choices=["all", "milestones", "e2e"],
        help="Test selection: 'all' (154 tests), 'milestones' (M1-M6 80 tests), 'e2e' (Tiers 1-4 74 tests)"
    )
    parser.add_argument(
        "--tier",
        type=int,
        default=0,
        choices=[0, 1, 2, 3, 4],
        help="When --mode e2e is active, select specific tier (1-4, 0 runs all tiers)"
    )
    parser.add_argument(
        "--verbosity",
        type=int,
        default=2,
        help="Test runner verbosity level (1 or 2)"
    )
    args = parser.parse_args()

    print("=" * 88)
    print("DARS iOS Native Mobile Banking App — Milestone 7 Final E2E Master Verification")
    print("Platform: Apple iOS 17.0+ Native SwiftUI | Kuveyt Türk Design System | Supabase Live")
    print(f"Selection Mode: {args.mode.upper()} | Tier: {args.tier if args.mode == 'e2e' else 'N/A'}")
    print("=" * 88)

    start_time = time.time()
    loader = unittest.TestLoader()
    suite = build_m7_master_suite(loader, mode=args.mode, tier=args.tier)

    runner = unittest.TextTestRunner(verbosity=args.verbosity)
    result = runner.run(suite)
    elapsed = time.time() - start_time

    passed = result.testsRun - len(result.failures) - len(result.errors)
    pass_rate = (passed / result.testsRun * 100.0) if result.testsRun > 0 else 0.0

    print("\n" + "=" * 88)
    print("MILESTONE 7 MASTER VERIFICATION SUMMARY")
    print("=" * 88)
    print(f"  Mode Selected:            {args.mode.upper()}")
    print(f"  Total Tests Executed:     {result.testsRun}")
    print(f"  Passed:                   {passed}")
    print(f"  Failures:                 {len(result.failures)}")
    print(f"  Errors:                   {len(result.errors)}")
    print(f"  Pass Rate:                {pass_rate:.1f}%")
    print(f"  Execution Time:           {elapsed:.2f} seconds")
    status_str = "SUCCESS (100% PASS)" if result.wasSuccessful() else "FAILED"
    print(f"  Final Certification:      {status_str}")
    print("=" * 88)

    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
