//
//  CarisViewModel.swift
//  dars-ios
//
//  Reactive @MainActor ViewModel orchestrating live Supabase vega_cariler data.
//  Encapsulates live querying across 2,184 records, cursor pagination,
//  Combine search debouncing (300ms), Set<UUID> deduplication, KPI calculation,
//  balance badge classification, Turkish locale search/sorting, and customer management.
//

import SwiftUI
import Combine
import Foundation

// MARK: - Caris Service Protocol

/// Protocol defining backend data requirements for the Cariler (Current Accounts) screen.
/// Enables clean dependency injection and isolated unit testing.
public protocol CarisServiceProtocol: Sendable {
    func fetchCariler(query: String?, limit: Int, offset: Int) async throws -> [VegaCari]
}

// SupabaseService conforms to CarisServiceProtocol
extension SupabaseService: CarisServiceProtocol {}

// MARK: - Filter Enums

/// Filter options for Current Account balances matching Kuveyt Türk prototype.
public enum CariFilter: String, CaseIterable, Identifiable, Sendable {
    case all = "Tümü"
    case alacakli = "Alacaklılar"
    case borclu = "Borçlular"
    case sifir = "Sıfır Bakiye"
    
    public var id: String { rawValue }
    public var title: String { rawValue }
}

public typealias CariBalanceFilter = CariFilter

// MARK: - Sorting Enums

/// Sorting options for Current Account listings.
public enum CariSort: String, CaseIterable, Identifiable, Sendable {
    case balanceDesc = "Bakiye (Azalan)"
    case balanceAsc = "Bakiye (Artan)"
    case nameAsc = "İsim (A-Z)"
    case nameDesc = "İsim (Z-A)"
    case cityAsc = "Şehir (A-Z)"
    case lastTransaction = "Son İşlem"
    
    public var id: String { rawValue }
    public var title: String { rawValue }
}

public typealias CariSortOption = CariSort

// MARK: - Ledger Movement Filter Enum

public enum CariMovementFilter: String, CaseIterable, Identifiable, Sendable {
    case all = "Tüm Hareketler"
    case kesimFatura = "Kesim & Faturalar"
    case odeme = "Ödeme / Banka"
    case cek = "Çekler"
    
    public var id: String { rawValue }
}

// MARK: - Cari Ledger Movement Model

public struct CariLedgerMovement: Identifiable, Sendable, Hashable {
    public let id: UUID
    public let date: String
    public let docNo: String
    public let type: String // "kesim", "fatura", "odeme", "cek"
    public let typeLabel: String
    public let desc: String
    public let debit: Double  // Borç (+)
    public let credit: Double // Alacak (-)
    public let balance: Double
    public let isPositive: Bool
    
    public init(
        id: UUID = UUID(),
        date: String,
        docNo: String,
        type: String,
        typeLabel: String,
        desc: String,
        debit: Double = 0.0,
        credit: Double = 0.0,
        balance: Double = 0.0,
        isPositive: Bool = false
    ) {
        self.id = id
        self.date = date
        self.docNo = docNo
        self.type = type
        self.typeLabel = typeLabel
        self.desc = desc
        self.debit = debit
        self.credit = credit
        self.balance = balance
        self.isPositive = isPositive
    }
}

// MARK: - Caris ViewModel Implementation

/// Main presentation logic and live data coordinator for CarisView.
/// Fully isolated on @MainActor for UI thread safety.
@MainActor
public final class CarisViewModel: ObservableObject {
    
    // MARK: - Published Reactive State
    
    @Published public var cariler: [VegaCari] = []
    @Published public var selectedFilter: CariFilter = .all
    @Published public var selectedSort: CariSort = .balanceDesc
    @Published public var searchText: String = ""
    
    @Published public var isLoading: Bool = false
    @Published public var isLoadingMore: Bool = false
    @Published public var isRefreshing: Bool = false
    @Published public var errorMessage: String? = nil
    
    @Published public var totalReceivable: Double = 0.0
    @Published public var totalPayable: Double = 0.0
    @Published public var netBalance: Double = 0.0
    
    @Published public var hasMorePages: Bool = true
    @Published public var selectedCari: VegaCari? = nil
    @Published public var selectedCariForDetail: VegaCari? = nil
    @Published public var isBalanceHidden: Bool = false
    @Published public var isBalanceMasked: Bool = false
    
    @Published public var isShowingNewCariSheet: Bool = false
    @Published public var activeMovementFilter: CariMovementFilter = .all
    @Published public var toastMessage: String? = nil
    
    // MARK: - Internal Configuration & State
    
    public let pageSize: Int
    private var currentOffset: Int = 0
    private var loadedIds: Set<UUID> = []
    
    private let service: CarisServiceProtocol
    private var cancellables = Set<AnyCancellable>()
    private var searchTask: Task<Void, Never>? = nil
    
