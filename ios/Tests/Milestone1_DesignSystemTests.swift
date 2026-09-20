import XCTest
import SwiftUI
@testable import dars_ios

final class Milestone1_DesignSystemTests: XCTestCase {

    // MARK: - 1. Kuveyt Türk Brand Color Tokens & Hex Initializers
    
    func test_ktPrimary_hex_value_and_backward_compatibility_alias() {
        // Kuveyt Türk Signature Navy (#002D59)
        let expectedPrimary = Color(hex: 0x002D59)
        XCTAssertEqual(Color.ktPrimary, expectedPrimary, "Color.ktPrimary must match exact hex #002D59")
        
        // Brand Green alias must resolve to ktPrimary for backward compatibility
        XCTAssertEqual(Color.brandGreen, Color.ktPrimary, "Color.brandGreen alias must match Color.ktPrimary")
        
        // Hex string initializer validation
        let hexStringWithHash = Color(hexString: "#002D59")
        let hexStringWithoutHash = Color(hexString: "002D59")
        XCTAssertEqual(hexStringWithHash, Color.ktPrimary, "Hex string #002D59 must resolve to Color.ktPrimary")
        XCTAssertEqual(hexStringWithoutHash, Color.ktPrimary, "Hex string 002D59 must resolve to Color.ktPrimary")
    }

    func test_ktCoral_and_ktOrange_color_tokens() {
        // Kuveyt Türk Coral Red (#EA3829)
        XCTAssertEqual(Color.ktCoral, Color(hex: 0xEA3829), "ktCoral must match hex #EA3829")
        XCTAssertEqual(Color.ktCoralLight, Color(hex: 0xFDEBEA), "ktCoralLight must match hex #FDEBEA")
        XCTAssertEqual(Color.ktCoralDark, Color(hex: 0xC82315), "ktCoralDark must match hex #C82315")
        
        // Kuveyt Türk Amber Orange (#FF9800)
        XCTAssertEqual(Color.ktOrange, Color(hex: 0xFF9800), "ktOrange must match hex #FF9800")
        XCTAssertEqual(Color.ktOrangeLight, Color(hex: 0xFFF3E0), "ktOrangeLight must match hex #FFF3E0")
    }

    func test_surfaces_and_text_hierarchy_tokens() {
        // Surfaces
        XCTAssertEqual(Color.ktPageBackground, Color(hex: 0xF8FAFC), "ktPageBackground must match #F8FAFC")
        XCTAssertEqual(Color.ktCardSurface, Color(hex: 0xFFFFFF), "ktCardSurface must be pure white #FFFFFF")
        XCTAssertEqual(Color.ktCardBorder, Color(hex: 0xE2E8F0), "ktCardBorder must match #E2E8F0")
        XCTAssertEqual(Color.ktSegmentedTrack, Color(hex: 0xEEF2F6), "ktSegmentedTrack must match #EEF2F6")
        
        // Text Hierarchy
        XCTAssertEqual(Color.ktTextMain, Color(hex: 0x1E293B), "ktTextMain must match Slate-800 #1E293B")
        XCTAssertEqual(Color.ktTextHeading, Color(hex: 0x0F172A), "ktTextHeading must match Slate-900 #0F172A")
        XCTAssertEqual(Color.ktTextMuted, Color(hex: 0x64748B), "ktTextMuted must match Slate-500 #64748B")
        XCTAssertEqual(Color.ktTextSecondary, Color.ktTextMuted, "ktTextSecondary must alias ktTextMuted")
        XCTAssertEqual(Color.ktTextTertiary, Color(hex: 0x94A3B8), "ktTextTertiary must match Slate-400 #94A3B8")
        
        // Deprecated alias
        XCTAssertEqual(Color.systemLightGray, Color.ktPageBackground, "systemLightGray must alias ktPageBackground")
    }

    func test_semantic_status_indicators() {
        XCTAssertEqual(Color.ktSuccess, Color(hex: 0x10B981), "ktSuccess must match Emerald #10B981")
        XCTAssertEqual(Color.ktDanger, Color(hex: 0xF43F5E), "ktDanger must match Rose #F43F5E")
        XCTAssertEqual(Color.ktPurple, Color(hex: 0x845EC2), "ktPurple must match Accounting Purple #845EC2")
    }

    // MARK: - 2. Theme Constants, Metrics & Formatters
    
