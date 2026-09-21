import SwiftUI

// MARK: - Kuveyt Türk Design System Theme & Global Tokens
public enum Theme {
    public static let primary = Color.ktPrimary
    public static let primaryDark = Color.ktPrimaryDark
    public static let primaryLight = Color.ktPrimaryLight
    public static let coral = Color.ktCoral
    public static let coralLight = Color.ktCoralLight
    public static let orange = Color.ktOrange
    public static let orangeLight = Color.ktOrangeLight
    public static let pageBackground = Color.ktPageBackground
    public static let cardSurface = Color.ktCardSurface
    public static let cardBorder = Color.ktCardBorder

    // Forward metrics and sub-namespaces
    public typealias Metrics = KTTheme.Metrics
    public typealias Gradients = KTTheme.Gradients
    public typealias Formatter = KTTheme.Formatter
}

public enum KTTheme {
    // MARK: - Metrics
    public enum Metrics {
        public static let cornerRadiusCard: CGFloat = 16
        public static let cornerRadiusButton: CGFloat = 100 // Capsule
        public static let cornerRadiusSegmented: CGFloat = 14
        public static let cornerRadiusSegmentItem: CGFloat = 11
        public static let cornerRadiusPill: CGFloat = 100
        public static let cornerRadiusModalTop: CGFloat = 24

        public static let paddingHorizontal: CGFloat = 16
        public static let paddingVertical: CGFloat = 12
        public static let cardPadding: CGFloat = 16
        public static let buttonHeight: CGFloat = 44
        public static let headerHeight: CGFloat = 56
        public static let tabBarHeight: CGFloat = 52
    }

    // MARK: - Gradients
    public enum Gradients {
        /// Kuveyt Türk corporate AI banner gradient
        public static let bannerAi = LinearGradient(
            colors: [Color.ktGradientDark1, Color.ktGradientDark2, Color.ktGradientDark3],
            startPoint: .leading,
            endPoint: .trailing
        )

        /// Deep navy gradient for premium cards
        public static let cardDark = LinearGradient(
            colors: [Color.ktGradientDark2, Color.ktGradientDark3, Color.ktGradientDark4],
            startPoint: .leading,
            endPoint: .trailing
        )

        /// Kuveyt Türk signature primary gradient
        public static let navyPrimary = LinearGradient(
            colors: [Color.ktPrimary, Color.ktPrimaryDark],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Formatters
    public enum Formatter {
        private static let trLocale = Locale(identifier: "tr_TR")

        public static func currency(_ amount: Double, showDecimals: Bool = false) -> String {
            let formatter = NumberFormatter()
            formatter.locale = trLocale
            formatter.numberStyle = .decimal
            formatter.minimumFractionDigits = showDecimals ? 2 : 0
            formatter.maximumFractionDigits = showDecimals ? 2 : 0
            let formatted = formatter.string(from: NSNumber(value: amount)) ?? "\(amount)"
            return "\(formatted) TL"
        }

        public static func signedCurrency(_ amount: Double) -> String {
            let prefix = amount > 0 ? "+" : ""
            return "\(prefix)\(currency(amount))"
        }

        public static func number(_ value: Int) -> String {
            let formatter = NumberFormatter()
            formatter.locale = trLocale
            formatter.numberStyle = .decimal
            return formatter.string(from: NSNumber(value: value)) ?? "\(value)"
        }
    }
}
