#!/usr/bin/env node
// Audit: which slop forms survive SuperMD? Reads an eval report and compares the
// baseline and SuperMD outputs per 1,000 words on forms the hard lexicon does not
// gate: contrast punchlines ("X is not A, it's B"), bold run-in labels
// ("**Term.** sentence"), rhetorical-question openers, and stacked transitions.
//
//   node eval/audit-residual.mjs [eval/results/<report>.md]
//
// Counts are crude by design (regex, no judgment) and bold run-in labels are often
// legitimate structure in specs and runbooks, so read the table as "what moved",
// not as a slop score. Code fences are excluded.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan, loadLexicon } from '../lib/slop-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(ROOT, 'eval', 'results');
const file = process.argv[2] || join(dir, readdirSync(dir).filter(f => /deepseek-chat\.md$/.test(f)).sort().at(-1));
const report = readFileSync(file, 'utf8');
const lexicon = loadLexicon(ROOT);

const outputs = report.split('## Outputs')[1] || '';
const sections = outputs.split(/\n### /).slice(1);
const FORMS = {
  'contrast punchline': text => (scan(text, 'en', lexicon).soft.find(h => h.name === 'contrast-punchline') || { count: 0 }).count,
  'bold run-in label': text => (text.match(/^(?:[-*\d.]+\s*)?\*\*[^*\n]{2,45}[.:]\*\*\s+\S/gm) || []).length,
  'rhetorical-question opener': text => (text.match(/(?:^|\n\n)[A-Z][^.\n]{5,80}\?\s/g) || []).length,
  'stacked transition opener': text => (text.match(/(?:^|\. )(?:However|Moreover|Furthermore|Additionally|That said|In addition),/gm) || []).length,
};

const tot = Object.fromEntries(Object.keys(FORMS).map(k => [k, { baseline: 0, supermd: 0 }]));
const words = { baseline: 0, supermd: 0 };
for (const sec of sections) {
  const id = sec.split('\n')[0].trim();
  if (id.startsWith('id-')) continue; // English forms only
  const b = sec.indexOf('**baseline:**'), s = sec.indexOf('**supermd:**');
  if (b === -1 || s === -1) continue;
  for (const [label, from, to] of [['baseline', b, s], ['supermd', s, sec.length]]) {
    const part = sec.slice(from, to);
    const start = part.indexOf('```text\n') + 8, end = part.lastIndexOf('\n```');
    if (start < 8 || end <= start) continue;
    const text = part.slice(start, end).replace(/```[\s\S]*?```/g, '');
    words[label] += text.split(/\s+/).filter(Boolean).length;
    for (const [k, fn] of Object.entries(FORMS)) tot[k][label] += fn(text);
  }
}

console.log(`${file.replace(ROOT + '/', '')}: ${words.baseline} baseline words, ${words.supermd} SuperMD words (English scenarios)\n`);
console.log('| form | baseline count | SuperMD count | baseline per 1k words | SuperMD per 1k words |');
console.log('|---|---|---|---|---|');
for (const [k, v] of Object.entries(tot)) {
  console.log(`| ${k} | ${v.baseline} | ${v.supermd} | ${(1000 * v.baseline / words.baseline).toFixed(2)} | ${(1000 * v.supermd / words.supermd).toFixed(2)} |`);
}
