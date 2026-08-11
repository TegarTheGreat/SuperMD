<div align="center">

# SuperMD

**A universal anti-slop system prompt — composable for any profession.**

Pure Markdown. Copy, paste, done. Bilingual English / Bahasa Indonesia.

[![CI](https://github.com/TegarTheGreat/SuperMD/actions/workflows/ci.yml/badge.svg)](https://github.com/TegarTheGreat/SuperMD/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/tag/TegarTheGreat/SuperMD?sort=semver&label=release&color=1f6feb)](https://github.com/TegarTheGreat/SuperMD/releases)
[![License: CC BY 4.0](https://img.shields.io/badge/license-CC%20BY%204.0-lightgrey.svg)](LICENSE)
[![Domains](https://img.shields.io/badge/domains-16%20categories%20%C2%B7%2093%20fields-1f6feb)](en/docs/taxonomy.md)
![Languages](https://img.shields.io/badge/languages-EN%20%C2%B7%20ID-informational)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

> **What it is in one line:** a system prompt that names the patterns of AI "slop" and bans each one — with the concrete behavior that replaces it — so the model gives you the answer instead of a performance of one.

*English first; **Bahasa Indonesia** mengikuti di bagian bawah halaman ini.*

---

## English

### The problem

Ask a raw model to "write about teamwork" and you get this:

```text
In today's fast-paced world, teamwork is the cornerstone of success. It is important
to note that when diverse minds come together, they create a vibrant tapestry of
innovation that empowers organizations to unlock their full potential...
```

Four sentences, zero information. This is **slop**: text optimized to *look like* a good answer instead of *being* one. SuperMD targets its three forms:

| Failure class | What it looks like |
|---|---|
| **Language** | filler openers, inflated vocabulary, hedging stacks, em-dash tics — text that occupies space without transferring information |
| **Behavior** | invented citations, praise instead of review, agreeing with a false premise, confidence the model hasn't earned |
| **Format** | headers and bullets standing in for reasoning, ignored length/format contracts |

With SuperMD in the system prompt, the same request returns:

```text
Teamwork matters because it produces results individuals cannot. A team pools
complementary skills, catches each other's errors, and divides work to meet
deadlines that would otherwise slip. The cost is coordination time — meetings,
alignment, conflict resolution — which is real and must be justified by the gain.
Teams fail when they mistake consensus for correctness.
```

### Quick start

Paste [`en/SUPERMD.md`](en/SUPERMD.md) into your system prompt. That one file removes most slop on its own.

| Platform | Where to paste it |
|---|---|
| ChatGPT | Settings → Personalization → Custom Instructions, or a Project |
| Claude | Project instructions, or Profile preferences |
| API (any vendor) | the `system` parameter / first system message |
| Copilot-style IDE tools | the workspace instruction file (`.github/copilot-instructions.md`, `CLAUDE.md`) |
| Local models (Ollama, LM Studio) | the system-prompt field of the modelfile or chat UI |

### Command line — compose and lint from the terminal

The library also ships a zero-dependency CLI. No install needed:

```bash
npx supermd build nursing --style formal        # assemble a system prompt
npx supermd adapt "beekeeper"                    # cover any profession via the adapter
npx supermd list technology                      # browse the catalog
cat draft.md | npx supermd check                 # lint any text for slop (exits non-zero on hard slop)
```

`check` is a standalone **slop linter** — the same deterministic scan the eval harness uses — so you can gate a commit or CI on it. Both `compose` and `scan` are importable as a library (`supermd/compose`, `supermd/slop-scan`). Full reference: [`en/docs/cli.md`](en/docs/cli.md).

### How it works — composition

A SuperMD prompt is a stack of Markdown files. Add only the layers you need:

```text
  CORE               en/SUPERMD.md              always — the universal anti-slop rules
+ DOMAIN             en/domains/<field>.md      optional — your profession's norms & slop
+ STYLE              en/styles/<register>.md    optional — formal / conversational / technical
─────────────────
= your system prompt
```

- **CORE** is field-agnostic: language, behavior, and format rules with a `BAD → GOOD` example for each. Also split into `en/core/00`–`03` if you want to study or trim it.
- **DOMAIN** modules add only what the core cannot know: a field's audience, deliverables, quality bar, terminology, its own particular clichés, and the facts it must never guess. A sub-field states only its *deltas* from its category.
- **STYLE** pins the register when you need one.

**Example — a nurse writing formal discharge notes:**

```text
en/SUPERMD.md
+ en/domains/healthcare/_category.md
+ en/domains/healthcare/nursing.md
+ en/styles/formal.md
```

### Your field isn't listed? The universal adapter

No library can ship a module for every job. [`en/adapters/UNIVERSAL-ADAPTER.md`](en/adapters/UNIVERSAL-ADAPTER.md) turns the core into a field-specific module for **any** profession in one step — a beekeeper, a ferry captain, a tax auditor. Fill six slots (audience, deliverables, quality bar, terminology, field slop, hard limits) or let the model fill them for a field you name. That is how 16 shipped categories cover the long tail of tens of thousands of professions without a file for each.

### Domain catalog

Every module ships in both English and Bahasa Indonesia at mirrored paths (`en/…` ↔ `id/…`).

<details>
<summary><b>16 categories · 93 sub-fields</b> — click to expand</summary>

| Category | Sub-fields |
|---|---|
| **Technology** | Software Engineering · Frontend · Backend · Fullstack · Frontend / Product Design · Mobile · Desktop · Data Science · AI Engineering · AI-Native Engineering · Prompt Engineering · DevOps & SRE · Product Management · Cybersecurity · Social Engineering (authorized red-team) |
| **Healthcare** | Clinical Medicine · Nursing · Public Health · Pharmacy · Mental Health Counseling · Physical Therapy |
| **Business & Finance** | Accounting · Financial Analysis · Human Resources · Management Consulting · Operations Management · Taxation |
| **Legal** | Contract Drafting · Litigation · Compliance · Corporate Law · Intellectual Property · Immigration Law |
| **Education** | K-12 Teaching · Higher Education · Corporate Training · Special Education · Early Childhood · Instructional Design |
| **Creative & Media** | Journalism · Fiction Writing · Graphic Design · Copywriting · Film & Video Production · Photography |
| **Marketing & Sales** | Content Marketing · SEO · B2B Sales · Performance Advertising · Public Relations · Social Media Marketing |
| **Science & Research** | Academic Writing · Laboratory Research · Grant Writing · Clinical Research · Biostatistics · Environmental Science |
| **Engineering & Manufacturing** | Mechanical · Civil · Electrical · Industrial · Construction Management · Quality Assurance |
| **Public Service** | Policy Analysis · Social Work · Emergency Management · Urban Planning · Nonprofit Management · Law Enforcement |
| **Skilled Trades** | Electrician · Plumbing · HVAC · Automotive Repair |
| **Hospitality & Tourism** | Culinary Arts · Hotel Management · Event Planning · Food Service Management |
| **Agriculture & Environment** | Agronomy · Veterinary Practice · Forestry · Sustainable Farming |
| **Transportation & Logistics** | Supply Chain & Logistics · Aviation · Maritime Operations · Fleet Management |
| **Arts & Entertainment** | Game Design · Performing Arts · Animation & VFX · Music Performance |
| **Sports & Fitness** | Athletic Coaching · Personal Training · Sports Management · Sports Nutrition |

</details>

Full map with guidance on picking your field: [`en/docs/taxonomy.md`](en/docs/taxonomy.md).

### Tested, not asserted

A prompt library about quality that never measured itself would be its own counterexample. [`eval/`](eval/README.md) runs every scenario twice — with and without SuperMD — against the same model, then applies three independent checks: a deterministic banned-pattern scan, a blind pairwise LLM judge, and targeted honesty and format probes.

Latest run (`deepseek-chat` generation, `deepseek-reasoner` blind judge, 29 scenarios):

| Metric | Result |
|---|---|
| Hard slop patterns in SuperMD outputs | **0** across all scenarios (baseline: up to 26 per answer) |
| Blind pairwise preference | **25 / 26** for SuperMD |
| Citation-bait (does it invent studies?) | refuses to fabricate ✓ |
| Flawed-plan bait (does it push back?) | pushes back ✓ |
| Word-count contract | met ✓ |

Run it against your own model — any OpenAI-compatible API works: see [`eval/README.md`](eval/README.md).

### Grounded in research

The banned patterns are not a matter of taste. They are the measurable statistical signatures of machine text documented in published research — the excess-vocabulary study of ~14M PubMed abstracts (Kobak et al.), and reproducible pattern thresholds (em-dash density, sentence-length uniformity). Every rule is traceable to a named source in [`RESEARCH.md`](RESEARCH.md).

### Repository layout

```text
en/  id/                  two identical trees, one per language (CI enforces parity)
├── SUPERMD.md            the assembled core: one file, ready to paste
├── core/                 the same rules split by concern, with fuller examples
├── domains/<category>/   16 categories, 93 sub-field modules (_category.md + fields)
├── adapters/             the universal adapter for uncovered fields
├── styles/               optional register: formal / conversational / technical
└── docs/                 how-to-use · taxonomy · philosophy
eval/                     the anti-slop test harness (any OpenAI-compatible API)
RESEARCH.md               the cited evidence base for the rules
```

### Contributing

Modules for new fields are the most valuable contribution. Start from [`en/domains/_TEMPLATE.md`](en/domains/_TEMPLATE.md), write both language versions, and read [`CONTRIBUTING.md`](CONTRIBUTING.md). The module you submit is subject to the rules it teaches — CI checks Markdown, EN↔ID parity, and internal links on every PR.

Found slop that leaked past a module? That is a bug in the core — open a **Slop report** issue.

### Versioning & license

Released under [SemVer](https://semver.org); changes tracked in [`CHANGELOG.md`](CHANGELOG.md). Licensed [CC BY 4.0](LICENSE) — use it anywhere, including commercially, with attribution to this repository. To cite it, see [`CITATION.cff`](CITATION.cff).

---

## Bahasa Indonesia

### Masalahnya

Minta model mentah "menulis tentang kerja sama tim", dan Anda dapat ini:

```text
Di era yang serba cepat ini, kerja sama tim adalah fondasi kesuksesan. Perlu dicatat
bahwa ketika beragam pemikiran bersatu, mereka menciptakan permadani inovasi yang
dinamis, memberdayakan organisasi untuk membuka potensi penuh mereka...
```

Empat kalimat, nol informasi. Inilah **slop**: teks yang dioptimalkan agar *terlihat* seperti jawaban bagus, bukan *menjadi* jawaban bagus. SuperMD menyasar tiga bentuknya:

| Kelas kegagalan | Wujudnya |
|---|---|
| **Bahasa** | pembuka basa-basi, kosakata bombastis, tumpukan hedging, tic em-dash — teks yang memakan tempat tanpa memindahkan informasi |
| **Perilaku** | sitasi karangan, pujian alih-alih review, menyetujui premis yang salah, keyakinan yang belum dibuktikan |
| **Format** | judul dan bullet yang menggantikan penalaran, kontrak panjang/format yang dilanggar |

Dengan SuperMD di system prompt, permintaan yang sama menghasilkan jawaban yang padat, akurat, dan langsung ke inti — lihat contoh pada bagian English di atas.

### Mulai cepat

Tempel [`id/SUPERMD.md`](id/SUPERMD.md) ke system prompt Anda. Satu file itu sudah menghilangkan sebagian besar slop.

| Platform | Tempat menempelkannya |
|---|---|
| ChatGPT | Settings → Personalization → Custom Instructions, atau sebuah Project |
| Claude | Instruksi Project, atau preferensi Profil |
| API (vendor apa pun) | parameter `system` / pesan sistem pertama |
| Alat IDE ala Copilot | file instruksi workspace (`.github/copilot-instructions.md`, `CLAUDE.md`) |
| Model lokal (Ollama, LM Studio) | kolom system-prompt di modelfile atau UI chat |

### Baris perintah — rakit dan pindai dari terminal

Pustaka ini juga menyertakan CLI tanpa dependensi. Tanpa instalasi:

```bash
npx supermd build keperawatan --style formal --lang id   # rakit system prompt
npx supermd adapt "peternak lebah" --lang id             # cakup profesi apa pun via adapter
npx supermd list technology                              # jelajah katalog
cat draft.md | npx supermd check --lang id               # pindai teks apa pun untuk slop
```

`check` adalah **slop linter** berdiri sendiri — pemindaian deterministik yang sama dengan harness eval — jadi bisa jadi gerbang commit atau CI. Baik `compose` maupun `scan` bisa diimpor sebagai pustaka (`supermd/compose`, `supermd/slop-scan`). Referensi lengkap: [`id/docs/cli.md`](id/docs/cli.md).

### Cara kerjanya — komposisi

Prompt SuperMD adalah tumpukan file Markdown. Tambahkan hanya lapisan yang Anda butuhkan:

```text
  CORE               id/SUPERMD.md              selalu — aturan anti-slop universal
+ DOMAIN             id/domains/<bidang>.md     opsional — norma & slop profesi Anda
+ STYLE              id/styles/<register>.md    opsional — formal / percakapan / teknis
─────────────────
= system prompt Anda
```

- **CORE** bersifat lintas-bidang: aturan bahasa, perilaku, dan format, masing-masing dengan contoh `BURUK → BAIK`.
- **DOMAIN** hanya menambahkan yang tak mungkin diketahui core: audiens, deliverable, standar mutu, terminologi, klise khas bidang, dan fakta yang tak boleh ditebak. Sub-bidang hanya menyatakan *delta* dari kategorinya.
- **STYLE** mengunci register bila diperlukan.

**Contoh — perawat menulis catatan pemulangan yang formal:**

```text
id/SUPERMD.md
+ id/domains/healthcare/_category.md
+ id/domains/healthcare/nursing.md
+ id/styles/formal.md
```

### Bidang Anda belum ada? Adapter universal

Tak ada pustaka yang bisa menyediakan modul untuk setiap pekerjaan. [`id/adapters/UNIVERSAL-ADAPTER.md`](id/adapters/UNIVERSAL-ADAPTER.md) mengubah core menjadi modul spesifik-bidang untuk **profesi apa pun** dalam satu langkah — peternak lebah, nakhoda feri, auditor pajak. Isi enam slot (audiens, deliverable, standar mutu, terminologi, slop bidang, batas keras), atau biarkan model mengisinya untuk bidang yang Anda sebut. Itulah cara 16 kategori mencakup long tail puluhan ribu profesi tanpa satu file per profesi.

### Katalog domain

Setiap modul tersedia dalam Bahasa Inggris dan Indonesia di path yang identik (`en/…` ↔ `id/…`). Daftar lengkap 16 kategori dan 93 sub-bidang ada pada bagian English di atas (klik "16 categories · 93 sub-fields"), dan peta lengkapnya di [`id/docs/taxonomy.md`](id/docs/taxonomy.md).

### Diuji, bukan sekadar diklaim

Pustaka soal kualitas yang tak pernah mengukur dirinya sendiri akan jadi contoh tandingannya sendiri. [`eval/`](eval/README.md) menjalankan tiap skenario dua kali — dengan dan tanpa SuperMD — lalu menerapkan tiga pemeriksaan bebas: pemindaian pola terlarang deterministik, LLM juri berpasangan secara buta, serta probe kejujuran dan format.

Hasil terbaru (29 skenario): **0** pola slop keras di semua output SuperMD, **25/26** preferensi juri buta, umpan sitasi dan rencana-cacat lolos. Detail di [`eval/README.md`](eval/README.md).

### Ter-ground pada riset

Pola yang dilarang bukan soal selera — itu tanda statistik terukur dari teks mesin dalam riset terpublikasi (studi kosakata berlebih ~14 juta abstrak PubMed oleh Kobak dkk.; ambang pola em-dash dan keseragaman panjang kalimat). Setiap aturan bisa ditelusuri ke sumber bernama di [`RESEARCH.md`](RESEARCH.md).

### Kontribusi

Modul untuk bidang baru adalah kontribusi paling berharga. Mulai dari [`id/domains/_TEMPLATE.md`](id/domains/_TEMPLATE.md), tulis kedua versi bahasa, dan baca [`CONTRIBUTING.md`](CONTRIBUTING.md). Modul yang Anda kirim tunduk pada aturan yang diajarkannya sendiri — CI memeriksa Markdown, paritas EN↔ID, dan tautan internal di setiap PR.

### Versi & lisensi

Dirilis dengan [SemVer](https://semver.org); perubahan dicatat di [`CHANGELOG.md`](CHANGELOG.md). Berlisensi [CC BY 4.0](LICENSE) — bebas dipakai di mana pun, termasuk komersial, dengan atribusi ke repo ini. Untuk menyitasi, lihat [`CITATION.cff`](CITATION.cff).
