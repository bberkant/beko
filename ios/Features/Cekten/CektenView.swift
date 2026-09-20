//
//  CektenView.swift
//  dars-ios
//
//  Pixel-perfect native SwiftUI screen matching Kuveyt Türk mobile banking
//  and `ios_prototype.html` for ÇEKTEN Hesabı & Tedarikçi Finansmanı.
//

import SwiftUI

public struct CektenView: View {
    @StateObject private var viewModel: CektenViewModel
    
    public init(viewModel: CektenViewModel = CektenViewModel()) {
        self._viewModel = StateObject(wrappedValue: viewModel)
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 1. Screen Header
                headerView
                
                // 2. Summary KPI Cards (2x2 Grid)
                summaryMetricsGrid
                
                // 3. Status Filter Pills Bar
                statusFilterBar
                
                // 4. Cheque Calculator Simulator Card
                simulatorSection
                
                // 5. Live Records List
                recordsListSection
            }
            .padding(.horizontal, KTTheme.Metrics.paddingHorizontal)
            .padding(.top, 12)
            .padding(.bottom, 90)
        }
        .background(Color.ktPageBackground)
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            if viewModel.records.isEmpty {
                await viewModel.loadData()
            }
        }
        .sheet(isPresented: $viewModel.isShowingNewRecordSheet) {
            NewCektenSheet(viewModel: viewModel)
        }
        .sheet(item: $viewModel.selectedPaymentRecord) { record in
            CektenPaymentSheet(record: record, viewModel: viewModel)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                Text("ÇEKTEN HESAP")
                    .font(.ktSectionHeader)
                    .foregroundColor(.ktTextHeading)
            }
        }
    }
    
    // MARK: - 1. Screen Header
    
    private var headerView: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Circle()
                        .fill(Color.ktSuccess)
                        .frame(width: 7, height: 7)
                    Text("Canlı Çekten Portföyü")
                        .font(.ktMicro)
                        .foregroundColor(.ktSuccessDark)
                        .fontWeight(.semibold)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color.ktSuccessLight)
                .clipShape(Capsule())
                
                Text("Tedarikçi Finansmanı & Açık Mal")
                    .font(.ktCaption)
                    .foregroundColor(.ktTextSecondary)
            }
            
            Spacer()
            
            Button(action: { viewModel.isShowingNewRecordSheet = true }) {
                HStack(spacing: 4) {
                    Image(systemName: "plus")
                        .font(.system(size: 11, weight: .bold))
                    Text("Yeni Kayıt")
                        .font(.ktBadge)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Color.ktPrimarySoft)
                .foregroundColor(.ktPrimary)
                .clipShape(Capsule())
            }
        }
    }
    
    // MARK: - 2. Summary KPI Cards
    
    private var summaryMetricsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
            // Card 1: Toplam Tutar
            metricCard(
                title: "TOPLAM TUTAR",
                value: Theme.Formatter.currency(viewModel.totalFacilityAmount),
                valueColor: .ktPrimary,
                icon: "building.columns.fill"
            )
            
            // Card 2: Ödenen Tutar
            metricCard(
                title: "ÖDENEN TUTAR",
                value: Theme.Formatter.currency(viewModel.totalPaidAmount),
                valueColor: .ktSuccess,
                icon: "checkmark.circle.fill"
            )
            
            // Card 3: Kalan Tutar
            metricCard(
                title: "AÇIK KALAN TUTAR",
                value: Theme.Formatter.currency(viewModel.totalRemainingAmount),
                valueColor: viewModel.totalRemainingAmount > 0 ? .ktCoral : .ktTextMain,
                icon: "exclamationmark.circle.fill"
            )
            
            // Card 4: Ortalama Vade
            metricCard(
                title: "ORTALAMA VADE",
                value: "\(viewModel.averageTenorDays) Gün",
                valueColor: .ktTextHeading,
                icon: "calendar.badge.clock"
            )
        }
    }
    
    private func metricCard(title: String, value: String, valueColor: Color, icon: String) -> some View {
        KTCard(padding: 12) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(title)
                        .font(.ktMicro)
                        .foregroundColor(.ktTextSecondary)
                        .fontWeight(.bold)
                    Spacer()
                    Image(systemName: icon)
                        .font(.system(size: 12))
                        .foregroundColor(valueColor)
                }
                Text(value)
                    .font(.ktFinancialAmount)
                    .foregroundColor(valueColor)
                    .ktMonospacedDigits()
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
    }
    
    // MARK: - 3. Status Filter Pills Bar
    
    private var statusFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(CektenStatusFilter.allCases) { filter in
                    let isSelected = viewModel.selectedFilter == filter
                    KTPill(
                        filter.rawValue,
                        variant: .filter(isActive: isSelected),
                        size: .medium
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.selectedFilter = filter
                        }
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }
    
    // MARK: - 4. Cheque Calculator Simulator
    
    private var simulatorSection: some View {
        KTCard(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                // Header toggle
                Button(action: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        viewModel.isSimulatorExpanded.toggle()
                    }
                }) {
                    HStack {
                        Image(systemName: "slider.horizontal.3")
                            .foregroundColor(.ktPrimary)
                        Text("Vade & Finansman Maliyet Simülatörü")
                            .font(.ktCardTitle)
                            .foregroundColor(.ktTextHeading)
                        Spacer()
                        Image(systemName: viewModel.isSimulatorExpanded ? "chevron.up" : "chevron.down")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.ktTextSecondary)
                    }
                }
                .buttonStyle(PlainButtonStyle())
                
                if viewModel.isSimulatorExpanded {
                    VStack(spacing: 12) {
                        // Tutar Slider & Quick Chips
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Tutar (TL):")
                                    .font(.ktCaption)
                                    .foregroundColor(.ktTextSecondary)
                                Spacer()
                                Text(Theme.Formatter.currency(viewModel.calcAmount))
                                    .font(.ktFinancialAmount)
                                    .foregroundColor(.ktPrimary)
                            }
                            
                            HStack(spacing: 6) {
                                ForEach([100_000.0, 500_000.0, 1_000_000.0, 2_500_000.0], id: \.self) { amt in
                                    Button(action: { viewModel.calcAmount = amt }) {
                                        Text(amt >= 1_000_000 ? "\(Int(amt/1_000_000))M ₺" : "\(Int(amt/1_000))B ₺")
                                            .font(.ktMicro)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(abs(viewModel.calcAmount - amt) < 1.0 ? Color.ktPrimary : Color.ktSlate100)
                                            .foregroundColor(abs(viewModel.calcAmount - amt) < 1.0 ? .white : .ktTextSecondary)
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                        
                        // Vade Gün Slider & Quick Chips
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Vade (Gün):")
                                    .font(.ktCaption)
                                    .foregroundColor(.ktTextSecondary)
                                Spacer()
                                Text("\(viewModel.calcDays) Gün")
                                    .font(.ktBodyMedium)
                                    .foregroundColor(.ktTextHeading)
                            }
                            
                            HStack(spacing: 6) {
                                ForEach([15, 30, 45, 60, 90], id: \.self) { days in
                                    Button(action: { viewModel.calcDays = days }) {
                                        Text("\(days)G")
                                            .font(.ktMicro)
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 4)
                                            .background(viewModel.calcDays == days ? Color.ktPrimary : Color.ktSlate100)
                                            .foregroundColor(viewModel.calcDays == days ? .white : .ktTextSecondary)
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                        
                        Divider()
                            .background(Color.ktCardBorder)
                        
                        // Simulator Results Grid
                        HStack(spacing: 10) {
                            // Net Ele Geçen
                            VStack(alignment: .leading, spacing: 3) {
                                Text("NET ELE GEÇEN")
                                    .font(.ktMicro)
                                    .foregroundColor(.ktSuccessDark)
                                    .fontWeight(.bold)
                                Text(Theme.Formatter.currency(viewModel.calcNetProceeds))
                                    .font(.ktFinancialAmount)
                                    .foregroundColor(.ktSuccess)
                                    .ktMonospacedDigits()
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(Color.ktSuccessLight)
                            .cornerRadius(10)
                            
                            // Maliyet
                            VStack(alignment: .leading, spacing: 3) {
                                Text("KOMİSYON / MALİYET")
                                    .font(.ktMicro)
                                    .foregroundColor(.ktCoralDark)
                                    .fontWeight(.bold)
                                Text("-\(Theme.Formatter.currency(viewModel.calcFinancingCost))")
                                    .font(.ktFinancialAmount)
                                    .foregroundColor(.ktCoral)
                                    .ktMonospacedDigits()
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(Color.ktCoralLight)
                            .cornerRadius(10)
                        }
                    }
                    .padding(.top, 4)
                }
            }
        }
    }
    
    // MARK: - 5. Live Records Feed
    
    private var recordsListSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Çekten Kayıtları & Tedarikçiler")
                    .font(.ktSectionHeader)
                    .foregroundColor(.ktTextHeading)
                Spacer()
                Text("\(viewModel.filteredRecords.count) Kayıt")
                    .font(.ktMicro)
                    .foregroundColor(.ktTextSecondary)
            }
            .padding(.horizontal, 2)
            
            if viewModel.isLoading && viewModel.records.isEmpty {
                // Skeleton loading state
                VStack(spacing: 10) {
                    ForEach(0..<4, id: \.self) { _ in
                        KTCard(padding: 14) {
                            HStack {
                                VStack(alignment: .leading, spacing: 8) {
                                    RoundedRectangle(cornerRadius: 4).fill(Color.ktSlate100).frame(width: 80, height: 12)
                                    RoundedRectangle(cornerRadius: 4).fill(Color.ktSlate100).frame(width: 140, height: 16)
                                    RoundedRectangle(cornerRadius: 4).fill(Color.ktSlate100).frame(width: 110, height: 10)
                                }
                                Spacer()
                                RoundedRectangle(cornerRadius: 4).fill(Color.ktSlate100).frame(width: 90, height: 24)
                            }
                        }
                    }
                }
            } else if viewModel.filteredRecords.isEmpty {
                // Empty state
                KTCard(padding: 24) {
                    VStack(spacing: 12) {
                        Image(systemName: "doc.text.magnifyingglass")
                            .font(.system(size: 36))
                            .foregroundColor(.ktTextTertiary)
                        Text("Kayıt Bulunamadı")
                            .font(.ktCardTitle)
                            .foregroundColor(.ktTextHeading)
                        Text("Seçili filtre veya arama kriterine uygun çekten kaydı bulunmamaktadır.")
                            .font(.ktBody)
                            .foregroundColor(.ktTextSecondary)
                            .multilineTextAlignment(.center)
                        
                        Button(action: {
                            viewModel.selectedFilter = .all
                            viewModel.searchQuery = ""
                        }) {
                            Text("Filtreleri Sıfırla")
                                .font(.ktBadge)
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.ktPrimary)
                                .clipShape(Capsule())
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            } else {
                ForEach(viewModel.filteredRecords) { record in
                    recordCard(record)
                }
            }
        }
    }
    
    private func recordCard(_ record: CektenHesap) -> some View {
        let isSettled = record.remainingAmount <= 0
        let accentColor: Color = isSettled ? .ktSlate300 : .ktDanger
        
        return KTCard(
            padding: 14,
            leftAccentColor: accentColor,
            leftAccentWidth: 4
        ) {
            VStack(alignment: .leading, spacing: 10) {
                // Top header
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text("ÇEKTEN Carisi")
                                .font(.ktMicro)
                                .foregroundColor(.ktPrimary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.ktPrimaryLight)
                                .cornerRadius(4)
                            
                            Text(record.facilityNo)
                                .font(.ktMicro)
                                .foregroundColor(.ktTextTertiary)
                        }
                        
                        Text(record.supplier)
                            .font(.ktCardTitle)
                            .foregroundColor(.ktTextHeading)
                        
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.system(size: 10))
                                .foregroundColor(.ktTextTertiary)
                            Text("Kullanım: \(record.date) • Vade: ")
                                .font(.ktCaption)
                                .foregroundColor(.ktTextSecondary)
                            Text(record.dueDate)
                                .font(.ktCaption)
                                .fontWeight(.semibold)
                                .foregroundColor(.ktTextHeading)
                        }
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 3) {
                        Text("\(Theme.Formatter.currency(record.remainingAmount)) Kalan")
                            .font(.ktFinancialAmount)
                            .foregroundColor(isSettled ? .ktTextHeading : .ktDanger)
                            .ktMonospacedDigits()
                        
                        Text("Toplam: \(Theme.Formatter.currency(record.totalAmount))")
                            .font(.ktCaption)
                            .foregroundColor(.ktTextSecondary)
                    }
                }
                
                Divider()
                    .background(Color.ktSlate100)
                
                // Footer actions
                HStack {
                    Button(action: {
                        // Action to view Cari ledger
                    }) {
                        HStack(spacing: 3) {
                            Text("Hesap Ekstresi & Detay")
                                .font(.ktCaption)
                                .fontWeight(.medium)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 9))
                        }
                        .foregroundColor(.ktPrimary)
                    }
                    
                    Spacer()
                    
                    if !isSettled {
                        Button(action: {
                            viewModel.selectedPaymentRecord = record
                        }) {
                            Text("Ödeme Yap")
                                .font(.ktBadge)
                                .foregroundColor(.ktPrimary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 5)
                                .background(Color.ktPrimarySoft)
                                .cornerRadius(8)
                        }
                    } else {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .bold))
                            Text("Kapandı")
                                .font(.ktBadge)
                        }
                        .foregroundColor(.ktSuccess)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.ktSuccessLight)
                        .cornerRadius(6)
                    }
                }
            }
        }
    }
}

