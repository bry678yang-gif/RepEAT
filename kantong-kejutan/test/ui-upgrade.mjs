// Uji upgrade 2: izin, lokasi nyata, pesan lagi, notifikasi (favorit/jam ambil/pengantaran), merchant & biaya 8%, tambah produk.
// Jalankan: npm run serve (terminal lain), lalu node test/ui-upgrade.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const BASE = process.env.BASE || 'http://localhost:8080/';
const TUNJUNGAN = { latitude: -7.2597, longitude: 112.7401, accuracy: 15 };
const browser = await chromium.launch({ channel: 'chromium' }); // headless baru: Notification API & izin berperilaku seperti Chrome sungguhan
const errors = [];
let step = 0; const ok = m => console.log(`ok ${++step} - ${m}`);
const tid = id => `[data-testid="${id}"]`;

async function open(perms, geo, init) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: geo, permissions: perms });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload();
  const H = {
    ctx, page, text: () => page.locator('#app').innerText(), click: s => page.locator(s).first().click(),
    menu: async id => { await H.click(tid('header-menu-btn')); await H.click(tid(id)); },
    coverage: async label => { const miss = await page.evaluate(() => [...document.querySelectorAll('#app button,#app input,#app select,#app textarea,#app a[href],#app [data-act]')].filter(e => !e.dataset.testid).map(e => e.outerHTML.slice(0, 90))); assert.deepEqual(miss, [], `${label}: elemen interaktif tanpa data-testid`); },
    role: async (r, store) => { if (store) await page.selectOption(tid('role-store-select'), store); await H.click(tid(r === 'toko' ? 'role-seller-btn' : 'role-buyer-btn')); await page.waitForSelector('#app .top'); },
    switchTo: async (r, store) => { await H.menu('menu-roles-btn'); await H.role(r, store); },
    shift: async min => { await page.evaluate(m => { const s = JSON.parse(localStorage.getItem('kk_demo_v1')); s.meta.offsetMs += m * 60000; localStorage.setItem('kk_demo_v1', JSON.stringify(s)); }, min); await page.reload(); await page.waitForSelector('#app .top'); await page.waitForTimeout(150); },
    card: async () => { await page.fill('#c_nomor', '4242424242424242'); await page.fill('#c_exp', '1230'); await page.fill('#c_cvv', '123'); },
    badge: async () => { const b = page.locator(tid('header-notifications-badge')); return (await b.count()) ? Number((await b.innerText()).replace('+', '')) : 0; },
    inbox: async () => { await H.click(tid('header-notifications-btn')); await page.waitForSelector('h2.tt'); return H.text(); },
  };
  return H;
}

