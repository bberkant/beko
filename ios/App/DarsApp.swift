import SwiftUI

@main
struct DarsApp: App {
    @State private var isAuthenticated = false
    
    var body: some Scene {
        WindowGroup {
            if isAuthenticated {
                MainTabView()
            } else {
                LoginView(isAuthenticated: $isAuthenticated)
            }
        }
    }
}