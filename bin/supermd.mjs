#!/usr/bin/env node
// supermd — compose anti-slop system prompts and lint text for slop.
// Zero dependencies; Node 18+. The Markdown tree is the single source of truth.

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { catalog, compose, adapt } from '../lib/compose.mjs';
import { scan, loadLexicon, hardTotal, softTotal, detectLang } from '../lib/slop-scan.mjs';
import { serveStdio } from '../lib/mcp.mjs';
import { HARNESSES, findHarness, suggestHarnesses, planInstall, planUninstall, applyPlan, detect } from '../lib/harnesses.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

// tiny ANSI helpers (on for a TTY or FORCE_COLOR; NO_COLOR always wins)
const useColor = !process.env.NO_COLOR && (process.stdout.isTTY || !!process.env.FORCE_COLOR);
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s), red = s => c('31', s), green = s => c('32', s), yellow = s => c('33', s), cyan = s => c('36', s);
const err = s => process.stderr.write(s + '\n');
const out = s => process.stdout.write(s + '\n');

function parseArgs(argv) {
  const flags = {}, pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (['core-only', 'no-banner', 'dry-run', 'force', 'keep-frontmatter'].includes(key)) flags[key] = true;
      else flags[key] = argv[++i];
    } else if (a.startsWith('-') && a.length > 1 && a !== '-') {
      const map = { h: 'help', v: 'version', l: 'lang', s: 'style', o: 'out' };
      const key = map[a.slice(1)] || a.slice(1);
      if (key === 'help' || key === 'version') flags[key] = true;
      else flags[key] = argv[++i];
    } else pos.push(a);
  }
  return { flags, pos };
}

const HELP = `${bold('supermd')} — compose anti-slop system prompts, and lint text for slop.

${bold('USAGE')}
  supermd build <field...> [--style s] [--lang en|id] [--core-only] [--out f]
  supermd adapt <field description...> [--lang en|id] [--out f]
  supermd list [category]
  supermd check [file|dir] [--lang en|id]    (reads stdin if no target; a directory is swept recursively)
  supermd install <harness...|all> [--field f] [--style s] [--lang en|id] [--scope project|user] [--dry-run]
  supermd uninstall <harness...|all> [--scope project|user]
  supermd status                             (where SuperMD is installed, and whether it is current)
  supermd harnesses                          (supported harnesses and the files they read)
  supermd mcp                                (MCP server on stdio: tools for any MCP client)
  supermd help | version

${bold('EXAMPLES')}
  supermd build software-engineering --style technical
  supermd build nursing --lang id --out prompt.txt
  supermd build --core-only                 # just the universal core
  supermd adapt "beekeeper"                  # any profession, via the adapter
  supermd list technology
  cat draft.md | supermd check               # flag KNOWN slop patterns (a filter, not a proof)
  supermd check article.txt                  # language auto-detected; --lang overrides
  supermd check docs/                        # sweep every .md under docs/, exit 1 on hard slop
  supermd install claude-code codex          # always-on rules for Claude Code and Codex, in this project
  supermd install cursor --field backend     # core + the Backend module, as a Cursor rule
  supermd install claude-code --scope user   # every project, via ~/.claude/CLAUDE.md
  supermd uninstall all                      # remove only what SuperMD wrote

${bold('OPTIONS')}
  --lang en|id     language (build/adapt default en; check auto-detects per file)
  --style NAME     formal | conversational | technical
  --core-only      emit only the universal core
  --out FILE       write to FILE instead of stdout
  --no-banner      omit the "assembled by" comment header
  --keep-frontmatter  keep each module's YAML metadata block in build/adapt output
  --field NAME     install: also add a profession module (see: supermd list)
  --scope SCOPE    install/uninstall: project (default) or user (your home directory)
  --dir PATH       install/uninstall/status: project root (default: current directory)
  --dry-run        install/uninstall: print the plan, write nothing
  --force          install/uninstall: overwrite or delete a file SuperMD does not own
  -h, --help       show this help    -v, --version   print version

${dim('Docs: en/docs/how-to-use.md · the Markdown tree is the source of truth.')}`;

function writeResult(text, flags) {
  if (flags.out) { writeFileSync(resolve(process.cwd(), flags.out), text + '\n'); err(green(`Wrote ${text.length} chars to ${flags.out}`)); }
  else out(text);
}

function banner(parts, flags) {
  if (flags['no-banner']) return '';
  const files = parts.map(p => p.label).join(' + ');
  return `<!-- SuperMD ${VERSION} · ${files} · https://github.com/TegarTheGreat/SuperMD -->\n\n`;
}

