// Aturan bisnis murni: tanpa DOM, tanpa localStorage. Semua fungsi menerima `now` (ms).
// State diubah di tempat (mutasi); hasil berupa { ok:true, ... } atau { ok:false, error }.

export const STATUS = { DIPESAN: 'Dipesan', DIAMBIL: 'Diambil', HANGUS: 'Hangus' };
export const TIPE = { KEJUTAN: 'kejutan', ITEM: 'item' };
export const MAKS_JUMLAH = 1000;
export const METODE = { AMBIL: 'ambil', ANTAR: 'antar' };
export const BAYAR = { KARTU: 'kartu', QRIS: 'qris', TUNAI: 'tunai' };
export const KODE_PREFIX = 'KK:'; // isi QR Kode Ambil: "KK:" + 6 karakter kode
export const MAKS_CATATAN = 140;

// Koordinat & alamat toko. s4-s6 = hotel dengan alamat nyata (koordinat dari situs resmi/Wikipedia/agregator hotel, akurasi ±puluhan meter).
// s1-s3 = merek roti dengan "titik cabang demo": belum ada kerja sama, jadi lokasinya BUKAN cabang nyata.
export const STORE_INFO = {
  s1: { lat: -7.2575, lng: 112.7521, alamat: 'Titik cabang demo (area Gubeng–Kertajaya)', demo: true },
  s2: { lat: -7.2655, lng: 112.7480, alamat: 'Titik cabang demo (area Gubeng)', demo: true },
  s3: { lat: -7.2740, lng: 112.7440, alamat: 'Titik cabang demo (area Darmo)', demo: true },
  s4: { lat: -7.259726, lng: 112.740077, alamat: 'Jl. Tunjungan No. 65, Genteng', demo: false },
  s5: { lat: -7.259678, lng: 112.734729, alamat: 'Jl. Embong Malang No. 85-89, Tegalsari', demo: false },
  s6: { lat: -7.289968, lng: 112.7163, alamat: 'Jl. Mayjend Sungkono No. 120', demo: false },
};
export const STORE_COORDS = Object.fromEntries(Object.entries(STORE_INFO).map(([k, v]) => [k, [v.lat, v.lng]]));
export const DATA_REV = 2;
export const APP_FEE = 0.08; // biaya aplikasi: 8% dari setiap pembayaran, ditanggung merchant
export const KIRIM = { MENUNGGU: 'menunggu', DISIAPKAN: 'disiapkan', DIANTAR: 'diantar' };
export const KURIR_KMH = 20, KURIR_BUFFER_MENIT = 5;
export const JENIS_USAHA = ['Toko roti / kue', 'Kafe / restoran', 'Hotel', 'Supermarket / minimarket', 'Lainnya'];
export const MAKS_NOTIF = 100;
export const AREAS = [
  { nama: 'Tunjungan', lat: -7.2617, lng: 112.7388 }, { nama: 'Embong Malang', lat: -7.2639, lng: 112.7357 },
  { nama: 'Gubeng', lat: -7.2650, lng: 112.7522 }, { nama: 'Darmo', lat: -7.2893, lng: 112.7391 },
  { nama: 'Sungkono', lat: -7.2917, lng: 112.7183 }, { nama: 'Wonokromo', lat: -7.3040, lng: 112.7365 },
  { nama: 'Rungkut', lat: -7.3283, lng: 112.7733 }, { nama: 'Kenjeran', lat: -7.2290, lng: 112.7920 },
];
export const SBY_BOUNDS = { latMin: -7.40, latMax: -7.15, lngMin: 112.55, lngMax: 112.85 };

// Voucher yang bisa "ditambahkan" lewat kode (demo). Voucher awal pembeli ada di seedBuyer().
export const VOUCHER_KATALOG = [
  { code: 'HEMAT5K', judul: 'Diskon Rp5.000', jenis: 'nominal', nilai: 5000, minBelanja: 20000 },
  { code: 'ONGKIR0', judul: 'Gratis Ongkir', jenis: 'ongkir', nilai: 20000, minBelanja: 0 },
  { code: 'SDG12', judul: 'Diskon 10% (maks Rp10.000)', jenis: 'persen', nilai: 10, maks: 10000, minBelanja: 15000 },
  { code: 'SELAMATKAN', judul: 'Diskon 15% (maks Rp12.000)', jenis: 'persen', nilai: 15, maks: 12000, minBelanja: 25000 },
];

// Parameter estimasi dampak. ANGKA DEMO: ganti dengan faktor dari sumber resmi sebelum presentasi final.
export const IMPACT_PARAMS = {
  kgPerUnit: 0.4,   // perkiraan berat makanan per kantong/item (demo)
  co2PerKg: 2.5,    // kg CO2e per kg makanan terbuang (demo)
  sumber: 'Parameter demo, belum bersumber resmi. Ganti dengan faktor emisi dari sumber yang dapat dirujuk sebelum dipresentasikan.',
};

const KODE_ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 karakter, tanpa I dan O
const KODE_PANJANG = 6;

