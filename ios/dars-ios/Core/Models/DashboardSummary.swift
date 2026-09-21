import Foundation

/// Swift domain summary model representing aggregated executive metrics for the Ana Sayfa (Dashboard).
/// Conforms to `Codable`, `Sendable`, and `Equatable`.
public struct DashboardSummary: Codable, Sendable, Equatable {
    public var totalBalance: Double
    public var totalReceivable: Double
    public var totalPayable: Double
    public var dailyCheckTotal: Double
    public var monthlyKesimCount: Int
    public var liveSyncPulse: Bool

    public init(
        totalBalance: Double = 0.0,
        totalReceivable: Double = 0.0,
        totalPayable: Double = 0.0,
        dailyCheckTotal: Double = 0.0,
        monthlyKesimCount: Int = 0,
        liveSyncPulse: Bool = true
    ) {
        self.totalBalance = totalBalance
        self.totalReceivable = totalReceivable
        self.totalPayable = totalPayable
        self.dailyCheckTotal = dailyCheckTotal
        self.monthlyKesimCount = monthlyKesimCount
        self.liveSyncPulse = liveSyncPulse
    }

    enum CodingKeys: String, CodingKey {
        case totalBalance = "total_balance"
        case totalReceivable = "total_receivable"
        case totalPayable = "total_payable"
        case dailyCheckTotal = "daily_check_total"
        case monthlyKesimCount = "monthly_kesim_count"
        case liveSyncPulse = "live_sync_pulse"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.totalBalance = (try? container.decodeIfPresent(Double.self, forKey: .totalBalance)) ?? 0.0
        self.totalReceivable = (try? container.decodeIfPresent(Double.self, forKey: .totalReceivable)) ?? 0.0
        self.totalPayable = (try? container.decodeIfPresent(Double.self, forKey: .totalPayable)) ?? 0.0
        self.dailyCheckTotal = (try? container.decodeIfPresent(Double.self, forKey: .dailyCheckTotal)) ?? 0.0
        self.monthlyKesimCount = (try? container.decodeIfPresent(Int.self, forKey: .monthlyKesimCount)) ?? 0
        self.liveSyncPulse = (try? container.decodeIfPresent(Bool.self, forKey: .liveSyncPulse)) ?? true
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(totalBalance, forKey: .totalBalance)
        try container.encode(totalReceivable, forKey: .totalReceivable)
        try container.encode(totalPayable, forKey: .totalPayable)
        try container.encode(dailyCheckTotal, forKey: .dailyCheckTotal)
        try container.encode(monthlyKesimCount, forKey: .monthlyKesimCount)
        try container.encode(liveSyncPulse, forKey: .liveSyncPulse)
    }
}
