import XCTest
import Foundation
@testable import dars_ios

final class Milestone1_ProjectConfigTests: XCTestCase {

    private func getProjectYmlContent() throws -> String {
        // Resolve project root by navigating from test source file location
        let testFilePath = URL(fileURLWithPath: #filePath)
        // dars-ios/Tests/Milestone1_ProjectConfigTests.swift -> parent(Tests) -> parent(dars-ios) -> parent(root)
        let rootDir = testFilePath
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        
        let projectYmlURL = rootDir.appendingPathComponent("project.yml")
        
        guard FileManager.default.fileExists(atPath: projectYmlURL.path) else {
            XCTFail("project.yml not found at expected path: \(projectYmlURL.path)")
            throw NSError(domain: "TestError", code: 404, userInfo: nil)
        }
        
        return try String(contentsOf: projectYmlURL, encoding: .utf8)
    }

    func test_project_yml_targets_and_architecture() throws {
        let content = try getProjectYmlContent()

        // Verify project name and deployment target
        XCTAssertTrue(content.contains("name: dars-ios"), "Project name must be 'dars-ios'")
        XCTAssertTrue(content.contains("iOS: \"17.0\""), "Deployment target must be iOS 17.0")
        
        // Verify application target
        XCTAssertTrue(content.contains("dars-ios:"), "Target 'dars-ios' must be declared")
        XCTAssertTrue(content.contains("type: application"), "dars-ios target type must be application")
        
        // Verify unit test target
        XCTAssertTrue(content.contains("dars-iosTests:"), "Target 'dars-iosTests' must be declared")
        XCTAssertTrue(content.contains("type: bundle.unit-test"), "dars-iosTests target type must be bundle.unit-test")
        XCTAssertTrue(content.contains("- target: dars-ios"), "dars-iosTests must depend on dars-ios target")
    }

    func test_project_yml_spm_dependencies() throws {
        let content = try getProjectYmlContent()

        XCTAssertTrue(content.contains("supabase-swift:"), "SPM package supabase-swift must be declared")
        XCTAssertTrue(content.contains("https://github.com/supabase/supabase-swift.git"), "Supabase repository URL must match")
        XCTAssertTrue(content.contains("from: \"2.5.0\""), "Supabase package version requirement must be 2.5.0")
        XCTAssertTrue(content.contains("product: Supabase"), "Target must link product Supabase")
    }

    func test_project_yml_bundle_id_and_signing() throws {
        let content = try getProjectYmlContent()

        XCTAssertTrue(content.contains("PRODUCT_BUNDLE_IDENTIFIER: com.amasyaetas.mobile"), "Bundle ID must be com.amasyaetas.mobile")
        XCTAssertTrue(content.contains("DEVELOPMENT_TEAM: WGARWL7QZ4"), "Development team ID must be WGARWL7QZ4")
        XCTAssertTrue(content.contains("SWIFT_VERSION: \"5.9\""), "Swift version must be 5.9")
        XCTAssertTrue(content.contains("PRODUCT_BUNDLE_IDENTIFIER: com.amasyaetas.mobileTests"), "Test target bundle ID must be com.amasyaetas.mobileTests")
    }
}