export function seedState(now) {
  const H = 3600000;
  const stores = [
    { id: 's1', nama: 'J.CO Donuts & Coffee', area: 'Cabang Surabaya', jarakKm: 0.6 },
    { id: 's2', nama: 'Bon Ami Bakery', area: 'Cabang Surabaya', jarakKm: 1.1 },
    { id: 's3', nama: 'Holland Bakery', area: 'Cabang Surabaya', jarakKm: 1.8 },
    { id: 's4', nama: 'Hotel Majapahit Surabaya', area: 'Tunjungan', jarakKm: 2.4 },
    { id: 's5', nama: 'JW Marriott Hotel Surabaya', area: 'Embong Malang', jarakKm: 3.0 },
    { id: 's6', nama: 'Shangri-La Hotel Surabaya', area: 'Sungkono', jarakKm: 4.2 },
  ];
  const mk = (n, storeId, type, nama, harga, jumlah) => ({
    id: 'L' + n, storeId, type, nama, harga, stokAwal: jumlah, stok: jumlah,
    jualStart: now - H, ambilStart: now + 0.5 * H, ambilEnd: now + 4 * H, jualEnd: now + 4 * H, createdAt: now - H,
  });
  // Merek, produk, harga, dan jarak = data ILUSTRASI untuk demo (bukan data resmi, belum ada kerja sama).
  const listings = [
    mk(1, 's1', TIPE.KEJUTAN, '', 25000, 5), mk(2, 's1', TIPE.ITEM, 'Donat Cokelat Kacang', 9000, 6), mk(3, 's1', TIPE.ITEM, 'Donat Gula Halus (3 pcs)', 15000, 4),
    mk(4, 's2', TIPE.KEJUTAN, '', 20000, 4), mk(5, 's2', TIPE.ITEM, 'Roti Sobek Cokelat', 12000, 5), mk(6, 's2', TIPE.ITEM, 'Roti Tawar Gandum', 18000, 3),
    mk(7, 's3', TIPE.KEJUTAN, '', 22000, 4), mk(8, 's3', TIPE.ITEM, 'Bolu Gulung Cokelat', 15000, 4), mk(9, 's3', TIPE.ITEM, 'Roti Abon Sapi', 8000, 6),
    mk(10, 's4', TIPE.KEJUTAN, '', 45000, 3), mk(11, 's4', TIPE.ITEM, 'Croissant Mentega', 25000, 4), mk(12, 's4', TIPE.ITEM, 'Potongan Cheesecake', 30000, 3),
    mk(13, 's5', TIPE.KEJUTAN, '', 55000, 3), mk(14, 's5', TIPE.ITEM, 'Danish Pastry Buah', 28000, 4), mk(15, 's5', TIPE.ITEM, 'Muffin Blueberry', 22000, 5),
    mk(16, 's6', TIPE.KEJUTAN, '', 60000, 2), mk(17, 's6', TIPE.ITEM, 'Potongan Red Velvet', 32000, 3), mk(18, 's6', TIPE.ITEM, 'Cookies Cokelat Chip (4 pcs)', 20000, 5),
  ];
  stores.forEach(st => Object.assign(st, STORE_INFO[st.id]));
  return { stores, listings, orders: [], buyer: seedBuyer(), notifs: [], applications: [], meta: { version: 1, dataRev: DATA_REV, offsetMs: 0, nextListingId: 19, nextOrderId: 1, nextNotifId: 1, nextStoreId: 7, nextAppId: 1 } };
}

export function seedBuyer() {
  const v = c => ({ ...VOUCHER_KATALOG.find(x => x.code === c), dipakai: false });
  return { nama: 'Pembeli Demo', alamat: '', lat: null, lng: null, akurasi: null, lokasiAt: null, lokasiOk: false, vouchers: [v('HEMAT5K'), v('ONGKIR0')], prefs: { favorit: true, pengambilan: true, pengantaran: true } };
}

// Melengkapi data lama dari penyimpanan (sebelum ada buyer / koordinat toko). Aman dipanggil berulang.
export function migrateState(s) {
  if (!s.buyer || typeof s.buyer !== 'object') s.buyer = seedBuyer();
  const b = s.buyer;
  if (typeof b.nama !== 'string' || !b.nama.trim()) b.nama = 'Pembeli Demo';
  if (typeof b.alamat !== 'string') b.alamat = '';
  if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) { b.lat = null; b.lng = null; b.lokasiOk = false; }
  if (!Number.isFinite(b.akurasi)) b.akurasi = null;
  if (!Number.isFinite(b.lokasiAt)) b.lokasiAt = null;
  if (!Array.isArray(b.vouchers)) b.vouchers = seedBuyer().vouchers;
  b.prefs = { favorit: true, pengambilan: true, pengantaran: true, ...(b.prefs && typeof b.prefs === 'object' ? b.prefs : {}) };
  if (!Array.isArray(s.notifs)) s.notifs = [];
  if (!Array.isArray(s.applications)) s.applications = [];
  const m = s.meta; m.nextNotifId = m.nextNotifId || 1; m.nextStoreId = m.nextStoreId || 7; m.nextAppId = m.nextAppId || 1;
  if ((m.dataRev || 1) < DATA_REV) { for (const st of s.stores) if (STORE_INFO[st.id]) Object.assign(st, STORE_INFO[st.id]); m.dataRev = DATA_REV; }
  for (const st of s.stores) if (STORE_INFO[st.id] && !Number.isFinite(st.lat)) Object.assign(st, STORE_INFO[st.id]);
  for (const o of s.orders) {
    if (!Array.isArray(o.items)) o.items = [{ listingId: o.listingId, type: o.type, judul: o.judul, qty: o.qty, unitPrice: o.unitPrice }];
    if (o.metode === 'antar' && !o.kirim) o.kirim = { tahap: KIRIM.MENUNGGU };
  }
  return s;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, rad = d => d * Math.PI / 180, dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export function inSurabaya(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= SBY_BOUNDS.latMin && lat <= SBY_BOUNDS.latMax && lng >= SBY_BOUNDS.lngMin && lng <= SBY_BOUNDS.lngMax;
}
export function nearestArea(lat, lng) {
  let best = null, bd = Infinity;
  for (const a of AREAS) { const d = haversineKm(lat, lng, a.lat, a.lng); if (d < bd) { bd = d; best = a; } }
  return { area: best, km: Math.round(bd * 10) / 10 };
}
// Jarak toko ke pembeli. Memakai lokasi terverifikasi di Surabaya; selain itu kembali ke jarak contoh.
export function storeDistance(store, buyer) {
  if (buyer && buyer.lokasiOk && inSurabaya(buyer.lat, buyer.lng) && Number.isFinite(store.lat)) {
    return Math.max(0.1, Math.round(haversineKm(buyer.lat, buyer.lng, store.lat, store.lng) * 10) / 10);
  }
  return store.jarakKm;
}

// Ongkir simulasi: dasar Rp4.000 + Rp2.000/km, dibulatkan ke atas per Rp500.
export function ongkirFor(jarakKm) { return Math.ceil((4000 + 2000 * Math.max(0, jarakKm)) / 500) * 500; }

