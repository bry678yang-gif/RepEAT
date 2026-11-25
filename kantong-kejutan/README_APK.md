# Membuat APK RepEAT (Android)

Seluruh aplikasi ada di folder `www/` (HTML/CSS/JS biasa, tanpa internet). Capacitor membungkusnya menjadi aplikasi Android.

## Yang perlu dipasang (sekali, di laptop)
1. **Node.js** versi LTS terbaru (nodejs.org)
2. **JDK 17 atau lebih baru** (Android Studio sudah menyertakannya)
3. **Android Studio** (developer.android.com/studio), lalu buka sekali dan biarkan ia mengunduh Android SDK

## Langkah (butuh internet hanya saat ini)
Buka terminal di folder proyek ini, lalu:

```bash
npm install @capacitor/core @capacitor/android @capacitor/local-notifications
npm install -D @capacitor/cli
npx cap add android
npx cap sync android
npx cap open android
```

Android Studio akan terbuka. Tunggu "Gradle sync" selesai (pertama kali bisa beberapa menit).

### Opsi A: langsung ke HP (paling mudah)
1. Di HP: Pengaturan > Tentang ponsel > ketuk **Nomor build** 7 kali > aktifkan **Opsi pengembang > Debugging USB**.
2. Colok HP ke laptop dengan kabel, izinkan debugging.
3. Di Android Studio pilih HP Anda di bagian atas, tekan tombol **Run** (segitiga hijau). Aplikasi terpasang dan terbuka.

### Opsi B: berkas APK untuk dikirim ke HP tim
1. Menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. Setelah selesai, klik **locate**. Berkas ada di `android/app/build/outputs/apk/debug/app-debug.apk`.
3. Kirim ke HP (kabel, Drive, atau WhatsApp sebagai dokumen), buka, izinkan "pasang dari sumber ini".

APK debug cukup untuk demo lomba. Tidak perlu akun Google Play.

## Setelah mengubah kode di `www/`
```bash
npx cap sync android
```
lalu Run lagi di Android Studio.

## Mencoba di komputer dulu (tanpa Android)
```bash
npm run serve        # buka http://localhost:8080 di Chrome
npm test             # tes logika (CP-1 sampai CP-8)
```
Jangan membuka `www/index.html` dengan klik dua kali (file://); modul JavaScript butuh server lokal seperti di atas.

## Masalah umum
- **Gradle/JDK galat:** di Android Studio buka Settings > Build Tools > Gradle, pilih Gradle JDK versi 17+.
- **HP tidak terdeteksi:** ganti kabel (harus kabel data), pastikan Debugging USB aktif dan izinkan pop-up di HP.
- **Layar putih di HP:** jalankan `npx cap sync android` lagi, lalu Run ulang.

## Kamera, lokasi, dan notifikasi di HP (WAJIB dibaca)

Fitur ini butuh tiga hal di sisi Android yang **tidak otomatis ada** di proyek Capacitor baru. Semuanya disiapkan satu perintah:

```bash
npm run android:setup
```

Perintah itu: (1) memasang `@capacitor/geolocation`, `@capacitor/camera`, `@capacitor/local-notifications` dengan versi mayor yang **sama** dengan `@capacitor/core` Anda (versi tidak cocok membuat `cap sync` gagal), (2) membuat folder `android/` bila belum ada, (3) menambahkan izin `CAMERA`, `ACCESS_FINE/COARSE_LOCATION`, `POST_NOTIFICATIONS`, dll. ke `AndroidManifest.xml` dan `server.androidScheme: "https"` ke `capacitor.config.json` (kamera dan lokasi butuh konteks aman), (4) menjalankan `npx cap sync android`. Aman dijalankan berulang. Tanpa internet: `npm run android:setup -- --patch-only` (hanya langkah 3).

Setelah itu **build ulang APK dan pasang ulang** di HP. Jika izin sebelumnya sudah pernah ditolak, hapus aplikasi lama (atau reset izin di Pengaturan HP > Aplikasi > RepEAT > Izin).

### Kenapa sebelumnya gagal (kemungkinan penyebab)

- **Notifikasi**: WebView Android tidak punya `Notification` API, dan plugin hanya bisa dipakai tanpa bundler lewat `Capacitor.registerPlugin(...)`. Kode versi lama memakai `Capacitor.Plugins.LocalNotifications` (bisa `undefined`) sehingga tampil "tidak tersedia". Sudah diperbaiki; plugin juga harus terpasang (langkah 1 di atas).
- **Lokasi dan kamera**: tanpa izin di `AndroidManifest.xml`, Android menolak diam-diam tanpa dialog. Sekarang diisi otomatis, dan aplikasi memakai plugin resmi (dialog izin native) bila ada.
- **Layanan lokasi HP** harus aktif, dan GPS butuh tempat terbuka.

### Jika masih bermasalah: layar Diagnosa

Buka menu **Izin Aplikasi > Diagnosa Perangkat**. Layar ini menampilkan platform, apakah ketiga plugin ada di APK, status izin, dan **pesan galat asli** dari tiap fitur, plus tombol Tes Lokasi / Tes Kamera / Tes Notifikasi dan Salin Laporan. Kirim tangkapan layarnya agar penyebab bisa dipastikan.

### Catatan

- Alarm notifikasi memakai jadwal tidak-eksak (tanpa izin `SCHEDULE_EXACT_ALARM`, yang memerlukan persetujuan khusus Android 14), jadi bisa tertunda beberapa menit saat HP hemat daya.
- Notifikasi antar-peran berjalan di satu perangkat (demo). Mengirim antar HP butuh server push (FCM).
- **Belum diuji di HP.** Logika aplikasi diuji terhadap plugin palsu yang mengikuti API resmi (`npm run test:native`), dan penambal manifest diuji pada manifest bawaan Capacitor. Perilaku asli di perangkat perlu dicoba.
