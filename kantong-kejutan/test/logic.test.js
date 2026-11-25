import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS, seedState, validateListing, createListing, buyerView, activeListings,
  placeOrder, verifyCode, expireOrders, computeImpact, remainingStock, todayAt,
  deleteListing, setListingFoto, priceBreakdown, ongkirFor, applyVoucher, addVoucher, validateCard, luhnOk, migrateState,
  updateBuyer, storeDistance, inSurabaya, parseCodeInput, VOUCHER_KATALOG,
  APP_FEE, feeOf, netOf, sellerEarnings, recommendations, reorderPlan, keyOf, purchaseStats, collectDue, visibleNotifs, unreadCount, pendingNotifs, markNotifs,
  siapkanPesanan, mulaiAntar, etaMenit, validateApplication, submitApplication, decideApplication, STORE_INFO, KIRIM,
} from '../www/js/logic.js';
import { qrMatrix } from '../www/js/qr.js';
import { decodeMatrix } from '../www/js/qrdecode.js';

const NOW = new Date(2026, 10, 21, 15, 0, 0).getTime(); // 21 Nov 2026 15:00
const H = 3600000;

function rngFrom(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function fresh() { return seedState(NOW); }
function addListing(state, over = {}) {
  const r = createListing(state, 's1', { type: 'item', nama: 'Roti uji', jumlah: 10, harga: 5000,
    ambilStart: NOW + H, ambilEnd: NOW + 4 * H, ...over }, NOW);
  assert.ok(r.ok, JSON.stringify(r));
  return r.listing;
}

test('REQ-2.4 validasi: jumlah, harga, jendela', () => {
  const base = { type: 'kejutan', jumlah: 3, harga: 10000, ambilStart: NOW + H, ambilEnd: NOW + 3 * H };
  assert.equal(validateListing(base, NOW).ok, true);
  assert.equal(validateListing({ ...base, jumlah: 0 }, NOW).ok, false);
  assert.equal(validateListing({ ...base, jumlah: -2 }, NOW).ok, false);
  assert.equal(validateListing({ ...base, jumlah: 1.5 }, NOW).ok, false);
  assert.equal(validateListing({ ...base, harga: 0 }, NOW).ok, false);
  assert.equal(validateListing({ ...base, harga: -1 }, NOW).ok, false);
  assert.equal(validateListing({ ...base, ambilEnd: base.ambilStart }, NOW).ok, false);
  assert.equal(validateListing({ ...base, ambilEnd: NOW + 0.5 * H }, NOW).ok, false);
  assert.equal(validateListing({ ...base, ambilStart: NaN }, NOW).ok, false);
  assert.equal(validateListing({ ...base, ambilStart: NOW - 2 * H, ambilEnd: NOW - H }, NOW).ok, false);
});

test('REQ-2.2/2.3: Paket Kejutan tanpa nama; Item Pilihan wajib nama', () => {
  const base = { jumlah: 3, harga: 10000, ambilStart: NOW + H, ambilEnd: NOW + 3 * H };
  assert.equal(validateListing({ ...base, type: 'kejutan' }, NOW).ok, true);
  assert.equal(validateListing({ ...base, type: 'item', nama: '  ' }, NOW).ok, false);
  assert.equal(validateListing({ ...base, type: 'item', nama: 'Roti' }, NOW).ok, true);
  assert.equal(validateListing({ ...base, type: 'lain' }, NOW).ok, false);
});

test('listing yang tidak valid tidak disimpan', () => {
  const s = fresh(); const n = s.listings.length;
  const r = createListing(s, 's1', { type: 'kejutan', jumlah: 0, harga: 1000, ambilStart: NOW + H, ambilEnd: NOW + 2 * H }, NOW);
  assert.equal(r.ok, false);
  assert.equal(s.listings.length, n);
});

test('CP-1: stok = awal - total pesanan, tidak pernah < 0 (acak)', () => {
  const rng = rngFrom(42);
  for (let round = 0; round < 50; round++) {
    const s = fresh();
    const stokAwal = 1 + Math.floor(rng() * 30);
    const l = addListing(s, { jumlah: stokAwal });
    for (let i = 0; i < 40; i++) {
      placeOrder(s, l.id, Math.floor(rng() * 12) - 2, NOW, rng); // termasuk n <= 0 dan > stok
      assert.ok(l.stok >= 0);
      assert.equal(l.stok, remainingStock(l, s.orders));
    }
    assert.equal(l.stok, stokAwal - s.orders.filter(o => o.listingId === l.id).reduce((a, o) => a + o.qty, 0));
  }
});

test('REQ-5.1: n harus bilangan bulat 1..stok; stok tersedia disebutkan', () => {
  const s = fresh(); const l = addListing(s, { jumlah: 3 });
  for (const bad of [0, -1, 1.5, NaN, '2', 4]) {
    const r = placeOrder(s, l.id, bad, NOW);
    assert.equal(r.ok, false, `n=${bad}`);
  }
  assert.match(placeOrder(s, l.id, 4, NOW).error, /3/);
  assert.equal(l.stok, 3);
  assert.equal(s.orders.length, 0);
});

test('CP-2: total = harga satuan x jumlah (acak)', () => {
  const rng = rngFrom(7);
  for (let i = 0; i < 100; i++) {
    const s = fresh();
    const harga = 1000 + Math.floor(rng() * 90) * 500;
    const l = addListing(s, { jumlah: 20, harga });
    const n = 1 + Math.floor(rng() * 20);
    const r = placeOrder(s, l.id, n, NOW, rng);
    assert.equal(r.order.total, harga * n);
    assert.equal(r.order.unitPrice, harga);
  }
});

test('CP-3: Kode Ambil unik dan hanya sekali verifikasi', () => {
  const s = fresh(); const l = addListing(s, { jumlah: 600 });
  const rng = () => 0.1234; // rng buruk memaksa tabrakan; kode tetap harus unik
  for (let i = 0; i < 300; i++) assert.ok(placeOrder(s, l.id, 1, NOW, rng).ok);
  const codes = s.orders.map(o => o.code);
  assert.equal(new Set(codes).size, codes.length);
  const first = s.orders[0];
  assert.equal(verifyCode(s, first.storeId, first.code, NOW).ok, true);
  assert.equal(first.status, STATUS.DIAMBIL);
  const again = verifyCode(s, first.storeId, first.code, NOW);
  assert.equal(again.ok, false);
  assert.match(again.error, /sudah/i);
});

test('REQ-6.2: kode salah, huruf kecil/spasi dinormalisasi, toko lain ditolak', () => {
  const s = fresh(); const l = addListing(s);
  const o = placeOrder(s, l.id, 1, NOW).order;
  assert.equal(verifyCode(s, 's1', 'ZZZZZZ', NOW).ok, false);
  assert.equal(verifyCode(s, 's1', '', NOW).ok, false);
  assert.equal(verifyCode(s, 's2', o.code, NOW).ok, false);
  assert.equal(o.status, STATUS.DIPESAN);
  assert.equal(verifyCode(s, 's1', ` ${o.code.toLowerCase()} `, NOW).ok, true);
});

test('CP-4: pemesanan di luar Jendela Jual ditolak', () => {
  const s = fresh(); const l = addListing(s, { ambilEnd: NOW + 4 * H });
  assert.equal(placeOrder(s, l.id, 1, l.jualStart - 1).ok, false);
  assert.equal(placeOrder(s, l.id, 1, l.jualEnd + 1).ok, false);
  assert.equal(placeOrder(s, l.id, 1, l.jualEnd).ok, false);
  assert.equal(placeOrder(s, l.id, 1, l.jualStart).ok, true);
  assert.equal(l.stok, l.stokAwal - 1);
});

test('CP-5: transisi status hanya Dipesan->Diambil atau Dipesan->Hangus', () => {
  const s = fresh(); const l = addListing(s, { jumlah: 5 });
  const a = placeOrder(s, l.id, 1, NOW).order;
  const b = placeOrder(s, l.id, 2, NOW).order;
  verifyCode(s, 's1', a.code, NOW);
  const stokSebelum = l.stok;
  expireOrders(s, l.ambilEnd + 1);
  assert.equal(a.status, STATUS.DIAMBIL, 'Diambil tidak boleh menjadi Hangus');
  assert.equal(b.status, STATUS.HANGUS);
  assert.equal(l.stok, stokSebelum, 'stok tidak dikembalikan');
  assert.equal(verifyCode(s, 's1', b.code, l.ambilEnd + 1).ok, false);
  assert.equal(b.status, STATUS.HANGUS);
  expireOrders(s, l.ambilEnd + 2 * H);
  assert.equal(b.status, STATUS.HANGUS);
});

test('Hangus tepat setelah Jendela Ambil berakhir, bukan sebelumnya', () => {
  const s = fresh(); const l = addListing(s);
  const o = placeOrder(s, l.id, 1, NOW).order;
  expireOrders(s, l.ambilEnd);
  assert.equal(o.status, STATUS.DIPESAN);
  expireOrders(s, l.ambilEnd + 1);
  assert.equal(o.status, STATUS.HANGUS);
});

test('CP-6: tampilan Pembeli untuk Paket Kejutan tanpa harga coret/isi', () => {
  const s = fresh();
  const l = s.listings.find(x => x.type === 'kejutan');
  l.hargaAsli = 99999; l.isi = ['rahasia']; // data nakal tidak boleh bocor
  const v = buyerView(l, s.stores.find(x => x.id === l.storeId));
  const json = JSON.stringify(v);
  for (const k of ['hargaAsli', 'hargaCoret', 'isi', 'rahasia', '99999']) assert.ok(!json.includes(k), k);
  assert.equal(v.harga, l.harga);
  assert.equal(v.judul, 'Paket Kejutan');
});

test('REQ-4.2: Item Pilihan menampilkan nama dan harga', () => {
  const s = fresh(); const l = addListing(s, { nama: 'Roti Pisang', harga: 7000 });
  const v = buyerView(l, s.stores[0]);
  assert.equal(v.judul, 'Roti Pisang');
  assert.equal(v.harga, 7000);
});

test('REQ-3: daftar aktif urut jarak; sembunyikan stok 0 dan jendela berakhir', () => {
  const s = fresh();
  const list = activeListings(s, NOW);
  assert.ok(list.length >= 4);
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].jarakKm <= list[i].jarakKm);
  const l = addListing(s, { jumlah: 1 });
  assert.ok(activeListings(s, NOW).some(x => x.id === l.id));
  placeOrder(s, l.id, 1, NOW);
  assert.ok(!activeListings(s, NOW).some(x => x.id === l.id), 'stok 0 disembunyikan');
  assert.equal(activeListings(s, NOW + 100 * H).length, 0, 'semua jendela berakhir');
});

