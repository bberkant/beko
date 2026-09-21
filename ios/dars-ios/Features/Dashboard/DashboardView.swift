//
//  DashboardView.swift
//  dars-ios
//
//  Pixel-perfect native executive Dashboard screen matching ios_prototype.html
//  and Kuveyt Türk corporate mobile banking standards.
//  Completely disconnected from legacy mock data, driven by DashboardViewModel.
//

import SwiftUI

public struct DashboardView: View {
    @Binding public var selectedTab: Int
    @StateObject public var viewModel: DashboardViewModel
    
    @State private var showingSearchModal: Bool = false
    @State private var showingNotifications: Bool = false
    @State private var showingProfileAlert: Bool = false
    
    public init(selectedTab: Binding<Int>, viewModel: DashboardViewModel = DashboardViewModel()) {
        self._selectedTab = selectedTab
        self._viewModel = StateObject(wrappedValue: viewModel)
    }
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 16) {
                // 1. Top Navigation App Header
                appHeader
                
                // 2. AI Assistant Prompt Banner
                aiAssistantBanner
                
                // 3. Error Banner (if offline/failed)
                if let errorMsg = viewModel.errorMessage {
                    errorStateBanner(errorMsg)
                }
                
                // 4. Top Hero / Balance Card
                if viewModel.isLoading && viewModel.summary == nil {
                    heroCardSkeleton
                } else {
                    heroBalanceCard
                }
                
                // 5. Quick Action Pills
                quickActionPills
                
                // 6. Live Portfolio & Operational Highlights
                operationalHighlightsSection
                
                // 7. Recent Transactions ("Son İşlemler")
                recentTransactionsSection
            }
            .padding(.bottom, 24)
        }
        .background(Color.ktPageBackground.ignoresSafeArea())
        .refreshable {
            await viewModel.refreshDashboardData()
        }
        .task {
            if viewModel.summary == nil {
                await viewModel.loadDashboardData()
            }
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showingSearchModal) {
            searchModalView
        }
        .sheet(isPresented: $showingNotifications) {
            notificationsModalView
        }
        .alert("Kullanıcı Profili", isPresented: $showingProfileAlert) {
            Button("Tamam", role: .cancel) {}
        } message: {
            Text("Aktif Yönetici: Selim Bey\nAMASYA ET VE ET ÜRÜNLERİ A.Ş.")
        }
    }
    
    // MARK: - 1. Top Navigation App Header
    
    private var appHeader: some View {
        HStack(spacing: 12) {
            // Corporate Logo / Avatar
            Circle()
                .fill(Color.ktPrimarySoft)
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: "building.columns.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.ktPrimary)
                )
            
            // Company Title, Subtitle, and Live Pulse Badge
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text("AMASYA ET VE ET ÜRÜNLERİ")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                        .lineLimit(1)
                    
                    // Live DB Status Badge
                    if viewModel.isLiveSyncActive {
                        KTPill("CANLI DB", variant: .success, size: .small, hasPulseDot: true)
                    } else {
                        KTPill("Çevrimdışı", variant: .neutral, size: .small, hasPulseDot: false)
                    }
                }
                
                Text("Gıda Tarım Hayvancılık A.Ş.")
                    .font(.system(size: 10.5, weight: .medium))
                    .foregroundColor(.ktTextSecondary)
                    .lineLimit(1)
            }
            
            Spacer()
            
            // Right Action Buttons (Search, Profile, Bell)
            HStack(spacing: 8) {
                // Spotlight Search Trigger
                Button(action: { showingSearchModal = true }) {
                    Circle()
                        .fill(Color.ktPrimarySoft)
                        .frame(width: 36, height: 36)
                        .overlay(
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(.ktPrimary)
                        )
                }
                
                // Profile Avatar Button
                Button(action: { showingProfileAlert = true }) {
                    Circle()
                        .fill(Color.ktPrimarySoft)
                        .frame(width: 36, height: 36)
                        .overlay(
                            Image(systemName: "person.crop.circle.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.ktPrimary)
                        )
                }
                
                // Notification Bell with Unread Indicator
                Button(action: { showingNotifications = true }) {
                    ZStack(alignment: .topTrailing) {
                        Circle()
                            .fill(Color.ktPrimarySoft)
                            .frame(width: 36, height: 36)
                            .overlay(
                                Image(systemName: "bell.fill")
                                    .font(.system(size: 15))
                                    .foregroundColor(.ktPrimary)
                            )
                        
                        Circle()
                            .fill(Color.ktCoral)
                            .frame(width: 9, height: 9)
                            .overlay(Circle().stroke(Color.white, lineWidth: 1.5))
                            .offset(x: -2, y: 2)
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
    }
    
    // MARK: - 2. AI Assistant Prompt Banner
    
    private var aiAssistantBanner: some View {
        HStack {
            HStack(spacing: 8) {
                Text("👋")
                    .font(.system(size: 14))
                Text("Size yardımcı olabilmek için buradayım.")
                    .font(.system(size: 11.5, weight: .bold))
                    .foregroundColor(.white)
            }
            
            Spacer()
            
            Button(action: {}) {
                Text("Soru Sor")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.22))
                    .cornerRadius(6)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(KTTheme.Gradients.bannerAi)
        .cornerRadius(12)
        .padding(.horizontal, 20)
    }
    
    // MARK: - 3. Error Banner
    
    private func errorStateBanner(_ errorMsg: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.ktCoral)
                .font(.system(size: 18))
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Veritabanı Uyarısı")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.ktCoral)
                Text(errorMsg)
                    .font(.system(size: 11))
                    .foregroundColor(.ktTextSecondary)
                    .lineLimit(2)
            }
            
            Spacer()
            
            Button(action: {
                Task {
                    await viewModel.retry()
                }
            }) {
                Text("Tekrar Dene")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.ktPrimary)
                    .cornerRadius(8)
            }
        }
        .padding(12)
        .background(Color.ktCoralLight)
        .cornerRadius(12)
        .padding(.horizontal, 20)
    }
    
    // MARK: - 4. Top Hero / Balance Card
    
    private var heroBalanceCard: some View {
        VStack(spacing: 0) {
            // Sub-tabs ("Hesabım" / "Kartım")
            HStack(spacing: 20) {
                ForEach(DashboardSubTab.allCases) { tab in
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.selectedSubTab = tab
                        }
                    }) {
                        VStack(spacing: 6) {
                            Text(tab.title)
                                .font(.system(size: 14, weight: viewModel.selectedSubTab == tab ? .bold : .medium))
                                .foregroundColor(viewModel.selectedSubTab == tab ? .ktPrimary : .ktTextSecondary)
                            
                            Rectangle()
                                .fill(viewModel.selectedSubTab == tab ? Color.ktPrimary : Color.clear)
                                .frame(height: 2.5)
                                .cornerRadius(1.5)
                        }
                    }
                }
                
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            
            Divider()
                .padding(.horizontal, 20)
                .padding(.top, 2)
            
            // Primary Account / Card Header Info
            HStack(alignment: .top) {
                Image(systemName: viewModel.selectedSubTab == .accounts ? "wallet.pass.fill" : "creditcard.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 32, height: 32)
                    .foregroundColor(viewModel.selectedSubTab == .accounts ? .ktOrange : .ktPrimary)
                    .padding(8)
                    .background(viewModel.selectedSubTab == .accounts ? Color.ktOrangeLight : Color.ktPrimarySoft)
                    .cornerRadius(10)
                
                VStack(alignment: .leading, spacing: 3) {
                    Text(viewModel.selectedSubTab == .accounts ? (viewModel.primaryBankAccount?.bankName ?? "ONE DARS KASA") : (viewModel.primaryCreditCard?.cardName ?? "SAĞLAM BUSINESS FİNANSMAN"))
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                    
                    Text(viewModel.selectedSubTab == .accounts ? (viewModel.primaryBankAccount?.accountNo.isEmpty == false ? viewModel.primaryBankAccount!.accountNo : "98645477 - 1") : (viewModel.primaryCreditCard?.cardNumberMasked ?? "•••• •••• •••• 3678"))
                        .font(.system(size: 11, weight: .regular))
                        .foregroundColor(.ktTextSecondary)
                }
                
                Spacer()
                
                // Privacy Eye Toggle Button
                Button(action: {
                    viewModel.toggleBalanceVisibility()
                }) {
                    Image(systemName: viewModel.isBalanceHidden ? "eye.slash.fill" : "eye.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.ktPrimary)
                        .frame(width: 32, height: 32)
                        .background(Color.ktPrimarySoft)
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 14)
            
            // Big Display Balance
            HStack(alignment: .firstTextBaseline) {
                Text(viewModel.selectedSubTab == .accounts ? "Toplam Varlık" : "Toplam Borç")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.ktTextSecondary)
                
                Spacer()
                
                Text(viewModel.selectedSubTab == .accounts ? viewModel.formattedPrimaryAccountBalance : viewModel.formattedPrimaryCardDebt)
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(viewModel.selectedSubTab == .accounts ? .ktTextHeading : .ktCoral)
                    .ktMonospacedDigits()
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            
            // Optional Card Debt / Limit Detail
            if viewModel.selectedSubTab == .cards {
                HStack {
                    Text("Kullanılabilir Limit: ")
                        .foregroundColor(.ktTextSecondary) +
                    Text(viewModel.formattedPrimaryCardAvailableLimit)
                        .fontWeight(.bold)
                        .foregroundColor(.ktTextHeading)
                    Spacer()
                    Text(viewModel.primaryCardDueDateString)
                        .foregroundColor(.ktCoral)
                        .fontWeight(.semibold)
                }
                .font(.system(size: 11))
                .padding(.horizontal, 20)
                .padding(.top, 8)
            }
            
            // 4 Sub-Metrics Grid (Kasa, Banka, Alacak, Borç)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                // Metric 1: Kasa
                subMetricChip(
                    title: "Kasa",
                    amount: viewModel.formattedPrimaryAccountBalance,
                    icon: "banknote.fill",
                    tint: .ktOrange,
                    bgTint: .ktOrangeLight
                )
                
                // Metric 2: Banka
                subMetricChip(
                    title: "Banka",
                    amount: viewModel.maskAmount(viewModel.totalBankBalance),
                    icon: "building.columns.fill",
                    tint: .ktPrimary,
                    bgTint: .ktPrimarySoft
                )
                
                // Metric 3: Alacak
                subMetricChip(
                    title: "Alacak",
                    amount: viewModel.formattedTotalReceivable,
                    icon: "arrow.down.left",
                    tint: .ktSuccess,
                    bgTint: .ktSuccessLight
                )
                
                // Metric 4: Borç
                subMetricChip(
                    title: "Borç",
                    amount: viewModel.formattedTotalPayable,
                    icon: "arrow.up.right",
                    tint: .ktCoral,
                    bgTint: .ktCoralLight
                )
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            
            // Card Footer Link
            Divider()
                .padding(.top, 14)
            
            Button(action: { selectedTab = 1 }) {
                HStack {
                    Spacer()
                    Text("Tüm Hesaplarım ve Detaylar")
                        .font(.system(size: 12.5, weight: .semibold))
                        .foregroundColor(.ktPrimary)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.ktPrimary)
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 20)
            }
        }
        .background(Color.ktCardSurface)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.ktCardBorder, lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }
    
    private func subMetricChip(title: String, amount: String, icon: String, tint: Color, bgTint: Color) -> some View {
        HStack(spacing: 8) {
            Circle()
                .fill(bgTint)
                .frame(width: 28, height: 28)
                .overlay(
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(tint)
                )
            
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.ktTextSecondary)
                Text(amount)
                    .font(.system(size: 11.5, weight: .bold))
                    .foregroundColor(.ktTextHeading)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .ktMonospacedDigits()
            }
            
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Color.ktPageBackground)
        .cornerRadius(10)
    }
    
    // MARK: - Loading Skeleton
    
    private var heroCardSkeleton: some View {
        VStack(spacing: 12) {
            HStack {
                Circle()
                    .fill(Color.ktCardBorder)
                    .frame(width: 36, height: 36)
                VStack(alignment: .leading, spacing: 4) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.ktCardBorder)
                        .frame(width: 140, height: 14)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.ktCardBorder)
                        .frame(width: 90, height: 10)
                }
                Spacer()
            }
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.ktCardBorder)
                .frame(height: 36)
        }
        .padding(20)
        .background(Color.ktCardSurface)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.ktCardBorder, lineWidth: 1)
        )
        .padding(.horizontal, 20)
    }
    
    // MARK: - 5. Quick Action Pills
    
    private var quickActionPills: some View {
        VStack(spacing: 10) {
            HStack {
                Text("Hızlı İşlemler")
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundColor(.ktTextHeading)
                Spacer()
                Button(action: { selectedTab = 4 }) {
                    Text("Tüm Menü")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.ktPrimary)
                }
            }
            .padding(.horizontal, 20)
            
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                // Quick Action 1: Çek Ekle
                quickActionButton(action: .cekEkle, subtitle: "Yeni Kayıt")
                
                // Quick Action 2: Takas Çekleri
                quickActionButton(action: .takas, subtitle: "Portföy Durumu")
                
                // Quick Action 3: Cariler
                quickActionButton(action: .cariler, subtitle: "Bakiye Arama")
                
                // Quick Action 4: ÇEKTEN Hesabı
                quickActionButton(action: .cekten, subtitle: "Açık Mal Ödemeleri")
            }
            .padding(.horizontal, 20)
        }
    }
    
    private func quickActionButton(action: DashboardQuickAction, subtitle: String) -> some View {
        Button(action: {
            selectedTab = viewModel.handleQuickAction(action)
        }) {
            HStack(spacing: 10) {
                Circle()
                    .fill(Color.ktPrimarySoft)
                    .frame(width: 32, height: 32)
                    .overlay(
                        Image(systemName: action.iconName)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.ktPrimary)
                    )
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(action.rawValue)
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                        .lineLimit(1)
                    Text(subtitle)
                        .font(.system(size: 10, weight: .regular))
                        .foregroundColor(.ktTextSecondary)
                        .lineLimit(1)
                }
                
                Spacer(minLength: 0)
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
    }
    
    // MARK: - 6. Operational Highlights Section
    
    private var operationalHighlightsSection: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Operasyonel Özetler")
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundColor(.ktTextHeading)
                Spacer()
            }
            .padding(.horizontal, 20)
            
            VStack(spacing: 10) {
                // Highlight 1: Banka Hesapları
                operationalCard(
                    title: "Banka Hesapları",
                    badge: "\(viewModel.bankAccounts.count) Hesap",
                    primaryText: viewModel.maskAmount(viewModel.totalBankBalance),
                    secondaryText: "Toplam Kurumsal Likidite",
                    icon: "building.columns.fill",
                    accentColor: .ktPrimary,
                    onTap: { selectedTab = 1 }
                )
                
                // Highlight 2: Takas & Portföy Çekleri
                operationalCard(
                    title: "Takas & Portföy Çekleri",
                    badge: "\(viewModel.recentChecks.count) Aktif Çek",
                    primaryText: viewModel.formattedDailyCheckTotal,
                    secondaryText: "Bugünkü Takas Hacmi",
                    icon: "arrow.triangle.2.circlepath",
                    accentColor: .ktOrange,
                    onTap: { selectedTab = 2 }
                )
                
                // Highlight 3: Kesim Listesi & Üretim
                operationalCard(
                    title: "Kesim Listesi & Üretim",
                    badge: "\(viewModel.monthlyKesimCount) Kesim",
                    primaryText: "\(viewModel.monthlyKesimCount) Adet",
                    secondaryText: "Aylık Canlı Hayvan Kesim Kaydı",
                    icon: "scalemass.fill",
                    accentColor: .ktSuccess,
                    onTap: { selectedTab = 4 }
                )
            }
            .padding(.horizontal, 20)
        }
    }
    
    private func operationalCard(
        title: String,
        badge: String,
        primaryText: String,
        secondaryText: String,
        icon: String,
        accentColor: Color,
        onTap: @escaping () -> Void
    ) -> some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                Circle()
                    .fill(accentColor.opacity(0.12))
                    .frame(width: 38, height: 38)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(accentColor)
                    )
                
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(title)
                            .font(.system(size: 12.5, weight: .bold))
                            .foregroundColor(.ktTextHeading)
                        Text(badge)
                            .font(.system(size: 9.5, weight: .semibold))
                            .foregroundColor(accentColor)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(accentColor.opacity(0.1))
                            .cornerRadius(4)
                    }
                    
                    Text(secondaryText)
                        .font(.system(size: 10.5, weight: .regular))
                        .foregroundColor(.ktTextSecondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(primaryText)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                        .ktMonospacedDigits()
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.ktTextSecondary)
                }
            }
            .padding(14)
            .background(Color.ktCardSurface)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.ktCardBorder, lineWidth: 1)
            )
        }
    }
    
    // MARK: - 7. Recent Transactions ("Son İşlemler")
    
    private var recentTransactionsSection: some View {
        VStack(spacing: 10) {
            HStack {
                HStack(spacing: 6) {
                    Text("Son İşlemler")
                        .font(.system(size: 13.5, weight: .bold))
                        .foregroundColor(.ktTextHeading)
                    
                    Text("Son 10 İşlem")
                        .font(.system(size: 9.5, weight: .bold))
                        .foregroundColor(.ktTextSecondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.ktSlate100)
                        .cornerRadius(6)
                }
                
                Spacer()
                
                Button(action: { selectedTab = 1 }) {
                    Text("Tümünü Gör >")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.ktPrimary)
                }
            }
            .padding(.horizontal, 20)
            
            if viewModel.recentChecks.isEmpty && !viewModel.isLoading {
                VStack(spacing: 8) {
                    Image(systemName: "tray.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.ktTextSecondary.opacity(0.5))
                    Text("Kayıtlı işlem bulunamadı")
                        .font(.system(size: 12))
                        .foregroundColor(.ktTextSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
                .background(Color.ktCardSurface)
                .cornerRadius(14)
                .padding(.horizontal, 20)
            } else {
                VStack(spacing: 8) {
                    ForEach(viewModel.recentChecks.prefix(10)) { check in
                        transactionRow(check: check)
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
    
    private func transactionRow(check: EBSCheck) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(check.checkType == "alinan" ? Color.ktSuccessLight : Color.ktCoralLight)
                .frame(width: 36, height: 36)
                .overlay(
                    Image(systemName: check.checkType == "alinan" ? "arrow.down.left" : "arrow.up.right")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(check.checkType == "alinan" ? .ktSuccess : .ktCoral)
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(check.drawer.isEmpty ? (check.kesideci ?? "Çek İşlemi") : check.drawer)
                    .font(.system(size: 12.5, weight: .bold))
                    .foregroundColor(.ktTextHeading)
                    .lineLimit(1)
                
                HStack(spacing: 4) {
                    Text(viewModel.formatDate(check.dueDate))
                        .font(.system(size: 10.5, weight: .regular))
                        .foregroundColor(.ktTextSecondary)
                    Text("•")
                        .foregroundColor(.ktTextSecondary)
                    Text(check.bankName.isEmpty ? check.checkNumber : check.bankName)
                        .font(.system(size: 10.5, weight: .regular))
                        .foregroundColor(.ktTextSecondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text(viewModel.formatTransactionAmount(check))
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(check.checkType == "alinan" ? .ktSuccess : .ktCoral)
                    .ktMonospacedDigits()
                
                Text(check.status)
                    .font(.system(size: 9.5, weight: .medium))
                    .foregroundColor(.ktTextSecondary)
            }
        }
        .padding(12)
        .background(Color.ktCardSurface)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.ktCardBorder, lineWidth: 1)
        )
    }
    
    // MARK: - Modals
    
    private var searchModalView: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("Hızlı Arama")
                    .font(.ktTitle)
                    .foregroundColor(.ktTextHeading)
                    .padding(.top, 24)
                
                Text("Çek, senet, cari veya işlem aramak için Menü sekmesini de kullanabilirsiniz.")
                    .font(.ktBody)
                    .foregroundColor(.ktTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.ktPageBackground)
            .navigationTitle("Arama")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Kapat") {
                        showingSearchModal = false
                    }
                }
            }
        }
    }
    
    private var notificationsModalView: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("Bildirimler")
                    .font(.ktTitle)
                    .foregroundColor(.ktTextHeading)
                    .padding(.top, 24)
                
                Text("Sistem bildirimleri ve yaklaşan çek vadeleri burada listelenir.")
                    .font(.ktBody)
                    .foregroundColor(.ktTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.ktPageBackground)
            .navigationTitle("Bildirimler")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Kapat") {
                        showingNotifications = false
                    }
                }
            }
        }
    }
}

#if DEBUG
struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView(selectedTab: .constant(0))
    }
}
#endif
