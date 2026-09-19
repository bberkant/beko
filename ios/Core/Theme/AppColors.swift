import SwiftUI

public enum AppColors {
    // MARK: - Corporate Brand Colors (Solid Navy, Zero Gradients)
    public static let primary = Color(red: 0x00 / 255.0, green: 0x2D / 255.0, blue: 0x59 / 255.0) // #002D59
    public static let primaryDark = Color(red: 0x00 / 255.0, green: 0x1F / 255.0, blue: 0x3F / 255.0) // #001F3F
    public static let primaryLight = Color(red: 0x0A / 255.0, green: 0x4B / 255.0, blue: 0x8C / 255.0) // #0A4B8C

    // MARK: - Semantic Colors
    public static let success = Color(red: 0x05 / 255.0, green: 0x96 / 255.0, blue: 0x69 / 255.0) // Emerald 600
    public static let warning = Color(red: 0xD9 / 255.0, green: 0x77 / 255.0, blue: 0x06 / 255.0) // Amber 600
    public static let danger = Color(red: 0xDC / 255.0, green: 0x26 / 255.0, blue: 0x26 / 255.0)  // Red 600
    public static let info = Color(red: 0x02 / 255.0, green: 0x84 / 255.0, blue: 0xC7 / 255.0)    // Sky 600

    // MARK: - Slate Grayscale
    public static let textPrimary = Color(red: 0x0F / 255.0, green: 0x17 / 255.0, blue: 0x2A / 255.0)   // Slate 900
    public static let textSecondary = Color(red: 0x47 / 255.0, green: 0x55 / 255.0, blue: 0x69 / 255.0) // Slate 600
    public static let textMuted = Color(red: 0x94 / 255.0, green: 0xA3 / 255.0, blue: 0xB8 / 255.0)     // Slate 400

    // MARK: - Backgrounds & Surfaces
    public static let background = Color(red: 0xF8 / 255.0, green: 0xFA / 255.0, blue: 0xFC / 255.0)    // Slate 50
    public static let surface = Color.white
    public static let border = Color(red: 0xE2 / 255.0, green: 0xE8 / 255.0, blue: 0xF0 / 255.0)        // Slate 200
    public static let divider = Color(red: 0xF1 / 255.0, green: 0xF5 / 255.0, blue: 0xF9 / 255.0)       // Slate 100
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
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
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
