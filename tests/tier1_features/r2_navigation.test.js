import { DomRunner } from '../helpers/dom_runner.js';
import fs from 'fs';
import path from 'path';

export const tier1NavigationTests = [
  // ==================== FEATURE 3: Mobile Sidebar & 23 Navigation Modules Synchronization ====================
  {
    id: 'T1-F3-01',
    tier: 'Tier 1',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules Synchronization',
    name: '23 navigation modules synchronization between navigation.ts and prototype',
    source: 'ORIGINAL_REQUEST.md:R2, PROJECT.md:F2.1, src/types/navigation.ts',
    run: async () => {
      const runner = new DomRunner();
      const modules = runner.getNavModules();
      if (modules.length !== 23) {
        return {
          passed: false,
          error: `Expected exactly 23 navigation modules in darsNavModules, but found ${modules.length}.`
        };
      }
      return { passed: true, details: `Found all 23 modules: ${modules.map(m => m.id).join(', ')}` };
    }
  },
  {
    id: 'T1-F3-02',
    tier: 'Tier 1',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules Synchronization',
    name: '51 sub-routes inventory accounted for in prototype navigation structure',
    source: 'ORIGINAL_REQUEST.md:R2, PROJECT.md:F2.1, src/types/navigation.ts',
    run: async () => {
      const runner = new DomRunner();
      const modules = runner.getNavModules();
      let totalSubRoutes = 0;
      modules.forEach(m => {
        if (m.children && m.children.length > 0) {
          totalSubRoutes += m.children.length;
        } else {
          totalSubRoutes += 1;
        }
      });

      if (totalSubRoutes !== 51) {
        return {
          passed: false,
          error: `Expected 51 total sub-routes from navigation.ts, but counted ${totalSubRoutes} in prototype.`
        };
      }
      return { passed: true, details: `Counted exactly 51 routes across 23 modules` };
    }
  },
  {
    id: 'T1-F3-03',
    tier: 'Tier 1',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules Synchronization',
    name: 'Route mapping consistency: subeler navigates to branches without dangling reference',
    source: 'PROJECT.md:F2.2',
    run: async () => {
      const runner = new DomRunner();
      const modules = runner.getNavModules();
      const subelerMod = modules.find(m => m.id === 'subeler');
      if (!subelerMod) return { passed: false, error: 'Module "subeler" not found in darsNavModules.' };

      // Check if children navigate to 'branches' or 'subeler'
      const childScreens = subelerMod.children?.map(c => c.screen) || [];
      const hasBranchesContainer = runner.screenIds.includes('screen-branches');
      const hasSubelerContainer = runner.screenIds.includes('screen-subeler');

      if (!hasBranchesContainer && !hasSubelerContainer) {
        return {
          passed: false,
          error: 'Neither screen-branches nor screen-subeler container exists in DOM for Şubelerimiz.'
        };
      }

      // Check if subeler children point to valid screen container
      const targetScreen = childScreens[0];
      if (!runner.screenIds.includes('screen-' + targetScreen)) {
        return {
          passed: false,
          error: `Şubeler child route points to screen "${targetScreen}", but screen-${targetScreen} container does not exist in DOM.`
        };
      }

      return { passed: true };
    }
  },
  {
    id: 'T1-F3-04',
    tier: 'Tier 1',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules Synchronization',
    name: 'Route mapping consistency: hukuk navigates to legal_cases without dangling reference',
    source: 'PROJECT.md:F2.2',
    run: async () => {
      const runner = new DomRunner();
      const modules = runner.getNavModules();
      const hukukMod = modules.find(m => m.id === 'hukuk');
      if (!hukukMod) return { passed: false, error: 'Module "hukuk" not found in darsNavModules.' };

      const hasLegalCasesContainer = runner.screenIds.includes('screen-legal_cases');
      const hasHukukContainer = runner.screenIds.includes('screen-hukuk');

      if (!hasLegalCasesContainer && !hasHukukContainer) {
        return {
          passed: false,
          error: 'Neither screen-legal_cases nor screen-hukuk container exists in DOM for Hukuk Departmanı.'
        };
      }

      const targetScreen = hukukMod.children?.[0]?.screen || hukukMod.screenTarget;
      if (!runner.screenIds.includes('screen-' + targetScreen)) {
        return {
          passed: false,
          error: `Hukuk route points to "${targetScreen}", but screen-${targetScreen} container does not exist in DOM.`
        };
      }

      return { passed: true };
    }
  },
  {
    id: 'T1-F3-05',
    tier: 'Tier 1',
    feature: 'F3: Mobile Sidebar & 23 Navigation Modules Synchronization',
    name: 'Missing DOM containers verification (screen-bills and screen-findeks)',
    source: 'PROJECT.md:F2.3',
    run: async () => {
      const runner = new DomRunner();
      const missing = [];
      if (!runner.hasScreenBills) missing.push('screen-bills');
      if (!runner.hasScreenFindeks) missing.push('screen-findeks');

      if (missing.length > 0) {
        return {
          passed: false,
          error: `Missing required screen containers in DOM: ${missing.join(', ')}. Defined in Finans navigation children.`
        };
      }
      return { passed: true };
    }
  },

  // ==================== FEATURE 4: Menu Tree Accordion, Active Highlight & Search Filtering ====================
  {
    id: 'T1-F4-01',
    tier: 'Tier 1',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search Filtering',
    name: 'Menu accordion toggle function toggleMenuAccordion modifies openAccordions set',
    source: 'ORIGINAL_REQUEST.md:R2, PROJECT.md:F2.4, ios_prototype.html:18402',
    run: async () => {
      const runner = new DomRunner();
      if (!runner.rawHtml.includes('function toggleMenuAccordion')) {
        return { passed: false, error: 'toggleMenuAccordion function is not defined in prototype script.' };
      }
      const initial = new Set();
      const step1 = runner.simulateToggleAccordion(initial, 'cekler');
      if (!step1.has('cekler')) {
        return { passed: false, error: 'Toggling unopened accordion did not add it to openSet.' };
      }
      const step2 = runner.simulateToggleAccordion(step1, 'cekler');
      if (step2.has('cekler')) {
        return { passed: false, error: 'Toggling already open accordion did not remove it from openSet.' };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F4-02',
    tier: 'Tier 1',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search Filtering',
    name: 'Menu search filtering filters modules based on query match across label and description',
    source: 'ORIGINAL_REQUEST.md:R2, PROJECT.md:F2.4, ios_prototype.html:18465',
    run: async () => {
      const runner = new DomRunner();
      const matched = runner.simulateFilterMenu('çek');
      if (matched.length === 0) {
        return { passed: false, error: 'Filtering menu with query "çek" returned 0 results.' };
      }
      const hasCekler = matched.some(m => m.id === 'cekler');
      if (!hasCekler) {
        return { passed: false, error: 'Query "çek" did not match "cekler" module.' };
      }
      return { passed: true, details: `Matched ${matched.length} modules for query "çek"` };
    }
  },
  {
    id: 'T1-F4-03',
    tier: 'Tier 1',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search Filtering',
    name: 'Category tag filtering filterMenuByTag restricts categories (FINANS, MUHASEBE, OPERASYON, SISTEM)',
    source: 'PROJECT.md:F2.4, ios_prototype.html:18413-18438',
    run: async () => {
      const runner = new DomRunner();
      const hasFilterByTag = runner.rawHtml.includes('function filterMenuByTag');
      if (!hasFilterByTag) {
        return { passed: false, error: 'filterMenuByTag function not found in prototype script.' };
      }
      const hasCategories = runner.rawHtml.includes('activeMenuFilterTag === \'FINANS\'') &&
                            runner.rawHtml.includes('activeMenuFilterTag === \'MUHASEBE\'');
      if (!hasCategories) {
        return { passed: false, error: 'filterMenuByTag category tag mappings missing.' };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F4-04',
    tier: 'Tier 1',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search Filtering',
    name: 'Active state highlight classes applied to tabs and active screen elements',
    source: 'ORIGINAL_REQUEST.md:R2, PROJECT.md:F2.4, ios_prototype.html:18709-18715',
    run: async () => {
      const runner = new DomRunner();
      const hasTabReset = runner.rawHtml.includes("document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'))");
      const hasActiveCheck = runner.rawHtml.includes("tab-dashboard") && runner.rawHtml.includes("classList.add('active')");
      if (!hasTabReset || !hasActiveCheck) {
        return {
          passed: false,
          error: 'Active tab tracking logic missing from changeScreen function in prototype.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F4-05',
    tier: 'Tier 1',
    feature: 'F4: Menu Tree Accordion, Active Highlight & Search Filtering',
    name: 'Module items render badges (e.g. 2 İşlem, 7 Modül, 6 Şube) in UI',
    source: 'ORIGINAL_REQUEST.md:R2, PROJECT.md:F2.4, ios_prototype.html:18502',
    run: async () => {
      const runner = new DomRunner();
      const modules = runner.getNavModules();
      const badgedModules = modules.filter(m => m.badge);
      if (badgedModules.length < 5) {
        return {
          passed: false,
          error: `Expected at least 5 modules with badges, but found ${badgedModules.length}.`
        };
      }
      const hasBadgeRender = runner.rawHtml.includes('m.badge');
      if (!hasBadgeRender) {
        return { passed: false, error: 'Badge rendering markup missing from menu module template.' };
      }
      return { passed: true, details: `Found badges on ${badgedModules.length} modules` };
    }
  }
];
