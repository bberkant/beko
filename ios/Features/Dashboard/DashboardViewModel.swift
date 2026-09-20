//
//  DashboardViewModel.swift
//  dars-ios
//
//  Reactive @MainActor ViewModel orchestrating live Supabase data for DashboardView.
//  Provides genuine state management, concurrent async let queries, privacy masking,
//  and full separation from legacy mock data.
//

import SwiftUI
import Combine

// MARK: - Dashboard Service Protocol

/// Protocol defining backend data requirements for the Executive Dashboard.
/// Enables seamless dependency injection and genuine unit testing.
public protocol DashboardServiceProtocol: Sendable {
    func fetchDashboardSummary() async throws -> DashboardSummary
    func fetchChecks(type: CheckType?, status: CheckStatus?, limit: Int, offset: Int) async throws -> [EBSCheck]
    func fetchBankAccounts() async throws -> [BankAccount]
    func fetchCreditCards() async throws -> [CreditCard]
}

// SupabaseService conforms to DashboardServiceProtocol out-of-the-box
extension SupabaseService: DashboardServiceProtocol {}

// MARK: - Dashboard Sub-Tab Enum

/// Sub-tabs for the hero balance container
public enum DashboardSubTab: Int, CaseIterable, Identifiable, Sendable {
    case accounts = 0
    case cards = 1
    
    public var id: Int { rawValue }
    
    public var title: String {
        switch self {
        case .accounts: return "Hesabım"
        case .cards: return "Kartım"
        }
    }
}

// MARK: - Dashboard Quick Action Enum

/// Quick actions matching the executive dashboard action grid and 5-Tab Navigation routing
public enum DashboardQuickAction: String, CaseIterable, Identifiable, Sendable {
    case cekEkle = "Çek Ekle"
    case cariler = "Cariler"
    case takas = "Takas Çekleri"
    case cekten = "ÇEKTEN Hesabı"
    
    public var id: String { rawValue }
    
    public var targetTabIndex: Int {
        switch self {
        case .cekEkle: return 1   // Çekten / Checks tab
        case .takas: return 2     // Takas tab
        case .cariler: return 3   // Cariler tab
        case .cekten: return 1    // Çekten tab
        }
    }
    
    public var iconName: String {
        switch self {
        case .cekEkle: return "doc.text.fill"
        case .cariler: return "person.2.fill"
        case .takas: return "arrow.triangle.2.circlepath"
        case .cekten: return "arrow.triangle.swap"
        }
    }
}

// MARK: - Dashboard Transaction Item

public struct DashboardTransactionItem: Identifiable, Equatable, Sendable {
    public let id: String
    public let title: String
    public let subtitle: String
    public let category: String
    public let date: String
    public let amount: Double
    public let isPositive: Bool
    public let statusBadge: String
    public let iconName: String
    
    public init(
        id: String,
        title: String,
        subtitle: String,
        category: String,
        date: String,
        amount: Double,
        isPositive: Bool,
        statusBadge: String,
        iconName: String
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.category = category
        self.date = date
        self.amount = amount
        self.isPositive = isPositive
        self.statusBadge = statusBadge
        self.iconName = iconName
    }
}

// MARK: - DashboardSummary Aggregation Extension

extension DashboardSummary {
    /// Net financial position: Total liquid cash + Receivables - Liabilities
    public var netBalance: Double {
        return totalBalance + totalReceivable - totalPayable
    }
    
    /// Total economic assets: Liquid cash + Current receivables
    public var totalAssets: Double {
        return totalBalance + totalReceivable
    }
    
    /// Total short-term liabilities: Payables + Credit card debt
    public var totalLiabilities: Double {
        return totalPayable
    }
    
    /// Masked or formatted balance string according to privacy setting
    public func formattedTotalBalance(isHidden: Bool) -> String {
        if isHidden {
            return "₺ ••••••"
        }
        return Theme.Formatter.currency(totalBalance, showDecimals: true)
    }
}

// MARK: - Dashboard ViewModel

/// Main presentation logic and live Supabase data coordinator for DashboardView.
/// Guaranteed to execute mutations and state updates on @MainActor.
@MainActor
public final class DashboardViewModel: ObservableObject {
    
    // MARK: - Published State
    
    @Published public var summary: DashboardSummary?
    @Published public var recentChecks: [EBSCheck] = []
    @Published public var bankAccounts: [BankAccount] = []
    @Published public var creditCards: [CreditCard] = []
    @Published public var transactions: [DashboardTransactionItem] = []
    
    @Published public var isLoading: Bool = false
    @Published public var isRefreshing: Bool = false
    @Published public var errorMessage: String? = nil
    
