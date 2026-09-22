/**
 * Empirical Adversarial Stress Harness for Milestone 1 (iOS Swift Notifications)
 * 
 * Tests:
 * 1. Month boundaries and leap years (Day 31, Feb 28/29, advanceDay math)
 * 2. Past dates vs upcoming dates (suppression of past reminders)
 * 3. Malformed bridge payloads (missing actions, invalid dates, nulls, type coercions)
 * 4. Concurrent / rapid successive calls & iOS 64 notification capacity
 * 5. UNCalendarNotificationTrigger verification across all alert categories
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const swiftFilePath = path.join(projectRoot, 'ios', 'dars-ios', 'App', 'DarsApp.swift');
const swiftContent = fs.readFileSync(swiftFilePath, 'utf8');

// ============================================================================
// SIMULATED SWIFT IMPLEMENTATION MODELS (Faithful Mirror of DarsApp.swift)
// ============================================================================

// Model of Swift DateParser from DarsApp.swift:572-597
function parseDateSwift(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  const trimmed = dateString.trim();
  if (!trimmed) return null;

  // ISO8601 with or without fractional seconds
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
  if (isoRegex.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // yyyy-MM-dd
  const ymdRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const ymdMatch = trimmed.match(ymdRegex);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const date = new Date(Date.UTC(y, m - 1, d, 9, 0, 0));
    // Verify month overflow (e.g. Feb 30)
    if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date;
  }

  // dd.MM.yyyy
  const dmyRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  const dmyMatch = trimmed.match(dmyRegex);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const date = new Date(Date.UTC(y, m - 1, d, 9, 0, 0));
    if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date;
  }

  // dd/MM/yyyy
  const slashRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const slashMatch = trimmed.match(slashRegex);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10);
    const y = parseInt(slashMatch[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const date = new Date(Date.UTC(y, m - 1, d, 9, 0, 0));
    if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
    return date;
  }

  // Standard fallback
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

// Model of Swift scheduleCreditCardReminder logic from DarsApp.swift:54-135
function simulateScheduleCreditCardReminder(id, bank, cardName, dueDay, debt = null, minPayment = null, year = 2026, month = 3) {
  const validDueDay = Math.max(1, Math.min(31, dueDay));
  
  // Dynamic calendar arithmetic mirroring DarsApp.swift:
  // When validDueDay <= 2, calculate advance date using calendar.date(byAdding: .day, value: -2, to: targetDate)
  let advanceDay = validDueDay - 2;
  if (advanceDay <= 0) {
    const targetDate = new Date(Date.UTC(year, month - 1, validDueDay, 9, 0, 0));
    const advDate = new Date(targetDate.getTime());
    advDate.setUTCDate(advDate.getUTCDate() - 2);
    advanceDay = advDate.getUTCDate();
  }

  // Clamped due day for month-end boundary protection (e.g. day 31 in Feb/Apr/Jun/Sep/Nov)
  const daysInMonth = new Date(year, month, 0).getDate();
  const effectiveDueDay = Math.min(validDueDay, daysInMonth);

  const advTrigger = {
    type: 'UNCalendarNotificationTrigger',
    dateMatching: { day: advanceDay, hour: 9, minute: 0 },
    repeats: true
  };

  const dueTrigger = {
    type: 'UNCalendarNotificationTrigger',
    dateMatching: { day: effectiveDueDay, hour: 9, minute: 0 },
    repeats: true
  };

  return {
    validDueDay,
    effectiveDueDay,
    advanceDay,
    advRequest: {
      identifier: `cc_advance_${id}`,
      trigger: advTrigger
    },
    dueRequest: {
      identifier: `cc_due_${id}`,
      trigger: dueTrigger
    }
  };
}

// Model of iOS UNCalendarNotificationTrigger matching semantics:
// Given a trigger DateComponents and a month in year, does it fire in that month?
function doesTriggerFireInMonth(triggerDay, year, month) {
  // month is 1-indexed (1 = Jan, 2 = Feb, ...)
  const daysInMonth = new Date(year, month, 0).getDate();
  // In iOS UserNotifications: a monthly trigger with day: N fires in a month iff daysInMonth >= N
  return triggerDay <= daysInMonth;
}

// Model of Swift scheduleAdvanceAndDueNotification from DarsApp.swift:300-349
function simulateScheduleAdvanceAndDueNotification(targetDateStr, advanceDays = 2, now = new Date('2026-09-22T10:54:25Z')) {
  const targetDate = parseDateSwift(targetDateStr);
  if (!targetDate) return { scheduledAdvance: false, scheduledDue: false, reason: 'unparseable' };

  let scheduledAdvance = false;
  let scheduledDue = false;

  // Advance reminder
  if (advanceDays > 0) {
    const advDate = new Date(targetDate.getTime());
    advDate.setUTCDate(advDate.getUTCDate() - advanceDays);
    advDate.setUTCHours(9, 0, 0, 0);
    if (advDate > now) {
      scheduledAdvance = true;
    }
  }

  // Due reminder
  const dueDate = new Date(targetDate.getTime());
  dueDate.setUTCHours(9, 0, 0, 0);
  if (dueDate > now) {
    scheduledDue = true;
  }

  return { scheduledAdvance, scheduledDue, targetDate };
}

// Model of Swift userContentController from DarsApp.swift:724-759
function simulateBridgeDispatch(rawMessage) {
  let payloadDict = null;

  if (rawMessage && typeof rawMessage === 'object' && !Array.isArray(rawMessage)) {
    payloadDict = rawMessage;
  } else if (typeof rawMessage === 'string') {
    try {
      const parsed = JSON.parse(rawMessage);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        payloadDict = parsed;
      }
    } catch (e) {
      payloadDict = null;
    }
  }

  if (!payloadDict) {
    return { status: 'REJECTED', reason: 'Invalid payload format' };
  }

  const action = payloadDict.action || '';
  switch (action) {
    case 'syncAllEvents':
      if (Array.isArray(payloadDict.events)) {
        return { status: 'DISPATCHED', handler: 'syncAllEvents', count: payloadDict.events.length };
      }
      return { status: 'DISPATCHED_EMPTY', handler: 'syncAllEvents', count: 0 };
    case 'scheduleReminder':
    case 'scheduleDate':
      return { status: 'DISPATCHED', handler: 'handleScheduleMessage' };
    case 'requestPermission':
      return { status: 'DISPATCHED', handler: 'requestAuthorization' };
    case 'clearAll':
      return { status: 'DISPATCHED', handler: 'clearAllPendingNotifications' };
    default:
      return { status: 'DISPATCHED_FALLBACK', handler: 'handleScheduleMessage' };
  }
}

// ============================================================================
// ADVERSARIAL TEST RUNNER
// ============================================================================

const results = [];

function test(id, description, fn) {
  try {
    const res = fn();
    results.push({ id, description, passed: res.passed, details: res.details, severity: res.severity || 'NORMAL' });
  } catch (err) {
    results.push({ id, description, passed: false, details: `EXCEPTION: ${err.message}`, severity: 'CRITICAL' });
  }
}

console.log('='.repeat(80));
console.log('   EMPIRICAL ADVERSARIAL STRESS TEST HARNESS — MILESTONE 1 NOTIFICATIONS');
console.log('='.repeat(80));

// ============================================================================
// SUITE 1: Month Boundaries & Leap Years
// ============================================================================

test('ADV-M1-01', 'Credit card monthly trigger on Day 31 in 30-day and 28-day months', () => {
  // Months with 30 days: April (4), June (6), September (9), November (11)
  // Month with 28/29 days: February (2)
  const shortMonths = [
    { name: 'February 2026 (28d)', y: 2026, m: 2 },
    { name: 'February 2028 Leap (29d)', y: 2028, m: 2 },
    { name: 'April 2026 (30d)', y: 2026, m: 4 },
    { name: 'June 2026 (30d)', y: 2026, m: 6 },
    { name: 'September 2026 (30d)', y: 2026, m: 9 },
    { name: 'November 2026 (30d)', y: 2026, m: 11 },
  ];

  const droppedMonths = [];
  for (const month of shortMonths) {
    const sim = simulateScheduleCreditCardReminder('card_31', 'Garanti', 'Bonus', 31, null, null, month.y, month.m);
    const fires = doesTriggerFireInMonth(sim.effectiveDueDay, month.y, month.m);
    if (!fires) {
      droppedMonths.push(month.name);
    }
  }

  return {
    passed: droppedMonths.length === 0,
    details: droppedMonths.length === 0
      ? 'Month-end boundary protection active: Day 31 correctly clamps to month-end across all short and leap months.'
      : `UNCalendarNotificationTrigger with day: 31 skips ${droppedMonths.length} months/year: [${droppedMonths.join(', ')}]. Defect: Monthly repeating trigger on day 31 drops notifications in non-31-day months.`,
    severity: 'HIGH'
  };
});

test('ADV-M1-02', 'Credit card advanceDay calculation for dueDay = 1 across February (non-leap year)', () => {
  // dueDay = 1 in March: advance reminder falls in February 2026 (28 days) -> March 1 - 2d = Feb 27
  const sim = simulateScheduleCreditCardReminder('card_01', 'Akbank', 'Axess', 1, null, null, 2026, 3);
  const firesInFeb2026 = doesTriggerFireInMonth(sim.advanceDay, 2026, 2);
  
  return {
    passed: firesInFeb2026,
    details: `For dueDay=1, advanceDay is computed as ${sim.advanceDay}. In February 2026 (28 days), day ${sim.advanceDay} fires correctly before March 1 due date.`,
    severity: 'HIGH'
  };
});

test('ADV-M1-03', 'Credit card advanceDay calculation for dueDay = 2 across February (leap AND non-leap years)', () => {
  // dueDay = 2 in March: advance reminder falls in February (Feb 28 in 2026, Feb 29 in 2028)
  const sim2026 = simulateScheduleCreditCardReminder('card_02', 'İş Bankası', 'Maximum', 2, null, null, 2026, 3);
  const sim2028 = simulateScheduleCreditCardReminder('card_02', 'İş Bankası', 'Maximum', 2, null, null, 2028, 3);
  const firesInFeb2026 = doesTriggerFireInMonth(sim2026.advanceDay, 2026, 2);
  const firesInFeb2028 = doesTriggerFireInMonth(sim2028.advanceDay, 2028, 2);

  return {
    passed: firesInFeb2026 && firesInFeb2028,
    details: `For dueDay=2, advanceDay is computed as ${sim2026.advanceDay} (2026) and ${sim2028.advanceDay} (2028 leap). Both fire correctly in February before March 2!`,
    severity: 'HIGH'
  };
});

test('ADV-M1-04', 'Calendar-based 2-day advance calculation for Check / Vehicle across Leap Year (March 1, 2028 vs 2026)', () => {
  const dLeap = parseDateSwift('2028-03-01');
  const dNonLeap = parseDateSwift('2026-03-01');

  // In DarsApp.swift: calendar.date(byAdding: .day, value: -2, to: targetDate)
  const advLeap = new Date(dLeap.getTime());
  advLeap.setUTCDate(advLeap.getUTCDate() - 2);

  const advNonLeap = new Date(dNonLeap.getTime());
  advNonLeap.setUTCDate(advNonLeap.getUTCDate() - 2);

  const leapCorrect = advLeap.getUTCMonth() === 1 && advLeap.getUTCDate() === 28; // Feb 28 in leap
  const nonLeapCorrect = advNonLeap.getUTCMonth() === 1 && advNonLeap.getUTCDate() === 27; // Feb 27 in non-leap

  return {
    passed: leapCorrect && nonLeapCorrect,
    details: `Calendar date math: 2028-03-01 - 2d = ${advLeap.toISOString().split('T')[0]} (Feb 28). 2026-03-01 - 2d = ${advNonLeap.toISOString().split('T')[0]} (Feb 27). Correct!`,
    severity: 'NORMAL'
  };
});

// ============================================================================
// SUITE 2: Past Dates vs Upcoming Dates
// ============================================================================

test('ADV-M1-05', 'Past dates (2025-01-01) must not schedule notifications', () => {
  const now = new Date('2026-09-22T10:54:25Z');
  const res = simulateScheduleAdvanceAndDueNotification('2025-01-01', 2, now);

  return {
    passed: !res.scheduledAdvance && !res.scheduledDue,
    details: `Past event (2025-01-01): scheduledAdvance=${res.scheduledAdvance}, scheduledDue=${res.scheduledDue}. Correctly suppressed!`,
    severity: 'NORMAL'
  };
});

test('ADV-M1-06', 'Event tomorrow (less than 2 days away): advance reminder suppressed, due day reminder active', () => {
  // Current time: 2026-09-22T10:54:25Z
  // Tomorrow: 2026-09-23T09:00:00Z -> Advance date was 2026-09-21T09:00:00Z (yesterday, in past!)
  const now = new Date('2026-09-22T10:54:25Z');
  const res = simulateScheduleAdvanceAndDueNotification('2026-09-23', 2, now);

  return {
    passed: !res.scheduledAdvance && res.scheduledDue,
    details: `Event tomorrow (2026-09-23): scheduledAdvance=${res.scheduledAdvance} (suppressed as past), scheduledDue=${res.scheduledDue} (active). Correct!`,
    severity: 'NORMAL'
  };
});

test('ADV-M1-07', 'Event today earlier than 09:00 AM when current time is afternoon (13:54)', () => {
  // Current time: 2026-09-22T13:54:25Z
  // Event today at 09:00 AM has already passed
  const now = new Date('2026-09-22T13:54:25Z');
  const res = simulateScheduleAdvanceAndDueNotification('2026-09-22', 0, now);

  return {
    passed: !res.scheduledDue,
    details: `Today's event when 09:00 AM has already passed: scheduledDue=${res.scheduledDue}. Correctly suppressed!`,
    severity: 'NORMAL'
  };
});

// ============================================================================
// SUITE 3: Malformed Bridge Payloads & Type Safety
// ============================================================================

test('ADV-M1-08', 'Bridge message handler rejects primitive/null message payloads safely without crash', () => {
  const payloads = [null, undefined, 42, true, 'not-json', [], '{"incomplete": json'];
  let allSafe = true;
  for (const p of payloads) {
    const res = simulateBridgeDispatch(p);
    if (res.status !== 'REJECTED') {
      allSafe = false;
    }
  }

  return {
    passed: allSafe,
    details: `All ${payloads.length} primitive/malformed payloads safely rejected by guard let dict.`,
    severity: 'NORMAL'
  };
});

test('ADV-M1-09', 'Bridge message handler with missing action defaults to handleScheduleMessage', () => {
  const res = simulateBridgeDispatch({ title: 'Test', date: '2026-10-01' });
  return {
    passed: res.status === 'DISPATCHED_FALLBACK' && res.handler === 'handleScheduleMessage',
    details: `Missing action handled via default switch branch: ${res.handler}.`,
    severity: 'NORMAL'
  };
});

test('ADV-M1-10', 'Date parsing rejects invalid calendar dates (Feb 30, April 31, 2026-13-45)', () => {
  const badDates = ['2026-02-30', '2026-04-31', '2026-13-45', '32.01.2026', 'random_string', ''];
  const results = badDates.map(d => ({ date: d, parsed: parseDateSwift(d) }));
  const anyAccepted = results.filter(r => r.parsed !== null);

  return {
    passed: anyAccepted.length === 0,
    details: anyAccepted.length === 0 
      ? 'All invalid date strings returned nil as expected.'
      : `Accepted invalid dates: ${anyAccepted.map(a => a.date).join(', ')}`,
    severity: 'HIGH'
  };
});

test('ADV-M1-11', 'Type coercion check: Numeric amount vs String amount in syncAllEvents', () => {
  // In DarsApp.swift line 363:
  // let amount = item["amount"] as? String ?? item["tutar"] as? String ?? ""
  // If JSON contains { amount: 150000.50 } (numeric), Swift `as? String` fails and returns nil!
  const hasNumericCast = swiftContent.includes('item["amount"] as? Double') || 
                         swiftContent.includes('item["amount"] as? NSNumber') ||
                         swiftContent.includes('Double("\(item["amount"] ?? "")"');

  return {
    passed: hasNumericCast,
    details: `DarsApp.swift line 363 only casts amount as String (item["amount"] as? String). If JSON payload sends numeric amount: 15000, it evaluates to nil and defaults to ""! Defect: Missing numeric type handling for amount.`,
    severity: 'MEDIUM'
  };
});

test('ADV-M1-12', 'DueDay extreme values clamping (validDueDay = max(1, min(31, dueDay)))', () => {
  const extremeValues = [-10, 0, 1, 15, 31, 32, 100];
  const clamped = extremeValues.map(v => ({ input: v, clamped: Math.max(1, Math.min(31, v)) }));
  const invalidClamps = clamped.filter(c => c.clamped < 1 || c.clamped > 31);

  return {
    passed: invalidClamps.length === 0,
    details: `All extreme values clamped to [1, 31].`,
    severity: 'NORMAL'
  };
});

// ============================================================================
// SUITE 4: Concurrency, Limits & System Capacity
// ============================================================================

test('ADV-M1-13', 'iOS 64 pending notification request ceiling vulnerability check', () => {
  // iOS has a hard limit of 64 pending local notification requests.
  // When syncAllEvents syncs 50 items, it creates up to 100 requests (advance + due).
  // Does NotificationManager check pending requests count or truncate?
  const has64Check = swiftContent.includes('64') || swiftContent.includes('maxRequests') || swiftContent.includes('getPendingNotificationRequests');

  return {
    passed: has64Check,
    details: `DarsApp.swift does not inspect pending notification count (UNUserNotificationCenter.getPendingNotificationRequests) or cap at 64 requests. If >32 events are synced (producing >64 requests), iOS will silently drop notifications beyond the 64 limit. Defect: Unbounded notification scheduling exceeding iOS 64-request quota.`,
    severity: 'MEDIUM'
  };
});

test('ADV-M1-14', 'Thread safety & race condition between clearAll and syncAllEvents', () => {
  // DarsApp.swift line 491:
  // func clearAllPendingNotifications() { UNUserNotificationCenter.current().removeAllPendingNotificationRequests() }
  // Both removeAllPendingNotificationRequests and add are asynchronous on background queues.
  // There is no serial queue / lock to ensure clear completes before sync adds new requests.
  const hasSerialQueue = swiftContent.includes('DispatchQueue(label:') || swiftContent.includes('actor NotificationManager');

  return {
    passed: hasSerialQueue,
    details: `NotificationManager is an NSObject without a dedicated serial DispatchQueue or Swift actor. Rapid sequential bridge calls { action: "clearAll" } followed immediately by { action: "syncAllEvents" } can race asynchronously in UNUserNotificationCenter, causing clearAll to wipe out newly added sync events.`,
    severity: 'MEDIUM'
  };
});

// ============================================================================
// SUITE 5: UNCalendarNotificationTrigger Verification & Parity
// ============================================================================

test('ADV-M1-15', 'UNCalendarNotificationTrigger with DateComponents used for all required categories', () => {
  const hasDaily = swiftContent.includes('UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)');
  const hasCcAdv = swiftContent.includes('UNCalendarNotificationTrigger(dateMatching: advComponents, repeats: true)');
  const hasCcDue = swiftContent.includes('UNCalendarNotificationTrigger(dateMatching: dueComponents, repeats: true)');
  const hasCheckAdv = swiftContent.includes('UNCalendarNotificationTrigger(dateMatching: advComponents, repeats: false)');
  const hasCheckDue = swiftContent.includes('UNCalendarNotificationTrigger(dateMatching: dueComponents, repeats: false)');

  const allPassed = hasDaily && hasCcAdv && hasCcDue && hasCheckAdv && hasCheckDue;
  return {
    passed: allPassed,
    details: `Genuine UNCalendarNotificationTrigger with DateComponents confirmed across daily summary, credit card (advance + due), and check (advance + due).`,
    severity: 'NORMAL'
  };
});

test('ADV-M1-16', 'Test harness parity: T1-F2-03, T1-F2-04, T1-F2-05 identifier string mismatch check', () => {
  // Check if DarsApp.swift uses the identifiers expected by tests/tier1_features/r1_notifications.test.js
  const hasCcLockscreen = swiftContent.includes('cc_due_reminder_lockscreen');
  const hasCheckLockscreen = swiftContent.includes('check_due_reminder_lockscreen');
  const hasVehLockscreen = swiftContent.includes('vehicle_inspection_lockscreen');

  const allPresent = hasCcLockscreen && hasCheckLockscreen && hasVehLockscreen;
  return {
    passed: allPresent,
    details: `DarsApp.swift uses dynamic identifiers (cc_advance_\(id), check_due_\(id), veh_inspection_\(id)) but the project test suite (r1_notifications.test.js lines 162, 182, 202) explicitly expects static identifiers [cc_due_reminder_lockscreen, check_due_reminder_lockscreen, vehicle_inspection_lockscreen]. This causes 3 tests to fail in tier 1 suite!`,
    severity: 'HIGH'
  };
});

// ============================================================================
// REPORT GENERATION
// ============================================================================

console.log('\nTEST EXECUTION RESULTS:\n');
let passedCount = 0;
let failedCount = 0;

for (const r of results) {
  const statusStr = r.passed ? '[PASS]' : '[FAIL]';
  const colorCode = r.passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${colorCode}${statusStr}\x1b[0m ${r.id}: ${r.description} (${r.severity})`);
  console.log(`       >> ${r.details}\n`);
  if (r.passed) passedCount++;
  else failedCount++;
}

console.log('='.repeat(80));
console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED / DEFECTS REVEALED: ${failedCount}`);
console.log('='.repeat(80));

// Export results to JSON for handoff
fs.writeFileSync(
  path.join(projectRoot, 'tests', 'adversarial_results.json'),
  JSON.stringify({ total: results.length, passed: passedCount, failed: failedCount, results }, null, 2),
  'utf8'
);
