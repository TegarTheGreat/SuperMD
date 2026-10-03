#!/usr/bin/env node
// Tests for `supermd install | uninstall | status | harnesses` and the
// harness registry. Every test runs in a throwaway directory; the user's real
// home directory is never touched (--home points at a temp dir).
// Zero dependencies; exit 1 on any failure.

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HARNESSES, splitPrompt } from '../lib/harnesses.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'bin', 'supermd.mjs');

let failures = 0;
function t(name, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'supermd-install-'));
  const home = mkdtempSync(join(tmpdir(), 'supermd-home-'));
  try { fn({ dir, home }); console.log(`  ok  ${name}`); }
  catch (e) { failures++; console.error(`FAIL  ${name}\n      ${e.message}`); }
  finally { rmSync(dir, { recursive: true, force: true }); rmSync(home, { recursive: true, force: true }); }
}
function run(args, { dir, home }) {
  const r = spawnSync('node', [CLI, ...args, '--dir', dir, '--home', home], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  return { code: r.status ?? 1, out: `${r.stdout || ''}${r.stderr || ''}` };
}
const read = (dir, p) => readFileSync(join(dir, p), 'utf8');
const list = dir => readdirSync(dir, { recursive: true }).map(String).filter(p => !p.startsWith('.git')).sort();

// ------------------------------------------------------------------ registry
t('registry: ids are unique and every harness has at least one target', () => {
  const ids = HARNESSES.map(h => h.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const h of HARNESSES) assert.ok(h.targets.length > 0, h.id);
});

t('registry: every target declares a valid scope, mode, and relative path', () => {
  for (const h of HARNESSES) for (const x of h.targets) {
    assert.ok(['project', 'user'].includes(x.scope), `${h.id} scope`);
    assert.ok(['block', 'owned'].includes(x.mode), `${h.id} mode`);
    assert.ok(!x.path.startsWith('/') && !x.path.includes('..'), `${h.id} path ${x.path}`);
    if (x.scope === 'user') assert.ok(x.path.startsWith('~/'), `${h.id} user path must start with ~/`);
  }
});

t('splitPrompt: chunks respect the cap and lose no content', () => {
  const text = Array.from({ length: 40 }, (_, i) => `${i + 1}. ${'word '.repeat(60).trim()}`).join('\n');
  const chunks = splitPrompt(text, 1000);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.length <= 1000, `chunk of ${c.length}`);
  assert.equal(chunks.join('\n'), text);
});

t('docs: en and id integration guides list every harness id and project path', () => {
  for (const lang of ['en', 'id']) {
    const doc = readFileSync(join(ROOT, lang, 'docs', 'integrations.md'), 'utf8');
    for (const h of HARNESSES) {
      assert.ok(doc.includes(`\`${h.id}\``), `${lang}: ${h.id} missing from integrations.md`);
      for (const x of h.targets) assert.ok(doc.includes(`\`${x.path}\``) || doc.includes(x.path), `${lang}: ${x.path} (${h.id}) missing`);
    }
  }
});

