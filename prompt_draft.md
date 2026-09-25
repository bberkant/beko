# Teamwork Project Prompt — Dashboard Takvimi Özelleştirme ve Kullanıcıya Özel Notlar Sistemi

> Status: In Execution
> Goal: Dashboard takviminde kategori bazlı dinamik veri filtreleme, kullanıcıya özel izole Yapılacaklar & Notlar sistemi, takvim ikonuyla ileri tarihe hatırlatıcı not ekleme ve toplu not temizleme özelliğini geliştirmek.

Dashboard takviminde ve ilişkili panolarda hangi veri tiplerinin (Kredi Kartı, Muayene, Sigorta, İhale, Not) gösterileceği kullanıcılar tarafından filtrelenebilecek, tercihler kullanıcı bazında saklanacaktır. Yapılacaklar & Notlar modülü her kullanıcıya özel (izole) hale getirilecek, takvim entegreli tarih seçici ile ileri vadeli hatırlatma notları eklenebilecek ve tek tıkla toplu temizleme yapılabilecektir.

Working directory: C:\Users\berka\.gemini\antigravity\scratch\beko-guncel
Integrity mode: development

## Requirements

### R1. Dashboard Takvim Veri Türü Filtreleme (Kategori Bazlı Seçim)
- Takvim üzerindeki `● KART`, `● MUAYENE`, `● SİGORTA`, `● İHALE`, `● NOT` etiketleri tıklanabilir interaktif filtre butonlarına dönüştürülecektir.
- Kullanıcı istediği veri türlerini kapatıp açabilecektir (örneğin muhasebe kartları gizleyip sadece ihale/muayene görebilecek).
- Aktif ve pasif durumlar görsel olarak ayırt edilecek; hem aylık takvim hücreleri hem de günlük detay tablosu seçili filtrelere göre dinamik güncellenecektir.
- Filtre tercihleri kullanıcı bazında (`dars_calendar_filters_<userId>`) kalıcı olarak saklanacak ve sayfa yenilendiğinde korunacaktır.

### R2. Kullanıcıya Özel İzole Yapılacaklar & Notlar Sistemi
- Yapılacaklar & Notlar listesi tamamen oturum açan kullanıcıya özel (`created_by = user.id`) olacaktır.
- Hiçbir kullanıcı başka bir kullanıcının notlarını veya görevlerini göremeyecektir.
- Topbar bildirimleri ve bildirim merkezi de sadece kullanıcının kendi not hatırlatıcılarını yansıtacaktır.

### R3. Takvim İkonu ve İleri Tarihli Hatırlatıcı Not Ekleme
- Yapılacaklar & Notlar giriş alanına takvim ikonu eklenecektir.
- Kullanıcı takvim ikonuna tıklayarak belirli bir tarih veya hızlı hazır butonlar ("Bugün", "Yarın", "1 Hafta Sonra", "1 Ay Sonra") seçebilecektir.
- Eklenen tarihli notlar hem Yapılacaklar & Notlar listesinde tarih rozetiyle (`📅 03 Eki (7 gün sonra)`) gösterilecek hem de ana takvim üzerinde o tarihte `● NOT` etkinliği olarak yer alacaktır.

### R4. "Tümünü Temizle" Toplu Silme Fonksiyonu
- Yapılacaklar & Notlar kartının sağ alt tarafına "Tümünü Temizle" butonu eklenecektir.
- Yanlışlıkla silinmeleri önlemek için onay mekanizması ("Emin misiniz? Evet, Sil / İptal") bulunacaktır.
- Onay verildiğinde kullanıcının notları hem yerel önbellekten hem de Supabase veritabanından kalıcı olarak temizlenecektir.

## Acceptance Criteria
- [ ] Takvim etiketlerine tıklandığında ilgili etkinlik türleri anında gizlenmeli/gösterilmeli.
- [ ] Kullanıcının filtre seçimleri oturumlar ve sayfa yenilemeleri arasında korunmalı.
- [ ] Farklı kullanıcı hesapları birbirlerinin notlarını kesinlikle görememeli.
- [ ] Takvim ikonundan "1 Hafta Sonra" seçilerek eklenen not takvimde ve listede doğru tarihte görünmeli.
- [ ] Sağ alttaki "Tümünü Temizle" butonu onay sonrası tüm notları temizlemeli.
- [ ] `npm run build` hatasız tamamlanmalı.
