#!/usr/bin/env node
// Unit tests for lib/slop-scan.mjs — the mention-vs-use exclusion in
// particular. Zero dependencies; exit 1 on any failure.
//
// Mention-not-use contract: a banned phrase QUOTED or ITALICIZED on a
// prohibition line (negation cue, or the tree's own BAD:/BURUK: example
// convention) is the writer teaching avoidance, not slop. Unquoted slop on a
// negation line, and quoted slop on a non-negation line, are still slop.

import { strict as assert } from 'node:assert';
import { scan, hardTotal } from '../lib/slop-scan.mjs';

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

if (failures) { console.error(`\n${failures} failing`); process.exit(1); }
console.log('\nall tests pass');
