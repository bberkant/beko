import SwiftUI

public struct StaffAccount: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let username: String
    public let aliases: [String]
    public let role: String
    public let defaultPassword: String
}

public struct LoginView: View {
    @Binding public var isAuthenticated: Bool
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var rememberMe: Bool = true
    @State private var loading: Bool = false
    @State private var errorMessage: String = ""
    
    public static let allowedStaffUsers: [StaffAccount] = [
        StaffAccount(id: "9c242e61-e15f-41b5-b1e6-60a02baed90a", name: "Berkant", username: "berkant", aliases: ["berkant", "berkant@dars.local", "berkant@ops360.local"], role: "Developer", defaultPassword: "123berkant_"),
        StaffAccount(id: "291129b0-b5be-447e-97e1-51c613446aa3", name: "Admin", username: "admin", aliases: ["admin", "admin@ops360.local", "admin@dars.local"], role: "Admin", defaultPassword: "123berkant_"),
        StaffAccount(id: "c0e5fc93-e075-4351-9c50-8532a3c0cbda", name: "Hasan", username: "hasan", aliases: ["hasan", "hasan@dars.local"], role: "Muhasebe", defaultPassword: "365200"),
        StaffAccount(id: "4508b981-bf36-4198-ab1d-7a8c4a54f1d4", name: "Serdar", username: "serdar", aliases: ["serdar", "serdar@dars.local"], role: "Finans", defaultPassword: "365200"),
        StaffAccount(id: "b37be5b1-3df5-4bbc-b98e-dd5ae9dcb18a", name: "Drama", username: "drama", aliases: ["drama", "drama@dars.local"], role: "Finans", defaultPassword: "365200"),
        StaffAccount(id: "87ea8dcc-5ede-44a7-9b0b-89ea4465e5b1", name: "Burak", username: "burak", aliases: ["burak", "burak@dars.local"], role: "Görüntüleyici", defaultPassword: "365200"),
        StaffAccount(id: "8a40f3fa-6a5d-489a-b8bd-cf78f9023349", name: "Cem", username: "cem", aliases: ["cem", "cem@dars.local"], role: "Görüntüleyici", defaultPassword: "365200"),
        StaffAccount(id: "06799b4f-b592-4504-aa13-bd531afdc4d0", name: "Mert", username: "mert", aliases: ["mert", "mert@dars.local"], role: "Görüntüleyici", defaultPassword: "365200"),
        StaffAccount(id: "105d6beb-f701-4a68-81c1-8ce84fda2946", name: "Mustafa Demir", username: "mustafademir", aliases: ["mustafademir", "mustafa demir", "mustafademir@dars.local"], role: "Muhasebe", defaultPassword: "365200"),
        StaffAccount(id: "6c106113-a839-46c3-8516-80cfc904ed2c", name: "Önder", username: "onder", aliases: ["onder", "önder", "onder@dars.local", "önder@dars.local"], role: "Görüntüleyici", defaultPassword: "365200"),
        StaffAccount(id: "b6d40310-38ff-48b0-a873-8332ace373ff", name: "Süleyman", username: "suleyman", aliases: ["suleyman", "süleyman", "suleyman@dars.local", "süleyman@dars.local"], role: "Muhasebe", defaultPassword: "365200"),
        StaffAccount(id: "d3de0000-8888-4444-9999-000000000001", name: "Deneme", username: "deneme", aliases: ["deneme", "deneme@dars.local", "deneme@ops360.local"], role: "Görüntüleyici", defaultPassword: "365200")
    ]
    
    public init(isAuthenticated: Binding<Bool>) {
        self._isAuthenticated = isAuthenticated
    }
    
    public var body: some View {
        ZStack {
            Color.ktPageBackground
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                HStack(spacing: 10) {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.ktPrimary)
                        .frame(width: 32, height: 32)
                        .overlay(
                            Text("E")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.white)
                        )
                    Text("ETAŞ ET")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.ktPrimary)
                }
                .padding(.top, 24)
                
                Spacer()
                
                VStack(spacing: 16) {
                    Text("Etaş Et Kurumsal Yönetim")
                        .font(.ktTitle)
                        .foregroundColor(.ktTextHeading)
                    
                    Text("DARS Finans & Operasyon Portalı")
                        .font(.ktCaption)
                        .foregroundColor(.ktTextMuted)
                    
                    VStack(spacing: 12) {
                        TextField("Kullanıcı adı veya e-posta", text: $username)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled(true)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color.ktCardSurface)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.ktCardBorder, lineWidth: 1)
                            )
                        
                        SecureField("Şifrenizi yazın", text: $password)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color.ktCardSurface)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.ktCardBorder, lineWidth: 1)
                            )
                    }
                    .frame(maxWidth: 300)
                    
                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .font(.ktCaption)
                            .foregroundColor(.ktCoral)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: 300)
                    }
                    
                    Button(action: performLogin) {
                        HStack {
                            if loading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Giriş Yap")
                                    .font(.system(size: 14, weight: .semibold))
                            }
                        }
                        .frame(maxWidth: 300)
                        .padding(.vertical, 12)
                        .background(Color.ktPrimary)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(loading)
                }
                
                Spacer()
            }
            .padding(.horizontal, 20)
        }
    }
    
    public static func normalizeUserKey(_ input: String) -> String {
        return input
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased(with: Locale(identifier: "tr_TR"))
            .replacingOccurrences(of: "@dars.local", with: "")
            .replacingOccurrences(of: "@ops360.local", with: "")
            .replacingOccurrences(of: "@ets360.local", with: "")
            .replacingOccurrences(of: "ı", with: "i")
            .replacingOccurrences(of: "ğ", with: "g")
            .replacingOccurrences(of: "ü", with: "u")
            .replacingOccurrences(of: "ş", with: "s")
            .replacingOccurrences(of: "ö", with: "o")
            .replacingOccurrences(of: "ç", with: "c")
            .replacingOccurrences(of: " ", with: "")
    }
    
    public static func authenticateStaff(username: String, password: String) -> StaffAccount? {
        let key = normalizeUserKey(username)
        let cleanPass = password.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty, !cleanPass.isEmpty else { return nil }
        
        guard let staff = allowedStaffUsers.first(where: { account in
            normalizeUserKey(account.username) == key ||
            normalizeUserKey(account.name) == key ||
            account.aliases.contains(where: { normalizeUserKey($0) == key })
        }) else {
            return nil
        }
        
        let isAdminOrBerkant = staff.username == "berkant" || staff.username == "admin"
        if isAdminOrBerkant && cleanPass == "365200" {
            return nil
        }
        
        if isAdminOrBerkant && cleanPass == "123berkant_" {
            return staff
        }
        
        if !isAdminOrBerkant && (cleanPass == "365200" || cleanPass == staff.defaultPassword) {
            return staff
        }
        
        return nil
    }
    
    private func performLogin() {
        errorMessage = ""
        if let account = Self.authenticateStaff(username: username, password: password) {
            if rememberMe {
                UserDefaults.standard.set(account.username, forKey: "dars_logged_in_user")
            }
            isAuthenticated = true
        } else {
            errorMessage = "Geçersiz kullanıcı adı veya şifre."
        }
    }
}
