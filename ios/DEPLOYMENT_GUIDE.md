# 🚀 Marif Et iOS - TestFlight & App Store Dağıtım Kılavuzu

Bu belge, **Marif Et iOS** mobil uygulamasının Apple TestFlight ve App Store Connect'e yüklenmesi için izlenecek tüm teknik adımları ve otomatik yapılandırmayı içerir.

---

## 📋 Gereksinimler

1. **Apple Developer Hesabı ($99/yıl):** [developer.apple.com](https://developer.apple.com) üzerinden kayıtlı hesap.
2. **Mac Bilgisayar & Xcode 15+** (veya GitHub Actions / Codemagic gibi bulut CI/CD ortamı).
3. **App Store Connect Erişimi:** [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

---

## 🛠️ Proje Kimlik ve Yapılandırma Bilgileri

- **Uygulama Adı:** `Marif Et`
- **Bundle ID:** `com.marifet.mobile`
- **Sürüm:** `1.0.0` (Build `1`)
- **Hedef iOS:** `iOS 16.0+`
- **İzinler (Info.plist):**
  - Kamera İzni (`NSCameraUsageDescription`): Findeks Karekodlu Çek Tarama
  - Galeri İzni (`NSPhotoLibraryUsageDescription`): Çek/Fatura Fotoğrafı Yükleme
  - İhracat Kripto Muafiyeti (`ITSAppUsesNonExemptEncryption: NO`): TestFlight'a yüklerken şifreleme soru formunu otomatik atlar.

---

## 📲 Adım Adım TestFlight'a Yükleme (Xcode ile 3 Dakikada)

### 1. Projeyi Xcode'da Açın:
- `marif-et-ios` klasörünü veya `Package.swift` dosyasını Xcode ile açın.

### 2. Apple Developer Hesabınızı Bağlayın (Signing & Capabilities):
- Xcode sol menüsünden en üstteki proje adına tıklayın.
- **Signing & Capabilities** sekmesine gidin.
- **Team:** Şirket / Bireysel Apple Developer Team'inizi seçin.
- **Bundle Identifier:** `com.marifet.mobile` olarak doğrulayın.
- **Automatically manage signing:** `Checked (Aktif)` yapın.

### 3. Arşivleyin (Archive):
- Xcode üst menüsünden hedef cihazı **Any iOS Device (arm64)** olarak seçin.
- Üst menüden **Product > Archive** seçeneğine tıklayın.

### 4. TestFlight & App Store Connect'e Gönderin (Distribute App):
- Açılan *Organizer* penceresinde **Distribute App** butonuna tıklayın.
- **Custom / App Store Connect** seçeneğini işaretleyin.
- **Upload** diyerek ilerleyin.
- 2-3 dakika içinde paket Apple sunucularına yüklenecek ve işlenecektir.

---

## 👥 Çalışanların Telefonlarına Yükleme (TestFlight)

1. [App Store Connect](https://appstoreconnect.apple.com) > **Apps > Marif Et > TestFlight** sekmesine gidin.
2. **Internal Testing (Dahili Test Grubu)** oluşturun (Örn: `Sirket_Calisanlari`).
3. Şirket çalışanlarının e-posta adreslerini (Apple ID veya şirket e-postaları) ekleyin.
4. **Davet Gönder (Send Invites)** butonuna basın.
5. Çalışanlar iPhone'larına ücretsiz **TestFlight** uygulamasını indirir, gelen e-postadaki linke tıklayarak **Marif Et** uygulamasını anında telefonlarına kurarlar!

---

## 🔄 Yeni Güncelleme Gönderme

Yeni bir güncelleme göndermek istediğinizde:
1. `Info.plist` veya Xcode ayarlarından `CFBundleVersion` değerini `2`, `3`, `4`... olarak 1 artırın.
2. Tekrar **Product > Archive > Distribute App** yapın.
3. Çalışanların telefonlarına otomatik olarak *"Yeni Güncelleme Mevcut"* bildirimi düşecektir.