export function updateBuyer(state, patch) {
  const b = state.buyer, errors = [];
  if ('nama' in patch) { const n = String(patch.nama || '').trim(); if (!n) errors.push('Nama tidak boleh kosong.'); else if (n.length > 40) errors.push('Nama maksimal 40 karakter.'); else b.nama = n; }
  if ('alamat' in patch) { const a = String(patch.alamat || '').trim(); if (a.length > 200) errors.push('Alamat maksimal 200 karakter.'); else b.alamat = a; }
  if ('lat' in patch) {
    if (patch.lat === null) { b.lat = null; b.lng = null; b.akurasi = null; b.lokasiAt = null; b.lokasiOk = false; }
    else if (Number.isFinite(patch.lat) && Number.isFinite(patch.lng)) { b.lat = patch.lat; b.lng = patch.lng; b.akurasi = Number.isFinite(patch.akurasi) ? Math.round(patch.akurasi) : null; b.lokasiAt = Number.isFinite(patch.at) ? patch.at : null; b.lokasiOk = inSurabaya(patch.lat, patch.lng); }
  }
  if (patch.prefs && typeof patch.prefs === 'object') for (const k of ['favorit', 'pengambilan', 'pengantaran']) if (k in patch.prefs) b.prefs[k] = !!patch.prefs[k];
  return errors.length ? { ok: false, errors, error: errors[0] } : { ok: true };
}

export function addVoucher(state, rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Masukkan kode voucher.' };
  if (state.buyer.vouchers.some(v => v.code === code)) return { ok: false, error: 'Voucher ini sudah ada di Inventori.' };
  const def = VOUCHER_KATALOG.find(v => v.code === code);
  if (!def) return { ok: false, error: 'Kode voucher tidak dikenal.' };
  const v = { ...def, dipakai: false }; state.buyer.vouchers.push(v);
  return { ok: true, voucher: v };
}

// Potongan dari satu voucher. Mengembalikan { ok, diskon } atau { ok:false, error }.
export function applyVoucher(v, subtotal, ongkir) {
  if (!v) return { ok: false, error: 'Voucher tidak ditemukan.' };
  if (v.dipakai) return { ok: false, error: 'Voucher sudah dipakai.' };
  if (subtotal < (v.minBelanja || 0)) return { ok: false, error: `Minimal belanja Rp${Number(v.minBelanja).toLocaleString('id-ID')} untuk voucher ini.` };
  if (v.jenis === 'nominal') return { ok: true, diskon: Math.min(v.nilai, subtotal) };
  if (v.jenis === 'persen') return { ok: true, diskon: Math.min(Math.floor(subtotal * v.nilai / 100), v.maks ?? Infinity, subtotal) };
  if (v.jenis === 'ongkir') return ongkir > 0 ? { ok: true, diskon: Math.min(v.nilai, ongkir) } : { ok: false, error: 'Voucher ongkir hanya berlaku untuk pesanan Antar.' };
  return { ok: false, error: 'Jenis voucher tidak dikenal.' };
}

// Luhn untuk nomor kartu (simulasi; nomor TIDAK pernah disimpan, hanya 4 digit terakhir).
export function luhnOk(num) {
  const d = String(num).replace(/\D/g, ''); if (d.length < 13 || d.length > 19) return false;
  let sum = 0, alt = false; for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
  return sum % 10 === 0;
}
export function validateCard(k, now) {
  const errors = [], num = String(k && k.nomor || '').replace(/\D/g, '');
  if (!luhnOk(num)) errors.push('Nomor kartu tidak valid.');
  const m = /^(\d{2})\/(\d{2})$/.exec(String(k && k.exp || '').trim());
  if (!m || +m[1] < 1 || +m[1] > 12) errors.push('Masa berlaku harus berformat BB/TT.');
  else { const d = new Date(now), y = d.getFullYear() % 100, mo = d.getMonth() + 1; if (+m[2] < y || (+m[2] === y && +m[1] < mo)) errors.push('Kartu sudah kedaluwarsa.'); }
  if (!/^\d{3,4}$/.test(String(k && k.cvv || ''))) errors.push('CVV harus 3 atau 4 digit.');
  return { ok: errors.length === 0, errors, last4: num.slice(-4) };
}

export const titleOf = l => l.type === TIPE.KEJUTAN ? 'Paket Kejutan' : l.nama;
export const feeOf = total => Math.round(Math.max(0, total) * APP_FEE);
export const netOf = total => Math.max(0, total) - feeOf(total);
export const fmtJam = ms => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

// Gabungkan produk utama + tambahan (jumlah per listing digabung). Hanya listing yang ada.
export function resolveLines(state, listing, n, extraItems = []) {
  const map = new Map(); const add = (id, q) => map.set(id, (map.get(id) || 0) + q);
  add(listing.id, n);
  for (const e of extraItems || []) if (e && Number(e.qty) > 0) add(e.listingId, Number(e.qty));
  const out = [];
  for (const [id, qty] of map) { const l = state.listings.find(x => x.id === id); if (l) out.push({ listing: l, qty }); }
  return out;
}

// Rincian harga (murni). opts: { metode, voucherCode, extraItems }
export function priceBreakdown(state, listing, n, opts = {}) {
  const store = state.stores.find(x => x.id === listing.storeId);
  const lines = resolveLines(state, listing, n, opts.extraItems);
  const subtotal = lines.reduce((a, x) => a + x.listing.harga * x.qty, 0), metode = opts.metode === METODE.ANTAR ? METODE.ANTAR : METODE.AMBIL;
  const jarak = store ? storeDistance(store, state.buyer) : 0;
  const ongkir = metode === METODE.ANTAR ? ongkirFor(jarak) : 0;
  let diskon = 0, voucher = null, voucherError = null;
  if (opts.voucherCode) {
    voucher = (state.buyer.vouchers || []).find(v => v.code === opts.voucherCode) || null;
    const r = applyVoucher(voucher, subtotal, ongkir);
    if (r.ok) diskon = r.diskon; else { voucherError = r.error; voucher = null; }
  }
  const total = Math.max(0, subtotal + ongkir - diskon);
  return { subtotal, ongkir, diskon, total, fee: feeOf(total), net: netOf(total), voucher, voucherError, metode, jarak, units: lines.reduce((a, x) => a + x.qty, 0) };
}

export function todayAt(hhmm, now) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return NaN;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return NaN;
  const d = new Date(now); d.setHours(h, mi, 0, 0);
  return d.getTime();
}