// ------------------------------------------------------------------- install
t('install claude-code creates CLAUDE.md with a marked block and no front matter', ctx => {
  const r = run(['install', 'claude-code'], ctx);
  assert.equal(r.code, 0, r.out);
  const md = read(ctx.dir, 'CLAUDE.md');
  assert.match(md, /<!-- supermd:begin /);
  assert.match(md, /<!-- supermd:end -->/);
  assert.match(md, /# SuperMD Core/);
  assert.ok(!/^---$/m.test(md), 'front matter leaked into the block');
});

t('install preserves existing content and replaces only its own block on re-install', ctx => {
  writeFileSync(join(ctx.dir, 'CLAUDE.md'), '# Team rules\n\nAlways run the linter.\n');
  run(['install', 'claude-code'], ctx);
  const first = read(ctx.dir, 'CLAUDE.md');
  assert.match(first, /^# Team rules\n\nAlways run the linter\.\n\n<!-- supermd:begin/);
  const again = run(['install', 'claude-code', '--field', 'nursing'], ctx);
  assert.equal(again.code, 0, again.out);
  const second = read(ctx.dir, 'CLAUDE.md');
  assert.match(second, /Always run the linter\./);
  assert.equal(second.match(/supermd:begin/g).length, 1, 'block was duplicated instead of replaced');
  assert.match(second, /field=nursing/);
  assert.match(second, /Nursing/);
});

t('install is idempotent: a second identical run reports unchanged and writes nothing', ctx => {
  run(['install', 'claude-code'], ctx);
  const before = read(ctx.dir, 'CLAUDE.md');
  const r = run(['install', 'claude-code'], ctx);
  assert.match(r.out, /unchanged/);
  assert.equal(read(ctx.dir, 'CLAUDE.md'), before);
});

t('--dry-run prints the plan and writes nothing', ctx => {
  const r = run(['install', 'claude-code', 'cursor', '--dry-run'], ctx);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /create\s+CLAUDE\.md/);
  assert.deepEqual(list(ctx.dir), []);
});

t('shared files are written once: codex + agents-md + amp share one AGENTS.md', ctx => {
  const r = run(['install', 'codex', 'agents-md', 'amp'], ctx);
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(list(ctx.dir), ['AGENTS.md']);
  assert.equal(read(ctx.dir, 'AGENTS.md').match(/supermd:begin/g).length, 1);
  assert.match(r.out, /skip\s+AGENTS\.md/);
});

t('owned rule files carry their harness front matter and a managed marker', ctx => {
  run(['install', 'cursor', 'continue', 'kiro'], ctx);
  assert.match(read(ctx.dir, '.cursor/rules/supermd.mdc'), /^---\n[\s\S]*alwaysApply: true\n---\n<!-- supermd:managed /);
  assert.match(read(ctx.dir, '.continue/rules/supermd.md'), /^---\nname: SuperMD\nalwaysApply: true\n---\n/);
  assert.match(read(ctx.dir, '.kiro/steering/supermd.md'), /^---\ninclusion: always\n---\n/);
});

t('install refuses to overwrite an owned-mode file SuperMD did not write, unless --force', ctx => {
  mkdirSync(join(ctx.dir, '.cursor/rules'), { recursive: true });
  writeFileSync(join(ctx.dir, '.cursor/rules/supermd.mdc'), 'my own rule\n');
  const r = run(['install', 'cursor'], ctx);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /conflict/);
  assert.equal(read(ctx.dir, '.cursor/rules/supermd.mdc'), 'my own rule\n');
  const f = run(['install', 'cursor', '--force'], ctx);
  assert.equal(f.code, 0, f.out);
  assert.match(read(ctx.dir, '.cursor/rules/supermd.mdc'), /supermd:managed/);
});

t('--scope user writes under --home, never the project', ctx => {
  const r = run(['install', 'claude-code', 'codex', 'copilot', 'zed', '--scope', 'user'], ctx);
  assert.equal(r.code, 0, r.out);
  assert.ok(existsSync(join(ctx.home, '.claude', 'CLAUDE.md')));
  assert.ok(existsSync(join(ctx.home, '.codex', 'AGENTS.md')));
  assert.ok(existsSync(join(ctx.home, '.copilot', 'copilot-instructions.md')));
  assert.ok(existsSync(join(ctx.home, '.config', 'zed', 'AGENTS.md')));
  assert.deepEqual(list(ctx.dir), []);
});

t('a harness without a user-scope location is skipped with a note, not an error', ctx => {
  const r = run(['install', 'cursor', '--scope', 'user'], ctx);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /no user-scope location/);
  assert.match(r.out, /Settings → Rules/);
  assert.deepEqual(list(ctx.home), []);
});

