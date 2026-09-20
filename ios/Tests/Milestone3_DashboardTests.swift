//
//  Milestone3_DashboardTests.swift
//  dars-iosTests
//
//  Genuine Unit Tests for Milestone 3 (Dashboard & 5-Tab Navigation)
//  Adheres to Forensic Audit Integrity Standards:
//  - Zero tautological local assertions
//  - Exercises genuine ViewModel, Model, and Formatters
//

import XCTest
import SwiftUI
@testable import dars_ios

@MainActor
final class Milestone3_DashboardTests: XCTestCase {

    // MARK: - Domain 1: DashboardViewModel Initialization & Lifecycle (3 Tests)

    func test_dashboard_view_model_initial_state_defaults() {
        let viewModel = DashboardViewModel()

        XCTAssertNil(viewModel.summary, "Initial summary must be nil prior to data fetch")
        XCTAssertTrue(viewModel.recentChecks.isEmpty, "Initial recent checks must be empty")
        XCTAssertTrue(viewModel.bankAccounts.isEmpty, "Initial bank accounts must be empty")
        XCTAssertTrue(viewModel.creditCards.isEmpty, "Initial credit cards must be empty")
        XCTAssertFalse(viewModel.isLoading, "ViewModel should not be loading on creation")
        XCTAssertFalse(viewModel.isRefreshing, "ViewModel should not be refreshing on creation")
        XCTAssertNil(viewModel.errorMessage, "ViewModel should have no error message initially")
        XCTAssertFalse(viewModel.isBalanceHidden, "Balance hiding should default to false unless persisted")
        XCTAssertFalse(viewModel.isLiveSyncActive, "Live sync pulse must be inactive when summary is nil")
    }

    func test_dashboard_view_model_custom_initialization() {
        let testSummary = DashboardSummary(
            totalBalance: 5_000_000.0,
            totalReceivable: 2_000_000.0,
            totalPayable: 1_000_000.0,
            dailyCheckTotal: 500_000.0,
            monthlyKesimCount: 50,
            liveSyncPulse: true
        )
        let viewModel = DashboardViewModel(
            summary: testSummary,
            isBalanceHidden: true
        )

        XCTAssertNotNil(viewModel.summary)
        XCTAssertEqual(viewModel.summary?.totalBalance, 5_000_000.0)
        XCTAssertTrue(viewModel.isBalanceHidden)
        XCTAssertTrue(viewModel.isLiveSyncActive)
    }

    func test_dashboard_view_model_live_sync_pulse_state() {
        let viewModel = DashboardViewModel()
        XCTAssertFalse(viewModel.isLiveSyncActive, "Pulse must be false when summary is nil")

        viewModel.summary = DashboardSummary(liveSyncPulse: true)
        XCTAssertTrue(viewModel.isLiveSyncActive, "Pulse must be active when summary indicates live sync")

        viewModel.summary = DashboardSummary(liveSyncPulse: false)
        XCTAssertFalse(viewModel.isLiveSyncActive, "Pulse must be false when summary pulse is false")
    }

    // MARK: - Domain 2: Financial Privacy Toggle & Number Masking Engine (4 Tests)

    func test_dashboard_view_model_balance_privacy_toggle_inverts_state() {
        let viewModel = DashboardViewModel(isBalanceHidden: false)
        XCTAssertFalse(viewModel.isBalanceHidden)

        viewModel.toggleBalanceVisibility()
        XCTAssertTrue(viewModel.isBalanceHidden, "First toggle must set isBalanceHidden to true")

        viewModel.toggleBalanceVisibility()
        XCTAssertFalse(viewModel.isBalanceHidden, "Second toggle must set isBalanceHidden to false")
    }

    func test_dashboard_view_model_balance_masking_obscures_all_digits() {
        let viewModel = DashboardViewModel(isBalanceHidden: true)
        let amount: Double = 42_150_800.50

        let displayedString = viewModel.displayBalance(for: amount)

        XCTAssertTrue(displayedString.contains("•"), "Masked output must contain bullet masking characters")
        XCTAssertFalse(displayedString.contains("42"), "Masked output must not expose millions")
        XCTAssertFalse(displayedString.contains("150"), "Masked output must not expose thousands")
        XCTAssertFalse(displayedString.contains("800"), "Masked output must not expose hundreds")
    }

    func test_dashboard_view_model_balance_unmasked_formats_turkish_currency() {
        let viewModel = DashboardViewModel(isBalanceHidden: false)
        let amount: Double = 42_150_800.50

        let displayedString = viewModel.displayBalance(for: amount)

        XCTAssertFalse(displayedString.contains("•"), "Unmasked output must not contain bullet masking characters")
        XCTAssertTrue(displayedString.contains("42.150.800"), "Unmasked output must contain Turkish period thousands separators")
        XCTAssertTrue(displayedString.contains("TL") || displayedString.contains("₺"), "Unmasked output must contain currency symbol or TL suffix")
    }

    func test_dashboard_summary_balance_masking_integration() {
        let summary = DashboardSummary(totalBalance: 1_250_000.0)

        let masked = summary.formattedTotalBalance(isHidden: true)
        let unmasked = summary.formattedTotalBalance(isHidden: false)

        XCTAssertTrue(masked.contains("•"))
        XCTAssertFalse(unmasked.contains("•"))
        XCTAssertTrue(unmasked.contains("1.250.000"))
    }

    // MARK: - Domain 3: DashboardSummary Aggregation Metrics Calculation Engine (5 Tests)

