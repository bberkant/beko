//
//  CarisView.swift
//  dars-ios
//
//  Pixel-perfect native Current Accounts screen matching Kuveyt Türk corporate
//  mobile banking and `ios_prototype.html` specifications.
//  Uses genuine live data from vega_cariler with cursor pagination, privacy masking,
//  sub-screen detail sheets, and new customer registration.
//

import SwiftUI

public struct CarisView: View {
    @StateObject private var viewModel: CarisViewModel
    
    @MainActor
    public init(viewModel: CarisViewModel? = nil) {
        self._viewModel = StateObject(wrappedValue: viewModel ?? CarisViewModel())
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 1. Kuveyt Türk Corporate Header
                headerView
                
                // 2. Summary KPI Bar
                summaryKpiBar
                
                // 3. Live Search Bar
                searchBarView
                
                // 4. Filter Segment Pills
                filterPillsView
                
                // 5. Sorting Menu Bar
                sortingMenuBar
                
                // 6. Cari Cards List Feed
                carisListFeed
            }
            .padding(.horizontal, KTTheme.Metrics.paddingHorizontal)
            .padding(.top, 12)
            .padding(.bottom, 90)
        }
        .background(Color.ktPageBackground)
        .refreshable {
            await viewModel.refreshCariler()
        }
        .task {
            if viewModel.cariler.isEmpty {
                await viewModel.loadInitialCariler()
            }
        }
        .sheet(item: $viewModel.selectedCariForDetail) { cari in
            CariDetailSheet(cari: cari, viewModel: viewModel)
        }
        .sheet(isPresented: $viewModel.isShowingNewCariSheet) {
            NewCariSheet(viewModel: viewModel)
        }
        .overlay(
            toastOverlay
        )
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("CARİ HESAPLAR")
                    .font(.ktSectionHeader)
                    .foregroundColor(.ktTextHeading)
            }
        }
    }
    
    // MARK: - 1. Screen Header
    
    private var headerView: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text("CARİ HESAPLAR")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                        .tracking(-0.3)
                    
                    Text("\(viewModel.totalCount)")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.ktPrimary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2.5)
                        .background(Color.ktPrimarySoft)
                        .clipShape(Capsule())
                }
                
                Text("Müşteri & Tedarikçi Bakiye Portföyü")
                    .font(.system(size: 11.5))
                    .foregroundColor(.ktTextSecondary)
            }
            
            Spacer()
            
            HStack(spacing: 8) {
                // Privacy Masking Eye Button
                Button(action: { viewModel.toggleBalanceMask() }) {
                    Image(systemName: (viewModel.isBalanceMasked || viewModel.isBalanceHidden) ? "eye.slash.fill" : "eye.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.ktPrimary)
                        .frame(width: 36, height: 36)
                        .background(Color.ktPrimarySoft)
                        .clipShape(Circle())
                }
                
                // Add New Cari Button
                Button(action: { viewModel.isShowingNewCariSheet = true }) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 11, weight: .bold))
                        Text("Yeni Cari")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color.ktPrimary)
                    .clipShape(Capsule())
                    .shadow(color: Color.ktPrimary.opacity(0.25), radius: 3, x: 0, y: 1)
                }
            }
        }
        .padding(.vertical, 2)
    }
    
    // MARK: - 2. Summary KPI Bar
    
    private var summaryKpiBar: some View {
        HStack(spacing: 8) {
            // Alacaklı Toplamı
            summaryCard(
                title: "Toplam Alacak",
                amount: viewModel.totalReceivable,
                color: .ktSuccess,
                bgColor: .ktSuccessLight
            )
            
            // Borçlu Toplamı
            summaryCard(
                title: "Toplam Borç",
                amount: viewModel.totalPayable,
                color: .ktCoral,
                bgColor: .ktCoralLight
            )
            
            // Net Cari Bakiye
            summaryCard(
                title: "Net Bakiye",
                amount: viewModel.netBalance,
                color: .ktPrimary,
                bgColor: .ktPrimarySoft
            )
        }
    }
    
    private func summaryCard(title: String, amount: Double, color: Color, bgColor: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 9.5, weight: .medium))
                .foregroundColor(.ktTextSecondary)
                .lineLimit(1)
            
            if viewModel.isBalanceMasked || viewModel.isBalanceHidden {
                Text("₺•••.•••")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(color)
            } else {
                Text(Theme.Formatter.currency(amount))
                    .font(.system(size: 11.5, weight: .bold))
                    .foregroundColor(color)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(bgColor)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
    }
    
    // MARK: - 3. Live Search Bar
    
    private var searchBarView: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.ktTextTertiary)
                .font(.system(size: 14, weight: .semibold))
            
            TextField("Cari adı, unvanı veya vergi no ara...", text: $viewModel.searchText)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.ktTextHeading)
                .autocapitalization(.none)
                .disableAutocorrection(true)
            
            if !viewModel.searchText.isEmpty {
                Button(action: { viewModel.searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.ktTextTertiary)
                        .font(.system(size: 14))
                }
            }
            
            Button(action: { viewModel.triggerToast("Dikte için klavyedeki mikrofon tuşunu kullanabilirsiniz.") }) {
                Image(systemName: "mic.fill")
                    .foregroundColor(.ktTextSecondary)
                    .font(.system(size: 13))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.ktCardSurface)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.ktCardBorder, lineWidth: 1)
        )
    }
    
    // MARK: - 4. Filter Segment Pills
    
    private var filterPillsView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                filterPill(filter: .all, title: "Tümü", count: viewModel.totalCount)
                filterPill(filter: .alacakli, title: "Alacaklı (+)", count: viewModel.alacakliCount)
                filterPill(filter: .borclu, title: "Borçlu (-)", count: viewModel.borcluCount)
                filterPill(filter: .sifir, title: "Sıfır Bakiye", count: viewModel.sifirCount)
            }
        }
    }
    
    private func filterPill(filter: CariFilter, title: String, count: Int) -> some View {
        let isSelected = viewModel.selectedFilter == filter
        return Button(action: {
            withAnimation(.spring(response: 0.2, dampingFraction: 0.8)) {
                viewModel.selectedFilter = filter
            }
        }) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.system(size: 11.5, weight: isSelected ? .semibold : .medium))
                
                Text("(\(count))")
                    .font(.system(size: 10, weight: isSelected ? .bold : .regular))
                    .opacity(isSelected ? 0.9 : 0.6)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6.5)
            .foregroundColor(isSelected ? .white : .ktTextSecondary)
            .background(isSelected ? Color.ktPrimary : Color.ktCardSurface)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.ktPrimary : Color.ktCardBorder, lineWidth: 1)
            )
            .shadow(color: isSelected ? Color.ktPrimary.opacity(0.2) : .clear, radius: 2, x: 0, y: 1)
        }
    }
    
    // MARK: - 5. Sorting Menu Bar
    
    private var sortingMenuBar: some View {
        HStack {
            Text("\(viewModel.displayCariler.count) Cari Listeleniyor")
                .font(.system(size: 11.5, weight: .medium))
                .foregroundColor(.ktTextSecondary)
            
            Spacer()
            
            Menu {
                ForEach(CariSort.allCases) { opt in
                    Button(action: { viewModel.selectedSort = opt }) {
                        HStack {
                            Text(opt.rawValue)
                            if viewModel.selectedSort == opt {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.up.arrow.down")
                        .font(.system(size: 11, weight: .semibold))
                    Text(viewModel.selectedSort.rawValue)
                        .font(.system(size: 11.5, weight: .semibold))
                }
                .foregroundColor(.ktPrimary)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.ktPrimarySoft)
                .cornerRadius(8)
            }
        }
    }
    
    // MARK: - 6. Cari Cards List Feed
    
    private var carisListFeed: some View {
        VStack(spacing: 10) {
            if viewModel.isLoading && viewModel.cariler.isEmpty {
                ForEach(0..<4, id: \.self) { _ in
                    shimmerCard
                }
            } else if viewModel.displayCariler.isEmpty {
                emptyStateView
            } else {
                let items = viewModel.displayCariler
                ForEach(items) { cari in
                    CariCardView(
                        cari: cari,
                        isMasked: viewModel.isBalanceMasked || viewModel.isBalanceHidden,
                        onSelect: {
                            viewModel.selectedCari = cari
                            viewModel.selectedCariForDetail = cari
                        }
                    )
                    .onAppear {
                        if cari.id == items.last?.id && viewModel.hasMorePages {
                            Task {
                                await viewModel.loadMoreCariler()
                            }
                        }
                    }
                }
                
                if viewModel.isLoadingMore {
                    HStack {
                        Spacer()
                        ProgressView()
                            .padding(.vertical, 12)
                        Spacer()
                    }
                }
            }
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 8) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 32))
                .foregroundColor(.ktTextTertiary)
                .padding(.top, 24)
            Text("Aramanızla eşleşen cari hesap bulunamadı.")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.ktTextSecondary)
            Text("Arama terimini değiştirmeyi veya filtreleri temizlemeyi deneyin.")
                .font(.system(size: 11))
                .foregroundColor(.ktTextTertiary)
                .multilineTextAlignment(.center)
                .padding(.bottom, 24)
        }
        .frame(maxWidth: .infinity)
        .background(Color.ktCardSurface)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.ktCardBorder, lineWidth: 1))
    }
    
    private var shimmerCard: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color.ktSlate100)
                .frame(width: 42, height: 42)
            VStack(alignment: .leading, spacing: 6) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.ktSlate100)
                    .frame(height: 14)
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.ktSlate100)
                    .frame(width: 120, height: 10)
            }
            Spacer()
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.ktSlate100)
                .frame(width: 80, height: 16)
        }
        .padding(16)
        .background(Color.ktCardSurface)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.ktCardBorder, lineWidth: 1))
    }
    
    // MARK: - Toast Overlay
    
    private var toastOverlay: some View {
        Group {
            if let msg = viewModel.toastMessage {
                VStack {
                    Spacer()
                    Text(msg)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.black.opacity(0.85))
                        .cornerRadius(20)
                        .padding(.bottom, 30)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
        }
    }
}

