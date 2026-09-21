import SwiftUI

public struct LegalCasesView: View {
    @ObservedObject var manager = SupabaseManager.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(manager.legalCases) { legalCase in
                    caseCard(for: legalCase)
                }
            }
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .background(Color.ktPageBackground)
        .navigationBarTitle("Hukuki İşlemler", displayMode: .inline)
    }
    
    @ViewBuilder
    private func caseCard(for legalCase: LegalCaseRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(legalCase.caseNo)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.ktPrimary)
                Spacer()
                
                Text(legalCase.status)
                    .font(.system(size: 9, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(legalCase.status == "Devam Ediyor" ? Color.ktOrangeLight : Color.ktSlate100)
                    .foregroundColor(legalCase.status == "Devam Ediyor" ? .ktOrange : .ktTextMuted)
                    .cornerRadius(6)
            }
            
            Text(legalCase.courtName)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.ktTextHeading)
            
            Divider()
            
            VStack(alignment: .leading, spacing: 4) {
                Text("DAVA KONUSU")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundColor(.ktTextMuted)
                Text(legalCase.caseSubject)
                    .font(.system(size: 12))
                    .foregroundColor(.ktTextMuted)
            }
        }
        .padding(16)
        .background(Color.ktCardSurface)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.ktCardBorder, lineWidth: 1)
        )
        .padding(.horizontal, 24)
    }
}

#if DEBUG
struct LegalCasesView_Previews: PreviewProvider {
    static var previews: some View {
        LegalCasesView()
    }
}
#endif
