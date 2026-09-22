import { DomRunner } from '../helpers/dom_runner.js';
import { IntegrityChecker } from '../helpers/integrity.js';
import fs from 'fs';
import path from 'path';

export const tier1DeploymentTests = [
  // ==================== FEATURE 7: Zero-Regression V8 Syntax & Backup SHA256 Preservation ====================
  {
    id: 'T1-F7-01',
    tier: 'Tier 1',
    feature: 'F7: Zero-Regression V8 Syntax & Backup SHA256 Preservation',
    name: 'All JavaScript blocks in ios_prototype.html compile cleanly with Node V8 parser',
    source: 'ORIGINAL_REQUEST.md:R4, PROJECT.md:F4.3',
    run: async () => {
      const runner = new DomRunner('ios_prototype.html');
      const v8Results = runner.validateAllScriptsV8();
      const failures = v8Results.filter(r => !r.valid);
      if (failures.length > 0) {
        return {
          passed: false,
          error: `V8 script compilation failed for ${failures.length} script(s): ${failures.map(f => `Script #${f.index}: ${f.error}`).join('; ')}`
        };
      }
      return { passed: true, details: `Successfully validated ${v8Results.length} script block(s) with V8.` };
    }
  },
  {
    id: 'T1-F7-02',
    tier: 'Tier 1',
    feature: 'F7: Zero-Regression V8 Syntax & Backup SHA256 Preservation',
    name: 'Master backup file ios_prototype_yedek.html exists at project root',
    source: 'ORIGINAL_REQUEST.md:R4, PROJECT.md:F4.1',
    run: async () => {
      const exists = fs.existsSync(path.resolve('ios_prototype_yedek.html'));
      if (!exists) {
        return { passed: false, error: 'Master backup file ios_prototype_yedek.html is missing.' };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F7-03',
    tier: 'Tier 1',
    feature: 'F7: Zero-Regression V8 Syntax & Backup SHA256 Preservation',
    name: 'Backup SHA256 hash strictly matches A80F8D5A9012CDD5A5B1F33E3965D3728BAF3FD3FE91218E7BD895F15324BDE4',
    source: 'ORIGINAL_REQUEST.md:R4, PROJECT.md:F4.1',
    run: async () => {
      const result = IntegrityChecker.verifyBackupIntegrity('A80F8D5A9012CDD5A5B1F33E3965D3728BAF3FD3FE91218E7BD895F15324BDE4');
      if (!result.valid) {
        return {
          passed: false,
          error: `Backup SHA256 mismatch! Expected: ${result.expected}, Actual: ${result.actual}`
        };
      }
      return { passed: true, details: `Exact SHA256 match: ${result.actual}` };
    }
  },
  {
    id: 'T1-F7-04',
    tier: 'Tier 1',
    feature: 'F7: Zero-Regression V8 Syntax & Backup SHA256 Preservation',
    name: 'Bundled prototype ios/dars-ios/App/www/ios_prototype.html compiles cleanly with V8',
    source: 'PROJECT.md:F4.2, PROJECT.md:F4.3',
    run: async () => {
      const bundlePath = 'ios/dars-ios/App/www/ios_prototype.html';
      if (!fs.existsSync(path.resolve(bundlePath))) {
        return { passed: false, error: `Bundled prototype missing at ${bundlePath}` };
      }
      const runner = new DomRunner(bundlePath);
      const v8Results = runner.validateAllScriptsV8();
      const failures = v8Results.filter(r => !r.valid);
      if (failures.length > 0) {
        return {
          passed: false,
          error: `Bundled prototype V8 compilation failed: ${failures.map(f => f.error).join('; ')}`
        };
      }
      return { passed: true, details: `Bundled prototype validated (${v8Results.length} script block(s)).` };
    }
  },
  {
    id: 'T1-F7-05',
    tier: 'Tier 1',
    feature: 'F7: Zero-Regression V8 Syntax & Backup SHA256 Preservation',
    name: 'Document structural integrity (DOCTYPE, viewport meta, UTF-8 charset)',
    source: 'ORIGINAL_REQUEST.md:R4, ios_prototype.html:1-7',
    run: async () => {
      const runner = new DomRunner('ios_prototype.html');
      const html = runner.rawHtml;
      const hasDocType = /<!DOCTYPE\s+html>/i.test(html);
      const hasCharset = /<meta\s+charset=["']UTF-8["']/i.test(html);
      const hasViewport = /<meta\s+name=["']viewport["']/i.test(html);
      if (!hasDocType || !hasCharset || !hasViewport) {
        return {
          passed: false,
          error: `Document header structure incomplete: DOCTYPE=${hasDocType}, charset=${hasCharset}, viewport=${hasViewport}`
        };
      }
      return { passed: true };
    }
  },

  // ==================== FEATURE 8: TestFlight CI/CD Configuration & Build Increment ====================
  {
    id: 'T1-F8-01',
    tier: 'Tier 1',
    feature: 'F8: TestFlight CI/CD Configuration & Build Increment',
    name: 'XcodeGen specification ios/project.yml exists with dars-ios application target',
    source: 'ORIGINAL_REQUEST.md:R4, PROJECT.md:F4.4, ios/project.yml',
    run: async () => {
      const parsed = IntegrityChecker.parseProjectYml('ios/project.yml');
      if (!parsed) {
        return { passed: false, error: 'ios/project.yml not found or unreadable.' };
      }
      if (!parsed.content.includes('dars-ios:') || !parsed.content.includes('type: application')) {
        return { passed: false, error: 'ios/project.yml does not define dars-ios application target.' };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F8-02',
    tier: 'Tier 1',
    feature: 'F8: TestFlight CI/CD Configuration & Build Increment',
    name: 'CURRENT_PROJECT_VERSION in ios/project.yml is defined and >= 52',
    source: 'ORIGINAL_REQUEST.md:R4, PROJECT.md:F4.4, ios/project.yml:46',
    run: async () => {
      const parsed = IntegrityChecker.parseProjectYml('ios/project.yml');
      if (!parsed) return { passed: false, error: 'ios/project.yml not found.' };
      const ver = parsed.currentProjectVersion;
      if (ver === null || isNaN(ver)) {
        return { passed: false, error: 'CURRENT_PROJECT_VERSION not found in ios/project.yml.' };
      }
      if (ver < 52) {
        return {
          passed: false,
          error: `CURRENT_PROJECT_VERSION is ${ver}, which is below baseline 52.`
        };
      }
      return { passed: true, details: `CURRENT_PROJECT_VERSION is ${ver}` };
    }
  },
  {
    id: 'T1-F8-03',
    tier: 'Tier 1',
    feature: 'F8: TestFlight CI/CD Configuration & Build Increment',
    name: 'Bundle identifier matches com.amasyaetas.mobile and Development Team is WGARWL7QZ4',
    source: 'PROJECT.md, ios/project.yml:10,32',
    run: async () => {
      const parsed = IntegrityChecker.parseProjectYml('ios/project.yml');
      if (!parsed) return { passed: false, error: 'ios/project.yml not found.' };
      if (parsed.bundleIdentifier !== 'com.amasyaetas.mobile') {
        return {
          passed: false,
          error: `Expected bundle ID "com.amasyaetas.mobile", but got "${parsed.bundleIdentifier}".`
        };
      }
      if (parsed.developmentTeam !== 'WGARWL7QZ4') {
        return {
          passed: false,
          error: `Expected development team "WGARWL7QZ4", but got "${parsed.developmentTeam}".`
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F8-04',
    tier: 'Tier 1',
    feature: 'F8: TestFlight CI/CD Configuration & Build Increment',
    name: 'GitHub Actions workflow triggers on push to main or master branch',
    source: 'ORIGINAL_REQUEST.md:R4, .github/workflows/deploy_testflight.yml:11-15',
    run: async () => {
      const parsed = IntegrityChecker.parseWorkflow('.github/workflows/deploy_testflight.yml');
      if (!parsed) return { passed: false, error: 'deploy_testflight.yml workflow not found.' };
      if (!parsed.triggersOnMain && !parsed.triggersOnMaster) {
        return {
          passed: false,
          error: 'deploy_testflight.yml does not trigger on main or master push events.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T1-F8-05',
    tier: 'Tier 1',
    feature: 'F8: TestFlight CI/CD Configuration & Build Increment',
    name: 'Workflow defines XcodeGen generation, Fastlane beta deploy, and artifact upload',
    source: 'ORIGINAL_REQUEST.md:R4, .github/workflows/deploy_testflight.yml',
    run: async () => {
      const parsed = IntegrityChecker.parseWorkflow('.github/workflows/deploy_testflight.yml');
      if (!parsed) return { passed: false, error: 'deploy_testflight.yml workflow not found.' };
      if (!parsed.hasXcodeGenStep || !parsed.hasFastlaneStep || !parsed.hasArtifactUpload) {
        return {
          passed: false,
          error: `Workflow missing essential CI steps: xcodegen=${parsed.hasXcodeGenStep}, fastlane=${parsed.hasFastlaneStep}, upload=${parsed.hasArtifactUpload}`
        };
      }
      return { passed: true };
    }
  }
];
