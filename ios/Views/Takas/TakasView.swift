import SwiftUI

public struct TakasView: View {
    @StateObject private var viewModel = TakasViewModel()
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Takas Çekleri")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        Text("Takasa Verilen Çekler ve Durum Takibi")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(AppColors.textMuted)
                    }
                    
                    Spacer()
                    
                    Button(action: {}) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                            Text("Çek Seç")
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
                
                // Tabs
                HStack(spacing: 0) {
                    ForEach(TakasViewModel.TakasTab.allCases, id: \.self) { tab in
                        Button(action: { viewModel.activeTab = tab }) {
                            Text(tab.rawValue)
                                .font(.system(size: 12, weight: viewModel.activeTab == tab ? .bold : .medium))
                                .foregroundColor(viewModel.activeTab == tab ? AppColors.textPrimary : AppColors.textMuted)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .background(viewModel.activeTab == tab ? AppColors.surface : Color.clear)
                                .cornerRadius(8)
                        }
                    }
                }
                .padding(3)
                .background(AppColors.divider)
                .cornerRadius(10)
                .padding(.horizontal, 16)
                
                // 3'lü KPI Barı
                HStack(spacing: 8) {
                    VStack(spacing: 2) {
                        Text("TAKAS TOPLAMI")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.textMuted)
                        Text(Formatters.currency(viewModel.takasTotal))
                            .font(.system(size: 12.5, weight: .black))
                            .foregroundColor(AppColors.textPrimary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(8)
                    .background(AppColors.divider)
                    .cornerRadius(10)
                    
                    VStack(spacing: 2) {
                        Text("İÇ TAKAS")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.textMuted)
                        Text(Formatters.currency(viewModel.icTakasTotal))
                            .font(.system(size: 12.5, weight: .black))
                            .foregroundColor(AppColors.textPrimary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(8)
                    .background(AppColors.divider)
                    .cornerRadius(10)
                    
                    VStack(spacing: 2) {
                        Text("TOPLAM ÇEK")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.textMuted)
                        Text("\(viewModel.totalCount) Adet")
                            .font(.system(size: 12.5, weight: .black))
                            .foregroundColor(AppColors.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(8)
                    .background(AppColors.divider)
                    .cornerRadius(10)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 10)
            }
            .background(AppColors.surface)
            
            // Content
            ScrollView {
                VStack(spacing: 12) {
                    if viewModel.activeTab == .takasta {
                        TakasMatrixView(columns: viewModel.matrixColumns, total: viewModel.takasTotal)
                    }
                    
                    HStack {
                        Text(viewModel.activeTab == .takasta ? "Bugün Takastan Çıkacak Evraklar" : (viewModel.activeTab == .icTakas ? "İç Takas Evrakları" : "Ödenen Evraklar"))
                            .font(.system(size: 12.5, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        Spacer()
                        Text("\(viewModel.activeTab == .takasta ? viewModel.takasChecks.count : viewModel.icTakasChecks.count) Evrak")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(AppColors.textMuted)
                    }
                    .padding(.horizontal, 4)
                    
                    let list = viewModel.activeTab == .takasta ? viewModel.takasChecks : viewModel.icTakasChecks
                    ForEach(list) { check in
                        CheckRowView(check: check) {}
                    }
                }
                .padding(16)
            }
            .background(AppColors.background)
        }
    }
}
