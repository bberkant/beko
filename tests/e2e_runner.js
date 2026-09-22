import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all test suites
import { tier1NotificationsTests } from './tier1_features/r1_notifications.test.js';
import { tier1NavigationTests } from './tier1_features/r2_navigation.test.js';
import { tier1CalendarTests } from './tier1_features/r3_calendar.test.js';
import { tier1DeploymentTests } from './tier1_features/r4_deployment.test.js';

import { tier2NotificationBoundaries } from './tier2_boundaries/r1_boundary.test.js';
import { tier2NavigationBoundaries } from './tier2_boundaries/r2_boundary.test.js';
import { tier2CalendarBoundaries } from './tier2_boundaries/r3_boundary.test.js';
import { tier2DeploymentBoundaries } from './tier2_boundaries/r4_boundary.test.js';

import { tier3PairwiseTests } from './tier3_pairwise/pairwise.test.js';
import { tier4RealWorldScenarios } from './tier4_scenarios/real_world_scenarios.test.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Assemble all test suites
const allTests = [
  ...tier1NotificationsTests,
  ...tier1NavigationTests,
  ...tier1CalendarTests,
  ...tier1DeploymentTests,
  ...tier2NotificationBoundaries,
  ...tier2NavigationBoundaries,
  ...tier2CalendarBoundaries,
  ...tier2DeploymentBoundaries,
  ...tier3PairwiseTests,
  ...tier4RealWorldScenarios
];

// CLI Argument parsing
const args = process.argv.slice(2);
let filterTier = null;
let filterFeature = null;
let filterId = null;
let strictMode = false;
let generateReport = true;

args.forEach(arg => {
  if (arg.startsWith('--tier=')) {
    filterTier = arg.split('=')[1].toLowerCase();
  } else if (arg.startsWith('--feature=')) {
    filterFeature = arg.split('=')[1];
  } else if (arg.startsWith('--id=')) {
    filterId = arg.split('=')[1].toUpperCase();
  } else if (arg === '--strict') {
    strictMode = true;
  } else if (arg === '--no-report') {
    generateReport = false;
  }
});

// Filter tests according to options
const testsToRun = allTests.filter(t => {
  if (filterTier && !t.tier.toLowerCase().includes(filterTier)) return false;
  if (filterFeature && !t.feature.includes(`F${filterFeature}`)) return false;
  if (filterId && !t.id.startsWith(filterId)) return false;
  return true;
});

console.log('='.repeat(80));
console.log('  DARS MOBILE iOS & WEB PROTOTYPE - OPAQUE-BOX E2E TEST SUITE');
console.log('  Requirements: R1 (Notifications), R2 (Navigation), R3 (Calendar), R4 (Integrity)');
console.log(`  Discovered Test Cases: ${allTests.length} | Running: ${testsToRun.length}`);
console.log('='.repeat(80));

