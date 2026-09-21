import SwiftUI

// MARK: - Comprehensive Design System Visual Showcase
public struct DesignSystemPreview: View {
    @State private var selectedSegment: String = "Takasta"
    @State private var activeFilter: String = "Tümü"
    @State private var isLoadingButton: Bool = false

    private let segments = ["Takasta", "İç Takas", "Ödenen"]
    private let filters = ["Tümü", "Bugün", "Yarın", "Bu Hafta"]

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // MARK: - Header
                VStack(alignment: .leading, spacing: 4) {
                    Text("Kuveyt Türk Design System")
                        .font(.ktTitle)
                        .foregroundColor(.ktTextHeading)
                    Text("DARS iOS Native Design Tokens & Components")
                        .font(.ktCaption)
                        .foregroundColor(.ktTextSecondary)
                }

                // MARK: - Palette Showcase
                VStack(alignment: .leading, spacing: 10) {
                    Text("Color Palette")
                        .font(.ktSectionHeader)
                        .foregroundColor(.ktTextHeading)

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 80))], spacing: 8) {
                        colorSwatch(name: "Navy", color: .ktPrimary, hex: "#002D59")
                        colorSwatch(name: "Navy Dark", color: .ktPrimaryDark, hex: "#002244")
                        colorSwatch(name: "Navy Light", color: .ktPrimaryLight, hex: "#F0F4F8", isDarkText: true)
                        colorSwatch(name: "Coral", color: .ktCoral, hex: "#EA3829")
                        colorSwatch(name: "Coral Light", color: .ktCoralLight, hex: "#FDEBEA", isDarkText: true)
                        colorSwatch(name: "Orange", color: .ktOrange, hex: "#FF9800")
                        colorSwatch(name: "Orange Light", color: .ktOrangeLight, hex: "#FFF3E0", isDarkText: true)
                        colorSwatch(name: "Success", color: .ktSuccess, hex: "#10B981")
                        colorSwatch(name: "Danger", color: .ktDanger, hex: "#F43F5E")
                        colorSwatch(name: "Purple", color: .ktPurple, hex: "#845EC2")
                    }
                }

                // MARK: - Typography & Numbers
                VStack(alignment: .leading, spacing: 8) {
                    Text("Calibrated Typography & Figures")
                        .font(.ktSectionHeader)
                        .foregroundColor(.ktTextHeading)

                    KTCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("₺44.922.400,00")
                                .ktDisplayAmountStyle(color: .ktPrimary)
                            Text("+450.000 TL")
                                .ktListAmountStyle(color: .ktSuccess)
                            Text("-2.300.000 TL")
                                .ktListAmountStyle(color: .ktDanger)
                            Text("DİVAN HAYVANCILIK GIDA SAN. TİC. LTD. ŞTİ.")
                                .font(.ktCardTitle)
                                .foregroundColor(.ktTextMain)
                            Text("Kuveyt Türk Tablo ve Liste Açıklama Metni")
                                .font(.ktBody)
                                .foregroundColor(.ktTextSecondary)
                        }
                    }
                }

                // MARK: - Segmented Control
                VStack(alignment: .leading, spacing: 8) {
                    Text("Segmented Control (KTSegmentedControl)")
                        .font(.ktSectionHeader)
                        .foregroundColor(.ktTextHeading)

                    KTSegmentedControl(
                        items: segments,
                        selection: $selectedSegment,
                        title: { $0 },
                        badgeCount: { item in
                            switch item {
                            case "Takasta": return 4
                            case "İç Takas": return 0
                            case "Ödenen": return 12
                            default: return nil
                            }
                        }
                    )
                }

                // MARK: - Filter Pills Carousel
                VStack(alignment: .leading, spacing: 8) {
                    Text("Filter Pills Carousel (KTPill)")
                        .font(.ktSectionHeader)
                        .foregroundColor(.ktTextHeading)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(filters, id: \.self) { filter in
                                KTPill(
                                    filter,
                                    variant: .filter(isActive: activeFilter == filter),
                                    action: { activeFilter = filter }
                                )
                            }
                        }
                    }
                }

                // MARK: - Status Badges
                VStack(alignment: .leading, spacing: 8) {
                    Text("Status Badges (KTPill)")
                        .font(.ktSectionHeader)
                        .foregroundColor(.ktTextHeading)

                    HStack(spacing: 8) {
                        KTPill("Canlı", variant: .success, hasPulseDot: true)
                        KTPill("Alacaklı", variant: .success)
                        KTPill("Borçlu", variant: .danger)
                        KTPill("Beklemede", variant: .warning)
                        KTPill("Tahsilde", variant: .info)
                    }
                }

                // MARK: - Action Buttons
                VStack(alignment: .leading, spacing: 8) {
                    Text("Button Styles (KTButton)")
                        .font(.ktSectionHeader)
                        .foregroundColor(.ktTextHeading)

                    VStack(spacing: 10) {
                        KTButton(
                            "Giriş Yap",
                            icon: "lock.fill",
                            style: .primary,
                            isFullWidth: true,
                            isLoading: isLoadingButton,
                            action: {
                                isLoadingButton.toggle()
                                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                                    isLoadingButton = false
                                }
                            }
                        )

                        KTButton(
                            "Detayları Gör",
                            icon: "doc.text.fill",
                            style: .secondary,
                            isFullWidth: true,
                            action: {}
                        )

                        KTButton(
                            "Kaydı Sil",
                            icon: "trash.fill",
                            style: .danger,
                            isFullWidth: true,
                            action: {}
                        )
                    }
                }

                // MARK: - Header Icon Buttons
                VStack(alignment: .leading, spacing: 8) {
                    Text("Header Action Buttons (KTIconButton)")
                        .font(.ktSectionHeader)
                        .foregroundColor(.ktTextHeading)

                    HStack(spacing: 12) {
                        KTIconButton(icon: "magnifyingglass", action: {})
                        KTIconButton(icon: "bell.fill", badgeCount: 3, action: {})
                        KTIconButton(icon: "line.3.horizontal", action: {})
                    }
                }

                // MARK: - Cards with Left Accent
                VStack(alignment: .leading, spacing: 8) {
                    Text("Cards with Left Indicator Bar (KTCard)")
                        .font(.ktSectionHeader)
                        .foregroundColor(.ktTextHeading)

                    KTCard(leftAccentColor: .ktDanger) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Kral Entegre Dış Tic.")
                                    .font(.ktCardTitle)
                                    .foregroundColor(.ktTextMain)
                                Text("Vade: 30.09.2026")
                                    .font(.ktCaption)
                                    .foregroundColor(.ktTextSecondary)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("1.250.000 TL Kalan")
                                    .font(.ktFinancialAmount)
                                    .foregroundColor(.ktCoral)
                                Text("Toplam: 2.000.000 TL")
                                    .font(.ktCaption)
                                    .foregroundColor(.ktTextSecondary)
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color.ktPageBackground)
    }

    private func colorSwatch(name: String, color: Color, hex: String, isDarkText: Bool = false) -> some View {
        VStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 8)
                .fill(color)
                .frame(height: 48)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.ktCardBorder, lineWidth: 0.5)
                )
            Text(name)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.ktTextHeading)
                .lineLimit(1)
            Text(hex)
                .font(.system(size: 9))
                .foregroundColor(.ktTextTertiary)
        }
    }
}

#if DEBUG
struct DesignSystemPreview_Previews: PreviewProvider {
    static var previews: some View {
        DesignSystemPreview()
    }
}
#endif
