#!/usr/bin/env node
// Frontend anti-slop experiment: does SuperMD make generated UI better, or just
// plainer? The same prompts run with and without SuperMD (core + the Frontend
// Engineering module, at any git revision), on two generators, and the pages are
// measured and judged.
//
//   node scripts/frontend-experiment.mjs generate <dir> [--set train|test|all]
//        [--gen deepseek,claude] [--cond baseline,v2=WORKTREE,v1.1=7e7b18b] [--force]
//   node scripts/frontend-experiment.mjs analyze  <dir> [--set train|test|all]
//   node scripts/frontend-experiment.mjs judge    <dir> --subject v2 --against baseline,v1.1
//        [--set test] [--gen claude,deepseek]
//   node scripts/frontend-experiment.mjs montage  <dir> --prompt saas --out file.png
//
// `generate` needs DEEPSEEK_API_KEY (deepseek) and/or the `claude` CLI (claude).
// `analyze`, `judge` and `montage` render pages in Chromium (Playwright) and need
// `npm i --no-save playwright axe-core` (dev-only; the package has no runtime
// dependencies). `judge` asks Claude, blind and in both orders, to compare two
// rendered pages. A condition is `name` (no SuperMD) or `name=REV`: SuperMD as it
// was at git revision REV, or WORKTREE for the files on disk.
//
// Measured: emoji used as icons, hard slop on the visible text, gradients, SVG
// icons, unsupported claims, labeled placeholders, axe-core accessibility
// violations, horizontal overflow at 375px, console errors, and a few craft
// signals (focus styles, reduced-motion support, landmarks, design tokens). The
// judge covers what counts cannot: hierarchy, polish, credibility, and whether
// the page looks designed or templated.

import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { compose, stripFrontmatter } from '../lib/compose.mjs';
import { planInstall, applyPlan } from '../lib/harnesses.mjs';
import { scan, loadLexicon, hardTotal, softTotal } from '../lib/slop-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
// Generated pages often simulate a loading state before rendering sample data (a
// dashboard showed skeletons for ~1.2s), so every measurement and screenshot waits.
// Waits for simulated loading, then scrolls the whole page once so scroll-triggered
// reveals (IntersectionObserver fade-ins) have fired, then returns to the top.
// Without this, a full-page screenshot shows such sections as blank gaps and the
// comparison unfairly penalizes the pages that use them.
async function settle(page) {
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.6));
    for (let y = 0; y < document.documentElement.scrollHeight + step; y += step) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1000);
}

const NO_EXT = 'inline CSS and JS only, no external assets or fonts';

export const PROMPTS = {
  // train: used while writing the module
  saas: { set: 'train', kind: 'page', text: `Create a single-file HTML landing page (${NO_EXT}) for Taskly, a project management tool for small teams. Include a hero, features, pricing, and a footer. Output only the HTML.` },
  dashboard: { set: 'train', kind: 'page', text: `Create a single-file HTML dashboard page (${NO_EXT}) for an on-call engineer: service health, error rate and latency over the last 24 hours, and a recent incidents table. Use sample data. Output only the HTML.` },
  cafe: { set: 'train', kind: 'page', text: `Create a single-file HTML website (${NO_EXT}) for Ladang Kopi, a small neighborhood coffee shop in Bandung: hero, menu, opening hours, location, and contact. Output only the HTML.` },
  settings: { set: 'train', kind: 'page', text: `Create a single-file HTML page (${NO_EXT}) with an account settings form: profile, email, password change, notification preferences, and a danger zone for deleting the account. Include client-side validation. Output only the HTML.` },
  // test: held out, never used to tune the module
  meetup: { set: 'test', kind: 'page', text: `Create a single-file HTML page (${NO_EXT}) for Jakarta Rust Night, a monthly community meetup: schedule, speakers, venue, and an RSVP form. Output only the HTML.` },
  orders: { set: 'test', kind: 'page', text: `Create a single-file HTML admin page (${NO_EXT}) with an orders table: search, status filter, sortable columns, pagination, and a detail drawer. Use sample data. Output only the HTML.` },
  // engineering check, scored by keyword presence
  table: { set: 'code', kind: 'code', text: 'Write a React component `UserTable` that shows a list of users fetched from /api/users, with sorting by name and pagination. Output the component code.' },
};

