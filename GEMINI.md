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

1. **Banka Geçen Sütunu Kısıtı (Manual-Only Banka Geçen):**
   - Hangi durum veya işlem altında olursa olsun, otomatik Excel import scriptleri, watcher scriptleri (`watch-pos-excel.mjs`) veya veri onarım scriptleri **`banka_gecen` (Banka Geçen) sütununu Excel'den okuyup ezmemeli veya güncellenmemelidir.**
   - Banka Geçen sütunu sadece ve sadece kullanıcının web arayüzünden el ile girdiği manuel verileri tutacaktır. Otomatik tüm arka plan süreçleri veritabanındaki mevcut `banka_gecen` değerlerini birebir korumalıdır.
