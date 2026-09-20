import SwiftUI

// MARK: - Kuveyt Türk Button Styles

/// Primary solid navy button (#002D59) with capsule shape and subtle elevation
public struct KTPrimaryButtonStyle: ButtonStyle {
    public var isFullWidth: Bool = false

    public init(isFullWidth: Bool = false) {
        self.isFullWidth = isFullWidth
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13.5, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 11)
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .background(
                configuration.isPressed ? Color.ktPrimaryDark : Color.ktPrimary
            )
            .clipShape(Capsule())
            .shadow(color: Color.ktPrimary.opacity(0.25), radius: 4, x: 0, y: 2)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Secondary soft blue button (#F0F4F8) with navy text
public struct KTSecondaryButtonStyle: ButtonStyle {
    public var isFullWidth: Bool = false

    public init(isFullWidth: Bool = false) {
        self.isFullWidth = isFullWidth
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13.5, weight: .semibold))
            .foregroundColor(.ktPrimary)
            .padding(.horizontal, 20)
            .padding(.vertical, 11)
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .background(
                configuration.isPressed ? Color.ktCardBorder : Color.ktPrimaryLight
            )
            .clipShape(Capsule())
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Danger solid coral button (#EA3829)
public struct KTDangerButtonStyle: ButtonStyle {
    public var isFullWidth: Bool = false

    public init(isFullWidth: Bool = false) {
        self.isFullWidth = isFullWidth
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13.5, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 11)
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .background(
                configuration.isPressed ? Color.ktCoralDark : Color.ktCoral
            )
            .clipShape(Capsule())
            .shadow(color: Color.ktCoral.opacity(0.25), radius: 4, x: 0, y: 2)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

// MARK: - Reusable Button Component
public enum KTButtonStyleType {
    case primary
    case secondary
    case danger
}

public struct KTButton: View {
    private let title: String
    private let icon: String?
    private let style: KTButtonStyleType
    private let isFullWidth: Bool
    private let isLoading: Bool
    private let action: () -> Void

    public init(
        _ title: String,
        icon: String? = nil,
        style: KTButtonStyleType = .primary,
        isFullWidth: Bool = false,
        isLoading: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.style = style
        self.isFullWidth = isFullWidth
        self.isLoading = isLoading
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: progressTint))
                        .scaleEffect(0.8)
                } else if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                }
                Text(title)
            }
        }
        .disabled(isLoading)
        .modify { view in
            switch style {
            case .primary:
                view.buttonStyle(KTPrimaryButtonStyle(isFullWidth: isFullWidth))
            case .secondary:
                view.buttonStyle(KTSecondaryButtonStyle(isFullWidth: isFullWidth))
            case .danger:
                view.buttonStyle(KTDangerButtonStyle(isFullWidth: isFullWidth))
            }
        }
    }

    private var progressTint: Color {
        style == .secondary ? .ktPrimary : .white
    }
}

/// Circular header icon button (36x36, #EEF4FF background, navy icon)
public struct KTIconButton: View {
    private let icon: String
    private let badgeCount: Int?
    private let action: () -> Void

    public init(
        icon: String,
        badgeCount: Int? = nil,
        action: @escaping () -> Void
    ) {
        self.icon = icon
        self.badgeCount = badgeCount
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                Circle()
                    .fill(Color.ktPrimarySoft)
                    .frame(width: 36, height: 36)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.ktPrimary)
                    )

                if let count = badgeCount, count > 0 {
                    Circle()
                        .fill(Color.ktCoral)
                        .frame(width: 10, height: 10)
                        .offset(x: 1, y: -1)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Internal View Modifier Helper
extension View {
    @ViewBuilder
    fileprivate func modify<T: View>(@ViewBuilder _ transform: (Self) -> T) -> T {
        transform(self)
    }
}
