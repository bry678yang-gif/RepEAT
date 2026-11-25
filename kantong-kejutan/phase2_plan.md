# Phase 2: Layar Pembeli dan Toko

## Summary

| # | Task | Requirements |
|---|------|-------------|
| 1 | Kerangka, peran, banner demo, navigasi, galat | REQ-1.1, REQ-1.4 |
| 2 | Layar Pembeli | REQ-3, REQ-4, REQ-5 |
| 3 | Layar Toko | REQ-2, REQ-6 |
| 4 | Alat demo | REQ-1.3, REQ-7.2 |

## Dependencies
- [ ] Phase 1 selesai (`npm test` hijau)

---

## Tasks

### Task 1: Kerangka
**Files:** Create `www/index.html`, `www/css/style.css`, `www/js/app.js`
**AC:**
- [ ] Layar awal memilih Toko/Pembeli tanpa login (REQ-1.1)
- [ ] Banner demo tampil di semua layar (REQ-1.4, REQ-5.5)
- [ ] Galat tak terduga menampilkan pesan dan tombol kembali, aplikasi tidak menutup

### Task 2: Layar Pembeli
**AC:**
- [ ] Daftar: toko, jarak, harga, sisa stok, Jendela Ambil, urut jarak, stok 0 dan jendela berakhir disembunyikan (REQ-3)
- [ ] Paket Kejutan tanpa harga coret dan tanpa isi; Item Pilihan menampilkan nama dan harga; keterangan sisa hari yang sama (REQ-4)
- [ ] Total tampil sebelum konfirmasi; pesan > stok ditolak dengan stok tersedia (REQ-5)
- [ ] Layar pesanan menampilkan toko, Jendela Ambil, Kode Ambil

### Task 3: Layar Toko
**AC:**
- [ ] Formulir listing sesuai jenis; input tidak valid menampilkan pesan dan tidak menyimpan (REQ-2)
- [ ] Listing baru langsung tampil pada Pembeli (REQ-2.5)
- [ ] Verifikasi kode: valid menjadi Diambil; salah/sudah dipakai ditolak dengan alasan (REQ-6)
- [ ] Dashboard menampilkan pesanan masuk dan statusnya (REQ-6.3)

### Task 4: Alat demo
**AC:**
- [ ] Reset demo (dengan konfirmasi) mengembalikan data awal
- [ ] "Majukan jam 1 jam" membuat pesanan lewat Jendela Ambil menjadi Hangus (REQ-7.2)
- [ ] Ketentuan produk hari yang sama tampil (REQ-7.3)

---

## Tests

| Test | File | Verifies |
|------|------|---------|
| Smoke UI alur utama di browser | `test/ui-smoke.mjs` | Toko buat, Pembeli pesan, Toko verifikasi, Hangus, Reset |
