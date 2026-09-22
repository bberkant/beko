import fs from 'fs';
import path from 'path';

/**
 * Swift AST / Regex Analyzer for DarsApp.swift
 */
export class SwiftParser {
  constructor(filePath = 'ios/dars-ios/App/DarsApp.swift') {
    this.filePath = path.resolve(filePath);
    this.content = fs.existsSync(this.filePath) ? fs.readFileSync(this.filePath, 'utf8') : '';
    this.lines = this.content.split('\n');
  }

  exists() {
    return fs.existsSync(this.filePath);
  }

  getContent() {
    return this.content;
  }

  getLines() {
    return this.lines;
  }

  /**
   * Checks Swift compiler syntax issues:
   * e.g., func scheduleDailyMorningSummary(hour: Int = 9, minute: 0) missing type
   */
  hasSyntaxErrorAtMinuteParam() {
    // Matches invalid 'minute: 0' without 'Int ='
    return /func\s+scheduleDailyMorningSummary\s*\([^)]*minute:\s*0[^)]*\)/.test(this.content);
  }

  hasValidMinuteParamSyntax() {
    // Valid Swift parameter declaration: minute: Int = 0
    return /func\s+scheduleDailyMorningSummary\s*\([^)]*minute:\s*Int\s*=\s*0[^)]*\)/.test(this.content);
  }

  /**
   * Permission options verification
   */
  getAuthorizationOptions() {
    const match = this.content.match(/requestAuthorization\s*\(\s*options\s*:\s*\[([^\]]+)\]/);
    if (!match) return [];
    return match[1].split(',').map(s => s.trim());
  }

  hasProvisionalPermission() {
    const options = this.getAuthorizationOptions();
    return options.some(opt => opt.includes('.provisional'));
  }

  hasRequiredLockScreenPermissions() {
    const options = this.getAuthorizationOptions();
    const hasAlert = options.some(opt => opt.includes('.alert'));
    const hasBadge = options.some(opt => opt.includes('.badge'));
    const hasSound = options.some(opt => opt.includes('.sound'));
    return hasAlert && hasBadge && hasSound;
  }

  /**
   * Trigger verification
   */
  usesUNCalendarNotificationTrigger() {
    return this.content.includes('UNCalendarNotificationTrigger');
  }

  hasDailyMorningSummaryTrigger() {
    return (
      this.content.includes('daily_financial_morning_summary') &&
      this.content.includes('dateComponents.hour = hour') &&
      this.content.includes('dateComponents.minute = minute') &&
      this.content.includes('UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)')
    );
  }

  /**
   * WebKit Script Message Handler verification
   */
  hasWebKitMessageHandler(name = 'darsNotification') {
    return this.content.includes(`contentController.add(context.coordinator, name: "${name}")`);
  }

  handlesSyncAllEvents() {
    return (
      this.content.includes('syncAllEvents') ||
      (this.content.includes('userContentController') && this.content.includes('"action"') && this.content.includes('syncAllEvents'))
    );
  }

  hasForegroundPresentationOptions() {
    // UNNotificationPresentationOptions in willPresent
    const match = this.content.match(/willPresent[\s\S]*?completionHandler\s*\(\s*\[([^\]]+)\]\s*\)/);
    if (!match) return false;
    const opts = match[1];
    return opts.includes('.banner') && opts.includes('.badge') && opts.includes('.sound');
  }

  /**
   * Structural syntax check: Balanced braces and parenthetical blocks
   */
  hasBalancedBraces() {
    let braceCount = 0;
    let parenCount = 0;
    for (const char of this.content) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (braceCount < 0 || parenCount < 0) return false;
    }
    return braceCount === 0 && parenCount === 0;
  }
}
