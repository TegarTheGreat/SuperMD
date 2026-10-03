---
name: CLI
category: docs
version: 1.0.0
summary: Perintah supermd — merakit prompt, memasangnya ke harness agen, memindai teks untuk slop, dan menjalankan server MCP, tanpa instalasi.
---

# CLI `supermd`

Pustaka Markdown adalah sumber kebenaran; CLI hanyalah lapisan pemudah di atasnya. Ia tanpa dependensi dan cukup Node 18+. Jalankan tanpa instalasi:

```bash
npx supermd <perintah>
```

Atau kloning repo lalu jalankan `node bin/supermd.mjs <perintah>` langsung.

## Merakit prompt — `build`

Rakit system prompt dari sebuah bidang. CLI meresolusi bidang ke modulnya, menambahkan konteks kategori dan core universal, lalu mencetak hasilnya:

```bash
npx supermd build software-engineering --style technical
npx supermd build keperawatan --lang id --out prompt.txt
npx supermd build --core-only          # hanya core universal, tanpa yang lain
```

Pencocokan bidang toleran: `nurse` teresolusi ke `nursing`, `frontend` ke Frontend Engineering. Ketika istilahnya ambigu atau tak dikenal, CLI menampilkan sub-bidang terdekat dan mengarahkan Anda ke `adapt`.

Opsi: `--style formal|conversational|technical`, `--lang en|id`, `--core-only`, `--out FILE`, `--no-banner` (buang komentar provenance di awal), `--keep-frontmatter`. Blok metadata YAML tiap modul dibuang dari prompt rakitan secara default, karena blok `---` kedua di tengah prompt yang ditempel membingungkan harness yang mem-parse front matter.

## Profesi apa pun — `adapt`

Untuk bidang tanpa modul, instansiasi adapter universal. Outputnya adalah system prompt siap pakai yang membuat model membangun modul bidang itu sendiri sebelum menjawab:

```bash
npx supermd adapt "peternak lebah" --lang id
npx supermd adapt "beekeeper"
```

## Menjelajah katalog — `list`

```bash
npx supermd list                # semua 16 kategori
npx supermd list technology     # sub-bidang satu kategori beserta slug-nya
```

## Memasang ke harness — `install`, `uninstall`, `status`, `harnesses`

Tulis aturan ke tempat agen coding membacanya, tanpa menyentuh isi Anda sendiri. Panduan lengkap berisi setiap harness, path file, dan jaminannya ada di [integrations.md](integrations.md).

```bash
npx supermd install claude-code codex --lang id   # proyek ini
npx supermd install cursor --field backend        # core plus modul profesi
npx supermd install claude-code --scope user      # semua proyek, lewat direktori home
npx supermd install all --dry-run                 # pratinjau, tanpa menulis
npx supermd status                                # apa yang terpasang, dan apakah sudah terbaru
npx supermd uninstall all                         # hapus persis yang tadi ditulis
npx supermd harnesses                             # harness yang didukung beserta file-nya
```

Opsi: `--field NAMA`, `--style NAMA`, `--lang en|id`, `--scope project|user`, `--dir PATH`, `--dry-run`, `--force`. Kode keluar 1 berarti ada file yang dibiarkan karena bukan milik SuperMD.

## Server MCP — `mcp`

```bash
claude mcp add supermd -- npx -y supermd mcp
codex mcp add supermd -- npx -y supermd mcp
```

Server stdio lokal dengan empat tool baca-saja (`supermd_check`, `supermd_build`, `supermd_adapt`, `supermd_list`) dan satu prompt. Agen memanggil `supermd_check` pada draf-nya sendiri dan menulis ulang sampai tidak ada hit keras. Detail dan konfigurasi untuk klien lain: [integrations.md](integrations.md#server-mcp).

## Memindai teks untuk slop — `check`

Nilai teks apa pun terhadap leksikon anti-slop — pemindaian deterministik yang sama dengan yang dipakai harness eval. Ia membaca sebuah file, sebuah direktori (setiap `.md` di bawahnya, rekursif), atau standard input, mencetak setiap pola yang ditemukan beserta tingkatnya, dan keluar dengan kode non-nol saat menemukan slop *keras* (tak ambigu), sehingga cocok dijadikan pre-commit hook atau langkah CI:

```bash
npx supermd check draft.md
npx supermd check docs/                          # sapu satu pohon penuh, satu baris ringkasan
cat artikel.txt | npx supermd check
```

Bahasa terdeteksi otomatis per file dari kata fungsinya; berikan `--lang en|id` untuk menimpanya — flag menang atas deteksi.

Hit *keras* adalah slop tak ambigu (pembuka basa-basi, frasa otoritas-karangan, penjilatan). Hit *lunak* adalah sinyal lemah atau yang sah dalam konteks tertentu (kepadatan em-dash, "leverage") yang dilaporkan tetapi tak pernah menggagalkan pemeriksaan. Frasa terlarang yang dikutip atau dimiringkan di baris larangan — "Jangan tulis 'semoga membantu'", contoh `BURUK:`, daftar kata terlarang yang ditulis miring — dibaca sebagai mengajarkan penghindaran, bukan sebagai slop.

**Apa `check` itu dan bukan.** Ia adalah pendeteksi deterministik atas pola permukaan yang *sudah dikenal* — sebuah blocklist, seperti pemeriksa ejaan. Lolos berarti "tak satu pun penanda yang dikenal muncul", **bukan** "teks ini bebas slop". Slop semantik — teks bertele-tele tanpa isi, angka yang difabrikasi halus, penalaran generik yang berlagak wawasan — bukan regex, dan tak ada kode yang menangkapnya secara andal (bahkan LLM kuat pun buruk mendeteksi rentang slop; lihat `RESEARCH.md`). Pertahanan sesungguhnya adalah **pencegahan**: SuperMD di system prompt menghentikan model memuntahkan slop sejak awal. `check` adalah lini kedua yang murah — berguna untuk pre-commit hook atau CI, bukan sertifikat.

## Pakai sebagai pustaka

Kedua modul bisa diimpor:

```js
import { compose, adapt, catalog } from 'supermd/compose';
import { scan } from 'supermd/slop-scan';

const { prompt } = compose({ field: 'backend', style: 'technical', lang: 'id' });
const hits = scan(teksSaya, 'id');   // { hard: [...], soft: [...] }
```

`supermd/harnesses` (perencana installer) dan `supermd/mcp` (server) juga bisa diimpor. Warna output mengikuti terminal; setel `FORCE_COLOR=1` untuk memaksanya atau `NO_COLOR=1` untuk mematikannya.