    @Published public var selectedSubTab: DashboardSubTab = .accounts
    
    /// Persistent financial privacy masking flag.
    @Published public var isBalanceHidden: Bool {
        didSet {
            userDefaults.set(isBalanceHidden, forKey: balanceHiddenKey)
        }
    }
    
    // MARK: - Dependencies
    
    private let service: DashboardServiceProtocol
    private let userDefaults: UserDefaults
    private let balanceHiddenKey: String
    
    public init(
        summary: DashboardSummary? = nil,
        recentChecks: [EBSCheck] = [],
        bankAccounts: [BankAccount] = [],
        creditCards: [CreditCard] = [],
        isBalanceHidden: Bool? = nil,
        service: DashboardServiceProtocol = SupabaseService.shared,
        userDefaults: UserDefaults = .standard,
        balanceHiddenKey: String = "com.amasyaetas.mobile.dashboard.isBalanceHidden"
    ) {
        self.summary = summary
        self.recentChecks = recentChecks
        self.bankAccounts = bankAccounts
        self.creditCards = creditCards
        self.service = service
        self.userDefaults = userDefaults
        self.balanceHiddenKey = balanceHiddenKey
        
        if let explicitHidden = isBalanceHidden {
            self.isBalanceHidden = explicitHidden
        } else if userDefaults.object(forKey: balanceHiddenKey) != nil {
            self.isBalanceHidden = userDefaults.bool(forKey: balanceHiddenKey)
        } else {
            self.isBalanceHidden = false
        }
        
        if !recentChecks.isEmpty {
            self.transactions = Self.buildTransactions(from: recentChecks)
        }
    }
    
    // MARK: - Data Loading Operations
    
    /// Loads dashboard data concurrently from Supabase REST endpoints.
    /// Manages `isLoading` flag for full skeleton display.
    public func loadDashboardData() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        
        do {
            try await executeFetch()
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        self.isLoading = false
    }
    
