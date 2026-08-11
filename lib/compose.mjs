// SuperMD prompt composer — resolves a profession to its modules and assembles
// a system prompt (core + category + sub-field + optional style). Reads the
// Markdown tree as the single source of truth. Zero dependencies; Node 18+.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const slugify = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function frontName(file) {
  try {
    const m = readFileSync(file, 'utf8').match(/^name:\s*"?([^"\n]+)"?/m);
    return m ? m[1].trim() : basename(file, '.md');
  } catch {
    return basename(file, '.md');
  }
}

// Full catalog: [{ category, categoryName, fields: [{ slug, name, path }] }]
export function catalog(lang = 'en', root = ROOT) {
  const base = join(root, lang, 'domains');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()
    .map(cat => {
      const dir = join(base, cat);
      const fields = readdirSync(dir)
        .filter(f => f.endsWith('.md') && !f.startsWith('_'))
        .sort()
        .map(f => ({ slug: basename(f, '.md'), name: frontName(join(dir, f)), path: join(dir, f) }));
      return { category: cat, categoryName: frontName(join(dir, '_category.md')), fields };
    });
}

// Resolve a query (slug, display name, or loose term) to one field.
// Returns { match, candidates } — match is null when ambiguous or absent.
export function resolveField(query, lang = 'en', root = ROOT) {
  const q = slugify(query);
  const all = catalog(lang, root).flatMap(c =>
    c.fields.map(f => ({ ...f, category: c.category, categoryName: c.categoryName })));

  const exact = all.filter(f => f.slug === q);
  if (exact.length === 1) return { match: exact[0], candidates: [] };

  const commonPrefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
  const scored = all
    .map(f => {
      const s = f.slug, n = slugify(f.name);
      let score = 0;
      if (s === q || n === q) score = 100;
      else if (s.startsWith(q) || n.startsWith(q)) score = 80;
      else if (s.includes(q) || n.includes(q)) score = 60;
      else if (q.length >= 4 && (q.includes(s) || s.split('-').some(w => w.length >= 4 && q.includes(w)))) score = 40;
      else {
        // shared word-stem, e.g. "nurse" ~ "nursing", "dev" ~ "developer"
        const cp = Math.max(commonPrefix(q, s), commonPrefix(q, n), ...s.split('-').map(w => commonPrefix(q, w)));
        if (cp >= 4 && cp >= Math.min(q.length, s.length) * 0.6) score = 50;
      }
      return { f, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length && (scored.length === 1 || scored[0].score > scored[1].score))
    return { match: scored[0].f, candidates: scored.slice(1, 6).map(x => x.f) };
  return { match: null, candidates: scored.slice(0, 8).map(x => x.f) };
}

const read = p => readFileSync(p, 'utf8').trimEnd();

// Compose a system prompt. opts: { field, style, lang, coreOnly }.
// Returns { ok, prompt, parts, field, warnings }.
export function compose({ field, style, lang = 'en', coreOnly = false } = {}, root = ROOT) {
  const parts = [];
  const warnings = [];
  const langDir = join(root, lang);
  if (!existsSync(langDir)) return { ok: false, error: `unknown language: ${lang} (use en or id)` };

  parts.push({ label: `${lang}/SUPERMD.md`, text: read(join(langDir, 'SUPERMD.md')) });

  let resolved = null;
  if (field && !coreOnly) {
    const { match, candidates } = resolveField(field, lang, root);
    if (match) {
      resolved = match;
      parts.push({ label: `${lang}/domains/${match.category}/_category.md`, text: read(join(langDir, 'domains', match.category, '_category.md')) });
      parts.push({ label: `${lang}/domains/${match.category}/${match.slug}.md`, text: read(match.path) });
    } else {
      return { ok: false, error: 'field-not-found', field, candidates };
    }
  }

  if (style) {
    const stylePath = join(langDir, 'styles', `${slugify(style)}.md`);
    if (existsSync(stylePath)) parts.push({ label: `${lang}/styles/${slugify(style)}.md`, text: read(stylePath) });
    else warnings.push(`unknown style "${style}" — skipped (available: formal, conversational, technical)`);
  }

  return { ok: true, prompt: parts.map(p => p.text).join('\n\n'), parts, field: resolved, warnings };
}

// The universal adapter, with a one-line instruction to instantiate it for a
// named field — the path for any profession without a shipped module.
export function adapt(fieldDescription, lang = 'en', root = ROOT) {
  const adapterPath = join(root, lang, 'adapters', 'UNIVERSAL-ADAPTER.md');
  const adapter = read(adapterPath);
  const core = read(join(root, lang, 'SUPERMD.md'));
  const instr = lang === 'id'
    ? `Sebelum menjawab apa pun, instansiasi adapter di bawah untuk bidang "${fieldDescription}": isi setiap slot dengan konten konkret dan akurat untuk bidang itu, tunjukkan hasilnya, lalu ikuti untuk sisa percakapan.`
    : `Before answering anything else, instantiate the adapter below for the field "${fieldDescription}": fill every slot with concrete, accurate content for that field, show me the result, and then follow it for the rest of the conversation.`;
  return { prompt: `${core}\n\n${instr}\n\n${adapter}`, field: fieldDescription };
}
