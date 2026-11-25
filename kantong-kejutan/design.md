# Design: Kantong Kejutan Surabaya (nama kerja), Prototipe Android

## 1. Overview

**Masalah.** Toko roti dan donat di Surabaya membuang produk layak jual di akhir hari, sementara pembeli sekitar tidak tahu ada makanan murah (lihat `ideation.md`).

**Pendekatan.** Aplikasi Android (APK) dengan dua peran, Toko dan Pembeli. Toko mengunggah **Paket Kejutan** atau **Item Pilihan** menjelang tutup; Pembeli memesan, membayar (simulasi), dan mengambil dengan Kode Ambil. Prototipe ini untuk lomba (tenggat 30 November 2026), berjalan offline dengan data demo, didemokan dari HP tim.

## 2. Key Design Principles

1. **Satu alur demo yang tidak boleh gagal.** Toko unggah → Pembeli pesan → kode ambil → Toko verifikasi. Alur ini deterministik, offline, dan dapat diulang dengan "Reset demo".
2. **Jujur sebagai demo.** Data, pembayaran, dan estimasi dampak diberi label demo/estimasi; tidak ada klaim hukum atau bisnis yang belum terverifikasi.
3. **Satu model data, dua jenis listing.** Paket Kejutan dan Item Pilihan berbagi struktur yang sama agar cakupan kecil dan mudah dibangun.
4. **Aman-merek secara default.** Paket Kejutan tidak menampilkan harga coret maupun isi.
5. **Potong dari belakang.** Layar dampak SDG 12 dibangun terakhir dan menjadi yang pertama dipotong jika waktu mepet.

## 3. Technology Approach

*Akan diisi oleh `/tech-stack`.* Kendala masukan dari kickoff: APK Android; berjalan offline tanpa server; data tersimpan lokal; dibangun dengan vibe coding; selesai dalam ±9 hari; demo dari HP tim.

## 4. Correctness Properties

| # | Property | Validates |
|---|----------|-----------|
| CP-1 | For any listing, stok tersisa SHALL sama dengan stok awal dikurangi total jumlah pesanan aktif dan tidak pernah kurang dari 0. | REQ-2, REQ-5 |
| CP-2 | For any pesanan, total SHALL sama dengan harga satuan × jumlah. | REQ-5 |
| CP-3 | For any dua pesanan, Kode Ambil SHALL berbeda; for any Kode Ambil, ia SHALL dapat diverifikasi paling banyak satu kali. | REQ-5, REQ-6 |
| CP-4 | For any waktu di luar Jendela Jual, pemesanan listing tersebut SHALL ditolak. | REQ-7 |
| CP-5 | For any pesanan, status SHALL hanya berubah mengikuti: Dipesan → Diambil atau Dipesan → Hangus. | REQ-6, REQ-7 |
| CP-6 | For any listing berjenis Paket Kejutan, tampilan Pembeli SHALL tidak memuat harga asli/coret maupun daftar isi sebelum pengambilan. | REQ-4 |
| CP-7 | For any angka dampak, nilainya SHALL dihitung hanya dari pesanan berstatus Diambil. | REQ-9 |
| CP-8 | For any "Reset demo", data SHALL kembali identik dengan dataset awal. | REQ-1 |

## 5. Business Logic Flows

**Flow: Toko membuat listing**
Trigger: Toko menekan "Buat listing"
Preconditions: Peran = Toko
1. Pilih jenis: Paket Kejutan / Item Pilihan.
2. Isi jumlah, harga, Jendela Ambil (dan nama produk jika Item Pilihan).
3. Validasi (jumlah > 0, harga > 0, jendela valid).
   - Jika tidak valid: tampilkan pesan, tetap di formulir.
   - Jika valid: simpan listing.
Postconditions: Listing tampil pada daftar Pembeli.

**Flow: Pembeli memesan**
Trigger: Pembeli memilih listing
Preconditions: Listing aktif, stok > 0, dalam Jendela Jual
1. Lihat detail (aturan tampilan sesuai jenis listing).
2. Pilih jumlah n.
3. Periksa 1 ≤ n ≤ stok.
4. Tampilkan total; konfirmasi pembayaran simulasi.
5. Kurangi stok, buat Pesanan dengan Kode Ambil unik.
Postconditions: Pesanan berstatus Dipesan; Kode Ambil ditampilkan.

**Flow: Pengambilan**
Trigger: Toko memasukkan Kode Ambil
Preconditions: Pesanan berstatus Dipesan
1. Cari Kode Ambil.
   - Jika tidak ada atau sudah dipakai: tolak.
2. Ubah status menjadi Diambil.
Postconditions: Pesanan Diambil; dihitung pada dampak (jika REQ-9 dibangun).

**Flow: Pesanan hangus**
Trigger: Jendela Ambil berakhir
1. Pesanan berstatus Dipesan diubah menjadi Hangus.
Postconditions: Stok tidak dikembalikan (produk sudah dialokasikan).

**Flow: Reset demo**
Trigger: Pengguna menekan "Reset demo"
1. Hapus data sesi, muat ulang dataset awal.
Postconditions: Kondisi identik dengan awal.

## 6. Error Handling Strategy

**Filosofi:** jangan pernah membuat demo macet; setiap galat memberi pesan jelas dan jalan keluar.

| Error Type | System Response |
|------------|----------------|
| Input listing tidak valid | Pesan di formulir; tidak menyimpan |
| Jumlah pesanan melebihi stok | Tolak; tampilkan stok tersedia |
| Listing habis atau Jendela Jual berakhir | Tolak; tawarkan kembali ke daftar |
| Kode Ambil salah/sudah dipakai | Tolak; tampilkan alasan |
| Data lokal rusak | Tawarkan "Reset demo" |
| Galat tak terduga | Pesan umum + opsi kembali ke beranda; tidak menutup aplikasi |

## 7. Testing Strategy

- **Unit test** untuk aturan inti: stok (CP-1), total (CP-2), Kode Ambil (CP-3), jendela waktu (CP-4), transisi status (CP-5).
- **Property-based test** untuk CP-1 dan CP-2 (rentang jumlah dan harga acak) bila waktu memungkinkan.
- **Uji manual alur demo** pada HP tim: skrip 5 menit dari awal sampai akhir, diulang setelah "Reset demo" (CP-8).
- **Uji instal APK** di HP yang akan dipakai demo, termasuk mode pesawat untuk memastikan berjalan offline.
- **Latihan demo** minimal dua kali sebelum 30 November 2026.
