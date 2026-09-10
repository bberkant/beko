# MEZBAHA `server` BİLGİSAYARI - KALICI VERİ SENKRONİZASYON REHBERİ

Bu paket, Mezbaha `server` bilgisayarında (Windows Server 2012 R2) **Vega Arctos SQL**, **e-Faturalar** ve **Mezbaha Kesim Listesi** verilerini %100 kesintisiz, otomatik kurtarmalı (auto-recovery) ve tamamen gizli (zero-UI, arka plan) bir Windows Hizmeti olarak çalıştırmak için hazırlanmıştır.

---

## 🎯 Ne Sağlandı? Neden Artık Asla Bozulmaz?

1. **Masaüstünde Sıfır Kalabalık & Sıfır Açık Pencere**:
   - Açık kalan siyah CMD veya PowerShell pencereleri tamamen kaldırıldı.
   - Tüm servis `run_silent.vbs` ve Windows Görev Zamanlayıcı (`Task Scheduler`) aracılığıyla sistem seviyesinde (SYSTEM) arka planda sessizce çalışır.
2. **Elektrik Kesintisi & Yeniden Başlatma Dayanıklılığı**:
   - Sunucu yeniden başladığında, hiç kimse Windows oturumu açmasa bile servis otomatik olarak ayağa kalkar (`/sc onstart`).
3. **Akıllı Veritabanı Havuzu (MSSQL Connection Pool Singleton)**:
   - Önceki sürümde her istek için ayrı SQL bağlantısı açılıp havuz patlatılabiliyordu. Artık tekil, otomatik tekrar bağlanan (auto-reconnect) dayanıklı havuz kullanılıyor.
4. **Anlık Sağlık & Teşhis Endpoint'i**:
   - `/api/health` uç noktası üzerinden API'nin çalışma süresi, veritabanı gecikme süresi ve bağlantı durumu saniyelik test edilebilir.

---

## 📁 Dosyaların Hedef Konumu

Mezbaha `server` bilgisayarında dosyaların bulunacağı **resmi ve tek klasör**:
👉 `D:\yedekler\E D E 2023\BERKANT\1\VegaApi`

*(Masaüstündeki tüm eski veya mükerrer `VegaApi`, `start.bat`, `server.js` kısayolları ve dosyaları güvenle silinebilir.)*

---

## 🚀 1 Dakikalık Kurulum Adımları

### 1. Dosyaları Klasöre Kopyalayın
Bu `vega-api-service` klasöründeki tüm dosyaları Mezbaha `server` bilgisayarındaki `D:\yedekler\E D E 2023\BERKANT\1\VegaApi` içine kopyalayın (veya üzerine yazın).

### 2. Servisi Kurun (Yalnızca 1 Kez Yapılır)
1. `D:\yedekler\E D E 2023\BERKANT\1\VegaApi` klasörünü açın.
2. **`install_service.bat`** dosyasına **SAĞ TIKLAYIP** **"Yönetici Olarak Çalıştır"** (*Run as Administrator*) deyin.
3. Ekranda `[TEBRİKLER] KURULUM BAŞARIYLA TAMAMLANDI!` mesajını göreceksiniz.
4. Pencereyi kapatın. Artık arka planda çalışmaktadır!

### 3. Durumu Kontrol Edin
- İstediğiniz zaman **`status_service.bat`** dosyasını çift tıklatarak:
  1. Yerel API'nin (Port 5000) çalışıp çalışmadığını,
  2. Canlı alan adının (`https://vega-api.amasyaetas.com/api/health`) erişilebilirliğini,
  3. Windows Hizmetinin durumunu
  yeşil/kırmızı renkli net rapor olarak görebilirsiniz.

---

## 🛠️ Yönetim Dosyaları (Kullanım Kolaylığı)

| Dosya Adı | Ne İşe Yarar? |
| :--- | :--- |
| **`install_service.bat`** | Servisi Windows başlangıcına kalıcı olarak kaydeder ve hemen başlatır. |
| **`status_service.bat`** | Port 5000, Cloudflare tüneli ve Windows görev durumunu anında test eder. |
| **`restart_service.bat`** | Servisi arka planda durdurup temizce yeniden başlatır. |
| **`stop_service.bat`** | Servisi durdurur. |
| **`uninstall_service.bat`** | Servis kaydını Windows'tan tamamen siler. |
| **`setup_cloudflared_service.bat`** | Cloudflare Tunnel'ı kalıcı Windows servisi olarak kurmak için yardımcı araç. |

---

## 🌐 Veri Çekme Kanalları Özeti

| Veri | Çekilen Bilgisayar | Kaynak | Uç Nokta / Senkronizasyon |
| :--- | :--- | :--- | :--- |
| **Vega Cariler & Hareketler** | Mezbaha `server` | `VEGADB` (MSSQL) | `/api/cariler`, `/api/cariler/:code/hareketler` |
| **Vega Personel Listesi** | Mezbaha `server` | `VEGADB` (MSSQL) | `/api/personel`, `/api/personel/:code/hareketler` |
| **Son Cari İşlemleri** | Mezbaha `server` | `VEGADB` (MSSQL) | `/api/son-islemler` |
| **Etik & Marif e-Faturalar** | Mezbaha `server` | VEGADB + UBL/SOAP | `/api/etik/efaturalar`, `/api/marif/efaturalar` |
| **Mezbaha Kesim Listesi** | Mezbaha `server` | `Günlük Kesim 2022.xlsx` | `/api/kesim/records` & Supabase Sync |
| **Çek & Senet Takip** | Finans Ofis PC | `EbsCek.fdb` | `sync.ps1` (Doğrudan Supabase) |
| **Kasa & Banka & POS** | Finans Ofis PC | `F:\` Excel Dosyaları | Web Paneli Excel Import / Supabase |
