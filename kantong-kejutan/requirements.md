# Requirements: Kantong Kejutan Surabaya (nama kerja), Prototipe Android

## 1. Introduction

**Konteks.** Toko roti dan donat di Surabaya sering membuang produk layak jual di akhir hari. Aplikasi ini menghubungkan toko dengan pembeli sekitar untuk menjual sisa tersebut dengan harga miring, mendukung SDG 12 (konsumsi dan produksi bertanggung jawab). Rujukan: `ideation.md`, Hypothesis 1.

**Tujuan dokumen ini.** Mendefinisikan **prototipe demo untuk lomba**, bukan produk siap rilis.

**Kendala proyek (hasil kickoff):**
- Tenggat: **30 November 2026** (sekitar 9 hari dari 21 November 2026).
- Tim: membangun dengan vibe coding (bantuan AI); cakupan harus kecil dan mudah dibangun.
- Format: APK Android; demo **hanya dari HP tim**; tidak ada kriteria juri tertulis.
- Seluruh data (toko, stok, pesanan, pembayaran) berupa **data demo**; aplikasi harus berjalan **offline**.
- Fokus kota: Surabaya. Bahasa antarmuka: Bahasa Indonesia.
- Donasi lewat Garda Pangan **dikeluarkan** dari prototipe.

**Catatan validasi.** Prototipe hanya mendemonstrasikan konsep. Asumsi berisiko tertinggi (A2 kesediaan merchant, A6 hukum pangan, A8 unit economics, A4 hambatan kesadaran) **tidak tervalidasi oleh prototipe**; semuanya tetap memerlukan wawancara, survei, dan konsultasi hukum (lihat `ideation.md` bagian 5 dan 7).

**Non-goals (prototipe ini):**
- Pembayaran nyata/QRIS sungguhan, akun dan autentikasi nyata, server atau database bersama.
- Peta nyata (jika butuh internet), notifikasi push sungguhan.
- Donasi Garda Pangan, mode rantai/B2B, laporan ESG.
- iOS, dukungan banyak perangkat Android.
- Penggunaan nama atau logo merek nyata (Bon Ami, J.CO, dll.) pada data demo.

## 2. Glossary

| Istilah | Definisi |
|---------|----------|
| Toko | Penjual roti/donat yang mengunggah listing di akhir hari |
| Pembeli | Pengguna yang memesan listing dan mengambil di toko |
| Listing | Penawaran dari toko: **Paket Kejutan** atau **Item Pilihan** |
| Paket Kejutan | Kantong berisi sisa produk; isi tidak diumumkan sebelum pengambilan; tidak menampilkan harga asli/coret |
| Item Pilihan | Produk tertentu dengan nama dan harga yang jelas |
| Jendela Jual | Rentang waktu listing dapat dipesan |
| Jendela Ambil | Rentang waktu pembeli mengambil pesanan di toko |
| Kode Ambil | Kode unik pesanan untuk verifikasi pengambilan |
| Data Demo | Dataset contoh (toko fiktif Surabaya) yang tersimpan lokal |
| Dampak | Ringkasan makanan terselamatkan, nilai rupiah, estimasi CO2 dari pesanan selesai |

## 3. Requirements

Prioritas: **P0** wajib untuk demo; **P1** dibangun terakhir dan **dipotong lebih dulu** jika waktu mepet (keputusan pengguna); **P2** tidak dibangun sekarang.

### REQ-1: Peran dan data demo (P0)
**Traces to:** A5 (kendala proyek: demo offline)
**User story:** Sebagai anggota tim, saya ingin memilih peran Toko atau Pembeli dengan data demo siap pakai, sehingga demo bisa dimulai tanpa pendaftaran.
**Acceptance criteria:**
1. THE System SHALL menampilkan pilihan peran (Toko / Pembeli) pada layar awal tanpa login nyata.
2. THE System SHALL memuat data demo berisi beberapa toko fiktif di Surabaya beserta listing awal.
3. THE System SHALL menyediakan tombol "Reset demo" yang mengembalikan seluruh data ke kondisi awal.
4. THE System SHALL menampilkan penanda jelas bahwa data dan pembayaran adalah demo.

### REQ-2: Toko membuat listing (P0)
**Traces to:** A1, A2, A7
**User story:** Sebagai Toko, saya ingin mengunggah Paket Kejutan atau Item Pilihan menjelang tutup, sehingga stok sisa bisa terjual.
**Acceptance criteria:**
1. THE System SHALL mengizinkan Toko memilih jenis listing: Paket Kejutan atau Item Pilihan.
2. WHEN jenis = Paket Kejutan, THE System SHALL meminta jumlah kantong, harga, dan Jendela Ambil tanpa wajib mengisi isi kantong.
3. WHEN jenis = Item Pilihan, THE System SHALL meminta nama produk, harga, jumlah, dan Jendela Ambil.
4. THE System SHALL menolak listing dengan jumlah ≤ 0, harga ≤ 0, atau Jendela Ambil yang berakhir sebelum mulai.
5. THE System SHALL menampilkan listing baru kepada Pembeli pada sesi demo yang sama.

### REQ-3: Daftar toko dan listing untuk Pembeli (P0)
**Traces to:** A3, A5, A10
**User story:** Sebagai Pembeli, saya ingin melihat toko terdekat dan listing yang tersedia, sehingga saya bisa memilih yang cocok.
**Acceptance criteria:**
1. THE System SHALL menampilkan daftar listing aktif dengan nama toko, jarak contoh, harga, sisa stok, dan Jendela Ambil.
2. THE System SHALL mengurutkan daftar berdasarkan jarak contoh secara default.
3. THE System SHALL menyembunyikan listing yang stoknya 0 atau Jendela Jual-nya sudah berakhir.

