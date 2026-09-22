import SwiftUI
import WebKit
import UserNotifications

// MARK: - Native Notification Manager
class NotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()
    
    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }
    
    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                print("[DARS] Bildirim izni başarıyla alındı.")
                DispatchQueue.main.async {
                    self.scheduleSampleFinancialReminders()
                }
            } else if let error = error {
                print("[DARS] Bildirim izin hatası: \(error.localizedDescription)")
            }
        }
    }
    
    func scheduleNotification(title: String, body: String, identifier: String, timeInterval: TimeInterval = 1) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(timeInterval, 1), repeats: false)
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[DARS] Bildirim planlama hatası: \(error.localizedDescription)")
            } else {
                print("[DARS] Bildirim kuruldu: \(title)")
            }
        }
    }
    
    func scheduleSampleFinancialReminders() {
        // Otomatik örnek finansal hatırlatıcılar
        scheduleNotification(
            title: "💳 Kredi Kartı Son Ödeme Hatırlatması",
            body: "Yapı Kredi Ticari Kart ekstre son ödeme gününe 2 gün kaldı. Tutar: ₺142.500,00",
            identifier: "credit_card_due_reminder",
            timeInterval: 10
        )
    }
    
    // Uygulama açıkken (ön plandayken) de bildirim banner'ını göster
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .badge, .sound])
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
            if message.name == "darsNotification" {
                if let dict = message.body as? [String: Any],
                   let title = dict["title"] as? String,
                   let body = dict["body"] as? String {
                    let id = dict["id"] as? String ?? UUID().uuidString
                    let delay = dict["delay"] as? Double ?? 1.0
                    NotificationManager.shared.scheduleNotification(title: title, body: body, identifier: id, timeInterval: delay)
                }
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
