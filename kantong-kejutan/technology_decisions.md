# Technology Decisions: Kantong Kejutan Surabaya (nama kerja)

## Purpose

Mencatat keputusan teknologi untuk prototipe Android (APK) lomba beserta alasannya, agar `/plan-phase` dan pembangunan konsisten. Rujukan: `requirements.md`, `design.md`, `ideation.md`.

## Decision-Making Philosophy

- Pahami alasan di balik pilihan, bukan sekadar "praktik terbaik".
- Pilih yang paling mudah dibangun dengan bantuan AI (vibe coding) dan paling kecil risikonya untuk tenggat.
- Tradeoff dicatat jujur; setiap pilihan punya kelemahan.

## Confirmed Constraints (dari /kickoff)

- Tenggat: 30 November 2026 (±9 hari dari 21 November 2026).
- Tim membangun dengan vibe coding; tidak ada pengalaman pemrograman mendalam.
- Keluaran: APK Android; demo hanya dari HP tim.
- Berjalan offline sepenuhnya; semua data adalah data demo yang tersimpan di perangkat.
- Tanpa server, tanpa autentikasi nyata, tanpa pembayaran nyata, tanpa AI/LLM.
- Bahasa antarmuka: Bahasa Indonesia; fokus kota Surabaya.

## Categories Applicability

| Kategori | Status | Alasan |
|----------|--------|--------|
| 1. Backend Language & Framework | Dilewati | Tidak ada server (offline) |
| 2. Database | Berlaku (penyimpanan di perangkat) | Data demo disimpan lokal |
| 3. Frontend/Mobile Framework | Berlaku | Inti keputusan |
| 4. Local Development Environment | Berlaku | Menentukan alat build APK |
| 5. Hosting & Deployment | Dilewati (hanya cara membangun APK) | Tidak ada hosting |
| 6. File/Document Storage | Dilewati | Tidak ada unggahan berkas |
| 7. Email Service | Dilewati | Tidak ada email |
| 8. Authentication | Dilewati | Hanya pemilih peran demo |
| 9. AI Inference & Governance | Dilewati | Prototipe tidak memakai AI |
| 10. Testing Framework | Berlaku | Sesuai `design.md` bagian 7 |
| 11. UI/UX Foundations | Berlaku (ringan) | Konsistensi tampilan |

## Decision Log

### TD-1: Mobile framework: web app (HTML/CSS/JS) dibungkus Capacitor menjadi APK
- **Keputusan:** JavaScript biasa (tanpa framework, tanpa langkah build), ES modules, dibungkus Capacitor untuk Android.
- **Alasan:** Logika bisa diuji penuh di komputer tanpa Android SDK; satu folder `www/` = seluruh aplikasi; mudah diubah lewat vibe coding.
- **Tradeoff:** Tampilan berupa WebView (bukan komponen asli Android); build APK tetap butuh Android Studio/JDK di laptop tim.
- **Alternatif ditolak:** Flutter (SDK berat, tidak bisa diuji di lingkungan AI), Expo (butuh akun dan internet).

### TD-2: Database: localStorage (satu kunci JSON)
- **Keputusan:** Seluruh state demo disimpan sebagai satu objek JSON di `localStorage` kunci `kk_demo_v1`.
- **Alasan:** Offline, sinkron, tanpa dependensi; cukup untuk data demo kecil (REQ-8).
- **Tradeoff:** Tidak cocok untuk data besar atau banyak perangkat (di luar cakupan prototipe).
- **Data rusak:** jika JSON gagal dibaca, aplikasi menampilkan layar "Reset demo" (design.md bagian 6).

### TD-3: Lingkungan pengembangan dan build APK
- **Keputusan:** Node.js 20+ untuk tes; JDK 17+ dan Android Studio untuk build APK; perintah ada di `README_APK.md`.
- **Alasan:** Jalur resmi Capacitor; Android Studio memberi tombol "Run" langsung ke HP.

### TD-4: Testing: node:test bawaan Node (tanpa dependensi)
- **Keputusan:** Unit test dan uji properti sederhana memakai `node --test`, bukan vitest.
- **Alasan:** Nol instalasi; tetap menutup CP-1 sampai CP-8 (design.md bagian 7).
- **Tradeoff:** Fitur lebih sedikit daripada vitest; cukup untuk logika murni.

### TD-5: UI/UX: CSS tunggal, mobile-first, bahasa Indonesia
- **Keputusan:** Satu `style.css`, navigasi bawah, banner "MODE DEMO" di semua layar, semua teks dari input pengguna di-escape (anti-XSS).

### TD-6: Aturan waktu demo
- **Keputusan:** Jendela Jual = dari listing dibuat sampai Jendela Ambil berakhir. Ada tombol demo "Majukan jam 1 jam" (offset jam simulasi) agar status "Hangus" dapat didemokan tanpa menunggu. Offset ikut direset oleh "Reset demo".

### TD-7: Merchant demo memakai nama merek nyata (keputusan pengguna)
- **Keputusan:** Data demo berisi J.CO, Bon Ami, Holland, dan 3 hotel di Surabaya (Majapahit, JW Marriott, Shangri-La), masing-masing 1 Paket Kejutan dan 2 Item Pilihan.
- **Batasan:** hanya nama sebagai ilustrasi; tanpa logo; produk, harga, jarak adalah data demo; disclaimer tampil di aplikasi (beranda, detail) dan di `UJI_MANUAL.md`. Menggantikan non-goal "tanpa merek nyata" di requirements.md.
- **UI:** tampilan mengikuti mockup (hijau zaitun); foto diganti ilustrasi SVG di `www/js/art.js`; font sistem karena offline.
