# SuperMD

[![CI](https://github.com/TegarTheGreat/SuperMD/actions/workflows/ci.yml/badge.svg)](https://github.com/TegarTheGreat/SuperMD/actions/workflows/ci.yml)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC_BY_4.0-lightgrey.svg)](LICENSE)

**A universal anti-slop system prompt, composable for any profession.** Pure Markdown — copy, paste, done. Bilingual English / Bahasa Indonesia. *(Versi Bahasa Indonesia di bawah.)*

---

## English

### What it does

AI output defaults to slop: filler openers, inflated vocabulary, invented citations, praise instead of review, bullet scaffolding instead of reasoning. SuperMD is a system prompt that names those patterns and bans them — with the replacement behavior each ban requires. It targets three failure classes:

- **Language** — text that occupies space without transferring information
- **Behavior** — confident claims that cannot be trusted (fabrication, sycophancy, false certainty)
- **Format** — structure standing in for substance, ignored format contracts

The claims are tested, not asserted: `eval/` contains the harness (banned-pattern scans plus blind pairwise LLM judging on slop-bait tasks) that every release must pass. The patterns it bans are grounded in published research on the statistical signatures of machine text — see [`RESEARCH.md`](RESEARCH.md).

### Quick start

Paste [`en/SUPERMD.md`](en/SUPERMD.md) into your system prompt — ChatGPT custom instructions, a Claude Project, the API `system` parameter, or your IDE's instruction file. That alone removes most slop.

For field-specific behavior, append a domain module:

```text
en/SUPERMD.md                                ← always (the core)
+ en/domains/healthcare/_category.md         ← your industry
+ en/domains/healthcare/nursing.md           ← your sub-field, if shipped
+ en/styles/formal.md                        ← optional register
```

Your profession isn't shipped? [`en/adapters/UNIVERSAL-ADAPTER.md`](en/adapters/UNIVERSAL-ADAPTER.md) instantiates the core for **any** field in one step — a beekeeper, a ferry captain, a tax auditor. That composition model, 16 categories plus a universal adapter, is how a small repo covers tens of thousands of professions without a file for each. Details: [`en/docs/taxonomy.md`](en/docs/taxonomy.md).

### Repository layout

```text
en/  id/                  ← identical trees, one per language (CI enforces parity)
├── SUPERMD.md            ← the assembled core: one file, ready to paste
├── core/                 ← the same rules split by concern, with fuller examples
├── domains/<category>/   ← 16 industry categories, 90+ sub-field modules
├── adapters/             ← the universal adapter for uncovered fields
├── styles/               ← optional register: formal / conversational / technical
└── docs/                 ← how-to-use, taxonomy, philosophy
eval/                     ← the anti-slop test harness (DeepSeek-based)
```

### Testing

`eval/` runs the same prompts with and without SuperMD, scans outputs against the banned-pattern lexicon, and has a blind LLM judge score each pair — including honesty probes (citation bait) and disagreement probes (flawed-plan bait). See [`eval/README.md`](eval/README.md) to run it against your own model.

### Contributing

Domain modules for new fields are the most valuable contribution. Start from [`en/domains/_TEMPLATE.md`](en/domains/_TEMPLATE.md), write both language versions, and read [`CONTRIBUTING.md`](CONTRIBUTING.md) — the module you submit is subject to the rules it teaches.

### License

[CC BY 4.0](LICENSE) — use it anywhere, including commercially, with attribution to this repository.

---

## Bahasa Indonesia

### Apa fungsinya

Output AI secara bawaan cenderung *slop*: kalimat pembuka kosong, kosakata bombastis, sitasi karangan, pujian alih-alih review, tumpukan bullet alih-alih penalaran. SuperMD adalah system prompt yang menamai pola-pola itu dan melarangnya — lengkap dengan perilaku pengganti untuk setiap larangan. Tiga kelas kegagalan yang disasar:

- **Bahasa** — teks yang memakan tempat tanpa memindahkan informasi
- **Perilaku** — klaim percaya diri yang tidak bisa dipercaya (fabrikasi, menjilat, keyakinan palsu)
- **Format** — struktur yang menggantikan substansi, kontrak format yang dilanggar

Klaimnya diuji, bukan sekadar ditulis: folder `eval/` berisi harness pengujian (pemindaian pola terlarang plus penilaian berpasangan oleh LLM juri secara buta) yang wajib lolos di setiap rilis. Pola yang dilarang ter-ground pada riset terpublikasi tentang tanda-tanda statistik teks mesin — lihat [`RESEARCH.md`](RESEARCH.md).

### Mulai cepat

Tempel [`id/SUPERMD.md`](id/SUPERMD.md) ke system prompt Anda — custom instructions ChatGPT, Claude Project, parameter `system` di API, atau file instruksi IDE Anda. Itu saja sudah menghilangkan sebagian besar slop.

Untuk perilaku spesifik bidang, tambahkan modul domain:

```text
id/SUPERMD.md                                ← selalu (inti)
+ id/domains/healthcare/_category.md         ← industri Anda
+ id/domains/healthcare/nursing.md           ← sub-bidang Anda, jika tersedia
+ id/styles/formal.md                        ← register opsional
```

Profesi Anda belum tersedia? [`id/adapters/UNIVERSAL-ADAPTER.md`](id/adapters/UNIVERSAL-ADAPTER.md) menginstansiasi inti untuk bidang **apa pun** dalam satu langkah — peternak lebah, nakhoda feri, auditor pajak. Model komposisi itulah — 16 kategori plus satu adapter universal — yang membuat repo kecil ini mencakup puluhan ribu profesi tanpa satu file per profesi. Detail: [`id/docs/taxonomy.md`](id/docs/taxonomy.md).

### Struktur repo

```text
en/  id/                  ← dua pohon identik, satu per bahasa (paritas dijaga CI)
├── SUPERMD.md            ← inti rakitan: satu file, siap tempel
├── core/                 ← aturan yang sama dipecah per aspek, dengan contoh lebih lengkap
├── domains/<kategori>/   ← 16 kategori industri, 90+ modul sub-bidang
├── adapters/             ← adapter universal untuk bidang yang belum tercakup
├── styles/               ← register opsional: formal / conversational / technical
└── docs/                 ← cara pakai, taksonomi, filosofi
eval/                     ← harness uji anti-slop (berbasis DeepSeek)
```

### Pengujian

`eval/` menjalankan prompt yang sama dengan dan tanpa SuperMD, memindai output terhadap leksikon pola terlarang, lalu LLM juri menilai tiap pasangan secara buta — termasuk probe kejujuran (umpan sitasi) dan probe keberanian berbeda pendapat (umpan rencana cacat). Lihat [`eval/README.md`](eval/README.md) untuk mengujinya terhadap model Anda sendiri.

### Kontribusi

Modul domain untuk bidang baru adalah kontribusi paling berharga. Mulai dari [`id/domains/_TEMPLATE.md`](id/domains/_TEMPLATE.md), tulis kedua versi bahasa, dan baca [`CONTRIBUTING.md`](CONTRIBUTING.md) — modul yang Anda kirim tunduk pada aturan yang diajarkannya sendiri.

### Lisensi

[CC BY 4.0](LICENSE) — bebas dipakai di mana pun, termasuk komersial, dengan atribusi ke repo ini.
