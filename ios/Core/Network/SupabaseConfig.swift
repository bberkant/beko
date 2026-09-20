import Foundation

/// Supabase connection and authorization configuration constants for DARS iOS.
public struct SupabaseConfig {
    public static let url = URL(string: "https://zubhjybqzcpplultpsgt.supabase.co")!
    public static let publishableKey = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG"
    public static var apiKey: String { publishableKey }
    public static let defaultOrganizationId = UUID(uuidString: "13b8da90-27d1-440d-a8f4-eb50dadd6391")!
    public static let adminEmail = "admin@ops360.local"
    public static let adminPassword = "123berkant_"

    /// Generates standard PostgREST REST endpoint URL for a given table name.
    public static func restURL(for table: String) -> URL {
        return url.appendingPathComponent("rest/v1").appendingPathComponent(table)
    }

    /// Generates password grant authentication endpoint URL.
    public static var authURL: URL {
        var components = URLComponents(url: url.appendingPathComponent("auth/v1/token"), resolvingAgainstBaseURL: true)!
        components.queryItems = [URLQueryItem(name: "grant_type", value: "password")]
        return components.url!
    }
}
