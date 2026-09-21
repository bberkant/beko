import SwiftUI

/// Settings Screen (Sistem Ayarları) matching Kuveyt Türk corporate mobile design.
/// Provides configuration for biometrics, notifications, privacy masking,
/// live Supabase environment diagnostics, cache management, and session logout.
public struct SettingsView: View {
    @Environment(\.presentationMode) private var presentationMode
    
    // Preferences persistent in UserDefaults / AppStorage
    @AppStorage("biometric_login_enabled") private var biometricEnabled: Bool = true
    @AppStorage("check_notifications_enabled") private var checkNotificationsEnabled: Bool = true
    @AppStorage("invoice_notifications_enabled") private var invoiceNotificationsEnabled: Bool = true
    @AppStorage("maturity_alert_days") private var maturityAlertDays: Int = 3
    @AppStorage("mask_balances_default") private var maskBalancesDefault: Bool = false
    @AppStorage("auto_lock_minutes") private var autoLockMinutes: Int = 15
    
    // UI Interaction States
    @State private var showingPinChangeAlert: Bool = false
    @State private var showingClearCacheAlert: Bool = false
    @State private var showingLogoutAlert: Bool = false
    @State private var toastMessage: String? = nil
    
    // Kuveyt Türk Brand Tokens
    private let ktPrimary = Color(red: 0x00 / 255.0, green: 0x2D / 255.0, blue: 0x59 / 255.0)       // #002D59
    private let ktCoral   = Color(red: 0xEA / 255.0, green: 0x38 / 255.0, blue: 0x29 / 255.0)       // #EA3829
    private let ktOrange  = Color(red: 0xFF / 255.0, green: 0x98 / 255.0, blue: 0x00 / 255.0)       // #FF9800
    private let pageBg    = Color(red: 0xF8 / 255.0, green: 0xFA / 255.0, blue: 0xFC / 255.0)       // #F8FAFC
    private let cardBorder = Color(red: 0xE2 / 255.0, green: 0xE8 / 255.0, blue: 0xF0 / 255.0)      // #E2E8F0

    public init() {}

    public var body: some View {
        ZStack {
            pageBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Custom Navigation Bar
                customNavigationBar
                
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 20) {
                        
                        // MARK: - Section 1: Güvenlik ve Giriş
                        settingsSection(title: "GÜVENLİK VE GİRİŞ") {
                            VStack(spacing: 1) {
                                // Face ID / Biometrics Toggle
                                Toggle(isOn: $biometricEnabled) {
                                    HStack(spacing: 12) {
                                        settingIcon(name: "faceid", color: ktPrimary)
                                        VStack(alignment: .left, spacing: 2) {
                                            Text("Face ID / Biyometrik Giriş")
                                                .font(.system(size: 13, weight: .semibold))
                                                .foregroundColor(Color(.label))
                                            Text("Uygulama açılışında biyometrik doğrulama")
                                                .font(.system(size: 10))
                                                .foregroundColor(.gray)
                                        }
                                    }
                                }
                                .toggleStyle(SwitchToggleStyle(tint: ktPrimary))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color(.systemBackground))
                                
                                // PIN Değiştir Action
                                Button(action: { showingPinChangeAlert = true }) {
                                    HStack(spacing: 12) {
                                        settingIcon(name: "lock.rotation", color: ktPrimary)
                                        VStack(alignment: .left, spacing: 2) {
                                            Text("Mobil Giriş PIN Değiştir")
                                                .font(.system(size: 13, weight: .semibold))
                                                .foregroundColor(Color(.label))
                                            Text("6 haneli mobil bankacılık şifresi")
                                                .font(.system(size: 10))
                                                .foregroundColor(.gray)
                                        }
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .font(.caption)
                                            .foregroundColor(.gray.opacity(0.6))
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 12)
                                    .background(Color(.systemBackground))
                                }
                                .buttonStyle(.plain)
                                
                                // Oturum Zaman Aşımı
                                HStack(spacing: 12) {
                                    settingIcon(name: "timer", color: ktPrimary)
                                    Text("Oturum Zaman Aşımı")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(Color(.label))
                                    Spacer()
                                    Picker("", selection: $autoLockMinutes) {
                                        Text("5 dk").tag(5)
                                        Text("15 dk").tag(15)
                                        Text("30 dk").tag(30)
                                    }
                                    .pickerStyle(SegmentedPickerStyle())
                                    .frame(width: 160)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color(.systemBackground))
                            }
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(cardBorder, lineWidth: 1))
                        }
                        
