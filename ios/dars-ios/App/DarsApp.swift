//
//  DarsApp.swift
//  dars-ios
//
//  100% Native SwiftUI Application Entry Point
//  Connected directly to MainTabView and LoginView with live Supabase architecture.
//

import SwiftUI

@main
struct DarsApp: App {
    @State private var isAuthenticated = false
    
    var body: some Scene {
        WindowGroup {
            if isAuthenticated {
                MainTabView()
                    .preferredColorScheme(.light)
            } else {
                LoginView(isAuthenticated: $isAuthenticated)
                    .preferredColorScheme(.light)
            }
        }
    }
}
