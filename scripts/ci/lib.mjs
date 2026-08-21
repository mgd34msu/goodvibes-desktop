// ============================================================================
// CI RATCHET SHARED HELPERS
// ============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(here, '..', '..');
export const baselinePath = join(here, 'test-baseline.json');

export function readBaseline() {
  if (!existsSync(baselinePath)) {
    console.error(`FATAL: baseline file not found at ${baselinePath}`);
    process.exit(2);
  }
  try {
    return JSON.parse(readFileSync(baselinePath, 'utf8'));
  } catch (err) {
    console.error(`FATAL: baseline file is not valid JSON: ${err.message}`);
    process.exit(2);
  }
}

// Resolve a dependency's JS entry point so the ratchets can run it with
// `node <entry>` instead of the node_modules/.bin shim. The shims are
// shell scripts on Linux and .cmd files on Windows, which would force
// shell:true; going straight to the entry point avoids that entirely.
export function toolEntry(relativePath) {
  const full = join(repoRoot, 'node_modules', relativePath);
  if (!existsSync(full)) {
    console.error(`FATAL: expected ${full} to exist. Run \`npm ci\` first.`);
    process.exit(2);
  }
  return full;
}

export function heading(text) {
  console.log('');
  console.log('='.repeat(76));
  console.log(`  ${text}`);
  console.log('='.repeat(76));
}

// Compare a measured count against its baseline. Over baseline is a hard
// failure; under baseline is the ratchet working, and the developer is told
// to lower the recorded number so the gain cannot be given back later.
export function reportCount(label, current, base, improvedHint) {
  const verdict =
    current > base ? 'OVER BASELINE' : current < base ? 'improved' : 'unchanged';
  console.log(
    `  ${label}: ${current} (baseline ${base}) -> ${verdict}`
  );
  if (current > base) {
    console.log(
      `    FAIL: ${label} went up by ${current - base}. Fix the new problems or they stay in the build.`
    );
    return false;
  }
  if (current < base) {
    const hint =
      improvedHint ?? `Lower it to ${current} in scripts/ci/test-baseline.json.`;
    console.log(`    NOTE: ${label} dropped by ${base - current}. ${hint}`);
  }
  return true;
}