// ================= 1. IZIN (lokasi, kamera, notifikasi) =================
{ // HP baru: semua izin "belum ditanya" -> sheet muncul, "Izinkan Semua" memanggil dialog sistem untuk ketiganya
  const mock = () => {
    const perm = { geolocation: 'prompt', camera: 'prompt', notifications: 'default' }; window.__perm = perm;
    const fix = { coords: { latitude: -7.2597, longitude: 112.7401, accuracy: 15 }, timestamp: Date.now() };
    navigator.permissions.query = async ({ name }) => ({ state: name === 'geolocation' ? perm.geolocation : name === 'camera' ? perm.camera : 'prompt' });
    navigator.geolocation.getCurrentPosition = (okf) => { perm.geolocation = 'granted'; setTimeout(() => okf(fix), 10); };
    navigator.geolocation.watchPosition = (okf) => { setTimeout(() => { if (perm.geolocation === 'granted') okf(fix); }, 30); return 1; };
    navigator.geolocation.clearWatch = () => {};
    navigator.mediaDevices.getUserMedia = async () => { perm.camera = 'granted'; return { getTracks: () => [{ stop() {} }] }; };
    class N { static get permission() { return perm.notifications; } static async requestPermission() { perm.notifications = 'granted'; return 'granted'; } }
    Object.defineProperty(window, 'Notification', { value: N, configurable: true });
  };
  const A = await open([], { latitude: 0, longitude: 0 }, mock);
  await A.click(tid('role-buyer-btn')); await A.page.waitForSelector(tid('permission-sheet-overlay'));
  assert.equal(await A.page.locator('.perm[data-state=prompt]').count(), 3); await A.coverage('permission-sheet');
  await A.click(tid('permission-sheet-allow-all-btn'));
  await A.page.waitForFunction(() => window.__perm.geolocation === 'granted' && window.__perm.camera === 'granted' && window.__perm.notifications === 'granted');
  await A.page.waitForSelector(tid('permission-sheet-overlay'), { state: 'detached' });
  ok('HP baru: sheet izin muncul sekali; "Izinkan Semua" meminta lokasi, kamera, dan notifikasi');
  await A.menu('menu-permissions-btn'); assert.equal(await A.page.locator('.perm[data-state=granted]').count(), 3); await A.coverage('izin'); ok('menu Izin Aplikasi menampilkan ketiganya Aktif');
  await A.page.reload(); await A.page.waitForSelector('#app .top'); assert.equal(await A.page.locator(tid('permission-sheet-overlay')).count(), 0); ok('sheet izin tidak muncul lagi setelah ditanya');
  await A.click(tid('bottom-nav-tab-home')).catch(() => {}); await A.ctx.close();
}
{ // izin diblokir
  const denied = () => {
    navigator.permissions.query = async () => ({ state: 'denied' });
    navigator.geolocation.getCurrentPosition = (_ok, no) => no({ code: 1 }); navigator.geolocation.watchPosition = (_ok, no) => { no && no({ code: 1 }); return 1; };
    Object.defineProperty(window, 'Notification', { value: class { static get permission() { return 'denied'; } static async requestPermission() { return 'denied'; } }, configurable: true });
  };
  const B = await open([], { latitude: -7.2597, longitude: 112.7401 }, denied);
  await B.click(tid('role-buyer-btn')); await B.page.waitForSelector('#app .top'); await B.page.waitForTimeout(400);
  assert.equal(await B.page.locator(tid('permission-sheet-overlay')).count(), 0); assert.match(await B.text(), /Izin lokasi diblokir/);
  await B.click(tid('home-location-help-btn')); assert.equal(await B.page.locator('.perm[data-state=denied]').count(), 3); assert.match(await B.text(), /Diblokir/); ok('izin diblokir: tidak mengganggu, status jelas + petunjuk mengaktifkan di Pengaturan');
  await B.ctx.close();
}

// ================= 2. LOKASI NYATA =================
const P = await open(['geolocation', 'camera', 'notifications'], { latitude: -7.259678, longitude: 112.734729, accuracy: 10 });
const { page, text, click, menu, coverage, role, switchTo, shift, card, badge, inbox } = P;
await click(tid('role-buyer-btn')); await page.waitForSelector(tid('home-location-bar'));
await page.waitForFunction(() => /dekat Embong Malang/.test(document.querySelector('[data-testid=home-location-bar]').innerText)); 
assert.match(await page.locator('.row').first().innerText(), /JW Marriott/); assert.match(await page.locator('.row').first().innerText(), /0,1 km/); ok('lokasi asli: terdeteksi dekat Embong Malang, JW Marriott jadi terdekat (0,1 km)');
await P.ctx.setGeolocation({ latitude: -7.289968, longitude: 112.7163, accuracy: 10 });
await page.waitForFunction(() => /Shangri-La/.test(document.querySelector('.row').innerText)); assert.match(await page.locator(tid('home-location-bar')).innerText(), /Sungkono/); ok('lokasi bergerak: daftar dan jarak ikut berubah otomatis (Shangri-La jadi terdekat)');
await page.locator('.row', { hasText: 'Shangri-La' }).first().click(); assert.match(await text(), /Jl\. Mayjend Sungkono No\. 120/);
assert.match(await page.locator(tid('detail-route-link')).getAttribute('href'), /destination=-7\.289968,112\.7163/); ok('detail toko: alamat asli + tautan rute Google Maps ke koordinat toko');
await page.goBack();
await P.ctx.setGeolocation({ latitude: -6.2, longitude: 106.8, accuracy: 10 });
await page.waitForFunction(() => /di luar Surabaya/.test(document.querySelector('[data-testid=home-location-bar]').innerText)); ok('posisi di luar Surabaya: pengguna diberi tahu, jarak kembali ke data contoh');
await P.ctx.setGeolocation(TUNJUNGAN); await page.waitForFunction(() => /dekat Tunjungan/.test(document.querySelector('[data-testid=home-location-bar]').innerText), null, { timeout: 15000 });
await page.reload(); await page.waitForSelector(tid('home-location-bar')); assert.match(await page.locator(tid('home-location-bar')).innerText(), /Tunjungan/); ok('lokasi terakhir tersimpan setelah muat ulang');
await coverage('home');

