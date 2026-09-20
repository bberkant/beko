import Foundation

// MARK: - Supabase Errors

/// Supabase network and authentication error definitions.
public enum SupabaseError: LocalizedError, Sendable {
    case invalidURL
    case invalidCredentials
    case unauthorized
    case serverError(statusCode: Int, message: String)
    case decodingError(String)
    case networkError(String)
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Geçersiz Supabase URL formatı."
        case .invalidCredentials:
            return "Kimlik doğrulama başarısız. Hatalı kullanıcı adı veya şifre."
        case .unauthorized:
            return "Yetkisiz erişim (401). Token doğrulanamadı veya oturum süresi doldu."
        case .serverError(let code, let msg):
            return "Sunucu hatası (\(code)): \(msg)"
        case .decodingError(let msg):
            return "Veri ayrıştırma hatası: \(msg)"
        case .networkError(let msg):
            return "Ağ bağlantı hatası: \(msg)"
        }
    }
}

// MARK: - Query Enums

/// Cheque direction type
public enum CheckType: String, Codable, Sendable, CaseIterable {
    case alinan = "alinan"
    case kesilen = "kesilen"
}

/// Cheque status in live database
public enum CheckStatus: String, Codable, Sendable, CaseIterable {
    case odendi = "Ödendi"
    case tahsilde = "Tahsilde"
    case teminataVerildi = "Teminata Verildi"
    case portfoyde = "Portföyde"
    case bankadaTahsilde = "Bankada Tahsilde"
    case geriAlindi = "Geri Alındı"
    case ciroEdildi = "Ciro Edildi"
}

// MARK: - JWT Authentication & Tokens

/// Specific authentication parsing and validation errors.
public enum SupabaseAuthError: LocalizedError, Sendable, Equatable {
    case malformedToken
    case invalidBase64Encoding
    case invalidPayload
    case expiredToken
    
    public var errorDescription: String? {
        switch self {
        case .malformedToken:
            return "JWT yapısı geçersiz. 3 parçadan oluşmalıdır."
        case .invalidBase64Encoding:
            return "Base64 ayrıştırma hatası."
        case .invalidPayload:
            return "JWT payload geçerli JSON değil."
        case .expiredToken:
            return "JWT token süresi doldu."
        }
    }
}

/// Decoded claims from JWT payload.
public struct JWTClaims: Codable, Sendable, Equatable {
    public let email: String?
    public let role: String?
    public let sub: String?
    public let exp: Int?
    
    public init(email: String? = nil, role: String? = nil, sub: String? = nil, exp: Int? = nil) {
        self.email = email
        self.role = role
        self.sub = sub
        self.exp = exp
    }
}

/// Authenticated Supabase session token wrapper with expiration tracking.
public struct SupabaseAuthToken: Codable, Sendable {
    public let accessToken: String
    public let tokenType: String
    public let expiresIn: Int
    public let expirationDate: Date
    public let email: String?
    public let role: String?
    public let userId: String?
    
    public var isExpired: Bool {
        return expirationDate <= Date()
    }
    
    public var timeRemaining: TimeInterval {
        return expirationDate.timeIntervalSince(Date())
    }
    
    public init(
        accessToken: String,
        tokenType: String = "bearer",
        expiresIn: Int = 3600,
        expirationDate: Date,
        email: String? = nil,
        role: String? = nil,
        userId: String? = nil
    ) {
        self.accessToken = accessToken
        self.tokenType = tokenType
        self.expiresIn = expiresIn
        self.expirationDate = expirationDate
        self.email = email
        self.role = role
        self.userId = userId
    }
    
    /// Parses a raw JWT string into decoded claims without external dependencies.
    public static func parseJWT(_ token: String) throws -> JWTClaims {
        let parts = token.components(separatedBy: ".")
        guard parts.count == 3 else {
            throw SupabaseAuthError.malformedToken
        }
        
        var base64 = parts[1]
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        let remainder = base64.count % 4
        if remainder > 0 {
            base64.append(String(repeating: "=", count: 4 - remainder))
        }
        
        guard let data = Data(base64Encoded: base64) else {
            throw SupabaseAuthError.invalidBase64Encoding
        }
        
        do {
            let decoder = JSONDecoder()
            return try decoder.decode(JWTClaims.self, from: data)
        } catch {
            throw SupabaseAuthError.invalidPayload
        }
    }
}

// MARK: - PostgREST Query Filter Builder

/// Helper for constructing PostgREST URL filter strings and query URLs.
public struct SupabaseQueryFilter: Sendable {
    public static func dueDateEquals(_ date: String) -> String {
        return "due_date=eq.\(date)"
    }
    
    public static func dueDateRange(from: String, to: String) -> String {
        return "due_date=gte.\(from)&due_date=lte.\(to)"
    }
    
    public static func isIcTakas(_ value: Bool) -> String {
        return "is_ic_takas=eq.\(value)"
    }
    
