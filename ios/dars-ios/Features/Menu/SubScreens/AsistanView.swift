import SwiftUI

struct AsistanView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var messageText: String = ""
    @State private var messages: [ChatMessage] = [
        ChatMessage(text: "Merhaba Berkant Bey! Ben DARS Finansal Asistanınızım. Çek vadeleriniz, cari hesap durumunuz veya günlük kesim raporlarınız hakkında bana soru sorabilirsiniz.", isUser: false, time: "10:00")
    ]
    
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
                    HStack(spacing: 6) {
                        Circle().fill(Color(hex: "008556")).frame(width: 8, height: 8)
                        Text("DARS Finans Asistanı")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color(hex: "1E293B"))
                    }
                    Spacer()
                    Color.clear.frame(width: 48, height: 24)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .overlay(Rectangle().frame(height: 1).foregroundColor(Color(hex: "E2E8F0")), alignment: .bottom)
                
                // Messages List
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(messages) { msg in
                            HStack {
                                if msg.isUser { Spacer() }
                                
                                VStack(alignment: msg.isUser ? .trailing : .leading, spacing: 4) {
                                    Text(msg.text)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(msg.isUser ? .white : Color(hex: "1E293B"))
                                        .padding(12)
                                        .background(msg.isUser ? Color(hex: "002D59") : Color.white)
                                        .cornerRadius(16)
                                        .shadow(color: Color.black.opacity(0.04), radius: 2, y: 1)
                                    
                                    Text(msg.time)
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundColor(Color(hex: "94A3B8"))
                                        .padding(.horizontal, 4)
                                }
                                
                                if !msg.isUser { Spacer() }
                            }
                        }
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
                
                // Input Bar
                HStack(spacing: 10) {
                    TextField("Bir soru sorun (Örn: Bu hafta hangi çekler var?)...", text: $messageText)
                        .font(.system(size: 13))
                        .padding(12)
                        .background(Color(hex: "F1F5F9"))
                        .cornerRadius(20)
                    
                    Button(action: sendMessage) {
                        Image(systemName: "paperplane.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.white)
                            .frame(width: 40, height: 40)
                            .background(Color(hex: "002D59"))
                            .clipShape(Circle())
                    }
                    .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding(12)
                .background(Color.white)
                .overlay(Rectangle().frame(height: 1).foregroundColor(Color(hex: "E2E8F0")), alignment: .top)
            }
            .navigationBarHidden(true)
        }
    }
    
    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        
        let userMsg = ChatMessage(text: text, isUser: true, time: "Şimdi")
        messages.append(userMsg)
        messageText = ""
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            let replyText: String
            if text.localizedCaseInsensitiveContains("çek") {
                replyText = "Bu hafta vadesi gelen 4 adet çekiniz bulunmaktadır. Toplam tutar: ₺1.450.000,00. En yakın vade 24 Eylül Salı günüdür."
            } else if text.localizedCaseInsensitiveContains("bakiye") || text.localizedCaseInsensitiveContains("kasa") {
                replyText = "Güncel Kasa bakiyeniz ₺126.193,16, Kuveyt Türk ticari hesabınızdaki bakiye ₺2.450.000,00'dir."
            } else {
                replyText = "Sorunuz inceleniyor. İlgili veri kayıtları ve finansal tablolar başarıyla tarandı."
            }
            messages.append(ChatMessage(text: replyText, isUser: false, time: "Şimdi"))
        }
    }
}

private struct ChatMessage: Identifiable {
    let id = UUID()
    let text: String
    let isUser: Bool
    let time: String
}