test('REQ-2.5: listing baru tampil pada Pembeli di sesi yang sama', () => {
  const s = fresh(); const l = addListing(s);
  assert.ok(activeListings(s, NOW).some(x => x.id === l.id));
});

test('CP-7: dampak hanya dari pesanan Diambil', () => {
  const s = fresh(); const l = addListing(s, { jumlah: 10, harga: 6000 });
  const a = placeOrder(s, l.id, 2, NOW).order;
  placeOrder(s, l.id, 3, NOW);                 // tetap Dipesan
  const c = placeOrder(s, l.id, 1, NOW).order; // akan Hangus
  assert.deepEqual([computeImpact(s).unit, computeImpact(s).rupiah], [0, 0]);
  verifyCode(s, 's1', a.code, NOW);
  expireOrders(s, l.ambilEnd + 1);
  assert.equal(c.status, STATUS.HANGUS);
  const imp = computeImpact(s);
  assert.equal(imp.unit, 2);
  assert.equal(imp.rupiah, 12000);
  assert.ok(imp.co2Kg > 0);
  assert.match(imp.catatan, /estimasi|demo/i);
});

test('CP-8: Reset demo identik dengan dataset awal', () => {
  const awal = fresh();
  const s = fresh(); const l = addListing(s);
  placeOrder(s, l.id, 2, NOW); s.meta.offsetMs = 3 * H;
  const reset = seedState(NOW);
  assert.deepEqual(reset, awal);
  assert.notDeepEqual(s, awal);
});

