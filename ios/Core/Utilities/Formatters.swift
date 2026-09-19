import Foundation

public enum Formatters {
    // MARK: - Turkish Currency (TRY / TL)
    public static func currency(_ amount: Double, showSymbol: Bool = true) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: "tr_TR")
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        
        let formatted = formatter.string(from: NSNumber(value: amount)) ?? "\(amount)"
        return showSymbol ? "\(formatted) TL" : formatted
    }
    
    // MARK: - Turkish Number Formatting
    public static func number(_ value: Double, decimals: Int = 0) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: "tr_TR")
        formatter.minimumFractionDigits = decimals
        formatter.maximumFractionDigits = decimals
        return formatter.string(from: NSNumber(value: value)) ?? "\(value)"
    }
    
    // MARK: - Date Formatting
    public static func formatDate(_ date: Date, format: String = "dd.MM.yyyy") -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr_TR")
        formatter.dateFormat = format
        return formatter.string(from: date)
    }
    
    public static func parseDate(_ dateString: String) -> Date? {
        let formats = ["yyyy-MM-dd", "dd.MM.yyyy", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ss.SSSZ"]
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr_TR")
        
        for format in formats {
            formatter.dateFormat = format
            if let date = formatter.date(from: dateString) {
                return date
            }
        }
        return nil
    }
    
    // MARK: - Remaining Days Calculation
    public static func daysRemaining(from dateString: String) -> Int {
        guard let date = parseDate(dateString) else { return 0 }
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())
        let startOfTarget = calendar.startOfDay(for: date)
        let components = calendar.dateComponents([.day], from: startOfToday, to: startOfTarget)
        return components.day ?? 0
    }
}
