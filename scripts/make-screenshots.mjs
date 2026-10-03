#!/usr/bin/env node
// Regenerates the README screenshots in docs/assets/ from REAL command output.
//
// Nothing here is mocked: each terminal scene runs the actual `supermd` CLI
// (colors forced on), converts the ANSI output to HTML, and screenshots it with
// Playwright. The eval scenes are rendered from the committed reports in
// eval/results/. Re-run after any change to CLI output or to the eval report:
//
//   npm i --no-save playwright          # dev-only; the package has no runtime deps
//   node scripts/make-screenshots.mjs [scene ...]
//
// Scenes: hero check build install mcp claude-mcp plugin tests eval eval-full before-after claude-live
// Scenes that drive the `claude` CLI (claude-mcp, plugin) need it on PATH and `supermd` linked
// (`npm link`); they run in throwaway directories and clean up after themselves.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'assets');
const CLI = join(ROOT, 'bin', 'supermd.mjs');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

// ---------------------------------------------------------------- ANSI → HTML
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SGR = { 1: 'b', 2: 'dim', 31: 'red', 32: 'green', 33: 'yellow', 36: 'cyan' };
function ansiToHtml(input) {
  let out = '', open = [];
  const closeAll = () => { out += '</span>'.repeat(open.length); open = []; };
  const re = /\x1b\[([0-9;]*)m/g;
  let last = 0, m;
  while ((m = re.exec(input))) {
    out += esc(input.slice(last, m.index));
    last = re.lastIndex;
    for (const code of m[1].split(';')) {
      if (code === '0' || code === '') closeAll();
      else if (SGR[code]) { out += `<span class="${SGR[code]}">`; open.push(code); }
    }
  }
  out += esc(input.slice(last));
  closeAll();
  return out;
}

// ------------------------------------------------------------------- running
const env = { ...process.env, FORCE_COLOR: '1', NO_COLOR: undefined };
delete env.NO_COLOR;

function run(args, { cwd = ROOT, input } = {}) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], { cwd, env, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

// Run a CLI invocation and return stdout+stderr as one terminal transcript.
// stderr is appended after stdout; `build`, which prints its note before the
// payload, is assembled separately in its scene.
function term(args, opts) {
  const r = run(args, opts);
  return { cmd: `supermd ${args.map(a => (/[\s"']/.test(a) ? JSON.stringify(a) : a)).join(' ')}`, out: r.stdout + r.stderr, code: r.code };
}

// --------------------------------------------------------------- HTML shells
const FONT = `'DejaVu Sans Mono','Liberation Mono',Menlo,Consolas,monospace`;
const SANS = `'DejaVu Sans','Liberation Sans',Helvetica,Arial,sans-serif`;
const CSS = `
*{box-sizing:border-box}
body{margin:0;padding:28px;background:#0b0f17;font-family:${SANS};-webkit-font-smoothing:antialiased}
.wrap{display:inline-block;min-width:760px}
.window{background:#0d1117;border:1px solid #30363d;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.55);overflow:hidden}
.bar{display:flex;align-items:center;gap:8px;padding:11px 14px;background:#161b22;border-bottom:1px solid #30363d}
.dot{width:12px;height:12px;border-radius:50%}
.dot.r{background:#ff5f56}.dot.y{background:#ffbd2e}.dot.g{background:#27c93f}
.title{margin-left:10px;color:#8b949e;font-size:12.5px;letter-spacing:.2px}
pre{margin:0;padding:18px 20px 20px;font-family:${FONT};font-size:13.5px;line-height:1.5;color:#c9d1d9;white-space:pre-wrap;word-break:break-word}
.prompt{color:#7ee787}.cmd{color:#f0f6fc;font-weight:700}
.b{font-weight:700;color:#f0f6fc}.dim{color:#7d8590}.red{color:#ff7b72}.green{color:#7ee787}.yellow{color:#e3b341}.cyan{color:#79c0ff}
.gap{height:8px;display:block}
.note{color:#7d8590}
`;

function terminalHtml(title, blocks, width = 860) {
  const body = blocks.map(b => {
    if (b.gap) return '<span class="gap"></span>';
    if (b.raw) return ansiToHtml(b.raw);
    const prompt = `<span class="prompt">$</span> <span class="cmd">${esc(b.cmd)}</span>\n`;
    return prompt + ansiToHtml(b.out.replace(/\n+$/, '')) + '\n';
  }).join('');
  return `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
<body><div class="wrap" style="width:${width}px"><div class="window"><div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="title">${esc(title)}</span></div><pre>${body}</pre></div></div></body>`;
}

// ------------------------------------------------------------------- scenes
const SLOP = `In today's fast-paced world, teamwork is the cornerstone of success. It is important to note that when diverse minds come together, they delve into a vibrant tapestry of innovation. I hope this helps!`;
const CLEAN = `Teamwork produces results individuals cannot: a team pools complementary skills, catches errors early, and splits work to hit deadlines that would otherwise slip. The cost is coordination time, which the gain has to justify.`;

const scenes = {
  hero() {
    // Real model output from the committed eval report, linted by the real CLI.
    const { name, txt } = latestReport();
    const sec = txt.slice(txt.indexOf('\n### teamwork-essay\n'));
    const grab = label => {
      const k = sec.indexOf(`**${label}:**`);
      const f = sec.indexOf('```text\n', k) + 8;
      return sec.slice(f, sec.indexOf('\n```', f)).trim() + '\n';
    };
    const dir = mkdtempSync(join(tmpdir(), 'supermd-shot-hero-'));
    try {
      writeFileSync(join(dir, 'without-supermd.md'), grab('baseline'));
      writeFileSync(join(dir, 'with-supermd.md'), grab('supermd'));
      const bad = term(['check', 'without-supermd.md'], { cwd: dir });
      const good = term(['check', 'with-supermd.md'], { cwd: dir });
      return terminalHtml(`supermd check on real model output · eval/results/${name}`, [
        { raw: `\x1b[2m# prompt: "Write about the importance of teamwork in the workplace."  (deepseek-chat, same model both times)\x1b[0m\n` },
        { raw: `\x1b[2m# without SuperMD in the system prompt\x1b[0m\n` },
        { cmd: bad.cmd, out: bad.out },
        { gap: true },
        { raw: `\x1b[2m# with SuperMD in the system prompt\x1b[0m\n` },
        { cmd: good.cmd, out: good.out },
      ], 900);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  },

  check() {
    // The tree gates itself: both language trees pass their own linter.
    const en = term(['check', 'en']), id = term(['check', 'id']);
    const tail = r => r.out.trim().split('\n').filter(l => !l.includes('detector of known')).slice(-1)[0];
    return terminalHtml('the repo is gated on the rules it teaches', [
      { cmd: 'supermd check en', out: tail(en) + '\n' },
      { cmd: 'supermd check id', out: tail(id) + '\n' },
      { cmd: 'bash scripts/check-parity.sh', out: execFileSync('bash', [join(ROOT, 'scripts', 'check-parity.sh')], { encoding: 'utf8' }) },
    ], 760);
  },

  build() {
    const list = term(['list', 'healthcare']);
    const build = run(['build', 'nursing', '--style', 'formal']);
    const head = build.stdout.split('\n').slice(0, 14).join('\n');
    return terminalHtml('compose a system prompt for a profession', [
      { cmd: 'supermd list healthcare', out: list.out },
      { gap: true },
      { cmd: 'supermd build nursing --style formal', out: build.stderr + head + '\n\x1b[2m… (core + category + sub-field + style, ready to paste)\x1b[0m' },
    ]);
  },

  install() {
    const dir = mkdtempSync(join(tmpdir(), 'supermd-shot-'));
    try {
      const blocks = [];
      const call = (args, label) => { const t = term(args, { cwd: dir }); blocks.push({ cmd: t.cmd, out: t.out }); return t; };
      call(['install', 'claude-code', 'codex', 'cursor', 'copilot', 'gemini-cli', 'windsurf', '--field', 'software-engineering']);
      blocks.push({ gap: true });
      call(['status']);
      const tree = execFileSync('find', ['.', '-type', 'f', '-not', '-path', './.git/*'], { cwd: dir, encoding: 'utf8' })
        .trim().split('\n').sort().map(p => '  ' + p.replace(/^\.\//, '')).join('\n');
      blocks.push({ gap: true });
      blocks.push({ cmd: 'find . -type f | sort', out: tree });
      return terminalHtml('one command, six harnesses', blocks, 940);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  },

  mcp() {
    const req = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'demo', version: '1' } } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'supermd_check', arguments: { text: SLOP } } },
    ].map(r => JSON.stringify(r)).join('\n') + '\n';
    const stdout = execFileSync('node', [CLI, 'mcp'], { cwd: ROOT, input: req, encoding: 'utf8' });
    const [init, call] = stdout.trim().split('\n').map(l => JSON.parse(l));
    const lines = call.result.content[0].text.split('\n');
    return terminalHtml('supermd mcp — tools any MCP client can call', [
      { raw: `\x1b[2m# server: ${init.result.serverInfo.name} ${init.result.serverInfo.version} · protocol ${init.result.protocolVersion}\x1b[0m\n\x1b[2m# tools/call supermd_check on a deliberately sloppy sample sentence\x1b[0m\n` },
      { raw: lines.map(l => l.startsWith('hard') ? `\x1b[31m${l}\x1b[0m` : l.startsWith('soft') ? `\x1b[33m${l}\x1b[0m` : l).join('\n') + '\n' },
    ], 860);
  },

  tests() {
    const t = (cmd, args) => ({ cmd, out: execFileSync(args[0], args.slice(1), { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) });
    return terminalHtml('npm test', [t('npm test --silent', ['npm', 'test', '--silent'])], 900);
  },
};


// ------------------------------------------------- scenes that drive `claude`
function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env, timeout: 240000, ...opts });
  return { code: r.status ?? 1, out: (r.stdout || '') + (r.stderr || '') };
}
const tidy = t => t.replace(/\x1b\[[0-9;]*m/g, '');

scenes['claude-mcp'] = () => {
  const dir = mkdtempSync(join(tmpdir(), 'supermd-shot-mcp-'));
  try {
    const add = sh('claude', ['mcp', 'add', '--scope', 'local', 'supermd', '--', 'supermd', 'mcp'], { cwd: dir });
    const list = sh('claude', ['mcp', 'list'], { cwd: dir });
    const get = sh('claude', ['mcp', 'get', 'supermd'], { cwd: dir });
    sh('claude', ['mcp', 'remove', 'supermd', '--scope', 'local'], { cwd: dir });
    const ver = sh('claude', ['--version']).out.trim();
    const colorize = t => tidy(t).replace(/(√ Connected)/g, '\x1b[32m$1\x1b[0m');
    return terminalHtml(`Claude Code ${ver.replace(' (Claude Code)', '')} connects to the SuperMD MCP server`, [
      { cmd: 'claude mcp add supermd -- supermd mcp', out: tidy(add.out) },
      { gap: true },
      { cmd: 'claude mcp list', out: colorize(list.out) },
      { gap: true },
      { cmd: 'claude mcp get supermd', out: colorize(get.out).split('\n').slice(0, 8).join('\n') },
    ], 960);
  } finally { rmSync(dir, { recursive: true, force: true }); }
};

scenes.plugin = () => {
  const dir = dirname(ROOT); // so `./SuperMD` below is the literal path that ran
  const ask = "Without using any tool, quote the very first sentence of any 'SuperMD Core' rules in your context, verbatim. If none, say NONE.";
  try {
    const blocks = [];
    const step = (display, cmd, args, o = {}) => { const r = sh(cmd, args, { cwd: dir }); blocks.push({ cmd: display, out: tidy(r.out).trim() + '\n' }); return r; };
    step('claude plugin marketplace add ./SuperMD', 'claude', ['plugin', 'marketplace', 'add', './' + basename(ROOT)]);
    step('claude plugin install supermd@supermd', 'claude', ['plugin', 'install', 'supermd@supermd', '--scope', 'local']);
    step('claude plugin list', 'claude', ['plugin', 'list']);
    blocks.push({ gap: true });
    const q = sh('claude', ['-p', ask, '--tools', '', '--disable-slash-commands'], { cwd: dir });
    blocks.push({ cmd: `claude -p "${ask}"`, out: q.out.trim() + '\n' });
    return terminalHtml('Claude Code plugin: install from a marketplace, rules active in the next session', blocks, 1000);
  } finally {
    sh('claude', ['plugin', 'uninstall', 'supermd@supermd', '--scope', 'local'], { cwd: dir });
    sh('claude', ['plugin', 'marketplace', 'remove', 'supermd'], { cwd: dir });
  }
};

scenes['claude-live'] = () => {
  const ev = JSON.parse(readFileSync(join(ROOT, 'docs', 'evidence', 'claude-code-live.json'), 'utf8'));
  const heads = t => t.split('\n').filter(l => /^#{1,6}\s/.test(l)).length;
  const paras = s => s.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').split(/\n{2,}/);
  const wordsOf = s => s.split(/\s+/).filter(Boolean).length;
  const row = r => `<tr><td class="n">${esc(r.id)}</td><td class="num">${r.without.words} → <span class="win">${r.with.words}</span></td><td class="num">${heads(r.without.text)} → <span class="win">${heads(r.with.text)}</span></td><td class="num">${r.without.hard} → ${r.with.hard}</td></tr>`;
  const t = ev.runs.find(r => r.id === 'teamwork-essay');
  const keepHeads = x => x.split(/\n{2,}/);
  const shownBase = keepHeads(t.without.text).slice(0, 4).join('\n\n');
  const restWords = wordsOf(keepHeads(t.without.text).join(' ')) - wordsOf(shownBase);
  const restHeads = heads(t.without.text) - heads(shownBase);
  return cardHtml(`
    <h3>Claude Code ${esc(ev.claudeCode.replace(' (Claude Code)', ''))}, same prompt, with and without <code>supermd install claude-code</code><span>live run · recorded ${esc(ev.recordedAt.slice(0, 10))} · docs/evidence/claude-code-live.json</span></h3>
    <table><thead><tr><th>prompt</th><th>words (without → with)</th><th>headings (without → with)</th><th>hard slop hits</th></tr></thead><tbody>${ev.runs.map(row).join('')}</tbody></table>
    <div class="cols">
      <div class="col base"><h4>Without SuperMD · ${t.without.words} words</h4><p>${esc(shownBase)}</p><p class="cut">… ${restWords} more words, ${restHeads} more headings</p></div>
      <div class="col smd"><h4>With SuperMD · ${t.with.words} words</h4><p>${esc(t.with.text)}</p></div>
    </div>
    <div class="cap">Prompt: “${esc(t.prompt)}” · models used: ${esc(t.with.model)} · one sample per condition, tool-less. Claude Code's default output already avoids the banned phrases (0 → 0 hard hits); the difference is length, structure, and a stated tradeoff. Baseline truncated for display.</div>`);
};

// ---- eval scenes: rendered from the committed reports (real recorded data) ----
function latestReport() {
  const dir = join(ROOT, 'eval', 'results');
  const files = readdirSync(dir).filter(f => /deepseek-chat\.md$/.test(f)).sort();
  // newest report that covers the whole suite
  for (const f of files.reverse()) {
    const txt = readFileSync(join(dir, f), 'utf8');
    const m = txt.match(/(\d+)\/(\d+) scenarios ran/);
    if (m && m[1] === m[2] && +m[2] >= 40) return { name: f, txt };
  }
  throw new Error('no complete eval report found');
}

function cardHtml(inner) {
  return `<!doctype html><meta charset="utf-8"><style>${CSS}
.card{width:1040px;background:#0d1117;border:1px solid #30363d;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.55);overflow:hidden;color:#c9d1d9}
.card h3{margin:0;padding:14px 20px;background:#161b22;border-bottom:1px solid #30363d;font-size:14px;color:#f0f6fc;font-weight:600}
.card h3 span{color:#7d8590;font-weight:400;margin-left:8px}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th,td{padding:5px 12px;text-align:left;border-bottom:1px solid #21262d}
th{color:#8b949e;font-weight:600;background:#0d1117}
td.n{font-family:${FONT};color:#f0f6fc}
td.num{font-family:${FONT}}
.win{color:#7ee787;font-weight:600}.lose{color:#ff7b72;font-weight:600}.mid{color:#8b949e}
.sum{display:flex;gap:0;border-top:1px solid #30363d}
.sum div{flex:1;padding:14px 20px;border-right:1px solid #21262d}.sum div:last-child{border:0}
.sum b{display:block;font-size:22px;color:#7ee787;font-family:${FONT}}.sum small{color:#8b949e;font-size:11.5px}
.cols{display:grid;grid-template-columns:1fr 1fr}
.col{padding:16px 20px;border-right:1px solid #21262d}.col:last-child{border:0}
.col h4{margin:0 0 10px;font-size:12px;letter-spacing:.6px;text-transform:uppercase}
.col.base h4{color:#ff7b72}.col.smd h4{color:#7ee787}
.col p{margin:0 0 10px;font-size:13px;line-height:1.55;color:#c9d1d9;white-space:pre-wrap}
.col .cut{color:#7d8590;font-style:italic}
.cap{padding:10px 20px;border-top:1px solid #30363d;color:#7d8590;font-size:11.5px;background:#0d1117}
</style><body><div class="card">${inner}</div></body>`;
}

function parseReport(txt) {
  const rows = [];
  for (const line of txt.split('\n')) {
    if (!line.startsWith('| ') || line.startsWith('| Scenario') || line.startsWith('|---')) continue;
    const c = line.split('|').slice(1, -1).map(s => s.trim());
    if (c.length >= 6) rows.push({ id: c[0], hard: c[1], soft: c[2], words: c[3], judge: c[4], probe: c[5] });
  }
  return rows;
}

function summarize(file, txt) {
  const rows = parseReport(txt);
  const head = txt.match(/Generation: `([^`]+)` \(temperature 0\) · Judge: `([^`]+)`.*?· (\d+)\/(\d+) scenarios ran/);
  const pair = txt.match(/\*\*Pairwise:\*\* supermd (\d+) \/ tie (\d+) \/ baseline (\d+) — win rate (\d+)%/);
  const verdictBlock = txt.slice(txt.indexOf('**Verdict:**'), txt.indexOf('\nTokens:') === -1 ? undefined : txt.indexOf('\nTokens:'));
  const failures = verdictBlock.split('\n').filter(l => l.startsWith('- '));
  return {
    file, rows,
    date: (txt.match(/^# Eval report — (\S+)/m) || [])[1],
    gen: head[1], judge: head[2], ran: +head[3], total: +head[4],
    hardBase: rows.reduce((n, r) => n + (+r.hard.split('→')[0] || 0), 0),
    hardSmd: rows.reduce((n, r) => n + (+(r.hard.split('→')[1] || 0) || 0), 0),
    win: +pair[1], tie: +pair[2], lose: +pair[3], pct: +pair[4],
    verdict: (txt.match(/\*\*Verdict:\*\* (\w+)/) || [])[1],
    judgeLosses: failures.filter(f => /judge preferred baseline/.test(f)).length,
    contractMisses: failures.filter(f => /word contract/.test(f)).length,
    artifact: /\*\*Artifact note\.\*\*/.test(txt),
  };
}

const EVAL_CSS = `
.sumcards{display:flex;border-bottom:1px solid #30363d}
.sumcards div{flex:1;padding:16px 20px;border-right:1px solid #21262d}.sumcards div:last-child{border:0}
.sumcards b{display:block;font-size:26px;font-family:${FONT};color:#7ee787}.sumcards b.bad{color:#ff7b72}.sumcards b.mid{color:#e3b341}
.sumcards small{color:#8b949e;font-size:11.5px;line-height:1.4;display:block;margin-top:2px}
.h4{padding:12px 20px 6px;color:#8b949e;font-size:11.5px;letter-spacing:.6px;text-transform:uppercase}
td.sm{font-size:11.5px;color:#8b949e}td.n{white-space:nowrap}
`;

scenes.eval = () => {
  const dir = join(ROOT, 'eval', 'results');
  const reports = readdirSync(dir).filter(f => f.endsWith('.md')).sort()
    .map(f => summarize(f, readFileSync(join(dir, f), 'utf8')));
  const latest = [...reports].reverse().find(r => !r.artifact && r.ran === r.total);
  const pctColor = r => (r.artifact ? 'lose' : r.pct >= 95 ? 'win' : r.pct >= 80 ? 'mid' : 'lose');
  const verdictCell = r => (r.verdict === 'PASS' ? '<span class="win">PASS</span>' : '<span class="lose">FAIL</span>');
  const note = r => r.artifact ? 'invalid run: with thinking mode the 1600-token cap emptied most generations (artifact note in the report)'
    : r.ran < r.total ? `${r.total - r.ran} scenario errored (harness bug, fixed in 1.12.0)` : '';
  const hist = reports.map(r => `<tr><td class="n">${esc(r.date)}</td><td>${esc(r.gen)}</td><td class="num">${r.ran}/${r.total}</td><td class="num">${r.hardBase} → ${r.hardSmd}</td><td class="num"><span class="${pctColor(r)}">${r.win} / ${r.win + r.tie + r.lose} · ${r.pct}%</span></td><td>${verdictCell(r)}</td><td class="sm">${esc(note(r))}</td></tr>`).join('');
  const lossText = `${latest.judgeLosses} judge loss${latest.judgeLosses === 1 ? '' : 'es'}` + (latest.contractMisses ? ` + ${latest.contractMisses} word-count miss` : '');
  return cardHtml(`<style>${EVAL_CSS}</style>
    <h3>SuperMD eval — latest full run: ${esc(latest.gen)}, blind judge ${esc(latest.judge)}<span>${latest.ran}/${latest.total} scenarios · eval/results/${esc(latest.file)}</span></h3>
    <div class="sumcards">
      <div><b>${latest.hardBase} → ${latest.hardSmd}</b><small>hard slop hits across all ${latest.ran} scenarios<br>(without → with SuperMD)</small></div>
      <div><b class="${latest.pct >= 95 ? '' : 'mid'}">${latest.win} / ${latest.win + latest.tie + latest.lose}</b><small>blind pairwise wins for SuperMD (${latest.pct}%)<br>${latest.lose} baseline win${latest.lose === 1 ? '' : 's'}, ${latest.tie} tie${latest.tie === 1 ? '' : 's'}</small></div>
      <div><b class="${latest.verdict === 'PASS' ? '' : 'bad'}">${esc(latest.verdict)}</b><small>strict gate: any scenario lost to baseline or any missed contract fails the run<br>this run: ${esc(lossText)}</small></div>
    </div>
    <div class="h4">Every report in the repo, oldest first (nothing omitted)</div>
    <table><thead><tr><th>date</th><th>generation model</th><th>ran</th><th>hard slop hits</th><th>blind pairwise wins</th><th>gate</th><th></th></tr></thead><tbody>${hist}</tbody></table>
    <div class="cap">Rendered from the committed reports in eval/results/. Reproduce: <code>node eval/run-eval.mjs</code> (any OpenAI-compatible API). The API is non-deterministic even at temperature 0, so results move run to run.</div>`);
};

scenes['eval-full'] = () => {
  const { name, txt } = latestReport();
  const r = summarize(name, txt);
  const judgeCell = j => /^supermd/.test(j) ? `<span class="win">${esc(j.replace(/ \(best-of-3.*/, ''))}</span>` : /^baseline/.test(j) ? `<span class="lose">${esc(j)}</span>` : `<span class="mid">${esc(j)}</span>`;
  const body = r.rows.map(x => `<tr><td class="n">${esc(x.id)}</td><td class="num">${esc(x.hard)}</td><td class="num">${esc(x.words)}</td><td>${judgeCell(x.judge)}</td><td>${esc(x.probe.replace(/ ✓$/, ''))}${/✓$/.test(x.probe) ? ' <span class="win">✓</span>' : ''}</td></tr>`).join('');
  return cardHtml(`
    <h3>All ${r.ran} scenarios — ${esc(r.gen)}, blind judge ${esc(r.judge)}<span>eval/results/${esc(name)}</span></h3>
    <table><thead><tr><th>scenario</th><th>hard slop hits (without → with)</th><th>words (without → with)</th><th>blind judge</th><th>probe / contract</th></tr></thead><tbody>${body}</tbody></table>
    <div class="cap">Rendered from the committed report. Judge cells show the blind pairwise winner; “—” marks scenarios scored by probe or by the deterministic scan only.</div>`);
};

scenes['before-after'] = () => {
  const { name, txt } = latestReport();
  const section = id => {
    const start = txt.indexOf(`\n### ${id}\n`);
    const next = txt.indexOf('\n### ', start + 5);
    const body = txt.slice(start, next === -1 ? undefined : next);
    const grab = label => {
      const i = body.indexOf(`**${label}:**`);
      const fence = body.indexOf('```text\n', i) + 8;
      return body.slice(fence, body.indexOf('\n```', fence)).trim();
    };
    return { base: grab('baseline'), smd: grab('supermd') };
  };
  const { base, smd } = section('teamwork-essay');
  const plain = s => s; // show the raw Markdown the model produced, unedited
  const words = s => s.split(/\s+/).filter(Boolean).length;
  const paras = s => plain(s).split(/\n{2,}/);
  const CUT = 2; // paragraphs of the baseline shown before the cut
  const shown = paras(base).slice(0, CUT).join('\n\n');
  const restWords = words(plain(base)) - words(shown);
  const numbered = (base.match(/^\*\*\d+\./gm) || []).length;
  const hasConclusion = /^\*\*Conclusion\*\*/m.test(base);
  const html = cardHtml(`
    <h3>Prompt: “Write an essay about the importance of teamwork in the workplace.”<span>real model output · source: eval/results/${esc(name)}</span></h3>
    <div class="cols">
      <div class="col base"><h4>Without SuperMD · ${words(base)} words</h4><p>${esc(shown)}</p><p class="cut">… ${restWords} more words: ${numbered} numbered sections${hasConclusion ? ' and a conclusion' : ''}</p></div>
      <div class="col smd"><h4>With SuperMD · ${words(smd)} words</h4><p>${esc(plain(smd))}</p></div>
    </div>
    <div class="cap">Same model (deepseek-chat, temperature 0), same prompt. The only difference is the SuperMD core in the system prompt. Baseline truncated for display.</div>`);
  return html;
};

// -------------------------------------------------------------------- driver
async function main() {
  let chromium;
  try {
    const require = createRequire(import.meta.url);
    ({ chromium } = require('playwright'));
  } catch {
    try { ({ chromium } = await import('playwright')); }
    catch {
      const g = process.env.NODE_PATH || '/opt/node22/lib/node_modules';
      ({ chromium } = createRequire(join(g, 'x.js'))('playwright'));
    }
  }
  const want = process.argv.slice(2);
  const names = want.length ? want : Object.keys(scenes);
  mkdirSync(OUT, { recursive: true });
  const exe = process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'))
    ? undefined : undefined;
  const browser = await chromium.launch({ executablePath: exe });
  try {
    for (const name of names) {
      if (!scenes[name]) throw new Error(`unknown scene: ${name} (have: ${Object.keys(scenes).join(', ')})`);
      const html = scenes[name]();
      const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1200, height: 800 } });
      await page.setContent(html, { waitUntil: 'load' });
      const el = await page.$('.wrap, .card');
      const file = join(OUT, `${name}.png`);
      await el.screenshot({ path: file, omitBackground: false });
      await page.close();
      console.log(`wrote docs/assets/${name}.png`);
    }
  } finally { await browser.close(); }
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
