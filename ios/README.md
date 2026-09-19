# Marif Et - Native iOS Swift / SwiftUI Mobil Uygulaması

Bu proje, **Marif Et Ve Et Ürünleri (Gıda Tarım Hayvancılık A.Ş.)** kurumsal web portalındaki tüm 25 modül ve canlı Supabase veri tabanının **Apple iOS (SwiftUI & Swift 5.9+)** yerel mobil uygulamasına birebir uyarlanmış sürümüdür.

---

## 📱 Mimari ve Klasör Yapısı (MVVM)

```
marif-et-ios/
├── Package.swift                    # Swift Package Manager manifestosu (Supabase Swift SDK)
├── App/
│   └── MarifEtApp.swift             # iOS Uygulama Giriş Noktası (@main)
├── Core/
│   ├── Network/
│   │   ├── SupabaseConfig.swift     # Canlı Supabase URL, API Key & Organizasyon İzolasyonu
│   │   └── SupabaseService.swift    # Generic async/await PostgREST sorgu katmanı
│   ├── Theme/
│   │   ├── AppColors.swift          # Kurumsal Düz Lacivert (#002D59), Slate & Semantik Renkler
│   │   └── UIComponents.swift       # MetricCard, FilterChip, StatusBadge, SearchBar
│   └── Utilities/
│       └── Formatters.swift         # Türkçe Para Birimi (TL), Tarih ve Gün Hesaplamaları
├── Models/                          # Supabase Tablolarıyla 1-e-1 Uyumlu Veri Modelleri
│   ├── Check.swift                  # ebs_checks (Takas & Çek/Senet Listesi)
│   ├── Cari.swift                   # vega_cariler & vega_cari_hareketler
│   ├── Vehicle.swift                # vehicles (63 araç, muayene/kasko/sigorta/rehin)
│   ├── Slaughter.swift              # kesim_listesi & acik_mal_odemeleri
│   ├── Financial.swift              # credit_cards, bank_accounts, bank_transactions
│   └── Tender.swift                 # tenders (199 EKAP ihalesi & teminatlar)
├── ViewModels/                      # @MainActor & ObservableObject Durum Yönetimi
│   ├── DashboardViewModel.swift     # Finansal Özet, Banka Mevcutları, Hatırlatıcılar
│   ├── ChecksViewModel.swift        # Çek & Senet Listesi (EBS 4'lü KPI, Canlı Arama)
│   ├── TakasViewModel.swift         # Takas Çekleri & Banka Matrisi Tablosu (2.91M TL)
│   ├── VehiclesViewModel.swift      # 63 Araçlık Filo, Kritik Muayene Geri Sayımı
│   └── CarilerViewModel.swift       # Borçlu/Alacaklı Müşteri & Tedarikçi Ekstreleri
└── Views/                           # SwiftUI Görünümleri
    ├── MainTabView.swift            # 5 Ana Sekmeli Alt Menü (Tab Bar)
    ├── Dashboard/
    │   └── DashboardView.swift      # Ana Sayfa, Kurumsal Başlık & Hızlı Modüller
    ├── Checks/
    │   ├── CheckListView.swift      # Çek & Senet Listesi (Kesilen/Alınan/Tahsilde)
    │   └── CheckRowView.swift       # Evrak Kartı ve İşlem Aksiyonları
    ├── Takas/
    │   ├── TakasView.swift          # Özel Takas Ekranı (Takasta / İç Takas / Ödenen)
    │   └── TakasMatrixView.swift    # Web Portal Birebir Banka Matrisi Tablosu
    ├── Cariler/
    │   └── CarilerListView.swift    # Cari Kartlar, Bakiye Filtreleri ve Ekstre Sayfası
    ├── Vehicles/
    │   └── VehiclesListView.swift   # 63 Araçlık Filo ve Muayene/Kasko Takip Kartları
    ├── Finance/
    │   └── CreditCardsView.swift    # 31 Şirket Kredi Kartı ve Limit Dolulukları
    ├── Slaughters/
    │   └── CektenHesabiView.swift   # Kuveyt Türk 15M Limit & ÇEKTEN Açık Mal Hesabı
    └── Menu/
        └── MainMenuView.swift       # 25 Modülün Tamamını İçeren Hiyerarşik Akordeon
```

---

## 🎯 Öne Çıkan Özellikler

1. **İki Ayrı Çek Modülü:**
   * **Takas Çekleri (`TakasView`):** Web portalındaki banka matrisini (`ALBARAKA`, `E.DENİZ`, `E.ZİRAAT`, `M.ZİRAAT`, `M.DENİZ`, `M.GARANTİ`, `M.AKBANK`, `M.YAPI`, `TAKSİT`) ve bugün ödenecek 5 evrakı (`2.917.696,00 TL`) gösterir.
   * **Çek & Senet Listesi (`CheckListView`):** 4'lü Finansal KPI kartı, Kesilen/Alınan sekmeleri, tarih/durum filtreleri ve canlı arama motoru ile tüm 5.252 evrakı listeler. Kesinlikle Takas matrisi içermez.

2. **63 Araçlık Kurumsal Filo Takibi (`VehiclesListView`):**
   * Muayene bitişine 15 günden az kalan araçlar için acil kırmızı uyarı rozetleri.
   * Kasko şirketi, sigorta ve daini mürtehin (rehinli banka) detayları.

3. **Cari & Vega Entegrasyonu (`CarilerListView` & `CariDetailView`):**
   * Toplam alacak ve borç KPI'ları.
   * Tıklanan carinin tüm fatura ve tahsilat hareketlerini listeleyen detay sayfası.

4. **Kredi Kartları & ÇEKTEN Hesabı:**
   * 31 şirket kredi kartının limit, güncel borç ve hesap kesim günleri.
   * Kuveyt Türk 15.000.000 TL ÇEKTEN limit simülatörü ve açık mal ödemeleri.

---

## 🛠️ Nasıl Çalıştırılır?

1. Xcode 15+ sürümünde `marif-et-ios` klasörünü açın (`File > Open...` -> `Package.swift`).
2. Hedef cihaz olarak **iPhone 15 Pro / 16 Pro** iOS Simulator seçin.
3. `Cmd + R` tuşuna basarak projeyi derleyin ve çalıştırın.
