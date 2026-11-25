# Harmonize Report

Mode: **fix-testids + perubahan fitur yang diminta** (tidak ada `naming_conventions.md`, dipakai konvensi bawaan skill)
Proyek: HTML/CSS/JS murni (tanpa React), jadi aturan callback modal dan `useState` tidak berlaku langsung.

## Ringkasan

| Kategori | Sebelum | Sesudah | Risiko | Status |
|---|---|---|---|---|
| Elemen interaktif tanpa `data-testid` | 46 tag (button/input/select/textarea) + 43 `data-act`, **0** testid | **86** `data-testid` di template; diuji otomatis di 14 tampilan, 0 elemen tanpa testid | RENDAH | Selesai |
| Callback modal (`onClose`/`onSubmit`) | N/A (vanilla JS) | N/A | – | Tidak berlaku |
| Penamaan state error (`error`/`fieldErrors`) | state `flash` | tetap `flash` | RENDAH | WARNING, tidak diubah (hanya internal `app.js`, tidak diekspor; ganti nama tidak memberi manfaat uji) |
| Margin judul halaman (bug CSS) | `h2.tt` margin terhitung **0px** | margin 22px/21px sesuai desain | RENDAH | Selesai |

Format testid: `{komponen}-{jenis-elemen}[-{kualifier}]`, mis. `confirm-pay-btn`, `home-listing-row-L1`, `tdash-delete-btn-L3`, `bottom-nav-tab-orders`.

## Akar masalah padding/margin ("Buat Listing", "Dampak SDGs 12", "Pesanan Saya")

`.lh h2,h2.tt{margin:0}` (spesifisitas 0,1,1) mengalahkan `.tt{margin:2.2rem 2.1rem 1.2rem}` (0,1,0). Akibatnya semua judul `h2.tt` menempel ke tepi kiri dan rapat ke header. Aturan dipisah; judul dirapikan, subjudul Dampak memakai kelas `.sub-t` (sebelumnya margin `px` mentah di atribut `style`). Judul juga diseragamkan menjadi Title Case.

## Perubahan fitur

- **Pembayaran**: tab Kartu (validasi Luhn, masa berlaku, CVV; hanya 4 digit terakhir disimpan), QRIS (QR simulasi), Tunai (status "Bayar di tempat", otomatis "Lunas" saat diverifikasi).
- **Pengiriman**: Ambil di Toko atau Antar. Ongkir simulasi Rp4.000 + Rp2.000/km, dibulatkan per Rp500. Catatan untuk toko (maks 140 karakter). Alamat tersimpan dipakai otomatis.
- **Voucher**: input kode + pilihan dari Inventori; potongan nominal, persen (dengan batas), dan ongkir; minimal belanja; sekali pakai.
- **Profil pembeli** (ketuk avatar/nama): Pengaturan (nama, alamat, Cek Lokasi via GPS, atau Titik Contoh) dan Inventori voucher. Lokasi terverifikasi di Surabaya dipakai untuk menghitung jarak toko dan ongkir.
- **Tombol Back**: memakai riwayat browser; kembali ke tab sebelumnya, menutup menu/sheet/scanner lebih dulu. Dari halaman pesanan tidak kembali ke form bayar.
- **Tab Toko**: hanya dua kategori (Makanan, Paket Kejutan). Tombol "Lihat Semua" kini bergaya pill (sebelumnya `<button>` tanpa gaya).
- **Pencarian**: semua kata harus cocok di nama produk, toko, area/lokasi, kategori, harga, atau jarak. Ada di Beranda dan Toko.
- **QR Kode Ambil**: dibuat otomatis (`KK:` + kode) di halaman pesanan. Penjual: tombol Scan QR (kamera), Pilih Foto QR, atau Ketik Kode.
- **Penjual**: foto produk (dikecilkan ke maks 640 px) saat membuat listing atau diganti kapan saja; hapus listing.

## Keputusan yang perlu Anda ketahui

1. **Hapus listing ditolak jika masih ada pesanan berstatus Dipesan** (pembeli sudah bayar). Setelah diambil/hangus, listing bisa dihapus; riwayat pesanan dan angka dampak tetap ada.
2. **Scanner tidak bergantung `BarcodeDetector`** (tidak ada di WebView Android). Dipakai `BarcodeDetector` bila ada, selain itu pembaca QR buatan sendiri (`www/js/qrdecode.js`, tanpa internet). Hanya membaca QR buatan app ini (mode byte, koreksi galat M).
3. Koordinat toko, jarak, ongkir, kode voucher, dan nomor kartu uji adalah **data demo**.

## Belum diuji di perangkat nyata

Semua tes berjalan di Chromium desktop (kamera palsu, GPS palsu). Perlu dicoba di HP: tombol Back fisik (riwayat WebView), izin kamera dan lokasi, serta pemilih berkas foto. Lihat `README_APK.md`.

## Verifikasi

```bash
npm test            # 34 tes logika (termasuk QR encode/decode, voucher, kartu, hapus, foto)
npm run serve       # terminal lain
npm run test:ui     # 27 pemeriksaan alur lama
npm run test:fitur  # 43 pemeriksaan fitur baru (Back, checkout, profil, scan QR kamera, foto, hapus)
```


---

# Upgrade 2: izin, lokasi nyata, pesan lagi, notifikasi, pengantaran, merchant

| Kategori | Sebelum | Sesudah | Status |
|---|---|---|---|
| Elemen interaktif tanpa `data-testid` | 0 | 0 di 22 tampilan/overlay (diuji otomatis; sekarang termasuk Notifikasi, Izin, tab Merchant, scanner, sheet izin) | Selesai |
| Jumlah `data-testid` di `app.js` | 86 | 147 | Selesai |

