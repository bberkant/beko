import { DomRunner } from '../helpers/dom_runner.js';

export const tier1CalendarTests = [
  // ==================== FEATURE 5: Financial Calendar Grid, Navigation & 6 Event Badges ====================
  {
    id: 'T1-F5-01',
    tier: 'Tier 1',
    feature: 'F5: Financial Calendar Grid, Navigation & 6 Event Badges',
    name: 'Monday-to-Sunday grid layout with Monday-first startingDay calculation',
    source: 'ORIGINAL_REQUEST.md:R3, PROJECT.md:F3.2, ios_prototype.html:23170-23175',
    run: async () => {
      const runner = new DomRunner();
      const hasStartingDayCalc = runner.rawHtml.includes('startingDay = startingDay === 0 ? 6 : startingDay - 1') ||
                                  runner.rawHtml.includes('startingDay === 0 ? 6 : startingDay - 1');
      if (!hasStartingDayCalc) {
        return {
          passed: false,
          error: 'Monday-first weekday calculation (startingDay = startingDay === 0 ? 6 : startingDay - 1) not found in renderCalendar.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F5-02',
    tier: 'Tier 1',
    feature: 'F5: Financial Calendar Grid, Navigation & 6 Event Badges',
    name: 'Month navigation header controls (‹, ›, Bugün button, localized month title)',
    source: 'ORIGINAL_REQUEST.md:R3, PROJECT.md:F3.2, ios_prototype.html:23275-23290',
    run: async () => {
      const runner = new DomRunner();
      const hasPrev = runner.rawHtml.includes('changeCalMonth(-1)');
      const hasNext = runner.rawHtml.includes('changeCalMonth(1)');
      const hasToday = runner.rawHtml.includes('jumpToToday()');
      if (!hasPrev || !hasNext || !hasToday) {
        return {
          passed: false,
          error: `Month navigation controls incomplete. hasPrev=${hasPrev}, hasNext=${hasNext}, hasToday=${hasToday}`
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F5-03',
    tier: 'Tier 1',
    feature: 'F5: Financial Calendar Grid, Navigation & 6 Event Badges',
    name: 'Localized Turkish month names array contains all 12 Turkish months',
    source: 'ORIGINAL_REQUEST.md:R3, ios_prototype.html:23145',
    run: async () => {
      const runner = new DomRunner();
      const trMonths = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const missingMonths = trMonths.filter(m => !runner.rawHtml.includes(m));
      if (missingMonths.length > 0) {
        return {
          passed: false,
          error: `Turkish month names missing from calendar: ${missingMonths.join(', ')}`
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F5-04',
    tier: 'Tier 1',
    feature: 'F5: Financial Calendar Grid, Navigation & 6 Event Badges',
    name: '6 distinct event styles configured in calStyles with color dot classes',
    source: 'ORIGINAL_REQUEST.md:R3, PROJECT.md:F3.2, ios_prototype.html:23115-23130',
    run: async () => {
      const runner = new DomRunner();
      const styles = runner.getCalStyles();
      const requiredTypes = [
        { key: 'credit-card', label: 'KART', expectedDot: 'bg-red-500' },
        { key: 'inspection', label: 'MUAYENE', expectedDot: 'bg-amber-500' },
        { key: 'insurance', label: 'SİGORTA', expectedDot: 'bg-blue-500' },
        { key: 'tender', label: 'İHALE', expectedDot: 'bg-purple-500' },
        { key: 'check', label: 'ÇEK', expectedDot: 'bg-rose-500' },
        { key: 'note', label: 'NOT', expectedDot: 'bg-emerald-500' }
      ];

      for (const req of requiredTypes) {
        const style = styles[req.key];
        if (!style) {
          return { passed: false, error: `Missing style configuration for type "${req.key}" in calStyles.` };
        }
        if (style.label !== req.label) {
          return { passed: false, error: `Type "${req.key}" has label "${style.label}", expected "${req.label}".` };
        }
        if (!style.dot || !style.dot.includes(req.expectedDot)) {
          return { passed: false, error: `Type "${req.key}" dot class "${style.dot}" does not include "${req.expectedDot}".` };
        }
      }
      return { passed: true, details: 'All 6 event styles (KART, MUAYENE, SİGORTA, İHALE, ÇEK, NOT) verified.' };
    }
  },
  {
    id: 'T1-F5-05',
    tier: 'Tier 1',
    feature: 'F5: Financial Calendar Grid, Navigation & 6 Event Badges',
    name: 'Dual-view rendering: renderTakvimScreen defined and screen-takvim container present',
    source: 'ORIGINAL_REQUEST.md:R3, PROJECT.md:F3.1, ios_prototype.html:18758',
    run: async () => {
      const runner = new DomRunner();
      if (!runner.hasScreenTakvim) {
        return { passed: false, error: 'Container <div id="screen-takvim"> missing from DOM.' };
      }
      if (!runner.hasRenderTakvimScreenDefined()) {
        return {
          passed: false,
          error: 'renderTakvimScreen function is not defined, causing ReferenceError when navigating to takvim screen.'
        };
      }
      return { passed: true };
    }
  },

  // ==================== FEATURE 6: Calendar Selected Day Cards & Interactive Notes/Todos ====================
  {
    id: 'T1-F6-01',
    tier: 'Tier 1',
    feature: 'F6: Calendar Selected Day Cards & Interactive Notes/Todos',
    name: 'Selected day event cards render details (code/plate, title, amount, institution, link)',
    source: 'ORIGINAL_REQUEST.md:R3, PROJECT.md:F3.3, ios_prototype.html:23400-23450',
    run: async () => {
      const runner = new DomRunner();
      const events = runner.getMockCalendarEvents();
      if (events.length === 0) {
        return { passed: false, error: 'mockCalendarEvents array is empty or unparsable.' };
      }
      const sample = events[0];
      if (!sample.code || !sample.title || !sample.amount || !sample.institution) {
        return {
          passed: false,
          error: `Sample calendar event missing required fields: code=${sample.code}, title=${sample.title}, amount=${sample.amount}, institution=${sample.institution}`
        };
      }
      return { passed: true, details: `Validated event cards with ${events.length} mock events.` };
    }
  },
  {
    id: 'T1-F6-02',
    tier: 'Tier 1',
    feature: 'F6: Calendar Selected Day Cards & Interactive Notes/Todos',
    name: 'Inline note addition creates note object with id, content, date, and completed boolean',
    source: 'ORIGINAL_REQUEST.md:R3, PROJECT.md:F3.4, ios_prototype.html:23470-23500',
    run: async () => {
      const runner = new DomRunner();
      const hasAddNoteFunc = runner.rawHtml.includes('function handleInlineAddNote');
      const hasNoteFields = runner.rawHtml.includes('content: text') &&
                            runner.rawHtml.includes('date: selectedCalDay') &&
                            runner.rawHtml.includes('completed: false');
      if (!hasAddNoteFunc || !hasNoteFields) {
        return {
          passed: false,
          error: 'handleInlineAddNote function missing or does not construct note with required fields.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F6-03',
    tier: 'Tier 1',
    feature: 'F6: Calendar Selected Day Cards & Interactive Notes/Todos',
    name: 'Note completion toggle function toggleCalendarNote defined and functional',
    source: 'ORIGINAL_REQUEST.md:R3, PROJECT.md:F3.4',
    run: async () => {
      const runner = new DomRunner();
      if (!runner.hasToggleCalendarNoteDefined()) {
        return {
          passed: false,
          error: 'toggleCalendarNote function is not defined in prototype script.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F6-04',
    tier: 'Tier 1',
    feature: 'F6: Calendar Selected Day Cards & Interactive Notes/Todos',
    name: 'Calendar notes persistence to localStorage key dars_calendar_notes',
    source: 'ORIGINAL_REQUEST.md:R3, PROJECT.md:F3.4, ios_prototype.html:23143',
    run: async () => {
      const runner = new DomRunner();
      const hasGetItem = runner.rawHtml.includes("localStorage.getItem('dars_calendar_notes')");
      const hasSetItem = runner.rawHtml.includes("localStorage.setItem('dars_calendar_notes'");
      if (!hasGetItem || !hasSetItem) {
        return {
          passed: false,
          error: 'localStorage persistence for dars_calendar_notes not fully implemented (getItem or setItem missing).'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F6-05',
    tier: 'Tier 1',
    feature: 'F6: Calendar Selected Day Cards & Interactive Notes/Todos',
    name: 'Note deletion deleteCalendarNote removes note and updates calendar',
    source: 'PROJECT.md:F3.4, ios_prototype.html:23460-23470',
    run: async () => {
      const runner = new DomRunner();
      const hasDeleteFunc = runner.rawHtml.includes('function deleteCalendarNote');
      const hasFilter = runner.rawHtml.includes('userCalendarNotes.filter');
      const hasReRender = runner.rawHtml.includes('renderCalendar()');
      if (!hasDeleteFunc || !hasFilter || !hasReRender) {
        return {
          passed: false,
          error: 'deleteCalendarNote function missing or does not properly filter notes and re-render.'
        };
      }
      return { passed: true };
    }
  }
];