test('REQ-1.2: merchant demo = J.CO, Bon Ami, Holland, dan 3 hotel Surabaya, masing-masing punya produk', () => {
  const s = fresh();
  assert.equal(s.stores.length, 6);
  const names = s.stores.map(x => x.nama.toLowerCase());
  for (const m of ['j.co', 'bon ami', 'holland']) assert.ok(names.some(n => n.includes(m)), m);
  assert.equal(names.filter(n => n.includes('hotel')).length, 3);
  for (const st of s.stores) {
    const ls = s.listings.filter(l => l.storeId === st.id);
    assert.ok(ls.some(l => l.type === 'kejutan') && ls.some(l => l.type === 'item'), st.nama);
  }
  assert.equal(s.listings.length, 18);
});

test('todayAt mengubah HH:MM menjadi waktu hari ini; input buruk NaN', () => {
  const t = todayAt('18:30', NOW);
  const d = new Date(t);
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()], [2026, 10, 21, 18, 30]);
  assert.ok(Number.isNaN(todayAt('', NOW)));
  assert.ok(Number.isNaN(todayAt('25:99', NOW)));
});


// ---------- Fitur baru: checkout, voucher, ongkir, kartu, QR, foto, hapus ----------
const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const CARD = { metode: 'kartu', nomor: '4242 4242 4242 4242', exp: '12/30', cvv: '123' };
const opts = (o = {}) => ({ metode: 'ambil', alamat: '', catatan: '', voucherCode: '', bayar: CARD, ...o });

test('ongkir: Rp4.000 + Rp2.000/km, dibulatkan ke atas per Rp500', () => {
  assert.equal(ongkirFor(0), 4000); assert.equal(ongkirFor(1), 6000); assert.equal(ongkirFor(1.6), 7500); assert.equal(ongkirFor(0.6), 5500);
});

test('voucher: nominal, persen (maks), ongkir; minimal belanja; sekali pakai', () => {
  const V = c => ({ ...VOUCHER_KATALOG.find(v => v.code === c), dipakai: false });
  assert.deepEqual(applyVoucher(V('HEMAT5K'), 25000, 0), { ok: true, diskon: 5000 });
  assert.equal(applyVoucher(V('HEMAT5K'), 15000, 0).ok, false);              // di bawah minimal
  assert.deepEqual(applyVoucher(V('SDG12'), 50000, 0), { ok: true, diskon: 5000 });
  assert.equal(applyVoucher(V('SDG12'), 200000, 0).diskon, 10000);            // dibatasi maks
  assert.equal(applyVoucher(V('ONGKIR0'), 25000, 0).ok, false);               // tanpa ongkir
  assert.equal(applyVoucher(V('ONGKIR0'), 25000, 7500).diskon, 7500);         // tidak melebihi ongkir
  assert.equal(applyVoucher({ ...V('HEMAT5K'), dipakai: true }, 25000, 0).ok, false);
  assert.equal(applyVoucher(V('HEMAT5K'), 3000 * 0 + 20000, 0).diskon, 5000); // tepat di batas minimal
});

test('addVoucher: kode dikenal masuk inventori, duplikat/ngawur ditolak', () => {
  const s = fresh(); const n = s.buyer.vouchers.length;
  assert.equal(addVoucher(s, 'ngawur').ok, false); assert.equal(addVoucher(s, '').ok, false);
  assert.equal(addVoucher(s, 'hemat5k').ok, false);                           // sudah ada
  assert.equal(addVoucher(s, ' sdg12 ').ok, true); assert.equal(s.buyer.vouchers.length, n + 1);
  assert.equal(addVoucher(s, 'SDG12').ok, false);
});

test('kartu: Luhn, masa berlaku, CVV; hanya 4 digit terakhir yang disimpan', () => {
  assert.equal(luhnOk('4242424242424242'), true); assert.equal(luhnOk('4242424242424243'), false);
  assert.equal(validateCard(CARD, NOW).ok, true);
  assert.equal(validateCard({ ...CARD, exp: '01/20' }, NOW).ok, false); assert.equal(validateCard({ ...CARD, exp: '13/30' }, NOW).ok, false);
  assert.equal(validateCard({ ...CARD, cvv: '12' }, NOW).ok, false);
  const s = fresh(); const r = placeOrder(s, 'L1', 1, NOW, Math.random, opts());
  assert.equal(r.order.kartu4, '4242'); assert.doesNotMatch(JSON.stringify(s), /4242 ?4242 ?4242/);
});