    func test_theme_color_forwarding() {
        XCTAssertEqual(Theme.primary, Color.ktPrimary)
        XCTAssertEqual(Theme.coral, Color.ktCoral)
        XCTAssertEqual(Theme.orange, Color.ktOrange)
        XCTAssertEqual(Theme.pageBackground, Color.ktPageBackground)
        XCTAssertEqual(Theme.cardSurface, Color.ktCardSurface)
        XCTAssertEqual(Theme.cardBorder, Color.ktCardBorder)
    }

    func test_theme_metrics_continuous_corner_radii_and_padding() {
        // Continuous Corner Radii
        XCTAssertEqual(KTTheme.Metrics.cornerRadiusCard, 16, "Card corner radius must be 16pt")
        XCTAssertEqual(KTTheme.Metrics.cornerRadiusButton, 100, "Button corner radius must be capsule (100pt)")
        XCTAssertEqual(KTTheme.Metrics.cornerRadiusSegmented, 14, "Segmented control track radius must be 14pt")
        XCTAssertEqual(KTTheme.Metrics.cornerRadiusSegmentItem, 11, "Segmented control item radius must be 11pt")
        XCTAssertEqual(KTTheme.Metrics.cornerRadiusPill, 100, "Pill radius must be capsule (100pt)")
        XCTAssertEqual(KTTheme.Metrics.cornerRadiusModalTop, 24, "Modal top corner radius must be 24pt")
        
        // Layout Paddings & Heights
        XCTAssertEqual(KTTheme.Metrics.paddingHorizontal, 16, "Standard horizontal padding must be 16pt")
        XCTAssertEqual(KTTheme.Metrics.paddingVertical, 12, "Standard vertical padding must be 12pt")
        XCTAssertEqual(KTTheme.Metrics.cardPadding, 16, "Card content padding must be 16pt")
        XCTAssertEqual(KTTheme.Metrics.buttonHeight, 44, "Standard button height must be 44pt")
        XCTAssertEqual(KTTheme.Metrics.headerHeight, 56, "Header height must be 56pt")
        XCTAssertEqual(KTTheme.Metrics.tabBarHeight, 52, "Tab bar height must be 52pt")
        
        // Typealias Forwarding
        XCTAssertEqual(Theme.Metrics.cornerRadiusCard, 16)
        XCTAssertEqual(Theme.Metrics.paddingHorizontal, 16)
    }

    func test_turkish_currency_formatter_without_decimals() {
        let amount1: Double = 1_250_000.0
        let formatted1 = Theme.Formatter.currency(amount1, showDecimals: false)
        XCTAssertEqual(formatted1, "1.250.000 TL", "Turkish currency formatter must format thousands with dot and append ' TL'")

        let zeroAmount: Double = 0.0
        let formattedZero = Theme.Formatter.currency(zeroAmount, showDecimals: false)
        XCTAssertEqual(formattedZero, "0 TL", "Zero currency must format as '0 TL'")

        let amount2: Double = 6_421_881.0
        let formatted2 = KTTheme.Formatter.currency(amount2, showDecimals: false)
        XCTAssertEqual(formatted2, "6.421.881 TL")
    }

    func test_turkish_currency_formatter_with_decimals() {
        let amountWithCents: Double = 42_150_800.50
        let formatted = Theme.Formatter.currency(amountWithCents, showDecimals: true)
        XCTAssertEqual(formatted, "42.150.800,50 TL", "Turkish currency formatter must format decimals with comma")

        let wholeAmount: Double = 100.0
        let formattedWhole = Theme.Formatter.currency(wholeAmount, showDecimals: true)
        XCTAssertEqual(formattedWhole, "100,00 TL", "Whole amount with decimals must format as ',00 TL'")
    }

    func test_turkish_signed_currency_formatter() {
        let positiveIncome: Double = 450_000.0
        let formattedPositive = Theme.Formatter.signedCurrency(positiveIncome)
        XCTAssertEqual(formattedPositive, "+450.000 TL", "Positive cashflow must have '+' prefix")

        let negativeExpense: Double = -2_300_000.0
        let formattedNegative = Theme.Formatter.signedCurrency(negativeExpense)
        XCTAssertEqual(formattedNegative, "-2.300.000 TL", "Negative cashflow must have '-' prefix")

        let zeroSigned: Double = 0.0
        let formattedZero = Theme.Formatter.signedCurrency(zeroSigned)
        XCTAssertEqual(formattedZero, "0 TL", "Zero cashflow must not have a '+' prefix")
    }