// ================= 3. TAMBAH PRODUK DARI TOKO YANG SAMA + PESAN LAGI =================
const row = name => page.locator('.row', { hasText: name }).first();
await row('Croissant Mentega').click(); await click(tid('detail-order-btn')); await coverage('confirm');
const extras = await page.locator(tid('confirm-extra-list')).innerText();
assert.match(extras, /Paket Kejutan/); assert.match(extras, /Potongan Cheesecake/); assert.doesNotMatch(extras, /Donat|Roti|Danish|Muffin|Red Velvet|Cookies/); ok('"Tambah Produk" hanya menampilkan produk dari toko yang sama (Hotel Majapahit)');
const before = await page.locator('.card').last().innerText();
await click(tid('confirm-extra-add-btn-L12')); await click(tid('confirm-extra-add-btn-L12')); await click(tid('confirm-extra-add-btn-L10'));
assert.match(await page.locator(tid('confirm-items')).innerText(), /Potongan Cheesecake × 2/); assert.match(await page.locator('.card').last().innerText(), /Subtotal \(4 item\)[\s\S]*Rp130\.000/); ok('subtotal ikut berubah: 1 Croissant + 2 Cheesecake + 1 Paket Kejutan = Rp130.000');
await click(tid('confirm-extra-remove-btn-L10')); assert.match(await page.locator('.card').last().innerText(), /Rp85\.000/);
await click(tid('confirm-payment-tab-tunai')); await click(tid('confirm-pay-btn'));
assert.match(await text(), /Pesanan Berhasil/); assert.match(await text(), /Croissant Mentega \+1 produk lain/); assert.match(await text(), /Cheesecake ×2/); assert.equal(await page.locator('[data-testid=order-qr] svg').count(), 1); ok('satu pesanan, satu QR/kode untuk semua produk; rincian menampilkan tiap produk');
assert.match(await text(), /Biaya aplikasi 8%/); await coverage('order'); ok('struk pembeli menjelaskan biaya aplikasi 8% tidak menambah total');
await click(tid('bottom-nav-tab-home')); await page.waitForSelector(tid('home-reorder-list'));
assert.match(await page.locator(tid('home-reorder-list')).innerText(), /Croissant Mentega[\s\S]*Sudah 1× kamu beli/); ok('rekomendasi "Pesan Lagi" muncul di beranda setelah pernah membeli');
await click(tid('home-reorder-btn-L11')); assert.match(await text(), /Croissant Mentega × 1/); ok('Pesan Lagi dari beranda membuka checkout dengan jumlah terakhir');
await page.goBack(); await click(tid('bottom-nav-tab-orders')); await click(tid('orders-reorder-btn-O1'));
assert.match(await page.locator(tid('confirm-items')).innerText(), /Croissant Mentega × 1/); assert.match(await page.locator(tid('confirm-items')).innerText(), /Potongan Cheesecake × 1/); ok('Pesan Lagi dari riwayat mengulang seluruh isi pesanan; jumlah dibatasi stok tersisa (Cheesecake 2 → 1)');
await page.goBack(); await page.goBack();

