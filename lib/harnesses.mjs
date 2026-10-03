// SuperMD harness installer — knows where each AI coding harness reads
// always-on instructions, in what shape, and how to write SuperMD there without
// clobbering anything the user already has. Zero dependencies; Node 18+.
//
// Write modes:
//   block — a shared Markdown file (AGENTS.md, CLAUDE.md, …). SuperMD owns only
//           the region between its begin/end markers; everything else is kept.
//   owned — a dedicated rules file SuperMD owns outright (front matter + body).
//           Uninstall deletes it only while it still carries the managed marker.
//
// The registry (./harness-registry.mjs) is data, not code: every path and
// front-matter key is a documented convention of that harness. See
// en/docs/integrations.md for sources and the date each was verified.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { HARNESSES } from './harness-registry.mjs';

export { HARNESSES };

const BEGIN_RE = /<!-- supermd:begin([^>]*)-->/;
const END_MARK = '<!-- supermd:end -->';
const OWNED_RE = /<!-- supermd:managed([^>]*)-->/;

// ---------------------------------------------------------------- lookups
const norm = s => String(s).toLowerCase().trim().replace(/[\s_]+/g, '-');

export function findHarness(query) {
  const q = norm(query);
  return HARNESSES.find(h => h.id === q || (h.aliases || []).includes(q)) || null;
}

export function suggestHarnesses(query) {
  const q = norm(query);
  return HARNESSES.filter(h => h.id.includes(q) || q.includes(h.id) || [h.id, ...(h.aliases || [])].some(a => a.startsWith(q.slice(0, 3)))).slice(0, 5);
}

