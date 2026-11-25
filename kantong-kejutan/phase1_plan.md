# Phase 1: Inti logika, data demo, penyimpanan

## Summary

| # | Task | Requirements |
|---|------|-------------|
| 1 | Unit test CP-1 sampai CP-8 (ditulis lebih dulu) | REQ-2, REQ-5, REQ-6, REQ-7 |
| 2 | Aturan bisnis murni | REQ-2.4, REQ-5, REQ-6, REQ-7 |
| 3 | Data demo dan Reset | REQ-1.2, REQ-1.3 |
| 4 | Penyimpanan lokal | REQ-8.2 |

## Dependencies
*None.*

---

## Tasks

### Task 1: Tes lebih dulu
**What:** Tulis tes yang menyandikan CP-1 sampai CP-8 sebelum implementasi.
**Files:**
- Create: `test/logic.test.js`
**AC:**
- [ ] Tes gagal sebelum `logic.js` ada
- [ ] Mencakup validasi listing (REQ-2.4), stok (CP-1), total (CP-2), kode unik dan sekali pakai (CP-3), jendela jual (CP-4), transisi status (CP-5), tampilan Paket Kejutan (CP-6), dampak (CP-7), reset (CP-8)

### Task 2: Aturan bisnis murni
**What:** Fungsi tanpa efek samping ke DOM, menerima `now` sebagai parameter.
**Files:**
- Create: `www/js/logic.js`
**AC:**
- [ ] Listing dengan jumlah ≤ 0, harga ≤ 0, atau jendela akhir ≤ mulai ditolak (REQ-2.4)
- [ ] 1 ≤ n ≤ stok, total = harga × n, stok berkurang n (REQ-5.1 sampai 5.3)
- [ ] Pemesanan di luar Jendela Jual ditolak (REQ-7.1)
- [ ] Kode Ambil unik dan hanya bisa diverifikasi sekali (REQ-6.1, 6.2)
- [ ] Pesanan Dipesan menjadi Hangus setelah Jendela Ambil berakhir; stok tidak dikembalikan (REQ-7.2)
- [ ] Angka dampak hanya dari pesanan Diambil (REQ-9.3)

### Task 3: Data demo dan Reset
**What:** `seedState(now)` membuat toko fiktif Surabaya dan listing awal; reset mengembalikan data identik.
**Files:**
- Modify: `www/js/logic.js`
**AC:**
- [ ] Minimal 4 toko fiktif tanpa nama merek nyata (REQ-1.2, non-goal merek)
- [ ] `seedState(now)` dua kali dengan `now` sama menghasilkan objek identik (CP-8)

### Task 4: Penyimpanan lokal
**What:** Muat, simpan, reset `localStorage`; data rusak tidak membuat aplikasi macet.
**Files:**
- Create: `www/js/store.js`
**AC:**
- [ ] JSON rusak atau bentuk tidak valid menghasilkan status `corrupt` (design.md bagian 6)
- [ ] Gagal menulis (penyimpanan penuh/dimatikan) tidak melempar galat ke layar

---

## Tests

| Test | File | Verifies |
|------|------|---------|
| CP-1 sampai CP-8, validasi, urutan daftar | `test/logic.test.js` | Seluruh aturan inti |
