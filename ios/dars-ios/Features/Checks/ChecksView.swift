import SwiftUI

public struct ChecksView: View {
    @ObservedObject var manager = SupabaseManager.shared
    @State private var activeTab: String = "Portföy"
    @State private var showingAddCheck = false
    
    public init() {}
    
    private var filteredChecks: [CheckRecord] {
        manager.checks.filter { $0.status == activeTab }
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header panel with Title and Action
            VStack(spacing: 16) {
                HStack {
                    Text("Çek & Senet Portföyü")
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(.ktTextHeading)
                        .tracking(-0.5)
                    Spacer()
                    Button(action: { showingAddCheck = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(Color.ktPrimary)
                            .clipShape(Circle())
                    }
                }
                
                // Segments Tab Selector
                HStack(spacing: 4) {
                    TabButton(title: "Portföydekiler", isSelected: activeTab == "Portföy") {
                        activeTab = "Portföy"
                    }
                    TabButton(title: "Tahsildekiler", isSelected: activeTab == "Tahsilde") {
                        activeTab = "Tahsilde"
                    }
                    TabButton(title: "Ciro Edilenler", isSelected: activeTab == "Ciro Edildi") {
                        activeTab = "Ciro Edildi"
                    }
                }
                .padding(3)
                .background(Color.ktSegmentedTrack)
                .cornerRadius(12)
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 12)
            .background(Color.ktCardSurface)
            
            // Check items list
            ScrollView {
                LazyVStack(spacing: 12) {
                    if filteredChecks.isEmpty {
                        Text("Bu kategoride kayıtlı çek bulunamadı.")
                            .font(.system(size: 13))
                            .foregroundColor(.ktTextMuted)
                            .padding(.top, 40)
                    } else {
                        ForEach(filteredChecks) { check in
                            checkCard(for: check)
                        }
                    }
                }
                .padding(.top, 12)
                .padding(.bottom, 90)
            }
            .background(Color.ktPageBackground)
        }
        .sheet(isPresented: $showingAddCheck) {
            AddCheckView()
        }
    }
    
    @ViewBuilder
    private func checkCard(for check: CheckRecord) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(check.kesideci ?? check.drawer)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.ktTextHeading)
                Text(check.bankName)
                    .font(.system(size: 11))
                    .foregroundColor(.ktTextMuted)
                Text("Seri: \(check.checkNo)")
                    .font(.system(size: 9))
                    .foregroundColor(.ktTextTertiary)
                    .fontDesign(.monospaced)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(formatCurrency(check.amount))
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(.ktTextHeading)
                Text(formatDate(check.dueDate))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.ktPrimary)
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
    
    // UI Helpers
    private func formatCurrency(_ amount: Double) -> String {
        return NumberFormatter.localizedString(from: NSNumber(value: amount), number: .decimal) + " TL"
    }
    
    private func formatDate(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        return "\(parts[2]).\(parts[1]).\(parts[0])"
    }
}

fileprivate struct TabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(isSelected ? Color.ktCardSurface : Color.clear)
                .foregroundColor(isSelected ? Color.ktPrimary : Color.ktTextMuted)
                .cornerRadius(10)
                .shadow(color: isSelected ? Color.black.opacity(0.04) : Color.clear, radius: 2)
        }
    }
}

#if DEBUG
struct ChecksView_Previews: PreviewProvider {
    static var previews: some View {
        ChecksView()
    }
}
#endif
