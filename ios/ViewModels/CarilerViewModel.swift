import Foundation
import SwiftUI

@MainActor
public class CarilerViewModel: ObservableObject {
    @Published public var cariler: [VegaCari] = []
    @Published public var movements: [VegaCariHareket] = []
    @Published public var isLoading: Bool = false
    @Published public var searchQuery: String = ""
    @Published public var selectedFilter: CariFilter = .all
    @Published public var selectedCari: VegaCari?
    
    public enum CariFilter: String, CaseIterable {
        case all = "Tümü (2.172)"
        case borclular = "Borçlu (Bakiye > 0)"
        case alacaklilar = "Alacaklı (Bakiye < 0)"
    }
    
    public init() {
        setupData()
    }
    
    public var filteredCariler: [VegaCari] {
        cariler.filter { c in
            if selectedFilter == .borclular && c.balance <= 0 { return false }
            if selectedFilter == .alacaklilar && c.balance >= 0 { return false }
            
            if !searchQuery.isEmpty {
                let q = searchQuery.lowercased()
                let matchCode = c.code.lowercased().contains(q)
                let matchName = c.name.lowercased().contains(q)
                let matchCity = (c.city ?? "").lowercased().contains(q)
                if !matchCode && !matchName && !matchCity { return false }
            }
            return true
        }
        .sorted { abs($0.balance) > abs($1.balance) }
    }
    
    public var totalReceivable: Double {
        cariler.filter { $0.balance > 0 }.reduce(0) { $0 + $1.balance }
    }
    
    public var totalPayable: Double {
        cariler.filter { $0.balance < 0 }.reduce(0) { $0 + abs($1.balance) }
    }
    
    private func setupData() {
        self.cariler = [
            VegaCari(id: "1", code: "120.01.001", name: "BURAK BESİCİLİK GIDA LTD. ŞTİ.", taxOffice: "Kayseri", taxNo: "1234567890", type: "Müşteri", city: "Kayseri", balance: 14250000, lastTransactionDate: "2026-08-31", organizationId: nil),
            VegaCari(id: "2", code: "320.01.042", name: "ÖZBAKAN ET VE ET MAMÜLLERİ SAN.", taxOffice: "Marmara", taxNo: "9876543210", type: "Tedarikçi", city: "İstanbul", balance: -8920000, lastTransactionDate: "2026-08-30", organizationId: nil),
            VegaCari(id: "3", code: "120.02.015", name: "HACETTEPE ÜNİV. SAĞLIK KÜLTÜR DAİRE", taxOffice: "Hitit", taxNo: "4561237890", type: "Kurumsal", city: "Ankara", balance: 6410000, lastTransactionDate: "2026-08-28", organizationId: nil),
            VegaCari(id: "4", code: "120.01.089", name: "HAS ARDAHAN ET ENTEGRE TESİSLERİ", taxOffice: "Ardahan", taxNo: "7418529630", type: "Müşteri", city: "Ardahan", balance: 5200000, lastTransactionDate: "2026-08-29", organizationId: nil),
            VegaCari(id: "5", code: "320.01.104", name: "KRAL ENTEGRE ET SANAYİ TİC. A.Ş.", taxOffice: "Konya", taxNo: "3692581470", type: "Tedarikçi", city: "Konya", balance: -4180000, lastTransactionDate: "2026-08-31", organizationId: nil),
            VegaCari(id: "6", code: "320.01.005", name: "EMRE ARI ET VE BESİCİLİK", taxOffice: "Kocasinan", taxNo: "8529637410", type: "Tedarikçi", city: "Kayseri", balance: -6269373, lastTransactionDate: "2026-08-29", organizationId: nil)
        ]
        
        self.movements = [
            VegaCariHareket(id: "m1", cariCode: "120.01.001", date: "31.08.2026", docNo: "FAT-2026-8912", docType: "Satış Faturası", description: "Dana Karkas 12.400 KG Teslimatı", debit: 4650000, credit: 0, balance: 14250000),
            VegaCariHareket(id: "m2", cariCode: "120.01.001", date: "28.08.2026", docNo: "TAH-88219", docType: "Banka Havalesi", description: "Kuveyt Türk Cari Tahsilat", debit: 0, credit: 2000000, balance: 9600000),
            VegaCariHareket(id: "m3", cariCode: "120.01.001", date: "24.08.2026", docNo: "FAT-2026-8401", docType: "Satış Faturası", description: "Kuzu Karkas 6.800 KG Teslimatı", debit: 2800000, credit: 0, balance: 11600000)
        ]
    }
}