    public static func balanceGreaterThan(_ value: Double) -> String {
        let formatted = value.truncatingRemainder(dividingBy: 1) == 0 ? "\(Int(value))" : "\(value)"
        return "balance=gt.\(formatted)"
    }
    
    public static func balanceLessThan(_ value: Double) -> String {
        let formatted = value.truncatingRemainder(dividingBy: 1) == 0 ? "\(Int(value))" : "\(value)"
        return "balance=lt.\(formatted)"
    }
    
    public static func balanceEquals(_ value: Double) -> String {
        let formatted = value.truncatingRemainder(dividingBy: 1) == 0 ? "\(Int(value))" : "\(value)"
        return "balance=eq.\(formatted)"
    }
    
    public static func buildURL(
        table: String,
        select: String = "*",
        filters: [String: String] = [:],
        order: String? = nil,
        limit: Int? = nil,
        offset: Int? = nil
    ) -> URL {
        let endpoint = SupabaseConfig.restURL(for: table)
        var components = URLComponents(url: endpoint, resolvingAgainstBaseURL: true)!
        var items = [URLQueryItem(name: "select", value: select)]
        
        for (key, value) in filters.sorted(by: { $0.key < $1.key }) {
            items.append(URLQueryItem(name: key, value: value))
        }
        
        if let order = order {
            items.append(URLQueryItem(name: "order", value: order))
        }
        if let limit = limit {
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))
        }
        if let offset = offset {
            items.append(URLQueryItem(name: "offset", value: "\(offset)"))
        }
        
        components.queryItems = items
        return components.url!
    }
}

// MARK: - SupabaseService Actor

