import SwiftUI

public struct ChecksView: View {
    @ObservedObject var manager = SupabaseManager.shared
    @State private var activeTab: String = "Portföy"
    @State private var showingAddCheck = false
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header panel with Title and Action
            VStack(spacing: 16) {
                HStack {
                    Text("Çek & Senet Portföyü")
                        .font(.system(size: 20, weight: .black))
                        .foregroundColor(Color(.label))
                        .tracking(-0.5)
                    Spacer()
                    Button(action: { showingAddCheck = true }) {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 32, height: 32)
                            .background(Color.brandGreen)
                            .clipShape(Circle())
                    }
                }
                
                // Segments Tab Selector (Matches Kuveyt Turk Segmented Control style)
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
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            .padding(.horizontal, 24)
            .padding(.top, 16)
            .padding(.bottom, 12)
            .background(Color(.systemBackground))
            
            // Check items list
            ScrollView {
                VStack(spacing: 12) {
                    let filtered = manager.checks.filter { $0.status == activeTab }
                    
                    if filtered.isEmpty {
                        Text("Bu kategoride kayıtlı çek bulunamadı.")
                            .font(.system(size: 13))
                            .foregroundColor(.gray)
                            .padding(.top, 40)
                    } else {
                        ForEach(filtered) { check in
                            HStack {
                                VStack(alignment: .left, spacing: 4) {
                                    Text(check.kesideci)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(Color(.label))
                                    Text(check.bankName)
                                        .font(.system(size: 11))
                                        .foregroundColor(.gray)
                                    Text("Seri: \(check.checkNo)")
                                        .font(.system(size: 9))
                                        .foregroundColor(.gray.opacity(0.6))
                                        .fontDesign(.monospaced)
                                }
                                Spacer()
                                VStack(alignment: .right, spacing: 4) {
                                    Text(formatCurrency(check.amount))
                                        .font(.system(size: 14, weight: .black))
                                        .foregroundColor(Color(.label))
                                    Text(formatDate(check.dueDate))
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundColor(.brandGreen)
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
                }
                .padding(.top, 12)
                .padding(.bottom, 90)
            }
            .background(Color(red: 0.96, green: 0.97, blue: 0.98))
        }
        .sheet(isPresented: $showingAddCheck) {
            AddCheckView()
        }
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

// Segment Tab Button styled to look like Kuveyt Turk (clear background/active background)
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
                .background(isSelected ? Color(.systemBackground) : Color.clear)
                .foregroundColor(isSelected ? .brandGreen : .gray)
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