function cmdBuild(pos, flags) {
  const lang = flags.lang || 'en';
  const field = pos.join(' ').trim();
  if (!field && !flags['core-only']) { err(yellow('No field given. Use --core-only for just the core, or `supermd list`.')); process.exit(2); }
  const r = compose({ field, style: flags.style, lang, coreOnly: flags['core-only'], keepFrontmatter: !!flags['keep-frontmatter'] }, ROOT);
  if (!r.ok && r.error === 'field-not-found') {
    err(red(`No module for "${field}".`));
    if (r.candidates?.length) { err('Did you mean:'); r.candidates.forEach(f => err(`  ${cyan(f.slug)}  ${dim('· ' + f.categoryName)}`)); }
    err(dim(`Or cover any profession: supermd adapt "${field}"`));
    process.exit(1);
  }
  if (!r.ok) { err(red(r.error)); process.exit(1); }
  r.warnings.forEach(w => err(yellow('! ' + w)));
  if (r.field) err(green(`Composed: core + ${r.field.categoryName} / ${r.field.name}${flags.style ? ' + ' + flags.style : ''} (${lang})`));
  else err(green(`Composed: universal core (${lang})`));
  writeResult(banner(r.parts, flags) + r.prompt, flags);
}

function cmdAdapt(pos, flags) {
  const lang = flags.lang || 'en';
  const field = pos.join(' ').trim();
  if (!field) { err(yellow('Usage: supermd adapt "<field description>"')); process.exit(2); }
  const r = adapt(field, lang, ROOT, { keepFrontmatter: !!flags['keep-frontmatter'] });
  err(green(`Universal adapter instantiated for "${field}" (${lang})`));
  writeResult(r.prompt, flags);
}

function cmdList(pos, flags) {
  const lang = flags.lang || 'en';
  const cats = catalog(lang, ROOT);
  const only = pos[0] && String(pos[0]).toLowerCase();
  const shown = only ? cats.filter(c => c.category.includes(only)) : cats;
  if (!shown.length) { err(red(`No category matching "${only}".`)); process.exit(1); }
  let total = 0;
  for (const cat of shown) {
    out(`${bold(cat.categoryName)} ${dim('[' + cat.category + ']')}`);
    for (const f of cat.fields) { out(`  ${cyan(f.slug)}${' '.repeat(Math.max(1, 34 - f.slug.length))}${dim(f.name)}`); total++; }
    out('');
  }
  err(dim(`${shown.length} categor${shown.length === 1 ? 'y' : 'ies'}, ${total} sub-fields · any other profession: supermd adapt "<field>"`));
}

async function readStdin() {
  const chunks = [];
  for await (const ch of process.stdin) chunks.push(ch);
  return Buffer.concat(chunks).toString('utf8');
}

function walkMd(dir) {
  const found = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) found.push(...walkMd(p));
    else if (e.name.endsWith('.md')) found.push(p);
  }
  return found.sort();
}

function checkOne(text, src, flags, lexicon) {
  const lang = flags.lang || detectLang(text);
  const hits = scan(text, lang, lexicon);
  const hard = hardTotal(hits), soft = softTotal(hits);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (hard === 0 && soft === 0) {
    out(green(`✓ no known slop patterns in ${src} (${words} words, ${lang})`));
    return { hard, soft };
  }
  out(`${src} ${dim('· ' + words + ' words · ' + lang)}`);
  for (const h of hits.hard) out(`  ${red('hard')}  ${h.name}${dim(' ×' + h.count)}  ${dim('e.g. ' + JSON.stringify(h.sample).slice(0, 60))}`);
  for (const h of hits.soft) out(`  ${yellow('soft')}  ${h.name}${dim(' ×' + h.count)}  ${dim('e.g. ' + JSON.stringify(h.sample).slice(0, 60))}`);
  out(`${hard ? red(hard + ' hard') : green('0 hard')}, ${soft} soft ${dim('· hard = unambiguous slop; soft = weak/context signals')}`);
  return { hard, soft };
}

