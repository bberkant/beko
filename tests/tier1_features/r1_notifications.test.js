import { SwiftParser } from '../helpers/swift_parser.js';

export const tier1NotificationsTests = [
  // ==================== FEATURE 1: Locked-screen & Background Notifications (Swift UNCalendar) ====================
  {
    id: 'T1-F1-01',
    tier: 'Tier 1',
    feature: 'F1: Locked-screen & Background Notifications',
    name: 'Swift scheduleDailyMorningSummary syntax validation (minute: Int = 0)',
    source: 'PROJECT.md:F1.1, Survey Explorer 1, DarsApp.swift:28',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) {
        return { passed: false, error: 'DarsApp.swift not found at ios/dars-ios/App/DarsApp.swift' };
      }
      if (parser.hasSyntaxErrorAtMinuteParam()) {
        return {
          passed: false,
          error: 'Syntax error detected at DarsApp.swift:28 - Parameter declared as "minute: 0" instead of "minute: Int = 0".'
        };
      }
      if (!parser.hasValidMinuteParamSyntax()) {
        return {
          passed: false,
          error: 'Missing valid parameter syntax "minute: Int = 0" in scheduleDailyMorningSummary.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F1-02',
    tier: 'Tier 1',
    feature: 'F1: Locked-screen & Background Notifications',
    name: 'Lock Screen permission options authorization [.alert, .badge, .sound] without .provisional',
    source: 'ORIGINAL_REQUEST.md:R1, PROJECT.md:F1.2, DarsApp.swift:15',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) return { passed: false, error: 'DarsApp.swift not found' };
      const options = parser.getAuthorizationOptions();
      if (parser.hasProvisionalPermission()) {
        return {
          passed: false,
          error: `Permission request contains ".provisional" (${options.join(', ')}), which suppresses lock screen banner alerts until explicitly accepted in notification center.`
        };
      }
      if (!parser.hasRequiredLockScreenPermissions()) {
        return {
          passed: false,
          error: `Missing required permission options [.alert, .badge, .sound]. Found: [${options.join(', ')}]`
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F1-03',
    tier: 'Tier 1',
    feature: 'F1: Locked-screen & Background Notifications',
    name: 'UNCalendarNotificationTrigger implementation for scheduled calendar triggers',
    source: 'ORIGINAL_REQUEST.md:R1, PROJECT.md:F1.3, DarsApp.swift:39',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) return { passed: false, error: 'DarsApp.swift not found' };
      if (!parser.usesUNCalendarNotificationTrigger()) {
        return {
          passed: false,
          error: 'UNCalendarNotificationTrigger is not utilized in DarsApp.swift for calendar scheduling.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F1-04',
    tier: 'Tier 1',
    feature: 'F1: Locked-screen & Background Notifications',
    name: 'WebKit script message handler darsNotification registered on WKUserContentController',
    source: 'PROJECT.md:F1.4, DarsApp.swift:133',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) return { passed: false, error: 'DarsApp.swift not found' };
      if (!parser.hasWebKitMessageHandler('darsNotification')) {
        return {
          passed: false,
          error: 'contentController.add(..., name: "darsNotification") is not registered in PrototypeWebView.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F1-05',
    tier: 'Tier 1',
    feature: 'F1: Locked-screen & Background Notifications',
    name: 'Native foreground presentation options include [.banner, .badge, .sound]',
    source: 'PROJECT.md:F1.2, DarsApp.swift:109',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) return { passed: false, error: 'DarsApp.swift not found' };
      if (!parser.hasForegroundPresentationOptions()) {
        return {
          passed: false,
          error: 'userNotificationCenter(willPresent:) does not provide banner, badge, and sound presentation options.'
        };
      }
      return { passed: true };
    }
  },

  // ==================== FEATURE 2: Notification Trigger Timings (09:00 AM & 2-day advance) ====================
  {
    id: 'T1-F2-01',
    tier: 'Tier 1',
    feature: 'F2: Notification Trigger Timings',
    name: 'Daily morning summary trigger scheduled at 09:00 AM with repeats true',
    source: 'ORIGINAL_REQUEST.md:R1, PROJECT.md:F1.3, DarsApp.swift:35-42',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) return { passed: false, error: 'DarsApp.swift not found' };
      if (!parser.hasDailyMorningSummaryTrigger()) {
        return {
          passed: false,
          error: 'scheduleDailyMorningSummary does not configure repeating UNCalendarNotificationTrigger for 09:00 AM.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F2-02',
    tier: 'Tier 1',
    feature: 'F2: Notification Trigger Timings',
    name: 'Daily morning summary content contains Turkish title and badge indicator',
    source: 'ORIGINAL_REQUEST.md:R1, DarsApp.swift:30-33',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) return { passed: false, error: 'DarsApp.swift not found' };
      const content = parser.getContent();
      const hasTitle = content.includes('☀️ DARS Günlük Finansal Özet');
      const hasBadge = content.includes('content.badge = 1') || content.includes('content.badge = NSNumber(value: 1)');
      const hasSound = content.includes('content.sound = .default');
      if (!hasTitle || !hasBadge || !hasSound) {
        return {
          passed: false,
          error: `Morning summary missing required content properties. hasTitle=${hasTitle}, hasBadge=${hasBadge}, hasSound=${hasSound}`
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F2-03',
    tier: 'Tier 1',
    feature: 'F2: Notification Trigger Timings',
    name: 'Credit card due date reminder configured with advance deadline timing',
    source: 'ORIGINAL_REQUEST.md:R1, DarsApp.swift:54-112',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) return { passed: false, error: 'DarsApp.swift not found' };
      const content = parser.getContent();
      const hasCcReminder = (content.includes('scheduleCreditCardReminder') || content.includes('cc_due_reminder_lockscreen')) &&
                            content.includes('💳 Kredi Kartı Son Ödeme Uyarısı');
      if (!hasCcReminder) {
        return {
          passed: false,
          error: 'Credit card due date reminder not configured in DarsApp.swift.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F2-04',
    tier: 'Tier 1',
    feature: 'F2: Notification Trigger Timings',
    name: 'Check maturity advance reminder configured for upcoming portfolio checks',
    source: 'ORIGINAL_REQUEST.md:R1, DarsApp.swift:114-179',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) return { passed: false, error: 'DarsApp.swift not found' };
      const content = parser.getContent();
      const hasCheckReminder = (content.includes('scheduleCheckReminder') || content.includes('check_due_reminder_lockscreen')) &&
                               content.includes('🚨 Çek Vadesi');
      if (!hasCheckReminder) {
        return {
          passed: false,
          error: 'Check maturity reminder not configured in DarsApp.swift.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F2-05',
    tier: 'Tier 1',
    feature: 'F2: Notification Trigger Timings',
    name: 'Vehicle inspection & insurance advance deadline reminder configured',
    source: 'ORIGINAL_REQUEST.md:R1, DarsApp.swift:181-250',
    run: async () => {
      const parser = new SwiftParser();
      if (!parser.exists()) return { passed: false, error: 'DarsApp.swift not found' };
      const content = parser.getContent();
      const hasVehicleReminder = (content.includes('scheduleVehicleReminder') || content.includes('vehicle_inspection_lockscreen')) &&
                                 (content.includes('🚗 Araç Muayene & Sigorta Takibi') || content.includes('🚗 TÜVTÜRK Muayene'));
      if (!hasVehicleReminder) {
        return {
          passed: false,
          error: 'Vehicle inspection reminder not configured in DarsApp.swift.'
        };
      }
      return { passed: true };
    }
  }
];
