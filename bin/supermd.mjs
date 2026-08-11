#!/usr/bin/env node
// supermd — compose anti-slop system prompts and lint text for slop.
// Zero dependencies; Node 18+. The Markdown tree is the single source of truth.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog, compose, adapt } from '../lib/compose.mjs';
import { scan, loadLexicon, hardTotal, softTotal } from '../lib/slop-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

// tiny ANSI helpers (skip when not a TTY or NO_COLOR is set)
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
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
      if (['core-only', 'no-banner'].includes(key)) flags[key] = true;
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
  supermd check [file] [--lang en|id]        (reads stdin if no file)
  supermd help | version

${bold('EXAMPLES')}
  supermd build software-engineering --style technical
  supermd build nursing --lang id --out prompt.txt
  supermd build --core-only                 # just the universal core
  supermd adapt "beekeeper"                  # any profession, via the adapter
  supermd list technology
  cat draft.md | supermd check               # score text for AI-slop
  supermd check article.txt --lang id

${bold('OPTIONS')}
  --lang en|id     language (default en)
  --style NAME     formal | conversational | technical
  --core-only      emit only the universal core
  --out FILE       write to FILE instead of stdout
  --no-banner      omit the "assembled by" comment header
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
  const r = compose({ field, style: flags.style, lang, coreOnly: flags['core-only'] }, ROOT);
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
  const r = adapt(field, lang, ROOT);
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

async function cmdCheck(pos, flags) {
  const lang = flags.lang || 'en';
  let text, src;
  if (pos[0] && pos[0] !== '-') {
    const p = resolve(process.cwd(), pos[0]);
    if (!existsSync(p)) { err(red(`File not found: ${pos[0]}`)); process.exit(2); }
    text = readFileSync(p, 'utf8'); src = pos[0];
  } else {
    if (process.stdin.isTTY) { err(yellow('Usage: supermd check <file> | ... | supermd check')); process.exit(2); }
    text = await readStdin(); src = 'stdin';
  }
  const hits = scan(text, lang, loadLexicon(ROOT));
  const hard = hardTotal(hits), soft = softTotal(hits);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (hard === 0 && soft === 0) { out(green(`✓ clean — no slop patterns in ${src} (${words} words, ${lang})`)); return; }
  out(`${src} ${dim('· ' + words + ' words · ' + lang)}`);
  for (const h of hits.hard) out(`  ${red('hard')}  ${h.name}${dim(' ×' + h.count)}  ${dim('e.g. ' + JSON.stringify(h.sample).slice(0, 60))}`);
  for (const h of hits.soft) out(`  ${yellow('soft')}  ${h.name}${dim(' ×' + h.count)}  ${dim('e.g. ' + JSON.stringify(h.sample).slice(0, 60))}`);
  out(`${hard ? red(hard + ' hard') : green('0 hard')}, ${soft} soft ${dim('· hard = unambiguous slop; soft = weak/context signals')}`);
  if (hard > 0) process.exitCode = 1;
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
  else { err(red(`Unknown command: ${cmd}`)); err(dim('Run `supermd help`.')); process.exit(2); }
} catch (e) {
  err(red('Error: ' + (e?.message || e)));
  process.exit(1);
}
