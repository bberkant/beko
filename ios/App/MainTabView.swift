import SwiftUI

struct MainTabView: View {
    @State private var selectedTab: Int = 0
    @State private var showingSideMenu = false
    @ObservedObject var manager = SupabaseManager.shared
    
    // Kuveyt Trk Blue
    let ktPrimary = Color(red: 0.0, green: 0.176, blue: 0.349) // #002D59
    
    var body: some View {
        ZStack {
            // Main Content Area
            VStack(spacing: 0) {
                // Display the selected tab content
                ZStack {
                    switch selectedTab {
                    case 0:
                        DashboardView(selectedTab: $selectedTab)
                    case 1:
                        CektenHesabiView()
                    case 2:
                        TakasCekleriView()
                    case 3:
                        CarisView()
                    default:
                        DashboardView(selectedTab: $selectedTab)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                
                // Custom Tab Bar
                VStack(spacing: 0) {
                    HStack(spacing: 0) {
                        TabBarButton(icon: "house.fill", text: "Ana Sayfa", index: 0, selectedTab: $selectedTab, activeColor: ktPrimary)
                        TabBarButton(icon: "building.columns.fill", text: "Çekten Hesap", index: 1, selectedTab: $selectedTab, activeColor: ktPrimary)
                        TabBarButton(icon: "arrow.triangle.2.circlepath", text: "Takas Çekleri", index: 2, selectedTab: $selectedTab, activeColor: ktPrimary)
                        TabBarButton(icon: "arrow.right.arrow.left", text: "Cariler", index: 3, selectedTab: $selectedTab, activeColor: ktPrimary)
                        
                        // Menu Button (Opens Side Menu)
                        Button(action: {
                            withAnimation(.easeInOut) {
                                showingSideMenu = true
                            }
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: "line.3.horizontal")
                                    .font(.system(size: 20))
                                Text("Menü")
                                    .font(.system(size: 10))
                            }
                            .foregroundColor(.gray)
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.vertical, 8)
                    .background(Color.white)
                    
                    // Bottom safe area fill
                    Color.white.frame(height: UIApplication.shared.windows.first?.safeAreaInsets.bottom ?? 0)
                }
                .background(Color.white.shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: -2))
                .ignoresSafeArea(edges: .bottom)
            }
            
            // Side Menu Overlay
            if showingSideMenu {
                // Dimmed Background
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.easeInOut) {
                            showingSideMenu = false
                        }
                    }
                    .zIndex(1)
                
                // Offcanvas Menu Panel (Right Side)
                HStack(spacing: 0) {
                    Spacer()
                    SideMenuView(isPresented: $showingSideMenu)
                        .frame(width: UIScreen.main.bounds.width * 0.8)
                        .background(Color(.systemBackground))
                        .shadow(radius: 5)
                        .transition(.move(edge: .trailing))
                }
                .zIndex(2)
                .ignoresSafeArea(edges: .bottom)
            }
        }
    }
}

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
                    .font(.system(size: 10))
            }
            .foregroundColor(selectedTab == index ? activeColor : .gray)
            .frame(maxWidth: .infinity)
        }
    }
}

struct SideMenuView: View {
    @Binding var isPresented: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Side Menu Header
            HStack {
                Text("Menü")
                    .font(.system(size: 20, weight: .bold))
                Spacer()
                Button(action: {
                    withAnimation(.easeInOut) {
                        isPresented = false
                    }
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 20))
                        .foregroundColor(.black)
                }
            }
            .padding()
            .padding(.top, 40) // Status bar padding manually if ignoresSafeArea is used
            .background(Color(.systemGray6))
            
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                TextField("Menüde ara...", text: .constant(""))
            }
            .padding(10)
            .background(Color(.systemGray5))
            .cornerRadius(10)
            .padding()
            
            // Menu Items List
            ScrollView {
                VStack(alignment: .leading, spacing: 15) {
                    MenuSection(title: "Hesap İşlemleri", items: ["Hesaplarım", "Para Transferleri", "Çek / Senet"])
                    MenuSection(title: "Operasyon", items: ["Kesim Listesi", "İhaleler", "Araç Yönetimi", "E-Faturalar"])
                    MenuSection(title: "Kartlar", items: ["Kredi Kartlarım", "Banka Kartlarım"])
                }
                .padding()
            }
            
            Spacer()
            
            // Logout Button
            Button(action: {
                // Logout action
            }) {
                HStack {
                    Image(systemName: "arrow.right.square")
                    Text("Güvenli Çıkış")
                }
                .foregroundColor(.red)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemGray6))
            }
        }
    }
}

struct MenuSection: View {
    let title: String
    let items: [String]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.gray)
                .padding(.top, 5)
            
            ForEach(items, id: \.self) { item in
                HStack {
                    Text(item)
                        .font(.system(size: 15))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                .padding(.vertical, 8)
                Divider()
            }
        }
    }
}
