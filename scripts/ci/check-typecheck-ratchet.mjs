#!/usr/bin/env node
// ============================================================================
// TYPECHECK RATCHET
// ============================================================================
// Runs both tsc projects, counts the diagnostics each one reports, and
// compares those counts against the recorded baseline. Over baseline fails.
// ============================================================================

import { spawnSync } from 'node:child_process';
import { heading, readBaseline, repoRoot, reportCount, toolEntry } from './lib.mjs';

const PROJECTS = [
  { label: 'tsconfig.json', args: ['--noEmit'] },
  { label: 'tsconfig.node.json', args: ['-p', 'tsconfig.node.json', '--noEmit'] },
];

// A tsc diagnostic starts at column 0 as `file(line,col): error TS1234: ...`.
// Continuation lines of a multi-line diagnostic are indented, so anchoring on
// a non-whitespace first character counts each diagnostic exactly once.
const DIAGNOSTIC = /^\S.*\berror TS\d+:/;

function countErrors(args) {
  const result = spawnSync(process.execPath, [toolEntry('typescript/bin/tsc'), ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });

  if (result.error) {
    console.error(`FATAL: could not run tsc: ${result.error.message}`);
    process.exit(2);
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const count = output.split('\n').filter((line) => DIAGNOSTIC.test(line)).length;

  // tsc exits 0 clean and 2 when it reported diagnostics. Any other non-zero
  // exit with nothing parseable means tsc itself broke, which must not be
  // mistaken for "zero type errors".
  if (count === 0 && result.status !== 0) {
    console.error(`FATAL: tsc exited ${result.status} without reporting diagnostics:`);
    console.error(output.trim().slice(0, 4000));
    process.exit(2);
  }

  return { count, output };
}

heading('Typecheck ratchet');

const baseline = readBaseline();
let ok = true;

for (const project of PROJECTS) {
  const base = baseline.typecheck?.[project.label];
  if (typeof base !== 'number') {
    console.error(`FATAL: baseline has no typecheck count for ${project.label}`);
    process.exit(2);
  }

  const { count, output } = countErrors(project.args);
  ok = reportCount(project.label, count, base) && ok;

  if (count > base) {
    console.log('');
    console.log(`  --- last 40 diagnostics from ${project.label} ---`);
    const lines = output.split('\n').filter((line) => DIAGNOSTIC.test(line));
    for (const line of lines.slice(-40)) console.log(`    ${line}`);
    console.log('');
  }
}

console.log('');
if (!ok) {
  console.log('Typecheck ratchet FAILED.');
  process.exit(1);
}
console.log('Typecheck ratchet passed.');
