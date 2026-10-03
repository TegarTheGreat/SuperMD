#!/usr/bin/env node
// Fails when the version recorded in package.json, CITATION.cff, and the Claude
// Code plugin manifests disagree, or when the changelog lacks that version.
// Zero dependencies; Node 18+.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
const json = p => JSON.parse(read(p));

const pkg = json('package.json').version;
const found = {
  'package.json': pkg,
  'CITATION.cff': (read('CITATION.cff').match(/^version:\s*(\S+)/m) || [])[1],
  'plugins/supermd/.claude-plugin/plugin.json': json('plugins/supermd/.claude-plugin/plugin.json').version,
  '.claude-plugin/marketplace.json (plugin entry)': json('.claude-plugin/marketplace.json').plugins[0].version,
  '.claude-plugin/marketplace.json (metadata)': json('.claude-plugin/marketplace.json').metadata.version,
};

const problems = Object.entries(found).filter(([, v]) => v !== pkg).map(([f, v]) => `${f} is ${v}, package.json is ${pkg}`);
if (!new RegExp(`^## \\[${pkg.replace(/\./g, '\\.')}\\]`, 'm').test(read('CHANGELOG.md'))) problems.push(`CHANGELOG.md has no "## [${pkg}]" entry`);

if (problems.length) { console.error('VERSION MISMATCH'); problems.forEach(p => console.error('  ' + p)); process.exit(1); }
console.log(`Versions in sync at ${pkg} (package, citation, plugin, marketplace, changelog).`);