async function cmdCheck(pos, flags) {
  const lexicon = loadLexicon(ROOT);
  const results = [];
  if (pos[0] && pos[0] !== '-') {
    const p = resolve(process.cwd(), pos[0]);
    if (!existsSync(p)) { err(red(`File not found: ${pos[0]}`)); process.exit(2); }
    if (statSync(p).isDirectory()) {
      const files = walkMd(p);
      if (!files.length) { err(yellow(`No .md files under ${pos[0]}`)); process.exit(2); }
      for (const f of files) results.push(checkOne(readFileSync(f, 'utf8'), relative(process.cwd(), f) || f, flags, lexicon));
      const bad = results.filter(r => r.hard > 0).length;
      out(bad ? red(`${bad} of ${files.length} files with hard slop`) : green(`${files.length} files, no known hard slop`));
    } else {
      results.push(checkOne(readFileSync(p, 'utf8'), pos[0], flags, lexicon));
    }
  } else {
    if (process.stdin.isTTY) { err(yellow('Usage: supermd check <file|dir> | ... | supermd check')); process.exit(2); }
    results.push(checkOne(await readStdin(), 'stdin', flags, lexicon));
  }
  err(dim('  (a detector of known surface patterns — not a proof of slop-freedom; semantic slop escapes any regex)'));
  if (results.some(r => r.hard > 0)) process.exitCode = 1;
}


// ---------------------------------------------------------------- harnesses
const ACTION_STYLE = { create: green, update: yellow, unchanged: dim, skip: dim, delete: red, conflict: red };
const pad = (s, n) => s + ' '.repeat(Math.max(1, n - String(s).length));

function resolveHarnessIds(pos) {
  if (!pos.length) return null;
  if (pos.includes('all')) return HARNESSES.map(h => h.id);
  const ids = [];
  for (const q of pos) {
    const h = findHarness(q);
    if (!h) {
      err(red(`Unknown harness: ${q}`));
      const near = suggestHarnesses(q);
      if (near.length) err('Did you mean: ' + near.map(n => cyan(n.id)).join(', '));
      err(dim('Run `supermd harnesses` for the full list.'));
      process.exit(2);
    }
    ids.push(h.id);
  }
  return ids;
}

function scopeAndDirs(flags) {
  const scope = flags.scope || 'project';
  if (!['project', 'user'].includes(scope)) { err(red(`--scope must be project or user, got "${scope}"`)); process.exit(2); }
  const dir = resolve(process.cwd(), flags.dir || '.');
  if (!existsSync(dir) || !statSync(dir).isDirectory()) { err(red(`Not a directory: ${flags.dir}`)); process.exit(2); }
  const home = resolve(flags.home || homedir());
  return { scope, dir, home };
}

function printPlan(items, { dir, home, scope }) {
  const w = Math.min(46, Math.max(...items.map(i => (i.rel || '').length), 10) + 2);
  for (const it of items) {
    const label = pad(it.action, 10);
    const where = scope === 'user' ? it.abs.replace(home, '~') : (relative(dir, it.abs) || it.rel);
    out(`  ${ACTION_STYLE[it.action](label)}${pad(where, w)}${dim(it.harness.name + (it.note ? ' · ' + it.note : ''))}`);
  }
}

function cmdInstall(pos, flags) {
  const ids = resolveHarnessIds(pos);
  if (!ids) {
    err(yellow('Usage: supermd install <harness...|all> [--field <profession>] [--scope project|user] [--dry-run]'));
    err(dim('Harnesses: ' + HARNESSES.map(h => h.id).join(', ')));
    process.exit(2);
  }
  const lang = flags.lang || 'en';
  const { scope, dir, home } = scopeAndDirs(flags);
  const r = compose({ field: flags.field, style: flags.style, lang, coreOnly: !flags.field }, ROOT);
  if (!r.ok && r.error === 'field-not-found') {
    err(red(`No module for "${flags.field}".`));
    r.candidates?.forEach(f => err(`  ${cyan(f.slug)}  ${dim('· ' + f.categoryName)}`));
    err(dim(`Or cover any profession: supermd adapt "${flags.field}"`));
    process.exit(1);
  }
  if (!r.ok) { err(red(r.error)); process.exit(1); }
  r.warnings.forEach(w => err(yellow('! ' + w)));

  const meta = { v: VERSION, lang, field: r.field?.slug, style: flags.style };
  const { items, warnings } = planInstall(ids, { prompt: r.prompt, meta, scope, dir, home, force: !!flags.force });
  const applied = applyPlan(items, { dryRun: !!flags['dry-run'], root: scope === 'user' ? home : dir });

  out(`${bold(flags['dry-run'] ? 'Plan (nothing written)' : 'SuperMD ' + VERSION)} ${dim('· ' + (r.field ? `core + ${r.field.categoryName} / ${r.field.name}` : 'universal core') + (flags.style ? ' + ' + flags.style : '') + ` · ${lang} · ${scope} scope`)}`);
  printPlan(applied, { dir, home, scope });
  warnings.forEach(w => err(yellow('! ' + w)));

  const written = applied.filter(i => ['create', 'update'].includes(i.action)).length;
  const conflicts = applied.filter(i => i.action === 'conflict');
  const kb = (r.prompt.length / 1024).toFixed(1);
  if (conflicts.length) err(red(`${conflicts.length} file(s) left untouched: they exist and SuperMD does not own them. Re-run with --force to overwrite.`));
  if (!flags['dry-run']) out(dim(`${written} file(s) written · ${kb} KB of rules · review with \`git diff\` · remove with \`supermd uninstall ${pos.join(' ')}\``));
  if (conflicts.length) process.exitCode = 1;
}