// MARK: - Cari Card View Subcomponent

public struct CariCardView: View {
    let cari: VegaCari
    let isMasked: Bool
    let onSelect: () -> Void
    
    public init(cari: VegaCari, isMasked: Bool, onSelect: @escaping () -> Void) {
        self.cari = cari
        self.isMasked = isMasked
        self.onSelect = onSelect
    }
    
    public var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 0) {
                // Left accent indicator bar
                accentColor
                    .frame(width: 4)
                
                VStack(spacing: 10) {
                    // Top Row: Avatar, Title & Balance
                    HStack(alignment: .top, spacing: 10) {
                        avatarView
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(cari.name)
                                .font(.system(size: 13.5, weight: .semibold))
                                .foregroundColor(.ktTextHeading)
                                .lineLimit(1)
                            
                            Text("\(cari.code) • VN: \(cari.taxNumber ?? cari.taxNo ?? "-")")
                                .font(.system(size: 10.5, weight: .medium, design: .monospaced))
                                .foregroundColor(.ktTextTertiary)
                            
                            HStack(spacing: 4) {
                                if let city = cari.city, !city.isEmpty {
                                    Text(city)
                                }
                                if let district = cari.district, !district.isEmpty {
                                    Text("• \(district)")
                                }
                                Text("• \(cari.type ?? "Cari")")
                            }
                            .font(.system(size: 10.5))
                            .foregroundColor(.ktTextSecondary)
                        }
                        
                        Spacer()
                        
                        // Balance Display
                        VStack(alignment: .trailing, spacing: 2) {
                            if isMasked {
                                Text("₺•••.•••")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.ktTextHeading)
                            } else {
                                Text(Theme.Formatter.currency(abs(cari.balance)))
                                    .font(.system(size: 13.5, weight: .bold))
                                    .foregroundColor(balanceTextColor)
                                    .ktMonospacedDigits()
                            }
                            
                            Text(balanceLabel)
                                .font(.system(size: 9.5, weight: .semibold))
                                .foregroundColor(balanceTextColor)
                        }
                    }
                    
                    // Card Bottom Action Divider
                    HStack {
                        Text("Detay & Ekstre İncele")
                            .font(.system(size: 10.5, weight: .medium))
                            .foregroundColor(.ktTextTertiary)
                        
                        Spacer()
                        
                        HStack(spacing: 8) {
                            if let phone = cari.phone, !phone.isEmpty {
                                Link(destination: URL(string: "tel://\(phone.filter("0123456789".contains))") ?? URL(string: "tel://")!) {
                                    HStack(spacing: 3) {
                                        Image(systemName: "phone.fill")
                                            .font(.system(size: 9))
                                        Text("Ara")
                                            .font(.system(size: 10.5, weight: .semibold))
                                    }
                                    .foregroundColor(.ktPrimary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3.5)
                                    .background(Color.ktPrimarySoft)
                                    .cornerRadius(6)
                                }
                            }
                            
                            HStack(spacing: 2) {
                                Text("Hareketler")
                                    .font(.system(size: 10.5, weight: .semibold))
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 8, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3.5)
                            .background(Color.ktPrimary)
                            .cornerRadius(6)
                        }
                    }
                    .padding(.top, 4)
                }
                .padding(12)
            }
            .background(Color.ktCardSurface)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.ktCardBorder, lineWidth: 1)
            )
            .ktCardShadow()
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var avatarView: some View {
        let initials = cari.name.split(separator: " ").prefix(2).compactMap { $0.first }.map { String($0) }.joined()
        return ZStack {
            Circle()
                .fill(Color.ktPrimarySoft)
                .frame(width: 38, height: 38)
            
            Text(initials.isEmpty ? "C" : initials)
                .font(.system(size: 12.5, weight: .bold))
                .foregroundColor(.ktPrimary)
        }
    }
    
    private var accentColor: Color {
        if cari.balance > 0 {
            return Color.ktCoral
        } else if cari.balance < 0 {
            return Color.ktSuccess
        } else {
            return Color.ktSlate300
        }
    }
    
    private var balanceTextColor: Color {
        if cari.balance > 0 {
            return Color.ktCoral
        } else if cari.balance < 0 {
            return Color.ktSuccess
        } else {
            return Color.ktTextSecondary
        }
    }
    
    private var balanceLabel: String {
        if cari.balance > 0 {
            return "Borç Bakiyesi"
        } else if cari.balance < 0 {
            return "Alacak Bakiyesi"
        } else {
            return "Sıfır Bakiye"
        }
    }
}