test('placeOrder lengkap: antar + voucher + catatan, total = subtotal + ongkir − diskon', () => {
  const s = fresh(); updateBuyer(s, { alamat: 'Jl. Uji 1' });
  const r = placeOrder(s, 'L1', 2, NOW, Math.random, opts({ metode: 'antar', alamat: 'Jl. Uji 1', voucherCode: 'HEMAT5K', catatan: ' tanpa kacang ' }));
  assert.ok(r.ok, JSON.stringify(r)); const o = r.order;
  assert.equal(o.subtotal, 50000); assert.equal(o.ongkir, ongkirFor(0.6)); assert.equal(o.diskon, 5000);
  assert.equal(o.total, 50000 + ongkirFor(0.6) - 5000); assert.equal(o.catatan, 'tanpa kacang'); assert.equal(o.metode, 'antar');
  assert.equal(s.buyer.vouchers.find(v => v.code === 'HEMAT5K').dipakai, true);
  assert.equal(placeOrder(s, 'L1', 1, NOW, Math.random, opts({ voucherCode: 'HEMAT5K' })).ok, false); // voucher sekali pakai
});

test('placeOrder: validasi masukan tidak mengurangi stok dan tidak memakai voucher', () => {
  const s = fresh(); const stok = s.listings[0].stok;
  const antarTanpaAlamat = placeOrder(s, 'L1', 1, NOW, Math.random, opts({ metode: 'antar', alamat: '' }));
  assert.equal(antarTanpaAlamat.ok, false); assert.equal(antarTanpaAlamat.kind, 'input');
  assert.equal(placeOrder(s, 'L1', 1, NOW, Math.random, opts({ voucherCode: 'ONGKIR0' })).ok, false); // ongkir0 untuk ambil sendiri
  assert.equal(placeOrder(s, 'L1', 1, NOW, Math.random, opts({ bayar: { metode: 'kartu', nomor: '1', exp: '', cvv: '' } })).ok, false);
  assert.equal(placeOrder(s, 'L1', 1, NOW, Math.random, opts({ bayar: { metode: 'bitcoin' } })).ok, false);
  assert.equal(placeOrder(s, 'L1', 1, NOW, Math.random, opts({ catatan: 'x'.repeat(141) })).ok, false);
  assert.equal(s.listings[0].stok, stok); assert.equal(s.orders.length, 0);
  assert.equal(s.buyer.vouchers.every(v => !v.dipakai), true);
});

test('tunai: status "Bayar di tempat" lalu "Lunas" saat diverifikasi; QRIS langsung Lunas', () => {
  const s = fresh();
  const a = placeOrder(s, 'L1', 1, NOW, Math.random, opts({ bayar: { metode: 'tunai' } })).order;
  const b = placeOrder(s, 'L1', 1, NOW, Math.random, opts({ bayar: { metode: 'qris' } })).order;
  assert.equal(a.statusBayar, 'Bayar di tempat'); assert.equal(b.statusBayar, 'Lunas');
  assert.equal(verifyCode(s, 's1', a.code, NOW).ok, true); assert.equal(a.statusBayar, 'Lunas');
});

test('verifyCode menerima isi QR "KK:KODE" dan huruf kecil; kode toko lain ditolak', () => {
  const s = fresh(); const o = placeOrder(s, 'L1', 1, NOW).order;
  assert.equal(parseCodeInput(' kk:' + o.code.toLowerCase() + ' '), o.code);
  assert.equal(verifyCode(s, 's2', 'KK:' + o.code, NOW).ok, false);
  assert.equal(verifyCode(s, 's1', 'KK:' + o.code, NOW).ok, true);
});

test('QR: isi "KK:KODE" bisa di-encode lalu di-decode untuk 300 kode acak', () => {
  const rng = rngFrom(99); const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 300; i++) {
    const code = Array.from({ length: 6 }, () => AL[Math.floor(rng() * 32)]).join('');
    assert.equal(decodeMatrix(qrMatrix('KK:' + code)), 'KK:' + code);
  }
  assert.equal(decodeMatrix(qrMatrix('Halo é ✓ ' + 'z'.repeat(150))), 'Halo é ✓ ' + 'z'.repeat(150)); // versi besar + UTF-8
});

test('QR: koreksi galat memperbaiki modul yang rusak', () => {
  const m = qrMatrix('KK:K7H2PQ').map(r => r.slice());
  for (let i = 0; i < 6; i++) m[12 + i][13] = !m[12 + i][13];
  assert.equal(decodeMatrix(m), 'KK:K7H2PQ');
});

test('hapus listing: hanya milik toko itu, ditolak bila ada pesanan Dipesan', () => {
  const s = fresh(); const n = s.listings.length;
  assert.equal(deleteListing(s, 's2', 'L1').ok, false);                       // bukan toko pemilik
  assert.equal(deleteListing(s, 's1', 'LX').ok, false);
  const o = placeOrder(s, 'L1', 1, NOW).order;
  const blocked = deleteListing(s, 's1', 'L1'); assert.equal(blocked.ok, false); assert.match(blocked.error, /1 pesanan/);
  verifyCode(s, 's1', o.code, NOW);                                           // selesai diambil -> boleh dihapus
  assert.equal(deleteListing(s, 's1', 'L1').ok, true); assert.equal(s.listings.length, n - 1);
  assert.equal(s.orders.length, 1);                                           // riwayat pesanan tetap ada
  assert.equal(computeImpact(s).unit, 1);
});

