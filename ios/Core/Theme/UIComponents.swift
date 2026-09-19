import SwiftUI

// MARK: - Corporate Metric Card
public struct MetricCard: View {
    public let title: String
    public let value: String
    public let subtitle: String?
    public let iconName: String
    public let themeColor: Color
    public let action: (() -> Void)?
    
    public init(
        title: String,
        value: String,
        subtitle: String? = nil,
        iconName: String,
        themeColor: Color = AppColors.primary,
        action: (() -> Void)? = nil
    ) {
        self.title = title
        self.value = value
        self.subtitle = subtitle
        self.iconName = iconName
        self.themeColor = themeColor
        self.action = action
    }
    
    public var body: some View {
        Button(action: { action?() }) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: iconName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(themeColor)
                        .frame(width: 28, height: 28)
                        .background(themeColor.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    
                    Spacer()
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title.uppercased())
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(AppColors.textMuted)
                        .tracking(0.5)
                    
                    Text(value)
                        .font(.system(size: 15, weight: .black))
                        .foregroundColor(AppColors.textPrimary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    
                    if let subtitle = subtitle {
                        Text(subtitle)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(AppColors.textSecondary)
                    }
                }
            }
            .padding(12)
            .background(AppColors.surface)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(AppColors.border, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Filter Chip (Pill)
public struct FilterChip: View {
    public let title: String
    public let isSelected: Bool
    public let count: Int?
    public let action: () -> Void
    
    public init(title: String, isSelected: Bool, count: Int? = nil, action: @escaping () -> Void) {
        self.title = title
        self.isSelected = isSelected
        self.count = count
        self.action = action
    }
    
    public var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                
                if let count = count {
                    Text("\(count)")
                        .font(.system(size: 10, weight: .bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.25) : AppColors.border)
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? AppColors.primary : AppColors.surface)
            .foregroundColor(isSelected ? .white : AppColors.textSecondary)
            .cornerRadius(20)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(isSelected ? AppColors.primary : AppColors.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Status Badge
public struct StatusBadge: View {
    public let text: String
    public let color: Color
    public let isAnimated: Bool
    
    public init(text: String, color: Color = AppColors.primary, isAnimated: Bool = false) {
        self.text = text
        self.color = color
        self.isAnimated = isAnimated
    }
    
    public var body: some View {
        HStack(spacing: 4) {
            if isAnimated {
                Circle()
                    .fill(color)
                    .frame(width: 6, height: 6)
            }
            Text(text)
                .font(.system(size: 10.5, weight: .bold))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(color.opacity(0.12))
        .foregroundColor(color)
        .clipShape(Capsule())
    }
}

// MARK: - Custom Search Bar
public struct AppSearchBar: View {
    @Binding public var text: String
    public let placeholder: String
    
    public init(text: Binding<String>, placeholder: String = "Ara...") {
        self._text = text
        self.placeholder = placeholder
    }
    
    public var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(AppColors.textMuted)
                .font(.system(size: 14))
            
            TextField(placeholder, text: $text)
                .font(.system(size: 13))
                .foregroundColor(AppColors.textPrimary)
                .autocapitalization(.none)
                .disableAutocorrection(true)
            
            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(AppColors.textMuted)
                        .font(.system(size: 14))
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(AppColors.surface)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(AppColors.border, lineWidth: 1)
        )
    }
}