t('--lang id installs the Indonesian core', ctx => {
  run(['install', 'claude-code', '--lang', 'id'], ctx);
  const md = read(ctx.dir, 'CLAUDE.md');
  assert.match(md, /lang=id/);
  assert.match(md, /Core SuperMD|SuperMD Core/);
  assert.ok(/[Ss]lop/.test(md) && /Jangan|jangan|Dilarang|Larang/.test(md), 'expected Indonesian rule text');
});

t('--field with an unknown profession fails with suggestions and writes nothing', ctx => {
  const r = run(['install', 'claude-code', '--field', 'zzzz-not-a-field'], ctx);
  assert.equal(r.code, 1);
  assert.match(r.out, /No module for/);
  assert.deepEqual(list(ctx.dir), []);
});

t('an unknown harness exits 2 with a suggestion', ctx => {
  const r = run(['install', 'claud-code'], ctx);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /Unknown harness/);
  assert.match(r.out, /claude-code/);
});

t('Windsurf: the core alone fits one rule file; with a module it splits under the 12000-char cap', ctx => {
  run(['install', 'windsurf'], ctx);
  assert.deepEqual(list(join(ctx.dir, '.windsurf/rules')), ['supermd.md']);
  run(['install', 'windsurf', '--field', 'nursing'], ctx);
  const files = list(join(ctx.dir, '.windsurf/rules'));
  assert.ok(files.length >= 2, `expected a split, got ${files}`);
  assert.ok(!files.includes('supermd.md'), 'the single-file install must be replaced by the split files');
  let body = '';
  for (const f of files) {
    const txt = read(ctx.dir, `.windsurf/rules/${f}`);
    assert.ok(txt.length <= 12000, `${f} is ${txt.length} chars`);
    assert.match(txt, /^---\ntrigger: always_on\n---\n/);
    body += txt;
  }
  assert.match(body, /Nursing/);
  assert.match(body, /Format/);
});

// ------------------------------------------- CLAUDE.md <-> AGENTS.md bridge
t('claude-code next to a user-owned AGENTS.md imports it instead of hiding it', ctx => {
  writeFileSync(join(ctx.dir, 'AGENTS.md'), '# Build\n\nRun npm test.\n');
  const r = run(['install', 'claude-code'], ctx);
  assert.equal(r.code, 0, r.out);
  const md = read(ctx.dir, 'CLAUDE.md');
  assert.match(md, /^@AGENTS\.md\n\n<!-- supermd:begin/);
  assert.equal(read(ctx.dir, 'AGENTS.md'), '# Build\n\nRun npm test.\n', 'AGENTS.md must be untouched');
});

t('claude-code + codex: AGENTS.md carries the rules once and CLAUDE.md only imports it', ctx => {
  const r = run(['install', 'claude-code', 'codex'], ctx);
  assert.equal(r.code, 0, r.out);
  assert.equal(read(ctx.dir, 'CLAUDE.md'), '@AGENTS.md\n');
  assert.equal(read(ctx.dir, 'AGENTS.md').match(/supermd:begin/g).length, 1);
  const again = run(['install', 'claude-code', 'codex'], ctx);
  assert.match(again.out, /unchanged/);
  assert.equal(read(ctx.dir, 'CLAUDE.md'), '@AGENTS.md\n');
});

t('a second claude-code install after the bridge does not duplicate the rules', ctx => {
  run(['install', 'codex'], ctx);
  run(['install', 'claude-code'], ctx);
  run(['install', 'claude-code'], ctx);
  assert.equal(read(ctx.dir, 'CLAUDE.md'), '@AGENTS.md\n');
});