test('foto produk: hanya data URL gambar & ukuran wajar; tampil di buyerView', () => {
  const s = fresh();
  const base = { type: 'item', nama: 'Roti Foto', jumlah: 2, harga: 5000, ambilStart: NOW + H, ambilEnd: NOW + 3 * H };
  assert.equal(validateListing({ ...base, foto: FOTO }, NOW).ok, true);
  assert.equal(validateListing({ ...base, foto: 'http://evil.example/x.jpg' }, NOW).ok, false);
  assert.equal(validateListing({ ...base, foto: 'data:text/html;base64,PHNjcmlwdD4=' }, NOW).ok, false);
  assert.equal(validateListing({ ...base, foto: 'data:image/jpeg;base64,' + 'A'.repeat(400001) }, NOW).ok, false);
  const l = createListing(s, 's1', { ...base, foto: FOTO }, NOW).listing;
  assert.equal(activeListings(s, NOW).find(x => x.id === l.id).foto, FOTO);
  assert.equal(setListingFoto(s, 's1', 'L1', FOTO).ok, true); assert.equal(setListingFoto(s, 's2', 'L1', FOTO).ok, false);
  assert.equal(setListingFoto(s, 's1', 'L1', null).ok, true); assert.equal(s.listings[0].foto, null);
});

test('lokasi pembeli: jarak dihitung dari koordinat bila di Surabaya; di luar Surabaya tetap data contoh', () => {
  const s = fresh(); const st = s.stores[0];
  assert.equal(storeDistance(st, s.buyer), 0.6);
  updateBuyer(s, { lat: -7.2625, lng: 112.7381 }); assert.equal(s.buyer.lokasiOk, true);
  assert.equal(storeDistance(st, s.buyer), 1.6);
  updateBuyer(s, { lat: -6.2, lng: 106.8 }); assert.equal(s.buyer.lokasiOk, false); assert.equal(storeDistance(st, s.buyer), 0.6);
  assert.equal(inSurabaya(-7.26, 112.74), true); assert.equal(inSurabaya(-6.2, 106.8), false);
  assert.equal(updateBuyer(s, { nama: '  ' }).ok, false); assert.equal(updateBuyer(s, { nama: 'Budi' }).ok, true); assert.equal(s.buyer.nama, 'Budi');
});

test('migrateState: data lama (tanpa buyer/koordinat) dilengkapi, data baru tidak berubah', () => {
  const old = fresh(); delete old.buyer; old.stores.forEach(x => { delete x.lat; delete x.lng; });
  migrateState(old); assert.equal(old.buyer.nama, 'Pembeli Demo'); assert.equal(old.buyer.vouchers.length, 2); assert.ok(Number.isFinite(old.stores[0].lat));
  const cur = fresh(); const snap = JSON.stringify(cur); migrateState(cur); assert.equal(JSON.stringify(cur), snap);
});

test('priceBreakdown murni: tidak mengubah state', () => {
  const s = fresh(); const snap = JSON.stringify(s);
  priceBreakdown(s, s.listings[0], 2, { metode: 'antar', voucherCode: 'HEMAT5K' });
  assert.equal(JSON.stringify(s), snap);
});


// ---------- Upgrade 2: biaya aplikasi, multi-produk, rekomendasi, notifikasi, pengantaran, merchant ----------
const MIN = 60000;
const alamat = 'Jl. Uji 1';
const antar = (o = {}) => opts({ metode: 'antar', alamat, ...o });

test('biaya aplikasi 8% dari setiap pembayaran; bersih = 92%', () => {
  assert.equal(APP_FEE, 0.08); assert.equal(feeOf(25000), 2000); assert.equal(netOf(25000), 23000); assert.equal(feeOf(0), 0);
  const s = fresh(); const o = placeOrder(s, 'L1', 1, NOW, Math.random, opts({ metode: 'antar', alamat, bayar: { metode: 'tunai' } })).order;
  assert.equal(o.fee, feeOf(o.total)); assert.equal(o.net, o.total - o.fee);       // termasuk ongkir (8% dari total dibayar)
  assert.equal(feeOf(33333), 2667);                                                  // pembulatan
  const legacy = placeOrder(s, 'L2', 1, NOW).order; assert.equal(legacy.fee, feeOf(9000));
});

test('pendapatan toko: hanya pesanan Diambil, dengan biaya 8%', () => {
  const s = fresh(); const a = placeOrder(s, 'L1', 1, NOW).order; placeOrder(s, 'L1', 1, NOW);
  assert.deepEqual(sellerEarnings(s, 's1'), { orders: 0, gross: 0, fee: 0, net: 0 });
  verifyCode(s, 's1', a.code, NOW);
  assert.deepEqual(sellerEarnings(s, 's1'), { orders: 1, gross: 25000, fee: 2000, net: 23000 });
  assert.equal(sellerEarnings(s, 's2').gross, 0);
});

test('tambah produk saat pesan: toko sama, satu kode, stok semua berkurang', () => {
  const s = fresh(); const stok = id => s.listings.find(l => l.id === id).stok;
  const r = placeOrder(s, 'L2', 2, NOW, Math.random, opts({ extraItems: [{ listingId: 'L1', qty: 1 }, { listingId: 'L3', qty: 2 }] }));
  assert.ok(r.ok, JSON.stringify(r)); const o = r.order;
  assert.equal(o.items.length, 3); assert.equal(o.qty, 5); assert.equal(o.subtotal, 2 * 9000 + 25000 + 2 * 15000);
  assert.match(o.judul, /\+2 produk lain/); assert.equal(stok('L2'), 4); assert.equal(stok('L1'), 4); assert.equal(stok('L3'), 2);
  assert.equal(s.orders.length, 1); assert.equal(verifyCode(s, 's1', o.code, NOW).ok, true);
  assert.equal(computeImpact(s).unit, 5);
});