    func test_turkish_number_formatter() {
        let count = 18609
        let formatted = Theme.Formatter.number(count)
        XCTAssertEqual(formatted, "18.609", "Turkish integer formatter must format with dot separator")

        let zeroCount = 0
        XCTAssertEqual(Theme.Formatter.number(zeroCount), "0")
    }

    // MARK: - 3. Components Instantiation & Properties
    
    func test_vcornerdecorations_instantiation_and_properties() {
        let decorations = VCornerDecorations()
        XCTAssertNotNil(decorations, "VCornerDecorations must instantiate with parameterless public initializer")
        let body = decorations.body
        XCTAssertNotNil(body, "VCornerDecorations body must be computable")
    }

    func test_ktcard_instantiation_with_custom_accent() {
        let defaultCard = KTCard {
            Text("Default Card")
        }
        XCTAssertNotNil(defaultCard.body)

        let customCard = KTCard(
            padding: 20,
            cornerRadius: 12,
            borderColor: .ktCardBorder,
            borderWidth: 1.5,
            backgroundColor: .ktCardSurface,
            leftAccentColor: .ktCoral,
            leftAccentWidth: 5,
            onTap: { }
        ) {
            Text("Custom Card")
        }
        XCTAssertNotNil(customCard.body)
    }

    func test_ktpill_variants_and_sizes() {
        let filterActive = KTPill("Tümü", variant: .filter(isActive: true), size: .medium)
        let filterInactive = KTPill("Ödendi", variant: .filter(isActive: false), size: .medium)
        let successPill = KTPill("Canlı", variant: .success, hasPulseDot: true)
        let dangerPill = KTPill("Borçlu", variant: .danger, size: .small)
        let warningPill = KTPill("Beklemede", variant: .warning, size: .large)
        let neutralPill = KTPill("Sıfır", variant: .neutral)
        let customPill = KTPill("Özel", variant: .custom(text: .white, bg: .ktPrimary, border: nil))

        XCTAssertNotNil(filterActive.body)
        XCTAssertNotNil(filterInactive.body)
        XCTAssertNotNil(successPill.body)
        XCTAssertNotNil(dangerPill.body)
        XCTAssertNotNil(warningPill.body)
        XCTAssertNotNil(neutralPill.body)
        XCTAssertNotNil(customPill.body)
    }

    func test_ktbutton_styles() {
        let primaryStyle = KTPrimaryButtonStyle(isFullWidth: true)
        XCTAssertTrue(primaryStyle.isFullWidth)

        let secondaryStyle = KTSecondaryButtonStyle(isFullWidth: false)
        XCTAssertFalse(secondaryStyle.isFullWidth)

        let dangerStyle = KTDangerButtonStyle(isFullWidth: true)
        XCTAssertTrue(dangerStyle.isFullWidth)
    }

    func test_ktsegmented_control_instantiation() {
        var selected = "Takas"
        let binding = Binding(get: { selected }, set: { selected = $0 })
        let segmented = KTSegmentedControl(
            items: ["Takas", "Portföy"],
            selection: binding,
            title: { $0 },
            badgeCount: { $0 == "Takas" ? 5 : nil }
        )
        XCTAssertNotNil(segmented.body)
    }

    // MARK: - 4. Typography Scale & View Modifiers
    
    func test_typography_font_tokens_and_modifiers() {
        let _ = Font.ktDisplayMetric
        let _ = Font.ktTitle
        let _ = Font.ktSectionHeader
        let _ = Font.ktCardTitle
        let _ = Font.ktFinancialAmount
        let _ = Font.ktBody
        let _ = Font.ktBodyMedium
        let _ = Font.ktTabTitle
        let _ = Font.ktSegmented
        let _ = Font.ktSegmentedActive
        let _ = Font.ktPill
        let _ = Font.ktBadge
        let _ = Font.ktCaption
        let _ = Font.ktMicro

        let view = Text("1.250.000 TL")
            .ktMonospacedDigits()
            .ktDisplayAmountStyle(color: .ktPrimary)
            .ktListAmountStyle()
        XCTAssertNotNil(view)
    }
}
