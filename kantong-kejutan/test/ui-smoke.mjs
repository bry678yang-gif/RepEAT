// Uji asap UI di browser sungguhan. Jalankan: npm run serve (terminal lain) lalu node test/ui-smoke.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
import assert from 'node:assert/strict';

const BASE = process.env.BASE || 'http://localhost:8080/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: -7.2625, longitude: 112.7381 }, permissions: ['geolocation', 'camera', 'notifications'] });
const page = await ctx.newPage();
const errors = [], external = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });
const text = () => page.locator('#app').innerText();
const click = sel => page.locator(sel).first().click();
const menu = async act => { await click('[data-act=menu]'); await click(`.mn [data-act=${act}]`); };
const card = async () => { await page.fill('#c_nomor', '4242424242424242'); await page.fill('#c_exp', '1230'); await page.fill('#c_cvv', '123'); };
let step = 0; const ok = m => console.log(`ok ${++step} - ${m}`);

await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload();
assert.match(await text(), /Selamatkan yang/); ok('layar awal');
assert.match(await text(), /demo/i); ok('penanda demo terlihat');

await click('[data-role=pembeli]');
assert.equal(await page.locator('.row').count(), 18); ok('18 listing dari 6 merchant tampil');
const t0 = await text();
for (const n of ['J.CO', 'Bon Ami', 'Holland', 'Majapahit', 'JW Marriott', 'Shangri-La']) assert.match(t0, new RegExp(n.replace('.', '\\.')));
ok('J.CO, Bon Ami, Holland, dan 3 hotel ada');
assert.ok((await page.locator('.row svg.art').count()) >= 18); ok('setiap produk punya gambar');
assert.doesNotMatch(await page.locator('#app').innerHTML(), /<img[^>]+src="(?!data:)/i); ok('tanpa gambar eksternal (SVG kode / data URL)');

await page.fill('#q', 'holland'); assert.equal(await page.locator('.row').count(), 3); ok('pencarian memfilter merchant');
await page.fill('#q', ''); await click('[data-k=kejutan]'); assert.equal(await page.locator('.row').count(), 6); ok('filter Paket Kejutan');
await click('[data-k=semua]');

await page.locator('.row', { hasText: 'J.CO' }).first().click();
let t = await text();
assert.match(t, /Paket Kejutan/); assert.doesNotMatch(t, /coret|harga asli/i); ok('detail Paket Kejutan tanpa harga coret/isi');
for (let i = 0; i < 9; i++) await click('[data-act=dup]');
assert.equal((await page.locator('#qv').innerText()).trim(), '5'); ok('jumlah tidak melebihi stok (5)');
for (let i = 0; i < 3; i++) await click('[data-act=ddn]');
assert.match(await text(), /50\.000/); ok('total = 25.000 x 2 = Rp50.000');
await click('[data-act=toConfirm]'); assert.match(await text(), /SIMULASI/); await card(); await click('[data-act=pay]');
const code = (await page.locator('.code').innerText()).trim();
assert.match(code, /^[A-Z2-9]{6}$/); ok(`kode ambil: ${code}`);

await menu('roles'); await click('[data-role=toko]');
await click('[data-act=sheet]'); await page.fill('#kode', 'SALAH1'); await click('.sh [data-act=verify]');
assert.match(await text(), /tidak ditemukan/); ok('kode salah ditolak');
await page.fill('#kode', code.toLowerCase()); await click('.sh [data-act=verify]');
assert.doesNotMatch(await text(), /Verifikasi Kode Ambil/); ok('kode benar -> Diambil (sheet tertutup)');
await click('[data-act=sheet]'); await page.fill('#kode', code); await click('.sh [data-act=verify]');
assert.match(await text(), /sudah dipakai/); ok('kode dipakai ulang ditolak'); await click('.ov [data-act=sheetClose]').catch(() => {});
await page.keyboard.press('Escape');
if (await page.locator('.sh').count()) await page.mouse.click(195, 60);

await click('[data-to=tcreate]'); await page.fill('#f_jumlah', '0'); await click('[data-act=saveListing]');
assert.match(await text(), /Jumlah harus/); ok('listing jumlah 0 ditolak');
await click('[data-type=item]'); await page.fill('#f_nama', '<b>Donat Uji</b>'); await page.fill('#f_jumlah', '4'); await page.fill('#f_harga', '7000');
await click('[data-act=saveListing]');
assert.match(await text(), /Listing J\.CO/); ok('listing valid disimpan');
assert.doesNotMatch(await page.locator('#app').innerHTML(), /<b>Donat Uji<\/b>/); ok('input toko di-escape (anti-XSS)');

await menu('roles'); await click('[data-role=pembeli]');
assert.match(await text(), /Donat Uji/); ok('listing baru tampil untuk Pembeli');
await page.locator('.row', { hasText: 'Donat Uji' }).click(); await click('[data-act=toConfirm]'); await card(); await click('[data-act=pay]');
for (let i = 0; i < 5; i++) await menu('advance');
await click('[data-to=orders]'); assert.match(await text(), /Hangus/); ok('pesanan tidak diambil menjadi Hangus');
await click('[data-to=impact]'); t = await text();
assert.match(t, /\b2\b/); assert.match(t, /50\.000/); assert.match(t, /estimasi/i); ok('dampak hanya dari pesanan Diambil');
await click('[data-to=stores]'); await click('[data-act=catPick][data-k=kejutan]'); assert.equal(await page.locator('.cc').count(), 2); assert.equal(await page.locator('.cc.on').count(), 1); ok('tab Toko: tepat 2 kategori (Makanan, Paket Kejutan)');

await page.reload(); assert.match(await text(), /Dampak|Kategori|Pesanan|Listing/); ok('data bertahan setelah muat ulang');
page.once('dialog', d => d.accept()); await menu('reset');
assert.match(await text(), /Selamatkan yang/); await click('[data-role=pembeli]');
assert.equal(await page.locator('.row').count(), 18); ok('Reset demo mengembalikan 18 listing awal');
await page.evaluate(() => localStorage.setItem('kk_demo_v1', '{rusak')); await page.reload();
assert.match(await text(), /Data lokal rusak/i); await click('[data-act=reset]'); assert.match(await text(), /Selamatkan yang/); ok('data rusak -> Reset demo berfungsi');

assert.deepEqual(external, [], 'tidak boleh ada permintaan keluar'); ok('tanpa permintaan jaringan eksternal');
assert.deepEqual(errors, [], 'galat konsol: ' + errors.join(' | ')); ok('tanpa galat JavaScript');
await browser.close();