// ----------------------------------------------------------------- argument parsing
const [cmd, dirArg, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(`--${name}`); return i === -1 ? dflt : rest[i + 1]; };
const flag = name => rest.includes(`--${name}`);
const list = (v) => String(v).split(',').map(s => s.trim()).filter(Boolean);
const promptIds = () => {
  const set = opt('set', 'train');
  const only = opt('prompt');
  return Object.entries(PROMPTS).filter(([id, p]) => (only ? list(only).includes(id) : set === 'all' ? true : p.set === set || (set === 'train' && p.set === 'code'))).map(([id]) => id);
};
const parseConds = () => list(opt('cond', 'baseline,smd=WORKTREE')).map(c => { const [name, rev] = c.split('='); return { name, rev: rev || null }; });

// ------------------------------------------------------------------------- generate
function promptAt(rev) {
  if (rev === 'WORKTREE') return compose({ field: 'frontend', lang: 'en' }, ROOT).prompt;
  const show = p => stripFrontmatter(execFileSync('git', ['show', `${rev}:${p}`], { cwd: ROOT, encoding: 'utf8' }).trimEnd());
  return ['en/SUPERMD.md', 'en/domains/technology/_category.md', 'en/domains/technology/frontend.md'].map(show).join('\n\n');
}

async function deepseek(system, prompt) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 8000, temperature: 0, messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }] }),
    });
    if (res.ok) return (await res.json()).choices[0].message.content;
    if (attempt === 3) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 2000 * attempt));
  }
}

async function claude(cwd, prompt, extra = []) {
  let last = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const { stdout } = await run('claude', ['-p', prompt, '--disable-slash-commands', '--output-format', 'json', ...extra], { cwd, timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
      const j = JSON.parse(stdout);
      if (!j.is_error) return String(j.result);
      last = `is_error: ${String(j.result).slice(0, 200)}`;
    } catch (e) { last = `${e.code || e.signal}: ${String(e.stderr || e.message).slice(0, 200)}`; }
    process.stderr.write(`  claude attempt ${attempt} failed: ${last}\n`);
  }
  throw new Error(last);
}

async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => { while (queue.length) await fn(queue.shift()); }));
}

async function generate(dir) {
  mkdirSync(dir, { recursive: true });
  const conds = parseConds(), gens = list(opt('gen', 'deepseek,claude')), prompts = promptIds();
  const sys = Object.fromEntries(conds.filter(c => c.rev).map(c => [c.name, promptAt(c.rev)]));
  const claudeDirs = {};
  for (const c of conds) {
    const d = mkdtempSync(join(tmpdir(), `fe-${c.name}-`));
    if (c.rev) applyPlan(planInstall(['claude-code'], { prompt: sys[c.name], meta: { v: 'experiment' }, dir: d }).items, { root: d });
    claudeDirs[c.name] = d;
  }
  const jobs = [];
  for (const id of prompts) for (const g of gens) for (const c of conds) {
    const out = join(dir, `${id}.${g}.${c.name}.txt`);
    if (existsSync(out) && !flag('force')) continue;
    jobs.push({ id, g, c, out });
  }
  process.stderr.write(`${jobs.length} generation(s)\n`);
  try {
    await pool(jobs, 3, async ({ id, g, c, out }) => {
      process.stderr.write(`${id} / ${g} / ${c.name}\n`);
      const text = g === 'deepseek' ? await deepseek(c.rev ? sys[c.name] : null, PROMPTS[id].text) : await claude(claudeDirs[c.name], PROMPTS[id].text, ['--tools', '']);
      writeFileSync(out, text);
    });
  } finally { for (const d of Object.values(claudeDirs)) rmSync(d, { recursive: true, force: true }); }
  const metaFile = join(dir, 'meta.json');
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : { runs: [] };
  meta.runs.push({
    recordedAt: new Date().toISOString(), supermd: JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version,
    conditions: conds, generators: gens, prompts, deepseekModel: 'deepseek-chat (temperature 0)',
    claudeCode: gens.includes('claude') ? execFileSync('claude', ['--version'], { encoding: 'utf8' }).trim() : null,
  });
  writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
}

