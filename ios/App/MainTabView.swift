import SwiftUI
import UIKit

struct MainTabView: View {
    @State private var selectedTab: Int = 0
    @State private var showingAddCheckModal = false
    @ObservedObject var manager = SupabaseManager.shared
    
    init() {
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = .systemBackground
        
        let activeColor = UIColor(red: 0.0, green: 0.53, blue: 0.35, alpha: 1.0)
        appearance.stackedLayoutAppearance.selected.iconColor = activeColor
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: activeColor, .font: UIFont.systemFont(ofSize: 10, weight: .bold)]
        
        let inactiveColor = UIColor.gray
        appearance.stackedLayoutAppearance.normal.iconColor = inactiveColor
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: inactiveColor, .font: UIFont.systemFont(ofSize: 10, weight: .medium)]
        
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                // Tab 0: Dashboard
                NavigationView {
                    DashboardView(selectedTab: $selectedTab)
                        .navigationBarHidden(true)
                }
                .tag(0)
                
                // Tab 1: Checks & Bills
                NavigationView {
                    ChecksView()
                        .navigationBarHidden(true)
                }
                .tag(1)
                
                // Tab 2: Dummy for spacing (center plus button overlays it)
                Text("")
                    .tag(2)
                
                // Tab 3: Caris
                NavigationView {
                    CarisView()
                        .navigationBarHidden(true)
                }
                .tag(3)
                
                // Tab 4: Menü (Settings / Logout Options)
                NavigationView {
                    MenuView()
                        .navigationBarHidden(true)
                }
                .tag(4)
            }
            
            // Custom overlapping Plus button in the middle (Kuveyt Turk style green button)
            Button(action: {
                showingAddCheckModal = true
            }) {
                Circle()
                    .fill(Color.brandGreen)
                    .frame(width: 52, height: 52)
                    .shadow(color: Color.brandGreen.opacity(0.4), radius: 8, x: 0, y: 4)
                    .overlay(
                        Image(systemName: "plus")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)
                    )
            }
            .offset(y: -10)
        }
        .sheet(isPresented: $showingAddCheckModal) {
            AddCheckView()
        }
    }
}

struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
    }
}