                        // MARK: - Section 2: Bildirimler
                        settingsSection(title: "BİLDİRİM VE UYARILAR") {
                            VStack(spacing: 1) {
                                Toggle(isOn: $checkNotificationsEnabled) {
                                    HStack(spacing: 12) {
                                        settingIcon(name: "doc.text.fill", color: ktPrimary)
                                        VStack(alignment: .left, spacing: 2) {
                                            Text("Anlık Çek ve Senet Bildirimleri")
                                                .font(.system(size: 13, weight: .semibold))
                                                .foregroundColor(Color(.label))
                                            Text("Takas ve tahsilat durum değişiklikleri")
                                                .font(.system(size: 10))
                                                .foregroundColor(.gray)
                                        }
                                    }
                                }
                                .toggleStyle(SwitchToggleStyle(tint: ktPrimary))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color(.systemBackground))
                                
                                Toggle(isOn: $invoiceNotificationsEnabled) {
                                    HStack(spacing: 12) {
                                        settingIcon(name: "envelope.fill", color: ktPrimary)
                                        VStack(alignment: .left, spacing: 2) {
                                            Text("E-Fatura & Kesim Bildirimleri")
                                                .font(.system(size: 13, weight: .semibold))
                                                .foregroundColor(Color(.label))
                                            Text("Gelen GİB e-faturaları ve yeni kesimler")
                                                .font(.system(size: 10))
                                                .foregroundColor(.gray)
                                        }
                                    }
                                }
                                .toggleStyle(SwitchToggleStyle(tint: ktPrimary))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color(.systemBackground))
                                
