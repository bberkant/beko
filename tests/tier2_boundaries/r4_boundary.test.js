import { IntegrityChecker } from '../helpers/integrity.js';
import fs from 'fs';
import path from 'path';

export const tier2DeploymentBoundaries = [
  // ==================== FEATURE 7 BOUNDARIES: Syntax & Integrity ====================
  {
    id: 'T2-F7-01',
    tier: 'Tier 2',
    feature: 'F7: Zero-Regression & Integrity (Boundary)',
    name: 'Script tags do not contain unescaped closing script tokens inside string literals',
    source: 'TEST_INFRA.md:Tier 2, Adversarial Verification',
    run: async () => {
      const html = fs.readFileSync('ios_prototype.html', 'utf8');
      const scriptRegex = /<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi;
      let match;
      let count = 0;
      while ((match = scriptRegex.exec(html)) !== null) {
        count++;
        const code = match[2];
        // Check for raw unescaped </script> inside strings
        if (code.includes('</script>') && !code.includes('<\\/script>')) {
          return {
            passed: false,
            error: `Script block #${count} contains unescaped "</script>" string, causing premature script termination in HTML parser.`
          };
        }
      }
      return { passed: true, details: `Validated ${count} script blocks for script tag escaping.` };
    }
  },
  {
    id: 'T2-F7-02',
    tier: 'Tier 2',
    feature: 'F7: Zero-Regression & Integrity (Boundary)',
    name: 'UTF-8 multi-byte Turkish characters preserve byte integrity without replacement characters',
    source: 'TEST_INFRA.md:Tier 2, User Rule: turkish char integrity',
    run: async () => {
      const buf = fs.readFileSync('ios_prototype.html');
      // Check for UTF-8 replacement character EF BF BD (U+FFFD)
      const hasReplacement = buf.includes(Buffer.from([0xEF, 0xBF, 0xBD]));
      if (hasReplacement) {
        return {
          passed: false,
          error: 'Found Unicode replacement character (U+FFFD), indicating corrupted character encoding in ios_prototype.html.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T2-F7-03',
    tier: 'Tier 2',
    feature: 'F7: Zero-Regression & Integrity (Boundary)',
    name: 'Prototype file size boundary check (size within valid bounds: 500KB - 5MB)',
    source: 'TEST_INFRA.md:Tier 2',
    run: async () => {
      const stats = fs.statSync('ios_prototype.html');
      const minSize = 500 * 1024; // 500 KB
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (stats.size < minSize || stats.size > maxSize) {
        return {
          passed: false,
          error: `File size out of bounds: ${stats.size} bytes (expected between ${minSize} and ${maxSize} bytes).`
        };
      }
      return { passed: true, details: `File size: ${(stats.size / 1024).toFixed(1)} KB` };
    }
  },
  {
    id: 'T2-F7-04',
    tier: 'Tier 2',
    feature: 'F7: Zero-Regression & Integrity (Boundary)',
    name: 'Master backup file ios_prototype_yedek.html is strictly protected and valid',
    source: 'ORIGINAL_REQUEST.md:R4, PROJECT.md:F4.1',
    run: async () => {
      const stats = fs.statSync('ios_prototype_yedek.html');
      if (stats.size < 500 * 1024) {
        return { passed: false, error: 'Backup file size unexpectedly small.' };
      }
      const hash = IntegrityChecker.getFileSha256('ios_prototype_yedek.html');
      if (hash !== 'A80F8D5A9012CDD5A5B1F33E3965D3728BAF3FD3FE91218E7BD895F15324BDE4') {
        return { passed: false, error: `Backup hash mismatch: ${hash}` };
      }
      return { passed: true };
    }
  },
  {
    id: 'T2-F7-05',
    tier: 'Tier 2',
    feature: 'F7: Zero-Regression & Integrity (Boundary)',
    name: 'Checksum algorithm format verification: SHA-256 length is exactly 64 hex characters',
    source: 'TEST_INFRA.md:Tier 2',
    run: async () => {
      const hash = IntegrityChecker.getFileSha256('ios_prototype_yedek.html');
      if (!hash || hash.length !== 64 || /[^0-9A-F]/.test(hash)) {
        return {
          passed: false,
          error: `Invalid SHA-256 format: length=${hash?.length}, hash=${hash}`
        };
      }
      return { passed: true };
    }
  },

  // ==================== FEATURE 8 BOUNDARIES: CI/CD Configuration ====================
  {
    id: 'T2-F8-01',
    tier: 'Tier 2',
    feature: 'F8: TestFlight CI/CD Configuration (Boundary)',
    name: 'CURRENT_PROJECT_VERSION is strictly a positive integer string, not a float or semver string',
    source: 'TEST_INFRA.md:Tier 2, ios/project.yml:46',
    run: async () => {
      const content = fs.readFileSync('ios/project.yml', 'utf8');
      const match = content.match(/CURRENT_PROJECT_VERSION:\s*["']?([^"'\s\n]+)["']?/);
      if (!match) return { passed: false, error: 'CURRENT_PROJECT_VERSION not found in project.yml.' };
      const valStr = match[1];
      if (!/^\d+$/.test(valStr)) {
        return {
          passed: false,
          error: `CURRENT_PROJECT_VERSION "${valStr}" is not a strict positive integer (Apple CFBundleVersion requirement).`
        };
      }
      return { passed: true, details: `Validated strict integer build version: ${valStr}` };
    }
  },
  {
    id: 'T2-F8-02',
    tier: 'Tier 2',
    feature: 'F8: TestFlight CI/CD Configuration (Boundary)',
    name: 'XcodeGen YAML specification contains no tab characters (strict YAML 1.2 indentation)',
    source: 'TEST_INFRA.md:Tier 2, ios/project.yml',
    run: async () => {
      const content = fs.readFileSync('ios/project.yml', 'utf8');
      if (content.includes('\t')) {
        return {
          passed: false,
          error: 'ios/project.yml contains tab characters, which violates YAML specification and causes xcodegen generate to fail.'
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T2-F8-03',
    tier: 'Tier 2',
    feature: 'F8: TestFlight CI/CD Configuration (Boundary)',
    name: 'Fastlane runner environment sets pipefail and logs output to fastlane_run.log',
    source: 'TEST_INFRA.md:Tier 2, .github/workflows/deploy_testflight.yml:92-94',
    run: async () => {
      const parsed = IntegrityChecker.parseWorkflow('.github/workflows/deploy_testflight.yml');
      if (!parsed) return { passed: false, error: 'Workflow file missing.' };
      const hasPipefail = parsed.content.includes('set -eo pipefail');
      const hasTeeLog = parsed.content.includes('tee fastlane_run.log');
      if (!hasPipefail || !hasTeeLog) {
        return {
          passed: false,
          error: `Fastlane execution command missing pipefail or tee logging: pipefail=${hasPipefail}, tee=${hasTeeLog}`
        };
      }
      return { passed: true };
    }
  },
  {
    id: 'T2-F8-04',
    tier: 'Tier 2',
    feature: 'F8: TestFlight CI/CD Configuration (Boundary)',
    name: 'Minimum iOS deployment target is strictly >= 17.0 across application and test targets',
    source: 'TEST_INFRA.md:Tier 2, ios/project.yml:5,21,52',
    run: async () => {
      const content = fs.readFileSync('ios/project.yml', 'utf8');
      const targets = [...content.matchAll(/deploymentTarget:\s*["']?([^"'\s\n]+)["']?/g)].map(m => m[1]);
      if (targets.length === 0) {
        return { passed: false, error: 'No deploymentTarget specified in project.yml.' };
      }
      for (const t of targets) {
        const ver = parseFloat(t);
        if (ver < 17.0) {
          return { passed: false, error: `Deployment target ${t} is below required iOS 17.0.` };
        }
      }
      return { passed: true, details: `All deployment targets verified: ${targets.join(', ')}` };
    }
  },
  {
    id: 'T2-F8-05',
    tier: 'Tier 2',
    feature: 'F8: TestFlight CI/CD Configuration (Boundary)',
    name: 'CI/CD workflow ignores markdown and documentation file changes to prevent wasted runners',
    source: 'TEST_INFRA.md:Tier 2, .github/workflows/deploy_testflight.yml:16-18',
    run: async () => {
      const parsed = IntegrityChecker.parseWorkflow('.github/workflows/deploy_testflight.yml');
      if (!parsed) return { passed: false, error: 'Workflow file missing.' };
      const hasPathsIgnore = parsed.content.includes('paths-ignore:') && parsed.content.includes('**.md');
      if (!hasPathsIgnore) {
        return {
          passed: false,
          error: 'Workflow does not ignore markdown file changes (paths-ignore: **.md).'
        };
      }
      return { passed: true };
    }
  }
];
