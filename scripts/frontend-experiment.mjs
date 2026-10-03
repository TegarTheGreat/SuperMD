#!/usr/bin/env node
// Frontend anti-slop experiment: the same two frontend prompts, with and without
// SuperMD (core + the Frontend Engineering module), on two generators.
//
//   node scripts/frontend-experiment.mjs generate <dir> [--no-claude]
//   node scripts/frontend-experiment.mjs analyze <dir...> [--montage out.png]
//
// `generate` needs DEEPSEEK_API_KEY and, unless --no-claude, the `claude` CLI.
// It makes 8 requests (2 prompts x 2 generators x 2 conditions) and saves the raw
// outputs plus meta.json. `analyze` renders each landing page in Chromium
// (Playwright, dev-only: `npm i --no-save playwright`), measures it, and prints a
// Markdown table. Recorded runs live in docs/evidence/frontend/.
//
// What it measures is deliberately narrow and countable: emoji used as icons,
// hard slop hits from `supermd check` on the visible text, CSS gradients, inline
// SVG icons, unsupported claims in the copy, labeled placeholders, and (for the
// component prompt) which interface states and accessibility hooks appear in
// the code. It does not score visual taste.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compose } from '../lib/compose.mjs';
import { scan, loadLexicon, hardTotal, softTotal } from '../lib/slop-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'bin', 'supermd.mjs');

const TASKS = [
  { id: 'landing', prompt: 'Create a single-file HTML landing page (inline CSS and JS only, no external assets or fonts) for Taskly, a project management tool for small teams. Include a hero, features, pricing, and a footer. Output only the HTML.' },
  { id: 'table', prompt: 'Write a React component `UserTable` that shows a list of users fetched from /api/users, with sorting by name and pagination. Output the component code.' },
];
const GENERATORS = ['deepseek', 'claude'];
const CONDITIONS = ['without', 'with'];

// ------------------------------------------------------------------ generate
async function deepseek(system, prompt) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 6000, temperature: 0, messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).choices[0].message.content;
}

function claude(cwd, prompt) {
  let last = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = spawnSync('claude', ['-p', prompt, '--tools', '', '--disable-slash-commands', '--output-format', 'json'], { cwd, encoding: 'utf8', timeout: 400000, maxBuffer: 64 * 1024 * 1024 });
    if (r.status === 0) {
      const j = JSON.parse(r.stdout);
      if (!j.is_error) return String(j.result);
      last = `is_error: ${String(j.result).slice(0, 300)}`;
    } else last = `status ${r.status}: ${(r.stderr || r.stdout || '').slice(0, 300)}`;
    process.stderr.write(`  claude attempt ${attempt} failed: ${last}\n`);
  }
  throw new Error(last);
}

async function generate(dir, { useClaude }) {
  mkdirSync(dir, { recursive: true });
  const prompt = compose({ field: 'frontend', lang: 'en' }, ROOT).prompt;
  const frontendVersion = (readFileSync(join(ROOT, 'en', 'domains', 'technology', 'frontend.md'), 'utf8').match(/^version:\s*(\S+)/m) || [])[1];
  const bare = mkdtempSync(join(tmpdir(), 'fe-without-'));
  const withDir = mkdtempSync(join(tmpdir(), 'fe-with-'));
  execFileSync('node', [CLI, 'install', 'claude-code', '--field', 'frontend', '--dir', withDir], { stdio: 'ignore' });
  try {
    for (const t of TASKS) for (const g of GENERATORS) {
      if (g === 'claude' && !useClaude) continue;
      for (const c of CONDITIONS) {
        process.stderr.write(`${t.id} / ${g} / ${c} …\n`);
        const text = g === 'deepseek' ? await deepseek(c === 'with' ? prompt : null, t.prompt) : claude(c === 'with' ? withDir : bare, t.prompt);
        writeFileSync(join(dir, `${t.id}.${g}.${c}.txt`), text);
      }
    }
  } finally { rmSync(bare, { recursive: true, force: true }); rmSync(withDir, { recursive: true, force: true }); }
  const claudeVersion = useClaude ? execFileSync('claude', ['--version'], { encoding: 'utf8' }).trim() : null;
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({
    recordedAt: new Date().toISOString(), supermd: JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version,
    frontendModuleVersion: frontendVersion, deepseekModel: 'deepseek-chat (temperature 0)', claudeCode: claudeVersion, tasks: TASKS,
  }, null, 2) + '\n');
}

// ------------------------------------------------------------------- analyze
async function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { /* fall through */ }
  try { return await import('playwright'); } catch { /* fall through */ }
  return createRequire(join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'x.js'))('playwright');
}

const fence = (text, lang) => { const m = text.match(new RegExp('```' + lang + '\\n([\\s\\S]*?)```')); return m ? m[1] : text; };
const CLAIMS = /no credit card|cancel anytime|free forever|(?:set up|setup|launch|running) in (?:under )?\w+ minutes|takes? \w+ minutes|in minutes|thousands of|trusted by|loved by|\d+ ?% (?:faster|more|less)/gi;

const STATES = {
  loading: /loading|isLoading|spinner|skeleton/i, error: /error|catch|isError/i,
  empty: /no users|empty|length === 0|!users\.length|users\.length\s*===\s*0/i, disabled: /disabled/,
  'aria-sort': /aria-sort/, 'aria-label or role': /aria-label|role=/, 'focus style': /focus|:focus-visible/,
  'fetch cleanup': /AbortController|cancelled|ignore|cleanup|return \(\) =>/i, 'res.ok check': /\.ok\b/,
  'keyboard (button or onKey)': /<button|onKeyDown/i,
};

