# Phase 3: Dampak SDG 12 (P1) dan paket Android

## Summary

| # | Task | Requirements |
|---|------|-------------|
| 1 | Layar dampak | REQ-9 |
| 2 | Capacitor dan panduan APK | REQ-8.1, REQ-8.3 |
| 3 | Skrip uji manual | REQ-8.3 |

## Dependencies
- [ ] Phase 2 selesai

---

## Tasks

### Task 1: Layar dampak (dipotong lebih dulu jika waktu mepet)
**Files:** Modify `www/js/app.js`
**AC:**
- [ ] Kantong/porsi terjual dan rupiah hanya dari pesanan Diambil (REQ-9.1, 9.3)
- [ ] Estimasi CO2 berlabel "estimasi" dan menampilkan parameter serta catatan sumber (REQ-9.2)
- [ ] Fallback bila dipotong: hitung sederhana pada layar konfirmasi pengambilan

### Task 2: Capacitor
**Files:** Create `package.json`, `capacitor.config.json`, `README_APK.md`
**AC:**
- [ ] `webDir` = `www`; langkah build APK tertulis lengkap
- [ ] Aplikasi tidak memuat sumber daya dari internet (REQ-8.1)

### Task 3: Skrip uji manual
**Files:** Create `UJI_MANUAL.md`
**AC:**
- [ ] Skrip demo 5 menit, uji mode pesawat, ulang setelah Reset demo (design.md bagian 7)

---

## Tests

| Test | File | Verifies |
|------|------|---------|
| Dampak hanya dari Diambil | `test/logic.test.js` | CP-7 |