test('tambah produk: toko lain / stok kurang / tidak ada ditolak tanpa mengubah stok; voucher memakai subtotal gabungan', () => {
  const s = fresh(); const snap = JSON.stringify(s.listings);
  assert.match(placeOrder(s, 'L2', 1, NOW, Math.random, opts({ extraItems: [{ listingId: 'L4', qty: 1 }] })).error, /toko yang sama/);
  assert.match(placeOrder(s, 'L2', 1, NOW, Math.random, opts({ extraItems: [{ listingId: 'L1', qty: 99 }] })).error, /Stok/);
  assert.equal(placeOrder(s, 'L2', 1, NOW, Math.random, opts({ extraItems: [{ listingId: 'LX', qty: 1 }] })).ok, false);
  assert.equal(JSON.stringify(s.listings), snap); assert.equal(s.orders.length, 0);
  assert.equal(placeOrder(s, 'L2', 1, NOW, Math.random, opts({ voucherCode: 'HEMAT5K' })).ok, false);              // 9.000 < min 20.000
  assert.equal(placeOrder(s, 'L2', 1, NOW, Math.random, opts({ voucherCode: 'HEMAT5K', extraItems: [{ listingId: 'L1', qty: 1 }] })).ok, true); // 34.000 memenuhi
  // jumlah produk utama yang sama + tambahan digabung
  const s2 = fresh(); const r = placeOrder(s2, 'L2', 1, NOW, Math.random, opts({ extraItems: [{ listingId: 'L2', qty: 2 }] })); assert.equal(r.order.items[0].qty, 3);
});

test('toko hasil data nyata: hotel punya alamat dan koordinat di Surabaya; migrasi menimpa koordinat lama', () => {
  const s = fresh();
  for (const id of ['s4', 's5', 's6']) { const st = s.stores.find(x => x.id === id); assert.equal(st.demo, false); assert.ok(st.alamat.startsWith('Jl.')); assert.ok(inSurabaya(st.lat, st.lng)); }
  assert.deepEqual([s.stores[3].lat, s.stores[3].lng], [-7.259726, 112.740077]);
  assert.equal(s.stores[0].demo, true);                                           // cabang roti = titik demo
  const old = fresh(); old.meta.dataRev = 1; old.stores[3].lat = -7.2617; old.stores[3].lng = 112.7388; delete old.stores[3].alamat;
  migrateState(old); assert.equal(old.stores[3].lat, -7.259726); assert.match(old.stores[3].alamat, /Tunjungan/);
});

test('jarak mengikuti posisi pembeli: di dekat toko ~0,1 km, bergeser menjauh makin besar', () => {
  const s = fresh(); const st = s.stores.find(x => x.id === 's5');
  updateBuyer(s, { lat: st.lat, lng: st.lng, akurasi: 10, at: 1 }); assert.equal(storeDistance(st, s.buyer), 0.1);
  updateBuyer(s, { lat: st.lat - 0.009, lng: st.lng }); const d = storeDistance(st, s.buyer); assert.ok(d > 0.9 && d < 1.1, String(d));
  assert.equal(activeListings(s, NOW)[0].tokoId, 's5');                              // urutan terdekat ikut lokasi
  updateBuyer(s, { lat: s.stores[5].lat, lng: s.stores[5].lng }); assert.equal(activeListings(s, NOW)[0].tokoId, 's6');
});

test('rekomendasi: muncul setelah pernah beli, memakai produk yang sedang tersedia; Hangus tidak dihitung', () => {
  const s = fresh(); assert.deepEqual(recommendations(s, NOW), []);
  const o = placeOrder(s, 'L2', 2, NOW).order;
  let r = recommendations(s, NOW); assert.equal(r.length, 1); assert.equal(r[0].listing.id, 'L2'); assert.equal(r[0].qty, 2); assert.equal(r[0].kali, 1);
  placeOrder(s, 'L2', 1, NOW); r = recommendations(s, NOW); assert.equal(r[0].kali, 2);
  placeOrder(s, 'L1', 1, NOW); assert.equal(recommendations(s, NOW)[0].listing.id, 'L2');  // paling sering dulu
  const s2 = fresh(); const h = placeOrder(s2, 'L2', 1, NOW).order; h.status = 'Hangus'; assert.deepEqual(recommendations(s2, NOW), []);
  // listing hari berikutnya dengan nama sama tetap cocok (kunci = toko + jenis + nama)
  const s3 = fresh(); placeOrder(s3, 'L2', 1, NOW);
  s3.listings.find(l => l.id === 'L2').stok = 0; createListing(s3, 's1', { type: 'item', nama: 'donat COKELAT kacang', jumlah: 3, harga: 9500, ambilStart: NOW + H, ambilEnd: NOW + 3 * H }, NOW);
  const rr = recommendations(s3, NOW); assert.equal(rr.length, 1); assert.equal(rr[0].listing.harga, 9500);
  assert.equal(keyOf('s1', 'kejutan', 'apa saja'), 's1|kejutan');
});

test('pesan lagi: rencana dari pesanan lama (multi-item, dibatasi stok, yang habis dilaporkan)', () => {
  const s = fresh(); const o = placeOrder(s, 'L2', 2, NOW, Math.random, opts({ extraItems: [{ listingId: 'L1', qty: 1 }], catatan: 'tanpa kacang' })).order;
  s.listings.find(l => l.id === 'L1').stok = 0;
  const p = reorderPlan(s, o.id, NOW); assert.ok(p.ok); assert.equal(p.items.length, 1); assert.deepEqual(p.missing, ['Paket Kejutan']); assert.equal(p.catatan, 'tanpa kacang');
  s.listings.find(l => l.id === 'L1').stok = 5; s.listings.find(l => l.id === 'L2').stok = 1;
  const p2 = reorderPlan(s, o.id, NOW); assert.equal(p2.items.find(i => i.listingId === 'L2').qty, 1); assert.equal(p2.items.length, 2);
  s.listings.forEach(l => { l.stok = 0; }); assert.equal(reorderPlan(s, o.id, NOW).ok, false);
  assert.equal(reorderPlan(s, 'OX', NOW).ok, false);
});