### REQ-4: Detail listing dan perlindungan merek (P0)
**Traces to:** A3, A7
**User story:** Sebagai Pembeli, saya ingin tahu apa yang saya beli, dan sebagai Toko saya ingin merek saya tidak terlihat "diobral".
**Acceptance criteria:**
1. WHEN listing = Paket Kejutan, THE System SHALL menampilkan harga akhir tanpa harga asli/coret dan tanpa daftar isi.
2. WHEN listing = Item Pilihan, THE System SHALL menampilkan nama produk dan harga yang jelas.
3. THE System SHALL menampilkan keterangan bahwa produk adalah sisa hari yang sama dan harus diambil pada Jendela Ambil.

### REQ-5: Pemesanan dan pembayaran simulasi (P0)
**Traces to:** A3, A8, A10
**User story:** Sebagai Pembeli, saya ingin memesan dan mendapat kode ambil.
**Acceptance criteria:**
1. WHEN Pembeli memesan jumlah n, THE System SHALL memastikan 1 ≤ n ≤ stok tersisa.
2. THE System SHALL menghitung total = harga × n dan menampilkannya sebelum konfirmasi.
3. WHEN pembayaran simulasi dikonfirmasi, THE System SHALL mengurangi stok sebanyak n dan membuat Pesanan dengan Kode Ambil unik.
4. THE System SHALL menampilkan layar Pesanan berisi toko, Jendela Ambil, dan Kode Ambil.
5. THE System SHALL menandai pembayaran sebagai simulasi pada seluruh layar terkait.

### REQ-6: Pengambilan dan verifikasi (P0)
**Traces to:** A2, A10
**User story:** Sebagai Toko, saya ingin memverifikasi kode pembeli saat pengambilan.
**Acceptance criteria:**
1. WHEN Toko memasukkan Kode Ambil yang valid dan belum dipakai, THE System SHALL menandai Pesanan "Diambil".
2. IF Kode Ambil tidak ditemukan atau sudah dipakai, THEN THE System SHALL menolak dan menampilkan alasan.
3. THE System SHALL menampilkan daftar pesanan masuk beserta statusnya di dashboard Toko.

### REQ-7: Jendela waktu dan keamanan pangan (P0)
**Traces to:** A6
**User story:** Sebagai pengelola platform, saya ingin listing tidak dijual di luar jendela yang aman.
**Acceptance criteria:**
1. IF waktu sekarang di luar Jendela Jual, THEN THE System SHALL menolak pemesanan.
2. WHEN Jendela Ambil berakhir tanpa pengambilan, THE System SHALL mengubah status Pesanan menjadi "Hangus".
3. THE System SHALL menampilkan ketentuan: hanya produk hari yang sama dan belum kedaluwarsa yang boleh dijual (catatan: kejelasan hukum menunggu konsultasi, lihat A6).

### REQ-8: Berjalan offline dan stabil untuk demo (P0)
**Traces to:** Kendala proyek (bukan asumsi ideasi)
**User story:** Sebagai tim, saya ingin demo berjalan tanpa internet dan tanpa kejutan.
**Acceptance criteria:**
1. THE System SHALL berfungsi penuh tanpa koneksi internet.
2. THE System SHALL menyimpan perubahan data di perangkat selama sesi demo.
3. THE System SHALL dapat dipasang sebagai APK di HP tim dan menjalankan seluruh alur P0 tanpa galat.

### REQ-9: Layar dampak SDG 12 (P1, dipotong lebih dulu)
**Traces to:** A1, A11
**User story:** Sebagai juri atau penonton, saya ingin melihat dampak penyelamatan makanan.
**Acceptance criteria:**
1. THE System SHALL menampilkan jumlah kantong/porsi yang terjual dan nilai rupiah pesanan berstatus "Diambil".
2. THE System SHALL menampilkan estimasi CO2 dari parameter dengan sumber faktor emisi yang dicantumkan dan label "estimasi".
3. THE System SHALL menghitung seluruh angka dampak hanya dari pesanan berstatus "Diambil".
**Fallback bila dipotong:** penghitung dampak sederhana pada layar konfirmasi pengambilan.

### REQ-10: Komisi dan pendapatan bersih (P2, tidak dibangun)
**Traces to:** A8, A2
**User story:** Sebagai Toko, saya ingin melihat pendapatan bersih setelah komisi.
**Acceptance criteria:**
1. THE System SHALL menampilkan komisi platform per pesanan dan pendapatan bersih Toko (parameter demo, bukan angka bisnis final).

### REQ-11: Notifikasi dan peta nyata (P2, tidak dibangun)
**Traces to:** A3, A10
**User story:** Sebagai Pembeli, saya ingin diberi tahu ada listing baru di sekitar saya.
**Acceptance criteria:**
1. THE System SHALL menampilkan notifikasi listing baru dan peta toko terdekat ketika konektivitas tersedia (di luar cakupan prototipe).

## 4. Traceability Matrix

| Asumsi | Requirement |
|--------|-------------|
| A1 | REQ-2, REQ-9 |
| A2 | REQ-2, REQ-6, REQ-10 |
| A3 | REQ-3, REQ-4, REQ-5, REQ-11 |
| A5 | REQ-1, REQ-3 |
| A6 | REQ-7 |
| A7 | REQ-2, REQ-4 |
| A8 | REQ-5, REQ-10 |
| A10 | REQ-3, REQ-5, REQ-6, REQ-11 |
| A11 | REQ-9 |
| A4, A9 | Tidak tercakup prototipe (lihat catatan validasi) |
