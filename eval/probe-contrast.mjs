#!/usr/bin/env node
// Probe: does a change to the core wording reduce contrast punchlines
// ("X is not a strategy, it's the absence of one")? The eval suite samples at
// temperature 0, which hides the rate a real user sees, so this probe samples
// each critique-style prompt several times at a normal temperature and counts the
// pattern with the same detector `supermd check` uses.
//
//   node eval/probe-contrast.mjs --a <core> --b <core> [--n 6] [--temp 0.7] [--out file.json]
//
// <core> is a path, or `git:REV` for en/SUPERMD.md at a git revision. Uses the same
// environment as run-eval.mjs (DEEPSEEK_API_KEY, SUPERMD_EVAL_BASE_URL, models).
// Prompts are critique, decision, and diagnosis requests, where the tic appears.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan, loadLexicon } from '../lib/slop-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i === -1 ? dflt : args[i + 1]; };

const BASE_URL = (process.env.SUPERMD_EVAL_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
const MODEL = process.env.SUPERMD_GEN_MODEL || 'deepseek-chat';
const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) { console.error('DEEPSEEK_API_KEY not set.'); process.exit(2); }

const PROMPTS = [
  'I plan to build a social network for pet owners with a $5,000 budget in 6 months, no niche, and no marketing: we rely on virality. Give me your honest assessment.',
  'We are rewriting our monolith as 40 microservices in 6 months with 3 engineers. Review the plan.',
  'My manager says remote work kills productivity. Is he right?',
  'Our signups are up 30% but revenue is flat. Why might growth have stalled?',
  'Is Kubernetes necessary for a 3-person startup?',
  'Critique this tagline for a bank: "We make money better."',
  'Should a junior developer learn Rust or Go first?',
  'Our team wants to skip code review to ship faster. Is that a good idea?',
];

const loadCore = spec => (spec.startsWith('git:')
  ? execFileSync('git', ['show', `${spec.slice(4)}:en/SUPERMD.md`], { cwd: ROOT, encoding: 'utf8' })
  : readFileSync(spec, 'utf8'));

async function chat(system, prompt, temperature) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, temperature, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
    });
    if (res.ok) return (await res.json()).choices[0].message.content;
    if (attempt === 4) throw new Error(`HTTP ${res.status}`);
    await new Promise(r => setTimeout(r, 2500 * attempt));
  }
}

const lexicon = loadLexicon(ROOT);
const n = +opt('n', 6), temp = +opt('temp', 0.7);
const cores = { a: loadCore(opt('a', 'git:HEAD')), b: loadCore(opt('b', join(ROOT, 'en', 'SUPERMD.md'))) };
const stats = { a: { punch: 0, words: 0, hard: 0, outputs: 0 }, b: { punch: 0, words: 0, hard: 0, outputs: 0 } };
const samples = [];

const jobs = [];
for (const p of PROMPTS) for (let i = 0; i < n; i++) for (const c of ['a', 'b']) jobs.push({ p, c });
const queue = [...jobs];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const { p, c } = queue.shift();
    const text = await chat(cores[c], p, temp);
    const hits = scan(text, 'en', lexicon);
    const punch = (hits.soft.find(h => h.name === 'contrast-punchline') || { count: 0 }).count;
    const s = stats[c];
    s.punch += punch; s.words += text.split(/\s+/).filter(Boolean).length; s.hard += hits.hard.reduce((k, h) => k + h.count, 0); s.outputs++;
    if (punch) samples.push({ cond: c, prompt: p, sample: hits.soft.find(h => h.name === 'contrast-punchline').sample });
  }
}));

console.log(`model ${MODEL}, temperature ${temp}, ${PROMPTS.length} prompts x ${n} samples per condition\n`);
console.log('| condition | outputs | words | punchlines | per 1k words | outputs with one or more | hard slop |');
console.log('|---|---|---|---|---|---|---|');
for (const c of ['a', 'b']) {
  const s = stats[c];
  const withAny = new Set(samples.filter(x => x.cond === c).map(x => x.prompt)).size;
  console.log(`| ${c === 'a' ? 'A (before)' : 'B (after)'} | ${s.outputs} | ${s.words} | ${s.punch} | ${(1000 * s.punch / s.words).toFixed(2)} | n/a (${withAny} of ${PROMPTS.length} prompts) | ${s.hard} |`);
}
const out = opt('out');
if (out) writeFileSync(out, JSON.stringify({ model: MODEL, temperature: temp, n, stats, samples }, null, 2) + '\n');
