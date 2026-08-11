# Contributing to SuperMD

Bahasa Indonesia tersedia di bagian bawah halaman ini.

## English

### The one rule above all

Every file in this repo is subject to the rules it teaches. A domain module containing filler, invented citations, or decorative bullet stacks will be rejected regardless of how useful its field coverage is. Before submitting, reread your text against `en/SUPERMD.md` — the deletion test applies to you too.

### Contributing a domain module

1. Check `en/docs/taxonomy.md` for where your field belongs and whether it already exists.
2. Copy `en/domains/_TEMPLATE.md`, fill all six slots, delete the instruction comment.
3. **Both languages are required.** Write `en/domains/<category>/<field>.md` and `id/domains/<category>/<field>.md` with identical structure and meaning. If you only speak one language, open the PR anyway and label it `needs-translation` — a maintainer or another contributor completes it before merge.
4. Sub-field modules state only their deltas from the category's `_category.md`. Zero repetition of the parent or the core.
5. Front-matter is mandatory: `name`, `category` (the folder name), `version` (start at `1.0.0`), `summary`.
6. Named regulations and standards must be real. If you are not certain of an exact name, write the generic honest form ("the applicable fire code"), never an invention.

### Reporting slop that leaks through

If a model running SuperMD still produces a slop pattern, that is a bug in the core. Open a **Slop report** issue with the model, the full system prompt used, the input, and the offending output. New banned patterns enter `core/01-language.md` and the eval lexicon together.

### Quality gates (CI)

Every PR runs: `markdownlint`, a link checker, and `scripts/check-parity.sh` (the `en/` and `id/` trees must contain identical file paths). Run locally:

```bash
npx markdownlint-cli2 "**/*.md"
bash scripts/check-parity.sh
```

Content changes to the core should also pass the eval harness — see `eval/README.md`. Maintainers run it on every release; running it yourself (any OpenAI-compatible API key) speeds up review.

### Versioning

The prompt collection releases under SemVer, tracked in `CHANGELOG.md`. Adding a module is minor; changing a core rule's meaning is major; wording fixes are patch.

---

## Bahasa Indonesia

### Satu aturan di atas segalanya

Setiap file di repo ini tunduk pada aturan yang diajarkannya sendiri. Modul domain yang berisi kalimat pengisi, sitasi karangan, atau tumpukan bullet dekoratif akan ditolak seberapa pun bergunanya cakupan bidangnya. Sebelum mengirim, baca ulang teks Anda terhadap `id/SUPERMD.md` — uji penghapusan juga berlaku untuk Anda.

### Menyumbang modul domain

1. Cek `id/docs/taxonomy.md` untuk posisi bidang Anda dan apakah sudah ada.
2. Salin `id/domains/_TEMPLATE.md`, isi keenam slot, hapus komentar instruksinya.
3. **Dua bahasa wajib.** Tulis `en/domains/<kategori>/<bidang>.md` dan `id/domains/<kategori>/<bidang>.md` dengan struktur dan makna identik. Jika Anda hanya menguasai satu bahasa, tetap buka PR dan beri label `needs-translation` — maintainer atau kontributor lain melengkapinya sebelum merge.
4. Modul sub-bidang hanya memuat delta dari `_category.md` kategorinya. Nol pengulangan dari induk maupun inti.
5. Front-matter wajib: `name`, `category` (nama folder), `version` (mulai `1.0.0`), `summary`.
6. Nama regulasi dan standar harus nyata. Jika tidak yakin nama persisnya, tulis bentuk generik yang jujur ("peraturan bangunan setempat"), jangan pernah mengarang.

### Melaporkan slop yang lolos

Jika model yang menjalankan SuperMD masih menghasilkan pola slop, itu bug di inti. Buka issue **Slop report** berisi model, system prompt lengkap yang dipakai, input, dan output yang bermasalah. Pola terlarang baru masuk ke `core/01-language.md` dan leksikon eval secara bersamaan.

### Gerbang kualitas (CI)

Setiap PR menjalankan: `markdownlint`, pemeriksa tautan, dan `scripts/check-parity.sh` (pohon `en/` dan `id/` harus berisi path file yang identik). Jalankan lokal dengan dua perintah di bagian English di atas.

### Versi

Koleksi prompt dirilis dengan SemVer, dicatat di `CHANGELOG.md`. Menambah modul = minor; mengubah makna aturan inti = major; perbaikan redaksi = patch.