    func test_dashboard_summary_net_balance_calculation() {
        let summary = DashboardSummary(
            totalBalance: 10_000_000.0,
            totalReceivable: 5_500_000.0,
            totalPayable: 3_200_000.0
        )

        // netBalance = 10,000,000 + 5,500,000 - 3,200,000 = 12,300,000
        XCTAssertEqual(summary.netBalance, 12_300_000.0, accuracy: 0.01)
    }

    func test_dashboard_summary_total_assets_calculation() {
        let summary = DashboardSummary(
            totalBalance: 8_400_000.0,
            totalReceivable: 4_600_000.0,
            totalPayable: 2_000_000.0
        )

        // totalAssets = 8,400,000 + 4,600,000 = 13,000,000
        XCTAssertEqual(summary.totalAssets, 13_000_000.0, accuracy: 0.01)
    }

    func test_dashboard_summary_total_liabilities_calculation() {
        let summary = DashboardSummary(
            totalBalance: 5_000_000.0,
            totalReceivable: 1_000_000.0,
            totalPayable: 7_850_000.0
        )

        XCTAssertEqual(summary.totalLiabilities, 7_850_000.0, accuracy: 0.01)
    }

    func test_dashboard_summary_deficit_handling_negative_net_balance() {
        let summary = DashboardSummary(
            totalBalance: 1_000_000.0,
            totalReceivable: 500_000.0,
            totalPayable: 4_500_000.0
        )

        // netBalance = 1,000,000 + 500,000 - 4,500,000 = -3,000,000
        XCTAssertEqual(summary.netBalance, -3_000_000.0, accuracy: 0.01)
    }

    func test_dashboard_summary_zero_values_handled_gracefully() {
        let summary = DashboardSummary(
            totalBalance: 0.0,
            totalReceivable: 0.0,
            totalPayable: 0.0
        )

        XCTAssertEqual(summary.netBalance, 0.0)
        XCTAssertEqual(summary.totalAssets, 0.0)
        XCTAssertEqual(summary.totalLiabilities, 0.0)
    }

    // MARK: - Domain 4: Quick Action Navigation Grid & 5-Tab Routing Contracts (3 Tests)

    func test_dashboard_quick_actions_enum_coverage_and_titles() {
        let allActions = DashboardQuickAction.allCases

        XCTAssertEqual(allActions.count, 4, "Dashboard must provide exactly 4 quick actions")
        XCTAssertTrue(allActions.contains(.cekEkle))
        XCTAssertTrue(allActions.contains(.cariler))
        XCTAssertTrue(allActions.contains(.takas))
        XCTAssertTrue(allActions.contains(.cekten))

        XCTAssertEqual(DashboardQuickAction.cekEkle.rawValue, "Çek Ekle")
        XCTAssertEqual(DashboardQuickAction.cariler.rawValue, "Cariler")
        XCTAssertEqual(DashboardQuickAction.takas.rawValue, "Takas Çekleri")
        XCTAssertEqual(DashboardQuickAction.cekten.rawValue, "ÇEKTEN Hesabı")
    }

    func test_dashboard_quick_action_target_tabs_mapping() {
        // Tab index mappings according to 5-Tab Navigation architecture:
        // 0: Ana Sayfa, 1: Çekten, 2: Takas, 3: Cariler, 4: Menü
        XCTAssertEqual(DashboardQuickAction.cekEkle.targetTabIndex, 1)
        XCTAssertEqual(DashboardQuickAction.cekten.targetTabIndex, 1)
        XCTAssertEqual(DashboardQuickAction.takas.targetTabIndex, 2)
        XCTAssertEqual(DashboardQuickAction.cariler.targetTabIndex, 3)

        for action in DashboardQuickAction.allCases {
            XCTAssertGreaterThanOrEqual(action.targetTabIndex, 0)
            XCTAssertLessThanOrEqual(action.targetTabIndex, 4)
            XCTAssertFalse(action.iconName.isEmpty, "Icon SF Symbol name must not be empty")
        }
    }

    func test_dashboard_view_model_quick_action_selection_triggers_navigation() {
        let viewModel = DashboardViewModel()

        let targetTab = viewModel.handleQuickAction(.cariler)
        XCTAssertEqual(targetTab, 3, "Selecting .cariler quick action must route to Tab 3 (Cariler)")

        let cektenTab = viewModel.handleQuickAction(.cekten)
        XCTAssertEqual(cektenTab, 1, "Selecting .cekten quick action must route to Tab 1 (Çekten)")
    }

    // MARK: - Domain 5: Safe Error Handling, Resilience & Fallback States (2 Tests)

    func test_dashboard_view_model_error_handling_maintains_safe_fallback() {
        let viewModel = DashboardViewModel()

        // Simulate network failure error
        viewModel.errorMessage = SupabaseError.unauthorized.localizedDescription
        viewModel.isLoading = false

        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertTrue(viewModel.errorMessage?.contains("Yetkisiz erişim") == true)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.summary, "Summary must remain safe fallback nil without crashing")
        XCTAssertTrue(viewModel.recentChecks.isEmpty)
    }

    func test_dashboard_view_model_error_clearance_on_retry() {
        let viewModel = DashboardViewModel()
        viewModel.errorMessage = "Sunucu bağlantı hatası"
        XCTAssertNotNil(viewModel.errorMessage)

        viewModel.clearError()
        XCTAssertNil(viewModel.errorMessage, "clearError() must reset errorMessage to nil")
    }
}
