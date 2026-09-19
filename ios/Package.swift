// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MarifEt",
    defaultLocalization: "tr",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(name: "MarifEtApp", targets: ["MarifEtApp"]),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase-community/supabase-swift.git", from: "2.5.0")
    ],
    targets: [
        .target(name: "MarifEtApp", dependencies: [.product(name: "Supabase", package: "supabase-swift")], path: "."),
    ]
)
