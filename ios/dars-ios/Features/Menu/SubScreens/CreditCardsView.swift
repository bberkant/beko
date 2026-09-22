import SwiftUI

struct CreditCardsView: View {
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { dismiss() }) {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                            Text("Geri")
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Color(hex: "002D59"))
                    }
                    Spacer()
                    Text("Kredi Kartlarım")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Spacer()
                    Color.clear.frame(width: 48, height: 24)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .overlay(Rectangle().frame(height: 1).foregroundColor(Color(hex: "E2E8F0")), alignment: .bottom)
                
                ScrollView {
                    VStack(spacing: 16) {
                        // Kuveyt Turk Sağlam Business Card Visual
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("SAĞLAM BUSINESS FİNANSMAN")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(.white.opacity(0.9))
                                Spacer()
                                Image(systemName: "wave.3.forward")
                                    .font(.system(size: 16))
                                    .foregroundColor(.white.opacity(0.8))
                            }
                            
                            Spacer().frame(height: 12)
                            
                            Text("••••  ••••  ••••  8921")
                                .font(.system(size: 18, weight: .bold, design: .monospaced))
                                .foregroundColor(.white)
                            
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("KART SAHİBİ")
                                        .font(.system(size: 9, weight: .medium))
                                        .foregroundColor(.white.opacity(0.7))
                                    Text("BERKANT KAPLAN")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text("SON KULLANMA")
                                        .font(.system(size: 9, weight: .medium))
                                        .foregroundColor(.white.opacity(0.7))
                                    Text("08/29")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        .padding(20)
                        .background(
                            LinearGradient(
                                colors: [Color(hex: "002D59"), Color(hex: "001A33")],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .cornerRadius(20)
                        .shadow(color: Color.black.opacity(0.15), radius: 8, y: 4)
                        
                        // Card Limit & Debt Details Card
                        VStack(spacing: 14) {
                            HStack {
                                Text("Kart Finansal Özeti")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Color(hex: "1E293B"))
                                Spacer()
                                Text("Kuveyt Türk")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(Color(hex: "008556"))
                            }
                            
                            Divider()
                            
                            HStack {
                                Text("Toplam Limit")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                Spacer()
                                Text("₺1.500.000,00")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(Color(hex: "1E293B"))
                            }
                            
                            HStack {
                                Text("Kullanılabilir Limit")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                Spacer()
                                Text("₺728.327,80")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(Color(hex: "008556"))
                            }
                            
                            HStack {
                                Text("Güncel Ekstre Borcu")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                Spacer()
                                Text("₺771.672,20")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(Color(hex: "EA3829"))
                            }
                            
                            HStack {
                                Text("Son Ödeme Tarihi")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(Color(hex: "64748B"))
                                Spacer()
                                Text("28.09.2026")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(Color(hex: "FF9800"))
                            }
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}