// ================= 4. NOTIFIKASI PRODUK FAVORIT =================
await switchTo('toko', 's4'); await click(tid('bottom-nav-tab-tcreate'));
await click(tid('tcreate-type-chip-item')); await page.fill('#f_nama', 'Roti Lain'); await page.fill('#f_jumlah', '2'); await page.fill('#f_harga', '7000'); await click(tid('tcreate-save-btn'));
await click(tid('bottom-nav-tab-tcreate')); await click(tid('tcreate-type-chip-item')); await page.fill('#f_nama', 'croissant MENTEGA'); await page.fill('#f_jumlah', '3'); await page.fill('#f_harga', '24000'); await click(tid('tcreate-save-btn'));
await switchTo('pembeli');
await page.waitForFunction(() => { const n = document.getElementById('nbar'); return !n.hidden && /Croissant Mentega tersedia lagi/i.test(n.innerText); }); ok('produk yang biasa dibeli muncul lagi → banner notifikasi langsung tampil');
const fav = await inbox(); assert.match(fav, /croissant MENTEGA tersedia lagi|Croissant.*tersedia lagi/i); assert.doesNotMatch(fav, /Roti Lain tersedia/); ok('hanya produk yang pernah dibeli yang memicu notifikasi (Roti Lain tidak)');
await coverage('notifs');
const shown = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map(n => n.title)); assert.ok(shown.some(t => /tersedia lagi/i.test(t)), 'notifikasi sistem: ' + shown.join(',')); ok('notifikasi sistem (OS) benar-benar ditampilkan lewat service worker saat izin diberikan');
assert.ok(await badge() >= 1); await click('[data-testid^="notifications-item-"]'); assert.match(await text(), /Listing|Croissant/); assert.match(await page.url(), /localhost/); ok('ketuk notifikasi membuka detail produk');
await page.goBack(); await click(tid('notifications-read-all-btn')); assert.equal(await badge(), 0); ok('Tandai Dibaca menghapus badge');
await click(tid('notifications-toggle-favorit')); assert.equal(await page.locator(tid('notifications-toggle-favorit')).getAttribute('aria-checked'), 'false'); await click(tid('notifications-toggle-favorit')); ok('pengaturan notifikasi bisa dimatikan/dihidupkan per jenis');

// ================= 5. NOTIFIKASI JAM PENGAMBILAN =================
await click(tid('notifications-clear-btn')); assert.match(await text(), /Belum ada notifikasi/);
await click(tid('bottom-nav-tab-home')); await row('Potongan Cheesecake').click(); await click(tid('detail-order-btn')); await click(tid('confirm-payment-tab-tunai')); await click(tid('confirm-pay-btn'));
const oid = (await page.evaluate(() => JSON.parse(localStorage.getItem('kk_demo_v1')).orders.at(-1).id));
await shift(31); let t = await inbox(); assert.match(t, /Waktunya ambil pesanan/); assert.match(t, /sampai \d\d:\d\d/); ok('jam ambil tiba (+31 mnt) → notifikasi "Waktunya ambil pesanan" dengan batas jam & kode');
await shift(185); t = await inbox(); assert.match(t, /Tinggal 30 menit lagi/); ok('30 menit sebelum batas → pengingat terakhir');
await shift(30); t = await inbox(); assert.match(t, /Pesanan hangus/); assert.doesNotMatch(t.split('Pesanan hangus')[0] + '', /^$/); ok('lewat batas tanpa diambil → notifikasi Pesanan hangus');
// pesanan yang sudah diambil tidak menerima pengingat basi
await click(tid('notifications-clear-btn'));
await click(tid('bottom-nav-tab-home')); await page.waitForSelector(tid('home-reorder-list')).catch(() => {});

