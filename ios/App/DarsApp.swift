import SwiftUI
import WebKit

struct PrototypeWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1.0)
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        
        if let url = Bundle.main.url(forResource: "ios_prototype", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

@main
struct DarsApp: App {
    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(red: 0.97, green: 0.98, blue: 0.99)
                    .ignoresSafeArea()
                PrototypeWebView()
                    .ignoresSafeArea(.all)
            }
        }
    }
}