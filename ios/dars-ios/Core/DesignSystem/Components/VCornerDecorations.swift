import SwiftUI

/// Decorative corner arcs and geometrical shapes for Kuveyt Türk login aesthetics.
/// Designed for Kuveyt Türk Corporate Banking UI, rendering subtle navy and coral
/// arcs in the screen corners without intercepting touch interactions.
public struct VCornerDecorations: View {
    // Kuveyt Türk Brand Palette Tokens
    private let navyPrimary = Color(red: 0x00 / 255.0, green: 0x2D / 255.0, blue: 0x59 / 255.0)     // #002D59
    private let navyDark    = Color(red: 0x00 / 255.0, green: 0x22 / 255.0, blue: 0x44 / 255.0)     // #002244
    private let coral       = Color(red: 0xEA / 255.0, green: 0x38 / 255.0, blue: 0x29 / 255.0)     // #EA3829
    private let orange      = Color(red: 0xFF / 255.0, green: 0x98 / 255.0, blue: 0x00 / 255.0)     // #FF9800

    public init() {}

    public var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height

            ZStack {
                // MARK: - Top-Right Ambient Corner Arcs (Kuveyt Türk Banking Identity)
                
                // 1. Outer Coral Thin Arc
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [coral.opacity(0.35), coral.opacity(0.05)],
                            startPoint: .topTrailing,
                            endPoint: .bottomLeading
                        ),
                        lineWidth: 1.5
                    )
                    .frame(width: width * 0.95, height: width * 0.95)
                    .offset(x: width * 0.45, y: -height * 0.12)

                // 2. Primary Navy Radial Glow Bloom
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [navyPrimary.opacity(0.35), navyDark.opacity(0.0)],
                            center: .center,
                            startRadius: 10,
                            endRadius: width * 0.45
                        )
                    )
                    .frame(width: width * 0.85, height: width * 0.85)
                    .offset(x: width * 0.35, y: -height * 0.08)

                // 3. Inner Solid Navy Arc
                Circle()
                    .stroke(navyPrimary.opacity(0.30), lineWidth: 2)
                    .frame(width: width * 0.65, height: width * 0.65)
                    .offset(x: width * 0.35, y: -height * 0.05)

                // 4. Coral Dashed Precision Arc
                Circle()
                    .stroke(coral.opacity(0.25), style: StrokeStyle(lineWidth: 1.2, dash: [6, 6]))
                    .frame(width: width * 0.48, height: width * 0.48)
                    .offset(x: width * 0.30, y: -height * 0.02)

                // 5. Solid Geometric Corner Quarter-Circle Fill
                Path { path in
                    path.move(to: CGPoint(x: width, y: 0))
                    path.addArc(
                        center: CGPoint(x: width, y: 0),
                        radius: width * 0.30,
                        startAngle: .degrees(90),
                        endAngle: .degrees(180),
                        clockwise: false
                    )
                    path.closeSubpath()
                }
                .fill(
                    LinearGradient(
                        colors: [coral.opacity(0.12), coral.opacity(0.01)],
                        startPoint: .topTrailing,
                        endPoint: .bottomLeading
                    )
                )

                // MARK: - Bottom-Left Ambient Corner Arcs

                // 6. Bottom-Left Soft Navy Radial Bloom
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [navyPrimary.opacity(0.28), Color.clear],
                            center: .center,
                            startRadius: 20,
                            endRadius: width * 0.50
                        )
                    )
                    .frame(width: width * 0.90, height: width * 0.90)
                    .offset(x: -width * 0.40, y: height * 0.38)

                // 7. Bottom-Left Coral Stroke Ring
                Circle()
                    .stroke(
                        LinearGradient(
                            colors: [coral.opacity(0.25), Color.clear],
                            startPoint: .bottomLeading,
                            endPoint: .topTrailing
                        ),
                        lineWidth: 1.5
                    )
                    .frame(width: width * 0.70, height: width * 0.70)
                    .offset(x: -width * 0.35, y: height * 0.35)

                // 8. Bottom-Left Warm Orange Dashed Accent Arc
                Circle()
                    .stroke(orange.opacity(0.20), style: StrokeStyle(lineWidth: 1.0, dash: [4, 8]))
                    .frame(width: width * 0.50, height: width * 0.50)
                    .offset(x: -width * 0.25, y: height * 0.32)

                // 9. Diagonal Corporate Geometric Accent Lines
                Path { path in
                    path.move(to: CGPoint(x: 0, y: height * 0.78))
                    path.addLine(to: CGPoint(x: width * 0.25, y: height * 0.86))
                    path.addLine(to: CGPoint(x: width * 0.15, y: height * 0.96))
                }
                .stroke(navyPrimary.opacity(0.20), lineWidth: 1.2)
            }
        }
        .allowsHitTesting(false)
        .ignoresSafeArea()
    }
}

#if DEBUG
struct VCornerDecorations_Previews: PreviewProvider {
    static var previews: some View {
        ZStack {
            Color(red: 0x00 / 255.0, green: 0x1F / 255.0, blue: 0x3F / 255.0)
                .ignoresSafeArea()
            VCornerDecorations()
        }
    }
}
#endif
