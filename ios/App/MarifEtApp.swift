import SwiftUI

@main
public struct MarifEtApp: App {
    public init() {}
    
    public var body: some Scene {
        WindowGroup {
            MainTabView()
                .preferredColorScheme(.light)
        }
    }
}
