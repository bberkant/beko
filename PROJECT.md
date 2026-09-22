# Project: DARS Mobile iOS Notifications, Menu Tree Overhaul & Financial Calendar Redesign

## Architecture
- **Host App**: Swift iOS Native Application (`ios/dars-ios/App/DarsApp.swift`) embedding `PrototypeWebView` (WKWebView).
- **Frontend Layer**: Single-page mobile web application (`ios_prototype.html` and bundled `ios/dars-ios/App/www/ios_prototype.html`).
- **Bridge Mechanism**: WebKit message handler `darsNotification` registered on `WKUserContentController` connecting JavaScript events to native `NotificationManager`.
- **Native Notification Engine**: `NotificationManager` implementing `UNUserNotificationCenterDelegate` with `UNCalendarNotificationTrigger` scheduled date triggers.
- **Navigation System**: 23 modules and 51 sub-routes synchronized with `src/types/navigation.ts`, rendered in `#screen-menu` with Kuveyt Türk corporate styling.
- **Financial Calendar**: Dual-view calendar (dashboard widget `#dashboard-calendar-widget` and full screen `#screen-takvim`) with 6 event categories, selected day event cards, and interactive to-do notes.
- **CI/CD Pipeline**: XcodeGen `project.yml` generating Xcode project, GitHub Actions workflow building and deploying to Apple TestFlight.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1.1 Swift Syntax Fix | Fix compiler error at `DarsApp.swift:28` (`minute: Int = 0`) | M1 | Survey Explorer 1 |
| 2 | F1.2 Lock Screen Permission | Remove `.provisional` to enable banner, sound, badge on Lock Screen | M1 | Survey Explorer 1 |
| 3 | F1.3 UNCalendar Triggers | Implement daily 09:00 AM summary, 2-day advance & same-day reminders for cards, checks, inspections | M1 | Survey Explorer 1 |
| 4 | F1.4 JS-Native Bridge | Implement `syncAllEvents` message handling in `DarsApp.swift` and invoke from `ios_prototype.html` | M1 | Survey Explorer 1 |
| 5 | F2.1 Nav Synchronization | Synchronize 23 main modules and 51 sub-routes from `src/types/navigation.ts` in `darsNavModules` | M2 | Survey Explorer 2 |
| 6 | F2.2 Route Mismatch Fixes | Map `subeler` -> `branches`, `hukuk` -> `legal_cases`, `raporlama` -> `reporting`, `main_cashbox_io` -> `cashbox`, `settings` -> `ayarlar` | M2 | Survey Explorer 2 |
| 7 | F2.3 Missing Containers | Add `<div id="screen-bills">` and `<div id="screen-findeks">` DOM containers | M2 | Survey Explorer 2 |
| 8 | F2.4 Menu Visual Hierarchy | Implement accordion groups, active highlights, search filtering, Kuveyt Türk icons & typography | M2 | Survey Explorer 2 |
| 9 | F3.1 Takvim Screen Fix | Define `renderTakvimScreen()` aliasing `renderCalendar()` to eliminate ReferenceError | M3 | Survey Explorer 3 |
| 10 | F3.2 Calendar Grid & Styles | Monday-first grid with 6 event dots (`KART`, `MUAYENE`, `SİGORTA`, `İHALE`, `ÇEK`, `NOT`) across widget & screen | M3 | Survey Explorer 3 |
| 11 | F3.3 Selected Day Cards | Display code/plate, title, amount, institution, and quick module navigation button | M3 | Survey Explorer 3 |
| 12 | F3.4 Notes & Completion | Add note completion toggle (`toggleCalendarNote`), checkbox UI, and localStorage persistence | M3 | Survey Explorer 3 |
| 13 | F4.1 Backup Preservation | Ensure `ios_prototype_yedek.html` preserves exact SHA256 `A80F8D5A9012CDD5A5B1F33E3965D3728BAF3FD3FE91218E7BD895F15324BDE4` | M4 | Survey Explorer 3 |
| 14 | F4.2 Webview Bundle Sync | Synchronize `ios_prototype.html` into `ios/dars-ios/App/www/ios_prototype.html` | M4 | Survey Explorer 3 |
| 15 | F4.3 V8 Syntax Validation | Validate all JavaScript script blocks with Node V8 parser with 0 errors | M4 | Survey Explorer 3 |
| 16 | F4.4 TestFlight Deployment | Bump build number in `ios/project.yml`, commit, push, and verify CI/CD TestFlight deployment | M4 | Survey Explorer 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | M1_Notifications | F1.1, F1.2, F1.3, F1.4: Locked-Screen & Background Notifications in Swift & Bridge | None | PLANNED |
| M2 | M2_Navigation | F2.1, F2.2, F2.3, F2.4: Mobile Sidebar & Menu Tree Overhaul matching navigation.ts | None | PLANNED |
| M3 | M3_Calendar | F3.1, F3.2, F3.3, F3.4: Financial Calendar Redesign, Takvim Screen routing, To-do completion | None | PLANNED |
| M4 | M4_Deployment | F4.1, F4.2, F4.3, F4.4: Zero-Regression verification, backup SHA256, bundle sync, TestFlight CI | M1, M2, M3 | PLANNED |

## Interface Contracts
### Webview JS ↔ Native Swift Notification Bridge
- **Handler Name**: `darsNotification`
- **Invocation**: `window.webkit?.messageHandlers?.darsNotification?.postMessage(payload)`
- **Payload Schema**:
  ```typescript
  interface NotificationSyncPayload {
    action: "syncAllEvents" | "scheduleDate";
    events?: Array<{
      id: string;
      title: string;
      body: string;
      date: string; // ISO format or YYYY-MM-DD
      type: "credit-card" | "check" | "inspection" | "insurance" | "tender" | "note";
      advanceDays?: number; // e.g. 2 days
    }>;
  }
  ```

### Screen Navigation Contract
- **Trigger**: `changeScreen(screenId: string)`
- **DOM Container**: `<div id="screen-[screenId]">`
- **Active Navigation Tracking**: Update active CSS classes on sidebar menu items matching `screenId` or parent module.

## Code Layout
- `ios/dars-ios/App/DarsApp.swift`: Native entry point, `NotificationManager`, `PrototypeWebView`, WKScriptMessageHandler.
- `ios_prototype.html`: Mobile single-page application (menu tree, dashboard calendar widget, `screen-takvim`, calendar styles, notes logic).
- `ios/dars-ios/App/www/ios_prototype.html`: Bundled copy loaded by native WKWebView.
- `src/types/navigation.ts`: Canonical source of truth for 23 modules and 51 sub-routes.
- `ios_prototype_yedek.html`: Immutable master backup file (SHA256 protected).
- `ios/project.yml`: XcodeGen project specification with `CURRENT_PROJECT_VERSION`.
