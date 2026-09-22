import SwiftUI
import WebKit
import UserNotifications
import Foundation

// MARK: - Native Notification Manager (Kilit Ekranı & Arka Plan Bildirimleri)
class NotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()
    
    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }
    
    /// Kilit ekranı banner, ses ve rozet bildirim izinlerini kullanıcıdan açıkça talep eder
    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                print("[DARS] Kilit ekranı bildirim izni başarıyla verildi.")
                DispatchQueue.main.async {
                    self.scheduleAllFinancialReminders()
                }
            } else if let error = error {
                print("[DARS] Bildirim izin hatası: \(error.localizedDescription)")
            }
        }
    }
    
    /// Her gün sabah 09:00'da kilit ekranında çalan otomatik günlük finans özeti
    func scheduleDailyMorningSummary(hour: Int = 9, minute: Int = 0) {
        let content = UNMutableNotificationContent()
        content.title = "☀️ DARS Günlük Finansal Özet"
        content.body = "Bugün vadesi gelen çeklerinizi, kredi kartı ekstrelerinizi ve kasa hareketlerini inceleyin."
        content.sound = .default
        content.badge = 1
        content.userInfo = ["type": "daily_summary", "targetScreen": "dashboard"]
        
        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute
        
        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)
        let request = UNNotificationRequest(identifier: "daily_financial_morning_summary", content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[DARS] Günlük bildirim hatası: \(error.localizedDescription)")
            } else {
                print("[DARS] Günlük \(String(format: "%02d:%02d", hour, minute)) kilit ekranı bildirimi başarıyla kuruldu.")
            }
        }
    }
    
    /// Kredi kartı ekstre son ödeme tarihi için aylık tekrarlayan 2 gün önce ve son ödeme günü sabah 09:00 bildirimleri
    func scheduleCreditCardReminder(
        id: String,
        bank: String,
        cardName: String,
        dueDay: Int,
        debt: Double? = nil,
        minPayment: Double? = nil
    ) {
        let validDueDay = max(1, min(31, dueDay))
        let debtStr = debt != nil ? " Güncel Borç: \(formatCurrency(debt!))" : ""
        let minPayStr = minPayment != nil ? " Asgari Tutar: \(formatCurrency(minPayment!))" : ""
        
        // 1. 2 Gün Önceden Hatırlatma (Aylık Tekrarlayan, 09:00 AM)
        var advanceDay = validDueDay - 2
        if advanceDay <= 0 {
            advanceDay = 30 + advanceDay // dueDay 1 -> 29, dueDay 2 -> 30
        }
        var advComponents = DateComponents()
        advComponents.day = advanceDay
        advComponents.hour = 9
        advComponents.minute = 0
        
        let advContent = UNMutableNotificationContent()
        advContent.title = "💳 Kredi Kartı Son Ödeme Uyarısı"
        advContent.body = "\(bank) \(cardName) son ödeme gününe 2 gün kaldı.\(debtStr)"
        advContent.sound = .default
        advContent.badge = 1
        advContent.userInfo = ["type": "credit-card", "id": id, "dueDay": validDueDay, "targetScreen": "credit_cards"]
        
        let advTrigger = UNCalendarNotificationTrigger(dateMatching: advComponents, repeats: true)
        let advRequest = UNNotificationRequest(identifier: "cc_advance_\(id)", content: advContent, trigger: advTrigger)
        UNUserNotificationCenter.current().add(advRequest) { error in
            if let error = error {
                print("[DARS] Kredi kartı 2 gün önce bildirimi hatası: \(error.localizedDescription)")
            }
        }
        
        // 2. Son Ödeme Günü Bildirimi (Aylık Tekrarlayan, 09:00 AM)
        var dueComponents = DateComponents()
        dueComponents.day = validDueDay
        dueComponents.hour = 9
        dueComponents.minute = 0
        
        let dueContent = UNMutableNotificationContent()
        dueContent.title = "💳 Kredi Kartı Son Ödeme Günü"
        dueContent.body = "Bugün \(bank) \(cardName) son ödeme günüdür.\(minPayStr.isEmpty ? debtStr : minPayStr)"
        dueContent.sound = .default
        dueContent.badge = 1
        dueContent.userInfo = ["type": "credit-card", "id": id, "dueDay": validDueDay, "targetScreen": "credit_cards"]
        
        let dueTrigger = UNCalendarNotificationTrigger(dateMatching: dueComponents, repeats: true)
        let dueRequest = UNNotificationRequest(identifier: "cc_due_\(id)", content: dueContent, trigger: dueTrigger)
        UNUserNotificationCenter.current().add(dueRequest) { error in
            if let error = error {
                print("[DARS] Kredi kartı son ödeme günü bildirimi hatası: \(error.localizedDescription)")
            }
        }
    }
    
    /// Vadesi gelen çekler için 2 gün önceden ve vade günü sabah 09:00'da kilit ekranı uyarısı planlar
    func scheduleCheckReminder(
        id: String,
        checkNumber: String = "",
        bankName: String = "",
        drawer: String = "",
        amount: Double = 0.0,
        dueDate: String,
        checkType: String = "alinan"
    ) {
        guard let targetDate = parseDate(dueDate) else {
            print("[DARS] Çek vadesi ayrıştırılamadı: \(dueDate)")
            return
        }
        
        let calendar = Calendar.current
        let now = Date()
        let isKesilen = checkType.lowercased() == "kesilen"
        let actionWord = isKesilen ? "ödeme" : "tahsilat"
        let amountStr = formatCurrency(amount)
        let details = "\(bankName.isEmpty ? "" : bankName + " - ")\(drawer.isEmpty ? "" : drawer + " - ")\(amountStr)"
        
        // 1. 2 Gün Önceden Hatırlatma (09:00 AM)
        if let advanceDate = calendar.date(byAdding: .day, value: -2, to: targetDate) {
            var advComponents = calendar.dateComponents([.year, .month, .day], from: advanceDate)
            advComponents.hour = 9
            advComponents.minute = 0
            if let fireDate = calendar.date(from: advComponents), fireDate > now {
                let content = UNMutableNotificationContent()
                content.title = "🚨 Çek Vadesi Yaklaşıyor (2 Gün Kaldı)"
                content.body = "\(isKesilen ? "Ödenecek" : "Tahsil edilecek") çek vadesine 2 gün kaldı: \(details)"
                content.sound = .default
                content.badge = 1
                content.userInfo = ["type": "check", "id": id, "dueDate": dueDate, "targetScreen": "checks"]
                
                let trigger = UNCalendarNotificationTrigger(dateMatching: advComponents, repeats: false)
                let request = UNNotificationRequest(identifier: "check_advance_\(id)", content: content, trigger: trigger)
                UNUserNotificationCenter.current().add(request) { error in
                    if let error = error {
                        print("[DARS] Çek 2 gün önce bildirimi hatası: \(error.localizedDescription)")
                    }
                }
            }
        }
        
        // 2. Vade Günü Bildirimi (09:00 AM)
        var dueComponents = calendar.dateComponents([.year, .month, .day], from: targetDate)
        dueComponents.hour = 9
        dueComponents.minute = 0
        if let fireDate = calendar.date(from: dueComponents), fireDate > now {
            let content = UNMutableNotificationContent()
            content.title = "🚨 Çek Vadesi Bugün!"
            content.body = "Bugün vadesi dolan \(actionWord) çeki: \(details)"
            content.sound = .default
            content.badge = 1
            content.userInfo = ["type": "check", "id": id, "dueDate": dueDate, "targetScreen": "checks"]
            
            let trigger = UNCalendarNotificationTrigger(dateMatching: dueComponents, repeats: false)
            let request = UNNotificationRequest(identifier: "check_due_\(id)", content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(request) { error in
                if let error = error {
                    print("[DARS] Çek vade günü bildirimi hatası: \(error.localizedDescription)")
                }
            }
        }
    }
    
    /// Araç muayene ve sigorta yenileme tarihleri için 2 gün önceden sabah 09:00'da kilit ekranı bildirimi planlar
    func scheduleVehicleReminder(
        id: String,
        plate: String,
        brand: String = "",
        model: String = "",
        inspectionDate: String? = nil,
        insuranceDate: String? = nil
    ) {
        let calendar = Calendar.current
        let now = Date()
        let vehicleDesc = "\(plate)\(brand.isEmpty ? "" : " (" + brand + (model.isEmpty ? "" : " " + model) + ")")"
        
        // 1. Muayene Hatırlatması (2 gün önce 09:00 AM)
        if let inspStr = inspectionDate, let inspDate = parseDate(inspStr) {
            if let advanceDate = calendar.date(byAdding: .day, value: -2, to: inspDate) {
                var advComponents = calendar.dateComponents([.year, .month, .day], from: advanceDate)
                advComponents.hour = 9
                advComponents.minute = 0
                if let fireDate = calendar.date(from: advComponents), fireDate > now {
                    let content = UNMutableNotificationContent()
                    content.title = "🚗 TÜVTÜRK Muayene Vadesi Yaklaşıyor"
                    content.body = "\(vehicleDesc) periyodik araç muayenesine 2 gün kaldı (\(inspStr))."
                    content.sound = .default
                    content.badge = 1
                    content.userInfo = ["type": "vehicle_inspection", "id": id, "plate": plate, "targetScreen": "vehicles"]
                    
                    let trigger = UNCalendarNotificationTrigger(dateMatching: advComponents, repeats: false)
                    let request = UNNotificationRequest(identifier: "veh_inspection_\(id)", content: content, trigger: trigger)
                    UNUserNotificationCenter.current().add(request) { error in
                        if let error = error {
                            print("[DARS] Araç muayene bildirimi hatası: \(error.localizedDescription)")
                        }
                    }
                }
            }
        }
        
        // 2. Sigorta Yenileme Hatırlatması (2 gün önce 09:00 AM)
        if let insStr = insuranceDate, let insDate = parseDate(insStr) {
            if let advanceDate = calendar.date(byAdding: .day, value: -2, to: insDate) {
                var advComponents = calendar.dateComponents([.year, .month, .day], from: advanceDate)
                advComponents.hour = 9
                advComponents.minute = 0
                if let fireDate = calendar.date(from: advComponents), fireDate > now {
                    let content = UNMutableNotificationContent()
                    content.title = "📋 Trafik Sigortası Yenileme"
                    content.body = "\(vehicleDesc) zorunlu trafik sigortası 2 gün sonra sona eriyor (\(insStr))."
                    content.sound = .default
                    content.badge = 1
                    content.userInfo = ["type": "vehicle_insurance", "id": id, "plate": plate, "targetScreen": "vehicles"]
                    
                    let trigger = UNCalendarNotificationTrigger(dateMatching: advComponents, repeats: false)
                    let request = UNNotificationRequest(identifier: "veh_insurance_\(id)", content: content, trigger: trigger)
                    UNUserNotificationCenter.current().add(request) { error in
                        if let error = error {
                            print("[DARS] Araç sigorta bildirimi hatası: \(error.localizedDescription)")
                        }
                    }
                }
            }
        }
    }
    
    /// Belirli bir takvim tarihi için UNCalendarNotificationTrigger ile kilit ekranı bildirimi planlar
    func scheduleCalendarNotification(
        title: String,
        body: String,
        identifier: String,
        dateString: String,
        advanceDays: Int = 0,
        hour: Int = 9,
        minute: Int = 0,
        badge: Int = 1,
        userInfo: [String: Any] = [:]
    ) {
        guard let targetDate = parseDate(dateString) else {
            print("[DARS] Geçersiz tarih formatı: \(dateString)")
            return
        }
        
        let calendar = Calendar.current
        let now = Date()
        
        let finalDate: Date
        if advanceDays > 0 {
            finalDate = calendar.date(byAdding: .day, value: -advanceDays, to: targetDate) ?? targetDate
        } else {
            finalDate = targetDate
        }
        
        var components = calendar.dateComponents([.year, .month, .day], from: finalDate)
        components.hour = hour
        components.minute = minute
        
        guard let fireDate = calendar.date(from: components), fireDate > now else {
            print("[DARS] Bildirim tarihi geçmişte kaldığı için planlanmadı: \(dateString)")
            return
        }
        
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = NSNumber(value: badge)
        content.userInfo = userInfo
        
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[DARS] Takvim bildirimi hatası (\(identifier)): \(error.localizedDescription)")
            } else {
                print("[DARS] Takvim kilit ekranı bildirimi başarıyla kuruldu [\(identifier)]: \(title)")
            }
        }
    }
    
    /// Genel tarih bazlı etkinlikler için 2 gün önce ve aynı gün 09:00 bildirim planlayıcı
    func scheduleAdvanceAndDueNotification(
        titlePrefix: String,
        bodyDetail: String,
        identifierPrefix: String,
        dateString: String,
        advanceDays: Int = 2,
        hour: Int = 9,
        minute: Int = 0,
        userInfo: [String: Any] = [:]
    ) {
        guard let targetDate = parseDate(dateString) else { return }
        let calendar = Calendar.current
        let now = Date()
        
        // 2 gün önceden hatırlatma
        if advanceDays > 0, let advanceDate = calendar.date(byAdding: .day, value: -advanceDays, to: targetDate) {
            var advComponents = calendar.dateComponents([.year, .month, .day], from: advanceDate)
            advComponents.hour = hour
            advComponents.minute = minute
            if let fireDate = calendar.date(from: advComponents), fireDate > now {
                let content = UNMutableNotificationContent()
                content.title = "\(titlePrefix) (\(advanceDays) Gün Kaldı)"
                content.body = bodyDetail
                content.sound = .default
                content.badge = 1
                content.userInfo = userInfo
                
                let trigger = UNCalendarNotificationTrigger(dateMatching: advComponents, repeats: false)
                let request = UNNotificationRequest(identifier: "\(identifierPrefix)_advance", content: content, trigger: trigger)
                UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
            }
        }
        
        // Vade günü hatırlatma
        var dueComponents = calendar.dateComponents([.year, .month, .day], from: targetDate)
        dueComponents.hour = hour
        dueComponents.minute = minute
        if let fireDate = calendar.date(from: dueComponents), fireDate > now {
            let content = UNMutableNotificationContent()
            content.title = titlePrefix
            content.body = bodyDetail
            content.sound = .default
            content.badge = 1
            content.userInfo = userInfo
            
            let trigger = UNCalendarNotificationTrigger(dateMatching: dueComponents, repeats: false)
            let request = UNNotificationRequest(identifier: "\(identifierPrefix)_due", content: content, trigger: trigger)
            UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
        }
    }
    
    /// Web frontend veya JS köprüsünden gelen tüm etkinlikleri toplu senkronize eder
    func syncAllEvents(events: [[String: Any]]) {
        print("[DARS] JS Köprüsünden \(events.count) adet etkinlik senkronize ediliyor...")
        
        for item in events {
            guard let id = item["id"] as? String ?? item["uuid"] as? String else { continue }
            let type = (item["type"] as? String ?? "").lowercased()
            let title = item["title"] as? String ?? "DARS Hatırlatıcı"
            let body = item["body"] as? String ?? ""
            let dateStr = item["date"] as? String ?? item["dueDate"] as? String ?? item["vade"] as? String
            let dueDay = item["dueDay"] as? Int ?? item["sonOdemeGunu"] as? Int
            let advanceDays = item["advanceDays"] as? Int ?? 2
            let amount = item["amount"] as? String ?? item["tutar"] as? String ?? ""
            let bank = item["bank"] as? String ?? item["banka"] as? String ?? ""
            let drawer = item["drawer"] as? String ?? item["kesideci"] as? String ?? ""
            let plate = item["plate"] as? String ?? item["plaka"] as? String ?? ""
            
            switch type {
            case "credit-card", "kart", "kredi-karti":
                if let d = dueDay {
                    scheduleCreditCardReminder(id: id, bank: bank.isEmpty ? title : bank, cardName: title, dueDay: d)
                } else if let dStr = dateStr {
                    scheduleAdvanceAndDueNotification(
                        titlePrefix: "💳 Kredi Kartı Son Ödeme",
                        bodyDetail: "\(title) \(amount.isEmpty ? "" : "Tutar: " + amount)",
                        identifierPrefix: "cc_\(id)",
                        dateString: dStr,
                        advanceDays: advanceDays,
                        userInfo: item
                    )
                }
            case "check", "cek":
                if let dStr = dateStr {
                    let isKesilen = (item["checkType"] as? String ?? "").lowercased() == "kesilen"
                    let cleanAmount = amount.replacingOccurrences(of: "TL", with: "").replacingOccurrences(of: "₺", with: "").trimmingCharacters(in: .whitespaces)
                    let parsedAmt = Double(cleanAmount.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")) ?? 0.0
                    scheduleCheckReminder(
                        id: id,
                        checkNumber: item["checkNumber"] as? String ?? id,
                        bankName: bank,
                        drawer: drawer,
                        amount: parsedAmt,
                        dueDate: dStr,
                        checkType: isKesilen ? "kesilen" : "alinan"
                    )
                }
            case "inspection", "muayene":
                if let dStr = dateStr {
                    scheduleVehicleReminder(
                        id: id,
                        plate: plate.isEmpty ? title : plate,
                        brand: item["brand"] as? String ?? "",
                        model: item["model"] as? String ?? "",
                        inspectionDate: dStr,
                        insuranceDate: nil
                    )
                }
            case "insurance", "sigorta":
                if let dStr = dateStr {
                    scheduleVehicleReminder(
                        id: id,
                        plate: plate.isEmpty ? title : plate,
                        brand: item["brand"] as? String ?? "",
                        model: item["model"] as? String ?? "",
                        inspectionDate: nil,
                        insuranceDate: dStr
                    )
                }
            default:
                if let dStr = dateStr {
                    scheduleAdvanceAndDueNotification(
                        titlePrefix: title,
                        bodyDetail: body.isEmpty ? "\(title) \(amount)" : body,
                        identifierPrefix: "event_\(id)",
                        dateString: dStr,
                        advanceDays: advanceDays,
                        userInfo: item
                    )
                }
            }
        }
    }
    
    /// JS köprüsünden gelen tekil hatırlatma mesajını işler
    func handleScheduleMessage(payload: [String: Any]) {
        let title = payload["title"] as? String ?? "DARS Bildirimi"
        let body = payload["body"] as? String ?? ""
        let id = payload["id"] as? String ?? UUID().uuidString
        let advanceDays = payload["advanceDays"] as? Int ?? 0
        let hour = payload["hour"] as? Int ?? 9
        let minute = payload["minute"] as? Int ?? 0
        
        if let dateStr = payload["date"] as? String, !dateStr.isEmpty {
            scheduleCalendarNotification(
                title: title,
                body: body,
                identifier: id,
                dateString: dateStr,
                advanceDays: advanceDays,
                hour: hour,
                minute: minute,
                userInfo: payload
            )
        } else if let dueDay = payload["dueDay"] as? Int {
            scheduleCreditCardReminder(
                id: id,
                bank: payload["bank"] as? String ?? title,
                cardName: title,
                dueDay: dueDay,
                debt: payload["debt"] as? Double,
                minPayment: payload["minPayment"] as? Double
            )
        } else if let delay = payload["delay"] as? Double {
            scheduleNotification(title: title, body: body, identifier: id, timeInterval: delay)
        }
    }
    
    /// Geriye dönük uyumluluk veya anlık testler için zaman aralıklı bildirim fonksiyonu
    func scheduleNotification(title: String, body: String, identifier: String, timeInterval: TimeInterval = 60, badge: Int? = 1) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        if let b = badge {
            content.badge = NSNumber(value: b)
        }
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(timeInterval, 1), repeats: false)
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[DARS] Bildirim planlama hatası: \(error.localizedDescription)")
            } else {
                print("[DARS] Zaman aralıklı kilit ekranı bildirimi kuruldu [\(timeInterval)s]: \(title)")
            }
        }
    }
    
    /// Bekleyen tüm bildirim taleplerini temizler
    func clearAllPendingNotifications() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        print("[DARS] Tüm bekleyen kilit ekranı bildirimleri temizlendi.")
    }
    
    /// Uygulama kilit ekranındayken veya kapalıyken tüm finansal vadeleri UNCalendarNotificationTrigger ile planlar
    func scheduleAllFinancialReminders() {
        // 1. Günlük 09:00 sabah alarmı (Uygulama kapalıyken her gün çalar)
        scheduleDailyMorningSummary(hour: 9, minute: 0)
        
        // 2. Kredi kartı ekstre son ödeme hatırlatmaları (Aylık tekrarlayan 2 gün önce ve son ödeme günü)
        scheduleCreditCardReminder(
            id: "corporate_cc_ykb_15",
            bank: "Yapı Kredi",
            cardName: "Ticari Business Kart",
            dueDay: 15,
            debt: 142500.0,
            minPayment: 28500.0
        )
        scheduleCreditCardReminder(
            id: "corporate_cc_kt_20",
            bank: "Kuveyt Türk",
            cardName: "Sağlam Business Kart",
            dueDay: 20,
            debt: 771672.0,
            minPayment: 154334.4
        )
        
        // 3. Vadesi gelen çekler (2 gün önce ve vade günü sabah 09:00 kilit ekranı bildirimi)
        let calendar = Calendar.current
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        
        let checkDate1 = calendar.date(byAdding: .day, value: 2, to: Date()) ?? Date()
        let checkDate2 = calendar.date(byAdding: .day, value: 5, to: Date()) ?? Date()
        
        scheduleCheckReminder(
            id: "check_ic_takas_001",
            checkNumber: "CK-00192",
            bankName: "Kuveyt Türk",
            drawer: "Kral Entegre Et A.Ş.",
            amount: 486000.0,
            dueDate: dateFormatter.string(from: checkDate1),
            checkType: "alinan"
        )
        scheduleCheckReminder(
            id: "check_tedarikci_002",
            checkNumber: "CK-00204",
            bankName: "Ziraat Bankası",
            drawer: "Özlem Besicilik Ltd.",
            amount: 606020.0,
            dueDate: dateFormatter.string(from: checkDate2),
            checkType: "kesilen"
        )
        
        // 4. Araç muayene & sigorta takibi (2 gün önce sabah 09:00 kilit ekranı bildirimi)
        let inspDate = calendar.date(byAdding: .day, value: 7, to: Date()) ?? Date()
        let insDate = calendar.date(byAdding: .day, value: 12, to: Date()) ?? Date()
        
        scheduleVehicleReminder(
            id: "veh_05_et_992",
            plate: "05 ET 992",
            brand: "Ford",
            model: "Transit Frigofirik",
            inspectionDate: dateFormatter.string(from: inspDate),
            insuranceDate: dateFormatter.string(from: insDate)
        )
        scheduleVehicleReminder(
            id: "veh_55_aet_412",
            plate: "55 AET 412",
            brand: "Mercedes-Benz",
            model: "Sprinter Soğutuculu",
            inspectionDate: dateFormatter.string(from: calendar.date(byAdding: .day, value: 14, to: Date()) ?? Date()),
            insuranceDate: nil
        )
        
        print("[DARS] Tüm finansal kilit ekranı takvim bildirimleri (UNCalendarNotificationTrigger) başarıyla kuruldu.")
    }
    
    // MARK: - Date & Currency Formatting Helpers
    
    private func parseDate(_ dateString: String) -> Date? {
        let trimmed = dateString.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return nil }
        
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoFormatter.date(from: trimmed) { return date }
        
        isoFormatter.formatOptions = [.withInternetDateTime]
        if let date = isoFormatter.date(from: trimmed) { return date }
        
        let formats = [
            "yyyy-MM-dd",
            "yyyy-MM-dd HH:mm:ss",
            "dd.MM.yyyy",
            "dd/MM/yyyy",
            "yyyy/MM/dd"
        ]
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "tr_TR")
        for format in formats {
            formatter.dateFormat = format
            if let date = formatter.date(from: trimmed) { return date }
        }
        return nil
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₺"
        formatter.locale = Locale(identifier: "tr_TR")
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        return formatter.string(from: NSNumber(value: amount)) ?? "₺\(String(format: "%.2f", amount))"
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    
    // Uygulama açıkken (ön plandayken) de bildirim banner'ını, rozetini ve sesini göster
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .badge, .sound, .list])
    }
    
    // Kullanıcı kilit ekranındaki veya bildirim merkezindeki bildirime tıkladığında çalışır
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let identifier = response.notification.request.identifier
        let userInfo = response.notification.request.content.userInfo
        print("[DARS] Kullanıcı kilit ekranı bildirimine dokundu: \(identifier), userInfo: \(userInfo)")
        
        if let targetScreen = userInfo["targetScreen"] as? String {
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("DarsNavigateToScreen"), object: targetScreen)
            }
        }
        completionHandler()
    }
}

