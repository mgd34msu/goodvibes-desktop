#!/usr/bin/env node
// ============================================================================
// TEST RATCHET
// ============================================================================
// Runs the vitest suite with the JSON reporter and compares the set of failing
// test FILES against the recorded baseline.
//
//   * a failing file that is NOT on the baseline list  -> FAIL
//   * more failing files than the baseline lists       -> FAIL
//   * a baseline file that no longer exists on disk    -> FAIL (stale)
//   * a baseline file that now passes in full          -> note, remove it
//   * the total failing-test count                     -> reported, advisory
//
// The suite is red today on purpose; the point of this gate is that the red
// can only shrink.
//
// The total failing-test count is deliberately NOT a hard gate. Four identical
// runs of this suite on 2026-08-20 reported 188, 190, 191 and 192 failing
// tests. Every test that moved was inside src/main/services/git.test.ts, a
// file already on the baseline list, and the set of failing FILES was the same
// 22 in all four runs. Gating on the moving number would fail pull requests
// that changed nothing, so the stable file set carries the gate and the count
// is printed for information only.
// ============================================================================

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { heading, readBaseline, repoRoot, reportCount, toolEntry } from './lib.mjs';

// The report goes to a temp directory rather than the working tree so a CI run
// never leaves an untracked artifact behind.
const reportPath = join(mkdtempSync(join(tmpdir(), 'gv-test-ratchet-')), 'vitest-results.json');

heading('Test ratchet');
console.log(`  vitest JSON report: ${reportPath}`);
console.log('');

const run = spawnSync(
  process.execPath,
  [toolEntry('vitest/vitest.mjs'), 'run', '--reporter=json', `--outputFile=${reportPath}`],
  { cwd: repoRoot, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
);

if (run.error) {
  console.error(`FATAL: could not run vitest: ${run.error.message}`);
  process.exit(2);
}

// A non-zero exit is expected while the baseline still lists failures, so the
// exit code is not the signal. A missing report is: it means vitest died
// before it could tell us anything.
if (!existsSync(reportPath)) {
  console.error(`FATAL: vitest exited ${run.status} without writing ${reportPath}`);
  console.error(`${run.stdout ?? ''}${run.stderr ?? ''}`.trim().slice(0, 4000));
  process.exit(2);
}

let report;
try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (err) {
  console.error(`FATAL: vitest report is not valid JSON: ${err.message}`);
  process.exit(2);
}

const toRepoPath = (absolute) => relative(repoRoot, absolute).split('\\').join('/');

const failingNow = new Set();
const failedAssertionsByFile = new Map();

for (const file of report.testResults ?? []) {
  const rel = toRepoPath(file.name);
  const failedAssertions = (file.assertionResults ?? []).filter((a) => a.status === 'failed').length;
  failedAssertionsByFile.set(rel, failedAssertions);
  // file.status covers both kinds of red: individual failed assertions, and
  // whole-file failures such as a collection error or a broken setup hook,
  // which report zero failed assertions.
  if (file.status === 'failed') failingNow.add(rel);
}

const baseline = readBaseline();
const allowed = baseline.tests?.failingFiles;
if (!Array.isArray(allowed)) {
  console.error('FATAL: baseline has no tests.failingFiles array');
  process.exit(2);
}
const allowedSet = new Set(allowed);

const newlyFailing = [...failingNow].filter((f) => !allowedSet.has(f)).sort();
const stale = allowed.filter((f) => !existsSync(join(repoRoot, f))).sort();
const nowGreen = allowed
  .filter((f) => existsSync(join(repoRoot, f)) && !failingNow.has(f))
  .sort();

console.log(`  test files run:      ${(report.testResults ?? []).length}`);
console.log(`  failing files now:   ${failingNow.size} (baseline ${allowed.length})`);
console.log(`  tests passed:        ${report.numPassedTests ?? 0}`);
console.log('');

let ok = true;

// --- Gate 1: no failures outside the baseline list --------------------------
if (newlyFailing.length > 0) {
  ok = false;
  console.log(`  FAIL: ${newlyFailing.length} test file(s) failing that are not on the baseline list:`);
  for (const file of newlyFailing) {
    const failed = failedAssertionsByFile.get(file) ?? 0;
    const detail = failed > 0 ? `${failed} failing test(s)` : 'whole-file failure (collection or hook error)';
    console.log(`    - ${file}  [${detail}]`);
  }
  console.log('');
  console.log('    These are new. Fix them; do not add them to scripts/ci/test-baseline.json.');
  console.log('');
} else {
  console.log('  OK: no failures outside the baseline list.');
}

// --- Gate 2: the baseline may not list files that no longer exist -----------
if (stale.length > 0) {
  ok = false;
  console.log('');
  console.log(`  FAIL: ${stale.length} baseline entr(ies) point at files that no longer exist:`);
  for (const file of stale) console.log(`    - ${file}`);
  console.log('');
  console.log('    Delete these lines from scripts/ci/test-baseline.json.');
}

// --- Gate 3: the number of failing files may not grow -----------------------
console.log('');
ok =
  reportCount(
    'failing test files',
    failingNow.size,
    allowed.length,
    'Drop the fixed files from tests.failingFiles in scripts/ci/test-baseline.json.'
  ) && ok;

// --- Advisory: total failing tests (nondeterministic, see header) -----------
const baselineFailedTests = baseline.tests?.failedTestCount;
if (typeof baselineFailedTests !== 'number') {
  console.error('FATAL: baseline has no tests.failedTestCount');
  process.exit(2);
}
const failedNow = report.numFailedTests ?? 0;
console.log(
  `  failing tests: ${failedNow} (baseline ${baselineFailedTests}, advisory only) -> ${
    failedNow > baselineFailedTests
      ? 'up'
      : failedNow < baselineFailedTests
        ? 'down'
        : 'unchanged'
  }`
);
if (failedNow > baselineFailedTests) {
  console.log('    NOTE: this number moves on its own between runs and does not fail the build.');
  console.log('    The gate above is the set of failing files. Check that list first.');
}

// --- Advisory: baseline files that are green again --------------------------
if (nowGreen.length > 0) {
  console.log('');
  console.log(`  NOTE: ${nowGreen.length} baseline file(s) now pass in full:`);
  for (const file of nowGreen) console.log(`    - ${file}`);
  console.log('');
  console.log('    Remove them from tests.failingFiles in scripts/ci/test-baseline.json');
  console.log('    so a future regression in these files fails CI.');
}

console.log('');
if (!ok) {
  console.log('Test ratchet FAILED.');
  process.exit(1);
}
console.log('Test ratchet passed.');
