import SwiftUI

// MARK: - Kuveyt Türk Segmented Control
public struct KTSegmentedControl<T: Hashable>: View {
    private let items: [T]
    @Binding private var selection: T
    private let title: (T) -> String
    private let badgeCount: ((T) -> Int?)?

    @Namespace private var segmentNamespace

    public init(
        items: [T],
        selection: Binding<T>,
        title: @escaping (T) -> String,
        badgeCount: ((T) -> Int?)? = nil
    ) {
        self.items = items
        self._selection = selection
        self.title = title
        self.badgeCount = badgeCount
    }

    public var body: some View {
        HStack(spacing: 3) {
            ForEach(items, id: \.self) { item in
                let isSelected = selection == item
                Button(action: {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
                        selection = item
                    }
                }) {
                    HStack(spacing: 4) {
                        Text(title(item))
                            .font(isSelected ? .ktSegmentedActive : .ktSegmented)
                            .foregroundColor(isSelected ? .ktTextHeading : .ktTextSecondary)
                            .lineLimit(1)

                        if let count = badgeCount?(item) {
                            Text("(\(count))")
                                .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                                .foregroundColor(isSelected ? .ktPrimary : .ktTextTertiary)
                        }
                    }
                    .padding(.vertical, 7)
                    .padding(.horizontal, 10)
                    .frame(maxWidth: .infinity)
                    .background(
                        ZStack {
                            if isSelected {
                                RoundedRectangle(cornerRadius: KTTheme.Metrics.cornerRadiusSegmentItem, style: .continuous)
                                    .fill(Color.ktCardSurface)
                                    .shadow(color: Color.black.opacity(0.08), radius: 2, x: 0, y: 1)
                                    .matchedGeometryEffect(id: "activeSegmentBackground", in: segmentNamespace)
                            }
                        }
                    )
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(3.5)
        .background(Color.ktSegmentedTrack)
        .clipShape(RoundedRectangle(cornerRadius: KTTheme.Metrics.cornerRadiusSegmented, style: .continuous))
    }
}