async function runTestSuite() {
  const startTime = Date.now();
  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  const tierSummary = {
    'Tier 1': { total: 0, passed: 0, failed: 0 },
    'Tier 2': { total: 0, passed: 0, failed: 0 },
    'Tier 3': { total: 0, passed: 0, failed: 0 },
    'Tier 4': { total: 0, passed: 0, failed: 0 }
  };

  for (const test of testsToRun) {
    const tStart = Date.now();
    let result = { passed: false, error: null, details: null };
    try {
      result = await test.run();
    } catch (err) {
      result = { passed: false, error: err.message || String(err) };
    }
    const duration = Date.now() - tStart;

    const tObj = {
      id: test.id,
      tier: test.tier,
      feature: test.feature,
      name: test.name,
      source: test.source,
      passed: result.passed,
      error: result.error,
      details: result.details,
      duration
    };
    results.push(tObj);

    // Update summaries
    const tKey = test.tier.startsWith('Tier 1') ? 'Tier 1' :
                 test.tier.startsWith('Tier 2') ? 'Tier 2' :
                 test.tier.startsWith('Tier 3') ? 'Tier 3' : 'Tier 4';

    if (tierSummary[tKey]) {
      tierSummary[tKey].total++;
      if (result.passed) tierSummary[tKey].passed++;
      else tierSummary[tKey].failed++;
    }

    if (result.passed) {
      passedCount++;
      console.log(`  [PASS] [${test.id}] ${test.name} (${duration}ms)`);
    } else {
      failedCount++;
      console.log(`  [FAIL] [${test.id}] ${test.name} (${duration}ms)`);
      console.log(`         >> Error: ${result.error}`);
      console.log(`         >> Source: ${test.source}`);
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log('\n' + '='.repeat(80));
  console.log('  TEST SUITE EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(`  Total Tests Run : ${testsToRun.length}`);
  console.log(`  Passed          : ${passedCount} (${((passedCount / testsToRun.length) * 100).toFixed(1)}%)`);
  console.log(`  Failed          : ${failedCount} (${((failedCount / testsToRun.length) * 100).toFixed(1)}%)`);
  console.log(`  Execution Time  : ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('-'.repeat(80));
  console.log('  Breakdown by Tier:');
  for (const [tier, stats] of Object.entries(tierSummary)) {
    console.log(`    ${tier.padEnd(8)}: ${stats.passed}/${stats.total} Passed (${stats.failed} Failed)`);
  }
  console.log('='.repeat(80));

  // Extract distinct implementation defects to escalate
  const failures = results.filter(r => !r.passed);
  const distinctBugs = [];

  failures.forEach(f => {
    let category = 'General';
    if (f.id.includes('F1') || f.id.includes('F2') || f.id === 'T3-P09' || f.id === 'T4-SCEN-01') {
      category = 'M1_Notifications';
    } else if (f.id.includes('F3') || f.id.includes('F4') || f.id === 'T3-P05' || f.id === 'T3-P06' || f.id === 'T4-SCEN-03') {
      category = 'M2_Navigation';
    } else if (f.id.includes('F5') || f.id.includes('F6') || f.id === 'T3-P02' || f.id === 'T3-P04' || f.id === 'T4-SCEN-04') {
      category = 'M3_Calendar';
    } else if (f.id.includes('F7') || f.id.includes('F8') || f.id === 'T4-SCEN-05') {
      category = 'M4_Deployment';
    }

    distinctBugs.push({
      id: f.id,
      name: f.name,
      category,
      error: f.error,
      source: f.source
    });
  });

  if (failures.length > 0) {
    console.log('\n[!] ACTIONABLE IMPLEMENTATION DEFECTS DISCOVERED:');
    failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.id}] ${f.name}`);
      console.log(`     Issue: ${f.error}`);
    });
  }

  // Generate TEST_READY.md
  if (generateReport) {
    generateTestReadyMarkdown(results, tierSummary, distinctBugs, totalDuration);
  }

  if (strictMode && failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function generateTestReadyMarkdown(results, tierSummary, distinctBugs, totalDuration) {
  const timestamp = new Date().toISOString();
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  let md = `# TEST_READY: DARS Mobile iOS & Web Prototype E2E Test Suite

**Generated At:** \`${timestamp}\`  
**Author:** \`teamwork_preview_test_writer_1\` (E2E Test Suite Architect)  
**Status:** **SUITE_READY** (Comprehensive Opaque-Box E2E Test Framework Active)  
**Total Test Cases:** \`${total}\` | **Passed:** \`${passed}\` | **Failed (Identified Pre-Milestone Defects):** \`${failed}\`  
**Execution Duration:** \`${(totalDuration / 1000).toFixed(2)}s\`

---

## 1. Executive Summary & Verification Methodology
In compliance with \`ORIGINAL_REQUEST.md\` (R1-R4) and \`TEST_INFRA.md\`, this automated Node.js test harness validates the mobile web prototype and iOS host application across **4 comprehensive verification tiers**:
- **Tier 1 (Feature Coverage):** Primary happy path contracts for all 8 discrete features (40 test cases).
- **Tier 2 (Boundary & Corner Cases):** Extreme inputs, leap year transitions, month boundaries, regex escaping, and structural invariants (40 test cases).
- **Tier 3 (Cross-Feature Combinations):** Pairwise interactions between calendar, navigation, local storage, and native WebKit bridge (12 test scenarios).
- **Tier 4 (Real-World Application Scenarios):** 5 end-to-end user and system lifecycle workflows (5 scenarios).

---

## 2. Test Execution Breakdown by Tier

| Test Tier | Scope | Total Tests | Passed | Identified Defects | Pass Rate |
|-----------|-------|:-----------:|:------:|:------------------:|:---------:|
| **Tier 1** | Primary Feature Coverage (R1-R4) | ${tierSummary['Tier 1'].total} | ${tierSummary['Tier 1'].passed} | ${tierSummary['Tier 1'].failed} | ${((tierSummary['Tier 1'].passed / (tierSummary['Tier 1'].total || 1)) * 100).toFixed(1)}% |
| **Tier 2** | Boundary & Corner Value Analysis | ${tierSummary['Tier 2'].total} | ${tierSummary['Tier 2'].passed} | ${tierSummary['Tier 2'].failed} | ${((tierSummary['Tier 2'].passed / (tierSummary['Tier 2'].total || 1)) * 100).toFixed(1)}% |
| **Tier 3** | Cross-Feature Pairwise Combinations | ${tierSummary['Tier 3'].total} | ${tierSummary['Tier 3'].passed} | ${tierSummary['Tier 3'].failed} | ${((tierSummary['Tier 3'].passed / (tierSummary['Tier 3'].total || 1)) * 100).toFixed(1)}% |
| **Tier 4** | Real-World Application Workflows | ${tierSummary['Tier 4'].total} | ${tierSummary['Tier 4'].passed} | ${tierSummary['Tier 4'].failed} | ${((tierSummary['Tier 4'].passed / (tierSummary['Tier 4'].total || 1)) * 100).toFixed(1)}% |
| **TOTAL** | **Full Requirement Suite** | **${total}** | **${passed}** | **${failed}** | **${((passed / total) * 100).toFixed(1)}%** |

---

## 3. How to Execute the Test Suite

\`\`\`bash
# Run full E2E test suite (all 97 tests across Tiers 1-4)
node tests/e2e_runner.js

# Run specific Tier
node tests/e2e_runner.js --tier=1
node tests/e2e_runner.js --tier=2
node tests/e2e_runner.js --tier=3
node tests/e2e_runner.js --tier=4

# Run specific Feature (1 to 8)
node tests/e2e_runner.js --feature=1
node tests/e2e_runner.js --feature=3

# Run specific Test by ID
node tests/e2e_runner.js --id=T1-F1-01

# Strict mode (exit code 1 if any failure)
node tests/e2e_runner.js --strict
\`\`\`

---

## 4. Discovered Implementation Defects (Escalation to Implementing Agents)

The test suite exercises real logic and strict assertions without facades. The following defects represent actual gaps between the current workspace state and the specification:

`;

  if (distinctBugs.length === 0) {
    md += '✅ *No implementation defects found. All requirements verified.* \n';
  } else {
    md += '| # | Test ID | Milestone | Feature / Description | Verbatim Failure Reason | Expected Behavior |\n';
    md += '|---|---------|-----------|-----------------------|-------------------------|-------------------|\n';
    distinctBugs.forEach((bug, idx) => {
      const cleanErr = bug.error.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      md += `| ${idx + 1} | \`${bug.id}\` | **${bug.category}** | ${bug.name} | \`${cleanErr}\` | Conformance to ${bug.source} |\n`;
    });
  }

  md += `
---

## 5. Complete Test Inventory & Status Matrix

| ID | Tier | Feature Area | Test Case Name | Status |
|---|---|---|---|:---:|
`;

  results.forEach(r => {
    const statusIcon = r.passed ? '✅ PASS' : '❌ FAIL';
    md += `| \`${r.id}\` | ${r.tier} | ${r.feature} | ${r.name} | ${statusIcon} |\n`;
  });

  md += `
---

## 6. Milestone Readiness Assessment
- **M1 Notifications:** Test suite ready. Automated checks verify Swift syntax, lock screen permissions, UNCalendarNotificationTrigger, and JS bridge.
- **M2 Navigation:** Test suite ready. Automated checks verify 23 modules, 51 sub-routes from \`navigation.ts\`, DOM container integrity, and menu accordion/filtering.
- **M3 Calendar:** Test suite ready. Automated checks verify Monday-first grid, 6 color badges, event cards, and note localStorage/toggle lifecycle.
- **M4 Deployment:** Test suite ready. Automated checks verify V8 syntax, master backup SHA256 integrity (\`A80F8D5A9012CDD5A5B1F33E3965D3728BAF3FD3FE91218E7BD895F15324BDE4\`), and TestFlight CI/CD config.
`;

  // Write to root
  const rootReportPath = path.join(projectRoot, 'TEST_READY.md');
  fs.writeFileSync(rootReportPath, md, 'utf8');

  // Write to .agents/
  const agentsReportPath = path.join(projectRoot, '.agents', 'TEST_READY.md');
  fs.writeFileSync(agentsReportPath, md, 'utf8');

  console.log(`\n[+] Published TEST_READY.md to:`);
  console.log(`    1. ${rootReportPath}`);
  console.log(`    2. ${agentsReportPath}`);
}

runTestSuite().catch(err => {
  console.error('Test Runner Fatal Error:', err);
  process.exit(1);
});