// ================= 6. PENGANTARAN + NOTIFIKASI =================
await P.ctx.setGeolocation(TUNJUNGAN);
await click(tid('home-profile-btn')); await page.fill('#p_alamat', 'Jl. Tunjungan No. 12, Genteng, Surabaya'); await click(tid('profile-save-btn'));
await click(tid('header-back-btn')); await click(tid('bottom-nav-tab-home'));
// jendela listing sudah berakhir karena waktu digeser; buat listing baru lewat toko
await switchTo('toko', 's4'); await click(tid('bottom-nav-tab-tcreate')); await click(tid('tcreate-type-chip-item')); await page.fill('#f_nama', 'Eclair Antar'); await page.fill('#f_jumlah', '3'); await page.fill('#f_harga', '20000');
const times = await page.evaluate(() => { const p = n => String(n).padStart(2, '0'); const s = JSON.parse(localStorage.getItem('kk_demo_v1')), now = Date.now() + s.meta.offsetMs, a = new Date(now + 20 * 60000), b = new Date(now + 3 * 3600000); return [`${p(a.getHours())}:${p(a.getMinutes())}`, `${p(b.getHours())}:${p(b.getMinutes())}`]; });
await page.fill('#f_start', times[0]); await page.fill('#f_end', times[1]); await click(tid('tcreate-save-btn'));
await switchTo('pembeli'); await row('Eclair Antar').click(); await click(tid('detail-order-btn')); await click(tid('confirm-delivery-tab-antar'));
assert.match(await text(), /Estimasi tiba ±\d+ menit/); await click(tid('confirm-payment-tab-tunai')); await click(tid('confirm-pay-btn'));
const did = (await page.evaluate(() => JSON.parse(localStorage.getItem('kk_demo_v1')).orders.at(-1))); assert.equal(did.metode, 'antar'); assert.equal(did.kirim.tahap, 'menunggu');
assert.match(await page.locator(tid('order-tracking')).innerText(), /Menunggu toko menyiapkan/); ok('pesanan Antar: pelacakan dimulai dari "Menunggu toko menyiapkan"');
await shift(21);
await switchTo('toko', 's4'); const inboxS = await inbox(); assert.match(inboxS, /Pesanan baru/); assert.match(inboxS, /Waktunya mengantar/); ok('toko menerima notifikasi: pesanan baru dan waktunya mengantar');
await page.goBack(); await page.waitForSelector(tid('tdash-prepare-btn')); await coverage('tdash'); await click(tid('tdash-prepare-btn')); await click(tid('tdash-deliver-btn'));
assert.match(await page.locator(tid('tdash-delivery-status')).innerText(), /tiba sekitar \d\d:\d\d/);
await switchTo('pembeli'); const nb = await inbox(); assert.match(nb, /Pesananmu sedang disiapkan/); assert.match(nb, /Pesananmu dalam pengantaran/); assert.match(nb, /Perkiraan tiba \d\d:\d\d \(±6 menit\)/); ok('pembeli menerima: "sedang disiapkan" dan "dalam pengantaran" lengkap dengan ETA');
await click('[data-testid^="notifications-item-"]'); await page.waitForSelector(tid('order-tracking')); assert.match(await page.locator(tid('order-tracking')).innerText(), /Dalam pengantaran[\s\S]*Berangkat \d\d:\d\d/); assert.match(await text(), /Dalam Pengantaran/); ok('halaman pesanan: pelacakan berstatus Dalam pengantaran + ETA');
await shift(4.1); t = await inbox(); assert.match(t, /Kurir hampir tiba/); await shift(2.5); t = await inbox(); assert.match(t, /Kurir sudah tiba/); ok('notifikasi "Kurir hampir tiba" dan "Kurir sudah tiba" muncul sesuai ETA');
await page.goBack(); const code = (await page.evaluate(() => JSON.parse(localStorage.getItem('kk_demo_v1')).orders.at(-1).code));
await switchTo('toko', 's4'); await click(tid('tdash-verify-btn')); await page.fill('#kode', code); await click(tid('verify-sheet-submit-btn')); await page.waitForFunction(() => /Terima tunai/.test(document.getElementById('toast').textContent));
await switchTo('pembeli'); t = await inbox(); assert.match(t, /Pesanan diterima/); ok('serah terima terverifikasi → pembeli menerima "Pesanan diterima"');

