# Implementation Plan: Kantong Kejutan Surabaya (prototipe Android)

Tenggat 30 November 2026. Tumpukan teknologi: lihat `technology_decisions.md`. P1 (REQ-9) dibangun terakhir dan dipotong lebih dulu.

## Phase 1: Inti logika, data demo, penyimpanan
1. Aturan bisnis murni (`www/js/logic.js`): validasi listing, buat listing, stok, pesanan, kode ambil, verifikasi, hangus, dampak
2. Data demo dan Reset demo (`seedState`)
3. Lapisan penyimpanan lokal dengan penanganan data rusak (`www/js/store.js`)
4. Unit test CP-1 sampai CP-8 (`test/logic.test.js`)

Requirements: REQ-1 (data), REQ-2.4, REQ-5, REQ-6, REQ-7, REQ-8.2

## Phase 2: Layar Pembeli dan Toko
1. Kerangka aplikasi, pilihan peran, banner demo, navigasi, penanganan galat (`index.html`, `style.css`, `app.js`)
2. Layar Pembeli: daftar, detail, konfirmasi bayar simulasi, kode ambil, pesanan saya
3. Layar Toko: dashboard pesanan, buat listing, verifikasi kode ambil
4. Alat demo: Reset demo, Majukan jam

Requirements: REQ-1, REQ-2, REQ-3, REQ-4, REQ-5, REQ-6, REQ-7

## Phase 3: Dampak SDG 12 (P1) dan paket Android
1. Layar dampak dari pesanan "Diambil" (REQ-9)
2. Konfigurasi Capacitor dan panduan build APK (`capacitor.config.json`, `README_APK.md`)
3. Skrip uji manual 5 menit dan daftar periksa instal APK

Requirements: REQ-9, REQ-8.1, REQ-8.3
