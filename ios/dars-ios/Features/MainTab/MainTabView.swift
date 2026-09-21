//
//  MainTabView.swift
//  dars-ios
//
//  Pixel-perfect native 5-Tab Navigation Bar matching Kuveyt Türk mobile banking
//  and ios_prototype.html.
//

import SwiftUI

public struct MainTabView: View {
    @State private var selectedTab: Int = 0
    
    public init() {
        configureTabBarAppearance()
    }
    
    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.backgroundColor = UIColor(Color.ktCardSurface)
        
        let activeColor = UIColor(Color.ktPrimary)
        let inactiveColor = UIColor(Color.ktTextSecondary)
        
        // Active tab styling (Regular/Medium corporate font, never heavy bold)
        appearance.stackedLayoutAppearance.selected.iconColor = activeColor
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: activeColor,
            .font: UIFont.systemFont(ofSize: 11, weight: .medium)
        ]
        
        // Inactive tab styling
        appearance.stackedLayoutAppearance.normal.iconColor = inactiveColor
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: inactiveColor,
            .font: UIFont.systemFont(ofSize: 11, weight: .regular)
        ]
        
        // Hairline top border
        appearance.shadowColor = UIColor(Color.ktCardBorder)
        
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    
    public var body: some View {
        TabView(selection: $selectedTab) {
            // Tab 0: Ana Sayfa (Dashboard)
            NavigationStack {
                DashboardView(selectedTab: $selectedTab)
            }
            .tabItem {
                Label("Ana Sayfa", systemImage: "house.fill")
            }
            .tag(0)
            
            // Tab 1: Çekten (Trade Finance / Açık Mal)
            NavigationStack {
                CektenView()
            }
            .tabItem {
                Label("Çekten", systemImage: "doc.text.fill")
            }
            .tag(1)
            
            // Tab 2: Takas (Clearing Cheques Portföy)
            NavigationStack {
                TakasView()
            }
            .tabItem {
                Label("Takas", systemImage: "arrow.triangle.2.circlepath")
            }
            .tag(2)
            
            // Tab 3: Cariler (Current Accounts)
            NavigationStack {
                CarisView()
            }
            .tabItem {
                Label("Cariler", systemImage: "person.2.fill")
            }
            .tag(3)
            
            // Tab 4: Menü (Module Directory & Settings)
            NavigationStack {
                MenuView()
            }
            .tabItem {
                Label("Menü", systemImage: "line.3.horizontal")
            }
            .tag(4)
        }
        .tint(Color.ktPrimary)
    }
}
// MARK: - Previews

#if DEBUG
struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
    }
}
#endif
