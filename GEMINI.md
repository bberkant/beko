# Proje Özel Kuralları (Project Rules)

## Tablo Hızlı Düzenleme (Inline Edit) ve Simetri Standartları

Tablolarda satır içi hızlı düzenleme (`InlineEdit`, `InlinePaymentDate` vb.) bileşenleri geliştirirken veya güncellerken aşağıdaki kurallara kesinlikle uyulmalıdır:

1. **Hizalama ve Kenar Boşlukları (Padding-Right):**
   - Düzenlenebilir alan barındıran hücrelerin (`<td>`) ve bunlara karşılık gelen sütun başlıklarının (`<th>`) sağ tarafında, düzenleme ikonu için korumalı bir boşluk (`pr-10` veya `pr-8`) tanımlanmalıdır.
   - Böylece hem başlık hem de altındaki tüm veriler (düzenleme modunda olsun olmasın) aynı dikey eksende milimetrik olarak hizalanır.

2. **İkon Konumlandırma ve Kırpılmayı Önleme (absolute right-1 / right-2):**
   - Özellikle `table-fixed` tablolarda ve dar sütunlarda tarayıcı kırpılmalarını önlemek için düzenleme ikonu **hücre sınırlarının içinde kalacak şekilde** konumlandırılmalıdır.
   - **Tek Hücreli Düzenlemelerde:** `td` hücresine `relative overflow-visible pr-8 (veya pr-10)` verilmeli, içteki metin kapsayıcı `div` etiketinden `relative` sınıfı kaldırılmalı ve kalem butonu doğrudan hücreye göre `absolute right-1` (veya `right-2`) top-1/2 -translate-y-1/2 yapılmalıdır.
   - **Dikeyde Stack Edilmiş Çoklu Düzenlemelerde:** Kapsayıcı satır `div` etiketleri `relative` tutulup kalem butonu kendi satırına göre `absolute right-1` konumuna yerleştirilmelidir.
   - Kalem ikonunun boyutu kolay tıklanabilmesi ve standart olması için her zaman `size={16}` olarak ayarlanmalıdır.

3. **Taşma Kırpmasını Önleme (Overflow Visible):**
   - Kapsayıcı elementlerde kalem ikonunun dışarı taşmasına izin verilmelidir. Kapsayıcının dış `div` etiketlerinde `truncate` veya `overflow-hidden` gibi taşmayı gizleyen sınıflar kullanılmamalıdır. (Kapsayıcı `relative overflow-visible` olmalıdır).
   - Metnin kendisinin kısaltılması gerekiyorsa, `truncate` sınıfı kapsayıcı `div` yerine doğrudan içteki `span` etiketine uygulanmalıdır.

## Takas Çekleri Sayfası Kolon ve Taksit Kuralları

1. **TAKSİT Kolonu Yönlendirmesi ve Sınıflandırma:**
   - Banka ismi, keşidecisi veya alacaklı açıklaması **`ALBARAKA`**, **`KUVEYT`** veya **`TAKSİT`** içeren taksitli çekler, her zaman ana tablonun sağ tarafında bulunan **TAKSİT** sütununda listelenmelidir.
   - Bu çekler hiçbir şekilde sol alttaki "TAKASTA OLMAYAN ÇEKLER" tablosuna düşürülmemelidir.

2. **Banka Kolonlarının Ayrımı (E. vs M.):**
   - Etik (E.) ve Marif (M.) banka sütunları her zaman ayrı ayrı listelenmelidir (Örn: `E.ZİRAAT` ve `M.ZİRAAT` iki ayrı sütundur). Biri diğerinin altına gruplanmamalıdır.

3. **Otomatik Taksit Açıklamaları Temizleme Kuralı:**
   - Sistem tarafından otomatik üretilen çek açıklamalarının sonundaki tireli ekler (örn: `ALBARAKA-2.000.000`, `KUVEYT-3` veya `MARİF KUVEYT -2.100.000` gibi taksit bilgileri) ekranda gizlenmelidir.
   - Tireden önceki sol kısımda sistem kelimelerinden biri (`ALBARAKA`, `KUVEYT`, `TAKSİT`, `VAKIF`, `MARİF`, `MARIF`) geçiyorsa tireden sonrası kırpılır.
   - Manuel olarak girilen `CEM-KUVEYT KART` gibi özel isimlerin tireden önceki kısmı bu kelimeleri içermediği için kesinlikle kırpılmamalı ve yazıldığı gibi korunmalıdır.

4. **Taksit Sütunu Sıralama Mantığı:**
   - Taksit sütununda tutar/fiyat sıralaması yapılmaz. Bu sayede veri girişi esnasında satırların zıplayıp yer değiştirmesi engellenir.
   - `KUVEYT`, `MARİF KUVEYT`, `ALBARAKA`, `VAKIF KATILIM` gibi sistem taksitleri her zaman listenin **en üstünde**, kendi aralarında **alfabetik olarak sıralanmış (gruplanmış) şekilde** listelenir. Bu sayede aynı bankaya ait taksitler (örn: birden fazla `KUVEYT` girdisi) alt alta gruplanır.
   - Manuel girilen diğer tüm çekler ise bu sistem çeklerinin altında, yine kendi aralarında alfabetik olarak sıralanmış şekilde listelenir.

5. **Hesapta Olan Para Kısıtı:**
   - "Hesapta Olan Para" kartı üzerinde sadece **KUVEYT TÜRK**, **ZİRAAT** ve **ALBARAKA** hesapları gösterilmelidir; diğer banka hesapları filtrelenmelidir. Banka adları ekranda temiz ve sadeleştirilmiş olarak listelenmelidir.

