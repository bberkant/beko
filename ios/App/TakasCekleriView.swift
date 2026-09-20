import SwiftUI

struct TakasCekleriView: View {
    let ktPrimary = Color(red: 0.0, green: 0.176, blue: 0.349)
    let bgF8FAFC = Color(red: 0.973, green: 0.980, blue: 0.988)
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 0) {
                Color.clear.frame(height: 1).padding(.top, 40)
                
                HStack {
                    Button(action: {}) {
                        Text("Menü")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color(.darkGray))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(red: 0.945, green: 0.957, blue: 0.976)) // slate-100
                            .cornerRadius(20)
                    }
                    
                    Spacer()
                    
                    Text("Takas Çekleri")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(Color(.darkText))
                        .tracking(-0.3)
                    
                    Spacer()
                    
                    Button(action: {}) {
                        Text("+ Yeni")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(ktPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(20)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 14)
            }
            .background(Color.white)
            .overlay(Rectangle().frame(height: 1).foregroundColor(Color.gray.opacity(0.1)), alignment: .bottom)
            
            // Check items list
            ChecksView(isTakasMode: true) // Re-use the checks logic
        }
    }
}
