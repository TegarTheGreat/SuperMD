---
name: Taksonomi
category: docs
version: 1.0.0
summary: Bagaimana sepuluh folder kategori mencakup puluhan ribu profesi, dan di mana letak setiap pekerjaan.
---

# Taksonomi

SuperMD tidak menyediakan satu file per profesi — yang disediakan adalah **sepuluh modul kategori**, sekumpulan **modul sub-bidang** yang terus bertambah, dan sebuah **adapter universal** yang menginstansiasi core untuk bidang lain mana pun. Cakupan lahir dari komposisi: konteks kategori + delta sub-bidang + adapter untuk long tail profesi.

## Kategori

| Folder | Mencakup (contoh, bukan batas) |
|---|---|
| `technology/` | Perangkat lunak, data, operasi IT, keamanan, produk |
| `healthcare/` | Kedokteran, keperawatan, tenaga kesehatan penunjang, kesehatan masyarakat, farmasi |
| `business-finance/` | Akuntansi, keuangan, konsultansi, operasional, HR, kewirausahaan |
| `legal/` | Praktik hukum, kepatuhan, kontrak, pekerjaan paralegal |
| `education/` | Pengajaran di semua jenjang, kurikulum, pelatihan, bimbingan akademik |
| `creative-media/` | Penulisan, jurnalistik, desain, film, musik, fotografi |
| `marketing-sales/` | Pemasaran, periklanan, SEO, penjualan, PR, e-commerce |
| `science-research/` | Riset akademik, penelitian laboratorium, analisis data, pengelolaan hibah |
| `engineering-manufacturing/` | Teknik mesin, sipil, elektro, industri, konstruksi, QA |
| `public-service/` | Pemerintahan, kebijakan publik, organisasi nirlaba, layanan kedaruratan, pekerjaan sosial |

## Menemukan bidang Anda

1. **Ada modul sub-bidang yang persis** (mis. `technology/software-engineering.md`) → gunakan kategori + sub-bidang.
2. **Hanya kategorinya yang cocok** (mis. Anda penyiar radio → `creative-media/_category.md`) → gunakan kategori + adapter universal yang diisi untuk pekerjaan spesifik Anda.
3. **Tidak ada yang cocok** (mis. peternak lebah, pandu kapal, sommelier) → adapter universal saja di atas CORE. Slot-slot adapter — audiens, deliverable, standar mutu, terminologi, slop bidang, batas keras — adalah enam hal yang sama yang dikodekan setiap modul domain.

Sebuah profesi "tercakup" ketika model berhenti menghasilkan jawaban generik dan mulai menghormati artefak, kosakata, dan hal-hal yang tidak bisa ditawar di bidang itu. Adapter mencapainya untuk bidang apa pun yang bisa dideskripsikan pengguna yang kompeten; modul yang sudah tersedia hanya menghemat pekerjaan mendeskripsikannya.

## Aturan pertumbuhan

Sebuah sub-bidang layak mendapat modul tersendiri ketika delta-nya dari kategori tidak bisa ditebak begitu saja — regulasi spesifik, format artefak, atau pola slop yang akan terlewat oleh isian generik. Tujuannya bukan "lebih banyak file", melainkan "tidak ada profesi yang dibiarkan generik". Untuk menyumbang modul, mulailah dari `domains/_TEMPLATE.md` dan baca `CONTRIBUTING.md`.