// -------------------------------------------------------------------------- analyze
async function loadModules() {
  const require = createRequire(import.meta.url);
  const find = name => {
    for (const base of [import.meta.url, pathToFileURL(join(process.cwd(), 'x.js')).href, pathToFileURL(join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'x.js')).href]) {
      try { return createRequire(base)(name); } catch { /* next */ }
    }
    return null;
  };
  const playwright = find('playwright');
  if (!playwright) throw new Error('Playwright not found. Run: npm i --no-save playwright axe-core');
  let axeSource = null;
  for (const base of [import.meta.url, pathToFileURL(join(process.cwd(), 'x.js')).href, process.env.AXE_FROM && pathToFileURL(join(process.env.AXE_FROM, 'x.js')).href, pathToFileURL(join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'x.js')).href].filter(Boolean)) {
    try { axeSource = readFileSync(createRequire(base).resolve('axe-core/axe.min.js'), 'utf8'); break; } catch { /* next */ }
  }
  void require;
  return { chromium: playwright.chromium, axeSource };
}

const fence = (text, lang) => { const m = text.match(new RegExp('```' + lang + '\\n([\\s\\S]*?)```')); return m ? m[1] : text; };
const CLAIMS = /no credit card|cancel anytime|free forever|(?:set up|setup|launch|running) in (?:under )?\w+ minutes|takes? \w+ minutes|in minutes|thousands of|trusted by|loved by|\d+ ?% (?:faster|more|less)|\d[\d,.]*\+? (?:teams|customers|users|companies)\b/gi;

const STATES = {
  loading: /loading|isLoading|spinner|skeleton/i, error: /error|catch|isError/i,
  empty: /no users|empty|length === 0|!users\.length|users\.length\s*===\s*0/i, disabled: /disabled/,
  'aria-sort': /aria-sort/, 'aria-label or role': /aria-label|role=/, 'focus style': /focus|:focus-visible/,
  'fetch cleanup': /AbortController|cancelled|ignore|cleanup|return \(\) =>/i, 'res.ok check': /\.ok\b/,
  'keyboard (button or onKey)': /<button|onKeyDown/i,
};