test('notifikasi favorit: dibuat saat produk yang pernah dibeli muncul lagi, tidak untuk produk lain', () => {
  const s = fresh(); placeOrder(s, 'L2', 1, NOW);                                  // beli Donat Cokelat Kacang
  const base = { type: 'item', jumlah: 3, harga: 9000, ambilStart: NOW + H, ambilEnd: NOW + 3 * H };
  createListing(s, 's1', { ...base, nama: 'Roti Lain' }, NOW);
  assert.equal(s.notifs.filter(n => n.jenis === 'favorit').length, 0);
  const l = createListing(s, 's1', { ...base, nama: 'Donat Cokelat Kacang' }, NOW).listing;
  const f = s.notifs.filter(n => n.jenis === 'favorit'); assert.equal(f.length, 1); assert.match(f[0].judul, /Donat Cokelat Kacang tersedia lagi/); assert.deepEqual(f[0].link, { view: 'detail', id: l.id });
  const due = collectDue(s, NOW, 'pembeli'); assert.ok(due.some(n => n.jenis === 'favorit')); assert.equal(unreadCount(s, 'pembeli'), due.length);
  assert.equal(createListing(s, 's2', { ...base, nama: 'Donat Cokelat Kacang' }, NOW).ok, true);
  assert.equal(s.notifs.filter(n => n.jenis === 'favorit').length, 1);               // toko lain = produk lain
});

test('notifikasi jam ambil: siap diambil, 30 menit terakhir, hangus; berhenti bila sudah diambil', () => {
  const s = fresh(); const o = placeOrder(s, 'L1', 1, NOW).order;                   // jendela NOW+30m .. NOW+4h
  assert.equal(collectDue(s, NOW, 'pembeli').filter(n => n.jenis === 'ambil').length, 0);
  assert.ok(pendingNotifs(s, 'pembeli', null, NOW).length >= 3);
  let d = collectDue(s, NOW + 31 * MIN, 'pembeli'); assert.deepEqual(d.map(n => n.judul), ['Waktunya ambil pesanan']); assert.match(d[0].isi, new RegExp(o.code));
  d = collectDue(s, NOW + 3.6 * H, 'pembeli'); assert.deepEqual(d.map(n => n.judul), ['Tinggal 30 menit lagi']);
  d = collectDue(s, NOW + 4.1 * H, 'pembeli'); assert.deepEqual(d.map(n => n.judul), ['Pesanan hangus']);
  assert.equal(collectDue(s, NOW + 5 * H, 'pembeli').length, 0);                    // tidak diulang
  const s2 = fresh(); const o2 = placeOrder(s2, 'L1', 1, NOW).order; verifyCode(s2, 's1', o2.code, NOW + 31 * MIN);
  const titles = collectDue(s2, NOW + 5 * H, 'pembeli').map(n => n.judul); assert.deepEqual(titles, ['Pesanan diambil']);   // pengingat dibatalkan
});

test('notifikasi: jendela sudah terbuka -> langsung jatuh tempo; toko dapat notifikasi pesanan baru; audiens terpisah', () => {
  const s = fresh(); placeOrder(s, 'L1', 1, NOW + 40 * MIN);
  assert.ok(collectDue(s, NOW + 40 * MIN, 'pembeli').some(n => n.judul === 'Waktunya ambil pesanan'));
  const t = collectDue(s, NOW + 40 * MIN, 'toko', 's1'); assert.deepEqual(t.map(n => n.judul), ['Pesanan baru']);
  assert.equal(collectDue(s, NOW + 40 * MIN, 'toko', 's2').length, 0);               // toko lain tidak menerima
  assert.equal(visibleNotifs(s, 'toko', 's1').length, 1);
});

test('pengaturan notifikasi: yang dimatikan tidak tampil; tandai dibaca & hapus', () => {
  const s = fresh(); updateBuyer(s, { prefs: { pengambilan: false } }); placeOrder(s, 'L1', 1, NOW);
  assert.equal(collectDue(s, NOW + 31 * MIN, 'pembeli').length, 0); assert.equal(visibleNotifs(s, 'pembeli').length, 0);
  updateBuyer(s, { prefs: { pengambilan: true } }); const o = placeOrder(s, 'L2', 1, NOW).order;
  collectDue(s, NOW + 31 * MIN, 'pembeli'); const n = visibleNotifs(s, 'pembeli'); assert.ok(n.length >= 1); assert.equal(unreadCount(s, 'pembeli'), n.length);
  markNotifs(s, 'pembeli', null, { id: n[0].id }); assert.equal(unreadCount(s, 'pembeli'), n.length - 1);
  markNotifs(s, 'pembeli', null, { all: true }); assert.equal(unreadCount(s, 'pembeli'), 0);
  markNotifs(s, 'pembeli', null, { clear: true }); assert.equal(visibleNotifs(s, 'pembeli').length, 0);
});

