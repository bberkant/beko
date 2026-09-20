import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    @State private var showingSideMenu = false
    
    // Kuveyt Turk Blue (Active Color)
    let ktPrimary = Color(red: 0.0, green: 0.176, blue: 0.349)
    
    init() {
        UITabBar.appearance().isHidden = true
    }
    
    var body: some View {
        ZStack(alignment: .leading) {
            // Main Content
            VStack(spacing: 0) {
                // Tab Content
                ZStack {
                    switch selectedTab {
                    case 0:
                        DashboardView(selectedTab: $selectedTab)
                    case 1:
                        CektenHesabiView()
                    case 2:
                        TakasCekleriView()
                    case 3:
                        DurumumView()
                    default:
                        DashboardView(selectedTab: $selectedTab)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                
                // Custom Tab Bar
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        TabBarButton(icon: "house.fill", text: "Ana Sayfa", index: 0, selectedTab: $selectedTab, activeColor: ktPrimary)
                        TabBarButton(icon: "building.columns.fill", text: "ÇEKTEN", index: 1, selectedTab: $selectedTab, activeColor: ktPrimary)
                        TabBarButton(icon: "arrow.triangle.2.circlepath", text: "Takas", index: 2, selectedTab: $selectedTab, activeColor: ktPrimary)
                        TabBarButton(icon: "chart.bar.fill", text: "Durumum", index: 3, selectedTab: $selectedTab, activeColor: ktPrimary)
                    }
                    .padding(.vertical, 8)
                    .background(Color.white)
                    
                    // Bottom safe area fill
                    Color.white.frame(height: UIApplication.shared.windows.first?.safeAreaInsets.bottom ?? 0)
                }
                .background(Color.white.shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: -2))
                .ignoresSafeArea(edges: .bottom)
            }
            
            // Side Menu Overlay (Used if we ever trigger it from Dashboard)
            if showingSideMenu {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.easeInOut) {
                            showingSideMenu = false
                        }
                    }
                
                SideMenuView(isOpen: $showingSideMenu)
                    .frame(width: UIScreen.main.bounds.width * 0.8)
                    .transition(.move(edge: .trailing)) // Slidng from right just in case
                    .zIndex(2)
            }
        }
    }
}

struct DurumumView: View {
    let ktPrimary = Color(red: 0.0, green: 0.176, blue: 0.349)
    @State private var activeTab = "Varlıklarım"
    
    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 12) {
                Color.clear.frame(height: 1)
                    .padding(.top, 40)
                    
                HStack {
                    Text("Durumum")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(.label))
                    Spacer()
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 12)
            .background(Color(.systemBackground))
            
            // Sub tabs
            HStack(spacing: 4) {
                TabButton(title: "Varlıklarım", isSelected: activeTab == "Varlıklarım", activeColor: ktPrimary) { activeTab = "Varlıklarım" }
                TabButton(title: "Giderlerim", isSelected: activeTab == "Giderlerim", activeColor: ktPrimary) { activeTab = "Giderlerim" }
                TabButton(title: "Borçlarım", isSelected: activeTab == "Borçlarım", activeColor: ktPrimary) { activeTab = "Borçlarım" }
            }
            .padding(12)
            .background(Color.white)
            
            ScrollView {
                VStack(spacing: 20) {
                    if activeTab == "Varlıklarım" {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Toplam Bakiye")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.gray)
                            Text("126.193,16 TL")
                                .font(.system(size: 24, weight: .black))
                            Text("(TL Karşılığı)")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                        }
                        .padding(20)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.white)
                        .cornerRadius(12)
                        .shadow(color: .black.opacity(0.04), radius: 2)
                        .padding(.horizontal, 16)
                    } else {
                        Text("\(activeTab) detayları buraya gelecek.")
                            .foregroundColor(.gray)
                            .padding(.top, 40)
                    }
                }
                .padding(.top, 16)
            }
            .background(Color(red: 0.96, green: 0.97, blue: 0.98))
        }
    }
}

// Reusable Custom Tab Bar Button
struct TabBarButton: View {
    let icon: String
    let text: String
    let index: Int
    @Binding var selectedTab: Int
    let activeColor: Color
    
    var body: some View {
        Button(action: {
            selectedTab = index
        }) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                Text(text)
                    .font(.system(size: 11))
            }
            .foregroundColor(selectedTab == index ? activeColor : .gray)
            .frame(maxWidth: .infinity)
        }
    }
}

struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
    }
}