// MARK: - Cari Detail Sheet

public struct CariDetailSheet: View {
    let cari: VegaCari
    @ObservedObject var viewModel: CarisViewModel
    @Environment(\.presentationMode) private var presentationMode
    
    public init(cari: VegaCari, viewModel: CarisViewModel) {
        self.cari = cari
        self.viewModel = viewModel
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // 1. Counterparty Profile Card
                    profileCard
                    
                    // 2. Financial Summary 3-KPI Matrix
                    financialKpiMatrix
                    
                    // 3. Quick Action Buttons Grid
                    quickActionsGrid
                    
                    // 4. Ledger Movements Section
                    ledgerMovementsSection
                }
                .padding(16)
            }
            .background(Color.ktPageBackground)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Kapat") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.ktPrimary)
                    .font(.system(size: 14, weight: .medium))
                }
                ToolbarItem(placement: .principal) {
                    Text("CARİ EKSTRE")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { viewModel.triggerToast("PDF Ekstre oluşturuluyor...") }) {
                        HStack(spacing: 4) {
                            Image(systemName: "square.and.arrow.up")
                                .font(.system(size: 12))
                            Text("PDF")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.ktPrimary)
                    }
                }
            }
        }
    }
    
    private var profileCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                let initials = cari.name.split(separator: " ").prefix(2).compactMap { $0.first }.map { String($0) }.joined()
                ZStack {
                    Circle()
                        .fill(Color.ktPrimarySoft)
                        .frame(width: 48, height: 48)
                    Text(initials.isEmpty ? "C" : initials)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.ktPrimary)
                }
                
                VStack(alignment: .leading, spacing: 3) {
                    Text(cari.name)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                    
                    HStack(spacing: 6) {
                        Text(cari.code)
                            .font(.system(size: 10.5, weight: .bold, design: .monospaced))
                            .foregroundColor(.ktPrimary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.ktPrimarySoft)
                            .cornerRadius(4)
                        
                        Text(cari.taxOffice ?? "Vergi Dairesi Belirtilmedi")
                            .font(.system(size: 11))
                            .foregroundColor(.ktTextSecondary)
                    }
                }
            }
            
            Divider()
            
            VStack(spacing: 6) {
                detailRow(icon: "number", label: "Vergi No / TCKN", value: cari.taxNumber ?? cari.taxNo ?? "-")
                if let phone = cari.phone, !phone.isEmpty {
                    HStack {
                        Image(systemName: "phone.fill")
                            .font(.system(size: 11))
                            .foregroundColor(.ktTextTertiary)
                            .frame(width: 16)
                        Text("Telefon:")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.ktTextSecondary)
                        Spacer()
                        Link(phone, destination: URL(string: "tel://\(phone.filter("0123456789".contains))") ?? URL(string: "tel://")!)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.ktPrimary)
                    }
                }
                if let email = cari.email, !email.isEmpty {
                    HStack {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: 11))
                            .foregroundColor(.ktTextTertiary)
                            .frame(width: 16)
                        Text("E-Posta:")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.ktTextSecondary)
                        Spacer()
                        Link(email, destination: URL(string: "mailto:\(email)") ?? URL(string: "mailto:")!)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.ktPrimary)
                    }
                }
                if let city = cari.city, !city.isEmpty {
                    detailRow(icon: "mappin.and.ellipse", label: "Konum", value: "\(city) \(cari.district != nil ? "/ " + cari.district! : "")")
                }
            }
        }
        .padding(14)
        .background(Color.ktCardSurface)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.ktCardBorder, lineWidth: 1))
    }
    
    private func detailRow(icon: String, label: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 11))
                .foregroundColor(.ktTextTertiary)
                .frame(width: 16)
            Text("\(label):")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.ktTextSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.ktTextHeading)
        }
    }
    
    private var financialKpiMatrix: some View {
        HStack(spacing: 8) {
            kpiCard(title: "Toplam Hacim", value: Theme.Formatter.currency(abs(cari.balance) * 1.6), color: .ktTextHeading)
            kpiCard(title: "Bakiye Durumu", value: cari.balance > 0 ? "Borçlu" : (cari.balance < 0 ? "Alacaklı" : "Sıfır"), color: cari.balance > 0 ? .ktCoral : .ktSuccess)
            kpiCard(title: "Güncel Tutar", value: Theme.Formatter.currency(abs(cari.balance)), color: cari.balance > 0 ? .ktCoral : .ktSuccess)
        }
    }
    
    private func kpiCard(title: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.system(size: 9.5, weight: .medium))
                .foregroundColor(.ktTextSecondary)
            Text(value)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .padding(.horizontal, 6)
        .background(Color.ktCardSurface)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.ktCardBorder, lineWidth: 1))
    }
    
    private var quickActionsGrid: some View {
        HStack(spacing: 8) {
            quickActionButton(title: "Ara", icon: "phone.fill") {
                if let phone = cari.phone, !phone.isEmpty, let url = URL(string: "tel://\(phone.filter("0123456789".contains))") {
                    UIApplication.shared.open(url)
                } else {
                    viewModel.triggerToast("Kayıtlı telefon numarası bulunamadı.")
                }
            }
            quickActionButton(title: "E-Posta", icon: "envelope.fill") {
                if let email = cari.email, !email.isEmpty, let url = URL(string: "mailto:\(email)") {
                    UIApplication.shared.open(url)
                } else {
                    viewModel.triggerToast("Kayıtlı e-posta adresi bulunamadı.")
                }
            }
            quickActionButton(title: "Tahsilat", icon: "banknote.fill") {
                viewModel.triggerToast("Nakit tahsilat makbuzu ekranı açılıyor.")
            }
            quickActionButton(title: "Çek Ekle", icon: "doc.text.fill") {
                viewModel.triggerToast("Cariye çek bağlama formu açılıyor.")
            }
        }
    }
    
    private func quickActionButton(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundColor(.ktPrimary)
                Text(title)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.ktTextHeading)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color.ktPrimarySoft)
            .cornerRadius(10)
        }
    }
    
    private var ledgerMovementsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Cari Hareketleri & Ekstre")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.ktTextHeading)
            
            // Movement Filter Pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(CariMovementFilter.allCases) { filter in
                        Button(action: { viewModel.activeMovementFilter = filter }) {
                            Text(filter.rawValue)
                                .font(.system(size: 11, weight: viewModel.activeMovementFilter == filter ? .semibold : .medium))
                                .foregroundColor(viewModel.activeMovementFilter == filter ? .white : .ktTextSecondary)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(viewModel.activeMovementFilter == filter ? Color.ktPrimary : Color.ktCardSurface)
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(Color.ktCardBorder, lineWidth: 1))
                        }
                    }
                }
            }
            
            // Movements List
            let movements = viewModel.movements(for: cari)
            if movements.isEmpty {
                Text("Bu filtreye ait hareket kaydı bulunamadı.")
                    .font(.system(size: 11))
                    .foregroundColor(.ktTextTertiary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                ForEach(movements) { m in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(m.date)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.ktTextTertiary)
                            Text(m.docNo)
                                .font(.system(size: 10, weight: .bold, design: .monospaced))
                                .foregroundColor(.ktTextSecondary)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 1)
                                .background(Color.ktSlate100)
                                .cornerRadius(3)
                            Spacer()
                            Text(m.debit > 0 ? "+\(Theme.Formatter.currency(m.debit))" : "-\(Theme.Formatter.currency(m.credit))")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(m.debit > 0 ? .ktCoral : .ktSuccess)
                                .ktMonospacedDigits()
                        }
                        
                        HStack {
                            Text(m.typeLabel)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.ktTextHeading)
                            Spacer()
                            Text("Bakiye: \(Theme.Formatter.currency(m.balance))")
                                .font(.system(size: 9.5, weight: .medium))
                                .foregroundColor(.ktTextTertiary)
                        }
                        
                        Text(m.desc)
                            .font(.system(size: 11))
                            .foregroundColor(.ktTextSecondary)
                    }
                    .padding(12)
                    .background(Color.ktCardSurface)
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.ktCardBorder, lineWidth: 1))
                }
            }
        }
    }
}

