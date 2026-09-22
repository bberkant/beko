import SwiftUI

// MARK: - Kuveyt Türk Brand Color Tokens
extension Color {
    // MARK: - Hex Initializers
    public init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }

    public init(hex: String, alpha: Double = 1.0) {
        self.init(hexString: hex, alpha: alpha)
    }

    public init(hexString: String, alpha: Double = 1.0) {
        let hex = hexString.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255.0,
            green: Double(g) / 255.0,
            blue: Double(b) / 255.0,
            opacity: Double(a) / 255.0 * alpha
        )
    }

    // MARK: - Kuveyt Türk Corporate Palette
    /// Kuveyt Türk Signature Navy (#002D59) - Main Brand Color
    public static let ktPrimary = Color(hex: 0x002D59)
    /// Dark Navy for pressed states & deep headers (#002244)
    public static let ktPrimaryDark = Color(hex: 0x002244)
    /// Soft Blue Background for icon badges, secondary buttons (#F0F4F8)
    public static let ktPrimaryLight = Color(hex: 0xF0F4F8)
    /// Very soft light blue for circle action buttons (#EEF4FF)
    public static let ktPrimarySoft = Color(hex: 0xEEF4FF)

    /// Kuveyt Türk Coral Red (#EA3829) - Urgent alerts, debts, negative cashflow
    public static let ktCoral = Color(hex: 0xEA3829)
    /// Coral Dark for active pressed states (#C82315)
    public static let ktCoralDark = Color(hex: 0xC82315)
    /// Soft Coral Background for debt badges and overdue status tags (#FDEBEA)
    public static let ktCoralLight = Color(hex: 0xFDEBEA)

    /// Kuveyt Türk Amber Orange (#FF9800) - Warnings, pending actions, calendar highlights
    public static let ktOrange = Color(hex: 0xFF9800)
    /// Soft Amber Background for warning pills (#FFF3E0)
    public static let ktOrangeLight = Color(hex: 0xFFF3E0)

    /// Kuveyt Türk Accounting Purple (#845EC2) - Special ledger and audit operations
    public static let ktPurple = Color(hex: 0x845EC2)
    /// Light Purple Background (#F3E8FF)
    public static let ktPurpleLight = Color(hex: 0xF3E8FF)

    // MARK: - Surfaces & Backgrounds
    /// Slate-50 root canvas background (#F8FAFC)
    public static let ktPageBackground = Color(hex: 0xF8FAFC)
    /// Pure White card and modal surface (#FFFFFF)
    public static let ktCardSurface = Color(hex: 0xFFFFFF)
    /// Subtle Border for cards, inputs, and list dividers (#E2E8F0)
    public static let ktCardBorder = Color(hex: 0xE2E8F0)
    /// Cool Gray track background for segmented controls (#EEF2F6)
    public static let ktSegmentedTrack = Color(hex: 0xEEF2F6)

    // MARK: - Text & Slate Hierarchy
    /// High-emphasis typography Slate-800 (#1E293B)
    public static let ktTextMain = Color(hex: 0x1E293B)
    /// Ultra-dark headings Slate-900 (#0F172A)
    public static let ktTextHeading = Color(hex: 0x0F172A)
    /// Muted metadata & dates Slate-500 (#64748B)
    public static let ktTextMuted = Color(hex: 0x64748B)
    /// Secondary metadata & dates Slate-500 (#64748B) - alias for ktTextMuted
    public static let ktTextSecondary = Color(hex: 0x64748B)
    /// Tertiary captions & placeholders Slate-400 (#94A3B8)
    public static let ktTextTertiary = Color(hex: 0x94A3B8)
    /// Slate-300 divider/disabled (#CBD5E1)
    public static let ktSlate300 = Color(hex: 0xCBD5E1)
    /// Slate-100 neutral badge fill (#F1F5F9)
    public static let ktSlate100 = Color(hex: 0xF1F5F9)

    // MARK: - Semantic Status Indicators
    /// Success Emerald (#10B981) - Positive cashflow (+), receivable (Alacaklı), live pulse
    public static let ktSuccess = Color(hex: 0x10B981)
    public static let ktSuccessDark = Color(hex: 0x059669)
    public static let ktSuccessLight = Color(hex: 0xECFDF5)

    /// Danger Rose (#F43F5E) - Negative cashflow (-), debtor (Borçlu), overdue inspection
    public static let ktDanger = Color(hex: 0xF43F5E)
    public static let ktDangerLight = Color(hex: 0xFFF1F2)

    // MARK: - Corporate Gradients
    public static let ktGradientDark1 = Color(hex: 0x134B78)
    public static let ktGradientDark2 = Color(hex: 0x0B3558)
    public static let ktGradientDark3 = Color(hex: 0x002B49)
    public static let ktGradientDark4 = Color(hex: 0x061E33)

    // MARK: - Backwards Compatibility Aliases
    @available(*, deprecated, message: "Use ktPrimary or ktSuccess instead")
    public static let brandGreen = Color.ktPrimary
    @available(*, deprecated, message: "Use ktPageBackground instead")
    public static let systemLightGray = Color.ktPageBackground
}
