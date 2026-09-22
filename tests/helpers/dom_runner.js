import fs from 'fs';
import path from 'path';
import vm from 'vm';

export class DomRunner {
  constructor(htmlPath = 'ios_prototype.html') {
    this.htmlPath = path.resolve(htmlPath);
    this.rawHtml = fs.existsSync(this.htmlPath) ? fs.readFileSync(this.htmlPath, 'utf8') : '';
    this._parseDomElements();
    this._extractScripts();
  }

  _parseDomElements() {
    this.screenIds = [];
    const screenRegex = /id=["'](screen-[a-zA-Z0-9_\-]+)["']/g;
    let match;
    while ((match = screenRegex.exec(this.rawHtml)) !== null) {
      if (!this.screenIds.includes(match[1])) {
        this.screenIds.push(match[1]);
      }
    }

    // Check specific containers
    this.hasScreenBills = this.screenIds.includes('screen-bills');
    this.hasScreenFindeks = this.screenIds.includes('screen-findeks');
    this.hasScreenTakvim = this.screenIds.includes('screen-takvim');
    this.hasScreenMenu = this.screenIds.includes('screen-menu');
    this.hasScreenDashboard = this.screenIds.includes('screen-dashboard');
    this.hasCalendarContainer = this.rawHtml.includes('id="calendar-container"') || this.rawHtml.includes('id=\'calendar-container\'');
    this.hasDashboardCalendarWidget = this.rawHtml.includes('id="dashboard-calendar-widget"') || this.rawHtml.includes('id=\'dashboard-calendar-widget\'');
  }

  _extractScripts() {
    this.scripts = [];
    const scriptRegex = /<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(this.rawHtml)) !== null) {
      this.scripts.push({
        attributes: match[1],
        code: match[2]
      });
    }
  }

  validateAllScriptsV8() {
    const results = [];
    for (let i = 0; i < this.scripts.length; i++) {
      const script = this.scripts[i];
      try {
        new vm.Script(script.code, { filename: `inline-script-${i + 1}.js` });
        results.push({ index: i + 1, valid: true, error: null });
      } catch (err) {
        results.push({ index: i + 1, valid: false, error: err.message, stack: err.stack });
      }
    }
    return results;
  }

  /**
   * Extract darsNavModules array safely using V8 context
   */
  getNavModules() {
    if (this._cachedNavModules) return this._cachedNavModules;
    const codeMatch = this.rawHtml.match(/const\s+darsNavModules\s*=\s*(\[[\s\S]*?\]);\s*(?:\n|\r|const|let|var|function|\/\/)/);
    if (!codeMatch) return [];

    try {
      const sandbox = {};
      vm.createContext(sandbox);
      const extractedCode = `result = ${codeMatch[1]};`;
      vm.runInContext(extractedCode, sandbox);
      this._cachedNavModules = sandbox.result || [];
      return this._cachedNavModules;
    } catch (e) {
      return [];
    }
  }

  /**
   * Extract calStyles definition
   */
  getCalStyles() {
    if (this._cachedCalStyles) return this._cachedCalStyles;
    const match = this.rawHtml.match(/const\s+calStyles\s*=\s*(\{[\s\S]*?\});/);
    if (!match) return {};
    try {
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(`result = ${match[1]};`, sandbox);
      this._cachedCalStyles = sandbox.result || {};
      return this._cachedCalStyles;
    } catch (e) {
      return {};
    }
  }

  /**
   * Extract mock calendar events
   */
  getMockCalendarEvents() {
    if (this._cachedMockEvents) return this._cachedMockEvents;
    const match = this.rawHtml.match(/let\s+mockCalendarEvents\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return [];
    try {
      const sandbox = {};
      vm.createContext(sandbox);
      vm.runInContext(`result = ${match[1]};`, sandbox);
      this._cachedMockEvents = sandbox.result || [];
      return this._cachedMockEvents;
    } catch (e) {
      return [];
    }
  }

  /**
   * Check if renderTakvimScreen is defined
   */
  hasRenderTakvimScreenDefined() {
    return (
      /function\s+renderTakvimScreen\s*\(/.test(this.rawHtml) ||
      /const\s+renderTakvimScreen\s*=\s*/.test(this.rawHtml) ||
      /window\.renderTakvimScreen\s*=\s*/.test(this.rawHtml)
    );
  }

  /**
   * Check if toggleCalendarNote is defined
   */
  hasToggleCalendarNoteDefined() {
    return (
      /function\s+toggleCalendarNote\s*\(/.test(this.rawHtml) ||
      /const\s+toggleCalendarNote\s*=\s*/.test(this.rawHtml) ||
      /window\.toggleCalendarNote\s*=\s*/.test(this.rawHtml)
    );
  }

  /**
   * Check if darsNotification bridge is invoked
   */
  hasDarsNotificationBridgeCall() {
    return this.rawHtml.includes('darsNotification');
  }

  /**
   * Simulate changeScreen execution
   */
  simulateChangeScreen(screenId) {
    const targetElExists = this.screenIds.includes('screen-' + screenId);
    let handlerCalled = false;
    let handlerThrows = false;
    let thrownError = null;

    if (screenId === 'takvim') {
      if (!this.hasRenderTakvimScreenDefined()) {
        handlerThrows = true;
        thrownError = 'ReferenceError: renderTakvimScreen is not defined';
      } else {
        handlerCalled = true;
      }
    }

    return {
      screenId,
      containerFound: targetElExists,
      handlerCalled,
      handlerThrows,
      error: thrownError
    };
  }

  /**
   * Simulate menu filtering with query
   */
  simulateFilterMenu(query = '') {
    const modules = this.getNavModules();
    const q = query.toLowerCase().trim();
    if (!q) return modules;

    return modules.filter(m => {
      const mainMatch = (m.label && m.label.toLowerCase().includes(q)) || (m.desc && m.desc.toLowerCase().includes(q));
      const childMatch = m.children && m.children.some(c => 
        (c.label && c.label.toLowerCase().includes(q)) || (c.desc && c.desc.toLowerCase().includes(q))
      );
      return mainMatch || childMatch;
    });
  }

  /**
   * Simulate Turkish character normalization search
   */
  simulateFilterMenuTurkish(query = '') {
    const modules = this.getNavModules();
    const normalizeTR = str => {
      return str
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .toLowerCase();
    };
    const qNorm = normalizeTR(query.trim());
    if (!qNorm) return modules;

    return modules.filter(m => {
      const labelNorm = normalizeTR(m.label || '');
      const descNorm = normalizeTR(m.desc || '');
      const mainMatch = labelNorm.includes(qNorm) || descNorm.includes(qNorm);
      const childMatch = m.children && m.children.some(c => {
        const cLabel = normalizeTR(c.label || '');
        const cDesc = normalizeTR(c.desc || '');
        return cLabel.includes(qNorm) || cDesc.includes(qNorm);
      });
      return mainMatch || childMatch;
    });
  }

  /**
   * Simulate accordion toggle behavior
   */
  simulateToggleAccordion(initialOpenSet, moduleId) {
    const set = new Set(initialOpenSet);
    if (set.has(moduleId)) {
      set.delete(moduleId);
    } else {
      set.add(moduleId);
    }
    return set;
  }

  /**
   * Simulate note completion toggle
   */
  simulateToggleCalendarNote(notesList, noteId) {
    const rawId = String(noteId).replace('note-', '');
    return notesList.map(n => {
      if (String(n.id) === rawId || String(n.id) === String(noteId)) {
        return { ...n, completed: !n.completed };
      }
      return n;
    });
  }
}
