import SwiftUI

public struct MainTabView: View {
    @State private var selectedTab: TabItem = .dashboard
    @State private var navigationPath: [String] = []
    
    public enum TabItem: String {
        case dashboard
        case cekten
        case takas
        case caris
        case menu
    }
    
    public init() {}
    
    public var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView { screen in
                handleNavigate(screen)
            }
            .tabItem {
                Label("Ana Sayfa", systemImage: "house.fill")
            }
            .tag(TabItem.dashboard)
            
            CektenHesabiView()
                .tabItem {
                    Label("Çekten Hesap", systemImage: "banknote.fill")
                }
                .tag(TabItem.cekten)
            
            TakasView()
                .tabItem {
                    Label("Takas Çekleri", systemImage: "arrow.triangle.swap")
                }
                .tag(TabItem.takas)
            
            CarilerListView()
                .tabItem {
                    Label("Cariler", systemImage: "person.2.fill")
                }
                .tag(TabItem.caris)
            
            MainMenuView { screen in
                handleNavigate(screen)
            }
            .tabItem {
                Label("Menü", systemImage: "line.3.horizontal")
            }
            .tag(TabItem.menu)
        }
        .accentColor(AppColors.primary)
    }
    
    private func handleNavigate(_ screen: String) {
        switch screen {
        case "dashboard":
            selectedTab = .dashboard
        case "cekten":
            selectedTab = .cekten
        case "takas":
            selectedTab = .takas
        case "caris":
            selectedTab = .caris
        case "menu":
            selectedTab = .menu
        default:
            selectedTab = .menu
        }
    }
}
