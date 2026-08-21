#!/usr/bin/env node
// ============================================================================
// LINT RATCHET
// ============================================================================
// eslint's own --max-warnings flag cannot gate this repo: there is a
// pre-existing severity-2 error (no-useless-escape in src/main/utils/
// pathResolver.ts), and eslint exits non-zero for that error no matter what
// the warning cap is set to. So errors and warnings are counted separately
// here and each is held at or below its recorded baseline.
// ============================================================================

import { spawnSync } from 'node:child_process';
import { heading, readBaseline, repoRoot, reportCount, toolEntry } from './lib.mjs';

// Same target as the `lint` script in package.json, so the counts here and the
// counts a developer sees from `npm run lint` describe the same run.
const ESLINT_ARGS = ['src', '--ext', '.ts,.tsx', '-f', 'json'];

heading('Lint ratchet');

const run = spawnSync(process.execPath, [toolEntry('eslint/bin/eslint.js'), ...ESLINT_ARGS], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 256 * 1024 * 1024,
});

if (run.error) {
  console.error(`FATAL: could not run eslint: ${run.error.message}`);
  process.exit(2);
}

// eslint exits 1 whenever it reports an error, which is the normal state of
// this repo today. It exits 2 for its own failures (bad config, bad glob), and
// in that case there is no JSON on stdout to parse.
let results;
try {
  results = JSON.parse(run.stdout);
} catch {
  console.error(`FATAL: eslint exited ${run.status} without producing a JSON report:`);
  console.error(`${run.stdout ?? ''}${run.stderr ?? ''}`.trim().slice(0, 4000));
  process.exit(2);
}

let errors = 0;
let warnings = 0;
let filesWithProblems = 0;

for (const file of results) {
  errors += file.errorCount;
  warnings += file.warningCount;
  if (file.errorCount + file.warningCount > 0) filesWithProblems += 1;
}

const baseline = readBaseline();
const baseErrors = baseline.lint?.errors;
const baseWarnings = baseline.lint?.warnings;
if (typeof baseErrors !== 'number' || typeof baseWarnings !== 'number') {
  console.error('FATAL: baseline has no lint.errors / lint.warnings counts');
  process.exit(2);
}

console.log(`  files linted:        ${results.length}`);
console.log(`  files with problems: ${filesWithProblems}`);
console.log('');

let ok = reportCount('eslint errors', errors, baseErrors);
ok = reportCount('eslint warnings', warnings, baseWarnings) && ok;

if (errors > baseErrors || warnings > baseWarnings) {
  console.log('');
  console.log('  --- problems by rule ---');
  const byRule = new Map();
  for (const file of results) {
    for (const message of file.messages) {
      const key = `${message.severity === 2 ? 'error' : 'warn '} ${message.ruleId ?? '(no rule)'}`;
      byRule.set(key, (byRule.get(key) ?? 0) + 1);
    }
  }
  for (const [rule, count] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(count).padStart(5)}  ${rule}`);
  }
}

console.log('');
if (!ok) {
  console.log('Lint ratchet FAILED.');
  process.exit(1);
}
console.log('Lint ratchet passed.');
