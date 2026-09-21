//
//  TakasView.swift
//  dars-ios
//
//  Pixel-perfect native SwiftUI screen matching Kuveyt Türk corporate mobile banking
//  and `ios_prototype.html` for Takas Çekleri Portföyü & Bank Clearing Quotas.
//

import SwiftUI

public struct TakasView: View {
    @StateObject private var viewModel: TakasViewModel
    
    public init(viewModel: TakasViewModel = TakasViewModel()) {
        self._viewModel = StateObject(wrappedValue: viewModel)
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 1. Screen Header
                headerView
                
                // 2. Portföy Summary KPI Bar
                summaryKpiBar
                
                // 3. Bank Quota Distribution Bar
                bankQuotasBar
                
                // 4. Segmented Status Selector (Takasta vs İç Takas vs Ödenen)
                segmentedControlSection
                
                // 5. Search & Status Filter Pills
                searchAndFilterSection
                
                // 6. Live Cheque Cards Feed
                chequeCardsFeed
            }
            .padding(.horizontal, KTTheme.Metrics.paddingHorizontal)
            .padding(.top, 12)
            .padding(.bottom, 90)
        }
        .background(Color.ktPageBackground)
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            if viewModel.checks.isEmpty {
                await viewModel.loadInitialChecks()
            }
        }
        .sheet(item: $viewModel.selectedCheckForAction) { check in
            ChequeDetailSheet(check: check, viewModel: viewModel)
        }
        .sheet(isPresented: $viewModel.isShowingValuationSheet) {
            ChequeValuationSheet(viewModel: viewModel)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("TAKAS ÇEKLERİ")
                    .font(.ktSectionHeader)
                    .foregroundColor(.ktTextHeading)
            }
        }
    }
    
    // MARK: - 1. Screen Header
    
    private var headerView: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.ktPrimary)
                    Text("Kuveyt Türk Takas Entegrasyonu")
                        .font(.ktMicro)
                        .foregroundColor(.ktPrimary)
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color.ktPrimarySoft)
                .clipShape(Capsule())
                
                Text("Takasa Verilen Çekler ve Portföy Takibi")
                    .font(.ktCaption)
                    .foregroundColor(.ktTextSecondary)
            }
            
            Spacer()
            
            Button(action: { viewModel.isShowingValuationSheet = true }) {
                HStack(spacing: 4) {
                    Image(systemName: "percent")
                        .font(.system(size: 11, weight: .bold))
                    Text("Kırdırma")
                        .font(.ktBadge)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Color.ktPrimarySoft)
                .foregroundColor(.ktPrimary)
                .clipShape(Capsule())
            }
        }
    }
    
    // MARK: - 2. Summary KPI Bar
    
    private var summaryKpiBar: some View {
        KTCard(padding: 14) {
            VStack(spacing: 12) {
                // Top row: Main Takas Sum & Total Count
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("TAKAS TOPLAMI")
                            .font(.ktMicro)
                            .foregroundColor(.ktTextSecondary)
                            .fontWeight(.bold)
                        Text(viewModel.formattedTotalAmount)
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundColor(.ktPrimary)
                            .ktMonospacedDigits()
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 3) {
                        Text("PORTFÖY ADEDİ")
                            .font(.ktMicro)
                            .foregroundColor(.ktTextSecondary)
                            .fontWeight(.bold)
                        Text("\(viewModel.totalCheckCount) Adet")
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                            .foregroundColor(.ktTextHeading)
                    }
                }
                
                Divider()
                    .background(Color.ktCardBorder)
                
                // Bottom row: 3 sub-metrics
                HStack(spacing: 8) {
                    subMetricItem(title: "TAHSİLDE", value: viewModel.formattedTahsildeAmount, color: .ktPrimary)
                    Divider().frame(height: 24).background(Color.ktCardBorder)
                    subMetricItem(title: "TEMİNATTA", value: viewModel.formattedTeminattaAmount, color: .ktOrange)
                    Divider().frame(height: 24).background(Color.ktCardBorder)
                    subMetricItem(title: "ORT. VADE", value: viewModel.formattedAverageTenor, color: .ktTextHeading)
                }
            }
        }
    }
    
    private func subMetricItem(title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.ktMicro)
                .foregroundColor(.ktTextTertiary)
                .fontWeight(.bold)
            Text(value)
                .font(.ktCaption)
                .fontWeight(.semibold)
                .foregroundColor(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .ktMonospacedDigits()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    // MARK: - 3. Bank Quotas Distribution Bar
    
    private var bankQuotasBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(viewModel.bankBreakdown.prefix(6)) { metric in
                    HStack(spacing: 6) {
                        Text(metric.bankName)
                            .font(.ktMicro)
                            .fontWeight(.bold)
                            .foregroundColor(.ktPrimary)
                        
                        Text(Theme.Formatter.currency(metric.totalAmount))
                            .font(.ktMicro)
                            .fontWeight(.semibold)
                            .foregroundColor(.ktTextHeading)
                            .ktMonospacedDigits()
                        
                        Text("%\(String(format: "%.0f", metric.concentrationPercentage))")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.ktTextTertiary)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.white)
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.ktCardBorder, lineWidth: 1)
                    )
                }
            }
            .padding(.vertical, 2)
        }
    }
    
    // MARK: - 4. Segmented Status Selector
    
    private var segmentedControlSection: some View {
        HStack(spacing: 0) {
            ForEach(TakasSegment.allCases) { segment in
                let isSelected = viewModel.selectedSegment == segment
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        viewModel.selectedSegment = segment
                    }
                }) {
                    Text(segment.title)
                        .font(.ktBodyMedium)
                        .foregroundColor(isSelected ? .white : .ktTextSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(isSelected ? Color.ktPrimary : Color.clear)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(3)
        .background(Color.ktSlate100)
        .clipShape(Capsule())
    }
    
    // MARK: - 5. Search & Status Filter Pills
    
    private var searchAndFilterSection: some View {
        VStack(spacing: 8) {
            // Search field
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.ktTextTertiary)
                    .font(.system(size: 14))
                
                TextField("Keşideci, banka, çek no ara...", text: $viewModel.searchText)
                    .font(.ktBody)
                    .foregroundColor(.ktTextHeading)
                
                if !viewModel.searchText.isEmpty {
                    Button(action: { viewModel.searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.ktTextTertiary)
                            .font(.system(size: 14))
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.white)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color.ktCardBorder, lineWidth: 1)
            )
            
            // Filter pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(TakasStatusFilter.allCases) { filter in
                        let isSelected = viewModel.selectedStatus == filter
                        KTPill(
                            filter.rawValue,
                            variant: .filter(isActive: isSelected),
                            size: .medium
                        ) {
                            Task {
                                await viewModel.setStatusFilter(filter)
                            }
                        }
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }
    
    // MARK: - 6. Live Cheque Cards Feed
    
    private var chequeCardsFeed: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Evrak Listesi")
                    .font(.ktSectionHeader)
                    .foregroundColor(.ktTextHeading)
                Spacer()
                Text("\(viewModel.filteredChecks.count) Evrak")
                    .font(.ktMicro)
                    .foregroundColor(.ktTextSecondary)
            }
            .padding(.horizontal, 2)
            
            if viewModel.isLoading && viewModel.checks.isEmpty {
                // Skeleton loading state
                VStack(spacing: 10) {
                    ForEach(0..<4, id: \.self) { _ in
                        KTCard(padding: 14) {
                            HStack {
                                VStack(alignment: .leading, spacing: 8) {
                                    RoundedRectangle(cornerRadius: 4).fill(Color.ktSlate100).frame(width: 80, height: 12)
                                    RoundedRectangle(cornerRadius: 4).fill(Color.ktSlate100).frame(width: 160, height: 16)
                                    RoundedRectangle(cornerRadius: 4).fill(Color.ktSlate100).frame(width: 120, height: 10)
                                }
                                Spacer()
                                RoundedRectangle(cornerRadius: 4).fill(Color.ktSlate100).frame(width: 100, height: 24)
                            }
                        }
                    }
                }
            } else if viewModel.filteredChecks.isEmpty {
                // Empty state
                KTCard(padding: 24) {
                    VStack(spacing: 12) {
                        Image(systemName: viewModel.selectedSegment == .icTakas ? "checkmark.seal.fill" : "doc.text.magnifyingglass")
                            .font(.system(size: 36))
                            .foregroundColor(viewModel.selectedSegment == .icTakas ? .ktSuccess : .ktTextTertiary)
                        
                        Text(viewModel.selectedSegment == .icTakas ? "Bugün İç Takas Evrakı Yok" : "Çek Bulunamadı")
                            .font(.ktCardTitle)
                            .foregroundColor(.ktTextHeading)
                        
                        Text(viewModel.selectedSegment == .icTakas ? "İç takasa kilitlenmiş evrak bulunmamaktadır." : "Seçili filtre veya arama kriterine uygun çek bulunamadı.")
                            .font(.ktBody)
                            .foregroundColor(.ktTextSecondary)
                            .multilineTextAlignment(.center)
                        
                        if viewModel.selectedSegment == .icTakas {
                            Button(action: { viewModel.selectedSegment = .takasta }) {
                                Text("Takastaki Çeklere Dön")
                                    .font(.ktBadge)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(Color.ktPrimary)
                                    .clipShape(Capsule())
                            }
                        } else {
                            Button(action: {
                                viewModel.searchText = ""
                                Task { await viewModel.setStatusFilter(.all) }
                            }) {
                                Text("Filtreleri Sıfırla")
                                    .font(.ktBadge)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(Color.ktPrimary)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            } else {
                ForEach(viewModel.filteredChecks) { check in
                    chequeCard(check)
                        .onAppear {
                            Task {
                                await viewModel.loadMoreIfNeeded(currentCheck: check)
                            }
                        }
                }
                
                if viewModel.isLoadingMore {
                    HStack {
                        Spacer()
                        ProgressView()
                            .padding()
                        Spacer()
                    }
                }
            }
        }
    }
    
    private func chequeCard(_ check: EBSCheck) -> some View {
        let isPaid = check.status.localizedCaseInsensitiveContains("öden") || check.status.localizedCaseInsensitiveContains("oden")
        let badge = viewModel.daysRemainingBadge(for: check.dueDate)
        
        let accentColor: Color = {
            if check.isIcTakas { return .ktDanger }
            if isPaid { return .ktSuccess }
            if badge.isOverdue { return .ktCoral }
            return .ktPrimary
        }()
        
        return KTCard(
            padding: 14,
            leftAccentColor: accentColor,
            leftAccentWidth: 4
        ) {
            VStack(alignment: .leading, spacing: 10) {
                // Top row
                HStack(alignment: .center) {
                    // Check Type Pill
                    Text(check.checkType.uppercased())
                        .font(.ktMicro)
                        .fontWeight(.bold)
                        .foregroundColor(.ktPrimary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.ktPrimaryLight)
                        .cornerRadius(4)
                    
                    // Days left badge
                    HStack(spacing: 3) {
                        if badge.isOverdue {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 9))
                        }
                        Text(badge.text)
                            .font(.ktMicro)
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(badge.isOverdue ? .ktCoralDark : .ktTextSecondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(badge.isOverdue ? Color.ktCoralLight : Color.ktSlate100)
                    .cornerRadius(4)
                    
                    if !check.checkNumber.isEmpty {
                        Text("(\(check.checkNumber))")
                            .font(.ktMicro)
                            .foregroundColor(.ktTextTertiary)
                    }
                    
                    Spacer()
                    
                    // Status Pill
                    Text(check.status)
                        .font(.ktMicro)
                        .fontWeight(.semibold)
                        .foregroundColor(isPaid ? .ktSuccessDark : (check.isIcTakas ? .ktDanger : .ktPrimary))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isPaid ? Color.ktSuccessLight : (check.isIcTakas ? Color.ktCoralLight : Color.ktPrimarySoft))
                        .cornerRadius(4)
                }
                
                // Drawer / Counterparty & Amount
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(check.drawer.isEmpty ? (check.debtor ?? "Bilinmeyen Keşideci") : check.drawer)
                            .font(.ktCardTitle)
                            .foregroundColor(.ktTextHeading)
                            .lineLimit(1)
                        
                        HStack(spacing: 4) {
                            Text("Banka: \(check.bankName)")
                                .font(.ktCaption)
                                .foregroundColor(.ktTextSecondary)
                            if !check.branchName.isEmpty {
                                Text("• \(check.branchName)")
                                    .font(.ktCaption)
                                    .foregroundColor(.ktTextTertiary)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(Theme.Formatter.currency(check.amount))
                            .font(.ktFinancialAmount)
                            .foregroundColor(.ktTextHeading)
                            .ktMonospacedDigits()
                        
                        Text("Vade: \(viewModel.formatDate(check.dueDate))")
                            .font(.ktMicro)
                            .foregroundColor(.ktTextSecondary)
                    }
                }
                
                Divider()
                    .background(Color.ktSlate100)
                
                // Action row
                HStack {
                    if check.isIcTakas {
                        HStack(spacing: 4) {
                            Circle().fill(Color.ktDanger).frame(width: 6, height: 6)
                            Text("İç Takasta Kilitli")
                                .font(.ktMicro)
                                .foregroundColor(.ktDanger)
                                .fontWeight(.semibold)
                        }
                    } else {
                        Text("Normal Takas Sürecinde")
                            .font(.ktMicro)
                            .foregroundColor(.ktTextTertiary)
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        viewModel.selectedCheckForAction = check
                    }) {
                        HStack(spacing: 4) {
                            Text("İşlem")
                                .font(.ktBadge)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 9, weight: .bold))
                        }
                        .foregroundColor(.ktPrimary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.ktPrimarySoft)
                        .cornerRadius(6)
                    }
                }
            }
        }
    }
}