async function measurePage(browser, html, axeSource, lexicon) {
  const consoleErrors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => consoleErrors.push(String(e.message).slice(0, 120)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 120)); });
  await page.setContent(html, { waitUntil: 'load' });
  await settle(page);
  const info = await page.evaluate(() => {
    const text = document.body.innerText;
    const sizes = new Set(), colors = new Set();
    for (const el of document.body.querySelectorAll('*')) {
      if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(el); sizes.add(cs.fontSize); colors.add(cs.color);
    }
    return { text, svg: document.querySelectorAll('svg').length, h1: (document.querySelector('h1') || {}).innerText || '', height: document.documentElement.scrollHeight,
      landmarks: ['header', 'nav', 'main', 'footer'].filter(t => document.querySelector(t)).length, fontSizes: sizes.size, textColors: colors.size,
      interactive: document.querySelectorAll('a[href],button,input,select,textarea,summary').length };
  });
  let axe = { total: 0, serious: 0, rules: [] };
  if (axeSource) {
    await page.evaluate(axeSource);
    const r = await page.evaluate(async () => { const res = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] }); return res.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })); });
    axe = { total: r.length, serious: r.filter(v => ['serious', 'critical'].includes(v.impact)).length, rules: r.map(v => v.id) };
  }
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(150);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.close();
  const hits = scan(info.text, 'en', lexicon);
  const css = (html.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n');
  return {
    h1: info.h1.replace(/\s+/g, ' ').slice(0, 70), hard: hardTotal(hits), soft: softTotal(hits),
    emojiIcons: (info.text.match(/\p{Extended_Pictographic}/gu) || []).filter(ch => ![0xA9, 0xAE, 0x2122].includes(ch.codePointAt(0))).length,
    gradients: (html.match(/gradient\(/g) || []).length, svgIcons: info.svg, claims: (info.text.match(CLAIMS) || []).length,
    placeholders: (info.text.match(/\[confirm[^\]]*\]/gi) || []).length, axeViolations: axe.total, axeSerious: axe.serious, axeRules: axe.rules,
    overflow375: overflow > 1, consoleErrors: consoleErrors.length, focusStyle: /:focus-visible|:focus\b/.test(css), reducedMotion: /prefers-reduced-motion/.test(css),
    landmarks: info.landmarks, tokens: (css.match(/var\(--/g) || []).length, fontSizes: info.fontSizes, height: info.height, words: info.text.split(/\s+/).filter(Boolean).length,
  };
}

function conditionsIn(dir) {
  const names = new Set();
  for (const f of readdirSync(dir)) { const m = f.match(/^[^.]+\.[^.]+\.(.+)\.txt$/); if (m) names.add(m[1]); }
  return [...names];
}

async function analyze(dir) {
  const { chromium, axeSource } = await loadModules();
  if (!axeSource) process.stderr.write('axe-core not found; accessibility columns will be zero. Run: npm i --no-save axe-core\n');
  const browser = await chromium.launch();
  const lexicon = loadLexicon(ROOT);
  const gens = list(opt('gen', 'deepseek,claude'));
  const conds = opt('cond') ? list(opt('cond')).map(c => c.split('=')[0]) : conditionsIn(dir);
  const results = {};
  try {
    for (const id of promptIds().filter(p => PROMPTS[p].kind === 'page')) for (const g of gens) for (const c of conds) {
      const f = join(dir, `${id}.${g}.${c}.txt`);
      if (!existsSync(f)) continue;
      results[`${id}.${g}.${c}`] = await measurePage(browser, fence(readFileSync(f, 'utf8'), 'html'), axeSource, lexicon);
    }
  } finally { await browser.close(); }
  writeFileSync(join(dir, 'analysis.json'), JSON.stringify(results, null, 2) + '\n');
  const head = '| prompt | generator | condition | headline | hard slop | emoji icons | gradients | SVG icons | unsupported claims | `[confirm]` | axe violations (serious) | overflow at 375px | focus style | reduced motion | tokens | words |';
  console.log(head); console.log(head.replace(/[^|]/g, '-'));
  for (const [k, r] of Object.entries(results)) { const [id, g, c] = k.split('.'); console.log(`| ${id} | ${g} | ${c} | ${r.h1} | ${r.hard} | ${r.emojiIcons} | ${r.gradients} | ${r.svgIcons} | ${r.claims} | ${r.placeholders} | ${r.axeViolations} (${r.axeSerious}) | ${r.overflow375 ? 'yes' : 'no'} | ${r.focusStyle ? 'yes' : 'no'} | ${r.reducedMotion ? 'yes' : 'no'} | ${r.tokens} | ${r.words} |`); }
  const code = promptIds().filter(p => PROMPTS[p].kind === 'code');
  for (const id of code) {
    console.log(`\n| ${id} generator | condition | states and hooks present |\n|---|---|---|`);
    for (const g of gens) for (const c of conds) {
      const f = join(dir, `${id}.${g}.${c}.txt`);
      if (!existsSync(f)) continue;
      const src = readFileSync(f, 'utf8');
      console.log(`| ${g} | ${c} | ${Object.values(STATES).filter(re => re.test(src)).length}/${Object.keys(STATES).length} |`);
    }
  }
}

// ---------------------------------------------------------------------------- judge
async function shoot(browser, html, outBase) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.setContent(html, { waitUntil: 'load' });
  await settle(page);
  await page.screenshot({ path: `${outBase}-fold.png` });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: `${outBase}-full.png`, fullPage: true, clip: { x: 0, y: 0, width: 1280, height: Math.min(h, 3600) } });
  await page.close();
}