## Yang dibangun

1. **Izin** (lokasi, kamera, notifikasi): sheet izin sekali setelah memilih peran + halaman Izin Aplikasi (status Aktif/Diblokir, Izinkan Semua, Tes Notifikasi). Tidak memaksa bila sudah diblokir.
2. **Lokasi nyata**: `watchPosition` terus memperbarui posisi, jarak, urutan "Terdekat", dan ongkir. Hotel Majapahit, JW Marriott, dan Shangri-La memakai alamat dan koordinat nyata; ada tautan Lihat Rute ke Google Maps. Posisi di luar Surabaya diberi tahu.
3. **Pesan lagi**: bagian "Pesan Lagi" di Beranda (produk yang pernah dibeli dan sedang tersedia) + tombol di Pesanan Saya yang mengulang seluruh isi pesanan, jumlah dibatasi stok.
4. **Notifikasi produk favorit**: saat toko membuat listing dengan produk yang pernah dibeli (toko + jenis + nama sama).
5. **Notifikasi jam ambil dan pengantaran**: waktunya ambil, 30 menit terakhir, hangus; toko: pesanan baru dan waktunya mengantar; pembeli: disiapkan, dalam pengantaran (ETA), kurir hampir tiba, kurir tiba, diterima. Pelacakan bertahap di halaman pesanan. Pesanan Antar baru bisa diverifikasi setelah Mulai Antar.
6. **Tab Merchant** (Profil): penjelasan biaya aplikasi 8%, formulir pengajuan, status, dan persetujuan simulasi yang membuat toko baru. Biaya 8% tampil di checkout (info), struk, dan dashboard toko (Total bayar, Biaya, Diterima).
7. **Tambah produk saat pesan**: hanya dari toko yang sama; satu pesanan, satu QR/kode.

## Asumsi yang saya ambil (mohon dikonfirmasi)

- **Biaya aplikasi 8% dihitung dari total pembayaran (produk + ongkir − voucher) dan ditanggung merchant**, tidak menambah total pembeli. Jika maksud Anda biaya ditambahkan ke pembeli, itu perubahan kecil di `priceBreakdown` (logic.js).
- "Produk yang biasanya dibeli" = pernah dibeli satu kali atau lebih (pesanan Hangus tidak dihitung).
- Persetujuan merchant disimulasikan dengan tombol demo (tidak ada admin sungguhan).
- Pengantaran adalah **simulasi estimasi** (kecepatan 20 km/jam + 5 menit), bukan posisi kurir langsung.
- Tiga toko roti (J.CO, Bon Ami, Holland) tetap "titik cabang demo" (diberi label), karena belum ada kerja sama dan lokasi cabang nyata tidak saya verifikasi.

## Batasan yang jujur

- Notifikasi antar-peran berjalan di satu perangkat (demo). Notifikasi saat aplikasi tertutup di Android memerlukan plugin lokal yang belum diuji di HP; antar-perangkat memerlukan server push.
- Dialog izin sistem diuji dengan simulasi; perilaku asli di HP perlu dicoba.

## Verifikasi

```bash
npm test             # 50 tes logika
npm run serve        # terminal lain
npm run test:ui      # 27 pemeriksaan alur lama
npm run test:fitur   # 46 pemeriksaan fitur upgrade 1
npm run test:upgrade # 38 pemeriksaan upgrade 2 (perlu Chromium headless baru)
```


---

# Perbaikan izin kamera, lokasi, notifikasi di HP

Laporan pengguna: ketiganya belum berfungsi di APK. Tanpa akses ke perangkat, saya menelusuri kode dan cara kerja Capacitor.

| Temuan | Tingkat keyakinan | Perbaikan |
|---|---|---|
| Plugin dipanggil lewat `Capacitor.Plugins.X`; tanpa bundler bisa `undefined`. WebView tidak punya `Notification` API → "tidak tersedia" | Tinggi (cacat nyata di kode saya) | `Capacitor.registerPlugin()` + `isPluginAvailable()`; kanal notifikasi Android; id int32 |
| Izin Android di `AndroidManifest.xml` hanya langkah manual | Tinggi (penyebab tersering) | `npm run android:setup` menambah izin otomatis (idempotent, diuji dengan parser XML) |
| Versi plugin bisa tidak cocok dengan `@capacitor/core` | Sedang | skrip memasang plugin dengan versi mayor yang sama |
| Kamera/lokasi butuh konteks aman | Sedang | `server.androidScheme: "https"` (appId/nama/webDir tidak berubah) |
| Galat ditelan diam-diam (`catch {}`) | Tinggi | Galat disimpan dan ditampilkan; petunjuk spesifik per kondisi; layar **Diagnosa Perangkat** |
| Alarm native tidak ikut "Majukan jam" | Tinggi (cacat desain) | Jadwal dibatalkan dan disusun ulang; yang jatuh tempo tampil segera |

Lokasi kini juga lewat plugin `@capacitor/geolocation` (dialog izin native) dengan jatuhan ke Web API; kamera meminta izin native lewat `@capacitor/camera` sebelum `getUserMedia`.

## Verifikasi

```bash
npm test             # 55 tes (logika 50 + penambal manifest 5)
npm run test:ui      # 27
npm run test:fitur   # 46
npm run test:upgrade # 38
npm run test:native  # 14: simulasi APK (tanpa Notification API, plugin palsu sesuai API resmi)
```

**Batas**: plugin palsu mengikuti dokumentasi API resmi, bukan perangkat nyata. Hal yang hanya bisa dipastikan di HP: dialog izin Android, notifikasi di bilah sistem, dan GPS/kamera sungguhan. Jika masih gagal, layar Diagnosa menunjukkan penyebabnya.
