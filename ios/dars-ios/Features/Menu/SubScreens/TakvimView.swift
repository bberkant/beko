import SwiftUI

struct TakvimView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedDay: Int = 22
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                HStack {
                    Button(action: { dismiss() }) {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                            Text("Geri")
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Color(hex: "002D59"))
                    }
                    Spacer()
                    Text("Finansal Vade Takvimi")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(hex: "1E293B"))
                    Spacer()
                    Color.clear.frame(width: 48, height: 24)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.white)
                .overlay(Rectangle().frame(height: 1).foregroundColor(Color(hex: "E2E8F0")), alignment: .bottom)
                
                ScrollView {
                    VStack(spacing: 16) {
                        // Month Header
                        HStack {
                            Text("Eylül 2026")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                            Spacer()
                            HStack(spacing: 12) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(Color(hex: "64748B"))
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(Color(hex: "64748B"))
                            }
                        }
                        .padding(.horizontal, 4)
                        
                        // Calendar Days Grid Card
                        VStack(spacing: 8) {
                            HStack {
                                ForEach(["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"], id: \.self) { dayName in
                                    Text(dayName)
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(Color(hex: "94A3B8"))
                                        .frame(maxWidth: .infinity)
                                }
                            }
                            
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                                ForEach(1...30, id: \.self) { day in
                                    Button(action: { selectedDay = day }) {
                                        VStack(spacing: 2) {
                                            Text("\(day)")
                                                .font(.system(size: 13, weight: selectedDay == day ? .bold : .medium))
                                                .foregroundColor(selectedDay == day ? .white : Color(hex: "1E293B"))
                                            
                                            if [22, 24, 26, 28, 30].contains(day) {
                                                Circle()
                                                    .fill(selectedDay == day ? .white : Color(hex: "EA3829"))
                                                    .frame(width: 4, height: 4)
                                            } else {
                                                Color.clear.frame(height: 4)
                                            }
                                        }
                                        .frame(height: 36)
                                        .frame(maxWidth: .infinity)
                                        .background(selectedDay == day ? Color(hex: "002D59") : Color.clear)
                                        .cornerRadius(8)
                                    }
                                }
                            }
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                        
                        // Selected Day Details
                        VStack(alignment: .leading, spacing: 12) {
                            Text("\(selectedDay) Eylül 2026 Vade & Ödemeleri")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "1E293B"))
                            
                            if selectedDay == 22 {
                                CalendarTaskRow(title: "Alacak Çeki Tahsilatı (Kuveyt Türk)", desc: "Portföy No: ÇK-9901", amount: "+₺350.000,00", isIncome: true)
                                CalendarTaskRow(title: "Mezbaha Kesim Avans Ödemesi", desc: "Nakit Kasa Çıkışı", amount: "-₺125.000,00", isIncome: false)
                            } else if selectedDay == 24 {
                                CalendarTaskRow(title: "Tedarikçi Vadeli Çek Ödemesi", desc: "Ziraat Bankası Çeki", amount: "-₺480.000,00", isIncome: false)
                            } else if selectedDay == 26 {
                                CalendarTaskRow(title: "KDV1 Vergi Beyannamesi Ödemesi", desc: "Gelir İdaresi Başkanlığı", amount: "-₺345.890,00", isIncome: false)
                            } else if selectedDay == 28 {
                                CalendarTaskRow(title: "Sağlam Business Kart Hesap Kesimi", desc: "Kredi Kartı Borcu", amount: "-₺771.672,20", isIncome: false)
                            } else {
                                Text("Bu tarihe ait planlanmış finansal işlem bulunmamaktadır.")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(Color(hex: "94A3B8"))
                                    .padding(.vertical, 8)
                            }
                        }
                        .padding(16)
                        .background(Color.white)
                        .cornerRadius(16)
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "E2E8F0"), lineWidth: 1))
                    }
                    .padding(16)
                }
                .background(Color(hex: "F8FAFC"))
            }
            .navigationBarHidden(true)
        }
    }
}

private struct CalendarTaskRow: View {
    let title: String
    let desc: String
    let amount: String
    let isIncome: Bool
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(hex: "1E293B"))
                Text(desc)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
            Spacer()
            Text(amount)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(isIncome ? Color(hex: "008556") : Color(hex: "EA3829"))
        }
        .padding(10)
        .background(Color(hex: "F8FAFC"))
        .cornerRadius(10)
    }
}
