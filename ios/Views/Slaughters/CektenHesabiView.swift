import SwiftUI

public struct CektenHesabiView: View {
    let limitTotal: Double = 15000000.0
    let usedAmount: Double = 11420000.0
    
    var availableLimit: Double { limitTotal - usedAmount }
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("ÇEKTEN Hesabı")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        Text("Kuveyt Türk 15M Kredi Limiti & Açık Mal Takibi")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(AppColors.textMuted)
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                
                // 3'lü Limit Barı
                HStack(spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("TOPLAM LİMİT")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.textMuted)
                        Text(Formatters.currency(limitTotal))
                            .font(.system(size: 12.5, weight: .black))
                            .foregroundColor(AppColors.textPrimary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(AppColors.divider)
                    .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("KULLANILAN")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.danger)
                        Text(Formatters.currency(usedAmount))
                            .font(.system(size: 12.5, weight: .black))
                            .foregroundColor(AppColors.danger)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(10)
                    .background(AppColors.danger.opacity(0.08))
                    .cornerRadius(12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("KALAN LİMİT")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(AppColors.success)
                        Text(Formatters.currency(availableLimit))
                            .font(.system(size: 12.5, weight: .black))
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
            
            ScrollView {
                VStack(spacing: 16) {
                    // Limit Progress Bar
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Limit Doluluk Oranı")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(AppColors.textPrimary)
                            Spacer()
                            Text("%76.1")
                                .font(.system(size: 13, weight: .black))
                                .foregroundColor(AppColors.warning)
                        }
                        
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(AppColors.divider)
                                    .frame(height: 10)
                                
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(AppColors.primary)
                                    .frame(width: geo.size.width * 0.761, height: 10)
                            }
                        }
                        .frame(height: 10)
                    }
                    .padding(16)
                    .background(AppColors.surface)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(AppColors.border, lineWidth: 1)
                    )
                    
                    // Son Açık Mal / Kesim Ödemeleri
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Açık Mal Ödeme Hareketleri")
                            .font(.system(size: 13.5, weight: .bold))
                            .foregroundColor(AppColors.textPrimary)
                        
                        let items: [(supplier: String, amount: Double, status: String, date: String)] = [
                            ("BURAK BESİCİLİK", 4500000, "ÇEKTEN Karşılandı", "31.08.2026"),
                            ("GÜR BESİCİLİK", 3200000, "ÇEKTEN Karşılandı", "28.08.2026"),
                            ("EMRE ARI", 2400000, "Açık Mal Ödemesi", "25.08.2026"),
                            ("RAMAZAN YILMAZ", 1320000, "Kısmi Ödeme", "20.08.2026")
                        ]
                        
                        ForEach(items, id: \.supplier) { item in
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(item.supplier)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(AppColors.textPrimary)
                                    Text("\(item.date) • \(item.status)")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(AppColors.textMuted)
                                }
                                
                                Spacer()
                                
                                Text(Formatters.currency(item.amount))
                                    .font(.system(size: 13.5, weight: .black))
                                    .foregroundColor(AppColors.textPrimary)
                            }
                            .padding(12)
                            .background(AppColors.surface)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(AppColors.border, lineWidth: 1)
                            )
                        }
                    }
                }
                .padding(16)
            }
            .background(AppColors.background)
        }
    }
}