test('pengantaran: disiapkan -> mulai antar (ETA) -> kurir tiba -> diterima; aturan jendela & kepemilikan', () => {
  const s = fresh(); updateBuyer(s, { alamat }); const o = placeOrder(s, 'L1', 1, NOW, Math.random, antar()).order;
  assert.equal(o.kirim.tahap, KIRIM.MENUNGGU); assert.equal(o.jarakKm, 0.6); assert.equal(etaMenit(0.6), 7);
  assert.match(mulaiAntar(s, 's1', o.id, NOW).error, /baru bisa dimulai/);          // sebelum Jendela Ambil
  assert.equal(mulaiAntar(s, 's2', o.id, NOW + H).ok, false);                        // bukan toko pemilik
  assert.match(verifyCode(s, 's1', o.code, NOW + H).error, /untuk diantar/);
  const T = NOW + H; assert.equal(siapkanPesanan(s, 's1', o.id, T).ok, true); assert.equal(siapkanPesanan(s, 's1', o.id, T).ok, false);
  const m = mulaiAntar(s, 's1', o.id, T); assert.ok(m.ok); assert.equal(o.kirim.etaAt, T + 7 * MIN); assert.equal(mulaiAntar(s, 's1', o.id, T).ok, false);
  const t1 = collectDue(s, T, 'pembeli').map(n => n.judul); assert.ok(t1.includes('Pesananmu sedang disiapkan') && t1.includes('Pesananmu dalam pengantaran'));
  assert.deepEqual(collectDue(s, T + 5 * MIN, 'pembeli').map(n => n.judul), ['Kurir hampir tiba']);
  assert.deepEqual(collectDue(s, T + 7 * MIN, 'pembeli').map(n => n.judul), ['Kurir sudah tiba']);
  assert.equal(verifyCode(s, 's1', o.code, T + 8 * MIN).ok, true);
  assert.ok(collectDue(s, T + 8 * MIN, 'pembeli').some(n => n.judul === 'Pesanan diterima'));
  assert.equal(mulaiAntar(s, 's1', o.id, T + 9 * MIN).ok, false);                    // sudah selesai
});

test('pengantaran: ETA melewati batas Jendela Ambil ditolak; pesanan ambil sendiri tidak bisa diantar', () => {
  const s = fresh(); const o = placeOrder(s, 'L1', 1, NOW, Math.random, antar()).order;
  assert.match(mulaiAntar(s, 's1', o.id, o.ambilEnd - 2 * MIN).error, /melewati batas/);
  const p = placeOrder(s, 'L1', 1, NOW).order; assert.match(mulaiAntar(s, 's1', p.id, NOW + H).error, /diambil sendiri/);
  assert.equal(mulaiAntar(s, 's1', 'OX', NOW).ok, false);
  // notifikasi pengingat untuk toko: waktunya antar
  const t = collectDue(s, o.ambilStart + 1, 'toko', 's1').map(n => n.judul); assert.ok(t.includes('Waktunya mengantar'));
});

test('pengajuan merchant: validasi, duplikat, persetujuan membuat toko baru yang bisa dipakai', () => {
  const s = fresh();
  const ok = { nama: 'Roti Bu Sri', jenis: 'Toko roti / kue', alamat: 'Jl. Raya Darmo No. 5, Surabaya', area: 'Darmo', telp: '0812-3456-7890', jamTutup: '21:00', deskripsi: '', setuju: true, lat: -7.2893, lng: 112.7391 };
  assert.equal(validateApplication(ok, s).ok, true);
  for (const [k, v] of [['nama', 'ab'], ['jenis', 'Apa'], ['alamat', 'pendek'], ['area', 'Jakarta'], ['telp', '12345'], ['jamTutup', '25:00'], ['setuju', false], ['lat', -6.2]]) assert.equal(validateApplication({ ...ok, [k]: v }, s).ok, false, k);
  assert.equal(validateApplication({ ...ok, nama: 'j.co donuts & coffee' }, s).ok, false);          // sudah terdaftar
  const r = submitApplication(s, ok, NOW); assert.ok(r.ok); assert.equal(r.application.status, 'Menunggu'); assert.equal(r.application.telp, '081234567890');
  assert.equal(validateApplication(ok, s).ok, false);                                                // sedang diajukan
  const stores = s.stores.length; const d = decideApplication(s, r.application.id, true, NOW + MIN);
  assert.ok(d.ok); assert.equal(s.stores.length, stores + 1); const st = s.stores.at(-1); assert.equal(st.id, 's7'); assert.equal(st.nama, 'Roti Bu Sri'); assert.equal(r.application.storeId, 's7');
  assert.equal(decideApplication(s, r.application.id, false, NOW).ok, false);                        // sudah diputuskan
  assert.ok(createListing(s, 's7', { type: 'item', nama: 'Roti Tawar', jumlah: 3, harga: 8000, ambilStart: NOW + H, ambilEnd: NOW + 3 * H }, NOW).ok);
  assert.ok(collectDue(s, NOW + MIN, 'pembeli').some(n => n.jenis === 'merchant'));
  const s2 = fresh(); const a2 = submitApplication(s2, ok, NOW).application; decideApplication(s2, a2.id, false, NOW); assert.equal(a2.status, 'Ditolak'); assert.equal(s2.stores.length, 6);
});

test('migrateState: data versi sebelumnya (tanpa notifs/prefs/items) dilengkapi', () => {
  const old = fresh(); const o = placeOrder(old, 'L1', 2, NOW, Math.random, antar()).order;
  delete old.notifs; delete old.applications; delete old.buyer.prefs; delete o.items; delete o.kirim; delete old.meta.nextNotifId;
  migrateState(old); assert.deepEqual(old.notifs, []); assert.equal(old.buyer.prefs.favorit, true); assert.equal(o.items[0].qty, 2); assert.equal(o.kirim.tahap, 'menunggu');
  assert.ok(old.meta.nextNotifId >= 1);
});
