import SwiftUI

struct CektenHesabiView: View {
    // Kuveyt Turk Blue
    let ktPrimary = Color(red: 0.0, green: 0.176, blue: 0.349)
    
    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 12) {
                Color.clear.frame(height: 1)
                    .padding(.top, 40)
                    
                HStack {
                    Text("ÇEKTEN HESABI")
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(Color(.label))
                        .tracking(-0.5)
                    Spacer()
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 12)
            .background(Color(.systemBackground))
            
            ScrollView {
                VStack(spacing: 20) {
                    Image(systemName: "banknote.fill")
                        .font(.system(size: 50))
                        .foregroundColor(ktPrimary.opacity(0.3))
                        .padding(.top, 60)
                    Text("Çekten Hesabı işlemleri buraya eklenecektir.")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
            }
            .background(Color(red: 0.96, green: 0.97, blue: 0.98))
        }
    }
}