// ================= 7. BIAYA APLIKASI 8% UNTUK TOKO =================
await click(tid('bottom-nav-tab-home')); await switchTo('toko', 's4'); const earn = await page.locator(tid('tdash-earnings')).innerText(); assert.match(earn, /Rp24\.500/); assert.match(earn, /−Rp1\.960/); assert.match(earn, /Rp22\.540/); ok('pendapatan toko: bayar Rp24.500 (produk Rp20.000 + ongkir Rp4.500), biaya 8% = Rp1.960, diterima Rp22.540');
assert.match((await text()), /Biaya aplikasi 8%/);

// ================= 8. PENGAJUAN MERCHANT =================
await switchTo('pembeli'); await menu('menu-merchant-btn'); await page.waitForSelector(tid('merchant-fee-info'));
const fee = await page.locator(tid('merchant-fee-info')).innerText(); assert.match(fee, /8%/); assert.match(fee, /Rp25\.000/); assert.match(fee, /Rp2\.000/); assert.match(fee, /Rp23\.000/); await coverage('merchant'); ok('tab Merchant menjelaskan biaya aplikasi 8% per pembayaran + contoh hitungan');
await click(tid('merchant-submit-btn')); assert.match(await text(), /Nama usaha 3–60 karakter/); assert.match(await text(), /Centang persetujuan biaya aplikasi 8%/); ok('formulir kosong ditolak dengan pesan jelas');
await page.fill('#m_nama', 'Roti Bu Sri'); await page.selectOption('#m_jenis', 'Toko roti / kue'); await page.fill('#m_alamat', 'Jl. Raya Darmo No. 5, Surabaya'); await page.selectOption('#m_area', 'Darmo');
await page.fill('#m_telp', '0812-3456-7890'); await P.ctx.setGeolocation({ ...TUNJUNGAN, latitude: -7.25972 }); await click(tid('merchant-location-btn')); await page.waitForFunction(() => /Memakai lokasi GPS/.test(document.body.innerText)); assert.equal(await page.inputValue('#m_area'), 'Tunjungan');
await page.fill('#m_telp', '12345'); await page.check('#m_setuju'); await click(tid('merchant-submit-btn')); assert.match(await text(), /Nomor HP\/WhatsApp tidak valid/);
await page.fill('#m_telp', '0812-3456-7890'); await click(tid('merchant-submit-btn')); assert.match(await page.locator(tid('merchant-application-A1')).innerText(), /Menunggu/); ok('pengajuan valid terkirim dengan status Menunggu (lokasi GPS dipakai)');
await click(tid('merchant-approve-btn-A1')); await page.waitForFunction(() => !document.getElementById('nbar').hidden && /disetujui/i.test(document.getElementById('nbar').innerText)); assert.match(await page.locator(tid('merchant-application-A1')).innerText(), /Disetujui/);
await click(tid('merchant-enter-btn-A1')); await page.waitForSelector(tid('tdash-scan-btn')); assert.match(await text(), /Listing Roti Bu Sri/); ok('disetujui → toko baru terdaftar dan bisa dimasuki pemohon');
await click(tid('bottom-nav-tab-tcreate')); await click(tid('tcreate-type-chip-item')); await page.fill('#f_nama', 'Roti Tawar Bu Sri'); await page.fill('#f_jumlah', '4'); await page.fill('#f_harga', '9000'); await click(tid('tcreate-save-btn')); assert.match(await text(), /Roti Tawar Bu Sri/);
await switchTo('pembeli'); await page.fill('#q', 'bu sri'); assert.equal(await page.locator('.row').count(), 1); assert.match(await page.locator('.row').first().innerText(), /Roti Bu Sri/); ok('merchant baru langsung menjual dan produknya muncul untuk pembeli');

await P.ctx.close();
assert.deepEqual(errors, [], 'galat konsol: ' + errors.join(' | ')); ok('tanpa galat JavaScript');
await browser.close();
