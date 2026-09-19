import SwiftUI

public struct CheckListView: View {
    @StateObject private var viewModel = ChecksViewModel()
    @State private var showingActionSheet = false
    @State private var selectedCheckForAction: EBSCheck?
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // MARK: - Header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Çek & Senet Listesi")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        Text("EBS Çek Yönetimi ve Detaylı Liste")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(AppColors.textMuted)
                    }
                    
                    Spacer()
                    
                    Button(action: {}) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                            Text("Evrak Ekle")
                        }
                        .font(.system(size: 12, weight: .bold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(AppColors.primary.opacity(0.1))
                        .foregroundColor(AppColors.primary)
                        .cornerRadius(20)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                
                // MARK: - 4'lü Üst Finansal KPI Kartları
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    MetricCard(
                        title: "Bugünkü Evrak",
                        value: Formatters.currency(viewModel.todayTotal),
                        subtitle: "5 Adet Evrak",
                        iconName: "flame.fill",
                        themeColor: AppColors.primary,
                        action: { viewModel.selectedDate = .today }
                    )
                    
                    MetricCard(
                        title: "Yarınki Evrak",
                        value: Formatters.currency(viewModel.tomorrowTotal),
                        subtitle: "12 Adet Evrak",
                        iconName: "bolt.fill",
                        themeColor: AppColors.warning,
                        action: { viewModel.selectedDate = .tomorrow }
                    )
                    
                    MetricCard(
                        title: "Bu Haftaki Evrak",
                        value: Formatters.currency(viewModel.weekTotal),
                        subtitle: "Haftalık Toplam",
                        iconName: "calendar",
                        themeColor: AppColors.success,
                        action: { viewModel.selectedDate = .week }
                    )
                    
                    MetricCard(
                        title: "Toplam Evrak",
                        value: "\(viewModel.totalCount) Adet",
                        subtitle: "Tahsilde: 694 • Ödenen: 4525",
                        iconName: "tray.full.fill",
                        themeColor: AppColors.textSecondary,
                        action: { viewModel.selectedDate = .all }
                    )
                }
                .padding(.horizontal, 16)
                
                // MARK: - Kesilen / Alınan Segmented Control
                HStack(spacing: 0) {
                    ForEach(ChecksViewModel.CheckTypeFilter.allCases, id: \.self) { type in
                        Button(action: { viewModel.selectedType = type }) {
                            Text(type.rawValue)
                                .font(.system(size: 12, weight: viewModel.selectedType == type ? .bold : .medium))
                                .foregroundColor(viewModel.selectedType == type ? AppColors.textPrimary : AppColors.textMuted)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(viewModel.selectedType == type ? AppColors.surface : Color.clear)
                                .cornerRadius(8)
                        }
                    }
                }
                .padding(3)
                .background(AppColors.divider)
                .cornerRadius(10)
                .padding(.horizontal, 16)
            }
            .background(AppColors.surface)
            
            // MARK: - Tarih & Durum Filtre Barı
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    Text("FİLTRE:")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(AppColors.textMuted)
                    
                    ForEach(ChecksViewModel.CheckDateFilter.allCases, id: \.self) { filter in
                        FilterChip(
                            title: filter.rawValue,
                            isSelected: viewModel.selectedDate == filter,
                            action: { viewModel.selectedDate = filter }
                        )
                    }
                    
                    FilterChip(
                        title: "Tahsilde (694)",
                        isSelected: viewModel.selectedStatus == .tahsilde,
                        action: { viewModel.selectedStatus = (viewModel.selectedStatus == .tahsilde ? .all : .tahsilde) }
                    )
                    
                    FilterChip(
                        title: "Ödenen (4.525)",
                        isSelected: viewModel.selectedStatus == .odenen,
                        action: { viewModel.selectedStatus = (viewModel.selectedStatus == .odenen ? .all : .odenen) }
                    )
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
            .background(AppColors.surface)
            
            // MARK: - Canlı Arama Çubuğu
            AppSearchBar(text: $viewModel.searchQuery, placeholder: "Çek no, banka veya kişi/firma adına göre ara...")
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(AppColors.background)
            
            // MARK: - Liste & Sonuç Özeti
            ScrollView {
                VStack(spacing: 10) {
                    // Header Summary Bar
                    HStack {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(AppColors.primary)
                                .frame(width: 8, height: 8)
                            
                            Text("\(viewModel.filteredChecks.count) Adet Evrak Bulundu")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(AppColors.textPrimary)
                        }
                        
                        Spacer()
                        
                        Text(Formatters.currency(viewModel.displayedTotal))
                            .font(.system(size: 13, weight: .black))
                            .foregroundColor(AppColors.primary)
                    }
                    .padding(12)
                    .background(AppColors.surface)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(AppColors.border, lineWidth: 1)
                    )
                    
                    // Cards
                    ForEach(viewModel.filteredChecks) { check in
                        CheckRowView(check: check) {
                            selectedCheckForAction = check
                            showingActionSheet = true
                        }
                    }
                }
                .padding(16)
            }
            .background(AppColors.background)
        }
        .confirmationDialog(
            "Evrak İşlemleri (\(selectedCheckForAction?.checkNo ?? ""))",
            isPresented: $showingActionSheet,
            presenting: selectedCheckForAction
        ) { check in
            Button("Cari Ekstre Görüntüle") {}
            Button("Evrak Detayları") {}
            Button("Ödendi Olarak İşaretle") {}
            Button("İptal", role: .cancel) {}
        }
    }
}
