---
name: Filosofi
category: docs
version: 1.0.0
summary: Apa itu slop, mengapa slop terjadi, dan prinsip desain di balik SuperMD.
---

# Filosofi

## Apa itu slop

Slop adalah output yang dioptimalkan untuk *terlihat seperti* jawaban yang baik, bukan untuk *menjadi* jawaban yang baik. Ini bukan masalah panjang teks atau masalah kesopanan — ini substitusi: teks berbentuk pola di tempat yang seharusnya berisi informasi. Tiga wajah yang dibidik SuperMD:

- **Slop bahasa** — pembuka basa-basi, kosakata yang digelembungkan, tumpukan hedging, daftar dekoratif: kalimat-kalimat yang tidak lolos uji penghapusan.
- **Slop perilaku** — sitasi yang dikarang, pujian yang diobral, menyetujui premis yang keliru, kepercayaan diri tanpa dasar: klaim yang tidak bisa dipercaya pembaca.
- **Slop format** — perancah tanpa bangunan: header, bullet, dan huruf tebal menggantikan penalaran; kontrak format yang diabaikan.

Slop bahasa membuang beberapa menit. Slop perilaku menghancurkan kepercayaan. Slop format menyembunyikan apakah dua yang lain terjadi.

## Mengapa model menghasilkannya

Model yang di-tune sebagai asisten diberi imbalan atas jawaban yang *disukai penilai*, dan penilai menghargai usaha yang tampak, keamanan yang dilapisi hedging, dan nada yang mengiyakan. Hasilnya bias sistematis ke arah seremoni, kata pengisi, dan pujian — bukan karena model tidak mampu lebih baik, melainkan karena tidak ada apa pun dalam konteks yang menuntutnya. System prompt adalah tuntutan itu. Ia berhasil karena kemampuannya memang selalu ada; slop adalah perilaku bawaan, bukan batas atas kemampuan.

## Prinsip desain

1. **Namai polanya, jangan hanya perintahkan kebajikannya.** "Tulislah dengan ringkas" gagal karena model yakin dirinya sudah ringkas. "Jangan pernah membuka dengan menyatakan ulang permintaan" bisa diperiksa — oleh model, oleh reviewer, oleh regex.
2. **Setiap aturan membawa langkah penggantinya.** Larangan tanpa pengganti menghasilkan pengelakan, bukan perbaikan. Setiap pola dipasangkan dengan apa yang seharusnya ditulis sebagai gantinya — biasanya "fakta spesifik yang tadinya disembunyikan kata pengisi itu".
3. **Core universal, domain hasil komposisi.** Aturan yang berlaku di semua bidang tinggal di satu tempat. Modul domain hanya menambahkan apa yang tidak mungkin diketahui core: audiens, artefak, standar, kosakata, dan klise khas bidang itu. Karena itulah sepuluh kategori plus satu adapter mencakup long tail profesi — mesin anti-slop tidak pernah perlu diulang.
4. **Bisa diuji, atau tidak dirilis.** Klaim proyek ini tentang dirinya sendiri diperiksa oleh `eval/` — pemindaian pola terlarang dan penilaian berpasangan tersamar (blind pairwise judging) pada tugas pemancing slop, termasuk probe kejujuran (apakah model mengarang sitasi ketika dipancing?) dan probe ketidaksetujuan (apakah model membantah rencana yang cacat?). Pustaka prompt tentang kualitas yang tidak pernah mengukur diri akan menjadi contoh tandingannya sendiri.
5. **Dokumen-dokumen ini mematuhi aturannya sendiri.** Setiap file di repo ini tunduk pada aturannya sendiri. Jika Anda menemukan slop di SuperMD, itu bug — laporkan.

## Apa yang bukan SuperMD

SuperMD bukan jailbreak, bukan persona, bukan mantra "membuat model lebih pintar". Ia tidak bisa menambahkan pengetahuan yang tidak dimiliki model; ia hanya bisa menghentikan model menutup-nutupi kekurangan itu. Dalam aturan kejujuran, SuperMD konservatif secara ketat: ketika SuperMD bekerja, model mengatakan "saya tidak tahu" *lebih* sering, bukan lebih jarang.
