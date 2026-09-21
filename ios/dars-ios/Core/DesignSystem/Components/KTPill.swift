import SwiftUI

// MARK: - Pill Variants & Presets
public enum KTPillVariant: Equatable {
    /// Interactive filter pill with active/inactive state
    case filter(isActive: Bool)
    /// Success / Positive (Emerald)
    case success
    /// Danger / Debtor / Overdue (Coral Red)
    case danger
    /// Warning / Pending (Orange)
    case warning
    /// Info / Banking (Navy Blue)
    case info
    /// Neutral / Muted (Slate Gray)
    case neutral
    /// Custom specified colors
    case custom(text: Color, bg: Color, border: Color?)
}

public enum KTPillSize {
    case small    // 10.5pt, compact tags
    case medium   // 12pt, standard filter pill
    case large    // 13pt, prominent filter
}

// MARK: - Kuveyt Türk Pill View
public struct KTPill: View {
    private let title: String
    private let icon: String?
    private let variant: KTPillVariant
    private let size: KTPillSize
    private let hasPulseDot: Bool
    private let action: (() -> Void)?

    @State private var isPulsing: Bool = false

    public init(
        _ title: String,
        icon: String? = nil,
        variant: KTPillVariant = .info,
        size: KTPillSize = .medium,
        hasPulseDot: Bool = false,
        action: (() -> Void)? = nil
    ) {
        self.title = title
        self.icon = icon
        self.variant = variant
        self.size = size
        self.hasPulseDot = hasPulseDot
        self.action = action
    }

    public var body: some View {
        Group {
            if let action = action {
                Button(action: action) {
                    pillContent
                }
                .buttonStyle(PlainButtonStyle())
            } else {
                pillContent
            }
        }
    }

    private var pillContent: some View {
        HStack(spacing: iconSpacing) {
            if hasPulseDot {
                Circle()
                    .fill(Color.ktSuccess)
                    .frame(width: 6, height: 6)
                    .scaleEffect(isPulsing ? 1.2 : 0.8)
                    .opacity(isPulsing ? 1.0 : 0.6)
                    .animation(
                        Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true),
                        value: isPulsing
                    )
                    .onAppear { isPulsing = true }
            } else if let icon = icon {
                Image(systemName: icon)
                    .font(.system(size: iconSize, weight: .semibold))
            }

            Text(title)
                .font(font)
                .tracking(letterSpacing)
        }
        .padding(.horizontal, horizontalPadding)
        .padding(.vertical, verticalPadding)
        .foregroundColor(textColor)
        .background(backgroundColor)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(borderColor, lineWidth: borderWidth)
        )
        .shadow(color: shadowColor, radius: shadowRadius, x: 0, y: shadowY)
    }

    // MARK: - Color Resolvers
    private var textColor: Color {
        switch variant {
        case .filter(let isActive):
            return isActive ? .white : .ktTextSecondary
        case .success:
            return .ktSuccess
        case .danger:
            return .ktCoral
        case .warning:
            return .ktOrange
        case .info:
            return .ktPrimary
        case .neutral:
            return .ktTextSecondary
        case .custom(let text, _, _):
            return text
        }
    }

    private var backgroundColor: Color {
        switch variant {
        case .filter(let isActive):
            return isActive ? .ktPrimary : .ktCardSurface
        case .success:
            return .ktSuccessLight
        case .danger:
            return .ktCoralLight
        case .warning:
            return .ktOrangeLight
        case .info:
            return .ktPrimaryLight
        case .neutral:
            return .ktSlate100
        case .custom(_, let bg, _):
            return bg
        }
    }

    private var borderColor: Color {
        switch variant {
        case .filter(let isActive):
            return isActive ? .ktPrimary : .ktCardBorder
        case .success, .danger, .warning, .info, .neutral:
            return Color.clear
        case .custom(_, _, let border):
            return border ?? Color.clear
        }
    }

    private var borderWidth: CGFloat {
        switch variant {
        case .filter:
            return 1.0
        case .custom(_, _, let border):
            return border != nil ? 1.0 : 0.0
        default:
            return 0.0
        }
    }

    private var shadowColor: Color {
        switch variant {
        case .filter(let isActive):
            return isActive ? Color.ktPrimary.opacity(0.2) : Color.clear
        default:
            return Color.clear
        }
    }

    private var shadowRadius: CGFloat {
        switch variant {
        case .filter(let isActive):
            return isActive ? 3 : 0
        default:
            return 0
        }
    }

    private var shadowY: CGFloat {
        switch variant {
        case .filter(let isActive):
            return isActive ? 1 : 0
        default:
            return 0
        }
    }

    // MARK: - Size Resolvers
    private var font: Font {
        switch (size, variant) {
        case (.small, _):
            return .ktBadge
        case (.medium, .filter(let isActive)):
            return isActive ? .ktPillActive : .ktPill
        case (.medium, _):
            return .ktPill
        case (.large, .filter(let isActive)):
            return isActive ? .ktSegmentedActive : .ktSegmented
        case (.large, _):
            return .ktSegmented
        }
    }

    private var horizontalPadding: CGFloat {
        switch size {
        case .small: return 8
        case .medium: return 12
        case .large: return 16
        }
    }

    private var verticalPadding: CGFloat {
        switch size {
        case .small: return 3.5
        case .medium: return 5.5
        case .large: return 7
        }
    }

    private var iconSize: CGFloat {
        switch size {
        case .small: return 9
        case .medium: return 11
        case .large: return 12
        }
    }

    private var iconSpacing: CGFloat {
        switch size {
        case .small: return 4
        case .medium: return 5
        case .large: return 6
        }
    }

    private var letterSpacing: CGFloat {
        return 0
    }
}