export function validateListing(input, now) {
  const errors = [];
  const { type, jumlah, harga, nama, ambilStart, ambilEnd } = input || {};
  if (type !== TIPE.KEJUTAN && type !== TIPE.ITEM) errors.push('Pilih jenis listing: Paket Kejutan atau Item Pilihan.');
  if (type === TIPE.ITEM && !String(nama || '').trim()) errors.push('Nama produk wajib diisi untuk Item Pilihan.');
  if (!Number.isInteger(jumlah) || jumlah <= 0) errors.push('Jumlah harus bilangan bulat lebih dari 0.');
  else if (jumlah > MAKS_JUMLAH) errors.push(`Jumlah maksimal ${MAKS_JUMLAH}.`);
  if (!Number.isInteger(harga) || harga <= 0) errors.push('Harga harus bilangan bulat rupiah lebih dari 0.');
  if (!Number.isFinite(ambilStart) || !Number.isFinite(ambilEnd)) errors.push('Isi jam mulai dan jam selesai pengambilan.');
  else if (ambilEnd <= ambilStart) errors.push('Jam selesai pengambilan harus setelah jam mulai.');
  else if (ambilEnd <= now) errors.push('Jam selesai pengambilan sudah lewat.');
  const foto = input && input.foto;
  if (foto != null && !fotoOk(foto)) errors.push('Foto tidak valid atau terlalu besar.');
  return { ok: errors.length === 0, errors };
}

export const MAKS_FOTO_CHAR = 400000; // ~300 KB data URL; app mengecilkan foto sebelum disimpan
export const fotoOk = f => typeof f === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(f) && f.length <= MAKS_FOTO_CHAR;

export function createListing(state, storeId, input, now) {
  const v = validateListing(input, now);
  if (!v.ok) return { ok: false, errors: v.errors, error: v.errors[0] };
  if (!state.stores.some(s => s.id === storeId)) return { ok: false, errors: ['Toko tidak ditemukan.'], error: 'Toko tidak ditemukan.' };
  const listing = {
    id: 'L' + state.meta.nextListingId++, storeId, type: input.type,
    nama: input.type === TIPE.ITEM ? String(input.nama).trim() : '',
    harga: input.harga, stokAwal: input.jumlah, stok: input.jumlah, foto: input.foto || null,
    jualStart: now, jualEnd: input.ambilEnd, ambilStart: input.ambilStart, ambilEnd: input.ambilEnd, createdAt: now,
  };
  state.listings.push(listing);
  notifyFavorites(state, listing, now);
  return { ok: true, listing };
}

export function deleteListing(state, storeId, listingId) {
  const i = state.listings.findIndex(l => l.id === listingId && l.storeId === storeId);
  if (i < 0) return { ok: false, error: 'Listing tidak ditemukan di toko ini.' };
  const pending = state.orders.filter(o => o.status === STATUS.DIPESAN && (o.items || [o]).some(it => it.listingId === listingId)).length;
  if (pending > 0) return { ok: false, error: `Masih ada ${pending} pesanan berstatus Dipesan untuk listing ini. Verifikasi atau tunggu sampai hangus dulu.` };
  const [removed] = state.listings.splice(i, 1);
  return { ok: true, listing: removed };
}

export function setListingFoto(state, storeId, listingId, foto) {
  const l = state.listings.find(x => x.id === listingId && x.storeId === storeId);
  if (!l) return { ok: false, error: 'Listing tidak ditemukan di toko ini.' };
  if (foto !== null && !fotoOk(foto)) return { ok: false, error: 'Foto tidak valid atau terlalu besar.' };
  l.foto = foto; return { ok: true };
}

// Daftar putih kolom untuk Pembeli: tidak ada harga coret, tidak ada isi paket (CP-6).
export function buyerView(l, store, buyer) {
  return {
    id: l.id, tipe: l.type, foto: l.foto || null,
    judul: l.type === TIPE.KEJUTAN ? 'Paket Kejutan' : l.nama,
    harga: l.harga, stok: l.stok, ambilStart: l.ambilStart, ambilEnd: l.ambilEnd,
    tokoId: store ? store.id : l.storeId, tokoNama: store ? store.nama : '', area: store ? store.area : '', alamat: store ? store.alamat || '' : '', lat: store ? store.lat : null, lng: store ? store.lng : null, demo: !!(store && store.demo), jarakKm: store ? storeDistance(store, buyer) : 0,
  };
}

export function activeListings(state, now) {
  return state.listings
    .filter(l => l.stok > 0 && now >= l.jualStart && now < l.jualEnd)
    .map(l => buyerView(l, state.stores.find(s => s.id === l.storeId), state.buyer))
    .sort((a, b) => a.jarakKm - b.jarakKm || a.ambilEnd - b.ambilEnd);
}

export function remainingStock(listing, orders) {
  return listing.stokAwal - orders.reduce((a, o) => a + (o.items || [o]).filter(it => it.listingId === listing.id).reduce((b, it) => b + it.qty, 0), 0);
}

function newCode(taken, rng) {
  const space = Math.pow(KODE_ALFABET.length, KODE_PANJANG);
  let num = Math.floor(rng() * space);
  for (let i = 0; i < space; i++, num = (num + 1) % space) {
    let x = num, code = '';
    for (let k = 0; k < KODE_PANJANG; k++) { code = KODE_ALFABET[x % KODE_ALFABET.length] + code; x = Math.floor(x / KODE_ALFABET.length); }
    if (!taken.has(code)) return code;
  }
  throw new Error('Kode Ambil habis');
}