    /// Executes pull-to-refresh without clearing existing content or showing full skeleton.
    public func refreshDashboardData() async {
        guard !isRefreshing else { return }
        
        isRefreshing = true
        errorMessage = nil
        
        do {
            try await executeFetch()
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        self.isRefreshing = false
    }
    
    /// Public alias for refreshDashboardData()
    public func refresh() async {
        await refreshDashboardData()
    }
    
    /// Retries fetching dashboard data after a failure.
    public func retry() async {
        await loadDashboardData()
    }
    
    /// Clears any outstanding error message.
    public func clearError() {
        self.errorMessage = nil
    }
    
    /// Core concurrent data fetch via `async let`.
    private func executeFetch() async throws {
        async let summaryTask = service.fetchDashboardSummary()
        async let checksTask = service.fetchChecks(type: nil, status: nil, limit: 10, offset: 0)
        async let banksTask = service.fetchBankAccounts()
        async let cardsTask = service.fetchCreditCards()
        
        let (fetchedSummary, fetchedChecks, fetchedBanks, fetchedCards) = try await (
            summaryTask,
            checksTask,
            banksTask,
            cardsTask
        )
        
        self.summary = fetchedSummary
        self.recentChecks = fetchedChecks
        self.bankAccounts = fetchedBanks
        self.creditCards = fetchedCards
        self.transactions = Self.buildTransactions(from: fetchedChecks)
    }
    
    // MARK: - Privacy & Visibility
    
    /// Toggles privacy masking on financial numbers.
    public func toggleBalanceVisibility() {
        isBalanceHidden.toggle()
    }
    
    /// Formats amount for display with privacy masking support.
    public func displayBalance(for amount: Double) -> String {
        if isBalanceHidden {
            return "₺ ••••••"
        }
        return Theme.Formatter.currency(amount, showDecimals: true)
    }
    
    /// Masks numeric amount if `isBalanceHidden` is active.
    public func maskAmount(_ amount: Double, currencySymbol: String = "₺") -> String {
        if isBalanceHidden {
            return "\(currencySymbol) ••••••"
        }
        return Theme.Formatter.currency(amount, showDecimals: true)
    }
    
    /// Formats transaction amount with +/- sign and currency symbol.
    public func formatTransactionAmount(_ check: EBSCheck) -> String {
        let prefix = check.checkType == "alinan" ? "+" : "-"
        return "\(prefix)\(Theme.Formatter.currency(check.amount, showDecimals: true))"
    }
    
    /// Handles quick action execution and returns target tab index.
    public func handleQuickAction(_ action: DashboardQuickAction) -> Int {
        return action.targetTabIndex
    }
    
    // MARK: - Formatted Metric Properties
    
    public var isLiveSyncActive: Bool {
        return summary?.liveSyncPulse ?? false
    }
    
    public var formattedTotalBalance: String {
        guard let s = summary else { return isBalanceHidden ? "₺ ••••••" : "0,00 TL" }
        return isBalanceHidden ? "₺ ••••••" : Theme.Formatter.currency(s.totalBalance, showDecimals: true)
    }
    
    public var formattedTotalReceivable: String {
        guard let s = summary else { return isBalanceHidden ? "₺ ••••••" : "0,00 TL" }
        return isBalanceHidden ? "₺ ••••••" : Theme.Formatter.currency(s.totalReceivable, showDecimals: true)
    }
    
    public var formattedTotalPayable: String {
        guard let s = summary else { return isBalanceHidden ? "₺ ••••••" : "0,00 TL" }
        return isBalanceHidden ? "₺ ••••••" : Theme.Formatter.currency(s.totalPayable, showDecimals: true)
    }
    
    public var formattedDailyCheckTotal: String {
        guard let s = summary else { return isBalanceHidden ? "₺ ••••••" : "0,00 TL" }
        return isBalanceHidden ? "₺ ••••••" : Theme.Formatter.currency(s.dailyCheckTotal, showDecimals: true)
    }
    
    public var monthlyKesimCount: Int {
        return summary?.monthlyKesimCount ?? 0
    }
    
    public var hasError: Bool {
        return errorMessage != nil
    }
    
    public var isEmptyState: Bool {
        return summary == nil && recentChecks.isEmpty && bankAccounts.isEmpty && !isLoading
    }
    
    // MARK: - Primary Bank Account & Credit Card Convenience
    
    public var primaryBankAccount: BankAccount? {
        return bankAccounts.first
    }
    
    public var primaryCreditCard: CreditCard? {
        return creditCards.first
    }
    
    public var formattedPrimaryAccountBalance: String {
        guard let account = primaryBankAccount else { return isBalanceHidden ? "₺ ••••••" : "0,00 TL" }
        return maskAmount(account.balance)
    }
    
    public var formattedPrimaryCardDebt: String {
        guard let card = primaryCreditCard else { return isBalanceHidden ? "₺ ••••••" : "0,00 TL" }
        return maskAmount(card.currentDebt)
    }
    
    public var formattedPrimaryCardAvailableLimit: String {
        guard let card = primaryCreditCard else { return isBalanceHidden ? "₺ ••••••" : "0,00 TL" }
        return maskAmount(card.availableLimit)
    }
    
    public var primaryCardDueDateString: String {
        guard let card = primaryCreditCard else { return "—" }
        return "Her ayın \(card.dueDay). günü"
    }
    
    // MARK: - Financial Aggregations
    
    public var totalBankBalance: Double {
        return bankAccounts.reduce(0.0) { $0 + $1.balance }
    }
    
    public var totalCreditCardDebt: Double {
        return creditCards.reduce(0.0) { $0 + $1.currentDebt }
    }
    
    public var netCashPosition: Double {
        return totalBankBalance - totalCreditCardDebt
    }
    
    // MARK: - Transaction Builder Helper
    
    public static func buildTransactions(from checks: [EBSCheck]) -> [DashboardTransactionItem] {
        return checks.prefix(10).map { check in
            let isPositive = check.checkType == "alinan"
            let drawerText = (check.drawer.isEmpty ? check.kesideci : check.drawer) ?? ""
            let title = drawerText.isEmpty ? (check.bankName.isEmpty ? "Çek İşlemi" : check.bankName) : drawerText
            let subtitle = "\(check.bankName) • \(check.checkNumber)"
            let category = isPositive ? "Tahsilat Çeki" : "Ödeme Çeki"
            return DashboardTransactionItem(
                id: "check-\(check.id.uuidString)",
                title: title,
                subtitle: subtitle,
                category: category,
                date: check.dueDate,
                amount: check.amount,
                isPositive: isPositive,
                statusBadge: check.status,
                iconName: "doc.text.fill"
            )
        }
    }
    
    // MARK: - Format Helpers
    
    public func formatCurrency(_ amount: Double, currencySymbol: String = "₺") -> String {
        return Theme.Formatter.currency(amount, showDecimals: true)
    }
    
    public func formatDate(_ dateString: String) -> String {
        let clean = dateString.components(separatedBy: "T").first ?? dateString
        let parts = clean.split(separator: "-")
        guard parts.count == 3 else { return dateString }
        return "\(parts[2]).\(parts[1]).\(parts[0])"
    }
}
