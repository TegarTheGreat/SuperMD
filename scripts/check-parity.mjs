#!/usr/bin/env node
// Structural integrity of the bilingual tree. Fails (exit 1) when:
//   1. en/ and id/ do not contain the same set of .md paths
//   2. a module lacks required front matter (name, category, version, summary)
//   3. a domain module's `category` does not match its folder
//   4. an EN file and its ID mirror disagree on `category` or `version`
// Zero dependencies; Node 18+. Wrapped by scripts/check-parity.sh for CI.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED = ['name', 'category', 'version', 'summary'];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : []);
}

function frontmatter(file) {
  const m = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return fm;
}

const rel = (lang, f) => relative(join(ROOT, lang), f).split(sep).join('/');
const files = { en: walk(join(ROOT, 'en')).map(f => rel('en', f)).sort(), id: walk(join(ROOT, 'id')).map(f => rel('id', f)).sort() };
const problems = [];

const onlyEn = files.en.filter(f => !files.id.includes(f));
const onlyId = files.id.filter(f => !files.en.includes(f));
for (const f of onlyEn) problems.push(`only in en/: ${f}`);
for (const f of onlyId) problems.push(`only in id/: ${f}`);

for (const lang of ['en', 'id']) {
  for (const f of files[lang]) {
    const fm = frontmatter(join(ROOT, lang, f));
    if (!fm) { problems.push(`${lang}/${f}: missing front matter`); continue; }
    for (const k of REQUIRED) if (!fm[k]) problems.push(`${lang}/${f}: front matter lacks "${k}"`);
    const m = f.match(/^domains\/([^/]+)\//);
    if (m && !f.endsWith('_TEMPLATE.md') && fm.category && fm.category !== m[1]) problems.push(`${lang}/${f}: category "${fm.category}" does not match folder "${m[1]}"`);
  }
}

for (const f of files.en.filter(f => files.id.includes(f) && !f.endsWith('_TEMPLATE.md'))) {
  const a = frontmatter(join(ROOT, 'en', f)), b = frontmatter(join(ROOT, 'id', f));
  if (!a || !b) continue;
  if (a.category !== b.category) problems.push(`${f}: category differs (en "${a.category}" / id "${b.category}")`);
  if (a.version !== b.version) problems.push(`${f}: version differs (en ${a.version} / id ${b.version})`);
}

if (problems.length) {
  console.error('PARITY FAILURE');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`Parity OK: ${files.en.length} files mirrored in en/ and id/ with consistent front matter.`);