async function analyzeDir(dir, browser, lexicon) {
  const rows = [];
  for (const g of GENERATORS) for (const c of CONDITIONS) {
    const f = join(dir, `landing.${g}.${c}.txt`);
    if (!existsSync(f)) continue;
    const html = fence(readFileSync(f, 'utf8'), 'html');
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.setContent(html, { waitUntil: 'load' });
    const info = await page.evaluate(() => ({ text: document.body.innerText, svg: document.querySelectorAll('svg').length, h1: (document.querySelector('h1') || {}).innerText || '', height: document.documentElement.scrollHeight }));
    await page.close();
    const hits = scan(info.text, 'en', lexicon);
    const emojiIcons = (info.text.match(/\p{Extended_Pictographic}/gu) || []).filter(ch => ![0xA9, 0xAE, 0x2122].includes(ch.codePointAt(0))).length;
    rows.push({
      generator: g, condition: c, h1: info.h1.replace(/\s+/g, ' '), hard: hardTotal(hits), soft: softTotal(hits), emojiIcons,
      gradients: (html.match(/gradient\(/g) || []).length, svgIcons: info.svg, claims: (info.text.match(CLAIMS) || []).length,
      prices: (info.text.match(/\$\d+/g) || []).length, placeholders: (info.text.match(/\[confirm[^\]]*\]/gi) || []).length,
      height: info.height, file: f,
    });
  }
  const table = [];
  for (const g of GENERATORS) for (const c of CONDITIONS) {
    const f = join(dir, `table.${g}.${c}.txt`);
    if (!existsSync(f)) continue;
    const code = readFileSync(f, 'utf8');
    const hit = Object.entries(STATES).filter(([, re]) => re.test(code)).map(([k]) => k);
    table.push({ generator: g, condition: c, covered: hit.length, total: Object.keys(STATES).length, missing: Object.keys(STATES).filter(k => !hit.includes(k)) });
  }
  return { rows, table };
}

async function montage(dir, out, browser) {
  const tmp = mkdtempSync(join(tmpdir(), 'fe-montage-'));
  const shots = [];
  for (const g of GENERATORS) for (const c of CONDITIONS) {
    const f = join(dir, `landing.${g}.${c}.txt`);
    if (!existsSync(f)) continue;
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.setContent(fence(readFileSync(f, 'utf8'), 'html'), { waitUntil: 'load' });
    const png = join(tmp, `${g}.${c}.png`);
    await page.screenshot({ path: png, fullPage: true });
    await page.close();
    shots.push({ label: `${g === 'claude' ? 'Claude Code' : 'DeepSeek'} · ${c === 'with' ? 'with SuperMD' : 'without SuperMD'}`, png, tone: c });
  }
  const html = `<body style="margin:0;background:#0b0f17;font-family:'DejaVu Sans',sans-serif"><div style="display:flex;gap:10px;padding:14px">${shots.map(s => `<div style="width:480px"><div style="color:${s.tone === 'with' ? '#7ee787' : '#ff7b72'};font:700 13px 'DejaVu Sans',sans-serif;letter-spacing:.5px;text-transform:uppercase;padding:2px 2px 8px">${s.label}</div><div style="height:1180px;overflow:hidden;border:1px solid #30363d;border-radius:8px;background:#fff"><img src="${pathToFileURL(s.png)}" style="width:480px;display:block"></div></div>`).join('')}</div></body>`;
  writeFileSync(join(tmp, 'montage.html'), html);
  const page = await browser.newPage({ viewport: { width: 2000, height: 1260 } });
  await page.goto(pathToFileURL(join(tmp, 'montage.html')).href);
  await page.waitForTimeout(500);
  await page.screenshot({ path: out });
  await page.close();
  rmSync(tmp, { recursive: true, force: true });
}

async function analyze(dirs, montageOut) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const lexicon = loadLexicon(ROOT);
  try {
    for (const dir of dirs) {
      const meta = existsSync(join(dir, 'meta.json')) ? JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')) : {};
      const { rows, table } = await analyzeDir(dir, browser, lexicon);
      console.log(`\n### ${dir} — frontend module ${meta.frontendModuleVersion || '?'}, recorded ${(meta.recordedAt || '').slice(0, 10)}\n`);
      console.log('| generator | condition | headline | hard slop | emoji icons | gradients | SVG icons | unsupported claims | prices | `[confirm]` placeholders |');
      console.log('|---|---|---|---|---|---|---|---|---|---|');
      for (const r of rows) console.log(`| ${r.generator} | ${r.condition} | ${r.h1} | ${r.hard} | ${r.emojiIcons} | ${r.gradients} | ${r.svgIcons} | ${r.claims} | ${r.prices} | ${r.placeholders} |`);
      console.log('\n| generator | condition | states and accessibility hooks present | missing |');
      console.log('|---|---|---|---|');
      for (const t of table) console.log(`| ${t.generator} | ${t.condition} | ${t.covered}/${t.total} | ${t.missing.join(', ') || '—'} |`);
    }
    if (montageOut) await montage(resolve(dirs[dirs.length - 1]), resolve(montageOut), browser);
  } finally { await browser.close(); }
}

// ---------------------------------------------------------------------- main
const [cmd, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter(a => a.startsWith('--')));
const montageIdx = rest.indexOf('--montage');
const montageOut = montageIdx === -1 ? null : rest[montageIdx + 1];
const positional = rest.filter((a, i) => !a.startsWith('--') && i !== montageIdx + 1);

if (cmd === 'generate' && positional[0]) await generate(resolve(positional[0]), { useClaude: !flags.has('--no-claude') });
else if (cmd === 'analyze' && positional.length) await analyze(positional.map(p => resolve(p)), montageOut);
else { console.error('usage: frontend-experiment.mjs generate <dir> [--no-claude] | analyze <dir...> [--montage out.png]'); process.exit(2); }
