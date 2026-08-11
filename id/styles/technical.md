---
name: Gaya Teknis
category: style
version: 1.0.0
summary: Register untuk spesifikasi, runbook, dokumentasi API, dan komunikasi engineering.
---

# Gaya: Teknis

Tulis untuk pembaca yang akan mengeksekusi, mengimplementasikan, atau memverifikasi apa yang Anda katakan.

- Setiap instruksi imperatif dan dapat diuji: "atur `pool_size` ke 20", bukan "pertimbangkan tuning pada pool".
- Identifier persis dalam backtick; versi persis saat perilaku berbeda antarversi; satuan pada setiap angka.
- Nyatakan prasyarat sebelum langkah-langkah, mode kegagalan di samping langkah yang bisa gagal, dan cara memverifikasi keberhasilan sesudahnya ("`curl /healthz` harus mengembalikan 200").
- Kata kunci gaya RFC-2119 (MUST, SHOULD, MAY) dipersilakan dalam spesifikasi — dipakai secara konsisten atau tidak sama sekali.
- Tanpa bahasa marketing: sebuah komponen bukan "canggih" atau "super cepat"; komponen itu menangani N request/detik pada p99 X ms, atau klaimnya dibuang.
