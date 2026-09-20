import SwiftUI

struct LoginView: View {
    @Binding var isAuthenticated: Bool
    @State private var password = ""
    
    let ktPrimary = Color(red: 0.0, green: 0.176, blue: 0.349) // #002D59
    let bgF8FAFC = Color(red: 0.973, green: 0.980, blue: 0.988)
    
    var body: some View {
        ZStack {
            bgF8FAFC.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // TOP HEADER
                HStack {
                    // Left button
                    Button(action: {}) {
                        Circle()
                            .fill(Color(red: 0.933, green: 0.957, blue: 1.0)) // #EEF4FF
                            .frame(width: 36, height: 36)
                            .overlay(
                                Image(systemName: "person.2.badge.gearshape")
                                    .font(.system(size: 14))
                                    .foregroundColor(ktPrimary)
                            )
                    }
                    
                    Spacer()
                    
                    // Center title
                    HStack(spacing: 6) {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(LinearGradient(colors: [.blue, .indigo], startPoint: .topTrailing, endPoint: .bottomLeft))
                            .frame(width: 28, height: 28)
                            .overlay(
                                Text("M")
                                    .font(.system(size: 14, weight: .black))
                                    .foregroundColor(.white)
                            )
                        Text("DARS PORTAL")
                            .font(.system(size: 16, weight: .black))
                            .tracking(1.0)
                            .foregroundColor(ktPrimary)
                    }
                    
                    Spacer()
                    
                    // Right icons
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 32, height: 32)
                            .overlay(
                                Image(systemName: "person.fill")
                                    .foregroundColor(.white)
                            )
                        
                        Button(action: {}) {
                            Circle()
                                .fill(Color(red: 0.933, green: 0.957, blue: 1.0))
                                .frame(width: 36, height: 36)
                                .overlay(
                                    Image(systemName: "bell")
                                        .font(.system(size: 16))
                                        .foregroundColor(ktPrimary)
                                )
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)
                
                Spacer()
                
                // CENTER CONTENT
                VStack(spacing: 16) {
                    // Avatar & Icon
                    ZStack(alignment: .bottomTrailing) {
                        Circle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(width: 96, height: 96)
                            .overlay(
                                Circle().stroke(Color.white, lineWidth: 4)
                            )
                            .overlay(
                                Image(systemName: "building.2")
                                    .font(.system(size: 40))
                                    .foregroundColor(.gray)
                            )
                            .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
                        
                        Circle()
                            .fill(Color.gray)
                            .frame(width: 40, height: 40)
                            .overlay(
                                Circle().stroke(Color.white, lineWidth: 2)
                            )
                            .overlay(
                                Image(systemName: "person.fill")
                                    .foregroundColor(.white)
                            )
                            .offset(x: 4, y: 0)
                            .shadow(radius: 2)
                    }
                    .padding(.bottom, 8)
                    
                    VStack(spacing: 4) {
                        Text("Marif Et Ve Et Ürünleri Gıda Tarım Hayvan...")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color(.darkGray))
                            .lineLimit(1)
                            .truncationMode(.tail)
                        
                        Text("DARS Kurumsal Yönetim")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.gray)
                    }
                    
                    // Dots
                    HStack(spacing: 6) {
                        Circle().fill(Color.black).frame(width: 6, height: 6)
                        Circle().fill(Color.gray.opacity(0.4)).frame(width: 6, height: 6)
                        Circle().fill(Color.gray.opacity(0.4)).frame(width: 6, height: 6)
                    }
                    .padding(.vertical, 8)
                    
                    // Login Form
                    VStack(spacing: 12) {
                        SecureField("Şifre giriniz", text: $password)
                            .font(.system(size: 14, weight: .semibold))
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 14)
                            .padding(.horizontal, 16)
                            .background(Color.white)
                            .cornerRadius(25)
                            .overlay(
                                RoundedRectangle(cornerRadius: 25)
                                    .stroke(Color.blue, lineWidth: 2)
                            )
                            .shadow(color: .black.opacity(0.05), radius: 4)
                            .frame(maxWidth: 280)
                        
                        Button(action: { isAuthenticated = true }) {
                            Text("Giriş Yap")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                                .frame(maxWidth: 280)
                                .padding(.vertical, 14)
                                .background(ktPrimary)
                                .cornerRadius(25)
                                .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
                        }
                        
                        Button(action: {}) {
                            Text("Şifremi Unuttum >")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.gray)
                        }
                    }
                }
                
                Spacer()
                
                // BOTTOM CARDS
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        // Card 1
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("MARİF ET DARS SİSTEMİ,")
                                    .font(.system(size: 10, weight: .heavy))
                                Text("Tüm Finans ve Kesim Verileri Yayında!")
                                    .font(.system(size: 10))
                                    .foregroundColor(Color.blue.opacity(0.3)) // approx
                            }
                            Spacer()
                            Image(systemName: "megaphone.fill")
                                .font(.system(size: 18))
                        }
                        .padding(14)
                        .frame(width: 240)
                        .background(
                            LinearGradient(colors: [Color(red: 0.07, green: 0.29, blue: 0.47), Color(red: 0.0, green: 0.17, blue: 0.29)], startPoint: .leading, endPoint: .trailing)
                        )
                        .foregroundColor(.white)
                        .cornerRadius(16)
                        
                        // Card 2
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("ÇEKTEN & NAKİT YÖNETİMİ")
                                    .font(.system(size: 10, weight: .heavy))
                                Text("Canlı Takas & Mizan Portalı")
                                    .font(.system(size: 10))
                                    .foregroundColor(Color.blue.opacity(0.3)) // approx
                            }
                            Spacer()
                            Image(systemName: "chart.bar.fill")
                                .font(.system(size: 18))
                        }
                        .padding(14)
                        .frame(width: 240)
                        .background(
                            LinearGradient(colors: [Color(red: 0.04, green: 0.21, blue: 0.35), Color(red: 0.02, green: 0.12, blue: 0.2)], startPoint: .leading, endPoint: .trailing)
                        )
                        .foregroundColor(.white)
                        .cornerRadius(16)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
            }
        }
    }
}

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView(isAuthenticated: .constant(false))
    }
}
