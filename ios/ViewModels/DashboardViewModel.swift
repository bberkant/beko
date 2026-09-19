import Foundation
import SwiftUI

@MainActor
public class DashboardViewModel: ObservableObject {
    @Published public var totalCashInBanks: Double = 18450000.0 // 18.45M TL
    @Published public var todayCheckDue: Double = 2917696.0     // 2.91M TL
    @Published public var tomorrowCheckDue: Double = 25732670.0 // 25.73M TL
    @Published public var weeklyCheckDue: Double = 48401045.0   // 48.40M TL
    @Published public var activeVehicleCount: Int = 63
    @Published public var criticalInspectionCount: Int = 3
    @Published public var activeTendersCount: Int = 199
    
    public init() {}
    
    public var formattedCash: String {
        Formatters.currency(totalCashInBanks)
    }
    
    public var formattedTodayDue: String {
        Formatters.currency(todayCheckDue)
    }
    
    public var formattedTomorrowDue: String {
        Formatters.currency(tomorrowCheckDue)
    }
    
    public var formattedWeeklyDue: String {
        Formatters.currency(weeklyCheckDue)
    }
}
