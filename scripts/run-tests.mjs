#!/usr/bin/env node
// `npm test`: every check the CI runs, in one portable command.
// Zero dependencies; Node 18+. Prints one line per step and exits 1 on the
// first failure, with that step's output.

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const node = (...args) => ['node', ...args];

const sources = [
  ...['bin', 'lib', 'scripts', 'eval'].flatMap(d => readdirSync(join(ROOT, d)).filter(f => f.endsWith('.mjs')).map(f => `${d}/${f}`)),
];

const steps = [
  ['syntax: every .mjs parses', () => sources.map(f => node('--check', f))],
  ['unit: slop scanner', () => [node('scripts/test-slop-scan.mjs')]],
  ['integration: CLI check / directory mode', () => [node('scripts/test-cli.mjs')]],
  ['integration: install / uninstall / status', () => [node('scripts/test-install.mjs')]],
  ['integration: MCP server', () => [node('scripts/test-mcp.mjs')]],
  ['structure: en/ and id/ parity and front matter', () => [node('scripts/check-parity.mjs')]],
  ['structure: versions in sync', () => [node('scripts/check-versions.mjs')]],
  ['structure: plugin files match the tree', () => [node('scripts/sync-plugin.mjs', '--check')]],
  ['self-check: en/ passes its own linter', () => [node('bin/supermd.mjs', 'check', 'en')]],
  ['self-check: id/ passes its own linter', () => [node('bin/supermd.mjs', 'check', 'id')]],
  ['self-check: front-door docs', () => ['README.md', 'README.id.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'AGENTS.md'].map(f => node('bin/supermd.mjs', 'check', f))],
];

let n = 0;
for (const [label, make] of steps) {
  for (const [cmd, ...args] of make()) {
    const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
    if (r.status !== 0) {
      console.error(`FAIL  ${label}\n$ ${cmd} ${args.join(' ')}\n${r.stdout}${r.stderr}`);
      process.exit(1);
    }
  }
  n++;
  console.log(`  ok  ${label}`);
}
console.log(`\nall ${n} checks pass`);