// MARK: - New Cekten Record Sheet

struct NewCektenSheet: View {
    @ObservedObject var viewModel: CektenViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var supplier: String = ""
    @State private var amountString: String = ""
    @State private var tenorDays: String = "45"
    @State private var dueDate: String = "30.09.2026"
    @State private var notes: String = ""
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Tedarikçi / Cari Bilgileri") {
                    TextField("Örn: Kral Entegre Dış Tic.", text: $supplier)
                    TextField("Not / Açıklama", text: $notes)
                }
                
                Section("Finansman Koşulları") {
                    TextField("Tutar (TL)", text: $amountString)
                        .keyboardType(.decimalPad)
                    TextField("Vade Gün", text: $tenorDays)
                        .keyboardType(.numberPad)
                    TextField("Vade Tarihi", text: $dueDate)
                }
            }
            .navigationTitle("Yeni Çekten Kaydı")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Vazgeç") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Kaydet") {
                        if let amt = Double(amountString), !supplier.isEmpty {
                            viewModel.addNewRecord(
                                supplier: supplier,
                                amount: amt,
                                dueDate: dueDate,
                                tenor: Int(tenorDays) ?? 45,
                                notes: notes.isEmpty ? nil : notes
                            )
                            dismiss()
                        }
                    }
                    .disabled(supplier.isEmpty || amountString.isEmpty)
                }
            }
        }
    }
}

