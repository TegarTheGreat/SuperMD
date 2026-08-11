# SuperMD — Spesifikasi Arsitektur & Tech Stack

**Tanggal:** 2026-08-11
**Status:** Disetujui (brainstorming selesai)
**Repo:** github.com/TegarTheGreat/SuperMD

## Ringkasan

SuperMD adalah library open-source berisi system prompt universal "anti-slop" untuk AI, berbentuk murni Markdown (tanpa kode produk), yang dapat dipakai di puluhan ribu bidang pekerjaan melalui **komposisi berlapis** — bukan satu file per bidang.

## Keputusan desain

Empat keputusan kunci, semuanya sudah dikonfirmasi pemilik proyek:

1. **Bentuk produk:** library prompt murni Markdown. Pengguna menyalin/mengimpor file; tidak ada CLI atau aplikasi.
2. **Strategi skala:** komposisi berlapis — `CORE` universal + modul `DOMAIN` per kategori + `UNIVERSAL-ADAPTER` untuk bidang yang belum punya modul.
3. **Scope anti-slop:** lengkap — bahasa (frasa generik, klise AI, kalimat kosong), perilaku (anti-halusinasi, anti-sycophancy, kalibrasi kejujuran), dan format (disiplin struktur & panjang output).
4. **Bahasa konten:** bilingual penuh EN + ID sejak awal, struktur **language-first** (`en/` dan `id/` di root, mirror path 1:1).

## Model komposisi

Pengguna merakit system prompt dari lapisan:

```text
SYSTEM PROMPT = CORE (wajib) + DOMAIN (pilih satu/lebih) + STYLE (opsional)
```

- **CORE** — aturan anti-slop universal, berlaku untuk semua bidang. Juga tersedia sebagai satu file rakitan siap copy-paste (`SUPERMD.md`).
- **DOMAIN** — modul per kategori industri (`_category.md`) dan per sub-bidang (mis. `technology/software-engineering.md`). Sub-bidang mewarisi konteks kategorinya.
- **STYLE** — modul nada opsional (formal, conversational, technical).
- **UNIVERSAL-ADAPTER** — template berisi slot terstruktur (nama bidang, audiens, terminologi, standar kualitas bidang) yang menginstansiasi CORE ke bidang apa pun yang belum punya modul. Inilah yang membuat cakupan "puluhan ribu bidang" jujur secara teknis.

## Struktur repo

```text
SuperMD/
├── README.md                      ← bilingual (EN di atas, ID di bawah)
├── LICENSE                        ← CC BY 4.0
├── CHANGELOG.md                   ← SemVer untuk rilis kumpulan prompt
├── CONTRIBUTING.md                ← bilingual, termasuk aturan paritas EN↔ID
├── CODE_OF_CONDUCT.md
├── .gitignore                     ← .env (secret) tidak pernah masuk repo
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── new-domain.yml         ← request bidang baru
│   │   ├── slop-report.yml        ← lapor pola slop baru
│   │   └── translation-fix.yml
│   ├── PULL_REQUEST_TEMPLATE.md   ← checklist paritas EN↔ID
│   └── workflows/
│       └── ci.yml                 ← markdownlint + lychee + check-parity
├── scripts/
│   └── check-parity.sh            ← infra repo: en/ dan id/ harus mirror 1:1
├── en/
│   ├── SUPERMD.md                 ← CORE rakitan penuh, satu file siap pakai
│   ├── core/
│   │   ├── 00-foundation.md       ← identitas & prinsip dasar
│   │   ├── 01-language.md         ← anti-slop bahasa
│   │   ├── 02-behavior.md         ← anti-halusinasi, anti-sycophancy, kejujuran
│   │   └── 03-format.md           ← disiplin format & panjang output
│   ├── domains/
│   │   ├── _TEMPLATE.md           ← cetakan modul domain untuk kontributor
│   │   ├── technology/
│   │   ├── healthcare/
│   │   ├── business-finance/
│   │   ├── legal/
│   │   ├── education/
│   │   ├── creative-media/
│   │   ├── marketing-sales/
│   │   ├── science-research/
│   │   ├── engineering-manufacturing/
│   │   └── public-service/
│   │       (tiap kategori: _category.md + <sub-bidang>.md)
│   ├── adapters/
│   │   └── UNIVERSAL-ADAPTER.md
│   ├── styles/
│   │   ├── formal.md
│   │   ├── conversational.md
│   │   └── technical.md
│   └── docs/
│       ├── how-to-use.md          ← cara merakit CORE + DOMAIN (+ STYLE)
│       ├── taxonomy.md            ← peta kategori & sub-bidang
│       └── philosophy.md          ← definisi slop & prinsip desain
└── id/                            ← mirror path-for-path dari en/
```

## Format file konten

Markdown murni (CommonMark) berisi konten prompt, diawali YAML front-matter ringkas:

```yaml
---
name: Software Engineering
category: technology
version: 1.0.0
summary: Modul anti-slop untuk rekayasa perangkat lunak.
---
```

Front-matter dipilih karena standar, siap dipakai tooling/situs docs di masa depan, dan tidak mengganggu jika ikut ter-copy ke system prompt.

## Tech stack

| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| Konten | Markdown + YAML front-matter | Universal, zero-build, ramah kontributor |
| Lint | `markdownlint-cli2` di GitHub Actions | Konsistensi format tanpa setup lokal |
| Cek link | `lychee` di GitHub Actions | Cegah link mati di docs |
| Paritas i18n | `scripts/check-parity.sh` (bash) di CI | Path `en/**` dan `id/**` harus identik; gagal = drift terjemahan |
| Versioning | SemVer + CHANGELOG + GitHub Releases | Rilis kumpulan prompt bisa di-pin pengguna |
| Lisensi | CC BY 4.0 | Konten teks (bukan software); atribusi melekat |

`scripts/` dan `.github/` adalah infrastruktur repo, bukan produk — keputusan "Markdown murni" tetap berlaku.

## Di luar scope (sengaja, YAGNI)

- CLI composer / generator prompt
- Situs dokumentasi (Astro/Docusaurus)
- Eval harness anti-slop ber-API LLM (di sinilah `DEEPPSEEK_API_KEY` di `.env` kelak relevan)

Arsitektur ini tidak menghalangi ketiganya ditambahkan belakangan.

## Seed konten awal

10 kategori domain di atas, masing-masing `_category.md` + 2–3 sub-bidang contoh, dalam dua bahasa — cukup untuk menunjukkan pola komposisi dan mengundang kontribusi komunitas.

## Kriteria sukses

1. Pengguna baru bisa merakit system prompt anti-slop untuk bidangnya dalam < 5 menit hanya dengan membaca README.
2. Bidang tanpa modul tetap tercakup lewat `UNIVERSAL-ADAPTER`.
3. CI menolak PR yang merusak paritas EN↔ID.
4. Kontributor bisa menambah domain baru hanya dengan menyalin `_TEMPLATE.md` dan mengikuti CONTRIBUTING.

## Penanganan error / kualitas

- Drift terjemahan → ditangkap `check-parity.sh` di CI.
- Slop baru yang belum tercakup → issue template `slop-report.yml` menjadi jalur masuk perbaikan CORE.
- Modul domain berkualitas rendah → checklist PR + review maintainer.