/// Live Supabase REST and JWT Authentication Networking Service.
/// Implemented as a thread-safe Swift actor with in-memory token caching,
/// thundering herd protection, and automatic HTTP 401 re-authentication retry.
public actor SupabaseService {
    public static let shared = SupabaseService()
    
    private let baseURL: URL
    private let apiKey: String
    private let session: URLSession
    
    private var accessToken: String?
    private var tokenExpiry: Date?
    private var authTask: Task<String, Error>?
    
    public init(
        baseURL: URL = SupabaseConfig.url,
        apiKey: String = SupabaseConfig.publishableKey,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        self.session = session
    }
    
    // MARK: - Authentication & Token Caching
    
    /// Returns active JWT access token; refreshes if expired or forced.
    @discardableResult
    public func authenticate(forceRefresh: Bool = false) async throws -> String {
        if !forceRefresh, let token = accessToken, let expiry = tokenExpiry, expiry > Date() {
            return token
        }
        
        // Thundering herd protection: wait for existing Task if already in flight
        if let existingTask = authTask {
            return try await existingTask.value
        }
        
        let task = Task<String, Error> {
            let authUrl = SupabaseConfig.authURL
            var request = URLRequest(url: authUrl)
            request.httpMethod = "POST"
            request.setValue(apiKey, forHTTPHeaderField: "apikey")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let payload: [String: String] = [
                "grant_type": "password",
                "email": SupabaseConfig.adminEmail,
                "password": SupabaseConfig.adminPassword
            ]
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
            
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
                throw SupabaseError.invalidCredentials
            }
            
            struct AuthPayload: Decodable {
                let access_token: String
                let expires_in: Int
            }
            
            let decoded = try JSONDecoder().decode(AuthPayload.self, from: data)
            return decoded.access_token
        }
        
        self.authTask = task
        do {
            let token = try await task.value
            self.accessToken = token
            // Cache with 60-second safety buffer (3540 seconds)
            self.tokenExpiry = Date().addingTimeInterval(3540)
            self.authTask = nil
            return token
        } catch {
            self.authTask = nil
            throw error
        }
    }
    
    /// Assures that the session is authenticated and ready.
    public func ensureAuthenticated() async throws -> String {
        return try await authenticate(forceRefresh: false)
    }
    
    // MARK: - Centralized Request Engine with 401 Re-Auth
    
    private func performRequest<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        queryItems: [URLQueryItem] = [],
        body: Data? = nil,
        retryOn401: Bool = true
    ) async throws -> T {
        let token = try await ensureAuthenticated()
        
        guard var components = URLComponents(url: baseURL.appendingPathComponent(endpoint), resolvingAgainstBaseURL: true) else {
            throw SupabaseError.invalidURL
        }
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            throw SupabaseError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(apiKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw SupabaseError.networkError(error.localizedDescription)
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SupabaseError.networkError("Geçersiz sunucu yanıtı.")
        }
        
        // Auto re-authenticate once on HTTP 401
        if httpResponse.statusCode == 401 && retryOn401 {
            self.accessToken = nil
            self.tokenExpiry = nil
            self.authTask = nil
            _ = try await authenticate(forceRefresh: true)
            return try await performRequest(
                endpoint: endpoint,
                method: method,
                queryItems: queryItems,
                body: body,
                retryOn401: false
            )
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorText = String(data: data, encoding: .utf8) ?? "Bilinmeyen sunucu hatası"
            if httpResponse.statusCode == 401 {
                throw SupabaseError.unauthorized
            }
            throw SupabaseError.serverError(statusCode: httpResponse.statusCode, message: errorText)
        }
        
        do {
            let decoder = JSONDecoder()
            return try decoder.decode(T.self, from: data)
        } catch {
            let rawSnippet = String(data: data, encoding: .utf8)?.prefix(150) ?? ""
            throw SupabaseError.decodingError("\(error.localizedDescription) | Raw: \(rawSnippet)")
        }
    }
    
    // MARK: - Public Milestone 2 Query Methods
    
    /// 1. Fetch Current Accounts with search query and pagination support.
    public func fetchCariler(query: String? = nil, limit: Int = 100, offset: Int = 0) async throws -> [VegaCari] {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)"),
            URLQueryItem(name: "order", value: "balance.desc")
        ]
        if let q = query?.trimmingCharacters(in: .whitespacesAndNewlines), !q.isEmpty {
            queryItems.append(URLQueryItem(name: "or", value: "(name.ilike.*\(q)*,code.ilike.*\(q)*)"))
        }
        return try await performRequest(endpoint: "rest/v1/vega_cariler", queryItems: queryItems)
    }
    
    /// 2. Fetch Cheques and Promissory Notes with type and status filtering.
    public func fetchChecks(type: CheckType? = nil, status: CheckStatus? = nil, limit: Int = 100, offset: Int = 0) async throws -> [EBSCheck] {
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "due_date.asc"),
            URLQueryItem(name: "limit", value: "\(limit)"),
            URLQueryItem(name: "offset", value: "\(offset)")
        ]
        if let type = type {
            queryItems.append(URLQueryItem(name: "check_type", value: "eq.\(type.rawValue)"))
        }
        if let status = status {
            queryItems.append(URLQueryItem(name: "status", value: "eq.\(status.rawValue)"))
        }
        return try await performRequest(endpoint: "rest/v1/ebs_checks", queryItems: queryItems)
    }
    
    /// 3. Fetch Treasury & Cheque Financing Records.
    public func fetchCektenRecords() async throws -> [CektenHesap] {
        let queryItems = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "date.desc,created_at.desc")
        ]
        return try await performRequest(endpoint: "rest/v1/cekten_hesabi", queryItems: queryItems)
    }
    
    /// 4. Fetch Slaughter Records from kesim_listesi.
    public func fetchKesimRecords(limit: Int = 100) async throws -> [KesimItem] {
        let queryItems = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "slaughter_date.desc"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        return try await performRequest(endpoint: "rest/v1/kesim_listesi", queryItems: queryItems)
    }
    
    /// 5. Fetch Fleet Vehicles.
    public func fetchVehicles() async throws -> [Vehicle] {
        let queryItems = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "plate.asc")
        ]
        return try await performRequest(endpoint: "rest/v1/vehicles", queryItems: queryItems)
    }
    
    /// 6. Fetch Bank Account Balances.
    public func fetchBankAccounts() async throws -> [BankAccount] {
        let queryItems = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "bank.asc")
        ]
        return try await performRequest(endpoint: "rest/v1/bank_accounts", queryItems: queryItems)
    }
    
    /// 7. Fetch Corporate Credit Cards.
    public func fetchCreditCards() async throws -> [CreditCard] {
        let queryItems = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "bank.asc")
        ]
        return try await performRequest(endpoint: "rest/v1/credit_cards", queryItems: queryItems)
    }
    
    /// 8. Fetch Consolidated Executive Dashboard Summary via concurrent queries.
    public func fetchDashboardSummary() async throws -> DashboardSummary {
        async let banksTask = fetchBankAccounts()
        async let cardsTask = fetchCreditCards()
        async let carilerTask = fetchCariler(query: nil, limit: 500, offset: 0)
        async let checksTask = fetchChecks(type: nil, status: nil, limit: 50, offset: 0)
        async let kesimTask = fetchKesimRecords(limit: 50)
        
        let (banks, cards, cariler, checks, kesim) = try await (banksTask, cardsTask, carilerTask, checksTask, kesimTask)
        
        let totalBalance = banks.reduce(0.0) { $0 + $1.balance }
        let totalReceivable = cariler.filter { $0.balance > 0 }.reduce(0.0) { $0 + $1.balance }
        let totalPayable = cariler.filter { $0.balance < 0 }.reduce(0.0) { $0 + abs($1.balance) } + cards.reduce(0.0) { $0 + $1.currentDebt }
        let dailyCheckTotal = checks.reduce(0.0) { $0 + $1.amount }
        let monthlyKesimCount = kesim.count
        
        return DashboardSummary(
            totalBalance: totalBalance,
            totalReceivable: totalReceivable,
            totalPayable: totalPayable,
            dailyCheckTotal: dailyCheckTotal,
            monthlyKesimCount: monthlyKesimCount,
            liveSyncPulse: true
        )
    }
}
