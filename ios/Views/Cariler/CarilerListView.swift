import SwiftUI

public struct CarilerListView: View {
    @StateObject private var viewModel = CarilerViewModel()
    @State private var selectedCariForDetail: VegaCari?
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Cari Kart Listesi")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        Text("Vega Entegrasyonlu Müşteri & Tedarikçiler")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(AppColors.textMuted)
                    }
                    
                    Spacer()
                    
                    Button(action: {}) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 13, weight: .bold))
                            .padding(8)
                            .background(AppColors.divider)
                            .foregroundColor(AppColors.textPrimary)
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                
                // 2'li KPI (Alacak / Borç)
                HStack(spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("TOPLAM ALACAK")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.success)
                        Text(Formatters.currency(viewModel.totalReceivable))
                            .font(.system(size: 13, weight: .black))
                            .foregroundColor(AppColors.success)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(AppColors.success.opacity(0.08))
                    .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("TOPLAM BORÇ")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.danger)
                        Text(Formatters.currency(viewModel.totalPayable))
                            .font(.system(size: 13, weight: .black))
                            .foregroundColor(AppColors.danger)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(AppColors.danger.opacity(0.08))
                    .cornerRadius(12)
                }
                .padding(.horizontal, 16)
                
                // Search
                AppSearchBar(text: $viewModel.searchQuery, placeholder: "Cari adı, kodu veya şehir ara...")
                    .padding(.horizontal, 16)
                
                // Filters
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(CarilerViewModel.CariFilter.allCases, id: \.self) { filter in
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
                    ForEach(viewModel.filteredCariler) { cari in
                        Button(action: { selectedCariForDetail = cari }) {
                            HStack(alignment: .center, spacing: 12) {
                                // Avatar circle
                                Text(String(cari.name.prefix(2)))
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(AppColors.primary)
                                    .frame(width: 40, height: 40)
                                    .background(AppColors.primary.opacity(0.1))
                                    .clipShape(Circle())
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: 6) {
                                        Text(cari.code)
                                            .font(.system(size: 10.5, weight: .semibold))
                                            .foregroundColor(AppColors.textMuted)
                                        
                                        if let city = cari.city {
                                            Text("• \(city)")
                                                .font(.system(size: 10.5, weight: .medium))
                                                .foregroundColor(AppColors.textMuted)
                                        }
                                    }
                                    
                                    Text(cari.name)
                                        .font(.system(size: 13.5, weight: .bold))
                                        .foregroundColor(AppColors.textPrimary)
                                        .lineLimit(1)
                                }
                                
                                Spacer()
                                
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text(cari.formattedBalance)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(AppColors.textPrimary)
                                    
                                    Text(cari.displayType)
                                        .font(.system(size: 9.5, weight: .semibold))
                                        .foregroundColor(AppColors.textMuted)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(AppColors.divider)
                                        .cornerRadius(4)
                                }
                            }
                            .padding(14)
                            .background(AppColors.surface)
                            .cornerRadius(14)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(AppColors.border, lineWidth: 1)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
            }
            .background(AppColors.background)
        }
        .sheet(item: $selectedCariForDetail) { cari in
            CariDetailView(cari: cari, movements: viewModel.movements)
        }
    }
}

public struct CariDetailView: View {
    public let cari: VegaCari
    public let movements: [VegaCariHareket]
    @Environment(\.dismiss) private var dismiss
    
    public init(cari: VegaCari, movements: [VegaCariHareket]) {
        self.cari = cari
        self.movements = movements
    }
    
    public var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    // Card
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text(cari.code)
                                .font(.system(size: 11, weight: .bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(AppColors.primary.opacity(0.1))
                                .foregroundColor(AppColors.primary)
                                .cornerRadius(6)
                            
                            Spacer()
                            
                            Text(cari.type ?? "Müşteri")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(AppColors.textMuted)
                        }
                        
                        Text(cari.name)
                            .font(.system(size: 16, weight: .black))
                            .foregroundColor(AppColors.textPrimary)
                        
                        Divider()
                        
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("GÜNCEL BAKİYE")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(AppColors.textMuted)
                                Text(cari.formattedBalance)
                                    .font(.system(size: 20, weight: .black))
                                    .foregroundColor(cari.isBorclu ? AppColors.success : AppColors.danger)
                            }
                            Spacer()
                        }
                    }
                    .padding(16)
                    .background(AppColors.surface)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AppColors.border, lineWidth: 1)
                    )
                    
                    // Statements List
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Son Cari Hareketleri")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        
                        ForEach(movements) { m in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(m.date)
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(AppColors.textMuted)
                                    Spacer()
                                    Text(m.formattedAmount)
                                        .font(.system(size: 13, weight: .black))
                                        .foregroundColor(m.debit > 0 ? AppColors.success : AppColors.danger)
                                }
                                
                                Text(m.description ?? m.docType ?? "İşlem")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(AppColors.textPrimary)
                                
                                if let docNo = m.docNo {
                                    Text("Evrak No: \(docNo)")
                                        .font(.system(size: 10, weight: .regular))
                                        .foregroundColor(AppColors.textMuted)
                                }
                            }
                            .padding(12)
                            .background(AppColors.surface)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(AppColors.border, lineWidth: 1)
                            )
                        }
                    }
                }
                .padding(16)
            }
            .background(AppColors.background)
            .navigationTitle("Cari Ekstre")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Kapat") { dismiss() }
                }
            }
        }
    }
}
