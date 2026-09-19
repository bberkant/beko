import SwiftUI

public struct TakasMatrixView: View {
    public let columns: [TakasMatrixColumn]
    public let total: Double
    
    public init(columns: [TakasMatrixColumn], total: Double) {
        self.columns = columns
        self.total = total
    }
    
    public var body: some View {
        VStack(spacing: 10) {
            HStack {
                HStack(spacing: 6) {
                    Circle()
                        .fill(AppColors.danger)
                        .frame(width: 8, height: 8)
                    Text("Bugün Takas Tablosu (01.09.2026)")
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundColor(AppColors.textPrimary)
                }
                
                Spacer()
                
                Text("Banka Matrisi")
                    .font(.system(size: 10, weight: .semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(AppColors.divider)
                    .foregroundColor(AppColors.textSecondary)
                    .clipShape(Capsule())
            }
            
            // Table Matrix
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(spacing: 0) {
                    // Header Row
                    HStack(spacing: 0) {
                        ForEach(columns) { col in
                            Text(col.bankName)
                                .font(.system(size: 10, weight: .bold))
                                .frame(width: 80, height: 32)
                                .background(col.isHighlighted ? AppColors.primary.opacity(0.08) : AppColors.divider)
                                .foregroundColor(col.isHighlighted ? AppColors.primary : AppColors.textSecondary)
                                .border(AppColors.border, width: 0.5)
                        }
                    }
                    
                    // Values Rows (4 rows)
                    ForEach(0..<4) { rowIndex in
                        HStack(spacing: 0) {
                            ForEach(columns) { col in
                                let val = col.values[rowIndex]
                                Text(val > 0 ? Formatters.number(val) : "-")
                                    .font(.system(size: 10.5, weight: val > 0 ? .bold : .regular))
                                    .frame(width: 80, height: 30)
                                    .background(val > 0 ? Color.blue.opacity(0.05) : Color.white)
                                    .foregroundColor(val > 0 ? AppColors.textPrimary : AppColors.textMuted)
                                    .border(AppColors.divider, width: 0.5)
                            }
                        }
                    }
                    
                    // Total Footer Row
                    HStack(spacing: 0) {
                        ForEach(columns) { col in
                            Text(col.total > 0 ? Formatters.number(col.total) : "-")
                                .font(.system(size: 11, weight: .black))
                                .frame(width: 80, height: 34)
                                .background(col.isHighlighted ? AppColors.warning.opacity(0.15) : AppColors.divider)
                                .foregroundColor(col.isHighlighted ? Color(hex: "#78350F") : AppColors.textPrimary)
                                .border(AppColors.border, width: 0.5)
                        }
                    }
                }
                .cornerRadius(10)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(AppColors.border, lineWidth: 1)
                )
            }
            
            // Total Banner
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "turkishlirasign.circle.fill")
                        .foregroundColor(AppColors.primary)
                    Text("TAKAS TOPLAMI")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(AppColors.textPrimary)
                }
                
                Spacer()
                
                Text(Formatters.currency(total))
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(AppColors.primary)
            }
            .padding(10)
            .background(AppColors.primary.opacity(0.06))
            .cornerRadius(10)
        }
        .padding(14)
        .background(AppColors.surface)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(AppColors.border, lineWidth: 1)
        )
    }
}
