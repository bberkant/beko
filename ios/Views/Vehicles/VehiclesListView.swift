import SwiftUI

public struct VehiclesListView: View {
    @StateObject private var viewModel = VehiclesViewModel()
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Araç Yönetimi")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        Text("63 Araçlık Kurumsal Filo & Muayene Takibi")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(AppColors.textMuted)
                    }
                    
                    Spacer()
                    
                    Button(action: {}) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                            Text("Araç Ekle")
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
                
                // 2'li KPI (Toplam Filo / Kritik Muayene)
                HStack(spacing: 8) {
                    MetricCard(
                        title: "TOPLAM FİLO",
                        value: "\(viewModel.vehicles.count) Araç",
                        subtitle: "Aktif Saha Araçları",
                        iconName: "car.2.fill",
                        themeColor: AppColors.primary
                    )
                    
                    MetricCard(
                        title: "KRİTİK MUAYENE",
                        value: "\(viewModel.criticalCount) Araç",
                        subtitle: "15 Gün Altında Kalanlar",
                        iconName: "exclamationmark.triangle.fill",
                        themeColor: AppColors.danger,
                        action: { viewModel.selectedFilter = .criticalInspection }
                    )
                }
                .padding(.horizontal, 16)
                
                // Search Bar
                AppSearchBar(text: $viewModel.searchQuery, placeholder: "Plaka, marka veya şoför ara...")
                    .padding(.horizontal, 16)
                
                // Filter Chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(VehiclesViewModel.VehicleFilter.allCases, id: \.self) { filter in
                            FilterChip(
                                title: filter.rawValue,
                                isSelected: viewModel.selectedFilter == filter,
                                action: { viewModel.selectedFilter = filter }
                            )
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 10)
                }
            }
            .background(AppColors.surface)
            
            // List
            ScrollView {
                LazyVStack(spacing: 10) {
                    ForEach(viewModel.filteredVehicles) { v in
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: 6) {
                                        Text(v.plate)
                                            .font(.system(size: 12, weight: .black))
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 3)
                                            .background(AppColors.primary.opacity(0.1))
                                            .foregroundColor(AppColors.primary)
                                            .cornerRadius(6)
                                        
                                        if let type = v.vehicleType {
                                            Text(type)
                                                .font(.system(size: 11, weight: .semibold))
                                                .foregroundColor(AppColors.textMuted)
                                        }
                                    }
                                    
                                    Text(v.displayTitle)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                
                                Spacer()
                                
                                if v.isInspectionCritical {
                                    StatusBadge(text: "⚠️ \(v.inspectionDaysRemaining) Gün Kaldı", color: AppColors.danger)
                                } else {
                                    StatusBadge(text: "\(v.inspectionDaysRemaining) Gün", color: AppColors.success)
                                }
                            }
                            
                            Divider()
                                .background(AppColors.divider)
                            
                            // Details Row
                            HStack {
                                Label(v.assignedTo ?? "Atanmamış", systemImage: "person.fill")
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(AppColors.textSecondary)
                                
                                Spacer()
                                
                                Label(v.formattedKm, systemImage: "speedometer")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(AppColors.textPrimary)
                            }
                            
                            // Insurance & Lien info
                            HStack(spacing: 12) {
                                HStack(spacing: 4) {
                                    Circle().fill(AppColors.primary).frame(width: 5, height: 5)
                                    Text("Sigorta: \(v.insuranceCompany)")
                                        .font(.system(size: 10.5, weight: .medium))
                                        .foregroundColor(AppColors.textMuted)
                                }
                                
                                if let daini = v.dainiMurtehin {
                                    HStack(spacing: 4) {
                                        Circle().fill(AppColors.warning).frame(width: 5, height: 5)
                                        Text("Rehin: \(daini)")
                                            .font(.system(size: 10.5, weight: .medium))
                                            .foregroundColor(AppColors.textMuted)
                                    }
                                }
                            }
                        }
                        .padding(14)
                        .background(AppColors.surface)
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(v.isInspectionCritical ? AppColors.danger.opacity(0.3) : AppColors.border, lineWidth: 1)
                        )
                    }
                }
                .padding(16)
            }
            .background(AppColors.background)
        }
    }
}