const RUBRIC = brief => `You are a senior product designer reviewing two generated web pages built from the same brief. You will be shown two images per page: the first screen, then the full page (cut at 3600px).

Brief: "${brief}"

Judge which page a design lead would rather ship after minimal edits. Weigh: visual hierarchy and polish; consistency of type, spacing and color; whether it looks designed or templated and generic; credibility of the content (specific wording; no invented customer counts, testimonials, ratings, or performance claims); completeness (no empty or obviously unfinished areas). Do not reward length, and do not reward decoration for its own sake. Visible placeholders for facts the brief did not supply are acceptable but count against polish when they dominate the page.

Use the Read tool on each image path, then answer with ONLY this JSON: {"winner": 1 or 2 or 0 for a genuine tie, "why": "one sentence"}`;

const hashOrder = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 2 === 0;

async function judge(dir) {
  const { chromium } = await loadModules();
  const subject = opt('subject'), against = list(opt('against', 'baseline')), gens = list(opt('gen', 'claude,deepseek'));
  if (!subject) throw new Error('--subject is required');
  const shots = join(dir, 'shots'); mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  const out = [];
  try {
    for (const id of promptIds().filter(p => PROMPTS[p].kind === 'page')) for (const g of gens) {
      const subj = join(dir, `${id}.${g}.${subject}.txt`);
      if (!existsSync(subj)) continue;
      const bases = { [subject]: join(shots, `${id}.${g}.${subject}`) };
      await shoot(browser, fence(readFileSync(subj, 'utf8'), 'html'), bases[subject]);
      for (const other of against) {
        const f = join(dir, `${id}.${g}.${other}.txt`);
        if (!existsSync(f)) continue;
        bases[other] = join(shots, `${id}.${g}.${other}`);
        await shoot(browser, fence(readFileSync(f, 'utf8'), 'html'), bases[other]);
      }
      const brief = PROMPTS[id].text.replace(/ Output only the HTML\.$/, '');
      for (const other of against) {
        if (!bases[other]) continue;
        const passes = [];
        for (const subjectFirst of [hashOrder(`${id}${g}${other}`), !hashOrder(`${id}${g}${other}`)]) {
          const [a, b] = subjectFirst ? [subject, other] : [other, subject];
          const prompt = `${RUBRIC(brief)}\n\nPage 1: ${bases[a]}-fold.png then ${bases[a]}-full.png\nPage 2: ${bases[b]}-fold.png then ${bases[b]}-full.png`;
          const cwd = mkdtempSync(join(tmpdir(), 'fe-judge-'));
          try {
            let verdict;
            for (let attempt = 1; attempt <= 3 && !verdict; attempt++) {
              const text = await claude(cwd, prompt, ['--add-dir', shots, '--allowedTools', 'Read']);
              const m = text.match(/\{[\s\S]*?"winner"[\s\S]*?\}/);
              try { verdict = JSON.parse(m[0]); } catch { /* retry */ }
            }
            const w = verdict.winner === 0 ? 'tie' : (verdict.winner === 1) === subjectFirst ? subject : other;
            passes.push({ order: subjectFirst ? 'subject-first' : 'subject-second', winner: w, why: verdict.why });
          } finally { rmSync(cwd, { recursive: true, force: true }); }
        }
        const agree = passes[0].winner === passes[1].winner;
        out.push({ prompt: id, generator: g, subject, against: other, result: agree ? passes[0].winner : 'tie (passes disagree)', passes });
        process.stderr.write(`${id}/${g}: ${subject} vs ${other}: ${out.at(-1).result}\n`);
      }
    }
  } finally { await browser.close(); }
  writeFileSync(join(dir, `judge-${subject}.json`), JSON.stringify(out, null, 2) + '\n');
  console.log(`| prompt | generator | ${subject} vs | result (both orders) |\n|---|---|---|---|`);
  for (const r of out) console.log(`| ${r.prompt} | ${r.generator} | ${r.against} | ${r.result === subject ? `**${subject} wins**` : r.result === r.against ? `${r.against} wins` : r.result} |`);
  for (const other of against) {
    const rows = out.filter(r => r.against === other);
    const w = rows.filter(r => r.result === subject).length, l = rows.filter(r => r.result === other).length;
    console.log(`\n${subject} vs ${other}: ${w} wins, ${rows.length - w - l} ties, ${l} losses of ${rows.length}`);
  }
}

