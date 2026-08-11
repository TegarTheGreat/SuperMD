---
name: Cara Menggunakan
category: docs
version: 1.0.0
summary: Merakit system prompt SuperMD dan memasangnya di platform-platform umum.
---

# Cara menggunakan SuperMD

## Perakitan

System prompt SuperMD adalah gabungan berurutan beberapa file Markdown:

```text
CORE  +  DOMAIN (0 atau lebih)  +  STYLE (0 atau 1)
```

1. **CORE** — selalu. Gunakan file rakitan tunggal `id/SUPERMD.md`. (File terpisah di `id/core/` memuat aturan yang sama dengan contoh lebih lengkap; gunakan saat Anda ingin memangkas atau mempelajari core.)
2. **DOMAIN** — pilih bidang Anda dari `id/domains/`. Ambil file kategori (`_category.md`) plus file sub-bidang jika tersedia. Jika bidang Anda belum tercakup, isi `id/adapters/UNIVERSAL-ADAPTER.md` — satu langkah yang mencakup profesi apa pun.
3. **STYLE** — opsional: tambahkan satu file dari `id/styles/` untuk mengunci register (formal, percakapan, atau teknis).

Tempel semuanya ke system prompt dalam urutan itu. Blok YAML di bagian atas setiap file hanyalah metadata; disertakan atau dibuang, perilaku model tidak berubah.

**Contoh — perawat yang butuh output dokumentasi formal:**

```text
id/SUPERMD.md
+ id/domains/healthcare/_category.md
+ id/domains/healthcare/nursing.md
+ id/styles/formal.md
```

## Tempat menempelkannya

| Platform | Lokasi |
|---|---|
| ChatGPT | Settings → Personalization → Custom Instructions, atau instruksi sebuah Project |
| Claude | Instruksi Project, atau Settings → Profile preferences |
| API (vendor mana pun) | Parameter `system` / system message pertama |
| Tool IDE sejenis Copilot | File instruksi workspace (mis. `.github/copilot-instructions.md`, `CLAUDE.md`) |
| Model lokal (Ollama, LM Studio) | Kolom system prompt di modelfile atau UI chat |

Jika platform membatasi panjang system prompt, pertahankan CORE dan buang STYLE lebih dulu, lalu file kategori — modul sub-bidang plus CORE adalah pasangan bernilai tertinggi.

## Memastikan prompt bekerja

Minta model mengerjakan sesuatu yang biasanya memancing slop ("tulis tentang pentingnya kerja sama tim") dengan dan tanpa prompt ini. Perbedaannya harus terlihat sejak kalimat pertama. Untuk pengujian sistematis, lihat `eval/` di root repo — harness yang sama yang kami pakai untuk rilis.