function cmdUninstall(pos, flags) {
  const ids = resolveHarnessIds(pos);
  if (!ids) { err(yellow('Usage: supermd uninstall <harness...|all> [--scope project|user]')); process.exit(2); }
  const { scope, dir, home } = scopeAndDirs(flags);
  const { items } = planUninstall(ids, { scope, dir, home, force: !!flags.force });
  const applied = applyPlan(items, { dryRun: !!flags['dry-run'], root: scope === 'user' ? home : dir });
  const touched = applied.filter(i => i.action !== 'skip');
  if (!touched.length) { out(dim('Nothing to remove: no SuperMD files found.')); return; }
  out(bold(flags['dry-run'] ? 'Plan (nothing removed)' : 'Removed SuperMD') + dim(` · ${scope} scope`));
  printPlan(touched, { dir, home, scope });
  if (touched.some(i => i.action === 'conflict')) process.exitCode = 1;
}

function cmdStatus(flags) {
  const dir = resolve(process.cwd(), flags.dir || '.');
  const home = resolve(flags.home || homedir());
  const found = detect({ dir, home });
  if (!found.length) { out(dim('SuperMD is not installed in this project or in your home directory.')); out(dim('Try: supermd install claude-code')); return; }
  const w = Math.min(44, Math.max(...found.map(f => (f.rel + (f.extra ? ` (+${f.extra} more)` : '')).length)) + 2);
  for (const f of found) {
    const m = f.meta;
    const current = m.v === VERSION;
    const what = [m.field ? `core + ${m.field}` : 'core', m.style, m.lang].filter(Boolean).join(' · ');
    const where = f.rel + (f.extra ? ` (+${f.extra} more)` : '');
    const harness = f.harness.id === 'agents-md' ? 'AGENTS.md readers' : f.harness.name;
    out(`  ${pad(where, w)}${pad(harness, 26)}${dim(pad(f.scope, 9))}${pad(what, 30)}${current ? green('v' + m.v + ' ✓') : yellow('v' + (m.v || '?') + ' → v' + VERSION)}${f.via ? dim(' via ' + f.via) : ''}`);
  }
  if (found.some(f => f.meta.v !== VERSION)) err(dim('Update: re-run `supermd install <harness>` with the same options; it replaces only the SuperMD block.'));
}

function cmdHarnesses() {
  out(`${bold('Supported harnesses')} ${dim('(id · project file · user file)')}`);
  for (const h of HARNESSES) {
    const p = h.targets.filter(t => t.scope === 'project').map(t => t.path).join(', ') || dim('—');
    const u = h.targets.filter(t => t.scope === 'user').map(t => t.path).join(', ') || dim('—');
    out(`  ${cyan(pad(h.id, 13))}${pad(p, 38)}${dim(u)}`);
  }
  out('');
  out(dim('Shared files (AGENTS.md) are written once. `supermd install all` installs everything; pick only what you use.'));
}

const { flags, pos } = parseArgs(process.argv.slice(2));
const cmd = pos.shift();
if (flags.version || cmd === 'version') { out(`supermd ${VERSION}`); process.exit(0); }
if (flags.help || cmd === 'help' || !cmd) { out(HELP); process.exit(cmd ? 0 : (flags.help ? 0 : 1)); }

try {
  if (cmd === 'build') cmdBuild(pos, flags);
  else if (cmd === 'adapt') cmdAdapt(pos, flags);
  else if (cmd === 'list') cmdList(pos, flags);
  else if (cmd === 'check') await cmdCheck(pos, flags);
  else if (cmd === 'install') cmdInstall(pos, flags);
  else if (cmd === 'uninstall') cmdUninstall(pos, flags);
  else if (cmd === 'status') cmdStatus(flags);
  else if (cmd === 'harnesses') cmdHarnesses();
  else if (cmd === 'mcp') await serveStdio({ root: ROOT, version: VERSION });
  else { err(red(`Unknown command: ${cmd}`)); err(dim('Run `supermd help`.')); process.exit(2); }
} catch (e) {
  err(red('Error: ' + (e?.message || e)));
  process.exit(1);
}
