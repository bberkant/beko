import { DomRunner } from '../helpers/dom_runner.js';
import { SwiftParser } from '../helpers/swift_parser.js';
import { IntegrityChecker } from '../helpers/integrity.js';

export const tier4RealWorldScenarios = [
  // ==================== SCENARIO 1: End-to-end Payment Reminder Workflow ====================
  {
    id: 'T4-SCEN-01',
    tier: 'Tier 4',
    feature: 'Real-World Scenario 1: End-to-End Payment Reminder Workflow',
    name: 'Credit card due date -> calendar red dot -> event card -> native notification trigger pipeline',
    source: 'ORIGINAL_REQUEST.md:R1, R3, TEST_INFRA.md:Tier 4 Scenario 1',
    run: async () => {
      const runner = new DomRunner();
      const parser = new SwiftParser();

      // Step 1: Check credit card events in mock calendar
      const events = runner.getMockCalendarEvents();
      const ccEvents = events.filter(e => e.type === 'credit-card');
      if (ccEvents.length === 0) {
        return { passed: false, error: 'Step 1 Failed: No credit-card events found in mock calendar dataset.' };
      }

      // Step 2: Check calendar red dot style configured
      const styles = runner.getCalStyles();
      const ccStyle = styles['credit-card'];
      if (!ccStyle || !ccStyle.dot.includes('bg-red-500') || ccStyle.label !== 'KART') {
        return { passed: false, error: 'Step 2 Failed: calStyles credit-card not configured with red dot (bg-red-500) and KART label.' };
      }

      // Step 3: Check event card contains amount, institution, and quick navigation
      const sample = ccEvents[0];
      if (!sample.amount || !sample.institution || !sample.to) {
        return { passed: false, error: 'Step 3 Failed: Credit card event card missing amount, institution, or destination link.' };
      }

      // Step 4: Check native notification trigger implementation
      if (!parser.exists()) {
        return { passed: false, error: 'Step 4 Failed: DarsApp.swift native file missing.' };
      }
      if (parser.hasSyntaxErrorAtMinuteParam()) {
        return { passed: false, error: 'Step 4 Failed: Swift syntax error in DarsApp.swift:28 prevents notification execution.' };
      }
      if (parser.hasProvisionalPermission()) {
        return { passed: false, error: 'Step 4 Failed: Lock screen permission has .provisional, suppressing payment alert banners.' };
      }
      if (!parser.usesUNCalendarNotificationTrigger()) {
        return { passed: false, error: 'Step 4 Failed: UNCalendarNotificationTrigger missing for scheduled alerts.' };
      }

      return {
        passed: true,
        details: 'Workflow passed: Verified CC calendar event, red dot badge, card amount, and native notification pipeline.'
      };
    }
  },

  // ==================== SCENARIO 2: Vehicle Fleet Inspection Workflow ====================
  {
    id: 'T4-SCEN-02',
    tier: 'Tier 4',
    feature: 'Real-World Scenario 2: Vehicle Fleet Inspection Workflow',
    name: 'Inspection deadline date -> amber badge -> 2-day advance alert -> vehicle navigation link',
    source: 'ORIGINAL_REQUEST.md:R1, R2, R3, TEST_INFRA.md:Tier 4 Scenario 2',
    run: async () => {
      const runner = new DomRunner();
      const parser = new SwiftParser();

      // Step 1: Locate vehicle inspection event (e.g. Mercedes Sprinter 55 AET 412)
      const events = runner.getMockCalendarEvents();
      const inspectionEvents = events.filter(e => e.type === 'inspection');
      if (inspectionEvents.length === 0) {
        return { passed: false, error: 'Step 1 Failed: No inspection events found in calendar data.' };
      }

      // Step 2: Verify amber dot style (bg-amber-500 and MUAYENE label)
      const styles = runner.getCalStyles();
      const inspStyle = styles['inspection'];
      if (!inspStyle || !inspStyle.dot.includes('bg-amber-500') || inspStyle.label !== 'MUAYENE') {
        return { passed: false, error: 'Step 2 Failed: calStyles inspection not configured with amber dot and MUAYENE label.' };
      }

      // Step 3: Verify destination screen is vehicles
      const targetVehicleScreen = inspectionEvents[0].to;
      if (targetVehicleScreen !== 'vehicles') {
        return { passed: false, error: `Step 3 Failed: Expected inspection to navigate to "vehicles", got "${targetVehicleScreen}".` };
      }
      if (!runner.screenIds.includes('screen-vehicles')) {
        return { passed: false, error: 'Step 3 Failed: screen-vehicles container does not exist in DOM.' };
      }

      // Step 4: Verify native vehicle inspection reminder in Swift
      if (!parser.exists()) return { passed: false, error: 'Step 4 Failed: DarsApp.swift not found.' };
      const swiftContent = parser.getContent();
      if (!swiftContent.includes('vehicle_inspection_lockscreen') || !swiftContent.includes('🚗 Araç Muayene & Sigorta Takibi')) {
        return { passed: false, error: 'Step 4 Failed: vehicle_inspection_lockscreen notification not configured in Swift.' };
      }

      return {
        passed: true,
        details: 'Workflow passed: Verified vehicle inspection event, amber badge, vehicle screen target, and lock screen alert.'
      };
    }
  },

  // ==================== SCENARIO 3: Menu Search & Accordion Navigation Workflow ====================
  {
    id: 'T4-SCEN-03',
    tier: 'Tier 4',
    feature: 'Real-World Scenario 3: Menu Search & Accordion Navigation Workflow',
    name: 'Search "Çek" -> accordion auto-expand -> active state highlight -> route switch to checks',
    source: 'ORIGINAL_REQUEST.md:R2, TEST_INFRA.md:Tier 4 Scenario 3',
    run: async () => {
      const runner = new DomRunner();

      // Step 1: Verify screen-menu container exists
      if (!runner.hasScreenMenu) {
        return { passed: false, error: 'Step 1 Failed: Container <div id="screen-menu"> missing from DOM.' };
      }

      // Step 2: Search for 'Çek' and verify auto-expand logic
      const matched = runner.simulateFilterMenu('çek');
      const ceklerMod = matched.find(m => m.id === 'cekler');
      if (!ceklerMod) {
        return { passed: false, error: 'Step 2 Failed: Search query "çek" did not match "cekler" module.' };
      }
      if (!ceklerMod.children || ceklerMod.children.length === 0) {
        return { passed: false, error: 'Step 2 Failed: "cekler" module has no child routes.' };
      }

      // Step 3: Check accordion auto-expand rule
      const hasAutoExpand = runner.rawHtml.includes('const isOpen = openAccordions.has(m.id) || (q.length > 0 && hasChildren)');
      if (!hasAutoExpand) {
        return { passed: false, error: 'Step 3 Failed: Menu does not auto-expand matching accordion on non-empty query.' };
      }

      // Step 4: Verify target screen for Çek & Senet Listesi (screen-checks)
      const checksChild = ceklerMod.children.find(c => c.label.includes('Çek & Senet Listesi') || c.screen === 'checks');
      if (!checksChild) {
        return { passed: false, error: 'Step 4 Failed: Çek & Senet Listesi child route not found in cekler module.' };
      }
      if (!runner.screenIds.includes('screen-' + checksChild.screen)) {
        return { passed: false, error: `Step 4 Failed: Target container screen-${checksChild.screen} missing from DOM.` };
      }

      return {
        passed: true,
        details: 'Workflow passed: Search query matched, accordion auto-expanded, child route resolved to active screen container.'
      };
    }
  },

  // ==================== SCENARIO 4: Calendar Todo Lifecycle Workflow ====================
  {
    id: 'T4-SCEN-04',
    tier: 'Tier 4',
    feature: 'Real-World Scenario 4: Calendar Todo Lifecycle Workflow',
    name: 'Add note for day -> persistent storage -> toggle completed -> calendar emerald dot update',
    source: 'ORIGINAL_REQUEST.md:R3, PROJECT.md:F3.4, TEST_INFRA.md:Tier 4 Scenario 4',
    run: async () => {
      const runner = new DomRunner();

      // Step 1: Verify note addition logic
      const hasAddLogic = runner.rawHtml.includes('function handleInlineAddNote') &&
                          runner.rawHtml.includes('localStorage.setItem(\'dars_calendar_notes\'');
      if (!hasAddLogic) {
        return { passed: false, error: 'Step 1 Failed: handleInlineAddNote function or storage persistence missing.' };
      }

      // Step 2: Verify note completion toggle function
      if (!runner.hasToggleCalendarNoteDefined()) {
        return {
          passed: false,
          error: 'Step 2 Failed: toggleCalendarNote function missing from prototype script (F3.4).'
        };
      }

      // Step 3: Simulate note lifecycle
      let notes = [];
      const newNote = { id: 'note-lifecycle-1', content: 'Kasa sayımı tamamlanacak', date: '2026-09-22', completed: false };
      notes.push(newNote);

      // Toggle completion
      notes = runner.simulateToggleCalendarNote(notes, 'note-lifecycle-1');
      if (!notes[0].completed) {
        return { passed: false, error: 'Step 3 Failed: Note completed flag was not set to true after toggle.' };
      }

      // Step 4: Verify calendar emerald dot style
      const styles = runner.getCalStyles();
      if (!styles.note || !styles.note.dot.includes('bg-emerald-500')) {
        return { passed: false, error: 'Step 4 Failed: calStyles.note dot is not configured with bg-emerald-500.' };
      }

      return {
        passed: true,
        details: 'Workflow passed: Note created, persisted, completed state toggled, and emerald calendar dot verified.'
      };
    }
  },

  // ==================== SCENARIO 5: Clean Build & Deployment Pipeline Workflow ====================
  {
    id: 'T4-SCEN-05',
    tier: 'Tier 4',
    feature: 'Real-World Scenario 5: Clean Build & Deployment Pipeline Workflow',
    name: 'V8 syntax check -> backup hash check -> build bump -> TestFlight deployment ready',
    source: 'ORIGINAL_REQUEST.md:R4, PROJECT.md:M4, TEST_INFRA.md:Tier 4 Scenario 5',
    run: async () => {
      // Step 1: V8 syntax check across prototype
      const runner = new DomRunner('ios_prototype.html');
      const v8Results = runner.validateAllScriptsV8();
      const v8Failed = v8Results.filter(r => !r.valid);
      if (v8Failed.length > 0) {
        return { passed: false, error: `Step 1 Failed: V8 syntax error in prototype scripts: ${v8Failed.map(f => f.error).join(', ')}` };
      }

      // Step 2: Backup hash verification
      const backupResult = IntegrityChecker.verifyBackupIntegrity('A80F8D5A9012CDD5A5B1F33E3965D3728BAF3FD3FE91218E7BD895F15324BDE4');
      if (!backupResult.valid) {
        return { passed: false, error: `Step 2 Failed: Master backup SHA256 integrity failed. Actual: ${backupResult.actual}` };
      }

      // Step 3: Build version check in ios/project.yml
      const projectParsed = IntegrityChecker.parseProjectYml('ios/project.yml');
      if (!projectParsed) {
        return { passed: false, error: 'Step 3 Failed: ios/project.yml not found.' };
      }
      if (!projectParsed.currentProjectVersion || projectParsed.currentProjectVersion < 52) {
        return { passed: false, error: `Step 3 Failed: CURRENT_PROJECT_VERSION ${projectParsed.currentProjectVersion} is below baseline 52.` };
      }

      // Step 4: GitHub Actions TestFlight workflow
      const workflow = IntegrityChecker.parseWorkflow('.github/workflows/deploy_testflight.yml');
      if (!workflow || !workflow.hasFastlaneStep || !workflow.hasXcodeGenStep) {
        return { passed: false, error: 'Step 4 Failed: TestFlight workflow missing required CI deployment steps.' };
      }

      return {
        passed: true,
        details: `Workflow passed: V8 validated (${v8Results.length} scripts), backup SHA256 verified, build version ${projectParsed.currentProjectVersion} confirmed, CI/CD pipeline ready.`
      };
    }
  }
];
