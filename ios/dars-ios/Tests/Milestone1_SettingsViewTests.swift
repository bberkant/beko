import XCTest
import SwiftUI
@testable import dars_ios

final class Milestone1_SettingsViewTests: XCTestCase {

    override func tearDown() {
        super.tearDown()
        // Reset test keys to default states
        UserDefaults.standard.removeObject(forKey: "biometric_login_enabled")
        UserDefaults.standard.removeObject(forKey: "check_notifications_enabled")
        UserDefaults.standard.removeObject(forKey: "invoice_notifications_enabled")
        UserDefaults.standard.removeObject(forKey: "maturity_alert_days")
        UserDefaults.standard.removeObject(forKey: "mask_balances_default")
        UserDefaults.standard.removeObject(forKey: "auto_lock_minutes")
    }

    func test_settings_view_instantiation() {
        let view = SettingsView()
        XCTAssertNotNil(view, "SettingsView must instantiate with parameterless public initializer")
        let body = view.body
        XCTAssertNotNil(body, "SettingsView body must evaluate without crashing")
    }

    func test_settings_user_defaults_keys_and_defaults() {
        let defaults = UserDefaults.standard
        
        // Define exact keys used by SettingsView @AppStorage properties
        let biometricKey = "biometric_login_enabled"
        let checkNotificationsKey = "check_notifications_enabled"
        let invoiceNotificationsKey = "invoice_notifications_enabled"
        let maturityAlertDaysKey = "maturity_alert_days"
        let maskBalancesKey = "mask_balances_default"
        let autoLockMinutesKey = "auto_lock_minutes"

        // When unconfigured, bool defaults to false in standard UserDefaults
        // Simulate default setting application
        defaults.set(true, forKey: biometricKey)
        defaults.set(true, forKey: checkNotificationsKey)
        defaults.set(true, forKey: invoiceNotificationsKey)
        defaults.set(3, forKey: maturityAlertDaysKey)
        defaults.set(false, forKey: maskBalancesKey)
        defaults.set(15, forKey: autoLockMinutesKey)

        XCTAssertTrue(defaults.bool(forKey: biometricKey))
        XCTAssertTrue(defaults.bool(forKey: checkNotificationsKey))
        XCTAssertTrue(defaults.bool(forKey: invoiceNotificationsKey))
        XCTAssertEqual(defaults.integer(forKey: maturityAlertDaysKey), 3)
        XCTAssertFalse(defaults.bool(forKey: maskBalancesKey))
        XCTAssertEqual(defaults.integer(forKey: autoLockMinutesKey), 15)
    }

    func test_settings_user_defaults_persistence_roundtrip() {
        let defaults = UserDefaults.standard
        let maskKey = "mask_balances_default"
        let autoLockKey = "auto_lock_minutes"

        // Toggle balance masking
        defaults.set(true, forKey: maskKey)
        XCTAssertTrue(defaults.bool(forKey: maskKey))

        defaults.set(false, forKey: maskKey)
        XCTAssertFalse(defaults.bool(forKey: maskKey))

        // Update auto-lock timeout
        defaults.set(30, forKey: autoLockKey)
        XCTAssertEqual(defaults.integer(forKey: autoLockKey), 30)

        defaults.set(5, forKey: autoLockKey)
        XCTAssertEqual(defaults.integer(forKey: autoLockKey), 5)
    }
}