// MARK: - Cheque Detail & Action Sheet

struct ChequeDetailSheet: View {
    let check: EBSCheck
    @ObservedObject var viewModel: TakasViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var showingMoveBankModal: Bool = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Header card
                    KTCard(padding: 16) {
                        VStack(spacing: 8) {
                            Text(check.drawer)
                                .font(.ktSectionHeader)
                                .foregroundColor(.ktTextHeading)
                                .multilineTextAlignment(.center)
                            
                            Text(Theme.Formatter.currency(check.amount))
                                .font(.system(size: 24, weight: .bold, design: .rounded))
                                .foregroundColor(.ktPrimary)
                                .ktMonospacedDigits()
                            
                            HStack(spacing: 8) {
                                Text(check.bankName)
                                    .font(.ktBodyMedium)
                                    .foregroundColor(.ktTextSecondary)
                                Text("•")
                                    .foregroundColor(.ktTextTertiary)
                                Text("Vade: \(viewModel.formatDate(check.dueDate))")
                                    .font(.ktBodyMedium)
                                    .foregroundColor(.ktTextSecondary)
                            }
                        }
                        .frame(maxWidth: .infinity)
                    }
                    
                    // Metadata Matrix
                    KTCard(padding: 14) {
                        VStack(spacing: 10) {
                            matrixRow(label: "Keşideci / Borçlu", value: check.drawer)
                            Divider()
                            matrixRow(label: "Banka & Şube", value: "\(check.bankName) \(check.branchName)")
                            Divider()
                            matrixRow(label: "Seri Numarası", value: check.checkNumber)
                            Divider()
                            matrixRow(label: "Belge Tipi", value: check.documentType.uppercased())
                            Divider()
                            matrixRow(label: "Vade Tarihi", value: viewModel.formatDate(check.dueDate))
                            Divider()
                            matrixRow(label: "Kalan Süre", value: viewModel.daysRemainingBadge(for: check.dueDate).text)
                            Divider()
                            matrixRow(label: "Durum", value: check.status)
                            Divider()
                            matrixRow(label: "İç Takas Durumu", value: check.isIcTakas ? "Kilitli (İç Takas)" : "Normal Takas")
                        }
                    }
                    
