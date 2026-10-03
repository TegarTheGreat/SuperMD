<div align="center">

# SuperMD

**Aturan anti-slop untuk agen AI. Satu perintah memasangnya ke Claude Code, Codex, Cursor, dan 15 harness lain.**

System prompt universal yang menamai pola "slop" AI dan melarang tiap polanya, lengkap dengan perilaku konkret penggantinya. Bisa dikomposisi untuk profesi apa pun. Markdown murni, tanpa dependensi, dwibahasa (Inggris dan Bahasa Indonesia).

[![CI](https://github.com/TegarTheGreat/SuperMD/actions/workflows/ci.yml/badge.svg)](https://github.com/TegarTheGreat/SuperMD/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/tag/TegarTheGreat/SuperMD?sort=semver&label=release&color=1f6feb)](https://github.com/TegarTheGreat/SuperMD/releases)
[![npm](https://img.shields.io/npm/v/supermd?color=cb3837&logo=npm)](https://www.npmjs.com/package/supermd)
[![License: CC BY 4.0](https://img.shields.io/badge/license-CC%20BY%204.0-lightgrey.svg)](LICENSE)
[![Harness](https://img.shields.io/badge/harness-18-8957e5)](id/docs/integrations.md)
[![Domain](https://img.shields.io/badge/domain-16%20kategori%20%C2%B7%20103%20bidang-1f6feb)](id/docs/taxonomy.md)
[![Tanpa dependensi](https://img.shields.io/badge/dependensi-0-brightgreen)](package.json)
[![PR dipersilakan](https://img.shields.io/badge/PR-dipersilakan-brightgreen.svg)](CONTRIBUTING.md)

[Pasang](#pasang-ke-agen-anda) · [Lihat hasilnya](#lihat-hasilnya) · [Bukti](#bukti) · [CLI](#baris-perintah) · [Katalog](#katalog-domain) · [Riset](#riset) · [English](README.md) · **Bahasa Indonesia**

<img src="docs/assets/hero.png" alt="supermd check pada dua jawaban model asli untuk prompt yang sama: jawaban tanpa SuperMD punya satu hit keras dan enam hit lunak, jawaban dengan SuperMD lolos" width="860">

</div>

> Dokumen ini mengikuti [README berbahasa Inggris](README.md) dengan kedalaman yang sama. Tangkapan layar sama persis: keluaran dan teks di dalamnya berbahasa Inggris karena memang itulah keluaran asli perintah dan model yang direkam.

## Masalahnya

Minta model mentah "menulis tentang kerja sama tim", dan Anda mendapat sesuatu seperti ini (ilustrasi; keluaran asli yang direkam ada di [Lihat hasilnya](#lihat-hasilnya)):

```text
Di era yang serba cepat ini, kerja sama tim adalah fondasi kesuksesan. Perlu dicatat
bahwa ketika beragam pemikiran bersatu, mereka menciptakan permadani inovasi yang
dinamis, memberdayakan organisasi untuk membuka potensi penuh mereka...
```

Empat kalimat, nol informasi. Inilah **slop**: teks yang dioptimalkan agar *terlihat* seperti jawaban bagus, bukan *menjadi* jawaban bagus. SuperMD menyasar tiga bentuknya:

| Kelas kegagalan | Wujudnya |
|---|---|
| **Bahasa** | pembuka basa-basi, kosakata bombastis, tumpukan hedging, tic em-dash: teks yang memakan tempat tanpa memindahkan informasi |
| **Perilaku** | sitasi karangan, pujian alih-alih review, menyetujui premis yang salah, keyakinan yang belum dibuktikan |
| **Format** | judul dan bullet yang menggantikan penalaran, kontrak panjang dan format yang dilanggar |

Dengan SuperMD di system prompt, permintaan yang sama terbaca seperti ini:

```text
Kerja sama tim penting karena menghasilkan sesuatu yang tak bisa dicapai individu.
Tim menggabungkan keahlian yang saling melengkapi, menangkap kesalahan satu sama
lain, dan membagi pekerjaan agar tenggat yang mustahil bagi satu orang tetap tercapai.
Biayanya adalah waktu koordinasi, yang nyata dan harus dibenarkan oleh hasilnya.
Tim gagal ketika menyamakan konsensus dengan kebenaran.
```

## Kenapa SuperMD

- **Terpasang di tempat agen benar-benar membacanya.** `supermd install` menulis aturan ke file yang dimuat tiap harness, dalam bentuk yang diharapkannya, dan tak pernah menimpa isi Anda. Batalkan dengan `supermd uninstall`.
- **Terkomposisi per profesi.** Core universal plus 103 modul bidang dalam 16 kategori. Tumpuk hanya lapisan yang Anda perlukan, atau buat modul untuk profesi lain lewat adapter universal.
- **Terukur, bukan sekadar klaim.** Harness eval dengan juri buta, linter deterministik, dan rekaman sesi Claude Code langsung mendukung setiap klaim di sini, termasuk eval yang gagal ([Bukti](#bukti)).
- **Dwibahasa sejak desain.** Setiap file ada dalam bahasa Inggris dan Indonesia di path yang tercermin, ditegakkan CI.
- **Tanpa dependensi.** Markdown biasa dan Node 18+. Repositori ini tunduk pada aturan yang diajarkannya: kedua pohon bahasa lolos linter-nya sendiri di CI.

## Pasang ke agen Anda

```bash
npx supermd install claude-code codex --lang id    # aturan selalu aktif untuk proyek ini
npx supermd install claude-code --field keperawatan --lang id
npx supermd install all --dry-run                  # pratinjau semua harness; tidak menulis apa pun
```

<div align="center">
<img src="docs/assets/install.png" alt="supermd install menulis CLAUDE.md, AGENTS.md, aturan Cursor, instruksi Copilot, GEMINI.md, dan dua file aturan Windsurf, lalu supermd status mengonfirmasi tiap file sudah terbaru" width="760">
</div>

Delapan belas target pemasangan, dengan setiap path, kunci front matter, dan batas ukuran diambil dari dokumentasi resmi vendor:

| Harness | Perintah | Menulis (scope proyek) |
|---|---|---|
| **Claude Code** | `npx supermd install claude-code` | `CLAUDE.md` (atau `~/.claude/CLAUDE.md` dengan `--scope user`) |
| **Codex** | `npx supermd install codex` | `AGENTS.md` (atau `~/.codex/AGENTS.md`) |
| **Cursor** | `npx supermd install cursor` | `.cursor/rules/supermd.mdc`, `alwaysApply: true` |
| **Windsurf** | `npx supermd install windsurf` | `.windsurf/rules/supermd.md`, dipecah di bawah batas 12.000 karakter |
| **GitHub Copilot** | `npx supermd install copilot` | `.github/copilot-instructions.md` |
| **Gemini CLI / Antigravity** | `npx supermd install gemini-cli` | `GEMINI.md` |
| **Aider** | `npx supermd install aider` | `CONVENTIONS.md` (muat dengan `--read`) |
| **Cline · Roo Code · Continue** | `npx supermd install cline roo continue` | `.clinerules/`, `.roo/rules/`, `.continue/rules/` |
| **Zed · Junie · Kiro · Augment** | `npx supermd install zed junie kiro augment` | `.rules`, `.junie/AGENTS.md`, `.kiro/steering/`, `.augment/rules/` |
| **opencode · Amp · Goose** | `npx supermd install opencode amp goose` | `AGENTS.md`, `AGENTS.md`, `.goosehints` |
| **Apa pun yang membaca AGENTS.md** | `npx supermd install agents-md` | `AGENTS.md` |

Aman sejak rancangan: file bersama mendapat wilayah bertanda (`<!-- supermd:begin -->`), file khusus membawa penanda terkelola, pemasangan ulang hanya mengganti teks milik SuperMD, `--dry-run` memberi pratinjau, dan `uninstall` menghapus persis yang tadi ditulis. Claude Code membaca `AGENTS.md` hanya bila tidak ada `CLAUDE.md`, jadi installer menjembatani keduanya dengan impor `@AGENTS.md` alih-alih menyembunyikan file Anda. Panduan lengkap, termasuk batas yang disiasati dan apa yang diverifikasi langsung, ada di [`id/docs/integrations.md`](id/docs/integrations.md).

### Plugin Claude Code

Core selalu aktif, skill `supermd` untuk modul profesi, perintah `/supermd:check`, dan tool MCP, dalam dua perintah:

```text
/plugin marketplace add TegarTheGreat/SuperMD
/plugin install supermd@supermd
```

<div align="center">
<img src="docs/assets/plugin.png" alt="claude plugin marketplace add dan install berhasil, lalu sesi claude -p langsung mengutip kalimat pertama core SuperMD dari konteksnya" width="760">
</div>

Tangkapan layar ini adalah proses nyata dari checkout lokal: setelah pemasangan, sesi `claude -p` baru mengutip core SuperMD secara verbatim dari konteksnya.

### Server MCP: biarkan agen memeriksa draf-nya sendiri

`supermd mcp` adalah server stdio lokal dengan empat tool baca-saja. Agen memanggil `supermd_check` pada drafnya dan menulis ulang sampai tidak ada hit keras.

```bash
claude mcp add supermd -- npx -y supermd mcp
codex mcp add supermd -- npx -y supermd mcp
```

<div align="center">
<img src="docs/assets/claude-mcp.png" alt="claude mcp list melaporkan server supermd berstatus Connected" width="760">
</div>

Cursor, Gemini CLI, dan klien MCP lain memakai perintah `npx -y supermd mcp` yang sama ([pengaturan tiap klien](id/docs/integrations.md#server-mcp)). Tool: `supermd_check`, `supermd_build`, `supermd_adapt`, `supermd_list`.

### Tanpa agen? Tempel satu file

Tempel [`id/SUPERMD.md`](id/SUPERMD.md) ke system prompt ChatGPT (Custom Instructions atau Project), Claude (instruksi Project), parameter `system` API mana pun, atau modelfile Ollama. Satu file itu sudah menghilangkan sebagian besar slop. `npx supermd build <bidang> --lang id --out prompt.md` merakit file untuk sebuah profesi.

## Lihat hasilnya

Model sama, prompt sama, satu perbedaan: core SuperMD di system prompt. Kedua tangkapan layar menampilkan keluaran asli, bukan mockup.

**Keluaran eval yang direkam** (`deepseek-chat`, temperature 0). Baseline berlanjut 530 kata lagi; jawaban SuperMD sudah utuh seperti terlihat.

<div align="center">
<img src="docs/assets/before-after.png" alt="Berdampingan: esai 609 kata berjudul-judul tanpa SuperMD dan jawaban prosa 150 kata dengan SuperMD" width="860">
</div>

**Sesi Claude Code langsung.** Claude Code 2.1.288, direkam dengan [`scripts/record-claude-code.mjs`](scripts/record-claude-code.mjs), yang menjalankan `claude -p` di proyek kosong dan di proyek tempat `supermd install claude-code` menulis aturannya.

<div align="center">
<img src="docs/assets/claude-live.png" alt="Claude Code dengan dan tanpa SuperMD: 421 kata dan 8 judul berbanding 176 kata tanpa judul untuk prompt kerja sama tim; 513 berbanding 247 kata untuk prompt indeks" width="860">
</div>

Baca yang ini dengan ekspektasi yang tepat. Jawaban bawaan Claude sudah menghindari frasa terlarang (0 hit keras di kedua kondisi), sehingga efeknya terlihat pada panjang, struktur, dan pertimbangan untung-rugi yang dinyatakan, bukan basa-basi. Ini satu sampel per kondisi, ilustrasi dan bukan statistik. Statistiknya ada di bawah.

## Bukti

Pustaka soal kualitas yang tak pernah mengukur dirinya sendiri akan jadi contoh tandingannya sendiri. [`eval/`](eval/README.md) menjalankan tiap skenario dua kali, dengan dan tanpa SuperMD, terhadap model yang sama, lalu menerapkan tiga pemeriksaan bebas: pemindaian pola terlarang deterministik, LLM juri berpasangan secara buta, serta probe untuk sitasi karangan, penjilatan, dan kontrak jumlah kata. 41 skenario mencakup 16 bidang dalam bahasa Inggris dan Indonesia.

<div align="center">
<img src="docs/assets/eval.png" alt="Eval terbaru: hit slop keras 33 menjadi 0, 32 dari 34 kemenangan juri buta, gerbang ketat FAIL; di bawahnya setiap laporan di repositori" width="860">
</div>

Apa kata run penuh terbaru (2026-10-03), tanpa dibulatkan demi keuntungan kami:

- **Slop keras: 33 → 0.** Pemindaian deterministik menemukan 33 pola slop tak ambigu pada jawaban baseline dan nol pada jawaban SuperMD. Angka ini selalu 0 di sisi SuperMD pada setiap run penuh.
- **Juri buta: 32 dari 34, 94%.** Juri memilih baseline pada `force-majeure` dan `supply-chain-delay`. Pada yang kedua, SuperMD meminta fakta yang belum ada alih-alih menulis draf status dengan placeholder. Sikap terlalu hati-hati itu kelemahan yang sudah diketahui dan hal berikutnya yang akan disetel.
- **Gerbang ketat gagal.** Harness menggagalkan run bila ada skenario yang kalah dari baseline atau ada kontrak yang meleset, dan kontrak `sixty-words` mendarat di 46 kata untuk target 60 (baseline: 54).
- **Variansnya nyata.** Dari enam run pada model yang sama, win rate juri buta berkisar 94% sampai 100%, karena API tidak deterministik bahkan pada temperature 0. Tabel mencantumkan setiap laporan, termasuk satu run tak valid pada model mode-berpikir yang batas tokennya mengosongkan sebagian besar generasi.
- **Satu keluarga generator, satu juri.** Suite dijalankan pada model DeepSeek. Sesi Claude Code di atas hanyalah satu sampel ilustratif. Jalankan harness pada model Anda dengan API kompatibel-OpenAI apa pun: [`eval/README.md`](eval/README.md).

<details>
<summary><b>Semua 41 skenario pada run terbaru</b></summary>
<br>
<img src="docs/assets/eval-full.png" alt="Tabel per skenario: hit slop keras, jumlah kata, pemenang juri buta, dan hasil probe untuk semua 41 skenario" width="860">
</details>

Selain eval, repositori ini adalah kasus ujinya sendiri: `npm test` menjalankan 11 pemeriksaan, termasuk 30 tes installer, 21 tes protokol MCP, dan linter anti-slop atas kedua pohon bahasa serta setiap dokumen pintu depan.

<div align="center">
<img src="docs/assets/tests.png" alt="npm test: sebelas pemeriksaan lolos, dari tes sintaks dan unit hingga install, MCP, paritas, sinkronisasi versi, sinkronisasi plugin, dan self-check" width="760">
</div>

## Cara kerjanya

Prompt SuperMD adalah tumpukan file Markdown. Tambahkan hanya lapisan yang Anda butuhkan:

```text
  CORE               id/SUPERMD.md              selalu: aturan anti-slop universal
+ DOMAIN             id/domains/<bidang>.md     opsional: norma dan slop profesi Anda
+ STYLE              id/styles/<register>.md    opsional: formal / percakapan / teknis
─────────────────
= system prompt Anda        (supermd build / supermd install merakitnya untuk Anda)
```

- **CORE** bersifat lintas-bidang: aturan bahasa, perilaku, dan format, masing-masing dengan contoh `BURUK → BAIK`. Core juga dipecah di `id/core/00`–`03` untuk dipelajari atau dipangkas.
- **DOMAIN** hanya menambahkan yang tak mungkin diketahui core: audiens, deliverable, standar mutu, terminologi, klise khas bidang, dan fakta yang tak boleh ditebak. Sub-bidang hanya menyatakan *delta* dari kategorinya.
- **STYLE** mengunci register bila diperlukan.
- **Bidang Anda belum ada?** [`id/adapters/UNIVERSAL-ADAPTER.md`](id/adapters/UNIVERSAL-ADAPTER.md) mengubah core menjadi modul untuk profesi apa pun dalam satu langkah: `npx supermd adapt "peternak lebah" --lang id`.

## Baris perintah

Tanpa dependensi, Node 18+. `npx supermd …` tidak perlu dipasang, atau `npm i -g supermd`.

| Perintah | Fungsinya |
|---|---|
| `supermd install <harness…\|all>` | Tulis aturan ke tempat tiap harness membacanya. Opsi: `--field`, `--style`, `--lang`, `--scope project\|user`, `--dry-run` |
| `supermd uninstall <harness…\|all>` | Hapus persis yang tadi ditulis `install` |
| `supermd status` | Tampilkan tempat SuperMD terpasang dan apakah sudah terbaru |
| `supermd harnesses` | Daftar harness yang didukung beserta file yang dibacanya |
| `supermd build <bidang> [--style s]` | Rakit system prompt ke stdout atau file lewat `--out` |
| `supermd adapt "<profesi apa pun>"` | Core plus adapter universal untuk profesi tanpa modul |
| `supermd list [kategori]` | Jelajahi katalog |
| `supermd check <file\|dir>` | Pindai teks untuk slop. Keluar non-nol pada slop keras, sehingga bisa jadi gerbang commit atau CI |
| `supermd mcp` | Jalankan server MCP lewat stdio |

<div align="center">
<img src="docs/assets/build.png" alt="supermd list healthcare dan supermd build nursing --style formal" width="760">
</div>

`check` adalah pendeteksi deterministik atas pola permukaan yang sudah dikenal, seperti pemeriksa ejaan. Lolos berarti tak satu pun penanda yang dikenal muncul, bukan teks itu bebas slop; slop semantik lolos dari regex apa pun. Pencegahan lewat prompt adalah pertahanan sesungguhnya, dan `check` adalah lini kedua yang murah. Baik `compose` maupun `scan` bisa diimpor sebagai pustaka (`supermd/compose`, `supermd/slop-scan`, `supermd/harnesses`, `supermd/mcp`). Referensi: [`id/docs/cli.md`](id/docs/cli.md).

## Katalog domain

Setiap modul tersedia dalam Bahasa Inggris dan Indonesia di path yang identik (`en/…` ↔ `id/…`). Daftar lengkap 16 kategori dan 103 sub-bidang ada di [README berbahasa Inggris](README.md#domain-catalog), dan peta lengkapnya di [`id/docs/taxonomy.md`](id/docs/taxonomy.md).

## Riset

Pola yang dilarang bukan soal selera. Itu tanda statistik terukur dari teks mesin dalam riset terpublikasi: studi kosakata berlebih sekitar 14 juta abstrak PubMed (Kobak dkk.), serta ambang pola yang bisa direproduksi seperti kepadatan em-dash dan keseragaman panjang kalimat. Setiap aturan bisa ditelusuri ke sumber bernama di [`RESEARCH.md`](RESEARCH.md).

## Struktur repositori

```text
en/  id/                  dua pohon tercermin, satu per bahasa (CI menegakkan paritas)
├── SUPERMD.md            core rakitan: satu file, siap tempel
├── core/                 aturan yang sama dipecah per topik, dengan contoh lebih lengkap
├── domains/<kategori>/   16 kategori, 103 modul sub-bidang (_category.md + bidang)
├── adapters/             adapter universal untuk bidang yang belum tercakup
├── styles/               register opsional: formal / percakapan / teknis
└── docs/                 how-to-use · integrations · taxonomy · philosophy · cli
bin/  lib/                CLI (npx supermd) dan modul yang bisa diimpor
.claude-plugin/  plugins/ manifes marketplace dan plugin Claude Code
eval/                     harness uji anti-slop (API kompatibel-OpenAI apa pun)
scripts/                  tes, pemeriksaan, serta pembuat tangkapan layar dan bukti
docs/                     tangkapan layar README dan rekaman bukti sesi langsung
RESEARCH.md               basis bukti bersitasi untuk aturan-aturan
```

## Kontribusi

Modul untuk bidang baru adalah kontribusi paling berharga. Mulai dari [`id/domains/_TEMPLATE.md`](id/domains/_TEMPLATE.md), tulis kedua versi bahasa, dan baca [`CONTRIBUTING.md`](CONTRIBUTING.md). Modul Anda tunduk pada aturan yang diajarkannya sendiri: CI memeriksa Markdown, paritas EN↔ID, tautan internal, dan menjalankan self-check anti-slop atas kedua pohon di setiap PR. Agen yang bekerja di repositori ini sebaiknya mulai dari [`AGENTS.md`](AGENTS.md).

Menemukan slop yang lolos dari sebuah modul? Itu bug di inti. Buka issue **Slop report**. Menemukan harness yang konvensi filenya berubah? Buka issue dengan tautan dokumentasinya.

## Versi dan lisensi

Dirilis dengan [SemVer](https://semver.org); perubahan dicatat di [`CHANGELOG.md`](CHANGELOG.md). Berlisensi [CC BY 4.0](LICENSE): bebas dipakai di mana pun, termasuk komersial, dengan atribusi ke repo ini. Untuk menyitasi, lihat [`CITATION.cff`](CITATION.cff).
