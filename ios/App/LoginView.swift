import SwiftUI

struct LoginView: View {
    @Binding var isAuthenticated: Bool
    @State private var loadingFaceID = false
    @State private var statusMessage = "FaceID ile Hızlı Giriş"
    
    var body: some View {
        ZStack {
            // Background Gradient (Kuveyt Turk style deep green/black)
            LinearGradient(
                gradient: Gradient(colors: [Color(red: 0.0, green: 0.15, blue: 0.08), Color(red: 0.0, green: 0.05, blue: 0.03)]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VCornerDecorations()
            
            VStack(spacing: 40) {
                // Header Logo
                HStack(spacing: 12) {
                    Circle()
                        .fill(Color.brandGreen)
                        .frame(width: 44, height: 44)
                        .overlay(
                            Image(systemName: "building.columns.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.white)
                        )
                    Text("ONE DARS")
                        .font(.system(size: 22, weight: .black))
                        .foregroundColor(.white)
                        .tracking(1.5)
                }
                .padding(.top, 40)
                
                Spacer()
                
                // Welcome Center
                VStack(spacing: 16) {
                    // FaceID Icon simulator
                    ZStack {
                        Circle()
                            .fill(Color.brandGreen.opacity(0.1))
                            .frame(width: 100, height: 100)
                            .overlay(
                                Circle()
                                    .stroke(Color.brandGreen.opacity(0.2), lineWidth: 1)
                            )
                        
                        Image(systemName: "faceid")
                            .font(.system(size: 48))
                            .foregroundColor(.brandGreen)
                    }
                    
                    Text("Hoş Geldiniz")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("Finans ve Muhasebe Yönetimi")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                // Login Buttons
                VStack(spacing: 16) {
                    Button(action: simulateFaceID) {
                        HStack(spacing: 8) {
                            if loadingFaceID {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "faceid")
                                    .font(.system(size: 20))
                            }
                            Text(statusMessage)
                                .font(.system(size: 16, weight: .bold))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.brandGreen)
                        .foregroundColor(.white)
                        .cornerRadius(16)
                        .shadow(color: Color.brandGreen.opacity(0.3), radius: 10, x: 0, y: 5)
                    }
                    .disabled(loadingFaceID)
                    
                    Button(action: { isAuthenticated = true }) {
                        Text("Şifre ile Giriş")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(.gray)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(16)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 30)
            }
        }
    }
    
    private func simulateFaceID() {
        loadingFaceID = true
        statusMessage = "FaceID Doğrulanıyor..."
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            loadingFaceID = false
            statusMessage = "Giriş Başarılı"
            
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                isAuthenticated = true
            }
        }
    }
}

struct VCornerDecorations: View {
    var body: some View {
        EmptyView()
    }
}
