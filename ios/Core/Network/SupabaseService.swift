import Foundation

public struct SupabaseConfig {
    public static let url = URL(string: "https://zubhjybqzcpplultpsgt.supabase.co")!
    public static let apiKey = "sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG"
    public static let organizationId = "13b8da90-27d1-440d-a8f4-eb50dadd6391"
}

public class SupabaseService {
    public static let shared = SupabaseService()
    
    private init() {}
    
    // Generic PostgREST Query via REST API
    public func fetch<T: Decodable>(
        table: String,
        select: String = "*",
        filter: [String: String] = [:],
        orderBy: String? = nil,
        ascending: Bool = true,
        limit: Int? = nil
    ) async throws -> [T] {
        var components = URLComponents(url: SupabaseConfig.url.appendingPathComponent("rest/v1/\(table)"), resolvingAgainstBaseURL: true)!
        
        var queryItems = [URLQueryItem(name: "select", value: select)]
        
        // Organization ID isolation
        queryItems.append(URLQueryItem(name: "organization_id", value: "eq.\(SupabaseConfig.organizationId)"))
        
        for (key, value) in filter {
            queryItems.append(URLQueryItem(name: key, value: value))
        }
        
        if let orderBy = orderBy {
            queryItems.append(URLQueryItem(name: "order", value: "\(orderBy).\(ascending ? "asc" : "desc")"))
        }
        
        if let limit = limit {
            queryItems.append(URLQueryItem(name: "limit", value: "\(limit)"))
        }
        
        components.queryItems = queryItems
        
        guard let requestUrl = components.url else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: requestUrl)
        request.httpMethod = "GET"
        request.setValue(SupabaseConfig.apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(SupabaseConfig.apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            let errorMsg = String(data: data, encoding: .utf8) ?? "Unknown server error"
            throw NSError(domain: "SupabaseService", code: (response as? HTTPURLResponse)?.statusCode ?? 500, userInfo: [NSLocalizedDescriptionKey: errorMsg])
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .useDefaultKeys
        return try decoder.decode([T].self, from: data)
    }
}