t('an existing CLAUDE.md without the import gets a normal block, not a bridge', ctx => {
  writeFileSync(join(ctx.dir, 'AGENTS.md'), '# Build\n');
  writeFileSync(join(ctx.dir, 'CLAUDE.md'), '# Mine\n');
  run(['install', 'claude-code'], ctx);
  const md = read(ctx.dir, 'CLAUDE.md');
  assert.match(md, /^# Mine\n\n<!-- supermd:begin/);
  assert.ok(!md.includes('@AGENTS.md'));
});

t('uninstall all removes the bridge together with the AGENTS.md it pointed at', ctx => {
  run(['install', 'claude-code', 'codex'], ctx);
  const r = run(['uninstall', 'all'], ctx);
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(list(ctx.dir), []);
});

t('uninstall claude-code alone keeps a user-owned AGENTS.md and a lone import is harmless', ctx => {
  writeFileSync(join(ctx.dir, 'AGENTS.md'), '# Build\n');
  run(['install', 'claude-code'], ctx);
  run(['uninstall', 'claude-code'], ctx);
  assert.equal(read(ctx.dir, 'AGENTS.md'), '# Build\n');
  assert.equal(read(ctx.dir, 'CLAUDE.md'), '@AGENTS.md\n');
});

// ----------------------------------------------------------------- uninstall
t('uninstall removes the block, keeps the user content, and deletes files it created', ctx => {
  writeFileSync(join(ctx.dir, 'CLAUDE.md'), '# Team rules\n\nAlways run the linter.\n');
  run(['install', 'claude-code', 'cursor'], ctx);
  const r = run(['uninstall', 'all'], ctx);
  assert.equal(r.code, 0, r.out);
  assert.equal(read(ctx.dir, 'CLAUDE.md'), '# Team rules\n\nAlways run the linter.\n');
  assert.deepEqual(list(ctx.dir), ['CLAUDE.md'], 'created files and now-empty directories must be gone');
});

t('uninstall leaves a same-named file that SuperMD does not own', ctx => {
  mkdirSync(join(ctx.dir, '.cursor/rules'), { recursive: true });
  writeFileSync(join(ctx.dir, '.cursor/rules/supermd.mdc'), 'mine\n');
  const r = run(['uninstall', 'cursor'], ctx);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /not managed by SuperMD/);
  assert.equal(read(ctx.dir, '.cursor/rules/supermd.mdc'), 'mine\n');
});

t('uninstall on a clean project is a no-op that says so', ctx => {
  const r = run(['uninstall', 'all'], ctx);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Nothing to remove/);
});

// -------------------------------------------------------- status / harnesses
t('status reports installs and flags an outdated block', ctx => {
  run(['install', 'claude-code', '--field', 'backend'], ctx);
  const ok = run(['status'], ctx);
  assert.match(ok.out, /CLAUDE\.md/);
  assert.match(ok.out, /core \+ backend/);
  assert.match(ok.out, /✓/);
  const md = read(ctx.dir, 'CLAUDE.md').replace(/ v=[\w.]+/, ' v=0.0.1');
  writeFileSync(join(ctx.dir, 'CLAUDE.md'), md);
  const stale = run(['status'], ctx);
  assert.match(stale.out, /v0\.0\.1 → v/);
});

t('status collapses split Windsurf files and shows the CLAUDE.md bridge', ctx => {
  run(['install', 'claude-code', 'codex', 'windsurf', '--field', 'nursing'], ctx);
  const out = run(['status'], ctx).out;
  assert.match(out, /supermd-01\.md \(\+1 more\)/);
  assert.ok(!/supermd-02\.md/.test(out), 'split parts must collapse into one row');
  assert.match(out, /CLAUDE\.md.*via @AGENTS\.md/);
});

t('status on a clean project says SuperMD is not installed', ctx => {
  assert.match(run(['status'], ctx).out, /not installed/);
});

t('harnesses lists every registered id', ctx => {
  const r = run(['harnesses'], ctx);
  assert.equal(r.code, 0);
  for (const h of HARNESSES) assert.ok(r.out.includes(h.id), `missing ${h.id}`);
});

if (failures) { console.error(`\n${failures} install test(s) failed`); process.exit(1); }
console.log('\nall install tests pass');