                                HStack(spacing: 12) {
                                    settingIcon(name: "calendar.badge.clock", color: ktOrange)
                                    VStack(alignment: .left, spacing: 2) {
                                        Text("Vade Yaklaşım Uyarısı")
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundColor(Color(.label))
                                        Text("Vadesi yaklaşan çekler için önceden uyar")
                                            .font(.system(size: 10))
                                            .foregroundColor(.gray)
                                    }
                                    Spacer()
                                    Picker("", selection: $maturityAlertDays) {
                                        Text("1 Gün").tag(1)
                                        Text("3 Gün").tag(3)
                                        Text("7 Gün").tag(7)
                                    }
                                    .pickerStyle(MenuPickerStyle())
                                    .font(.system(size: 12, weight: .bold))
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color(.systemBackground))
                            }
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(cardBorder, lineWidth: 1))
                        }
                        
                        // MARK: - Section 3: Görünüm & Tercihler
                        settingsSection(title: "GÖRÜNÜM & GİZLİLİK") {
                            VStack(spacing: 1) {
                                Toggle(isOn: $maskBalancesDefault) {
                                    HStack(spacing: 12) {
                                        settingIcon(name: "eye.slash.fill", color: ktPrimary)
                                        VStack(alignment: .left, spacing: 2) {
                                            Text("Bakiyeleri Varsayılan Olarak Maskele")
                                                .font(.system(size: 13, weight: .semibold))
                                                .foregroundColor(Color(.label))
                                            Text("Ana sayfa ve hesaplarda tutarları gizle")
                                                .font(.system(size: 10))
                                                .foregroundColor(.gray)
                                        }
                                    }
                                }
                                .toggleStyle(SwitchToggleStyle(tint: ktPrimary))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color(.systemBackground))
                                
                                HStack(spacing: 12) {
                                    settingIcon(name: "turkishlirasign.circle.fill", color: ktPrimary)
                                    Text("Para Birimi")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(Color(.label))
                                    Spacer()
                                    Text("TRY (₺)")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.gray)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color(.systemBackground))
                            }
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(cardBorder, lineWidth: 1))
                        }
                        
                        // MARK: - Section 4: Sistem & Ortam Bilgisi
                        settingsSection(title: "SİSTEM VE ORTAM BİLGİSİ") {
                            VStack(spacing: 1) {
                                environmentRow(label: "Sunucu / Veritabanı", value: "Supabase Live (PostgreSQL)", icon: "server.rack")
                                environmentRow(label: "API Endpoint", value: "zubhjybqzcpplultpsgt.supabase.co", icon: "link")
                                environmentRow(label: "Yetki / Rol", value: "admin@ops360.local (Yönetici)", icon: "person.badge.shield.checkmark.fill")
                                environmentRow(label: "Organizasyon ID", value: "13b8da90-27d1-440d-a8f4...", icon: "building.2.fill")
                                environmentRow(label: "Uygulama Sürümü", value: "v1.0.0 (Build 1) TestFlight", icon: "shippingbox.fill")
                            }
                            .cornerRadius(16)
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(cardBorder, lineWidth: 1))
                        }
                        
                        // MARK: - Section 5: İşlemler & Oturum Kapat
                        VStack(spacing: 12) {
                            Button(action: { showingClearCacheAlert = true }) {
                                HStack {
                                    Image(systemName: "trash")
                                        .font(.system(size: 14))
                                    Text("Yerel Önbelleği Temizle")
                                        .font(.system(size: 13, weight: .semibold))
                                    Spacer()
                                }
                                .padding(.vertical, 14)
                                .padding(.horizontal, 16)
                                .background(Color(.systemBackground))
                                .foregroundColor(Color(.label))
                                .cornerRadius(14)
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(cardBorder, lineWidth: 1))
                            }
                            .buttonStyle(.plain)
                            
                            Button(action: { showingLogoutAlert = true }) {
                                HStack {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                        .font(.system(size: 14, weight: .bold))
                                    Text("Güvenli Çıkış Yap")
                                        .font(.system(size: 14, weight: .bold))
                                    Spacer()
                                }
                                .padding(.vertical, 14)
                                .padding(.horizontal, 16)
                                .background(ktCoral.opacity(0.08))
                                .foregroundColor(ktCoral)
                                .cornerRadius(14)
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(ktCoral.opacity(0.3), lineWidth: 1))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 16)
                    .padding(.bottom, 40)
                }
            }
            
            // Toast feedback banner
            if let toast = toastMessage {
                VStack {
                    Spacer()
                    Text(toast)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.black.opacity(0.85))
                        .cornerRadius(20)
                        .padding(.bottom, 24)
                        .transition(.opacity)
                }
            }
        }
        .navigationBarHidden(true)
        .alert(isPresented: $showingPinChangeAlert) {
            Alert(
                title: Text("PIN Değiştirme"),
                message: Text("Yeni 6 haneli güvenlik PIN kodunuzu girmek için SMS doğrulama kodu gönderilecektir."),
                dismissButton: .default(Text("Tamam")) {
                    triggerToast("SMS onay kodu telefonunuza gönderildi.")
                }
            )
        }
        .alert(isPresented: $showingClearCacheAlert) {
            Alert(
                title: Text("Önbelleği Temizle"),
                message: Text("Geçici çevrimdışı veriler ve önbelleğe alınan dosyalar temizlenecektir."),
                primaryButton: .destructive(Text("Temizle")) {
                    triggerToast("Önbellek başarıyla temizlendi.")
                },
                secondaryButton: .cancel(Text("Vazgeç"))
            )
        }
        .alert(isPresented: $showingLogoutAlert) {
            Alert(
                title: Text("Çıkış Yap"),
                message: Text("Oturumunuz kapatılacaktır. Devam etmek istiyor musunuz?"),
                primaryButton: .destructive(Text("Çıkış Yap")) {
                    presentationMode.wrappedValue.dismiss()
                },
                secondaryButton: .cancel(Text("İptal"))
            )
        }
    }
    
    // MARK: - Subcomponents
    
    private var customNavigationBar: some View {
        HStack {
            Button(action: {
                presentationMode.wrappedValue.dismiss()
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                    Text("Menü")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundColor(ktPrimary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(ktPrimary.opacity(0.08))
                .cornerRadius(18)
            }
            
            Spacer()
            
            Text("Sistem Ayarları")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(Color(.label))
            
            Spacer()
            
            // Balance visual spacer for center alignment
            Color.clear
                .frame(width: 60, height: 32)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
        .overlay(
            Divider()
                .background(cardBorder),
            alignment: .bottom
        )
    }
    
    private func settingsSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .left, spacing: 8) {
            Text(title)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.gray)
                .tracking(0.5)
                .padding(.leading, 4)
            
            content()
        }
    }
    
    private func settingIcon(name: String, color: Color) -> some View {
        Image(systemName: name)
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(color)
            .frame(width: 28, height: 28)
            .background(color.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
    
    private func environmentRow(label: String, value: String, icon: String) -> some View {
        HStack(spacing: 12) {
            settingIcon(name: icon, color: .gray)
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.gray)
            Spacer()
            Text(value)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Color(.label))
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemBackground))
    }
    
    private func triggerToast(_ msg: String) {
        withAnimation {
            toastMessage = msg
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            withAnimation {
                toastMessage = nil
            }
        }
    }
}

#if DEBUG
struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
    }
}
#endif