6. **Tablo Hücreleri Çoklu Seçim ve Excel Bilgi Barı:**
   - Tutarların girildiği hücreler `Ctrl` (veya `Cmd` / `Shift`) + Click ile çoklu seçilebilmeli, seçili hücrelerin etrafı Excel tarzında yeşil çerçeveyle kaplanmalıdır.
   - En az 1 hücre seçildiğinde ekranın altında yüzen, hafifçe süzülen bir istatistik barı açılmalı ve seçilen tutarların **ORTALAMA**, **SAY** ve **TOPLAM** değerlerini canlı göstermelidir. `Esc` veya `X` butonu ile seçimler sıfırlanmalıdır.

7. **Yazı Boyutları, Renkler ve Kalınlıklar (Görsel Standartlar):**
   - Tablo başlıkları (`th` etiketleri) diğer CSS kuralları tarafından ezilmemesi için yüksek seçici önceliğiyle kesinlikle **kırmızı (#dc2626 !important)**, **bold (!important)** ve **17px (!important)** olmalıdır.
   - Tüm veri giriş hücreleri (tutar, bakiye, açıklama girdileri) hem ekranda hem de yazıcı çıktısında **17px** ve **normal (font-normal)** yazı tipinde olmalıdır (kalın olmamalıdır).
   - Tabloların altındaki sütun toplam tutarları (footers) **17px**, **bold (font-bold)** ve **siyah (text-black)** olmalıdır.
   - Taksit sütunundaki sağ taraftaki açıklamalar/isimler **bold (font-bold)**, sol taraftaki tutar rakamları ise **normal** olmalıdır.
   - "Hesapta Olan Para" tablosundaki banka isimleri ve bakiye girdileri **normal (font-normal)** olmalıdır.
   - "Kayıp Çekler" tablosundaki veri hücreleri (alacaklı, banka, tutar, tarih) **normal (font-normal)** olmalıdır.

8. **İç Takas Durumunun Korunması ve Renk Kilitlenmesi:**
   - Bir çek üst tablodan "İç Takas" yapılıp sonra "Takasta Değil" ile alt tabloya alındığında, "İç Takas" kimliği veri tabanında korunmalıdır (`TAKASTA OLMAYAN - İÇ TAKAS`).
   - Ertesi gün alt tablodan "Takasta" denilerek üst tabloya geri alındığında, çek yine **İç Takas** olarak (kırmızı renkle) üst tabloya dönmelidir.
   - İç Takas hücreleri (`.takas-ictakas-cell`), mouse ile üzerine gelindiğinde (hover) veya odaklanıldığında kesinlikle renk değiştirmemeli, **kırmızı (#dc2626 !important)** olarak kilitli kalmalıdır.

9. **Takasta Olmayan Çekler Tablosu Satır Sayısı:**
   - "TAKASTA OLMAYAN ÇEKLER" tablosunun varsayılan minimum satır sayısı simetri ve görsel düzen için **7** olmalıdır.

10. **Manuel Girilen Çeklerin Kalıcılığı (Ertesi Güne Devretme):**
    - "+ Çek Seç" modalından sıfırdan elle girilen ("Yeni Çek Manuel Gir") tüm çekler, eklenecek sütun seçeneğine göre otomatik olarak `TAKASTA` veya `TAKASTA OLMAYAN` özel alanı (ozel_alan) ile kaydedilmelidir.
    - Bu sayede, ertesi gün de olsa kullanıcı bu çekleri silmediği, ödedi demediği veya kaldırmadığı sürece panodan kaybolmaları/silinmeleri önlenir.
    - Manuel alınan çeklerde kullanıcının yazdığı Borçlu (Keşideci) bilgisinin kaybolmaması için bu değer veritabanındaki `kesideci` sütununa yazılırken, `debtor` sütunu ise tablo eşleştirmesini (routing) sağlamak adına hedef sütunun adı (örn: `TAKSİT` veya `E.ZİRAAT`) olarak kaydedilmektedir.
    - Modalın her iki sekmesinde de ("Sistemden Çek Seç" ve "Yeni Çek Manuel Gir") "Eklenecek Sütun" seçeneği kullanıcıya görünür ve seçilebilir durumdadır.

11. **Anlık/Gecikmesiz İşlem Yapma Standartı (Optimistic Updates):**
    - Durum değiştirme (`handleToggleTakasStatus`), hücre değer güncellemesi (`handleCellBlur` - güncelleme/silme yolları) ve banka bakiyesi düzenleme (`handleBalanceBlur`) gibi işlemlerde kullanıcı deneyimini maksimuma çıkarmak için **Optimistic Update** kullanılmalıdır.
    - Kullanıcı bir butona bastığında veya hücreye değer girip odak kaybettiğinde (`blur`), sistem önce yerel React state'ini (`checks` ve `bankAccounts`) **anında** güncellemeli; veri tabanı güncellemesini (`supabase`) arka planda sessizce yürütmelidir.
    - Bu sayede veri tabanından binlerce satırlık tüm çekleri tekrar indirme gecikmesi yaşanmaz ve ekran beklemeden anında "tık tık" tepki verir. Sadece hata durumunda veri tabanı ile yerel state senkronizasyonu yapılır.

12. **ETAŞ Takas Çekleri Dizayn (Baskı ve Ekran Standartları):**
    - **Banka Sütunları Arası Boşluk:** Üst banka tabloları arasında eşit ve belirgin **`10px`** flex boşluk (`gap: 10px !important`) uygulanmalıdır.
    - **Satır İçi Kenarlıklar (İç Kılavuz Çizgileri):** Hem web ekranında hem de yazdırma/PDF çıktısında tüm alt tabloların satır ve sütun iç bölücü çizgileri her zaman **`1px solid #d1d5db`** (açık gri / `border-gray-200` - Ödenecek Tutar altındaki ince çizgi tonu) olarak biçimlendirilmelidir. İç çizgilerde asla kaba siyah (`#000000`) kullanılmamalıdır.
    - **Dış Çerçeveler:** Tablo dış çevre çerçeveleri, başlık altı ve en alttaki toplam satırı ayracı belirgin **`2px solid #000000`** (kalın siyah) olarak korunmalıdır.
    - **Puntolar ve Tipografi:** 
      - Üst banka ve taksit çek tutarları `15-16pt`, sütun alt toplamları `16pt bold`. Taksit açıklamaları `font-weight: bold`.
      - İç Takas hücreleri (`.print-ictakas-cell`) çıktıda `#ef4444` (canlı kırmızı) ve `bold` olarak basılmalı; ekranda ise orijinal `#dc2626` korunmalıdır.
      - "Takasta Olmayan Çekler" başlığı `16pt bold kırmızı`, içerik satırları `11pt normal`, dip toplam satırı `11pt bold siyah`. Yazdırmada satır sayısı `11` satırdır (ekranda 7 satır).
      - "Takas Toplamı" kutusu `margin: 10px 0`, `height: 38px`, `18pt` etiket / `22pt` tutar olmalıdır.
    - **Tek A4 Yatay Sayfaya Sığdırma:** Tüm çıktı 2. sayfaya taşmadan **A4 Yatay tek sayfa** içine tam oturmalıdır.
    - **Sayfa Yönlendirme Kuralı:** Chrome yazdırma panelindeki "Yönlendirme" (Yatay/Dikey) seçeneğinin kaybolmasını engellemek için kodda kesinlikle hiçbir `@page` kuralı kullanılmamalıdır. Sayfa dış marj boşlukları doğrudan `body { margin: 3mm !important; }` kuralıyla yönetilmelidir.

13. **EBS Senkronizasyonunda Takas Ayarlarının ve Özel Durumların Korunması (Database-Level Protection):**
    - EBS Firebird veritabanından veri çekildiğinde (`sync.ps1`, arka plan zamanlayıcıları, cron veya harici ofis senkronizasyonu), EBS'deki boş veya varsayılan `ozel_alan`, `status` veya `debtor` değerleri kullanıcının web arayüzünde yaptığı **İç Takas (`TAKASTA - İÇ TAKAS`)**, **Takasta Olmayan (`TAKASTA OLMAYAN`)**, **Kayıp (`Kayıp`)** veya **Ödendi (`Ödendi`)** durumlarının üzerine ASLA yazılamaz.
    - Bu koruma hem istemci tarafı betiklerinde (`sync.ps1`) hem de Supabase PostgreSQL veritabanı seviyesinde `trg_preserve_ebs_checks_customizations` BEFORE UPDATE tetikleyicisi (trigger) ile garanti altına alınmıştır.

## POS Sayfası Kuralları

1. **Otomatik Satır Ekleme (Yapıştırma Mantığı):**
   - POS sayfasındaki her iki tabloda da (Banka/POS ve Şube/Terminal) Excel'den kopyala-yapıştır yapıldığında, gelen satır sayısı tablonun o anki kapasitesinden fazlaysa sistem otomatik olarak dinamik yeni satırlar eklemelidir (`updated.push(...)`).
   - Bu sayede yapıştırılan verilerin kırpılmasının önüne geçilir ve tüm veriler veritabanına eksiksiz kaydedilir.
   - Boş isimli/tutarlı satırların yükleme esnasında filtrelenerek kaybolmaması için `padLeftRows` ve `padRightRows` yardımcı filtre fonksiyonları bu dinamik satırları korumalıdır.

2. **Tablo Başlıklarının Kırmızı Rengi:**
   - POS sayfasındaki tabloların tüm başlık etiketleri (`th`), görünümde netlik ve dikkat çekicilik sağlamak amacıyla kesinlikle kırmızı (**color: #dc2626 !important**) olmalıdır. Bu kural local style bloğunda yüksek seçici önceliğiyle tanımlıdır.

3. **Kolon Sıralaması (Kesinti ve Komisyon Swap):**
   - Sol tablodaki (POS Bankaları) sütun sırası kesinlikle soldan sağa: **POS**, **ŞUBELER**, **BANKA GEÇEN**, **KOMİSYON (%)**, **KESİNTİ** şeklinde olmalıdır. (Kesinti ve Komisyon sütunlarının yerleri değiştirilmiştir).
   - Bu sıralama; UI bileşenlerinde, tablo gövdesinde (`tbody`), tablo toplam satırında (`tfoot`), kopyala-yapıştır alan eşleştirme dizisinde (`fieldsOrder` -> `['bank', 'colB', 'banka_gecen', 'komisyon', 'kesinti']`) ve Excel dışa aktarım şablonunda (`handleExportToExcel`) birebir korunmalıdır.

4. **DEPO Altındaki Sütunların/POS'ların Temizlenmesi (Garanti Kısıtı):**
   - Sağ tablodaki `DEPO` satırının altında yer alan `GARANTİ` satırı varsayılan şablondan (`DEFAULT_RIGHT_ROWS`) kaldırılmıştır.
   - Sayfa yüklendiğinde (`loadReport`), veritabanında `DEPO` altında kalan ve tutarı boş ya da `0,00` (sıfır) olan `GARANTİ` satırları otomatik olarak elenmelidir.
   - `GARANTİ` satırı sadece Excel'den kopyala-yapıştır ile sıfırdan farklı bir tutarla girildiğinde tabloda görünmelidir, aksi takdirde görünmemelidir.

## Kredi Kartları Sayfası Kuralları

1. **Ödenen Kartların Sıralaması:**
   - Kredi kartları listesinde, ödenmiş durumdaki kartlar (`currentDebt <= 0`) her zaman en acil borcu olan aktif kartların altında (listenin en altında) listelenmelidir.
   - Sıralama algoritmasında `currentDebt` değeri sıfır ya da sıfırdan küçük olan kartlar `hasDebt = false` olarak değerlendirilip listenin altına itilmeli, böylece arayüzdeki "(Ödendi)" etiketi ile sıralama tutarlı hale getirilmelidir.

## Genel Arayüz ve Yerleşim (Layout) Kuralları

1. **Sidebar (Sol Menü) Genişliği:**
   - Sidebar'ın varsayılan (açık) genişliği ekran yerleşimini daha dengeli göstermek ve "Çek & Senet İşlemleri" başlığının alt satıra kaymasını önlemek amacıyla **`230px`** olarak tanımlanmıştır.
   - Ana içerik taşıyıcı (`AppLayout.tsx` div container) sol dolgu (padding-left) değeri de sidebar'ın bu genişliğiyle uyumlu olacak şekilde **`lg:pl-[230px]`** olarak ayarlanmalıdır.
   - Kapalı (collapsed) durum genişliği **`72px`** ve dolgu değeri **`lg:pl-[72px]`** olarak sabit kalmalıdır.

2. **Topbar (Üst Bar) Buton ve İkon Görünürlüğü (Koyu Renk Temalar):**
   - Üst barın (header) koyu lacivert/mavi olduğu temalarda (`one_dars_v4`, `dia_v3` / Kurumsal v2, `banking_trial`) mobil menü açma, sidebar daraltma ve bildirim (çan) ikonları kesinlikle beyaz (**`text-white`**) olarak render edilmelidir.
   - Arama çubuğunun büyüteç ikonu (`search-icon` class'ı ile) ise bu koyu renk arka plandan etkilenmemesi için seçici spesifikliği artırılarak (`.theme-dia-v3 header .relative svg.search-icon`) bağımsız renklendirilmelidir.

3. **Sidebar Kaydırma Çubuğu (Scrollbar) Gizleme:**
   - Menü grupları açıldığında (örneğin "Finans" açıldığında) tarayıcının varsayılan dikey kaydırma çubuğunun (scrollbar) menüyü daraltıp "Çek & Senet İşlemleri" başlığını alt satıra kaydırmasını önlemek için sidebar menü kaydırma çubuğu gizlenmelidir (`sidebar-nav-container`).
   - Bu amaçla Webkit tarayıcılarda `width: 0px`, Firefox'ta ise `scrollbar-width: none` kuralları kullanılarak kaydırma çubuğunun genişlik kaplaması sıfırlanmalıdır. Menü işlevsel olarak kaydırılmaya devam edilecektir.

4. **Bulut ERP Teması Tasarım Kuralları:**
   - **Renk Paleti:** Marka rengi olarak Logo Turuncusu (`#f37021`) ve Logo Kırmızısı (`#e30613`) temel alınmıştır. 
   - **Menü Yapısı:** Sol menü arka planı beyaz, ikonlar turuncu/gri, etkin menü öğesi ise sol tarafta 4px turuncu çizgiyle vurgulanmış yumuşak turuncu arka plan rengine (`rgba(243, 112, 33, 0.08)`) sahiptir.
   - **Üst Bar:** Beyaz arka plana ve turuncu renkte işlevsel buton ikonlarına sahiptir.
   - **Kartlar ve Tablolar:** Kartların üst kenarında 3px kalınlığında turuncu şerit bulunarak premium ERP görünümü pekiştirilmiştir. Birincil butonlar turuncu arka planlıdır.
   - **Font:** Google Fonts üzerinden çekilen modern ve okunaklı `Roboto` yazı tipi entegre edilmiştir.

## POS Raporları Kısıtlamaları (POS Reports Constraints)

1. **Banka Geçen, Komisyon ve Kesinti Sütunları Kısıtı (Manual-Only POS Fields):**
   - Hangi durum veya işlem altında olursa olsun, otomatik Excel import scriptleri, watcher scriptleri (`watch-pos-excel.mjs`) veya veri onarım scriptleri **`banka_gecen` (Banka Geçen), `komisyon` (Komisyon %) ve `kesinti` (Kesinti) alanlarını Excel'den okuyup ezmemeli veya veritabanına yazmamalıdır.**
   - Bu alanlar veritabanına ilk kez yazılırken her zaman boş (`""`) olarak bırakılmalıdır.
   - Komisyon ve Kesinti hesaplamaları sadece kullanıcı arayüzden "Banka Geçen" tutarını el ile girdiği zaman frontend üzerinde otomatik olarak hesaplanacaktır.

2. **Doğrudan Supabase Veritabanı Kullanım Kuralı (Direct Database Standard):**
   - DARS istemci uygulaması (frontend), veri onarım scriptleri veya herhangi bir işlem süreci, ağdaki (örn: `\\192.168.1.159...`) veya yerel diskteki Excel dosyalarını doğrudan açmaya veya okumaya çalışmamalıdır.
   - Tüm finansal veriler, POS raporları ve Kasa kayıtları her zaman doğrudan Supabase veritabanındaki ilgili tablolardan (`pos_reports`, `main_cashbox` vb.) çekilmelidir.
   - Ağdaki veya yerel Excel dosyalarını izleyip veritabanına aktarma görevi sadece arka planda çalışan izleyici servislere (`watch-pos-excel.mjs` vb.) aittir.

## Kesim Listesi Excel Eşitleme ve Tarih Kuralları

Hem kullanıcı arayüzündeki (frontend) Excel yükleme modülünde hem de arka planda çalışan izleyici servisinde (`watch-pos-excel.mjs`) kesim verisi aktarılırken aşağıdaki kurallara kesinlikle uyulmalıdır:

1. **Tarih Boşluklarının (Birleştirilmiş Hücrelerin) Taşınması:**
   - Excel günlük kesim sayfalarında tarih sadece o güne ait ilk satırda yazmaktadır, alt satırlar boştur.
   - Veri okuma döngüsü her satırı işlerken `lastParsedDate` adında bir hafıza değişkeni tutmalıdır.
   - Eğer satırdaki tarih hücresi boşsa, bu satıra `lastParsedDate` atanmalıdır. Boş hücreler asla atlanmamalı veya varsayılan ayın 1. gününe sıfırlanmamalıdır.

2. **Yıl ve Ay Bağlamının Doğru Çözümlenmesi:**
   - Tarih parse edilirken gün numaraları (1-31) veya eksik tarih formatları mutlaka dosya sekme adındaki (örn. `05 MAYIS 2025` -> `2025` ve `05`) veya arayüzde seçilen bağlamdaki yıl ve ay ile birleştirilmelidir.
   - Excel seri numaraları (örn. `44740`) çözümlenirken ise doğrudan kendi yılı ve ayı kullanılmalı, bağlam ile ezilmemelidir.

3. **Mükerrer Kayıt Engelleme ve Güvenli Sayı Eşleştirmesi:**
   - Veritabanından gelen karkas ağırlığı (`carcass_weight`) gibi sayısal alanlar string olarak dönebileceğinden, karşılaştırma ve eşleştirme yapılmadan önce değerler mutlaka `Number()` ile sayıya dönüştürülmelidir.
   - Doğrudan string kıyaslaması yapılmamalı, virgülden sonraki ufak farklar (`Math.abs(dbVal - excelVal) < 0.01`) göz önüne alınarak kontrol edilmelidir.

## Tutar Girişlerindeki Nokta/Binlik Ayracı Kuralları

1. **Giriş Hücreleri Formatlanması (Real-time formatting):**
   - Kullanıcıların borç tutarı, ödenen tutar veya herhangi bir parasal değeri girdiği tüm `<input>` alanlarında, kullanıcı yazarken binlik basamaklar otomatik olarak nokta (`.`) ayracı ile ayrılmalı, kuruş kısmı ise virgül (`,`) ile ayrılmalıdır (Örn: `1.500.000,00`).
   - Bu amaçla giriş alanı `onChange` olayında `formatNumberString` yardımcı fonksiyonu kullanılmalıdır.
   - Doğrudan formatlanmamış metin girişi (`cleanNumericInput` ile yalın sayı) yerine her zaman `formatNumberString` ile formatlanmış değerler ekranda tutulmalı ve gösterilmelidir.

## Tutar Yazı Tipi ve Para Birimi Simge Kuralları

1. **Yazı Tipi (Font):**
   - Sitedeki tüm parasal tutarların (fiyat, borç, ödeme, bakiye vb.) yazı tipi (font-family) her zaman **Calibri** (`font-family: 'Calibri', 'Inter', sans-serif`) olmalıdır.

2. **₺ Simgesinin Konumu:**
   - Tüm parasal tutarlarda para birimi simgesi olan **₺ (TL)** simgesi kesinlikle tutarın soluna değil, **sağına** koyulmalıdır (Örn: `₺1.500,00` yerine `1.500,00 ₺` veya `1.500,00₺` şeklinde yazılmalıdır).

3. **Tema ve Layout Yazı Tipi Engelleri (Theme Overrides):**
   - Uygulama içinde yer alan farklı temaların (örneğin `bulut_erp`, `banking_trial`, `dia_v3`, `one_dars_v4` vb.) AppLayout.tsx dosyasındaki kendi iç `<style>` bloklarında yer alan wildcard (`*`) yazı tipi tanımları, global `index.css` kurallarını ezebilmektedir.
   - Yazı tipi değişimi (Calibri veya başka bir font) talep edildiğinde, sadece `index.css` veya `body` seçicisini değiştirmekle yetinilmemeli; `AppLayout.tsx` içerisindeki tüm aktif tema style bloklarındaki font-family tanımlarının başına da bu font (örn: `'Calibri'`) öncelikli olarak eklenmelidir.

## ETAŞ Rapor Tasarımı Standartları (ETAŞ Report Design Standards)

Yazıcı çıktı ekstrelerinde ve rapor tasarımlarında ETAŞ (.fr3 / .fp3) standartlarını korumak için aşağıdaki tasarım ve kodlama kurallarına kesinlikle uyulmalıdır:

1. **Yazı Tipi (Font) ve Başlık Grubu:**
   - Rapor genelinde yazı tipi **Tahoma** (`'Tahoma', sans-serif`) olmalıdır.
   - Ana başlık "Cari Hesap Ekstrası Detaylı" Tahoma 16pt (21px !important) ve **normal kalınlıkta (bold olmayan)** olmalıdır. Başlık altındaki satır aralıkları dikeyde sıkıca hizalanmalıdır (`line-height: 1.1`).
   - Cari (Firma) adı (örn: BURAK BESİCİLİK) üstten 7px ve alttan 4px dikey marjla (`margin: 7px 0 4px 0 !important`) konumlandırılsın.
   - Çıktı Tarihi Tahoma 8pt (11px) siyah renkte olmalı, üstündeki cari isminden 7px üst boşlukla (`margin-top: 7px`) ayrılmalı ve sol kenardan **2mm içeriye ötelenmiş** (`margin-left: 2mm`) olmalıdır.
   - Sağ üst köşede resmi ETAŞ ET logosu yer almalı, sağ kenardan 2mm dış boşlukla (`margin-right: 2mm`) konumlandırılarak tablonun sağ sınırıyla dikeyde hizalanmalıdır.
   - Başlık tablosunun altında 6px dikey boşluk (`margin-bottom: 6px`) bırakılmalıdır.

2. **Sayfa ve Tablo Yerleşimi (A4 Standartları):**
   - Sayfa yapısı A4 dikey (Portrait) genişliği olan **210mm** sınırına kilitlenmeli, tarayıcıların otomatik daraltma yapmaması için `table-layout: fixed !important;` ve `width: 100% !important;` kullanılmalıdır.
   - Sayfa kenar marjları (A4) 0mm olarak ayarlanmalı, tarayıcının varsayılan üst/alt bilgi başlıklarını gizlemek için body programatik olarak sağdan ve soldan **8mm** dolguyla (`padding: 10mm 8mm 15mm 8mm`) beslenmelidir.
   - Tüm elemanlara global `box-sizing: border-box !important` uygulanarak A4 sınırları dışına taşmalar engellenmelidir.

3. **Tablo Başlık Kutucukları (Headers):**
   - Kolon isimleri FastReport şablonuna göre: 'İşlem Türü' -> 'İzahat', 'Açıklama / İzahat' -> 'Açıklama', 'Alacak / Tutar' -> 'Alacak' olarak isimlendirilmelidir.
   - Tablo başlığında (`th`) `border-spacing: 0px 0px;` olmalı, bağımsız kutucuk görünümleri için sağda 8px beyaz boşluk (`border-right: 8px solid white`) bırakılmalıdır.
   - Kutucuk köşelerindeki çapraz birleşim çizgilerini ("ışık hüzmesi" sorunu) önlemek için border-top and border-bottom çizgileri kaldırılmalı (`none !important`), üst/alt kenarlıklar box-shadow inset gölgeleriyle (`inset 0px 1px 0px black, inset 0px -1px 0px black, inset -1px 0px 0px black`) çizilmelidir.
   - Sütun genişlik yüzdeleri: Tarih: %7.5, Malın Cinsi: %13.5, İzahat: %7.5, Açıklama: %25.5, Malın Miktarı: %12, Birim Fiyat: %10, Alacak: %10.5, Toplam Bakiye: %13.5 olarak ayarlanmalıdır. Bu genişlikler sayfa kenar marjlarından kazanılan alanın tamamını **Açıklama** sütununa tahsis ederek açıklamaların taşmamasını sağlar.

4. **Veri Satırları (Body):**
   - Tablo gövdesinde dikey/yatay tüm çizgiler kaldırılmalıdır.
   - Alternatif satır rengi (zebra) clGradientActiveCaption yani **#B9D1EA** olmalı ve ilk veri satırı mavi zebra ile başlayıp ardışık sıralanmalıdır.
   - Tüm veri hücrelerinin yazı tipi Tahoma 8pt (11px !important), hücre dikey iç boşlukları (padding) 3px olarak kilitlenmelidir.
   - "Malın Cinsi", "Açıklama", "Birim Fiyat", "Alacak" sütunlarındaki veriler kendi sütunlarında yatayda tam ortalanmış (`center`) olmalıdır.
   - "Açıklama" hücresinde metnin alt satıra geçmesi engellenmeli (`white-space: nowrap !important; overflow: hidden; text-overflow: ellipsis;`) ve satır yüksekliği tek satırda sabit tutulmalıdır.
   - "Birim Fiyat" ve "Alacak" sütunlarındaki değerlerin yanında "TL" ibaresi bulunmamalıdır. "TL" soneki sadece en sağdaki "Toplam Bakiye" sütununda yer almalıdır.
   - "Malın Cinsi" sütunundaki işlem adları "BORÇ" ve "ALACAK" olarak yazılmalıdır.
   - Önceki Dönemden Devreden satırının altında dikey boşluk (padding-bottom: 6px) bırakılmalı, bu satırdaki sıfır değerleri sütunlarında ortalanarak noktalı (`0.00` ve `0.00 (-) TL`) biçimde yazılmalıdır.

5. **Alt Toplam ve Genel Toplam Alanı:**
   - Genel Toplam alanı ve üzerindeki tek çizgi tablo elemanının dışına taşınarak alt bilgi (footer) genişliğiyle hizalanmalı, yanlardan 2mm kısaltılarak yerleştirilmelidir.
   - "Genel Toplam :" etiketi ile net bakiye değeri aradaki büyük boşluk kaldırılarak yan yana getirilmeli, Tahoma 9pt Bold (12px bold) yapılmalıdır. Genel Toplam altındaki ikinci çizgi tamamen kaldırılmalıdır.
   - Genel Toplam alanında alacak toplamının sütun dökümü boş bırakılmalıdır.

6. **Sayfa Alt Bilgisi (Footer):**
   - Sayfa footer'ı (Sayfa, Web Sitesi, Slogan) sayfa altından 14mm yukarıda konumlandırılmalı, yanlardan 10mm kenar boşluğuyla (tablodan 2mm daha içeride) daraltılmalıdır.
   - Alt bilgi alanı üst çizgiden 7px padding-top ile ayrılmalı, tüm footer metinleri Tahoma 9pt (12px) Bold olarak kalın yazılmalıdır. Slogan metni de bold olmalıdır.

## Takas Çekleri Modülü Standartları (Takas Checks Module Standards)

Takas çekleri tablosunun düzeni ve şirketlere göre banka dağıtımı için aşağıdaki kurallara uyulmalıdır:

1. **Şirket Önekleri (E. ve M. Ayrımı):**
   - E. öneki `ETİK` şirketini (Etik Deniz, Etik Ziraat, vb.), M. öneki ise `MARİF` şirketini (Marif Deniz, Marif Ziraat, vb.) temsil eder.
   - Her banka (AKBANK, DENİZ, ZİRAAT, ALBARAKA, İŞBANK, GARANTİ vb.) bu şirket yapılarına göre iki ayrı sütun (`E.BANKA` ve `M.BANKA`) olarak yapılandırılmalıdır.
   - Gelen çekler, keşideci/borçlu ya da banka adındaki öneklere bakılarak (`E.` veya `M.`) uygun sütunlara atanır. Önek bulunmuyorsa varsayılan olarak `E.BANKA` sütununa atanır.

2. **Dinamik Sütun ve 8 Sütun Kısıtlaması:**
   - Takas tablosundaki banka sütun sayısı her koşulda dinamik olarak **8 sütunda** sınırlandırılır.
   - O gün çeki bulunan (aktif) sütunlar öncelikli olarak gösterilir. Çeki bulunmayan boş sütunlar ise elenerek yerlerine çeki olan diğer bankalar veya şirket versiyonları yerleştirilir.
   - Eğer hem E. hem de M. versiyonlarında çek varsa, her ikisi de tabloda bağımsız iki sütun olarak yer alır.
   - Kolonların görsel sıralamasının bozulmaması için, seçilen 8 sütun her zaman tanımlı global banka sırasına göre soldan sağa dizilmelidir.

## Geliştirme Sunucusu (Dev Server) Standartları

1. **Geliştirme Sunucusunun (localhost:5173) Kalıcılığı:**
   - Antigravity başlatıldığında veya her oturumun başında, `localhost:5173` üzerinde koşan Vite geliştirme sunucusunun (`npm run dev`) aktif olup olmadığı kontrol edilmelidir.
   - Eğer sunucu durmuşsa veya bağlantı reddediliyorsa, arka planda çalışan bir daemon task olarak (`npm.cmd run dev` veya `npm run dev` ile `IsDaemon: true`) otomatik olarak başlatılmalıdır.

## Para Birimi Formatı ve Standartları (Currency Formatting Standards)

1. **Türk Lirası Simgesi Konumu (₺ Simgesi Her Zaman Sağda):**
   - Türk Lirası para birimi simgesi (`₺`), Amerikan Doları (`$`) gibi tutarın soluna yazılmaz. Türkçe dil, muhasebe ve finans standartlarına uygun olarak **her zaman tutarın SAĞINA** yazılmalıdır (Örn: `23.390.500 ₺`, `-10.294.820 ₺`, `607.3M ₺`).

## Kredi Kartı Takip ve Hatırlatma Standartları (Credit Card Tracking Standards)

1. **Limiti 0 Olan Kartların Sıralaması ve Hatırlatması:**
   - Limiti 0 olan kartlar tabloda görünmeye devam eder, fakat **asla son gün hatırlatması için yukarı çıkmaz; her zaman tablonun en alt sıralarında durur**.
   - Limiti 0 olan kartlar Telegram hatırlatmalarına ve aciliyet sayaçlarına dahil edilmez.
2. **Son Ödeme Günü Önceliği (Borç 0 Olsa Dahi):**
   - Limiti 0'dan büyük olan bir kartın borcu 0 görünse dahi, son ödeme tarihi yaklaşmışsa (son 2 gün, yarın veya bugün) ekranda `(bugün)`, `(yarın)`, `(son 2 gün)` rozetleriyle tablonun EN TEPESİNDE yer alır ve Telegram hatırlatması eksiksiz gönderilir.
3. **Pasife Alınan Kartlar:**
   - Durumu `pasif` olan kartlar ana kredi kartı listesinde gösterilmez.
   - Sayfa başlığındaki **'İşlemler'** menüsünün en altında yer alan **'Pasife Alınan Kartlar'** seçeneği ile açılan modal üzerinden incelenebilir ve istenirse tek tıkla tekrar aktif edilebilir.

## Rol ve Modül Erişim Standartları (Role & Module Access Standards)

1. **Ana Kasa Modülü Erişimi:**
   - 'Ana Kasa' ana modülü ve alt sayfaları (`/ana-kasa`, `/ana-kasa/rapor`, `/ana-kasa/gunluk-hesap`), Süper Admin'lerin yanı sıra **Developer** rolündeki kullanıcıların da sol menüsünde görüntülenir ve tam erişimine açıktır.
2. **Ana Kasa Günlük Rapor Veri Bağımsızlığı:**
   - 'Ana Kasa Günlük Rapor' sayfası, Günlük Hesap / banka hareketleri (`bank_transactions`) modülü ile herhangi bir otomatik veri çekme veya enjeksiyon (Bank Fark, banka çıkışları/girişleri vb.) yapmaz; tamamen kendi kasa hareketleri (`main_cashbox_transactions`) üzerinden bağımsız çalışır.

## Ana Kasa Günlük Rapor Excel Tasarım ve Düzen Standartları

1. **Birebir Excel Düzeni (Çift Taraflı Kasa Yapısı):**
   - **Genel Grid:** `grid-cols-[57%_14px_41%]` (ÇIKIŞ %57, Orta Çift Çizgi Ayracı 14px, GİRİŞ %41).
   - **Çıkış Sütunları:** Açıklama/Cari (%55 sola dayalı font-bold), Banka/Tür (%20 font-black kırmızı `#be123c`), Tutar (%25 sağa dayalı font-black).
   - **Giriş Sütunları:** Açıklama/Cari/Banka (%70 sağa dayalı font-bold, 0. satır Kasa Devir `#dc2626` kırmızı), Tutar (%30 sağa dayalı font-black).
   - **Orta Ayraç:** 14px çift dikey siyah çizgi (`border-l border-black border-r border-black`).
   - **Çizgiler & Yükseklik:** Dış çerçeve `border-2 border-black`, satır altları `border-b border-black`, sütunlar `divide-x divide-black`. Satır yüksekliği sabit `h-[34px]`, font `Calibri, sans-serif`.
   - **Dip Toplam:** `border-t-2 border-black`, kırmızı `TOPLAM` etiketleri ve kalın toplam tutarlar.
    - **Yazdırma (Print):** A4 Dikey tek sayfaya ölçeklenerek fiziksel Excel çıktısıyla 1:1 tıpatıp aynı formda basılır.
   - **Veri Bağımsızlığı:** Sayfa yalnızca kendi kasa kayıtları (`main_cashbox_transactions`) üzerinden çalışır.

## Günlük Hesap Modülü Excel Kart ve Mutabakat Standartları

1. **Banka Defteri Kart Düzeni (2 Sütunlu Grid):**
   - **Grid:** Masaüstünde yan yana 2'li banka kutuları (`grid grid-cols-1 md:grid-cols-2 gap-6`).
   - **Banka Sıralaması:** HALKBANK, ZİRAAT, GARANTİ, AKBANK, İŞBANK, DENİZ, ŞEKER/TEB, YAPI, ALBARAKA, VAKIF, KUVEYT.
   - **Dış Çerçeve:** Kalın siyah `border-2 border-black`, başlık `text-lg sm:text-xl font-black uppercase` ve altı `border-b-2 border-black`.
2. **Hücre Oranları ve Tablo Yapısı:**
   - **Izgara:** 10 birim (`grid-cols-10`), sol 5 birim ÇIKIŞ, sağ 5 birim GİRİŞ. Ortada kalın dikey ayraç (`divide-x divide-black`).
   - **Sütun Dağılımı:** Sol yarıda Tutar (%40 sağa dayalı font-bold) + Açıklama (%60 sola dayalı font-bold); sağ yarıda Tutar (%40 sağa dayalı font-bold) + Açıklama (%60 sola dayalı font-bold).
   - **Hücre Boyutları & Font:** Satır yüksekliği sabit `h-[34px]`, font `Calibri, sans-serif`, iç çizgiler `border-gray-300`.
   - **Satır Sayısı:** Standart bankalarda en az 5, Kuveyt Türk'te en az 10 satır; altta daima 2 boş satır hazır tutulur.
   - **Vurgular:** 'Çek', 'çekten' veya 'kart' ifadeleri içeren hareketler `bg-red-100` pembe/kırmızı ile belirginleştirilir.
3. **Dip Toplam ve ALDIK / YATAN Rozeti:**
   - **Dip Toplam:** `border-t-2 border-black` kalın çizgi altında sol ve sağ toplamlar (`16px font-black`).
   - **Fark Rozeti:** Kart altında ortalanmış büyük rozet; Fark <= 0 ise kırmızı `... ALDIK`, Fark > 0 ise mavi `... YATAN`.

## Mezbaha Sunucusu ve Backend Dağıtım Kuralları (Server Deployment & Terminal Reminders)

1. **Sunucu Dosyası Güncellemelerinde Terminal Komutlarını Proaktif Bildirme:**
   - Mezbaha sunucusundaki `server.js` veya herhangi bir backend/API dosyası güncellendiğinde ya da kullanıcıya teslim edildiğinde, **kullanıcının sormasına kesinlikle mahal verilmeden** sunucu terminalinde çalıştırılacak komutlar her zaman adım adım ve hazır kod bloğu olarak yanıta eklenecektir:
     1. Eğer terminalde önceki bir işlem çalışıyorsa klavyeden `Ctrl + C` basılarak durdurulması,
     2. `node server.js` (veya ilgili dosya adı) komutunun yazılması,
     3. Başarılı açılışta terminalde çıkması beklenen onay logu (`API servisi 5000 portunda başarıyla başladı...`).
   - Bu hatırlatma, sunucuyla ilgili her dosya güncellemesinde otomatik olarak yanıtın altında yer almalıdır; kullanıcıya asla "ne yazacaktım" dedirtilmeyecektir.

## Para Birimi Formatı ve Simge Yerleşimi (Currency Formatting Standards)

Projede Türk Lirası (₺) para birimi gösterimi yapılırken aşağıdaki kurala KESİNLİKLE uyulacaktır:

1. **₺ Simgesi Her Zaman Tutarın Sağında Olmalıdır:**
   - Para formatlama yardımcı fonksiyonlarında ve tüm kullanıcı arayüzü bileşenlerinde Türk Lirası simgesi (`₺`) tutarın solunda değil, **her zaman sağında** yer almalıdır.
   - **Doğru Format:** `250.000,00 ₺`, `8.050.000,00 ₺`
   - **Yanlış Format:** `₺250.000,00`, `₺ 250.000,00`
   - Standart Formatlama Kodu:
     ```ts
     const formatMoney = (n: number) =>
       `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ₺`;
     ```

## POS Komisyon Farkı Hesaplama Kalıcılık ve Veri Koruma Standartları (POS Differences Persistence Standards)

POS Komisyon Farkı Hesaplama modülünde (`/finans/pos-fark-hesaplama` - `PosDifferencesPage.tsx`) girilen veriler için aşağıdaki kalıcılık kurallarına KESİNLİKLE uyulacaktır:

1. **Manuel Silinmedikçe Verilerin Korunması (Zero Auto-Reset / Persistence Invariant):**
   - Sayfada bulunan tüm POS kartlarındaki **POS Başlığı** (`title`), **Toplam POS Tutarı** (`pos`), **Anlaşma Oranı** (`baseRate`) ve **Uygulanan Oran** (`appliedRate`) verileri kalıcıdır.
   - Kullanıcı ilgili giriş alanını kendisi manuel olarak silmediği veya değiştirmediği sürece; sayfa yenilemelerinde, oturum açılıp kapanışlarında veya yeni geliştirmelerde bu veriler ASLA varsayılan değerlerle sıfırlanmayacak, üzerine yazılmayacak veya temizlenmeyecektir.
   - Geliştirme ve bakım süreçlerinde bu alanların sıfırlanmasına ya da başlangıç durumuna dönmesine neden olacak herhangi bir otomatik temizleme veya sabit mock veri ataması yapılamaz.