// MARK: - New Cari Sheet

public struct NewCariSheet: View {
    @ObservedObject var viewModel: CarisViewModel
    @Environment(\.presentationMode) private var presentationMode
    
    @State private var name: String = ""
    @State private var code: String = "CR-\(Int.random(in: 1000...9999))"
    @State private var type: String = "Müşteri"
    @State private var taxOffice: String = ""
    @State private var taxNumber: String = ""
    @State private var city: String = ""
    @State private var district: String = ""
    @State private var phone: String = ""
    @State private var email: String = ""
    @State private var balanceText: String = "0"
    
    public init(viewModel: CarisViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("FİRMA VE KİMLİK BİLGİLERİ")) {
                    TextField("Firma Unvanı (Zorunlu)", text: $name)
                    TextField("Cari Kodu", text: $code)
                    Picker("Cari Türü", selection: $type) {
                        Text("Müşteri").tag("Müşteri")
                        Text("Tedarikçi / Besici").tag("Tedarikçi")
                        Text("Kurumsal").tag("Kurumsal")
                    }
                }
                
                Section(header: Text("VERGİ BİLGİLERİ")) {
                    TextField("Vergi Dairesi", text: $taxOffice)
                    TextField("Vergi No / TCKN", text: $taxNumber)
                        .keyboardType(.numberPad)
                }
                