    // Alias for records
    public var records: [VegaCari] {
        get { cariler }
        set {
            cariler = newValue
            loadedIds = Set(newValue.map { $0.id })
            calculateKPIs()
        }
    }
    
    // MARK: - Initialization
    
    public init(
        initialCariler: [VegaCari] = [],
        pageSize: Int = 100,
        service: CarisServiceProtocol = SupabaseService.shared,
        isBalanceHidden: Bool = false
    ) {
        self.cariler = initialCariler
        self.pageSize = pageSize
        self.service = service
        self.isBalanceHidden = isBalanceHidden
        self.isBalanceMasked = isBalanceHidden
        
        for item in initialCariler {
            self.loadedIds.insert(item.id)
        }
        
        if !initialCariler.isEmpty {
            self.calculateKPIs()
        }
        
        setupSearchDebounce()
    }
    
    // Convenience init for records
    public convenience init(
        service: CarisServiceProtocol = SupabaseService.shared,
        initialRecords: [VegaCari] = []
    ) {
        self.init(initialCariler: initialRecords, pageSize: 100, service: service, isBalanceHidden: false)
    }
    
    // MARK: - Search Debounce Setup
    
    private func setupSearchDebounce() {
        $searchText
            .dropFirst()
            .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
            .removeDuplicates()
            .sink { [weak self] query in
                guard let self = self else { return }
                self.searchTask?.cancel()
                self.searchTask = Task { [weak self] in
                    await self?.search(query: query)
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading Operations
    
    /// Loads initial batch of accounts from Supabase.
    public func loadInitialCariler() async {
        guard !isLoading else { return }
        
        isLoading = true
        errorMessage = nil
        currentOffset = 0
        
        do {
            let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let queryParam = query.isEmpty ? nil : query
            
            let fetched = try await service.fetchCariler(
                query: queryParam,
                limit: pageSize,
                offset: 0
            )
            
            self.loadedIds.removeAll()
            for item in fetched {
                self.loadedIds.insert(item.id)
            }
            
            self.cariler = fetched
            self.currentOffset = fetched.count
            self.hasMorePages = fetched.count >= pageSize
            self.calculateKPIs()
        } catch {
            if !Task.isCancelled {
                self.errorMessage = error.localizedDescription
            }
        }
        
        self.isLoading = false
    }
    
    public func loadInitialData() async {
        await loadInitialCariler()
    }
    
    /// Loads next page of accounts for smooth infinite scrolling.
    public func loadMoreCariler() async {
        guard hasMorePages, !isLoading, !isLoadingMore else { return }
        
        isLoadingMore = true
        
        do {
            let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let queryParam = query.isEmpty ? nil : query
            
            let fetched = try await service.fetchCariler(
                query: queryParam,
                limit: pageSize,
                offset: currentOffset
            )
            
            if fetched.isEmpty {
                self.hasMorePages = false
            } else {
                appendPaginatedRecords(fetched)
                self.currentOffset += fetched.count
                self.hasMorePages = fetched.count >= pageSize
            }
        } catch {
            if !Task.isCancelled {
                self.errorMessage = error.localizedDescription
            }
        }
        
        self.isLoadingMore = false
    }
    
    /// Appends new records while ensuring in-memory Set<UUID> deduplication.
    public func appendPaginatedRecords(_ newRecords: [VegaCari]) {
        var itemsToAdd: [VegaCari] = []
        for item in newRecords {
            if !self.loadedIds.contains(item.id) {
                self.loadedIds.insert(item.id)
                itemsToAdd.append(item)
            }
        }
        if !itemsToAdd.isEmpty {
            self.cariler.append(contentsOf: itemsToAdd)
            self.calculateKPIs()
        }
    }
    
    /// Pull-to-refresh reload resetting cursor to 0.
    public func refreshCariler() async {
        guard !isRefreshing else { return }
        
        isRefreshing = true
        errorMessage = nil
        
        do {
            let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let queryParam = query.isEmpty ? nil : query
            
            let fetched = try await service.fetchCariler(
                query: queryParam,
                limit: pageSize,
                offset: 0
            )
            
            self.loadedIds.removeAll()
            for item in fetched {
                self.loadedIds.insert(item.id)
            }
            
            self.cariler = fetched
            self.currentOffset = fetched.count
            self.hasMorePages = fetched.count >= pageSize
            self.calculateKPIs()
        } catch {
            if !Task.isCancelled {
                self.errorMessage = error.localizedDescription
            }
        }
        
        self.isRefreshing = false
    }
    
    public func refresh() async {
        await refreshCariler()
    }
    
    /// Executes a remote search query.
    public func search(query: String) async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        currentOffset = 0
        hasMorePages = true
        errorMessage = nil
        
        do {
            let fetched = try await service.fetchCariler(
                query: trimmed.isEmpty ? nil : trimmed,
                limit: pageSize,
                offset: 0
            )
            
            self.loadedIds.removeAll()
            for item in fetched {
                self.loadedIds.insert(item.id)
            }
            
            self.cariler = fetched
            self.currentOffset = fetched.count
            self.hasMorePages = fetched.count >= pageSize
            self.calculateKPIs()
        } catch {
            if !Task.isCancelled {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    // MARK: - Derived Filtered & Sorted Records
    
    /// Computed property returning filtered and sorted accounts based on active state.
    /// Incorporates full Turkish locale collation and multi-field search.
    public var displayCariler: [VegaCari] {
        var result = cariler
        
        // 1. Status Filter
        switch selectedFilter {
        case .all:
            break
        case .alacakli:
            result = result.filter { $0.balance < 0 }
        case .borclu:
            result = result.filter { $0.balance > 0 }
        case .sifir:
            result = result.filter { $0.balance == 0 }
        }
        
        // 2. Client-side Search with Turkish Unicode support
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !query.isEmpty {
            let trLocale = Locale(identifier: "tr_TR")
            let lowerQuery = query.lowercased(with: trLocale)
            
            result = result.filter { item in
                let lowerName = item.name.lowercased(with: trLocale)
                let lowerCode = item.code.lowercased(with: trLocale)
                let lowerCity = (item.city ?? "").lowercased(with: trLocale)
                let lowerDistrict = (item.district ?? "").lowercased(with: trLocale)
                let tax = item.taxNumber ?? item.taxNo ?? ""
                let phone = item.phone ?? ""
                
                return lowerName.contains(lowerQuery) ||
                       lowerCode.contains(lowerQuery) ||
                       lowerCity.contains(lowerQuery) ||
                       lowerDistrict.contains(lowerQuery) ||
                       tax.contains(query) ||
                       phone.contains(query) ||
                       item.name.localizedStandardContains(query) ||
                       item.code.localizedStandardContains(query) ||
                       (item.city?.localizedStandardContains(query) ?? false)
            }
        }
        
        // 3. Sorting with Turkish Collation
        let trLocale = Locale(identifier: "tr_TR")
        switch selectedSort {
        case .balanceDesc:
            result.sort { $0.balance > $1.balance }
        case .balanceAsc:
            result.sort { $0.balance < $1.balance }
        case .nameAsc:
            result.sort {
                $0.name.compare($1.name, options: [.caseInsensitive], locale: trLocale) == .orderedAscending
            }
        case .nameDesc:
            result.sort {
                $0.name.compare($1.name, options: [.caseInsensitive], locale: trLocale) == .orderedDescending
            }
        case .cityAsc:
            result.sort {
                let c1 = $0.city ?? ""
                let c2 = $1.city ?? ""
                if c1.isEmpty && !c2.isEmpty { return false }
                if !c1.isEmpty && c2.isEmpty { return true }
                return c1.compare(c2, options: [.caseInsensitive], locale: trLocale) == .orderedAscending
            }
        case .lastTransaction:
            result.sort { ($0.lastTransactionDate ?? "") > ($1.lastTransactionDate ?? "") }
        }
        
        return result
    }
    
    public var filteredCariler: [VegaCari] { displayCariler }
    public var filteredAndSortedCaris: [VegaCari] { displayCariler }
    
    // MARK: - Dynamic Count Metrics
    
    public var totalCount: Int {
        cariler.count
    }
    
    public var alacakliCount: Int {
        cariler.filter { $0.balance < 0 }.count
    }
    
    public var borcluCount: Int {
        cariler.filter { $0.balance > 0 }.count
    }
    
    public var sifirCount: Int {
        cariler.filter { $0.balance == 0 }.count
    }
    
    // MARK: - KPI Calculation Engine
    
    /// Computes summary financial metrics from active accounts.
    public func calculateKPIs() {
        var receivable: Double = 0.0
        var payable: Double = 0.0
        
        for item in cariler {
            if item.balance > 0 {
                receivable += item.balance
            } else if item.balance < 0 {
                payable += abs(item.balance)
            }
        }
        
        self.totalReceivable = receivable
        self.totalPayable = payable
        self.netBalance = receivable - payable
    }
    
    // MARK: - Customer Mutation
    
    @discardableResult
    public func addCari(
        name: String,
        code: String,
        taxOffice: String? = nil,
        taxNumber: String? = nil,
        city: String? = nil,
        district: String? = nil,
        phone: String? = nil,
        email: String? = nil,
        type: String? = "Müşteri",
        balance: Double = 0.0
    ) -> VegaCari {
        let newCari = VegaCari(
            id: UUID(),
            code: code.isEmpty ? "CR-\(Int.random(in: 1000...9999))" : code,
            name: name,
            taxOffice: taxOffice,
            taxNo: taxNumber,
            type: type,
            city: city,
            lastTransactionDate: ISO8601DateFormatter().string(from: Date()),
            balance: balance,
            district: district,
            phone: phone,
            email: email,
            isActive: true
        )
        
        withAnimation {
            self.cariler.insert(newCari, at: 0)
            self.loadedIds.insert(newCari.id)
            self.calculateKPIs()
        }
        triggerToast("Cari hesap başarıyla kaydedildi.")
        return newCari
    }
    
    // MARK: - Ledger Movements Synthesis
    
    public func movements(for cari: VegaCari) -> [CariLedgerMovement] {
        let baseAmount = abs(cari.balance) > 0 ? abs(cari.balance) : 125000.0
        let isDebt = cari.balance >= 0
        
        let m1 = CariLedgerMovement(
            date: "28.08.2026",
            docNo: "KSM-2026-0042",
            type: "kesim",
            typeLabel: "Kesim Faturası",
            desc: "Besi karkas et alım faturası (32 Baş Düve)",
            debit: baseAmount * 0.65,
            credit: 0.0,
            balance: isDebt ? baseAmount : -baseAmount * 0.35,
            isPositive: true
        )
        
        let m2 = CariLedgerMovement(
            date: "20.08.2026",
            docNo: "FAST-88319",
            type: "odeme",
            typeLabel: "Banka / FAST Ödemesi",
            desc: "Kuveyt Türk Ticari Hesaptan Havale/FAST",
            debit: 0.0,
            credit: baseAmount * 0.35,
            balance: isDebt ? baseAmount * 0.35 : -baseAmount * 0.70,
            isPositive: false
        )
        
        let m3 = CariLedgerMovement(
            date: "14.08.2026",
            docNo: "CK-09941",
            type: "cek",
            typeLabel: "Verilen Takas Çeki",
            desc: "Vadeli Takas Çeki Girişi (Vade: 30.09.2026)",
            debit: 0.0,
            credit: baseAmount * 0.50,
            balance: cari.balance,
            isPositive: false
        )
        
        let list = [m1, m2, m3]
        switch activeMovementFilter {
        case .all:
            return list
        case .kesimFatura:
            return list.filter { $0.type == "kesim" || $0.type == "fatura" }
        case .odeme:
            return list.filter { $0.type == "odeme" }
        case .cek:
            return list.filter { $0.type == "cek" }
        }
    }
    
    // MARK: - Presentation Formatters & Helpers
    
    public var formattedTotalReceivable: String {
        return formatCurrency(totalReceivable)
    }
    
    public var formattedTotalPayable: String {
        return formatCurrency(totalPayable)
    }
    
    public var formattedNetBalance: String {
        return formatCurrency(netBalance)
    }
    
    public func formatCurrency(_ amount: Double) -> String {
        if isBalanceHidden || isBalanceMasked {
            return "₺ ••••••"
        }
        return Theme.Formatter.currency(amount, showDecimals: true)
    }
    
    public func formatCariBalance(_ cari: VegaCari) -> String {
        if isBalanceHidden || isBalanceMasked {
            return "₺ ••••••"
        }
        return Theme.Formatter.currency(abs(cari.balance), showDecimals: true)
    }
    
    public func badgeColor(for cari: VegaCari) -> Color {
        if cari.balance > 0 {
            return Color.ktCoral
        } else if cari.balance < 0 {
            return Color(hex: 0x10B981) // Emerald Green
        } else {
            return Color.gray
        }
    }
    
    public func badgeBackground(for cari: VegaCari) -> Color {
        if cari.balance > 0 {
            return Color.ktCoralLight
        } else if cari.balance < 0 {
            return Color(hex: 0xECFDF5) // Emerald Light
        } else {
            return Color(hex: 0xF1F5F9) // Slate Light
        }
    }
    
    public func badgeTitle(for cari: VegaCari) -> String {
        if cari.balance > 0 {
            return "Borçlu (Kalan)"
        } else if cari.balance < 0 {
            return "Alacaklı (Alacak)"
        } else {
            return "Sıfır Bakiye"
        }
    }
    
    // MARK: - State Toggles & Error Handling
    
    public func toggleBalanceVisibility() {
        isBalanceHidden.toggle()
        isBalanceMasked = isBalanceHidden
    }
    
    public func toggleBalanceMask() {
        withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
            toggleBalanceVisibility()
        }
    }
    
    public func setError(_ message: String) {
        self.errorMessage = message
    }
    
    public func clearError() {
        self.errorMessage = nil
    }
    
    public func triggerToast(_ message: String) {
        withAnimation {
            self.toastMessage = message
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            withAnimation {
                if self.toastMessage == message {
                    self.toastMessage = nil
                }
            }
        }
    }
}