export function placeOrder(state, listingId, n, now, rng = Math.random, opts = null) {
  const l = state.listings.find(x => x.id === listingId);
  if (!l) return { ok: false, error: 'Listing tidak ditemukan.' };
  if (now < l.jualStart || now >= l.jualEnd) return { ok: false, error: 'Listing ini sudah tidak dijual. Kembali ke daftar.' };
  if (l.stok <= 0) return { ok: false, error: 'Stok habis. Kembali ke daftar.' };
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) return { ok: false, error: 'Jumlah pesanan minimal 1.' };
  if (n > l.stok) return { ok: false, error: `Stok tersedia hanya ${l.stok}.` };
  const bad = msg => ({ ok: false, error: msg, kind: 'input' });
  // Produk tambahan: wajib dari toko yang sama; semua-atau-tidak-sama-sekali (stok dicek sebelum ada yang berubah).
  const lines = resolveLines(state, l, n, opts && opts.extraItems);
  for (const e of (opts && opts.extraItems) || []) if (e && Number(e.qty) > 0 && !state.listings.some(x => x.id === e.listingId)) return bad('Produk tambahan tidak ditemukan.');
  for (const { listing: x, qty } of lines) {
    if (x.storeId !== l.storeId) return bad('Produk tambahan harus dari toko yang sama.');
    if (!Number.isInteger(qty) || qty < 1) return bad('Jumlah produk tambahan tidak valid.');
    if (now < x.jualStart || now >= x.jualEnd) return bad(`${titleOf(x)} sudah tidak dijual.`);
    if (qty > x.stok) return bad(`Stok ${titleOf(x)} tersisa ${x.stok}.`);
  }
  const ambilStart = Math.max(...lines.map(x => x.listing.ambilStart)), ambilEnd = Math.min(...lines.map(x => x.listing.ambilEnd));
  if (ambilStart >= ambilEnd) return bad('Jendela Ambil produk-produk ini tidak beririsan.');
  const subtotal = lines.reduce((a, x) => a + x.listing.harga * x.qty, 0);
  let price = { subtotal, ongkir: 0, diskon: 0, total: subtotal, voucher: null, metode: METODE.AMBIL, jarak: storeDistance(state.stores.find(x => x.id === l.storeId) || {}, state.buyer) };
  let extra = {};
  if (opts) {
    price = priceBreakdown(state, l, n, opts);
    if (opts.voucherCode && !price.voucher) return bad(price.voucherError || 'Voucher tidak bisa dipakai.');
    if (price.metode === METODE.ANTAR && !String(opts.alamat || '').trim()) return bad('Isi alamat pengantaran di Profil dulu, atau pilih Ambil di toko.');
    const catatan = String(opts.catatan || '').trim();
    if (catatan.length > MAKS_CATATAN) return bad(`Catatan maksimal ${MAKS_CATATAN} karakter.`);
    const bm = opts.bayar && opts.bayar.metode;
    if (!Object.values(BAYAR).includes(bm)) return bad('Pilih metode pembayaran.');
    let kartu4 = null;
    if (bm === BAYAR.KARTU) { const c = validateCard(opts.bayar, now); if (!c.ok) return bad(c.errors[0]); kartu4 = c.last4; }
    extra = {
      metode: price.metode, alamat: price.metode === METODE.ANTAR ? String(opts.alamat).trim() : '', catatan,
      voucher: price.voucher ? price.voucher.code : null,
      bayar: bm, statusBayar: bm === BAYAR.TUNAI ? 'Bayar di tempat' : 'Lunas', kartu4,
    };
  }
  const items = lines.map(({ listing: x, qty }) => ({ listingId: x.id, type: x.type, judul: titleOf(x), qty, unitPrice: x.harga }));
  const first = items[0], total = price.total;
  const order = {
    id: 'O' + state.meta.nextOrderId++, listingId: first.listingId, storeId: l.storeId, type: first.type,
    judul: items.length > 1 ? `${first.judul} +${items.length - 1} produk lain` : first.judul,
    qty: items.reduce((a, it) => a + it.qty, 0), unitPrice: first.unitPrice, items,
    subtotal: price.subtotal, ongkir: price.ongkir, diskon: price.diskon, total, fee: feeOf(total), net: netOf(total), ...extra,
    jarakKm: price.jarak, kirim: price.metode === METODE.ANTAR ? { tahap: KIRIM.MENUNGGU } : null,
    code: newCode(new Set(state.orders.map(o => o.code)), rng),
    status: STATUS.DIPESAN, createdAt: now, ambilStart, ambilEnd,
  };
  for (const { listing: x, qty } of lines) x.stok -= qty;
  if (price.voucher) price.voucher.dipakai = true;
  state.orders.push(order);
  scheduleOrderNotifs(state, order, now);
  return { ok: true, order };
}

export function expireOrders(state, now) {
  let count = 0;
  for (const o of state.orders) if (o.status === STATUS.DIPESAN && now > o.ambilEnd) { o.status = STATUS.HANGUS; count++; }
  return count;
}

// Menerima kode ketikan ("K7H2PQ") atau isi QR ("KK:K7H2PQ"). Mengembalikan kode bersih atau ''.
export function parseCodeInput(raw) {
  let c = String(raw || '').trim().toUpperCase();
  if (c.startsWith(KODE_PREFIX)) c = c.slice(KODE_PREFIX.length);
  return c.trim();
}

export function verifyCode(state, storeId, rawCode, now) {
  const code = parseCodeInput(rawCode);
  if (!code) return { ok: false, error: 'Masukkan Kode Ambil.' };
  const o = state.orders.find(x => x.code === code && x.storeId === storeId);
  if (!o) return { ok: false, error: 'Kode tidak ditemukan di toko ini.' };
  if (o.status === STATUS.DIPESAN && now > o.ambilEnd) o.status = STATUS.HANGUS;
  if (o.status === STATUS.DIAMBIL) return { ok: false, error: 'Kode sudah dipakai: pesanan ini sudah diambil.' };
  if (o.status === STATUS.HANGUS) return { ok: false, error: 'Pesanan hangus: Jendela Ambil sudah berakhir.' };
  if (o.metode === METODE.ANTAR && !(o.kirim && o.kirim.tahap === KIRIM.DIANTAR)) return { ok: false, error: 'Pesanan ini untuk diantar. Tekan Mulai Antar dulu, lalu scan kode saat serah terima.' };
  o.status = STATUS.DIAMBIL; o.pickedAt = now;
  if (o.bayar === BAYAR.TUNAI) o.statusBayar = 'Lunas';
  pushNotif(state, { aud: 'pembeli', jenis: 'order', key: `ord:${o.id}:done`, judul: o.metode === METODE.ANTAR ? 'Pesanan diterima' : 'Pesanan diambil', isi: `${o.judul} dari ${storeName(state, o.storeId)} sudah selesai. Terima kasih sudah ikut menyelamatkan makanan!`, at: now, orderId: o.id, link: { view: 'order', id: o.id } });
  return { ok: true, order: o };
}

