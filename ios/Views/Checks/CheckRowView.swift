import SwiftUI

public struct CheckRowView: View {
    public let check: EBSCheck
    public let onAction: () -> Void
    
    public init(check: EBSCheck, onAction: @escaping () -> Void) {
        self.check = check
        self.onAction = onAction
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Top Row
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(check.checkType == "kesilen" ? "KESİLEN" : "ALINAN")
                            .font(.system(size: 9.5, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(check.checkType == "kesilen" ? Color.blue.opacity(0.12) : Color.green.opacity(0.12))
                            .foregroundColor(check.checkType == "kesilen" ? AppColors.primary : AppColors.success)
                            .cornerRadius(4)
                        
                        Text("Vade: \(check.formattedDueDate)")
                            .font(.system(size: 11.5, weight: .semibold))
                            .foregroundColor(AppColors.textPrimary)
                        
                        if let no = check.checkNo {
                            Text("(\(no))")
                                .font(.system(size: 11))
                                .foregroundColor(AppColors.textMuted)
                        }
                    }
                    
                    Text(check.displayTitle)
                        .font(.system(size: 13.5, weight: .bold))
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(check.formattedAmount)
                        .font(.system(size: 14.5, weight: .black))
                        .foregroundColor(AppColors.textPrimary)
                    
                    Text("Kayıt: \(check.formattedRegDate)")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(AppColors.textMuted)
                }
            }
            
            Divider()
                .background(AppColors.divider)
            
            // Bottom Detail Row
            HStack {
                Text("Asıl Borçlu: \(check.debtor ?? check.displayBank)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(AppColors.textSecondary)
                    .lineLimit(1)
                
                Spacer()
                
                if check.isToday {
                    StatusBadge(text: "🔥 Bugün", color: AppColors.danger)
                } else if check.isTomorrow {
                    StatusBadge(text: "⚡ Yarın", color: AppColors.warning)
                } else if check.daysRemaining > 1 {
                    StatusBadge(text: "\(check.daysRemaining) Gün", color: AppColors.textSecondary)
                }
                
                StatusBadge(text: check.status ?? "Tahsilde", color: AppColors.textSecondary)
                
                Button(action: onAction) {
                    Text("İşlem")
                        .font(.system(size: 11, weight: .semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(AppColors.divider)
                        .foregroundColor(AppColors.textPrimary)
                        .cornerRadius(8)
                }
            }
        }
        .padding(14)
        .background(AppColors.surface)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(check.isToday ? AppColors.danger.opacity(0.3) : AppColors.border, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.02), radius: 4, x: 0, y: 1)
    }
}
