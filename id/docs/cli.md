---
name: CLI
category: docs
version: 1.0.0
summary: Perintah supermd — merakit prompt dan memindai teks untuk slop, dari terminal, tanpa instalasi.
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

Opsi: `--style formal|conversational|technical`, `--lang en|id`, `--core-only`, `--out FILE`, `--no-banner` (buang komentar provenance di awal).

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

## Memindai teks untuk slop — `check`

Nilai teks apa pun terhadap leksikon anti-slop — pemindaian deterministik yang sama dengan yang dipakai harness eval. Ia membaca sebuah file atau standard input, mencetak setiap pola yang ditemukan beserta tingkatnya, dan keluar dengan kode non-nol saat menemukan slop *keras* (tak ambigu), sehingga cocok dijadikan pre-commit hook atau langkah CI:

```bash
npx supermd check draft.md
cat artikel.txt | npx supermd check --lang id
```

Hit *keras* adalah slop tak ambigu (pembuka basa-basi, frasa otoritas-karangan, penjilatan). Hit *lunak* adalah sinyal lemah atau yang sah dalam konteks tertentu (kepadatan em-dash, "leverage") yang dilaporkan tetapi tak pernah menggagalkan pemeriksaan. Frasa terlarang yang dikutip di baris larangan ("Jangan tulis 'semoga membantu'") dibaca sebagai mengajarkan penghindaran, bukan sebagai slop.

**Apa `check` itu dan bukan.** Ia adalah pendeteksi deterministik atas pola permukaan yang *sudah dikenal* — sebuah blocklist, seperti pemeriksa ejaan. Lolos berarti "tak satu pun penanda yang dikenal muncul", **bukan** "teks ini bebas slop". Slop semantik — teks bertele-tele tanpa isi, angka yang difabrikasi halus, penalaran generik yang berlagak wawasan — bukan regex, dan tak ada kode yang menangkapnya secara andal (bahkan LLM kuat pun buruk mendeteksi rentang slop; lihat `RESEARCH.md`). Pertahanan sesungguhnya adalah **pencegahan**: SuperMD di system prompt menghentikan model memuntahkan slop sejak awal. `check` adalah lini kedua yang murah — berguna untuk pre-commit hook atau CI, bukan sertifikat.

## Pakai sebagai pustaka

Kedua modul bisa diimpor:

```js
import { compose, adapt, catalog } from 'supermd/compose';
import { scan } from 'supermd/slop-scan';

const { prompt } = compose({ field: 'backend', style: 'technical', lang: 'id' });
const hits = scan(teksSaya, 'id');   // { hard: [...], soft: [...] }
```