// ------------------------------------------------------------------- meta
const fmtMeta = meta => Object.entries(meta).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${/\s/.test(String(v)) ? JSON.stringify(v) : v}`).join(' ');
export function parseMeta(str) {
  const meta = {};
  for (const m of String(str).matchAll(/([\w-]+)=("[^"]*"|\S+)/g)) meta[m[1]] = m[2].replace(/^"|"$/g, '');
  return meta;
}

function renderBlock(prompt, meta) {
  return `<!-- supermd:begin ${fmtMeta(meta)} -->\n${prompt.trim()}\n${END_MARK}`;
}

// Quote a YAML scalar only when it needs it.
const yamlScalar = v => (typeof v === 'string' && /[:#\n'"{}\[\],&*!|>%@`]|^\s|\s$|^(true|false|null|yes|no|~)$/i.test(v) ? JSON.stringify(v) : String(v));
const renderFrontmatter = fm => (fm && Object.keys(fm).length
  ? `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${yamlScalar(v)}`).join('\n')}\n---\n`
  : '');

function renderOwned(prompt, meta, target) {
  const head = renderFrontmatter(target.frontmatter);
  return `${head}<!-- supermd:managed ${fmtMeta(meta)} -->\n\n${prompt.trim()}\n`;
}

// Split a prompt into chunks of at most `max` characters, so a harness with a
// per-file cap (Windsurf) still receives every rule. Cuts fall on the coarsest
// boundary that fits: an H2 heading, then a numbered rule, then a blank line.
const BOUNDARIES = [/\n(?=## )/, /\n(?=\d+\. )/, /\n\n/, /\n/];

export function splitPrompt(text, max, level = 0) {
  if (text.length <= max) return [text];
  const sep = BOUNDARIES[level];
  if (!sep) throw new Error(`cannot split a ${text.length}-char block under ${max} chars`);
  const chunks = [];
  let cur = '';
  for (const piece of text.split(sep)) {
    if (piece.length > max) {
      if (cur) { chunks.push(cur); cur = ''; }
      chunks.push(...splitPrompt(piece, max, level + 1));
    } else if (cur && (cur + '\n' + piece).length > max) {
      chunks.push(cur);
      cur = piece;
    } else {
      cur = cur ? cur + '\n' + piece : piece;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// --------------------------------------------------------------- targeting
function resolveTargets(harness, { scope, dir, home }) {
  const t = (harness.targets || []).filter(x => x.scope === scope);
  return t.map(x => ({
    ...x,
    abs: x.path.startsWith('~/') ? join(home, x.path.slice(2)) : resolve(dir, x.path),
    rel: x.path,
  }));
}

function readIf(abs) { return existsSync(abs) ? readFileSync(abs, 'utf8') : null; }

function blockInstall(cur, prompt, meta) {
  const block = renderBlock(prompt, meta);
  if (cur === null) return block + '\n';
  const b = cur.match(BEGIN_RE);
  if (b) {
    const start = b.index;
    const endIdx = cur.indexOf(END_MARK, start);
    if (endIdx === -1) throw new Error('found a supermd:begin marker without a matching supermd:end; fix or delete it by hand');
    return cur.slice(0, start) + block + cur.slice(endIdx + END_MARK.length);
  }
  return cur.trimEnd() + (cur.trim() ? '\n\n' : '') + block + '\n';
}

function blockUninstall(cur) {
  const b = cur.match(BEGIN_RE);
  if (!b) return null;
  const endIdx = cur.indexOf(END_MARK, b.index);
  if (endIdx === -1) throw new Error('found a supermd:begin marker without a matching supermd:end; fix or delete it by hand');
  const before = cur.slice(0, b.index).trimEnd();
  const after = cur.slice(endIdx + END_MARK.length).trimStart();
  return before && after ? `${before}\n\n${after}` : (before || after) ? `${before || after}\n`.replace(/^\n+/, '') : '';
}

// ------------------------------------------------------------------- plans
// A plan is a list of { harness, abs, rel, action, content } where action is
// create | update | unchanged | conflict | delete | skip. Nothing touches disk
// until applyPlan().

export function planInstall(ids, { prompt, meta, scope = 'project', dir = process.cwd(), home = homedir(), force = false }) {
  const items = [];
  const warnings = [];
  const seen = new Map(); // abs -> first harness, so shared files (AGENTS.md) are written once

  for (const id of ids) {
    const h = findHarness(id);
    if (!h) throw new Error(`unknown harness: ${id}`);
    const targets = resolveTargets(h, { scope, dir, home });
    if (!targets.length) {
      warnings.push(`${h.name} has no ${scope}-scope location; skipped.${scope === 'user' && h.userNote ? ' ' + h.userNote : ''}`);
      continue;
    }
    for (const t of targets) {
      if (seen.has(t.abs)) { items.push({ harness: h, abs: t.abs, rel: t.rel, action: 'skip', note: `already covered by ${seen.get(t.abs)}` }); continue; }
      seen.set(t.abs, h.name);

      const cur = readIf(t.abs);
      if (t.mode === 'owned') {
        const parts = t.maxChars ? splitPrompt(prompt, t.maxChars - (t.overhead || 400)) : [prompt];
        parts.forEach((part, i) => {
          const rel = parts.length === 1 ? t.rel : t.rel.replace(/(\.[^./]+)$/, `-${String(i + 1).padStart(2, '0')}$1`);
          const abs = parts.length === 1 ? t.abs : t.abs.replace(/(\.[^./]+)$/, `-${String(i + 1).padStart(2, '0')}$1`);
          const content = renderOwned(part, { ...meta, ...(parts.length > 1 ? { part: `${i + 1}/${parts.length}` } : {}) }, t);
          const existing = parts.length === 1 ? cur : readIf(abs);
          let action;
          if (existing === null) action = 'create';
          else if (!OWNED_RE.test(existing) && !force) action = 'conflict';
          else action = existing === content ? 'unchanged' : 'update';
          items.push({ harness: h, abs, rel, action, content, note: parts.length > 1 ? `part ${i + 1} of ${parts.length} (harness limit ${t.maxChars} chars/file)` : undefined });
        });
        // A previous single-file install must not linger next to the split files (and vice versa).
        if (parts.length > 1 && cur !== null && OWNED_RE.test(cur)) items.push({ harness: h, abs: t.abs, rel: t.rel, action: 'delete', note: 'replaced by split files' });
      } else {
        let content, action;
        try { content = blockInstall(cur, prompt, meta); }
        catch (e) { items.push({ harness: h, abs: t.abs, rel: t.rel, action: 'conflict', note: e.message }); continue; }
        action = cur === null ? 'create' : content === cur ? 'unchanged' : 'update';
        items.push({ harness: h, abs: t.abs, rel: t.rel, action, content });
      }
    }
    if (h.after) warnings.push(...h.after(scope).map(w => `${h.name}: ${w}`));
  }
  if (scope === 'project') bridgeClaude(items, { prompt, meta, dir });
  return { items, warnings };
}

// Claude Code reads AGENTS.md only when no CLAUDE.md exists. Creating a
// CLAUDE.md next to an existing AGENTS.md would therefore hide that file from
// Claude Code, so the new CLAUDE.md imports it (`@AGENTS.md`). When AGENTS.md
// already carries the SuperMD block, the import alone is enough and the rules
// are not duplicated.
function bridgeClaude(items, { prompt, meta, dir }) {
  const agentsAbs = join(dir, 'AGENTS.md');
  const claudeAbs = join(dir, 'CLAUDE.md');
  const claude = items.find(i => i.abs === claudeAbs && i.harness.id === 'claude-code' && ['create', 'update', 'unchanged'].includes(i.action));
  if (!claude) return;
  const planned = items.find(i => i.abs === agentsAbs && i.content !== undefined && ['create', 'update', 'unchanged'].includes(i.action));
  const agents = planned ? planned.content : readIf(agentsAbs);
  if (agents === null) return;
  const agentsHasBlock = BEGIN_RE.test(agents);
  const cur = readIf(claudeAbs);
  const imports = cur !== null && /^@AGENTS\.md\s*$/m.test(cur);
  if (cur === null) {
    claude.content = `@AGENTS.md\n${agentsHasBlock ? '' : '\n' + renderBlock(prompt, meta) + '\n'}`;
    claude.note = agentsHasBlock ? 'imports AGENTS.md, which carries the rules' : 'imports AGENTS.md (Claude Code ignores it once CLAUDE.md exists)';
  } else if (imports && agentsHasBlock && !BEGIN_RE.test(cur)) {
    claude.content = cur;
    claude.action = 'unchanged';
    claude.note = 'covered through its @AGENTS.md import';
  }
}

export function planUninstall(ids, { scope = 'project', dir = process.cwd(), home = homedir(), force = false }) {
  const items = [];
  const seen = new Set();
  for (const id of ids) {
    const h = findHarness(id);
    if (!h) throw new Error(`unknown harness: ${id}`);
    for (const t of resolveTargets(h, { scope, dir, home })) {
      const candidates = t.mode === 'owned' ? ownedFiles(t) : [t.abs];
      for (const abs of candidates) {
        if (seen.has(abs)) continue;
        seen.add(abs);
        const rel = relative(dir, abs) || t.rel;
        const cur = readIf(abs);
        if (cur === null) { items.push({ harness: h, abs, rel, action: 'skip', note: 'not present' }); continue; }
        if (t.mode === 'owned') {
          if (OWNED_RE.test(cur) || force) items.push({ harness: h, abs, rel, action: 'delete' });
          else items.push({ harness: h, abs, rel, action: 'conflict', note: 'exists but is not managed by SuperMD; left alone (use --force to delete)' });
        } else {
          let next;
          try { next = blockUninstall(cur); }
          catch (e) { items.push({ harness: h, abs, rel, action: 'conflict', note: e.message }); continue; }
          if (next === null) items.push({ harness: h, abs, rel, action: 'skip', note: 'no SuperMD block' });
          else if (next.trim() === '') items.push({ harness: h, abs, rel, action: 'delete', note: 'file held only the SuperMD block' });
          else items.push({ harness: h, abs, rel, action: 'update', content: next });
        }
      }
    }
  }
  // A CLAUDE.md reduced to a lone `@AGENTS.md` import is pointless once AGENTS.md is gone.
  const agentsGone = items.some(i => i.abs === join(dir, 'AGENTS.md') && i.action === 'delete');
  for (const i of items) {
    if (!agentsGone || i.abs !== join(dir, 'CLAUDE.md') || !['update', 'skip'].includes(i.action)) continue;
    const after = i.action === 'update' ? i.content : readIf(i.abs);
    if (after !== null && after.trim() === '@AGENTS.md') {
      i.action = 'delete'; i.note = 'held only an import of the removed AGENTS.md'; delete i.content;
    }
  }
  return { items, warnings: [] };
}

// An owned target may have been written as several split files: supermd.md or
// supermd-01.md, supermd-02.md, …
function ownedFiles(t) {
  const files = [t.abs];
  const d = dirname(t.abs);
  const stem = t.abs.slice(d.length + 1).replace(/(\.[^./]+)$/, '');
  const ext = (t.abs.match(/(\.[^./]+)$/) || [''])[1];
  if (existsSync(d)) for (const f of readdirSync(d)) if (f.startsWith(stem + '-') && f.endsWith(ext) && /-\d{2}\.[^.]+$/.test(f)) files.push(join(d, f));
  return files;
}

export function applyPlan(items, { dryRun = false, root } = {}) {
  const done = [];
  for (const it of items) {
    if (['unchanged', 'skip', 'conflict'].includes(it.action)) { done.push(it); continue; }
    if (!dryRun) {
      if (it.action === 'delete') { rmSync(it.abs, { force: true }); pruneEmptyDirs(dirname(it.abs), root); }
      else { mkdirSync(dirname(it.abs), { recursive: true }); writeFileSync(it.abs, it.content); }
    }
    done.push(it);
  }
  return done;
}

// Remove directories this installer created once they are empty, stopping at
// the project (or home) root and never above it.
function pruneEmptyDirs(dir, root) {
  if (!root) return;
  const stop = resolve(root);
  let d = resolve(dir);
  while (d.startsWith(stop + sep) && existsSync(d) && readdirSync(d).length === 0) {
    rmdirSync(d);
    d = dirname(d);
  }
}

// ------------------------------------------------------------------ status
// Scan every registered location for SuperMD markers. Split rule files
// (supermd-01.md, supermd-02.md, …) collapse into one entry with `extra` counting
// the others, and a CLAUDE.md that only imports a SuperMD-carrying AGENTS.md is
// reported with `via: '@AGENTS.md'`.
export function detect({ dir = process.cwd(), home = homedir() } = {}) {
  const found = [];
  const seen = new Set();
  const groups = new Map();
  for (const h of HARNESSES) {
    for (const scope of ['project', 'user']) {
      for (const t of resolveTargets(h, { scope, dir, home })) {
        const files = t.mode === 'owned' ? ownedFiles(t) : [t.abs];
        for (const abs of files) {
          if (seen.has(abs)) continue;
          const cur = readIf(abs);
          if (cur === null) continue;
          const m = t.mode === 'owned' ? cur.match(OWNED_RE) : cur.match(BEGIN_RE);
          if (!m) continue;
          seen.add(abs);
          const key = abs.replace(/-\d{2}(\.[^./]+)$/, '$1');
          if (groups.has(key)) { groups.get(key).extra++; continue; }
          const entry = { harness: h, scope, abs, rel: scope === 'user' ? abs.replace(home, '~') : relative(dir, abs), meta: parseMeta(m[1]), extra: 0 };
          groups.set(key, entry);
          found.push(entry);
        }
      }
    }
  }
  const claude = join(dir, 'CLAUDE.md');
  const cm = readIf(claude);
  const agents = found.find(f => f.abs === join(dir, 'AGENTS.md'));
  if (cm !== null && agents && !BEGIN_RE.test(cm) && /^@AGENTS\.md\s*$/m.test(cm)) {
    found.push({ harness: findHarness('claude-code'), scope: 'project', abs: claude, rel: 'CLAUDE.md', meta: agents.meta, extra: 0, via: '@AGENTS.md' });
  }
  return found;
}
