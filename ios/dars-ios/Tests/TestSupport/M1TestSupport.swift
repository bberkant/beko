import Foundation
import SwiftUI
@testable import dars_ios

/// Shared test environment configuration and constants for Milestone 1 unit tests.
public enum M1TestSupport {
    /// Target platform specification invariants
    public static let targetPlatform = "iOS 17.0"
    public static let testBundleIdentifier = "com.amasyaetas.mobileTests"
    public static let appBundleIdentifier = "com.amasyaetas.mobile"
    public static let developmentTeam = "WGARWL7QZ4"
    public static let defaultSwiftVersion = "5.9"

    /// Verified Kuveyt Türk hex color specifications
    public static let kuveytNavyHex = "#002D59"
    public static let kuveytCoralHex = "#EA3829"
    public static let kuveytOrangeHex = "#FF9800"
    public static let kuveytPageBgHex = "#F8FAFC"

    /// Utility to verify hex string normalization
    public static func normalizeHex(_ hex: String) -> String {
        var clean = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if clean.hasPrefix("#") {
            clean.removeFirst()
        }
        return clean
    }
}
