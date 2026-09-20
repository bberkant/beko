import SwiftUI

// MARK: - Kuveyt Türk Card Container View
public struct KTCard<Content: View>: View {
    private let padding: CGFloat
    private let cornerRadius: CGFloat
    private let borderColor: Color
    private let borderWidth: CGFloat
    private let backgroundColor: Color
    private let leftAccentColor: Color?
    private let leftAccentWidth: CGFloat
    private let onTap: (() -> Void)?
    private let content: Content

    public init(
        padding: CGFloat = KTTheme.Metrics.cardPadding,
        cornerRadius: CGFloat = KTTheme.Metrics.cornerRadiusCard,
        borderColor: Color = .ktCardBorder,
        borderWidth: CGFloat = 1,
        backgroundColor: Color = .ktCardSurface,
        leftAccentColor: Color? = nil,
        leftAccentWidth: CGFloat = 4,
        onTap: (() -> Void)? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.padding = padding
        self.cornerRadius = cornerRadius
        self.borderColor = borderColor
        self.borderWidth = borderWidth
        self.backgroundColor = backgroundColor
        self.leftAccentColor = leftAccentColor
        self.leftAccentWidth = leftAccentWidth
        self.onTap = onTap
        self.content = content()
    }

    public var body: some View {
        Group {
            if let onTap = onTap {
                Button(action: onTap) {
                    cardContent
                }
                .buttonStyle(PlainButtonStyle())
            } else {
                cardContent
            }
        }
    }

    private var cardContent: some View {
        HStack(spacing: 0) {
            if let accent = leftAccentColor {
                accent
                    .frame(width: leftAccentWidth)
            }
            content
                .padding(padding)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(backgroundColor)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .stroke(borderColor, lineWidth: borderWidth)
        )
        .ktCardShadow()
    }
}

// MARK: - View Modifiers & Shadow Extensions
public struct KTCardModifier: ViewModifier {
    public var padding: CGFloat = KTTheme.Metrics.cardPadding
    public var cornerRadius: CGFloat = KTTheme.Metrics.cornerRadiusCard
    public var borderColor: Color = .ktCardBorder
    public var backgroundColor: Color = .ktCardSurface

    public init(
        padding: CGFloat = KTTheme.Metrics.cardPadding,
        cornerRadius: CGFloat = KTTheme.Metrics.cornerRadiusCard,
        borderColor: Color = .ktCardBorder,
        backgroundColor: Color = .ktCardSurface
    ) {
        self.padding = padding
        self.cornerRadius = cornerRadius
        self.borderColor = borderColor
        self.backgroundColor = backgroundColor
    }

    public func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(borderColor, lineWidth: 1)
            )
            .ktCardShadow()
    }
}

extension View {
    /// Applies Kuveyt Türk card container styling to any View
    public func ktCard(
        padding: CGFloat = KTTheme.Metrics.cardPadding,
        cornerRadius: CGFloat = KTTheme.Metrics.cornerRadiusCard,
        borderColor: Color = .ktCardBorder,
        backgroundColor: Color = .ktCardSurface
    ) -> some View {
        self.modifier(KTCardModifier(
            padding: padding,
            cornerRadius: cornerRadius,
            borderColor: borderColor,
            backgroundColor: backgroundColor
        ))
    }

    /// Dual-layered subtle shadow matching prototype box-shadow
    public func ktCardShadow() -> some View {
        self
            .shadow(color: Color.black.opacity(0.03), radius: 4, x: 0, y: 2)
            .shadow(color: Color.black.opacity(0.02), radius: 1.5, x: 0, y: 1)
    }
}
