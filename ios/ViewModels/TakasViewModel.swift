import Foundation
import SwiftUI

public struct TakasMatrixColumn: Identifiable {
    public let id = UUID()
    public let bankName: String
    public let values: [Double]
    public let total: Double
    public let isHighlighted: Bool
}

@MainActor
public class TakasViewModel: ObservableObject {
    @Published public var activeTab: TakasTab = .takasta
    @Published public var takasChecks: [EBSCheck] = []
    @Published public var icTakasChecks: [EBSCheck] = []
    @Published public var matrixColumns: [TakasMatrixColumn] = []
    
    public enum TakasTab: String, CaseIterable {
        case takasta = "Takasta (5)"
        case icTakas = "İç Takas (2)"
        case odenen = "Ödenen"
    }
    
    public init() {
        setupData()
    }
    
    public var takasTotal: Double {
        return 2917696.0
    }
    
    public var icTakasTotal: Double {
        return 1092020.0
    }
    
    public var totalCount: Int {
        return takasChecks.count
    }
    
    private func setupData() {
        self.takasChecks = [
            EBSCheck(id: "1", checkNo: "0026098", checkType: "kesilen", amount: 2000000, currency: "TL", dueDate: "2026-09-01", registrationDate: "2026-07-18", debtor: "M.ZİRAAT", creditor: "BURAK BESİCİLİK-KRŞ", bankName: "M.ZİRAAT", bankBranch: nil, status: "Tahsilde", ozelAlan: "ıEK", ciroEdilen: nil, organizationId: nil),
            EBSCheck(id: "2", checkNo: "TKS-001", checkType: "kesilen", amount: 531419, currency: "TL", dueDate: "2026-09-01", registrationDate: "2026-04-30", debtor: "TAKSİT", creditor: "MARİF KUVEYT-2.700.000", bankName: "TAKSİT", bankBranch: nil, status: "Tahsilde", ozelAlan: "TAKSİT", ciroEdilen: nil, organizationId: nil),
            EBSCheck(id: "3", checkNo: "TKS-002", checkType: "kesilen", amount: 222064, currency: "TL", dueDate: "2026-09-01", registrationDate: "2025-08-01", debtor: "TAKSİT", creditor: "KUVEYT-3.480.000-TRANSİT ARAÇ", bankName: "TAKSİT", bankBranch: nil, status: "Tahsilde", ozelAlan: "TAKSİT", ciroEdilen: nil, organizationId: nil),
            EBSCheck(id: "4", checkNo: "TKS-003", checkType: "kesilen", amount: 103751, currency: "TL", dueDate: "2026-09-01", registrationDate: "2026-03-18", debtor: "TAKSİT", creditor: "ALBARAKA FİNANSMAN KART-1.000.000", bankName: "TAKSİT", bankBranch: nil, status: "Tahsilde", ozelAlan: "TAKSİT", ciroEdilen: nil, organizationId: nil),
            EBSCheck(id: "5", checkNo: "TKS-004", checkType: "kesilen", amount: 60462, currency: "TL", dueDate: "2026-09-01", registrationDate: "2026-08-22", debtor: "TAKSİT", creditor: "SGK 0.P.C.", bankName: "TAKSİT", bankBranch: nil, status: "Tahsilde", ozelAlan: "TAKSİT", ciroEdilen: nil, organizationId: nil)
        ]
        
        self.icTakasChecks = [
            EBSCheck(id: "13", checkNo: "0026085", checkType: "kesilen", amount: 606020, currency: "TL", dueDate: "2026-08-31", registrationDate: "2026-07-13", debtor: "M.ZİRAAT", creditor: "HAYDAR DELİ", bankName: "M.ZİRAAT", bankBranch: nil, status: "Tahsilde", ozelAlan: "TAKASTA OLMAYAN - İÇ TAKAS", ciroEdilen: nil, organizationId: nil),
            EBSCheck(id: "14", checkNo: "0026622", checkType: "kesilen", amount: 486000, currency: "TL", dueDate: "2026-08-31", registrationDate: "2026-07-02", debtor: "E.ZİRAAT", creditor: "KRAL ENTEGRE", bankName: "E.ZİRAAT", bankBranch: nil, status: "Tahsilde", ozelAlan: "TAKASTA OLMAYAN - İÇ TAKAS", ciroEdilen: nil, organizationId: nil)
        ]
        
        // Exact Web Portal Bank Matrix
        self.matrixColumns = [
            TakasMatrixColumn(bankName: "ALBARAKA", values: [0, 0, 0, 0], total: 0, isHighlighted: false),
            TakasMatrixColumn(bankName: "E.DENİZ", values: [0, 0, 0, 0], total: 0, isHighlighted: false),
            TakasMatrixColumn(bankName: "E.ZİRAAT", values: [0, 0, 0, 0], total: 0, isHighlighted: false),
            TakasMatrixColumn(bankName: "M.ZİRAAT", values: [2000000, 0, 0, 0], total: 2000000, isHighlighted: true),
            TakasMatrixColumn(bankName: "M.DENİZ", values: [0, 0, 0, 0], total: 0, isHighlighted: false),
            TakasMatrixColumn(bankName: "M.GARANTİ", values: [0, 0, 0, 0], total: 0, isHighlighted: false),
            TakasMatrixColumn(bankName: "M.AKBANK", values: [0, 0, 0, 0], total: 0, isHighlighted: false),
            TakasMatrixColumn(bankName: "M.YAPI", values: [0, 0, 0, 0], total: 0, isHighlighted: false),
            TakasMatrixColumn(bankName: "TAKSİT", values: [103751, 222064, 531419, 60462], total: 917696, isHighlighted: true)
        ]
    }
}
