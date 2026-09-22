import { DomRunner } from '../helpers/dom_runner.js';

export const tier2NavigationBoundaries = [
  // ==================== FEATURE 3 BOUNDARIES: Navigation 23 Modules & 51 Sub-Routes ====================
  {
    id: 'T2-F3-01',
    tier: 'Tier 2',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules (Boundary)',
    name: 'Navigating to undefined screen ID handles missing element gracefully without uncaught error',
    source: 'TEST_INFRA.md:Tier 2, ios_prototype.html:18684-18687',
    run: async () => {
      const runner = new DomRunner();
      // Inspect changeScreen implementation
      const hasNullCheck = runner.rawHtml.includes('const targetEl = document.getElementById(\'screen-\' + screenId);') &&
                           runner.rawHtml.includes('if (targetEl)');
      if (!hasNullCheck) {
        return {
          passed: false,
          error: 'changeScreen does not check if targetEl exists before accessing classList, risking NullPointerException on undefined routes.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T2-F3-02',
    tier: 'Tier 2',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules (Boundary)',
    name: 'Module with 0 children navigates directly to screenTarget without accordion toggle',
    source: 'TEST_INFRA.md:Tier 2, ios_prototype.html:18492',
    run: async () => {
      const runner = new DomRunner();
      const modules = runner.getNavModules();
      const singleModules = modules.filter(m => !m.children || m.children.length === 0);
      if (singleModules.length === 0) {
        return { passed: false, error: 'No standalone modules found in darsNavModules.' };
      }
      // Check that standalone modules have screenTarget defined
      const missingTargets = singleModules.filter(m => !m.screenTarget);
      if (missingTargets.length > 0) {
        return {
          passed: false,
          error: `Standalone modules missing screenTarget: ${missingTargets.map(m => m.id).join(', ')}`
        };
      }
      return { passed: true, details: `Validated ${singleModules.length} standalone modules with direct screenTargets.` };
    }
  },
  {
    id: 'T2-F3-03',
    tier: 'Tier 2',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules (Boundary)',
    name: 'Module with maximum children (araclar, subeler with 6 children) have valid child screens',
    source: 'TEST_INFRA.md:Tier 2, src/types/navigation.ts',
    run: async () => {
      const runner = new DomRunner();
      const modules = runner.getNavModules();
      const araclar = modules.find(m => m.id === 'araclar');
      const subeler = modules.find(m => m.id === 'subeler');

      if (!araclar || !araclar.children || araclar.children.length !== 6) {
        return { passed: false, error: `Expected araclar to have exactly 6 children, got ${araclar?.children?.length}.` };
      }
      if (!subeler || !subeler.children || subeler.children.length !== 6) {
        return { passed: false, error: `Expected subeler to have exactly 6 children, got ${subeler?.children?.length}.` };
      }

      // Check all children have screens
      const invalidAracChildren = araclar.children.filter(c => !c.screen);
      if (invalidAracChildren.length > 0) {
        return { passed: false, error: 'Some araclar children lack screen target.' };
      }

      return { passed: true, details: 'Verified 6 children for araclar and subeler.' };
    }
  },
  {
    id: 'T2-F3-04',
    tier: 'Tier 2',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules (Boundary)',
    name: 'Module route identifiers with hyphens and underscores resolve cleanly',
    source: 'TEST_INFRA.md:Tier 2',
    run: async () => {
      const runner = new DomRunner();
      const modules = runner.getNavModules();
      const allScreens = [];
      modules.forEach(m => {
        if (m.screenTarget) allScreens.push(m.screenTarget);
        if (m.children) m.children.forEach(c => allScreens.push(c.screen));
      });

      const complexRoutes = allScreens.filter(s => s.includes('_') || s.includes('-'));
      if (complexRoutes.length === 0) {
        return { passed: false, error: 'No routes with hyphens or underscores found.' };
      }

      // Ensure no route contains invalid characters
      const invalidChars = allScreens.filter(s => /[^a-zA-Z0-9_\-]/.test(s));
      if (invalidChars.length > 0) {
        return { passed: false, error: `Found routes with invalid characters: ${invalidChars.join(', ')}` };
      }

      return { passed: true, details: `Validated ${complexRoutes.length} hyphenated/underscored routes.` };
    }
  },
  {
    id: 'T2-F3-05',
    tier: 'Tier 2',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules (Boundary)',
    name: 'Missing container navigation targets (bills, findeks, reporting, cashbox) check',
    source: 'PROJECT.md:F2.2, F2.3',
    run: async () => {
      const runner = new DomRunner();
      const missingContainers = [];
      const required = ['bills', 'findeks', 'reporting', 'cashbox', 'branches', 'legal_cases', 'ayarlar'];

      required.forEach(screen => {
        if (!runner.screenIds.includes('screen-' + screen)) {
          missingContainers.push('screen-' + screen);
        }
      });

      if (missingContainers.length > 0) {
        return {
          passed: false,
          error: `Required screen containers missing from DOM: ${missingContainers.join(', ')}`
        };
      }
      return { passed: true };
    }
  },

  // ==================== FEATURE 4 BOUNDARIES: Menu Accordion & Search ====================
  {
    id: 'T2-F4-01',
    tier: 'Tier 2',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search (Boundary)',
    name: 'Turkish uppercase dotted/dotless I search normalization (i vs İ, ı vs I)',
    source: 'TEST_INFRA.md:Tier 2, User Rule: turkish char integrity',
    run: async () => {
      const runner = new DomRunner();
      // Search with Turkish capital 'İhaleler' vs lowercase 'ihaleler'
      const matchUpper = runner.simulateFilterMenuTurkish('İHALE');
      const matchLower = runner.simulateFilterMenuTurkish('ihale');

      if (matchUpper.length === 0 || matchLower.length === 0) {
        return {
          passed: false,
          error: `Turkish case search failed: upper=${matchUpper.length} matches, lower=${matchLower.length} matches.`
        };
      }
      if (matchUpper.length !== matchLower.length) {
        return {
          passed: false,
          error: `Discrepancy in Turkish search: 'İHALE' matched ${matchUpper.length}, 'ihale' matched ${matchLower.length}.`
        };
      }
      return { passed: true, details: `Identical matches (${matchUpper.length}) for both upper and lower Turkish queries.` };
    }
  },
  {
    id: 'T2-F4-02',
    tier: 'Tier 2',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search (Boundary)',
    name: 'Regex meta-characters in search query ([*+?\\]) do not throw regex syntax error',
    source: 'TEST_INFRA.md:Tier 2',
    run: async () => {
      const runner = new DomRunner();
      try {
        // Test query containing raw regex symbols
        const res = runner.simulateFilterMenu('[test*+?^$()');
        return { passed: true, details: `Safe query handling returned ${res.length} matches.` };
      } catch (err) {
        return {
          passed: false,
          error: `Regex error during search query filtering: ${err.message}`
        };
      }
    }
  },
  {
    id: 'T2-F4-03',
    tier: 'Tier 2',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search (Boundary)',
    name: 'Search query with no matching modules renders empty result array gracefully',
    source: 'TEST_INFRA.md:Tier 2',
    run: async () => {
      const runner = new DomRunner();
      const res = runner.simulateFilterMenu('XYZ_NON_EXISTENT_QUERY_9999');
      if (res.length !== 0) {
        return { passed: false, error: `Expected 0 matches for nonsense query, got ${res.length}.` };
      }
      return { passed: true };
    }
  },
  {
    id: 'T2-F4-04',
    tier: 'Tier 2',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search (Boundary)',
    name: 'Extremely long search query (500+ characters) processes safely without stack overflow',
    source: 'TEST_INFRA.md:Tier 2',
    run: async () => {
      const runner = new DomRunner();
      const longQuery = 'A'.repeat(500);
      try {
        const res = runner.simulateFilterMenu(longQuery);
        if (res.length !== 0) {
          return { passed: false, error: 'Expected 0 matches for 500-char query.' };
        }
        return { passed: true };
      } catch (err) {
        return { passed: false, error: `Crash on 500-character search query: ${err.message}` };
      }
    }
  },
  {
    id: 'T2-F4-05',
    tier: 'Tier 2',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search (Boundary)',
    name: 'Rapid accordion toggle sequence (opening and closing same accordion) preserves Set consistency',
    source: 'TEST_INFRA.md:Tier 2',
    run: async () => {
      const runner = new DomRunner();
      let openSet = new Set();
      for (let i = 0; i < 10; i++) {
        openSet = runner.simulateToggleAccordion(openSet, 'cekler');
      }
      // After even number (10) of toggles, it should be closed
      if (openSet.has('cekler')) {
        return { passed: false, error: 'Accordion should be closed after 10 toggles, but remained open.' };
      }
      // Toggle once more -> should be open
      openSet = runner.simulateToggleAccordion(openSet, 'cekler');
      if (!openSet.has('cekler')) {
        return { passed: false, error: 'Accordion should be open after 11 toggles, but was closed.' };
      }
      return { passed: true };
    }
  }
];