                    // Workflow Action Buttons
                    VStack(spacing: 10) {
                        // Toggle İç Takas
                        Button(action: {
                            viewModel.toggleIcTakas(for: check.id)
                            dismiss()
                        }) {
                            HStack {
                                Image(systemName: check.isIcTakas ? "arrow.uturn.backward" : "lock.fill")
                                Text(check.isIcTakas ? "Normal Takasa Geri Al" : "İç Takasa Al (Kırmızı Sabitle)")
                                Spacer()
                            }
                            .font(.ktBodyMedium)
                            .foregroundColor(check.isIcTakas ? .ktSuccess : .ktDanger)
                            .padding(14)
                            .background(check.isIcTakas ? Color.ktSuccessLight : Color.ktCoralLight)
                            .cornerRadius(12)
                        }
                        
                        // Move Bank
                        Button(action: {
                            showingMoveBankModal = true
                        }) {
                            HStack {
                                Image(systemName: "arrow.left.arrow.right")
                                Text("Başka Bankaya Taşı")
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 11))
                            }
                            .font(.ktBodyMedium)
                            .foregroundColor(.ktPrimary)
                            .padding(14)
                            .background(Color.ktPrimarySoft)
                            .cornerRadius(12)
                        }
                        
                        // Mark as collected
                        Button(action: {
                            viewModel.markCheckAsCollected(checkId: check.id)
                            dismiss()
                        }) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Tahsil Edildi Olarak İşaretle")
                                Spacer()
                            }
                            .font(.ktBodyMedium)
                            .foregroundColor(.ktSuccessDark)
                            .padding(14)
                            .background(Color.ktSuccessLight)
                            .cornerRadius(12)
                        }
                    }
                }
                .padding(.horizontal, KTTheme.Metrics.paddingHorizontal)
                .padding(.vertical, 16)
            }
            .background(Color.ktPageBackground)
            .navigationTitle("Çek Detayı")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Kapat") { dismiss() }
                }
            }
            .sheet(isPresented: $showingMoveBankModal) {
                MoveBankSheet(checkId: check.id, currentBank: check.bankName, viewModel: viewModel)
            }
        }
    }
    
    private func matrixRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.ktCaption)
                .foregroundColor(.ktTextSecondary)
            Spacer()
            Text(value)
                .font(.ktBodyMedium)
                .foregroundColor(.ktTextHeading)
                .multilineTextAlignment(.trailing)
        }
    }
}

