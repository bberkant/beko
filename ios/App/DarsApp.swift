import SwiftUI
import WebKit

struct PrototypeWebView: UIViewRepresentable {
    let liveURL = URL(string: "https://cem.amasyaetas.com")!
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .white
        webView.navigationDelegate = context.coordinator
        webView.scrollView.bounces = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        
        // Native pull-to-refresh
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(context.coordinator, action: #selector(Coordinator.handleRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl
        context.coordinator.refreshControl = refreshControl
        context.coordinator.webView = webView
        
        // Load Live Server URL
        var request = URLRequest(url: liveURL)
        request.timeoutInterval = 10.0
        webView.load(request)
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: PrototypeWebView
        weak var webView: WKWebView?
        weak var refreshControl: UIRefreshControl?
        var hasLoadedSuccessfully = false
        
        init(_ parent: PrototypeWebView) {
            self.parent = parent
        }
        
        @objc func handleRefresh(_ sender: UIRefreshControl) {
            if let webView = webView {
                webView.reload()
            }
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            refreshControl?.endRefreshing()
            hasLoadedSuccessfully = true
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            refreshControl?.endRefreshing()
            fallbackToLocal(webView)
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            refreshControl?.endRefreshing()
            if !hasLoadedSuccessfully {
                fallbackToLocal(webView)
            }
        }
        
        private func fallbackToLocal(_ webView: WKWebView) {
            if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
                webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent().deletingLastPathComponent())
            } else if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
                webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
            } else if let url = Bundle.main.url(forResource: "ios_prototype", withExtension: "html") {
                webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
            }
        }
    }
}

@main
struct DarsApp: App {
    var body: some Scene {
        WindowGroup {
            ZStack {
                Color.white
                    .ignoresSafeArea()
                PrototypeWebView()
                    .ignoresSafeArea(.container, edges: .bottom)
            }
        }
    }
}