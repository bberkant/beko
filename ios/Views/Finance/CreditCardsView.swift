import SwiftUI

public struct CreditCardsView: View {
    let cards: [CreditCard] = [
        CreditCard(id: "1", bank: "Kuveyt Türk", cardName: "KUVEYT TİCARİ KART", cardType: "Business", last4: "8821", cardLimit: 7500000, currentDebt: 7070281, statementDay: 20, dueDay: 2, organizationId: nil),
        CreditCard(id: "2", bank: "Albaraka Türk", cardName: "ALBARAKA FİNANSMAN", cardType: "Finansman", last4: "1094", cardLimit: 1000000, currentDebt: 103751, statementDay: 18, dueDay: 1, organizationId: nil),
        CreditCard(id: "3", bank: "Garanti BBVA", cardName: "GARANTİ BONUS BUSİNESS", cardType: "Bonus", last4: "4420", cardLimit: 2500000, currentDebt: 850000, statementDay: 25, dueDay: 5, organizationId: nil),
        CreditCard(id: "4", bank: "Ziraat Bankası", cardName: "ZİRAAT BANKKART BAŞAK", cardType: "Başak", last4: "9102", cardLimit: 5000000, currentDebt: 1820000, statementDay: 15, dueDay: 25, organizationId: nil),
        CreditCard(id: "5", bank: "Yapı Kredi", cardName: "WORLD BUSINESS", cardType: "World", last4: "3301", cardLimit: 3000000, currentDebt: 640000, statementDay: 10, dueDay: 20, organizationId: nil)
    ]
    
    public init() {}
    
    public var totalLimit: Double { cards.reduce(0) { $0 + ($1.cardLimit ?? 0) } }
    public var totalDebt: Double { cards.reduce(0) { $0 + ($1.currentDebt ?? 0) } }
    public var availableLimit: Double { max(0, totalLimit - totalDebt) }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Kredi Kartları")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        Text("31 Şirket Kartı & Limit Takibi")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(AppColors.textMuted)
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                
                // 3'lü KPI
                HStack(spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("TOPLAM LİMİT")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.textMuted)
                        Text(Formatters.currency(totalLimit))
                            .font(.system(size: 13, weight: .black))
                            .foregroundColor(AppColors.textPrimary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(AppColors.divider)
                    .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("GÜNCEL BORÇ")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.danger)
                        Text(Formatters.currency(totalDebt))
                            .font(.system(size: 13, weight: .black))
                            .foregroundColor(AppColors.danger)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(AppColors.danger.opacity(0.08))
                    .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("KULLANILABİLİR")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.success)
                        Text(Formatters.currency(availableLimit))
                            .font(.system(size: 13, weight: .black))
                            .foregroundColor(AppColors.success)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(AppColors.success.opacity(0.08))
                    .cornerRadius(12)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
            }
            .background(AppColors.surface)
            
            // List
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(cards) { card in
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                HStack(spacing: 6) {
                                    Image(systemName: "creditcard.fill")
                                        .foregroundColor(AppColors.primary)
                                    Text(card.bank ?? "Banka")
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                
                                Spacer()
                                
                                Text("•••• \(card.last4 ?? "0000")")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(AppColors.textMuted)
                            }
                            
                            Text(card.cardName ?? "Ticari Kart")
                                .font(.system(size: 14, weight: .black))
                                .foregroundColor(AppColors.textPrimary)
                            
                            Divider()
                            
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("LİMİT")
                                        .font(.system(size: 9.5, weight: .bold))
                                        .foregroundColor(AppColors.textMuted)
                                    Text(card.formattedLimit)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(AppColors.textPrimary)
                                }
                                
                                Spacer()
                                
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text("GÜNCEL BORÇ")
                                        .font(.system(size: 9.5, weight: .bold))
                                        .foregroundColor(AppColors.textMuted)
                                    Text(card.formattedDebt)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(AppColors.textPrimary)
                                }
                            }
                            
                            // Son ödeme günü
                            HStack {
                                Text("Hesap Kesim: \(card.statementDay ?? 1). Gün")
                                    .font(.system(size: 10.5, weight: .medium))
                                    .foregroundColor(AppColors.textMuted)
                                Spacer()
                                Text("Son Ödeme: \(card.dueDay ?? 1). Gün")
                                    .font(.system(size: 10.5, weight: .bold))
                                    .foregroundColor(AppColors.warning)
                            }
                        }
                        .padding(16)
                        .background(AppColors.surface)
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(AppColors.border, lineWidth: 1)
                        )
                    }
                }
                .padding(16)
            }
            .background(AppColors.background)
        }
    }
}