// MARK: - Cekten Payment Sheet

struct CektenPaymentSheet: View {
    let record: CektenHesap
    @ObservedObject var viewModel: CektenViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var paymentAmount: String = ""
    @State private var selectedPaymentMethod: String = "Kuveyt Türk Ticari Hesaptan"
    
    private let paymentMethods = [
        "Kuveyt Türk Ticari Hesaptan",
        "Vadeli Çek İle",
        "Merkez Kasa Nakit"
    ]
    
    init(record: CektenHesap, viewModel: CektenViewModel) {
        self.record = record
        self.viewModel = viewModel
        self._paymentAmount = State(initialValue: String(format: "%.0f", record.remainingAmount))
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Kayıt Bilgisi") {
                    HStack {
                        Text("Tedarikçi:")
                        Spacer()
                        Text(record.supplier).fontWeight(.bold)
                    }
                    HStack {
                        Text("Kalan Açık Bakiye:")
                        Spacer()
                        Text(Theme.Formatter.currency(record.remainingAmount))
                            .fontWeight(.bold)
                            .foregroundColor(.ktCoral)
                    }
                }
                
                Section("Ödeme Detayları") {
                    TextField("Ödenecek Tutar (TL)", text: $paymentAmount)
                        .keyboardType(.decimalPad)
                    
                    Picker("Ödeme Kaynağı", selection: $selectedPaymentMethod) {
                        ForEach(paymentMethods, id: \.self) { method in
                            Text(method).tag(method)
                        }
                    }
                }
            }
            .navigationTitle("Çekten Ödeme Girişi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Kapat") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Ödemeyi Onayla") {
                        if let amt = Double(paymentAmount), amt > 0 {
                            viewModel.recordPayment(recordId: record.id, paymentAmount: amt)
                            dismiss()
                        }
                    }
                }
            }
        }
    }
}
