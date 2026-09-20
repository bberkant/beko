import SwiftUI

// MARK: - Kuveyt Türk Calibrated SF Pro Typography
extension Font {
    /// Display Currency / Big Metric (26pt, Semibold 600)
    public static let ktDisplayMetric = Font.system(size: 26, weight: .semibold, design: .default)

    /// Large Title / Screen Header (20pt, Semibold 600)
    public static let ktTitle = Font.system(size: 20, weight: .semibold, design: .default)

    /// Section Header (15pt, Semibold 600)
    public static let ktSectionHeader = Font.system(size: 15, weight: .semibold, design: .default)

    /// Card Title / Customer Name (14pt, Semibold 600)
    public static let ktCardTitle = Font.system(size: 14, weight: .semibold, design: .default)

    /// Financial List Amount (14pt, Bold 700)
    public static let ktFinancialAmount = Font.system(size: 14, weight: .bold, design: .default)

    /// Body Regular (13pt, Regular 400)
    public static let ktBody = Font.system(size: 13, weight: .regular, design: .default)

    /// Body Medium (13pt, Medium 500)
    public static let ktBodyMedium = Font.system(size: 13, weight: .medium, design: .default)

    /// Tab Bar Title (13.5pt, Regular 400 - strictly regular per Kuveyt Türk prototype spec)
    public static let ktTabTitle = Font.system(size: 13.5, weight: .regular, design: .default)

    /// Segmented Tab Button (13pt, Medium 500 / Semibold 600)
    public static let ktSegmented = Font.system(size: 13, weight: .medium, design: .default)
    public static let ktSegmentedActive = Font.system(size: 13, weight: .semibold, design: .default)

    /// Filter Pill Label (12pt, Medium 500 / Semibold 600)
    public static let ktPill = Font.system(size: 12, weight: .medium, design: .default)
    public static let ktPillActive = Font.system(size: 12, weight: .semibold, design: .default)

    /// Status Badge / Micro Pill (10.5pt, Semibold 600)
    public static let ktBadge = Font.system(size: 10.5, weight: .semibold, design: .default)

    /// Secondary Caption (11pt, Regular 400)
    public static let ktCaption = Font.system(size: 11, weight: .regular, design: .default)

    /// Micro Note / Legal (10pt, Medium 500)
    public static let ktMicro = Font.system(size: 10, weight: .medium, design: .default)
}

// MARK: - View Modifiers for Calibrated Typography
extension View {
    /// Enforces tabular numerals and tight tracking for financial figures
    public func ktMonospacedDigits() -> some View {
        self
            .monospacedDigit()
            .tracking(-0.3)
    }

    /// Primary currency display style: 26pt semibold with tabular alignment
    public func ktDisplayAmountStyle(color: Color = .ktTextMain) -> some View {
        self
            .font(.ktDisplayMetric)
            .foregroundColor(color)
            .ktMonospacedDigits()
    }

    /// List item financial figure: 14pt bold with tabular alignment
    public func ktListAmountStyle(color: Color = .ktTextMain) -> some View {
        self
            .font(.ktFinancialAmount)
            .foregroundColor(color)
            .ktMonospacedDigits()
    }
}
