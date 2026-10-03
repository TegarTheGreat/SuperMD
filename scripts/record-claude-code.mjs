#!/usr/bin/env node
// Records a LIVE A/B run through the real Claude Code CLI and saves it as
// evidence for the README: the same prompt, once in an empty project and once
// in a project where `supermd install claude-code` wrote the CLAUDE.md block.
//
//   node scripts/record-claude-code.mjs [--field software-engineering] [--model <alias>]
//
// Requires the `claude` CLI on PATH and working credentials. It makes four
// short, tool-less requests (two prompts x two conditions). Output:
//   docs/evidence/claude-code-live.json
// scripts/make-screenshots.mjs renders that file; it never re-calls the API.
// One sample per condition is an illustration, not a statistic — the
// statistical evidence is the eval suite in eval/.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan, loadLexicon, hardTotal, softTotal } from '../lib/slop-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'bin', 'supermd.mjs');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i === -1 ? dflt : args[i + 1]; };

const FIELD = opt('field', 'software-engineering');
const MODEL = opt('model');
const PROMPTS = [
  { id: 'teamwork-essay', prompt: 'Write about the importance of teamwork in the workplace.' },
  { id: 'db-indexing', prompt: 'Explain what database indexing is and when I should add an index.' },
];

const claudeVersion = execFileSync('claude', ['--version'], { encoding: 'utf8' }).trim();
const lexicon = loadLexicon(ROOT);

function ask(cwd, prompt) {
  const a = ['-p', prompt, '--tools', '', '--disable-slash-commands', '--output-format', 'json'];
  if (MODEL) a.push('--model', MODEL);
  const raw = execFileSync('claude', a, { cwd, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  const j = JSON.parse(raw);
  if (j.is_error) throw new Error(`claude returned an error: ${j.result}`);
  return { text: String(j.result).trim(), model: Object.keys(j.modelUsage || {}).join(', ') || 'unknown' };
}

const stats = text => {
  const hits = scan(text, 'en', lexicon);
  return { words: text.split(/\s+/).filter(Boolean).length, hard: hardTotal(hits), soft: softTotal(hits), patterns: hits.hard.map(h => h.name) };
};

const without = mkdtempSync(join(tmpdir(), 'supermd-cc-without-'));
const withDir = mkdtempSync(join(tmpdir(), 'supermd-cc-with-'));
try {
  const installLog = execFileSync('node', [CLI, 'install', 'claude-code', '--field', FIELD, '--dir', withDir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const installed = readFileSync(join(withDir, 'CLAUDE.md'), 'utf8');
  const runs = [];
  for (const p of PROMPTS) {
    process.stderr.write(`running ${p.id} …\n`);
    const base = ask(without, p.prompt);
    const smd = ask(withDir, p.prompt);
    runs.push({ ...p, without: { ...base, ...stats(base.text) }, with: { ...smd, ...stats(smd.text) } });
  }
  const evidence = {
    recordedAt: new Date().toISOString(),
    claudeCode: claudeVersion,
    supermd: JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version,
    field: FIELD,
    installed: { file: 'CLAUDE.md', bytes: Buffer.byteLength(installed) },
    note: 'One sample per condition, tool-less, default settings. An illustration, not a statistic; see eval/ for the statistical evidence.',
    runs,
  };
  mkdirSync(join(ROOT, 'docs', 'evidence'), { recursive: true });
  writeFileSync(join(ROOT, 'docs', 'evidence', 'claude-code-live.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(installLog.trim());
  for (const r of runs) console.log(`${r.id}: words ${r.without.words} -> ${r.with.words}, hard ${r.without.hard} -> ${r.with.hard} (model ${r.with.model})`);
} finally {
  rmSync(without, { recursive: true, force: true });
  rmSync(withDir, { recursive: true, force: true });
}
