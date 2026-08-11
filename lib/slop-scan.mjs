// SuperMD slop scanner — the deterministic anti-slop lexicon check, shared by
// the eval harness (eval/run-eval.mjs) and the CLI (`supermd check`). Zero
// dependencies; Node 18+. The lexicon and its calibration are documented in
// eval/lexicon.json and eval/README.md; RESEARCH.md carries the evidence base.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadLexicon(root = ROOT) {
  return JSON.parse(readFileSync(join(root, 'eval', 'lexicon.json'), 'utf8'));
}

// Scan `text` for slop patterns in the given language ('en' | 'id').
// Returns { hard: [{name, count, sample}], soft: [...] }.
export function scan(text, lang, lexicon = loadLexicon()) {
  const hits = { hard: [], soft: [] };

  // Mention-not-use: a banned phrase QUOTED on a prohibition line ("Do not use
  // 'I understand how you feel'") is the writer teaching avoidance, not slop.
  // Blank quoted spans on negation-cue lines before matching; unquoted slop,
  // even on a negation line, is still caught. Structural checks use raw text.
  const negCue = /\b(do not|don'?t|never|avoid|instead of|rather than|without|no|not|incorrect|wrong|bad example|counter-?example|jangan|tidak|hindari|tanpa|alih-alih|bukan|tak|salah|keliru|contoh buruk)\b/i;
  const scannable = text.split('\n').map(line =>
    negCue.test(line) ? line.replace(/["'“”‘’][^"'“”‘’\n]{0,90}["'“”‘’]/g, '""') : line
  ).join('\n');
  for (const p of lexicon.patterns) {
    if (p.langs && !p.langs.includes(lang)) continue;
    const matches = scannable.match(new RegExp(p.pattern, 'gimu'));
    if (matches) hits[p.severity].push({ name: p.name, count: matches.length, sample: matches[0] });
  }

  // Decorative bold-colon listicle: a SHORT, non-numeric fragment on the same
  // line ("**Scalability:** Important for growth."). An empty tail (a section
  // heading) or a tail with a digit (a concrete spec value) is legitimate.
  const decorative = [];
  for (const m of text.matchAll(/\*\*([^*\n]{1,60})[::]\*\*[ \t]*([^\n]*)/g)) {
    const tail = m[2];
    const tw = tail.split(/\s+/).filter(Boolean).length;
    if (tw >= 1 && tw < 8 && !/\d/.test(tail)) decorative.push(m[0]);
  }
  if (decorative.length >= lexicon.structural.boldColonThreshold) {
    hits.hard.push({ name: 'bold-colon-listicle', count: decorative.length, sample: decorative[0] });
  }

  const emoji = text.match(/\p{Extended_Pictographic}/gu) || [];
  if (emoji.length > 0) hits.hard.push({ name: 'emoji-decoration', count: emoji.length, sample: emoji[0] });

  // Em-dash density (soft, weak signal per RESEARCH.md): count PROSE em-dashes
  // only (list/quote lines excluded), flag above the per-word threshold.
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const proseLines = text.split('\n').filter(l => !/^\s*([-*>]|\d+[.)])\s/.test(l));
  const emDashes = (proseLines.join('\n').match(/—/g) || []).length;
  if (emDashes >= 3 && emDashes / words > lexicon.structural.emDashPerWordThreshold) {
    hits.soft.push({ name: 'em-dash-density', count: emDashes, sample: `${(emDashes / words * 1000).toFixed(1)} per 1000 prose words` });
  }

  return hits;
}

export const hardTotal = hits => hits.hard.reduce((n, h) => n + h.count, 0);
export const softTotal = hits => hits.soft.reduce((n, h) => n + h.count, 0);