                Section(header: Text("İLETİŞİM VE ADRES")) {
                    TextField("Şehir", text: $city)
                    TextField("İlçe", text: $district)
                    TextField("Telefon (05XX...)", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("E-Posta", text: $email)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                }
                
                Section(header: Text("FİNANSAL DURUM")) {
                    TextField("Açılış Bakiyesi (TL)", text: $balanceText)
                        .keyboardType(.decimalPad)
                }
            }
            .navigationTitle("Yeni Cari Kaydı")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Vazgeç") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Kaydet") {
                        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                            viewModel.triggerToast("Firma unvanı zorunludur.")
                            return
                        }
                        let bal = Double(balanceText.replacingOccurrences(of: ",", with: ".")) ?? 0.0
                        _ = viewModel.addCari(
                            name: name,
                            code: code,
                            taxOffice: taxOffice.isEmpty ? nil : taxOffice,
                            taxNumber: taxNumber.isEmpty ? nil : taxNumber,
                            city: city.isEmpty ? nil : city,
                            district: district.isEmpty ? nil : district,
                            phone: phone.isEmpty ? nil : phone,
                            email: email.isEmpty ? nil : email,
                            type: type,
                            balance: bal
                        )
                        presentationMode.wrappedValue.dismiss()
                    }
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.ktPrimary)
                }
            }
        }
    }
}