// -------------------------------------------------------------------------- montage
async function montage(dir) {
  const { chromium } = await loadModules();
  const id = opt('prompt'), outFile = resolve(opt('out', 'montage.png'));
  const gens = list(opt('gen', 'deepseek,claude')), conds = opt('cond') ? list(opt('cond')).map(c => c.split('=')[0]) : conditionsIn(dir);
  const tmp = mkdtempSync(join(tmpdir(), 'fe-montage-'));
  const browser = await chromium.launch();
  const cells = [];
  try {
    for (const g of gens) for (const c of conds) {
      const f = join(dir, `${id}.${g}.${c}.txt`);
      if (!existsSync(f)) continue;
      const png = join(tmp, `${g}.${c}.png`);
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.setContent(fence(readFileSync(f, 'utf8'), 'html'), { waitUntil: 'load' });
      await settle(page);
      await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 1280, height: 1400 }, fullPage: true });
      await page.close();
      cells.push({ label: `${g === 'claude' ? 'Claude Code' : 'DeepSeek'} · ${c}`, png, good: c !== 'baseline' });
    }
    const w = Math.floor(1960 / Math.max(cells.length, 1)) - 10;
    const html = `<body style="margin:0;background:#0b0f17;font-family:'DejaVu Sans',sans-serif"><div style="display:flex;gap:10px;padding:14px">${cells.map(s => `<div style="width:${w}px"><div style="color:${s.good ? '#7ee787' : '#ff7b72'};font:700 12px 'DejaVu Sans',sans-serif;letter-spacing:.5px;text-transform:uppercase;padding:2px 2px 8px">${s.label}</div><div style="border:1px solid #30363d;border-radius:8px;background:#fff;overflow:hidden"><img src="${pathToFileURL(s.png)}" style="width:${w}px;display:block"></div></div>`).join('')}</div></body>`;
    writeFileSync(join(tmp, 'm.html'), html);
    const page = await browser.newPage({ viewport: { width: 2000, height: 900 } });
    await page.goto(pathToFileURL(join(tmp, 'm.html')).href);
    await page.waitForTimeout(500);
    await page.screenshot({ path: outFile, fullPage: true });
    await page.close();
  } finally { await browser.close(); rmSync(tmp, { recursive: true, force: true }); }
}

// ------------------------------------------------------------------------------ main
const dir = dirArg && resolve(dirArg);
if (cmd === 'generate' && dir) await generate(dir);
else if (cmd === 'analyze' && dir) await analyze(dir);
else if (cmd === 'judge' && dir) await judge(dir);
else if (cmd === 'montage' && dir) await montage(dir);
else { console.error('usage: frontend-experiment.mjs generate|analyze|judge|montage <dir> [options]  (see the header comment)'); process.exit(2); }