// MARK: - Move Bank Sheet

struct MoveBankSheet: View {
    let checkId: UUID
    let currentBank: String
    @ObservedObject var viewModel: TakasViewModel
    @Environment(\.dismiss) private var dismiss
    
    private let banks = [
        "E.ZİRAAT", "M.ZİRAAT",
        "E.DENİZ", "M.DENİZ",
        "ALBARAKA", "KUVEYTTÜRK",
        "HALKBANK", "TAKSİT"
    ]
    
    var body: some View {
        NavigationStack {
            List {
                Section("Hedef Takas Bankasını Seçin") {
                    ForEach(banks, id: \.self) { bank in
                        Button(action: {
                            viewModel.moveCheckToBank(checkId: checkId, destinationBank: bank)
                            dismiss()
                        }) {
                            HStack {
                                Text(bank)
                                    .font(.ktBodyMedium)
                                    .foregroundColor(.ktTextHeading)
                                Spacer()
                                if bank == currentBank {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.ktPrimary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Banka Değiştir")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Vazgeç") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Cheque Valuation & Discounting Sheet

struct ChequeValuationSheet: View {
    @ObservedObject var viewModel: TakasViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    let valuation = viewModel.calculatePortfolioValuation()
                    
                    KTCard(padding: 16) {
                        VStack(spacing: 12) {
                            Text("PORTFÖY NET İSKONTO DEĞERİ")
                                .font(.ktMicro)
                                .foregroundColor(.ktSuccessDark)
                                .fontWeight(.bold)
                            
                            Text(Theme.Formatter.currency(valuation.netPresentValue))
                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                .foregroundColor(.ktSuccess)
                                .ktMonospacedDigits()
                            
                            Divider()
                            
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text("TOPLAM NOMİNAL")
                                        .font(.ktMicro)
                                        .foregroundColor(.ktTextSecondary)
                                    Text(Theme.Formatter.currency(valuation.totalFaceValue))
                                        .font(.ktBodyMedium)
                                        .foregroundColor(.ktTextHeading)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 3) {
                                    Text("TOPLAM KESİNTİ")
                                        .font(.ktMicro)
                                        .foregroundColor(.ktCoralDark)
                                    Text("-\(Theme.Formatter.currency(valuation.totalGrossDiscount + valuation.totalCommission))")
                                        .font(.ktBodyMedium)
                                        .foregroundColor(.ktCoral)
                                }
                            }
                        }
                    }
                    
                    KTCard(padding: 14) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("İskonto Parametreleri")
                                .font(.ktCardTitle)
                                .foregroundColor(.ktTextHeading)
                            
                            HStack {
                                Text("Aylık İskonto Oranı:")
                                    .font(.ktCaption)
                                    .foregroundColor(.ktTextSecondary)
                                Spacer()
                                Text("%\(String(format: "%.2f", viewModel.valuationMonthlyRate * 100.0))")
                                    .font(.ktBodyMedium)
                                    .foregroundColor(.ktPrimary)
                            }
                            
                            HStack {
                                Text("Banka Komisyon Oranı:")
                                    .font(.ktCaption)
                                    .foregroundColor(.ktTextSecondary)
                                Spacer()
                                Text("%\(String(format: "%.2f", viewModel.valuationCommissionRate * 100.0))")
                                    .font(.ktBodyMedium)
                                    .foregroundColor(.ktPrimary)
                            }
                            
                            HStack {
                                Text("Ağırlıklı Ortalama Vade:")
                                    .font(.ktCaption)
                                    .foregroundColor(.ktTextSecondary)
                                Spacer()
                                Text("\(String(format: "%.0f", valuation.weightedAverageDays)) Gün")
                                    .font(.ktBodyMedium)
                                    .foregroundColor(.ktTextHeading)
                            }
                        }
                    }
                }
                .padding(.horizontal, KTTheme.Metrics.paddingHorizontal)
                .padding(.vertical, 16)
            }
            .background(Color.ktPageBackground)
            .navigationTitle("Portföy Kırdırma Simülatörü")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Kapat") { dismiss() }
                }
            }
        }
    }
}