// ---------- Biaya aplikasi & pendapatan toko ----------
export function sellerEarnings(state, storeId) {
  const taken = state.orders.filter(o => o.storeId === storeId && o.status === STATUS.DIAMBIL);
  const gross = taken.reduce((a, o) => a + o.total, 0), fee = taken.reduce((a, o) => a + (Number.isFinite(o.fee) ? o.fee : feeOf(o.total)), 0);
  return { orders: taken.length, gross, fee, net: gross - fee };
}

// ---------- Rekomendasi / pesan lagi ----------
export const keyOf = (storeId, type, judul) => type === TIPE.KEJUTAN ? `${storeId}|kejutan` : `${storeId}|item|${String(judul || '').trim().toLowerCase()}`;
// Produk yang pernah dibeli (pesanan Dipesan/Diambil; Hangus tidak dihitung): key -> { kali, terakhir, qtyTerakhir, ... }
export function purchaseStats(state) {
  const m = new Map();
  for (const o of state.orders) {
    if (o.status === STATUS.HANGUS) continue;
    for (const it of (o.items || [o])) {
      const k = keyOf(o.storeId, it.type, it.judul), cur = m.get(k) || { key: k, storeId: o.storeId, type: it.type, judul: it.judul, kali: 0, terakhir: 0, qtyTerakhir: 1 };
      cur.kali++; if (o.createdAt >= cur.terakhir) { cur.terakhir = o.createdAt; cur.qtyTerakhir = it.qty; } m.set(k, cur);
    }
  }
  return m;
}
export function matchingListing(state, key, now) {
  return state.listings.filter(l => l.stok > 0 && now >= l.jualStart && now < l.jualEnd && keyOf(l.storeId, l.type, l.nama) === key)
    .sort((a, b) => a.ambilEnd - b.ambilEnd)[0] || null;
}
export function recommendations(state, now, limit = 6) {
  const out = [];
  for (const st of purchaseStats(state).values()) {
    const l = matchingListing(state, st.key, now); if (!l) continue;
    out.push({ key: st.key, kali: st.kali, terakhir: st.terakhir, qty: Math.min(st.qtyTerakhir, l.stok), listing: buyerView(l, state.stores.find(x => x.id === l.storeId), state.buyer) });
  }
  return out.sort((a, b) => b.kali - a.kali || b.terakhir - a.terakhir).slice(0, limit);
}
// Isi ulang pesanan lama: item yang masih dijual (jumlah dibatasi stok) + yang tidak tersedia.
export function reorderPlan(state, orderId, now) {
  const o = state.orders.find(x => x.id === orderId); if (!o) return { ok: false, error: 'Pesanan tidak ditemukan.' };
  const items = [], missing = [];
  for (const it of (o.items || [o])) {
    const l = matchingListing(state, keyOf(o.storeId, it.type, it.judul), now);
    if (l) items.push({ listingId: l.id, qty: Math.min(it.qty, l.stok), judul: titleOf(l) }); else missing.push(it.judul);
  }
  if (!items.length) return { ok: false, error: 'Produk di pesanan ini belum tersedia lagi. Kami akan mengabari saat muncul.', missing };
  return { ok: true, items, missing, metode: o.metode || METODE.AMBIL, catatan: o.catatan || '' };
}

