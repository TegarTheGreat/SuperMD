#!/usr/bin/env node
// Integration tests for the `supermd check` CLI: language auto-detection and
// directory mode. Zero dependencies; exit 1 on any failure.

import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'bin', 'supermd.mjs');

let failures = 0;
function t(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failures++; console.error(`FAIL  ${name}\n      ${e.message}`); }
}
function run(args) {
  try {
    const out = execFileSync('node', [CLI, ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` };
  }
}

t('check auto-detects Indonesian without --lang', () => {
  const r = run(['check', 'id/core/01-language.md']);
  assert.equal(r.code, 0, r.out.slice(0, 300));
  assert.ok(r.out.includes(' id)') || r.out.includes('· id'), `expected id detection in: ${r.out.slice(0, 200)}`);
});

t('check auto-detects English without --lang', () => {
  const r = run(['check', 'en/core/01-language.md']);
  assert.equal(r.code, 0, r.out.slice(0, 300));
  assert.ok(r.out.includes(' en)') || r.out.includes('· en'), `expected en detection in: ${r.out.slice(0, 200)}`);
});

t('explicit --lang overrides auto-detection', () => {
  const r = run(['check', 'id/core/01-language.md', '--lang', 'en']);
  assert.ok(r.out.includes(' en)') || r.out.includes('· en'), `expected en in: ${r.out.slice(0, 200)}`);
});

t('directory mode: clean tree exits 0 with a summary', () => {
  const r = run(['check', 'en/docs']);
  assert.equal(r.code, 0, r.out.slice(0, 300));
  assert.ok(/\d+ files?/.test(r.out), `expected file summary in: ${r.out.slice(0, 200)}`);
});

t('directory mode: a file with hard slop fails the run and is named', () => {
  const dir = mkdtempSync(join(tmpdir(), 'supermd-test-'));
  try {
    writeFileSync(join(dir, 'clean.md'), 'The retry uses exponential backoff with a 2s base delay.\n');
    writeFileSync(join(dir, 'sloppy.md'), "Let's dive into this game-changer that will revolutionize everything.\n");
    const r = run(['check', dir]);
    assert.equal(r.code, 1, `expected exit 1, got ${r.code}: ${r.out.slice(0, 200)}`);
    assert.ok(r.out.includes('sloppy.md'), `expected sloppy.md named in: ${r.out.slice(0, 300)}`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log('\nall CLI tests pass');
