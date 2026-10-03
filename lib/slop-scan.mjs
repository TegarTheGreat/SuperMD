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

  // Mention-not-use: a banned phrase QUOTED or ITALICIZED on a prohibition
  // line ("Do not use 'I hope this helps'", a BAD:/BURUK: example, an
  // italicized banned-word list) is the writer teaching avoidance, not slop.
  // Blank those spans on negation-cue lines before matching; unquoted slop,
  // even on a negation line, is still caught. Quote pairs are matched per
  // style so an apostrophe inside a quoted span cannot desync the pairing.
  // Structural checks use raw text.
  const negCue = /\b(do not|don'?t|never|avoid|instead of|rather than|without|no|not|incorrect|wrong|bad|ban(?:s|ned|ning)?|forbidden|counter-?example|jangan|tidak|hindari|tanpa|alih-alih|bukan|tak|salah|keliru|buruk|terlarang|dilarang)\b/i;
  // Spans are DELETED, not replaced with quote marks — an injected delimiter
  // would desync the pairing of the passes that follow it.
  const blankMentions = line => line
    .replace(/\*\*/g, '')                                  // unwrap bold so italic pairs align; bold text stays scannable
    .replace(/\*[^*\n]+\*/g, '')                           // italics — the banned-word lists
    .replace(/"[^"\n]+"/g, '')
    .replace(/“[^”\n]+”/g, '')
    .replace(/‘[^’\n]+’/g, '')
    .replace(/(^|[\s(:])'[^'\n]+'(?=$|[\s.,;:!?)])/g, '$1'); // straight singles only at word boundaries (apostrophes survive)
  // Fenced code blocks and inline code spans are verbatim quotation (a demo of
  // slop, sample output, actual code, an identifier) — excluded from the
  // lexicon scan; structural checks below still see the raw text.
  const noFences = text
    .replace(/```[^\n]*\n[\s\S]*?\n[ \t]*```/g, '```')
    .replace(/`[^`\n]+`/g, '');
  const scannable = noFences.split('\n').map(line => (negCue.test(line) ? blankMentions(line) : line)).join('\n');
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

  // Typographic arrows (U+2190–U+21FF: ↔ → ↩ …) and the legal marks © ® ™ are
  // punctuation in technical prose and UI footers, not emoji decoration, even
  // though Unicode classes them as Extended_Pictographic.
  const LEGAL_MARKS = new Set([0xA9, 0xAE, 0x2122]);
  const emoji = (text.match(/\p{Extended_Pictographic}/gu) || [])
    .filter(ch => { const c = ch.codePointAt(0); return !(c >= 0x2190 && c <= 0x21FF) && !LEGAL_MARKS.has(c); });
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

// Language auto-detection for `supermd check` when --lang is not given:
// count high-frequency function words of each language and take the majority.
// Ties fall back to 'en'. Deterministic; quoted English examples inside an
// Indonesian document do not outweigh its own function words.
export function detectLang(text) {
  const id = (text.match(/\b(yang|dan|untuk|dengan|tidak|dari|ini|itu|adalah|pada|atau|akan|karena|sebagai|jangan|bukan|saat|bisa|harus|sudah)\b/gi) || []).length;
  const en = (text.match(/\b(the|and|of|to|is|that|for|with|in|are|not|as|this|it|be|when|use|should|has|was)\b/gi) || []).length;
  return id > en ? 'id' : 'en';
}
