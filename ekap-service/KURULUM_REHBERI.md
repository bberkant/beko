# EKAP İhale Tarama Servisi Kurulum Rehberi (Ofis / Sunucu Bilgisayarı)

Bu paket, **EKAP (Kamu İhale Kurumu)** üzerinden et, karkas, sakatat ve tavuk gibi ürünlerin yer aldığı kamu ihalelerini otomatik tarayarak veritabanına ve Telegram'a aktaran bağımsız bir servistir.

---

### Kurulum Adımları (Ofis Bilgisayarı)

1. **Paketi Taşıyın:**
   - `ekap-service.zip` dosyasını ofisteki bilgisayarınıza kopyalayıp klasöre çıkartın (örn: `C:\ekap-service` veya `D:\ekap-service`).

2. **Manuel Tarama (İsteğe Bağlı):**
   - Klasördeki **`tarama_yap.bat`** dosyasına çift tıklayarak anlık canlı tarama yapabilirsiniz.
   - Tarayıcı açılıp sonuçları tarayacak ve bulunan ihaleler anında veritabanına ve Telegram'a gidecektir.

3. **Otomatik Günlük Görev Kurulumu:**
   - Klasördeki **`install_scheduler.bat`** dosyasına sağ tıklayıp **"Yönetici olarak çalıştır"** deyiniz.
   - Bu işlem, her sabah saat 09:30'da taramanın otomatik ve sessizce çalışmasını sağlayacaktır.

---

### Özellikler
- **Cloudflare Bypass:** Gerçek Chrome profili kullanarak bot engelini aşar.
- **Excel Entegrasyonu:** `İHALE TAKİP.xlsx` içerisindeki tüm ürün ve anahtar kelimeleri otomatik filtre olarak uygular.
- **Telegram Entegrasyonu:** Yeni ihale çıktığı anda kurumsal Telegram grubunuza/kanalınıza doğrudan özet bildirim gönderir.
- **ERP Web Entegrasyonu:** İhaleler web panelinizdeki (`cem.amasyactas.com/ihaleler`) onay havuzuna otomatik düşer.
