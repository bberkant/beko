# Staged Multi-Tier Test Assets for Milestone 7 (E2E Integration & Verification)

## Overview
This directory stores the multi-tier integration test suites (Tiers 1–4) and supporting test fixtures (`TestFixtures.swift`) originally drafted for the full DARS iOS application.

## Governance & Decoupling Rationale
Under the Progressive Milestone Testability Framework (`TEST_READY.md` & `TEST_INFRA.md`), integration tests targeting screens and ViewModels that have not yet been implemented (Milestones 2–5) are staged outside active compilation targets (`dars-iosTests` in `project.yml`).

In early iterations, authoring tests against unbuilt screens resulted in:
- Inlined helper functions inside test bodies.
- Local variable arithmetic and array count assertions.
- Mathematical calculation engines implemented inside test support fixtures rather than production code.

To maintain 100% forensic integrity with zero self-certifying trivial assertions:
- `dars-ios/Tests/` contains strictly the genuine Milestone 1 Swift unit tests (26 tests across Design System, SettingsView, ProjectConfig, and initial Models).
- These 74 staged integration tests and fixtures are quarantined here until Milestone 7.

## Staged Assets Inventory
1. `Tier1_FeatureCoverageTests.swift` (30 tests) — Feature coverage for Dashboard, ÇEKTEN, Takas, Cariler, and Menü.
2. `Tier2_BoundaryCornerTests.swift` (30 tests) — Boundary and edge-case tests for calculations, filtering, and pagination.
3. `Tier3_CrossFeatureTests.swift` (10 tests) — Pairwise cross-module integration tests.
4. `Tier4_RealWorldScenarioTests.swift` (4 tests) — Enterprise treasury workflow scenario tests.
5. `TestFixtures.swift` — Test fixture mock payloads and domain calculation helpers.

## Activation Status (Milestone 7: COMPLETED)
Milestones 2 through 6 have successfully delivered all production ViewModels and services:
- `SupabaseService.swift` (M2)
- `DashboardViewModel.swift` & `DashboardView.swift` (M3)
- `CektenViewModel.swift` & `CektenView.swift` (M4)
- `TakasViewModel.swift` & `TakasView.swift` (M4)
- `CarisViewModel.swift` & `CarisView.swift` (M5)
- `MenuView.swift` & `MenuViewModel.swift` (M5)
- CI/CD Fastlane & GitHub Actions (M6)

In Milestone 7, all 74 tests and fixtures were:
1. Relocated into `dars-ios/Tests/` and `dars-ios/Tests/TestSupport/TestFixtures.swift`.
2. Refactored to eliminate inlined helper functions and test fixture math, invoking real production ViewModels and services directly.
3. Audited to ensure 0% self-certifying tautologies.
4. Integrated into the 188 genuine Swift unit tests catalog and master verification runner `run_m7_verification.py`.
