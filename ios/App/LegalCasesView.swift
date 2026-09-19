import SwiftUI
import UIKit

struct LegalCasesView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                ForEach(manager.legalCases) { legalCase in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(legalCase.caseNo)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.brandGreen)
                            Spacer()
                            
                            Text(legalCase.status)
                                .font(.system(size: 9, weight: .bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(legalCase.status == "Devam Ediyor" ? Color.orange.opacity(0.1) : Color.gray.opacity(0.1))
                                .foregroundColor(legalCase.status == "Devam Ediyor" ? .orange : .gray)
                                .cornerRadius(6)
                        }
                        
                        Text(legalCase.courtName)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(.label))
                        
                        Divider()
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("DAVA KONUSU")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(.gray)
                            Text(legalCase.caseSubject)
                                .font(.system(size: 12))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(16)
                    .background(Color(.systemBackground))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color(.systemGray5), lineWidth: 1)
                    )
                    .padding(.horizontal, 24)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .background(Color(red: 0.96, green: 0.97, blue: 0.98))
        .navigationBarTitle("Hukuki İşlemler", displayMode: .inline)
    }
}