// MARK: - Prototype WebView Wrapper
struct PrototypeWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        
        // JS Bridge for Native Notifications
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "darsNotification")
        config.userContentController = contentController
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1.0)
        
        // Disable Zoom & Lock Viewport
        webView.scrollView.bounces = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.maximumZoomScale = 1.0
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        
        // Native pull to refresh
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(context.coordinator, action: #selector(Coordinator.handleRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl
        context.coordinator.refreshControl = refreshControl
        context.coordinator.webView = webView
        
        // Listen to deep link / notification navigation events
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("DarsNavigateToScreen"),
            object: nil,
            queue: .main
        ) { notification in
            if let screen = notification.object as? String {
                let js = "if (typeof changeScreen === 'function') { changeScreen('\(screen)'); }"
                webView.evaluateJavaScript(js, completionHandler: nil)
            }
        }
        
        // Load ios_prototype.html from bundle resources
        if let url = Bundle.main.url(forResource: "ios_prototype", withExtension: "html", subdirectory: "www") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent().deletingLastPathComponent())
        } else if let url = Bundle.main.url(forResource: "ios_prototype", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: PrototypeWebView
        weak var webView: WKWebView?
        weak var refreshControl: UIRefreshControl?
        
        init(_ parent: PrototypeWebView) {
            self.parent = parent
        }
        
        @objc func handleRefresh(_ sender: UIRefreshControl) {
            webView?.reload()
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            refreshControl?.endRefreshing()
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            refreshControl?.endRefreshing()
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            refreshControl?.endRefreshing()
        }
        
        // Handle JS messages from webView
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "darsNotification" else { return }
            
            var payloadDict: [String: Any]? = nil
            
            if let dict = message.body as? [String: Any] {
                payloadDict = dict
            } else if let jsonString = message.body as? String,
                      let data = jsonString.data(using: .utf8),
                      let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                payloadDict = parsed
            }
            
            guard let dict = payloadDict else {
                print("[DARS] Geçersiz bildirim köprü mesaj formatı: \(message.body)")
                return
            }
            
            let action = dict["action"] as? String ?? ""
            
            switch action {
            case "syncAllEvents":
                if let events = dict["events"] as? [[String: Any]] {
                    NotificationManager.shared.syncAllEvents(events: events)
                }
            case "scheduleReminder", "scheduleDate":
                NotificationManager.shared.handleScheduleMessage(payload: dict)
            case "requestPermission":
                NotificationManager.shared.requestAuthorization()
            case "clearAll":
                NotificationManager.shared.clearAllPendingNotifications()
            default:
                // Handle direct payload or legacy delay message
                NotificationManager.shared.handleScheduleMessage(payload: dict)
            }
        }
    }
}

// MARK: - App Entry Point
@main
struct DarsApp: App {
    init() {
        NotificationManager.shared.requestAuthorization()
    }
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(red: 0.97, green: 0.98, blue: 0.99)
                    .ignoresSafeArea()
                PrototypeWebView()
                    .ignoresSafeArea(.all, edges: .bottom)
            }
        }
    }
}