// ---------- Notifikasi (terjadwal pada jam simulasi) ----------
const storeName = (state, id) => (state.stores.find(x => x.id === id) || {}).nama || 'toko';
const PREF_OF = { favorit: 'favorit', ambil: 'pengambilan', antar: 'pengantaran' };
export function pushNotif(state, n) {
  state.notifs = state.notifs || [];
  if (n.key && state.notifs.some(x => x.key === n.key)) return null;
  const id = 'N' + (state.meta.nextNotifId = (state.meta.nextNotifId || 1) + 1);
  const rec = { id, delivered: false, read: false, createdAt: n.at, ...n };
  state.notifs.push(rec);
  if (state.notifs.length > MAKS_NOTIF) state.notifs.splice(0, state.notifs.length - MAKS_NOTIF);
  return rec;
}
export function notifyFavorites(state, l, now) {
  if (!state.buyer || !purchaseStats(state).has(keyOf(l.storeId, l.type, l.nama))) return null;
  return pushNotif(state, { aud: 'pembeli', jenis: 'favorit', key: `fav:${l.id}`, judul: `${titleOf(l)} tersedia lagi`,
    isi: `Produk yang biasa kamu beli ada di ${storeName(state, l.storeId)}: Rp${Number(l.harga).toLocaleString('id-ID')}, sisa ${l.stok}, ambil ${fmtJam(l.ambilStart)}–${fmtJam(l.ambilEnd)}.`, at: now, link: { view: 'detail', id: l.id } });
}
export function scheduleOrderNotifs(state, o, now) {
  const toko = storeName(state, o.storeId), N = (x) => pushNotif(state, { orderId: o.id, link: { view: 'order', id: o.id }, ...x });
  const antar = o.metode === METODE.ANTAR;
  N({ aud: 'toko', storeId: o.storeId, jenis: 'order', key: `ord:${o.id}:new`, judul: 'Pesanan baru', isi: `${o.judul} ×${o.qty} (${antar ? 'diantar' : 'ambil di toko'}), ${fmtJam(o.ambilStart)}–${fmtJam(o.ambilEnd)}.`, at: now, link: { view: 'tdash' } });
  if (antar) {
    N({ aud: 'toko', storeId: o.storeId, jenis: 'antar', key: `ord:${o.id}:antar1`, judul: 'Waktunya mengantar', isi: `Antar ${o.judul} ke ${o.alamat} sebelum ${fmtJam(o.ambilEnd)}.`, at: Math.max(now, o.ambilStart), cond: 'belumAntar', link: { view: 'tdash' } });
    const t = o.ambilEnd - 30 * 60000; if (t > Math.max(now, o.ambilStart)) N({ aud: 'toko', storeId: o.storeId, jenis: 'antar', key: `ord:${o.id}:antar2`, judul: 'Segera antar pesanan', isi: `Tinggal 30 menit sebelum ${fmtJam(o.ambilEnd)}. Mulai antar sekarang.`, at: t, cond: 'belumAntar', link: { view: 'tdash' } });
  } else {
    N({ aud: 'pembeli', jenis: 'ambil', key: `ord:${o.id}:start`, judul: 'Waktunya ambil pesanan', isi: `Pesananmu di ${toko} siap diambil sekarang sampai ${fmtJam(o.ambilEnd)}. Tunjukkan QR atau kode ${o.code}.`, at: Math.max(now, o.ambilStart), cond: 'dipesan' });
    const t = o.ambilEnd - 30 * 60000; if (t > Math.max(now, o.ambilStart)) N({ aud: 'pembeli', jenis: 'ambil', key: `ord:${o.id}:last`, judul: 'Tinggal 30 menit lagi', isi: `Ambil pesananmu di ${toko} sebelum ${fmtJam(o.ambilEnd)} atau pesanan hangus.`, at: t, cond: 'dipesan' });
  }
  N({ aud: 'pembeli', jenis: 'order', key: `ord:${o.id}:hangus`, judul: 'Pesanan hangus', isi: `Jendela Ambil ${o.judul} di ${toko} sudah berakhir dan pesanan tidak diambil.`, at: o.ambilEnd + 1000, cond: 'hangus' });
}
const condOk = (state, n) => {
  if (!n.cond) return true; const o = state.orders.find(x => x.id === n.orderId); if (!o) return false;
  if (n.cond === 'dipesan') return o.status === STATUS.DIPESAN;
  if (n.cond === 'hangus') return o.status === STATUS.HANGUS;
  if (n.cond === 'belumAntar') return o.status === STATUS.DIPESAN && !(o.kirim && o.kirim.tahap === KIRIM.DIANTAR);
  if (n.cond === 'diantar') return o.status === STATUS.DIPESAN && !!(o.kirim && o.kirim.tahap === KIRIM.DIANTAR);
  return true;
};
// Ambil notifikasi yang jatuh tempo untuk audiens (pembeli / toko tertentu). Yang syaratnya sudah tidak berlaku dibuang diam-diam;
// yang dimatikan lewat pengaturan tetap tersimpan sebagai sudah dibaca.
export function collectDue(state, now, aud, storeId = null) {
  expireOrders(state, now);
  const out = [];
  for (const n of state.notifs || []) {
    if (n.delivered || n.at > now || n.aud !== aud || (aud === 'toko' && n.storeId !== storeId)) continue;
    n.delivered = true;
    if (!condOk(state, n)) { n.batal = true; n.read = true; continue; }
    if (aud === 'pembeli' && PREF_OF[n.jenis] && state.buyer.prefs[PREF_OF[n.jenis]] === false) { n.read = true; n.dimatikan = true; continue; }
    out.push(n);
  }
  return out;
}
export const visibleNotifs = (state, aud, storeId = null) => (state.notifs || []).filter(n => n.delivered && !n.batal && !n.dimatikan && n.aud === aud && (aud !== 'toko' || n.storeId === storeId)).sort((a, b) => b.at - a.at || b.id.localeCompare(a.id));
export const unreadCount = (state, aud, storeId = null) => visibleNotifs(state, aud, storeId).filter(n => !n.read).length;
export function pendingNotifs(state, aud, storeId, now) { return (state.notifs || []).filter(n => !n.delivered && n.at > now && n.aud === aud && (aud !== 'toko' || n.storeId === storeId)); }
export function markNotifs(state, aud, storeId, { id = null, all = false, clear = false } = {}) {
  for (const n of state.notifs || []) if (n.aud === aud && (aud !== 'toko' || n.storeId === storeId) && n.delivered && (all || n.id === id)) n.read = true;
  if (clear) state.notifs = state.notifs.filter(n => !(n.aud === aud && (aud !== 'toko' || n.storeId === storeId) && n.delivered));
}

// ---------- Pengantaran ----------
export const etaMenit = jarakKm => Math.ceil(Math.max(0, jarakKm) / KURIR_KMH * 60) + KURIR_BUFFER_MENIT;
function deliveryOrder(state, storeId, orderId) {
  const o = state.orders.find(x => x.id === orderId && x.storeId === storeId);
  if (!o) return { error: 'Pesanan tidak ditemukan di toko ini.' };
  if (o.metode !== METODE.ANTAR) return { error: 'Pesanan ini diambil sendiri oleh pembeli, bukan diantar.' };
  return { o };
}
export function siapkanPesanan(state, storeId, orderId, now) {
  const { o, error } = deliveryOrder(state, storeId, orderId); if (error) return { ok: false, error };
  expireOrders(state, now);
  if (o.status !== STATUS.DIPESAN) return { ok: false, error: `Pesanan sudah ${o.status.toLowerCase()}.` };
  if (o.kirim.tahap !== KIRIM.MENUNGGU) return { ok: false, error: 'Pesanan sudah disiapkan.' };
  o.kirim.tahap = KIRIM.DISIAPKAN; o.kirim.disiapkanAt = now;
  pushNotif(state, { aud: 'pembeli', jenis: 'antar', key: `ord:${o.id}:prep`, judul: 'Pesananmu sedang disiapkan', isi: `${storeName(state, o.storeId)} sedang menyiapkan ${o.judul} untuk diantar.`, at: now, orderId: o.id, link: { view: 'order', id: o.id } });
  return { ok: true, order: o };
}
export function mulaiAntar(state, storeId, orderId, now) {
  const { o, error } = deliveryOrder(state, storeId, orderId); if (error) return { ok: false, error };
  expireOrders(state, now);
  if (o.status !== STATUS.DIPESAN) return { ok: false, error: `Pesanan sudah ${o.status.toLowerCase()}.` };
  if (o.kirim.tahap === KIRIM.DIANTAR) return { ok: false, error: 'Pesanan sudah dalam pengantaran.' };
  if (now < o.ambilStart) return { ok: false, error: `Pengantaran baru bisa dimulai pukul ${fmtJam(o.ambilStart)} (awal Jendela Ambil).` };
  const menit = etaMenit(o.jarakKm), eta = now + menit * 60000;
  if (eta > o.ambilEnd) return { ok: false, error: `Perkiraan tiba ${fmtJam(eta)} melewati batas Jendela Ambil ${fmtJam(o.ambilEnd)}. Pengantaran harus dimulai lebih awal.` };
  o.kirim = { ...o.kirim, tahap: KIRIM.DIANTAR, berangkatAt: now, etaAt: eta, etaMenit: menit };
  const N = x => pushNotif(state, { aud: 'pembeli', jenis: 'antar', orderId: o.id, link: { view: 'order', id: o.id }, ...x });
  N({ key: `ord:${o.id}:go`, judul: 'Pesananmu dalam pengantaran', isi: `${storeName(state, o.storeId)} sedang mengantar ke ${o.alamat}. Perkiraan tiba ${fmtJam(eta)} (±${menit} menit). Siapkan kode ${o.code}.`, at: now });
  if (menit > 4) N({ key: `ord:${o.id}:near`, judul: 'Kurir hampir tiba', isi: 'Pesananmu tinggal beberapa menit lagi. Siapkan QR atau kode ambil.', at: eta - 2 * 60000, cond: 'diantar' });
  N({ key: `ord:${o.id}:arrive`, judul: 'Kurir sudah tiba', isi: `Kurir ${storeName(state, o.storeId)} tiba di alamatmu. Tunjukkan QR atau kode ${o.code}.`, at: eta, cond: 'diantar' });
  return { ok: true, order: o };
}

