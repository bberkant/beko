# MEZBAHA `server` BİLGİSAYARI - 7/24 WHATSAPP GATEWAY KURULUM REHBERİ

Bu paket, Mezbaha `server` bilgisayarında (Windows Server) WhatsApp Web Gateway servisini **%100 kesintisiz, otomatik kurtarmalı (auto-recovery) ve tamamen gizli (arka planda sessiz)** bir Windows Sistem Hizmeti olarak çalıştırmak için hazırlanmıştır.

---

## 🎯 Ne Sağlar?
1. **7/24 Kesintisiz Operasyon**: Kişisel bilgisayar kapansa dahi Mezbaha sunucusu 365 gün açık olduğu için şirket gruplarından gelen tüm fişler, faturalar, yakıt ve bakım masrafları anında ERP havuzuna akar.
2. **Kopmayan Oturum**: Sunucu kapanmadığı ve IP değişmediği için WhatsApp oturumu açık kalır; tekrar tekrar QR kod okutma ihtiyacı ortadan kalkar.
3. **Masaüstünde Sıfır Kalabalık**: Açık kalan konsol/siyah pencere olmaz, arka planda tamamen sessiz çalışır.
4. **Elektrik Kesintisi & Yeniden Başlama Dayanıklılığı**: Sunucu yeniden başladığında, hiç kimse Windows oturumu açmasa bile servis otomatik olarak ayağa kalkar (`/sc onstart`).

---

## 📁 1. Dosyaları Mezbaha Sunucusuna Kopyalama
Bu `whatsapp-service` klasörünü Mezbaha `server` bilgisayarına (Uzak Masaüstü / RDP, AnyDesk veya Paylaşılan Ağ Klasörü ile) kopyalayın.

Önerilen hedef konum:
👉 `D:\yedekler\E D E 2023\BERKANT\1\WhatsAppGateway`

---

## 🚀 2. Tek Tıkla Kurulum
1. Sunucuda kopyaladığınız `WhatsAppGateway` klasörünü açın.
2. **`install_service.bat`** dosyasına **SAĞ TIKLAYIP** **"Yönetici Olarak Çalıştır"** (*Run as administrator*) seçin.
3. Betik gerekli bağımlılıkları yükleyecek, Windows Görev Zamanlayıcısına kaydedecek ve servisi hemen başlatacaktır.
4. Ekranda `[TEBRİKLER] MEZBAHA WHATSAPP GATEWAY SERVİSİ BAŞARIYLA KURULDU!` yazısını gördüğünüzde pencereyi kapatabilirsiniz.

---

## 📲 3. WhatsApp Eşleştirmesi (Yalnızca 1 Kez)
1. Tarayıcınızdan web panelini açın: **`https://cem.amasyactas.com/whatsapp/sohbetler`**
2. Açılan pencerede Mezbaha sunucusunun ürettiği **canlı yeşil QR kodu** göreceksiniz.
3. Telefonunuzdan **WhatsApp > Ayarlar (veya sağ üst üç nokta) > Bağlı Cihazlar > Cihaz Bağla** adımı ile kameranızı ekrandaki koda tutun.
4. Eşleşme sağlandığı anda panelde **"Bağlantı Aktif (Mezbaha Server 7/24)"** yazacak ve işlem tamamlanacaktır.

---

## 🛠️ Yönetim Dosyaları

| Dosya Adı | Ne İşe Yarar? |
| :--- | :--- |
| **`install_service.bat`** | Servisi Windows başlangıcına kalıcı kaydeder ve hemen başlatır. |
| **`status_service.bat`** | Gateway'in çalışıp çalışmadığını kontrol eder. |
| **`restart_service.bat`** | Servisi durdurup temizce yeniden başlatır. |
| **`stop_service.bat`** | Servisi tamamen durdurur. |
| **`uninstall_service.bat`** | Servis kaydını Windows'tan tamamen siler. |
