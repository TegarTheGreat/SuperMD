#!/usr/bin/env node
// Unit tests for lib/slop-scan.mjs — the mention-vs-use exclusion in
// particular. Zero dependencies; exit 1 on any failure.
//
// Mention-not-use contract: a banned phrase QUOTED or ITALICIZED on a
// prohibition line (negation cue, or the tree's own BAD:/BURUK: example
// convention) is the writer teaching avoidance, not slop. Unquoted slop on a
// negation line, and quoted slop on a non-negation line, are still slop.

import { strict as assert } from 'node:assert';
import { scan, hardTotal, detectLang } from '../lib/slop-scan.mjs';

let failures = 0;
function t(name, fn) {
  try { fn(); console.log(`  ok  ${name}`); }
  catch (e) { failures++; console.error(`FAIL  ${name}\n      ${e.message}`); }
}

// --- mentions that must NOT be flagged ---

t('BAD: line with quoted slop is a mention', () => {
  const hits = scan('- BAD: "unlock your potential" → GOOD: the concrete outcome and its number.', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('italicized banned-word list on a "Banned unless quoting" line is a mention', () => {
  const hits = scan('Banned unless quoting: *delve, tapestry, game-changer, fast-paced world*.', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('quoted phrase containing an apostrophe does not desync the blanking', () => {
  const hits = scan('No "Certainly!", "You\'re absolutely right!", no praise — and none of "I hear you".', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('single-quoted mention nested in a double-quoted span is blanked whole', () => {
  const hits = scan('A banned phrase quoted on a prohibition line ("Do not use \'I hope this helps\'") is teaching avoidance.', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('long quoted example on a BAD: line (over 90 chars) is still blanked', () => {
  const hits = scan('- BAD: "the software was thoroughly tested and this game-changer will revolutionize everything about how the whole industry operates at scale" → GOOD: name the coverage.', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('BURUK: line with quoted Indonesian slop is a mention', () => {
  const hits = scan('- BURUK: "Penting untuk dicatat bahwa password harus di-hash."', 'id');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('italicized Indonesian banned list on a "Terlarang:" line is a mention', () => {
  const hits = scan('3. **Penekanan kosong.** Terlarang: *penting untuk dicatat, dunia yang serba cepat, wawasan kuncinya*.', 'id');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

// --- lexicon calibration: id-conclusion is the clause-opening discourse
// marker ("Sebagai penutup, ..."), not the noun phrase mid-sentence ---

t('descriptive "… sebagai penutup." mid-sentence is not flagged', () => {
  const hits = scan('- BAD: "Observasi dilanjutkan" sebagai penutup catatan. → GOOD: instruksi konkretnya.', 'id');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('descriptive use outside any negation line is not flagged', () => {
  const hits = scan('Kalimat itu lazim dipakai sebagai penutup surat resmi.', 'id');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('opener "Sebagai penutup, …" at line start is flagged', () => {
  const hits = scan('Sebagai penutup, jaga selalu kesehatan Anda.', 'id');
  assert.ok(hardTotal(hits) >= 1, JSON.stringify(hits.hard));
});

t('opener "Sebagai kesimpulan, …" after a sentence break is flagged', () => {
  const hits = scan('Datanya sudah lengkap. Sebagai kesimpulan, sistem berjalan baik.', 'id');
  assert.ok(hardTotal(hits) >= 1, JSON.stringify(hits.hard));
});

// --- real slop that must STILL be flagged ---

t('plain slop in prose is caught', () => {
  const hits = scan("Let's dive in and delve into this game-changer.", 'en');
  assert.ok(hardTotal(hits) >= 3, JSON.stringify(hits.hard));
});

t('unquoted, unitalicized slop on a negation line is still caught', () => {
  const hits = scan('Do not worry: we will delve into the details.', 'en');
  assert.ok(hardTotal(hits) >= 1, JSON.stringify(hits.hard));
});

t('quoted slop on a line with no negation cue is still caught', () => {
  const hits = scan('He said "this is a game-changer" and meant it.', 'en');
  assert.ok(hardTotal(hits) >= 1, JSON.stringify(hits.hard));
});

t('Indonesian slop in prose is caught', () => {
  const hits = scan('Penting untuk dicatat bahwa sistem ini aman di dunia yang serba cepat.', 'id');
  assert.ok(hardTotal(hits) >= 2, JSON.stringify(hits.hard));
});

// --- fenced code blocks are verbatim quotation: excluded from the lexicon
// scan (a README demo of what slop looks like is a mention, not slop) ---

t('slop inside a fenced code block is a mention', () => {
  const hits = scan('Ask a raw model and you get this:\n\n```text\nIn today\'s fast-paced world, teamwork is a vibrant tapestry that empowers you.\n```\n\nThat is slop.', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('an identifier in an inline code span is a mention', () => {
  const hits = scan('The `unlock-unleash` detector was calibrated in this release.', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('slop in prose outside the fence is still caught', () => {
  const hits = scan('```text\nclean code here\n```\n\nThis game-changer will revolutionize everything.', 'en');
  assert.ok(hardTotal(hits) >= 1, JSON.stringify(hits.hard));
});

// --- typographic arrows are not emoji decoration ---

t('arrows in technical text are not emoji-decoration', () => {
  const hits = scan('Two identical trees (`en/…` ↔ `id/…`); undo maps ↩ back to the source.', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('real emoji decoration is still caught', () => {
  const hits = scan('Great work team! 🚀 Ship it! ✅', 'en');
  assert.ok(hits.hard.some(h => h.name === 'emoji-decoration'), JSON.stringify(hits.hard));
});

// --- "ban"/"bans" as negation cues ---

t('quoted phrases on a "now bans" line are mentions', () => {
  const hits = scan('The core rule now bans the quieter validation phrases ("your perspective is valid", "I hear you").', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

// --- lexicon calibration: unlock-unleash is the metaphorical form
// ("unlock your potential"), not literal unlocking (a level, a door, a phone) ---

t('literal game-mechanic unlocking is not flagged', () => {
  const hits = scan('Filling the bar completes the level and unlocks the next. Players unlock the next mechanic after three stars.', 'en');
  assert.equal(hardTotal(hits), 0, JSON.stringify(hits.hard));
});

t('metaphorical "unlock your full potential" is still flagged', () => {
  const hits = scan('This program will unlock your full potential and unleash your inner athlete.', 'en');
  assert.ok(hits.hard.some(h => h.name === 'unlock-unleash'), JSON.stringify(hits.hard));
});

// --- language auto-detection (used by `supermd check` when --lang is absent) ---

t('detectLang: Indonesian prose detects as id', () => {
  assert.equal(detectLang('Tuliskan deskripsi menu untuk hidangan salmon panggang dengan saus lemon dan sayuran, karena ini akan dipakai pada menu utama.'), 'id');
});

t('detectLang: English prose detects as en', () => {
  assert.equal(detectLang('Write the description for the grilled salmon dish with lemon butter sauce, because it is going in the main menu.'), 'en');
});

t('detectLang: Indonesian file quoting English banned words still detects as id', () => {
  assert.equal(detectLang('Kosakata bombastis dilarang karena ini bukan gaya yang lugas: *delve, tapestry, game-changer, seamless, robust*. Gunakan kata yang sederhana dan jelas untuk pembaca.'), 'id');
});

if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log('\nall tests pass');