// ---------- Pengajuan merchant ----------
export function validateApplication(input, state) {
  const errors = [], t = k => String(input[k] ?? '').trim();
  if (t('nama').length < 3 || t('nama').length > 60) errors.push('Nama usaha 3–60 karakter.');
  if (!JENIS_USAHA.includes(t('jenis'))) errors.push('Pilih jenis usaha.');
  if (t('alamat').length < 10 || t('alamat').length > 200) errors.push('Alamat lengkap 10–200 karakter.');
  if (!AREAS.some(a => a.nama === t('area'))) errors.push('Pilih area usaha.');
  if (!/^(\+62|62|0)8\d{7,12}$/.test(t('telp').replace(/[\s-]/g, ''))) errors.push('Nomor HP/WhatsApp tidak valid (contoh 081234567890).');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t('jamTutup'))) errors.push('Isi jam tutup toko (JJ:MM).');
  if (t('deskripsi').length > 200) errors.push('Deskripsi maksimal 200 karakter.');
  if (!inSurabaya(Number(input.lat), Number(input.lng))) errors.push('Lokasi usaha harus di Surabaya. Pakai lokasi saat ini atau pilih area.');
  if (input.setuju !== true) errors.push(`Centang persetujuan biaya aplikasi ${Math.round(APP_FEE * 100)}% dan aturan produk sisa hari yang sama.`);
  if (state) {
    const nm = t('nama').toLowerCase();
    if (state.stores.some(s => s.nama.toLowerCase() === nm) || (state.applications || []).some(a => a.status === 'Menunggu' && a.nama.toLowerCase() === nm)) errors.push('Nama usaha ini sudah terdaftar atau sedang diajukan.');
  }
  return { ok: errors.length === 0, errors };
}
export function submitApplication(state, input, now) {
  const v = validateApplication(input, state); if (!v.ok) return { ok: false, errors: v.errors, error: v.errors[0] };
  const t = k => String(input[k] ?? '').trim();
  const app = { id: 'A' + state.meta.nextAppId++, nama: t('nama'), jenis: t('jenis'), alamat: t('alamat'), area: t('area'), telp: t('telp').replace(/[\s-]/g, ''), jamTutup: t('jamTutup'), deskripsi: t('deskripsi'), lat: Number(input.lat), lng: Number(input.lng), lokasiSumber: input.lokasiSumber === 'gps' ? 'gps' : 'area', pemohon: state.buyer.nama, status: 'Menunggu', createdAt: now };
  state.applications.push(app);
  return { ok: true, application: app };
}
export function decideApplication(state, appId, setuju, now) {
  const a = state.applications.find(x => x.id === appId); if (!a) return { ok: false, error: 'Pengajuan tidak ditemukan.' };
  if (a.status !== 'Menunggu') return { ok: false, error: `Pengajuan sudah ${a.status.toLowerCase()}.` };
  a.decidedAt = now;
  if (setuju) {
    const id = 's' + state.meta.nextStoreId++;
    state.stores.push({ id, nama: a.nama, area: a.area, jarakKm: 3, lat: a.lat, lng: a.lng, alamat: a.alamat, demo: false, merchant: true, jenis: a.jenis, telp: a.telp, jamTutup: a.jamTutup });
    a.status = 'Disetujui'; a.storeId = id;
  } else a.status = 'Ditolak';
  pushNotif(state, { aud: 'pembeli', jenis: 'merchant', key: `app:${a.id}`, judul: setuju ? 'Pengajuan merchant disetujui' : 'Pengajuan merchant ditolak', isi: setuju ? `${a.nama} kini terdaftar. Pilih toko ini di layar Ganti Peran untuk mulai menjual.` : `Pengajuan ${a.nama} belum bisa disetujui (keputusan demo).`, at: now, link: { view: 'profile', tab: 'mer' } });
  return { ok: true, application: a };
}

export function computeImpact(state) {
  const taken = state.orders.filter(o => o.status === STATUS.DIAMBIL);
  const unit = taken.reduce((a, o) => a + o.qty, 0);
  const rupiah = taken.reduce((a, o) => a + (Number.isFinite(o.subtotal) ? o.subtotal : o.total), 0);
  const kg = unit * IMPACT_PARAMS.kgPerUnit;
  const co2Kg = Math.round(kg * IMPACT_PARAMS.co2PerKg * 10) / 10;
  return {
    unit, rupiah, kg: Math.round(kg * 10) / 10, co2Kg, orders: taken.length,
    params: IMPACT_PARAMS, sumber: IMPACT_PARAMS.sumber,
    catatan: 'Angka CO2 adalah estimasi dari parameter demo; hanya dihitung dari pesanan berstatus Diambil.',
  };
}

// Pemeriksaan bentuk data hasil muat dari penyimpanan (data rusak -> false).
export function isValidState(s) {
  return !!s && Array.isArray(s.stores) && Array.isArray(s.listings) && Array.isArray(s.orders) && !!s.meta &&
    Number.isFinite(s.meta.offsetMs) && Number.isInteger(s.meta.nextListingId) && Number.isInteger(s.meta.nextOrderId) &&
    s.listings.every(l => l && typeof l.id === 'string' && Number.isFinite(l.stok) && Number.isFinite(l.harga)) &&
    s.orders.every(o => o && typeof o.code === 'string' && typeof o.status === 'string');
}
