// Uji fitur baru di browser sungguhan. Jalankan: npm run serve (terminal lain) lalu node test/ui-features.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }

const BASE = process.env.BASE || 'http://localhost:8080/';
const FEED = '/tmp/kk-qrfeed.y4m';
execSync(`python3 test/make-qr-feed.py KK:AAAAAA ${FEED}`);
execSync('python3 test/gen-photo.py /tmp/kk-foto.png');
const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${FEED}`] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: -7.2625, longitude: 112.7381 }, permissions: ['geolocation', 'camera', 'notifications'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', d => d.accept());
const text = () => page.locator('#app').innerText();
const click = sel => page.locator(sel).first().click();
const tid = id => `[data-testid="${id}"]`;
const menu = async id => { await click(tid('header-menu-btn')); await click(tid(id)); };
let step = 0; const ok = m => console.log(`ok ${++step} - ${m}`);
const margins = () => page.evaluate(() => { const h = document.querySelector('h2.tt'); const cs = getComputedStyle(h), hr = h.getBoundingClientRect(), tp = document.querySelector('.top').getBoundingClientRect(); return { left: hr.left, gapTop: hr.top - tp.bottom, text: h.textContent }; });
const coverage = async (label) => { const miss = await page.evaluate(() => [...document.querySelectorAll('#app button,#app input,#app select,#app textarea,#app [data-act]')].filter(e => !e.dataset.testid).map(e => e.outerHTML.slice(0, 80))); assert.deepEqual(miss, [], `${label}: elemen interaktif tanpa data-testid`); };

await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload();
await click(tid('role-buyer-btn'));
await coverage('home'); ok('home: semua elemen interaktif punya data-testid');

// --- 1. padding judul
for (const [to, title] of [['orders', 'Pesanan Saya'], ['impact', 'Dampak SDGs 12']]) {
  await click(tid(`bottom-nav-tab-${to}`)); const m = await margins();
  assert.equal(m.text, title); assert.ok(m.left >= 20, `${title}: margin kiri ${m.left}`); assert.ok(m.gapTop >= 10, `${title}: jarak header ${m.gapTop}`);
  await coverage(to);
}
ok('judul Pesanan Saya & Dampak SDGs 12 punya margin kiri >= 20px dan jarak dari header');

// --- 2. kategori Toko, pencarian detail, tombol Lihat Semua
await click(tid('bottom-nav-tab-stores'));
assert.equal(await page.locator('.cc').count(), 2); assert.match(await text(), /Makanan[\s\S]*Paket Kejutan/);
await coverage('stores');
await click(tid('stores-category-btn-item')); assert.equal(await page.locator('.pl').count(), 12); ok('kategori Makanan = 12 item');
await click(tid('stores-category-btn-kejutan')); assert.equal(await page.locator('.pl').count(), 6); ok('kategori Paket Kejutan = 6 paket');
await click(tid('stores-see-all-btn')); assert.equal(await page.locator('.pl').count(), 18); ok('Lihat Semua mereset kategori (18)');
const la = await page.locator(tid('stores-see-all-btn')).evaluate(e => { const c = getComputedStyle(e); return { r: parseFloat(c.borderRadius), h: e.getBoundingClientRect().height, bw: c.borderTopWidth, bg: c.backgroundColor }; });
assert.ok(la.r >= 20 && la.h >= 25 && la.bw === '1px'); ok('tombol Lihat Semua bergaya pill (bukan tombol default)');
await page.fill('#q', 'tunjungan'); assert.equal(await page.locator('.pl').count(), 3); ok('cari lokasi "tunjungan" -> 3 produk Hotel Majapahit');
await page.fill('#q', 'cheesecake'); assert.equal(await page.locator('.pl').count(), 1);
await page.fill('#q', 'kejutan 45.000'); assert.equal(await page.locator('.pl').count(), 1); ok('cari detail: produk, kategori + harga');
await page.fill('#q', 'embong malang donat'); assert.equal(await page.locator('.pl').count(), 0); ok('kata kunci bertentangan -> kosong');
await page.fill('#q', ''); await page.screenshot({ path: '/home/claude/shots/after_toko.png' });

// --- 3. tombol Back
await click(tid('bottom-nav-tab-home')); await click(tid('bottom-nav-tab-orders')); await click(tid('bottom-nav-tab-impact'));
await page.goBack(); assert.match(await text(), /Pesanan Saya/);
await page.goBack(); assert.match(await text(), /Selamatkan yang/);
await page.goBack(); assert.match(await text(), /Cari|Kategori|Semua Produk/); ok('Back kembali ke tab sebelumnya, bukan keluar');
await click(tid('bottom-nav-tab-home')); await click(tid('header-menu-btn')); assert.equal(await page.locator('.mn').count(), 1);
await page.goBack(); assert.equal(await page.locator('.mn').count(), 0); assert.match(await text(), /Selamatkan yang/); ok('Back menutup menu, tetap di halaman yang sama');
await page.locator('.row').first().click(); await click(tid('header-back-btn')); assert.match(await text(), /Listing/); ok('tombol panah kembali di detail memakai riwayat');

// --- 4. profil: nama, alamat, cek lokasi, inventori
await click(tid('home-profile-btn')); assert.match(await text(), /Profil Pembeli/); await coverage('profile');
await page.fill('#p_nama', 'Siti Aminah'); await click(tid('profile-check-location-btn'));
await page.waitForFunction(() => /Lokasi dicek/.test(document.body.innerText)); assert.match(await text(), /Tunjungan/);
assert.match(await page.inputValue('#p_alamat'), /Dekat .*Surabaya/); ok('cek lokasi: terdeteksi Surabaya & alamat terisi otomatis');
await page.fill('#p_alamat', 'Jl. Tunjungan No. 10, Genteng, Surabaya'); await click(tid('profile-save-btn')); assert.match(await text(), /Profil tersimpan/);
await click(tid('profile-tab-inv')); assert.match(await text(), /Diskon Rp5\.000/); assert.match(await text(), /Gratis Ongkir/); ok('inventori menampilkan voucher awal');
await page.fill('#p_vcode', 'ngawur'); await click(tid('profile-voucher-add-btn')); assert.match(await text(), /tidak dikenal/);
await page.fill('#p_vcode', 'sdg12'); await click(tid('profile-voucher-add-btn')); assert.match(await text(), /SDG12/); ok('tambah voucher: kode salah ditolak, SDG12 masuk inventori');
await coverage('profile-inv');
await click(tid('header-back-btn')); await click(tid('header-back-btn').replace('header-back-btn', 'bottom-nav-tab-home')).catch(() => {});
await click(tid('bottom-nav-tab-home')); assert.match(await text(), /Siti Aminah/); ok('nama baru tampil di header beranda');

// --- 5. checkout: pengiriman, alamat, catatan, voucher, 3 metode bayar
await page.locator('.row', { hasText: 'J.CO' }).first().click();
assert.match(await text(), /1,6 km/); await coverage('detail'); ok('jarak dihitung dari lokasi pembeli (J.CO ±1,6 km)');
await click(tid('detail-order-btn')); assert.match(await text(), /Konfirmasi Pesanan/); await coverage('confirm');
await click(tid('confirm-delivery-tab-antar')); assert.match(await text(), /Jl\. Tunjungan No\. 10/); assert.match(await text(), /Ongkir[\s\S]*Rp7\.500/); ok('Antar: alamat tersimpan dipakai otomatis, ongkir Rp7.500');
await page.fill('#c_catatan', 'Tanpa kacang ya'); await click(tid('confirm-voucher-chip-HEMAT5K'));
assert.match(await text(), /hemat Rp5\.000/); assert.match(await page.locator('.card').last().innerText(), /Rp27\.500/); ok('voucher HEMAT5K: total 25.000 + 7.500 − 5.000 = Rp27.500');
await click(tid('confirm-voucher-chip-HEMAT5K')); await click(tid('confirm-voucher-chip-ONGKIR0')); assert.match(await page.locator('.card').last().innerText(), /Rp25\.000/); ok('voucher gratis ongkir: total Rp25.000');
await click(tid('confirm-voucher-chip-ONGKIR0')); await click(tid('confirm-delivery-tab-ambil')); await click(tid('confirm-voucher-chip-ONGKIR0')); assert.match(await text(), /hanya berlaku untuk pesanan Antar/); ok('voucher ongkir ditolak saat Ambil di toko');
await click(tid('confirm-voucher-chip-ONGKIR0'));
await click(tid('confirm-pay-btn')); assert.match(await text(), /Nomor kartu tidak valid/); ok('kartu kosong ditolak');
await page.fill('#c_nomor', '4242 4242 4242 4243'); await page.fill('#c_exp', '1230'); await page.fill('#c_cvv', '12'); await click(tid('confirm-pay-btn')); assert.match(await text(), /tidak valid/);
await click(tid('confirm-payment-tab-qris')); assert.equal(await page.locator('.qpay svg.qrsvg').count(), 1); ok('tab QRIS menampilkan QR pembayaran');
await click(tid('confirm-payment-tab-tunai')); assert.match(await text(), /Bayar tunai ke toko/); ok('tab Tunai tersedia');
await click(tid('confirm-delivery-tab-antar')); await click(tid('confirm-payment-tab-tunai'));
await click(tid('confirm-voucher-chip-HEMAT5K')); await page.screenshot({ path: '/home/claude/shots/after_checkout.png', fullPage: true });
await click(tid('confirm-pay-btn'));
assert.match(await text(), /Pesanan Berhasil/); await coverage('order'); assert.equal(await page.locator('[data-testid=order-qr] svg').count(), 1); ok('pesanan jadi: QR Kode Ambil dibuat otomatis');
const code = (await page.locator('.code').innerText()).trim(); assert.match(code, /^[A-Z2-9]{6}$/);
const t5 = await text(); assert.match(t5, /Tanpa kacang ya/); assert.match(t5, /Diantar ke alamat/); assert.match(t5, /Tunai/); assert.match(t5, /Rp27\.500/); ok('rincian pesanan: antar, alamat, catatan, tunai, total Rp27.500');
await page.screenshot({ path: '/home/claude/shots/after_order.png', fullPage: true });
// Back dari order -> bukan ke halaman konfirmasi (sudah di-replace)
await page.goBack(); assert.doesNotMatch(await text(), /Konfirmasi Pesanan/); ok('Back dari pesanan tidak kembali ke form bayar');
await click(tid('bottom-nav-tab-orders')); await click(tid('bottom-nav-tab-home'));
await click(tid('menu-profile-btn').replace('menu-profile-btn', 'header-menu-btn')); await click(tid('menu-profile-btn')); await click(tid('profile-tab-inv'));
assert.match(await page.locator(tid('profile-voucher-HEMAT5K')).innerText(), /Terpakai/); ok('voucher yang dipakai berstatus Terpakai di Inventori');

// --- 6. pesanan kedua (ambil, QRIS) untuk di-scan
await click(tid('bottom-nav-tab-home')); await page.locator('.row', { hasText: 'J.CO' }).first().click(); await click(tid('detail-order-btn'));
await click(tid('confirm-payment-tab-qris')); await click(tid('confirm-pay-btn'));
const code2 = (await page.locator('.code').innerText()).trim();
execSync(`python3 test/make-qr-feed.py KK:${code2} ${FEED}`);

// --- 7. penjual: scan QR dengan kamera
await click(tid('header-menu-btn')); await coverage('menu'); await click(tid('menu-roles-btn')); await coverage('role'); await click(tid('role-seller-btn')); await coverage('tdash');
assert.match(await text(), /QRIS · Lunas/); await click(tid('tdash-next-btn')); assert.match(await text(), /Diantar ke alamat/); assert.match(await text(), /Jl\. Tunjungan No\. 10/); assert.match(await text(), /Tanpa kacang ya/); assert.match(await text(), /Tagih tunai/); await click(tid('tdash-prev-btn')); ok('dashboard penjual menampilkan alamat, catatan, dan tagihan tunai');
await click(tid('tdash-scan-btn')); await page.waitForSelector('#scan:not([hidden]) video');
await page.waitForFunction(() => document.getElementById('scan').hidden === true, null, { timeout: 15000 });
await page.waitForFunction(() => /Berhasil/.test(document.getElementById('toast').textContent));
ok('scan QR lewat kamera: pesanan ' + code2 + ' otomatis diverifikasi → Diambil');
assert.equal(await page.locator('#scan:not([hidden])').count(), 0);
// kode lama yang sama di-scan lagi -> ditolak (sudah dipakai) lewat input manual berisi isi QR
await click(tid('tdash-verify-btn')); await coverage('verify-sheet'); await page.fill('#kode', 'KK:' + code2); await click(tid('verify-sheet-submit-btn')); assert.match(await text(), /sudah dipakai/); ok('isi QR "KK:kode" juga diterima di input manual; pemakaian ulang ditolak');
await page.goBack(); assert.equal(await page.locator('.sh').count(), 0); ok('Back menutup sheet verifikasi');
await click(tid('tdash-verify-btn')); await page.fill('#kode', code); await click(tid('verify-sheet-submit-btn')); assert.match(await text(), /untuk diantar/); ok('pesanan Antar tidak bisa diverifikasi sebelum Mulai Antar');
await page.goBack(); await click(tid('tdash-next-btn'));
await click(tid('tdash-deliver-btn')); await page.waitForFunction(() => /baru bisa dimulai/.test(document.getElementById('toast').textContent)); ok('Mulai Antar sebelum Jendela Ambil ditolak');
await menu('menu-advance-btn'); await click(tid('tdash-prepare-btn')); await click(tid('tdash-deliver-btn')); assert.match(await page.locator(tid('tdash-delivery-status')).innerText(), /Dalam pengantaran, tiba sekitar \d\d:\d\d/); ok('penjual menyiapkan dan memulai pengantaran (ETA muncul)');
await click(tid('tdash-verify-btn')); await page.fill('#kode', code); await click(tid('verify-sheet-submit-btn'));
await page.waitForFunction(() => /Terima tunai/.test(document.getElementById('toast').textContent)); ok('serah terima: verifikasi pesanan antar tunai mengingatkan terima tunai');
// scanner: tombol manual & tutup + Back
await click(tid('tdash-scan-btn')); await page.waitForSelector('#scan:not([hidden]) video'); await coverage('tdash-scan');
const scanTid = await page.evaluate(() => [...document.querySelectorAll('#scan [data-testid]')].map(e => e.dataset.testid)); assert.ok(scanTid.includes('scanner-close-btn') && scanTid.includes('scanner-manual-btn'));
await page.goBack(); await page.waitForFunction(() => document.getElementById('scan').hidden); ok('Back menutup scanner dan mematikan kamera');
const live = await page.evaluate(() => !!document.getElementById('scanVideo')); assert.equal(live, false);

// --- 8. penjual: foto produk & hapus listing
await click(tid('bottom-nav-tab-tcreate')); assert.match(await text(), /Buat Listing/);
let m2 = await margins(); assert.ok(m2.left >= 20 && m2.gapTop >= 10); ok('judul Buat Listing punya margin & jarak yang benar'); await coverage('tcreate');
await click(tid('tcreate-type-chip-item')); await page.fill('#f_nama', 'Roti Foto Uji'); await page.fill('#f_jumlah', '3'); await page.fill('#f_harga', '9000');
const [fc] = await Promise.all([page.waitForEvent('filechooser'), click(tid('tcreate-photo-btn'))]); await fc.setFiles('/tmp/kk-foto.png');
await page.waitForSelector('.ph .thumb img'); const src = await page.locator('.ph .thumb img').getAttribute('src'); assert.match(src, /^data:image\/jpeg;base64,/);
assert.ok(src.length < 400000, 'foto dikecilkan'); ok(`foto produk diunggah & dikecilkan (${Math.round(src.length / 1024)} KB)`);
await click(tid('tcreate-photo-remove-btn')); assert.equal(await page.locator('.ph .thumb img').count(), 0); ok('foto bisa dihapus dari form');
const [fc2] = await Promise.all([page.waitForEvent('filechooser'), click(tid('tcreate-photo-btn'))]); await fc2.setFiles('/tmp/kk-foto.png'); await page.waitForSelector('.ph .thumb img');
await click(tid('tcreate-save-btn')); assert.match(await text(), /Roti Foto Uji/); assert.equal(await page.locator('.lrow .thumb img').count(), 1); ok('listing dengan foto tersimpan, foto tampil di daftar penjual');
await page.screenshot({ path: '/home/claude/shots/after_seller.png', fullPage: true });
const lid = await page.locator('.lrow', { hasText: 'Roti Foto Uji' }).getAttribute('data-testid'); const id = lid.replace('tdash-listing-row-', '');
const [fc3] = await Promise.all([page.waitForEvent('filechooser'), click(tid('tdash-photo-btn-L1'))]); await fc3.setFiles('/tmp/kk-foto.png'); await page.waitForFunction(() => document.querySelectorAll('.lrow .thumb img').length === 2); ok('foto listing yang sudah ada bisa ditambahkan/diganti');
await click(tid('tdash-delete-btn-' + id)); await page.waitForFunction(i => !document.querySelector(`[data-testid="tdash-listing-row-${i}"]`), id); ok('penjual bisa menghapus listing');
// listing dengan pesanan Dipesan tidak boleh dihapus (pembeli rugi)
await menu('menu-roles-btn'); await click(tid('role-buyer-btn'));
await page.locator('.row', { hasText: 'Bon Ami' }).first().click(); await click(tid('detail-order-btn')); await click(tid('confirm-payment-tab-tunai')); await click(tid('confirm-pay-btn'));
await page.evaluate(() => { const s = document.getElementById('storeSel'); });
await menu('menu-roles-btn'); await page.selectOption(tid('role-store-select'), 's2'); await click(tid('role-seller-btn'));
const delId = await page.locator('.lrow').first().getAttribute('data-testid'); 
await click(tid(delId.replace('listing-row', 'delete-btn'))); await page.waitForFunction(() => /Masih ada 1 pesanan/.test(document.getElementById('toast').textContent)); ok('hapus listing dengan pesanan Dipesan ditolak dengan alasan jelas');

// --- 9. pembeli melihat foto
await menu('menu-roles-btn'); await click(tid('role-buyer-btn')); await page.fill('#q', 'Foto'); await page.waitForTimeout(100);
assert.equal(await page.locator('.row').count(), 0, 'listing foto sudah dihapus'); ok('listing yang dihapus hilang dari pembeli');

assert.deepEqual(errors, [], 'galat konsol: ' + errors.join(' | ')); ok('tanpa galat JavaScript');
await browser.close();
