# Uji manual di HP tim (design.md bagian 7)

## A. Uji instal dan offline
- [ ] APK terpasang di HP yang dipakai demo
- [ ] Aktifkan **mode pesawat**, buka aplikasi: semua layar tetap berfungsi
- [ ] Tutup paksa aplikasi lalu buka lagi: pesanan dan listing sebelumnya masih ada

## B. Skrip demo 5 menit (ulangi setelah Reset demo)
1. **Layar awal:** tunjukkan banner MODE DEMO. Pilih **Pembeli**.
2. **Daftar:** tunjukkan urutan jarak, harga, sisa stok, Jendela Ambil.
3. **Paket Kejutan (Roti Bahagia Darmo):** buka detail; tunjukkan tidak ada harga coret dan isi dirahasiakan. Isi jumlah 2, lihat total Rp30.000, lanjut, **Bayar (simulasi)**.
4. **Kode Ambil:** perlihatkan kode 6 karakter.
5. **Ganti peran > Toko > Roti Bahagia Darmo:** pesanan masuk berstatus Dipesan. Masukkan kode pembeli > **Verifikasi**: berhasil. Masukkan lagi: ditolak "sudah dipakai".
6. **Buat listing:** pilih Item Pilihan, isi nama, jumlah, harga, jam ambil > Simpan. Ganti ke Pembeli: listing baru tampil.
7. **Hangus:** pesan satu item lagi, tekan **Majukan jam 1 jam** beberapa kali sampai lewat Jendela Ambil, lihat status Hangus di Pesanan.
8. **Dampak:** tunjukkan angka dari pesanan Diambil saja dan label "estimasi".
9. **Reset demo:** data kembali ke awal.

## C. Latihan
- [ ] Latihan lengkap 2 kali sebelum 30 November 2026
- [ ] Siapkan HP cadangan dengan APK yang sama

## D. Sebelum presentasi
- [ ] Ganti parameter CO2 di `www/js/logic.js` (`IMPACT_PARAMS`) dengan angka dari sumber resmi yang dapat Anda sebutkan, atau jelaskan bahwa itu parameter demo
- [ ] Sampaikan jujur bahwa prototipe tidak memvalidasi kesediaan toko, hukum pangan, dan unit economics (lihat requirements.md, catatan validasi)

## E. Catatan merchant demo
- Merchant demo: J.CO Donuts & Coffee, Bon Ami Bakery, Holland Bakery, Hotel Majapahit Surabaya, JW Marriott Hotel Surabaya, Shangri-La Hotel Surabaya.
- Nama merek, produk, harga, dan jarak hanya ILUSTRASI demo. Belum ada kerja sama dan tidak ada logo asli yang dipakai; gambar produk adalah ilustrasi buatan kode.
- Saat presentasi, sebut jelas bahwa ini simulasi konsep, bukan kemitraan yang sudah berjalan.

## Uji manual tambahan (fitur baru)

1. **Back**: Beranda → Toko → Pesanan → Back berulang; harus mundur satu tab per tekan. Buka menu, tekan Back: menu tertutup, halaman sama.
2. **Profil**: ketuk avatar di Beranda → isi nama, Cek Lokasi (atau Titik Contoh), Simpan. Tab Inventori: tambah kode `SDG12`.
3. **Checkout**: pilih produk → Antar → catatan → voucher → coba tab Kartu (`4242 4242 4242 4242`, `12/30`, `123`), QRIS, Tunai.
4. **QR**: setelah pesan, QR muncul di halaman pesanan. Masuk sebagai Toko → Scan QR → arahkan ke HP lain (atau screenshot QR dengan "Pilih Foto QR").
5. **Penjual**: Buat Listing dengan foto; ikon kamera mengganti foto; ikon tempat sampah menghapus (ditolak bila masih ada pesanan Dipesan).


## Uji manual upgrade 2

1. **Izin**: pasang APK baru lalu pilih peran: sheet izin muncul (lokasi, kamera, notifikasi). Coba tolak satu, lalu cek menu **Izin Aplikasi**.
2. **Lokasi nyata**: aktifkan lokasi, buka Beranda: bar "Lokasi aktif: dekat ..." muncul. Berjalan/pindah tempat di Surabaya: jarak dan urutan "Terdekat" ikut berubah. Di detail toko ketuk **Lihat Rute**.
3. **Pesan lagi**: beli satu produk, kembali ke Beranda: bagian **Pesan Lagi** muncul. Coba juga tombol Pesan Lagi di Pesanan Saya.
4. **Produk favorit**: sebagai Toko (toko yang sama) buat listing dengan nama sama; ganti ke Pembeli: notifikasi "tersedia lagi".
5. **Jam ambil**: pesan (Ambil), lalu menu **Majukan jam**: notifikasi "Waktunya ambil", "Tinggal 30 menit", "Hangus".
6. **Pengantaran**: pilih Antar (isi alamat di Profil), sebagai Toko tekan **Siapkan** lalu **Mulai Antar**, ganti ke Pembeli: notifikasi dan pelacakan "Dalam pengantaran". Serah terima dengan Scan QR.
7. **Merchant**: Profil > Merchant: isi formulir, **Setujui (demo)**, lalu **Masuk sebagai Toko Ini**. Cek rincian biaya 8% di dashboard toko.
8. **Tambah produk**: di checkout, tambah produk dari toko yang sama; pesan lagi dari riwayat mengulang semuanya.


## Uji manual izin di HP (setelah `npm run android:setup` dan pasang ulang APK)

1. Pilih peran: sheet **Izinkan Akses** muncul. Ketuk **Izinkan Semua** dan setujui tiga dialog Android (lokasi, kamera, notifikasi).
2. Menu > **Izin Aplikasi**: ketiganya harus **Aktif**. Ketuk **Tes Notifikasi**: notifikasi harus muncul di bilah notifikasi HP.
3. Beranda: bar "Lokasi aktif: dekat ..." muncul dalam beberapa detik (di luar ruangan lebih cepat).
4. Masuk sebagai Toko > **Scan QR**: kamera harus terbuka.
5. Jika ada yang gagal: **Izin Aplikasi > Diagnosa Perangkat**, jalankan tes yang gagal, **Salin Laporan** atau tangkap layar.
