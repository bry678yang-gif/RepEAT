import { STATUS, TIPE, METODE, BAYAR, KIRIM, APP_FEE, JENIS_USAHA, AREAS, KODE_PREFIX, MAKS_CATATAN, MAKS_FOTO_CHAR, VOUCHER_KATALOG, activeListings, createListing, deleteListing, setListingFoto, placeOrder, priceBreakdown, verifyCode, parseCodeInput, expireOrders, computeImpact, todayAt, updateBuyer, addVoucher, nearestArea, haversineKm, titleOf, feeOf, netOf, etaMenit, recommendations, reorderPlan, collectDue, visibleNotifs, unreadCount, pendingNotifs, markNotifs, siapkanPesanan, mulaiAntar, submitApplication, decideApplication, sellerEarnings } from './logic.js';
import { load, save, reset, loadUi, saveUi } from './store.js';
import { art, kindFor, icon } from './art.js';
import { qrSvg } from './qr.js';
import { decodeQR } from './qrdecode.js';
import * as NT from './notify.js';

const app = document.getElementById('app');
const scanEl = document.getElementById('scan');
const HOUR = 3600000;
const loaded = load(Date.now());
let state = loaded.state;
let corrupt = loaded.status === 'corrupt';
let noStorage = loaded.status === 'nostorage';
let ui = loadUi();
let view = ui.role === 'toko' ? { name: 'tdash' } : ui.role === 'pembeli' ? { name: 'home' } : { name: 'role' };
let flash = null, draft = null, menuOpen = false, sheet = null, co = null, pd = null, md = null, geoBusy = false;
let permState = { lokasi: 'prompt', kamera: 'prompt', notifikasi: 'prompt' };
const aud = () => ui.role === 'toko' ? 'toko' : ui.role === 'pembeli' ? 'pembeli' : null;
let q = '', qd = '', ftipe = 'semua', sortBy = 'jarak', cat = 'semua', selId = null, dashIdx = 0;
const qty = {};

const now = () => Date.now() + state.meta.offsetMs;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp' + Number(n).toLocaleString('id-ID');
const p2 = n => String(n).padStart(2, '0');
const jam = ms => { const d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
const range = (a, b) => `${jam(a)}–${jam(b)}`;
const km = n => n.toLocaleString('id-ID') + ' km';
const storeOf = id => state.stores.find(s => s.id === id);
const badgeCls = st => st === STATUS.DIPESAN ? 'o' : st === STATUS.HANGUS ? 'r' : '';
const kOf = x => kindFor(x.tipe || x.type, x.judul || x.nama);
const thumb = (kind, extra = '') => `<div class="thumb ${extra}">${art(kind)}</div>`;
// Gambar produk: foto unggahan penjual (data URL) bila ada, kalau tidak ilustrasi SVG.
const thumbOf = (x, extra = '') => x.foto ? `<div class="thumb ${extra}"><img src="${esc(x.foto)}" alt=""></div>` : thumb(kOf(x), extra);
const fotoOf = o => { const l = state.listings.find(x => x.id === o.listingId); return l ? l.foto : null; };
const orderThumb = (o, extra = '') => thumbOf({ foto: fotoOf(o), type: o.type, judul: o.judul }, extra);
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const CAT_LABEL = { item: 'Makanan', kejutan: 'Paket Kejutan' };
const PAY_LABEL = { kartu: 'Kartu', qris: 'QRIS', tunai: 'Tunai' };
const TERMS = 'Hanya produk sisa hari yang sama dan belum kedaluwarsa yang boleh dijual. Produk harus diambil pada Jendela Ambil. (Kejelasan aturan hukum pangan masih menunggu konsultasi.)';
const DISC = 'Nama merek, produk, harga, dan jarak di sini hanya ilustrasi untuk demo lomba; belum ada kerja sama dengan merek tersebut.';
const ago = ms => { const m = Math.max(0, Math.round((now() - ms) / 60000)); return m < 60 ? `${m} mnt lalu` : `${Math.floor(m / 60)} jam lalu`; };

let toastTimer;
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }
function flashHtml() { return flash ? `<div class="${flash.ok ? 'okbox' : 'err'}" id="flash" role="alert">${flash.html ?? esc(flash.msg)}</div>` : ''; }

// ---------- Riwayat navigasi: tombol Back (HP/peramban) kembali ke tab sebelumnya, bukan keluar aplikasi ----------
const ROLE_VIEWS = { pembeli: ['home', 'detail', 'confirm', 'order', 'orders', 'impact', 'stores', 'profile', 'notifs', 'izin', 'diag'], toko: ['tdash', 'tcreate', 'impact', 'notifs', 'izin', 'diag'] };
const guardView = v => (ui.role && v && ROLE_VIEWS[ui.role].includes(v.name)) ? v : ui.role === 'toko' ? { name: 'tdash' } : ui.role === 'pembeli' ? { name: 'home' } : { name: 'role' };
const histDepth = () => (history.state && history.state.d) || 0;
const inOverlay = () => !!(history.state && history.state.ov);
history.replaceState({ v: view, d: histDepth(), ov: 0 }, '');

function go(name, params = {}, opt = {}) {
  const next = { name, ...params };
  const same = JSON.stringify(next) === JSON.stringify(view) && !inOverlay();
  closeScannerUi();
  const d = histDepth();
  if (opt.replace || inOverlay()) history.replaceState({ v: next, d: inOverlay() ? Math.max(0, d - 1) : d, ov: 0 }, '');
  else if (!same) history.pushState({ v: next, d: d + 1, ov: 0 }, '');
  view = next; flash = null; menuOpen = false; sheet = null; render(); window.scrollTo(0, 0);
}
function openOverlay(kind) { history.pushState({ v: view, d: histDepth() + 1, ov: kind }, ''); }
function closeOverlay() { if (inOverlay()) history.back(); else { menuOpen = false; sheet = null; flash = null; closeScannerUi(); render(); } }
window.addEventListener('popstate', e => {
  closeScannerUi(); menuOpen = false; sheet = null; flash = null;
  view = guardView(e.state && e.state.v); render(); window.scrollTo(0, 0);
});

const nUnread = () => aud() ? unreadCount(state, aud(), ui.storeId) : 0;
const bell = () => { if (!aud()) return ''; const n = nUnread(); return `<button class="ib bellb" data-act="notifs" data-testid="header-notifications-btn" aria-label="Notifikasi${n ? `, ${n} belum dibaca` : ''}">${icon('bell')}${n ? `<i class="bdg" data-testid="header-notifications-badge">${n > 9 ? '9+' : n}</i>` : ''}</button>`; };
const PERM_INFO = { lokasi: ['pin', 'Lokasi', 'Menghitung jarak toko dan ongkir dari posisimu di Surabaya.'], kamera: ['camera', 'Kamera', 'Scan QR Kode Ambil (dipakai toko saat serah terima).'], notifikasi: ['bell', 'Notifikasi', 'Pengingat jam ambil, status pengantaran, dan produk favorit tersedia.'] };
const ICON_N = { favorit: 'bag', ambil: 'clock', antar: 'truck', order: 'list', merchant: 'store2' };
function permRows() {
  return NT.PERM_KINDS.map(k => {
    const [ic, nm, why] = PERM_INFO[k], st = permState[k];
    const ctl = st === 'granted' ? '<span class="badge g">Aktif</span>' : st === 'denied' ? '<span class="badge r">Diblokir</span>' : st === 'unsupported' ? '<span class="badge">Tidak tersedia</span>'
      : `<button class="pill" data-act="reqPerm" data-k="${k}" data-testid="permission-allow-btn-${k}">Izinkan</button>`;
    const h = st === 'granted' ? '' : NT.hint(k, st);
    return `<div class="perm" data-testid="permission-row-${k}" data-state="${st}"><div class="ni">${icon(ic)}</div><div><b>${nm}</b><small>${why}</small></div>${ctl}</div>${h ? `<p class="hint bad permh" data-testid="permission-hint-${k}">${esc(h)}</p>` : ''}`;
  }).join('');
}

const header = (right = '<span class="dp">DEMO</span>', back = false) => `<header class="top">${back
  ? `<button class="ib" data-act="back" data-testid="header-back-btn" aria-label="Kembali">${icon('back')}</button>`
  : `<button class="ib" data-act="menu" data-testid="header-menu-btn" aria-label="Menu">${icon('menu')}<i class="dot"></i></button>`}<div class="logo"><img src="logo.svg" alt="RepEAT"></div><div class="hbtns">${bell()}${right}</div></header>`;

function overlays() {
  let h = '';
  if (menuOpen) h += `<div class="ov t" data-act="menuClose" data-testid="menu-overlay"><div class="mn" data-stop="1"><div class="mm">MODE DEMO · jam simulasi ${jam(now())}${state.meta.offsetMs ? ' (dimajukan)' : ''}${noStorage ? ' · penyimpanan perangkat tidak tersedia' : ''}</div>
    ${ui.role === 'pembeli' ? `<button class="mi" data-act="profile" data-testid="menu-profile-btn">Profil &amp; Pengaturan</button>` : ''}${ui.role === 'pembeli' ? `<button class="mi" data-act="applyMer" data-testid="menu-merchant-btn">Daftar Jadi Merchant</button>` : ''}<button class="mi" data-act="notifs" data-testid="menu-notifications-btn">Notifikasi</button><button class="mi" data-act="izin" data-testid="menu-permissions-btn">Izin Aplikasi</button><button class="mi" data-act="roles" data-testid="menu-roles-btn">Ganti peran</button><button class="mi" data-act="advance" data-testid="menu-advance-btn">Majukan jam 1 jam</button><button class="mi" data-act="reset" data-testid="menu-reset-btn">Reset demo</button></div></div>`;
  if (sheet === 'verify') h += `<div class="ov b" data-act="sheetClose" data-testid="verify-sheet-overlay"><div class="sh" data-stop="1"><h3>Verifikasi Kode Ambil</h3><label class="lab" for="kode">Kode dari pembeli</label>
    <input class="in" id="kode" data-testid="verify-sheet-code-input" autocapitalize="characters" autocomplete="off" maxlength="12" placeholder="mis. K7H2PQ">${flashHtml()}
    <div class="bb" style="padding:0;margin-top:1.4rem"><button class="bt f" data-act="verify" data-testid="verify-sheet-submit-btn">Verifikasi</button><button class="bt o" data-act="scan" data-testid="verify-sheet-scan-btn">Scan QR</button></div></div></div>`;
  if (sheet === 'izin') h += `<div class="ov b" data-act="sheetClose" data-testid="permission-sheet-overlay"><div class="sh" data-stop="1"><h3>Izinkan Akses Aplikasi</h3><p class="hint" style="margin:0 0 1.2rem">Supaya jarak, scan QR, dan pengingat berfungsi. Kamu bisa mengubahnya kapan saja di menu Izin Aplikasi.</p>${permRows()}
    <div class="bb" style="padding:0;margin-top:1rem"><button class="bt f" data-act="reqAll" data-testid="permission-sheet-allow-all-btn">Izinkan Semua</button><button class="bt o" data-act="sheetClose" data-testid="permission-sheet-later-btn">Nanti Saja</button></div></div></div>`;
  return h;
}

function page(body, navKey) {
  const nav = ui.role === 'pembeli' ? [['home', 'Beranda', 'home'], ['stores', 'Toko', 'store'], ['orders', 'Pesanan', 'list'], ['impact', 'Dampak', 'leaf']]
    : ui.role === 'toko' ? [['tdash', 'Pesanan', 'list'], ['tcreate', 'Buat', 'plus'], ['impact', 'Dampak', 'leaf']] : [];
  return `<div class="pg">${body}</div>${nav.length ? `<nav class="nav">${nav.map(([k, l, i]) => `<button class="nv ${k === navKey ? 'on' : ''}" data-act="nav" data-to="${k}" data-testid="bottom-nav-tab-${k}">${icon(i)}${l}</button>`).join('')}</nav>` : ''}${overlays()}`;
}

// ---------- Pencarian detail: semua kata harus cocok di nama produk, toko, area/lokasi, kategori, harga, atau jarak ----------
const haystack = l => [l.judul, l.tokoNama, l.area, 'surabaya', CAT_LABEL[l.tipe], l.tipe === 'kejutan' ? 'kantong surprise misteri' : 'item pilihan', String(l.harga), rp(l.harga), km(l.jarakKm)].join(' ').toLowerCase();
function matchQ(l, text) {
  const toks = String(text).toLowerCase().split(/\s+/).filter(Boolean).map(t => /^(rp)?\.?[\d.]+$/.test(t) ? t.replace(/^rp\.?/, '').replace(/\./g, '') : t);
  if (!toks.length) return true;
  const h = haystack(l) + ' ' + String(l.harga); return toks.every(t => h.includes(t));
}
function filtered() {
  let list = activeListings(state, now()).filter(l => ftipe === 'semua' || l.tipe === ftipe).filter(l => matchQ(l, q));
  if (sortBy === 'harga') list.sort((a, b) => a.harga - b.harga);
  return list;
}
const curQ = l => Math.min(Math.max(qty[l.id] || 1, 1), l.stok);
const searchBar = (extra = '', ph = 'Cari produk, toko, atau lokasi') => `<div class="search">${icon('search')}<input id="q" data-testid="${view.name}-search-input" placeholder="${ph}" value="${esc(q)}" autocomplete="off" enterkeyhint="search">${q ? `<button class="ib" data-act="clearQ" data-testid="${view.name}-search-clear-btn" aria-label="Hapus pencarian">${icon('x')}</button>` : ''}${extra}</div>`;

const V = {};
V.corrupt = () => `<header class="top"><div class="logo"><img src="logo.svg" alt="RepEAT"></div><span class="dp">DEMO</span></header><h2 class="tt">Data Lokal Rusak</h2><p class="hp">Data di perangkat tidak bisa dibaca. Reset demo akan memuat ulang data contoh.</p><button class="bt f w" data-act="reset" data-force="1" data-testid="corrupt-reset-btn">Reset demo</button>`;

V.role = () => page(`${header()}
  <div class="hw">${thumb('bag')}<span class="bd l">${icon('pin')}</span><span class="bd r">${icon('bag')}</span></div>
  <h1 class="hd">Selamatkan yang <em>manis</em> sebelum tutup!</h1>
  <p class="hp">Pilih peran untuk memulai demo, tanpa login. Data dan pembayaran di aplikasi ini adalah simulasi.</p>
  <div class="card" style="margin-top:20px"><b>Saya Pembeli</b><p class="mu">Cari paket dan item sisa dengan harga miring, lalu ambil di toko atau minta diantar.</p><button class="bt f w" style="margin:0;width:100%" data-act="pickRole" data-role="pembeli" data-testid="role-buyer-btn">Masuk sebagai Pembeli</button></div>
  <div class="card"><b>Saya Toko</b><p class="mu">Unggah sisa produk menjelang tutup, antar pesanan, dan verifikasi Kode Ambil.</p>
  <label class="lab" for="storeSel">Pilih toko</label><select class="in" id="storeSel" data-testid="role-store-select">${state.stores.map(s => `<option value="${s.id}" ${s.id === ui.storeId ? 'selected' : ''}>${esc(s.nama)}</option>`).join('')}</select>
  <button class="bt o w" style="margin:12px 0 0;width:100%" data-act="pickRole" data-role="toko" data-testid="role-seller-btn">Masuk sebagai Toko</button>
  <p class="hint" style="margin-top:1.2rem">Belum punya toko di sini? <button class="la" style="height:2.4rem;margin-left:0.4rem" data-act="applyMer" data-testid="role-apply-merchant-btn">Ajukan Jadi Merchant</button></p></div>`, null);

function locbarHtml() {
  const b = state.buyer, ps = permState.lokasi, T = 'home-location-bar';
  if (ps === 'denied') return `<div class="locbar warn" data-testid="${T}">${icon('pin')}<span>Izin lokasi diblokir, jadi jarak memakai data contoh. Aktifkan lewat Pengaturan perangkat.</span><button class="la" data-act="izin" data-testid="home-location-help-btn">Cara</button></div>`;
  if (Number.isFinite(b.lat)) {
    const na = nearestArea(b.lat, b.lng), stale = b.lokasiAt && Date.now() - b.lokasiAt > 10 * 60000;
    return b.lokasiOk
      ? `<div class="locbar" data-testid="${T}">${icon('pin')}<span>Lokasi ${stale ? 'terakhir' : 'aktif'}: dekat <b>${esc(na.area.nama)}</b>${b.akurasi ? ` (±${b.akurasi} m)` : ''}. Jarak dihitung dari posisimu.</span></div>`
      : `<div class="locbar warn" data-testid="${T}">${icon('pin')}<span>Posisimu di luar Surabaya, jadi jarak toko memakai data contoh.</span></div>`;
  }
  if (ps === 'granted') return `<div class="locbar" data-testid="${T}">${icon('pin')}<span>Mencari lokasimu…</span></div>`;
  return `<div class="locbar off" data-testid="${T}">${icon('pin')}<span>Aktifkan lokasi agar jarak dan ongkir sesuai posisimu.</span><button class="la" data-act="reqPerm" data-k="lokasi" data-testid="home-location-enable-btn">Aktifkan</button></div>`;
}

V.home = () => {
  const list = filtered(), b = state.buyer, recs = recommendations(state, now());
  const rows = list.map(l => `<div class="row" data-act="detail" data-id="${esc(l.id)}" data-testid="home-listing-row-${esc(l.id)}">${thumbOf(l)}
    <div><b>${esc(l.judul)}</b><small>${esc(l.tokoNama)} · ${km(l.jarakKm)}</small><div class="pr"><span class="p">${rp(l.harga)}</span><button class="pill" data-act="quick" data-id="${esc(l.id)}" data-testid="home-order-btn-${esc(l.id)}">Pesan</button></div></div>
    <div class="stp"><button data-act="qup" data-id="${esc(l.id)}" data-testid="home-qty-up-btn-${esc(l.id)}" aria-label="Tambah">${icon('up')}</button><span>${curQ(l)}</span><button data-act="qdn" data-id="${esc(l.id)}" data-testid="home-qty-down-btn-${esc(l.id)}" aria-label="Kurangi">${icon('down')}</button></div></div>`).join('');
  const chip = (k, l) => `<button class="chip ${ftipe === k ? 'on' : ''}" data-act="ftipe" data-k="${k}" data-testid="home-filter-chip-${k}">${l}</button>`;
  const recHtml = recs.length ? `<div class="sec-h" style="margin-top:1.8rem">${icon('list')}Pesan Lagi</div><p class="sub-t" style="margin-top:-0.4rem;margin-bottom:0.8rem">Produk yang pernah kamu beli dan sedang tersedia.</p>
    <div class="rec" data-testid="home-reorder-list">${recs.map(r => `<div class="rc" data-testid="home-reorder-card-${esc(r.listing.id)}">${thumbOf(r.listing)}<div><b>${esc(r.listing.judul)}</b><small>${esc(r.listing.tokoNama)} · ${km(r.listing.jarakKm)}</small><small>Sudah ${r.kali}× kamu beli</small></div>
      <div class="pr2"><span class="p">${rp(r.listing.harga)}</span><button class="pill" data-act="recOrder" data-id="${esc(r.listing.id)}" data-n="${r.qty}" data-testid="home-reorder-btn-${esc(r.listing.id)}">Pesan Lagi</button></div></div>`).join('')}</div>` : '';
  return page(`<header class="top"><button class="ib" data-act="menu" data-testid="header-menu-btn" aria-label="Menu">${icon('menu')}<i class="dot"></i></button>
    <div class="hbtns">${bell()}<button class="user" data-act="profile" data-testid="home-profile-btn" aria-label="Buka profil dan pengaturan"><div><b>${esc(b.nama)}</b><small>Surabaya · MODE DEMO</small></div><div class="av">${esc(initials(b.nama))}</div></button></div></header>
  ${searchBar(`<button class="ib" data-act="sort" data-testid="home-sort-btn" aria-label="Urutkan">${icon('sliders')}</button>`)}
  ${locbarHtml()}
  <div class="hw">${thumb('bag')}<span class="bd l">${icon('pin')}</span><span class="bd r">${icon('bag')}</span></div>
  <h1 class="hd">Selamatkan yang <em>manis</em> sebelum tutup!</h1>
  <p class="hp">Roti dan donat sisa hari ini dari toko di Surabaya, dengan harga miring. Data dan pembayaran adalah demo.</p>
  <button class="pill m" data-act="scrollList" data-testid="home-scroll-list-btn">Lihat daftar</button>
  ${recHtml}
  <div class="chips">${chip('semua', 'Semua')}${chip('kejutan', 'Paket Kejutan')}${chip('item', 'Makanan')}</div>
  <div class="lh" id="list"><h2>${list.length} Listing</h2><button class="sort" data-act="sort" data-testid="home-sort-toggle-btn">${sortBy === 'harga' ? 'Termurah' : 'Terdekat'} ${icon('down')}</button></div>
  ${q.trim() ? `<p class="sub-t" style="margin-top:-0.4rem">Hasil untuk “${esc(q.trim())}”: dicocokkan ke nama produk, toko, lokasi, kategori, dan harga.</p>` : ''}
  ${rows || '<div class="card mu">Belum ada listing yang cocok. Coba kata kunci lain (mis. nama toko, area seperti “Tunjungan”, atau “donat”), atau Majukan jam / Reset demo.</div>'}<p class="disc">${esc(DISC)}</p>`, 'home');
};

V.detail = () => {
  const all = activeListings(state, now()), act = all.find(x => x.id === view.id);
  if (!act) return page(`${header()}<h2 class="tt">Listing Tidak Tersedia</h2><p class="hp">Stok habis atau waktu jual sudah berakhir.</p><button class="bt f w" data-act="nav" data-to="home" data-testid="detail-back-list-btn">Kembali ke daftar</button>`, 'home');
  const kej = act.tipe === TIPE.KEJUTAN, n = Math.min(Math.max(view.n || 1, 1), act.stok);
  const more = all.filter(x => x.id !== act.id).map(l => `<div class="it" data-act="detail" data-id="${esc(l.id)}" data-testid="detail-also-item-${esc(l.id)}">${thumbOf(l)}<div><b style="font-size:1.2rem">${esc(l.judul)}</b><small style="display:block;font-size:.7rem;color:var(--ol);font-weight:600">${esc(l.tokoNama)}</small>
    <div class="pr"><span class="p" style="font-size:1.25rem;font-weight:700">${rp(l.harga)}</span><button class="pill" data-act="detail" data-id="${esc(l.id)}" data-testid="detail-also-view-btn-${esc(l.id)}">Lihat</button></div></div></div>`).join('');
  return page(`<div class="dh"><header class="top"><button class="ib" data-act="back" data-testid="header-back-btn" aria-label="Kembali">${icon('back')}</button><span class="dp">DEMO</span></header><div class="big">${act.foto ? `<img src="${esc(act.foto)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : art(kOf(act))}</div></div>
  <div class="sheet"><div class="tr"><h1>${esc(act.judul)}</h1><span class="pp">${rp(act.harga)}</span></div>
  <div class="sub">${kej ? 'Paket Kejutan' : 'Makanan'} · ${esc(act.tokoNama)}</div>
  <div class="buy"><div class="qty"><button data-act="ddn" data-testid="detail-qty-down-btn" aria-label="Kurangi">${icon('minus')}</button><span id="qv">${n}</span><button data-act="dup" data-testid="detail-qty-up-btn" aria-label="Tambah">${icon('plus')}</button></div><button class="pill m" style="margin:0" data-act="toConfirm" data-id="${esc(act.id)}" data-testid="detail-order-btn">Pesan</button></div>
  <div class="tot">Total <b>${rp(act.harga * n)}</b> · pembayaran simulasi</div>${flashHtml()}
  <div class="meta"><span>${icon('bag')}Sisa ${act.stok}</span><span>${icon('pin')}${km(act.jarakKm)} · ${esc(act.area)}</span><span>${icon('list')}Ambil ${range(act.ambilStart, act.ambilEnd)}</span></div>
  <div class="card" style="margin:1.2rem 0 0" data-testid="detail-store-card"><div class="addr">${icon('pin')}<p><b>${esc(act.tokoNama)}</b><br>${esc(act.alamat || act.area)}${act.demo ? '<br><i>Titik cabang demo, bukan cabang nyata.</i>' : ''}</p></div>${Number.isFinite(act.lat) ? `<a class="la" style="margin-top:1rem;text-decoration:none" href="https://www.google.com/maps/dir/?api=1&destination=${act.lat},${act.lng}&travelmode=driving" target="_blank" rel="noopener" data-testid="detail-route-link">Lihat Rute</a>` : ''}</div>
  <h3 class="sec">Deskripsi</h3><p class="desc">${kej ? 'Kantong berisi sisa roti dan donat hari ini. Isi kantong dirahasiakan sampai pengambilan.' : `${esc(act.judul)} sisa hari ini dari ${esc(act.tokoNama)}.`} ${esc(TERMS)} ${esc(DISC)}</p>
  <h3 class="sec">Coba juga${more ? `<button class="la" data-act="nav" data-to="home" data-testid="detail-see-all-btn">Lihat Semua</button>` : ''}</h3><div class="also">${more || '<span class="mu">Belum ada listing lain.</span>'}</div></div>`, 'home');
};

// ---------- Checkout ----------
function startCheckout(id) { co = { id, metode: METODE.AMBIL, bayar: BAYAR.KARTU, catatan: '', voucher: '', vcode: '', vmsg: null, extra: {}, kartu: { nomor: '', exp: '', cvv: '' } }; }
const rowSum = (label, val, cls = '') => `<div class="sum ${cls}"><span>${label}</span><span>${val}</span></div>`;
const extraItems = () => Object.entries(co.extra || {}).filter(([, q]) => q > 0).map(([listingId, qty]) => ({ listingId, qty }));

V.confirm = () => {
  const l = state.listings.find(x => x.id === view.id);
  if (!l) return V.detail();
  if (!co || co.id !== l.id) startCheckout(l.id);
  const n = Math.min(Math.max(view.n || 1, 1), Math.max(l.stok, 1)), st = storeOf(l.storeId), b = state.buyer;
  const pb = priceBreakdown(state, l, n, { metode: co.metode, voucherCode: co.voucher, extraItems: extraItems() });
  const seg = (act, key, items, cur) => `<div class="seg" role="tablist">${items.map(([k, lab, ic]) => `<button role="tab" aria-selected="${cur === k}" class="${cur === k ? 'on' : ''}" data-act="${act}" data-k="${k}" data-testid="confirm-${key}-tab-${k}">${icon(ic)}${lab}</button>`).join('')}</div>`;
  const lines = [{ x: l, qty: n }, ...extraItems().map(e => ({ x: state.listings.find(z => z.id === e.listingId), qty: e.qty })).filter(e => e.x)];
  const itemsHtml = lines.map(({ x, qty }) => `<div class="rowc"><b>${esc(titleOf(x))} × ${qty}</b><span class="pp" style="font-size:1rem">${rp(x.harga * qty)}</span></div>`).join('');
  const t0 = now();
  const others = state.listings.filter(x => x.storeId === l.storeId && x.id !== l.id && x.stok > 0 && t0 >= x.jualStart && t0 < x.jualEnd);
  const addHtml = others.length ? `<div class="sec-h">${icon('plus')}Tambah Produk dari ${esc(st.nama)}</div><div class="card" style="margin-top:0" data-testid="confirm-extra-list">${others.map(x => { const q = (co.extra || {})[x.id] || 0; return `<div class="xrow">${thumbOf(x)}<div><b>${esc(titleOf(x))}</b><small>${rp(x.harga)} · sisa ${x.stok}</small></div><div class="q2"><button data-act="exDel" data-id="${esc(x.id)}" data-testid="confirm-extra-remove-btn-${esc(x.id)}" aria-label="Kurangi ${esc(titleOf(x))}" ${q ? '' : 'disabled'}>${icon('minus')}</button><span data-testid="confirm-extra-qty-${esc(x.id)}">${q}</span><button data-act="exAdd" data-id="${esc(x.id)}" data-testid="confirm-extra-add-btn-${esc(x.id)}" aria-label="Tambah ${esc(titleOf(x))}" ${q >= x.stok ? 'disabled' : ''}>${icon('plus')}</button></div></div>`; }).join('')}</div><p class="hint" style="margin:0.8rem 2.1rem 0">Produk tambahan harus dari toko yang sama, jadi semua diambil atau diantar bersama dengan satu kode.</p>` : '';

  const loc = b.lokasiOk ? 'Dihitung dari lokasimu di Surabaya.' : 'Jarak memakai data contoh. Aktifkan lokasi untuk jarak sebenarnya.';
  const kirim = co.metode === METODE.ANTAR
    ? `<div class="card" style="margin:1.2rem 2.1rem 0"><div class="addr">${icon('pin')}${b.alamat ? `<p><b>${esc(b.nama)}</b><br>${esc(b.alamat)}</p>` : '<p>Alamat belum diisi. Isi dulu di Profil agar pesanan bisa diantar.</p>'}</div>
       <button class="la" style="margin-top:1rem" data-act="profile" data-testid="confirm-address-edit-btn">${b.alamat ? 'Ubah Alamat' : 'Isi Alamat'}</button></div>
       <p class="hint" style="margin:0.8rem 2.1rem 0">Ongkir simulasi: Rp4.000 + Rp2.000/km (±${km(pb.jarak)}). ${esc(loc)} Estimasi tiba ±${etaMenit(pb.jarak)} menit setelah toko berangkat. Kode Ambil diverifikasi saat serah terima.</p>`
    : `<p class="hint" style="margin:1rem 2.1rem 0">Ambil sendiri di ${esc(st.nama)} (${esc(st.area)}), ${range(l.ambilStart, l.ambilEnd)}. Tanpa ongkir.</p>`;

  const vchips = state.buyer.vouchers.filter(v => !v.dipakai).map(v => `<button class="chip ${co.voucher === v.code ? 'on' : ''}" data-act="vPick" data-code="${esc(v.code)}" data-testid="confirm-voucher-chip-${esc(v.code)}">${esc(v.code)}</button>`).join('');
  const vinfo = co.voucher ? (pb.voucher ? `<p class="hint ok">${esc(pb.voucher.judul)} dipakai: hemat ${rp(pb.diskon)}.</p>` : `<p class="hint bad">${esc(pb.voucherError || 'Voucher tidak bisa dipakai.')}</p>`) : '';
  const vmsg = co.vmsg ? `<p class="hint ${co.vmsg.ok ? 'ok' : 'bad'}">${esc(co.vmsg.text)}</p>` : '';

  let panel = '';
  if (co.bayar === BAYAR.KARTU) panel = `<label class="lab" for="c_nomor">Nomor kartu</label><input class="in" id="c_nomor" data-testid="confirm-card-number-input" inputmode="numeric" autocomplete="off" maxlength="23" placeholder="4242 4242 4242 4242" value="${esc(co.kartu.nomor.replace(/(\d{4})(?=\d)/g, '$1 '))}">
      <div class="g2"><div><label class="lab" for="c_exp">Berlaku s/d</label><input class="in" id="c_exp" data-testid="confirm-card-expiry-input" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="BB/TT" value="${esc(co.kartu.exp)}"></div><div><label class="lab" for="c_cvv">CVV</label><input class="in" id="c_cvv" data-testid="confirm-card-cvv-input" type="password" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="123" value="${esc(co.kartu.cvv)}"></div></div>
      <p class="hint">Kartu SIMULASI. Coba 4242 4242 4242 4242, masa berlaku di masa depan, CVV 3 digit. Nomor kartu tidak disimpan (hanya 4 digit terakhir).</p>`;
  else if (co.bayar === BAYAR.QRIS) panel = `<div class="qpay"><div class="qrbox">${qrSvg(`QRIS-DEMO|${l.id}|${pb.total}`)}</div><b>${rp(pb.total)}</b><p class="hint" style="text-align:center">QRIS SIMULASI. Tidak ada uang yang dipindahkan. Ketuk tombol di bawah untuk menandai sudah dibayar.</p></div>`;
  else panel = `<div class="addr">${icon('cash')}<p>Bayar tunai ${co.metode === METODE.ANTAR ? 'ke kurir saat pesanan tiba' : 'ke toko saat mengambil'}. Siapkan uang pas <b>${rp(pb.total)}</b>.</p></div>`;
  const payLabel = co.bayar === BAYAR.KARTU ? `Bayar ${rp(pb.total)} (simulasi)` : co.bayar === BAYAR.QRIS ? 'Saya Sudah Bayar via QRIS (simulasi)' : 'Pesan, Bayar Tunai (simulasi)';

  return page(`${header('<span class="dp">DEMO</span>', true)}<h2 class="tt">Konfirmasi Pesanan</h2>
  <div class="card" data-testid="confirm-items">${itemsHtml}<div class="mu" style="margin-top:0.4rem">${esc(st.nama)}<br>Ambil ${range(l.ambilStart, l.ambilEnd)}</div><button class="la" style="margin-top:1rem" data-act="detail" data-id="${esc(l.id)}" data-testid="confirm-edit-qty-btn">Ubah Jumlah</button></div>
  ${addHtml}

  <div class="sec-h">${icon('truck')}Pengiriman &amp; Alamat</div>
  ${seg('setMetode', 'delivery', [[METODE.AMBIL, 'Ambil di Toko', 'store'], [METODE.ANTAR, 'Antar', 'truck']], co.metode)}${kirim}

  <div class="sec-h">${icon('list')}Catatan untuk Toko</div>
  <div class="fm"><textarea class="in" id="c_catatan" data-testid="confirm-notes-input" rows="3" maxlength="${MAKS_CATATAN}" placeholder="Mis. tanpa kacang, tolong hubungi saat tiba (opsional)">${esc(co.catatan)}</textarea></div>

  <div class="sec-h">${icon('ticket')}Voucher</div>
  <div class="fm"><div class="vrow"><input class="in" id="c_vcode" data-testid="confirm-voucher-input" autocapitalize="characters" autocomplete="off" maxlength="20" placeholder="Masukkan kode voucher" value="${esc(co.vcode)}"><button class="pill" data-act="vAdd" data-testid="confirm-voucher-add-btn">Tambah</button></div>${vmsg}
  <div class="chips wrap">${vchips || '<span class="mu">Belum ada voucher tersedia.</span>'}</div>${vinfo}<p class="hint">Kode contoh: SDG12, SELAMATKAN. Voucher tersimpan di Inventori (Profil).</p></div>

  <div class="sec-h">${icon('card')}Pembayaran</div>
  ${seg('setBayar', 'payment', [[BAYAR.KARTU, 'Kartu', 'card'], [BAYAR.QRIS, 'QRIS', 'qr'], [BAYAR.TUNAI, 'Tunai', 'cash']], co.bayar)}<div class="pnl">${panel}</div>

  <div class="card" style="margin-top:2rem">${rowSum(`Subtotal (${pb.units} item)`, rp(pb.subtotal))}${rowSum(co.metode === METODE.ANTAR ? 'Ongkir' : 'Ongkir (ambil sendiri)', rp(pb.ongkir))}${pb.diskon ? rowSum(`Voucher ${esc(pb.voucher.code)}`, '−' + rp(pb.diskon), 'g') : ''}${rowSum('Total', rp(pb.total), 't')}
  <div data-testid="confirm-fee-note">${rowSum(`Info: biaya aplikasi ${Math.round(APP_FEE * 100)}% (dipotong dari merchant)`, rp(pb.fee), 'mut')}</div></div>
  <div class="note"><b>Pembayaran SIMULASI.</b> Tidak ada uang sungguhan yang dipindahkan. Biaya aplikasi ditanggung merchant dan tidak menambah total kamu.</div>${flashHtml()}
  <button class="bt f w" data-act="pay" data-id="${esc(l.id)}" data-n="${n}" data-testid="confirm-pay-btn">${payLabel}</button>`, 'home');
};

function orderInfo(o, seller = false) {
  if (!o.metode) return '';
  const r = (a, b) => `<div class="sum"><span>${a}</span><span style="text-align:right;max-width:62%">${b}</span></div>`;
  const items = (o.items && o.items.length > 1) ? r('Produk', o.items.map(it => `${esc(it.judul)} ×${it.qty}`).join('<br>')) : '';
  const fee = seller ? `${r(`Biaya aplikasi (${Math.round(APP_FEE * 100)}%)`, '−' + rp(Number.isFinite(o.fee) ? o.fee : feeOf(o.total)))}${r('Diterima toko', `<b>${rp(Number.isFinite(o.net) ? o.net : netOf(o.total))}</b>`)}` : '';
  return `<div class="ob">${items}${r('Pengambilan', o.metode === METODE.ANTAR ? 'Diantar ke alamat' : 'Ambil di toko')}${o.metode === METODE.ANTAR ? r('Alamat', esc(o.alamat)) : ''}${o.catatan ? r('Catatan', esc(o.catatan)) : ''}
    ${r('Pembayaran', `${PAY_LABEL[o.bayar] || '-'}${o.kartu4 ? ' •••• ' + esc(o.kartu4) : ''} · ${esc(o.statusBayar || '')}`)}${o.voucher ? r('Voucher', esc(o.voucher)) : ''}${fee}</div>`;
}
const orderPrice = o => Number.isFinite(o.subtotal) ? `<div class="ob" style="margin-top:0.4rem">${rowSum('Subtotal', rp(o.subtotal))}${o.ongkir ? rowSum('Ongkir', rp(o.ongkir)) : ''}${o.diskon ? rowSum('Diskon voucher', '−' + rp(o.diskon), 'g') : ''}${rowSum('Total', rp(o.total), 't')}</div>` : '';
const etaText = k => { const m = Math.ceil((k.etaAt - now()) / 60000); return m > 0 ? `Tiba sekitar ${jam(k.etaAt)} (±${m} menit lagi)` : `Seharusnya sudah tiba (${jam(k.etaAt)})`; };

function tracking(o) {
  const t = now(), toko = storeOf(o.storeId).nama, done = o.status === STATUS.DIAMBIL, bad = o.status === STATUS.HANGUS;
  const mk = (cls, title, sub) => `<li class="${cls}"><span class="dt">${icon(cls === 'bad' ? 'x' : 'check')}</span><div>${title}${sub ? `<small>${sub}</small>` : ''}</div></li>`;
  const s = [mk('done', 'Pesanan dibuat', jam(o.createdAt))];
  if (o.metode === METODE.ANTAR) {
    const k = o.kirim || { tahap: KIRIM.MENUNGGU }, moving = k.tahap === KIRIM.DIANTAR;
    s.push(mk(k.tahap !== KIRIM.MENUNGGU || done ? 'done' : bad ? '' : 'now', 'Disiapkan toko', k.disiapkanAt ? jam(k.disiapkanAt) : done ? '' : 'Menunggu toko menyiapkan'));
    s.push(mk(done ? 'done' : moving ? 'now' : '', 'Dalam pengantaran', moving ? `Berangkat ${jam(k.berangkatAt)}. ${done ? '' : etaText(k) + '. Estimasi simulasi, bukan posisi kurir langsung.'}` : done ? '' : `Pengantaran dalam ${range(o.ambilStart, o.ambilEnd)}`));
    s.push(bad ? mk('bad', 'Hangus', 'Jendela Ambil berakhir sebelum pesanan diterima') : mk(done ? 'done' : '', 'Diterima', done ? jam(o.pickedAt) : 'Tunjukkan QR atau kode ke kurir'));
  } else {
    const open = t >= o.ambilStart;
    s.push(mk(done ? 'done' : bad ? '' : open ? 'now' : '', open || done ? 'Siap diambil' : 'Menunggu jam ambil', `${esc(toko)}, ${range(o.ambilStart, o.ambilEnd)}`));
    s.push(bad ? mk('bad', 'Hangus', 'Tidak diambil sampai batas waktu') : mk(done ? 'done' : '', 'Diambil', done ? jam(o.pickedAt) : 'Tunjukkan QR di toko'));
  }
  return `<ul class="trk" data-testid="order-tracking">${s.join('')}</ul>`;
}

V.order = () => {
  const o = state.orders.find(x => x.id === view.id);
  if (!o) return V.orders();
  const aktif = o.status === STATUS.DIPESAN, antar = o.metode === METODE.ANTAR;
  return page(`${header()}<h2 class="tt">Pesanan ${aktif ? (antar && o.kirim && o.kirim.tahap === KIRIM.DIANTAR ? 'Dalam Pengantaran' : 'Berhasil') : esc(o.status)}</h2>
  ${aktif ? `<div class="qrbox" data-testid="order-qr">${qrSvg(KODE_PREFIX + o.code)}</div><p class="qrcap">QR Kode Ambil dibuat otomatis. Tunjukkan ke ${antar ? 'kurir saat pesanan tiba' : 'toko untuk di-scan'}.</p>` : ''}
  <div class="code sm ${aktif ? '' : 'void'}" data-testid="order-code">${esc(o.code)}</div>
  <p class="mu" style="text-align:center;margin:0.8rem 2.1rem 0">${aktif ? 'Tidak bisa scan? Sebutkan kode di atas.' : 'Kode ini sudah tidak berlaku.'}</p>
  ${tracking(o)}
  <div class="card" style="margin-top:1.4rem"><div class="rowc"><b>${esc(o.judul)} × ${o.qty}</b><span class="badge ${badgeCls(o.status)}">${o.status}</span></div><div class="mu">${esc(storeOf(o.storeId).nama)}<br>Ambil ${range(o.ambilStart, o.ambilEnd)}</div>
  ${orderInfo(o)}${orderPrice(o) || `<div class="rowc" style="margin-top:8px"><span class="mu">Total (pembayaran simulasi)</span><b>${rp(o.total)}</b></div>`}
  <p class="hint">Biaya aplikasi ${Math.round(APP_FEE * 100)}% dipotong dari pembayaran ke merchant dan tidak menambah total kamu.</p></div>
  <div class="note">${esc(TERMS)} Pesanan yang tidak diambil sampai Jendela Ambil berakhir menjadi Hangus.</div>
  <button class="bt f w" data-act="reorder" data-id="${esc(o.id)}" data-testid="order-reorder-btn">Pesan Lagi</button><button class="bt o w" data-act="nav" data-to="orders" data-testid="order-see-all-btn">Lihat semua pesanan</button><button class="bt o w" data-act="nav" data-to="home" data-testid="order-back-list-btn">Kembali ke daftar</button>`, 'orders');
};

V.orders = () => {
  const list = [...state.orders].reverse().map(o => `<div class="row" data-act="openOrder" data-id="${esc(o.id)}" data-testid="orders-row-${esc(o.id)}">${orderThumb(o)}<div><b>${esc(o.judul)} × ${o.qty}</b><small>${esc(storeOf(o.storeId).nama)} · Kode ${esc(o.code)}${o.metode === METODE.ANTAR ? ' · Antar' : ''}</small><div class="pr"><span class="p">${rp(o.total)}</span><button class="pill" data-act="reorder" data-id="${esc(o.id)}" data-testid="orders-reorder-btn-${esc(o.id)}">Pesan Lagi</button></div></div><span class="badge ${badgeCls(o.status)}">${o.status}</span></div>`).join('');
  return page(`${header()}<h2 class="tt">Pesanan Saya</h2>${list || '<div class="card mu">Belum ada pesanan.</div>'}`, 'orders');
};

V.impact = () => {
  const i = computeImpact(state);
  return page(`${header()}<h2 class="tt">Dampak SDGs 12</h2><p class="sub-t">Dihitung hanya dari pesanan berstatus Diambil (${i.orders} pesanan).</p>
  <div class="grid"><div class="card"><div class="big">${i.unit}</div><div class="mu">kantong/porsi terselamatkan</div></div><div class="card"><div class="big" style="font-size:2.2rem">${rp(i.rupiah)}</div><div class="mu">nilai pesanan diambil</div></div></div>
  <div class="card" style="margin:1rem 2.1rem 0"><div class="big">${i.co2Kg.toLocaleString('id-ID')} kg</div><div class="mu">estimasi CO₂e terhindar (estimasi)</div></div>
  <div class="note">Parameter: ${i.params.kgPerUnit} kg makanan per kantong × ${i.params.co2PerKg} kg CO₂e per kg. ${esc(i.sumber)}</div>`, 'impact');
};

// ---------- Toko: kategori Makanan / Paket Kejutan ----------
V.stores = () => {
  const list = activeListings(state, now()).filter(l => cat === 'semua' || l.tipe === cat).filter(l => matchQ(l, q));
  const sel = list.some(l => l.id === selId) ? selId : (list[0] && list[0].id);
  const cats = [['item', 'Makanan', 'donut'], ['kejutan', 'Paket Kejutan', 'bag']].map(([k, lab, a]) => `<button class="cc ${cat === k ? 'on' : ''}" data-act="catPick" data-k="${k}" data-testid="stores-category-btn-${k}" aria-pressed="${cat === k}"><span class="ring2">${thumb(a)}</span>${lab}</button>`).join('');
  const pills = list.map(l => `<div class="pl ${l.id === sel ? 'on' : ''}" data-act="pill" data-id="${esc(l.id)}" data-testid="stores-listing-pill-${esc(l.id)}">${thumbOf(l)}<div><b>${esc(l.judul)}</b><small>${esc(l.tokoNama)}</small><div class="ic2"><span style="display:flex;gap:3px;align-items:center">${icon('pin')}${km(l.jarakKm)}</span><span style="display:flex;gap:3px;align-items:center">${icon('bag')}Sisa ${l.stok}</span></div></div><span class="p">${rp(l.harga)}</span></div>`).join('');
  const nm = cat === 'semua' ? 'Semua Produk' : CAT_LABEL[cat];
  return page(`${header()}${searchBar('', 'Cari produk, toko, atau lokasi')}<div class="cath"><h2 class="tt" style="margin:0">Kategori</h2><button class="la ${cat === 'semua' ? 'on' : ''}" data-act="catAll" data-testid="stores-see-all-btn">Lihat Semua</button></div>
  <div class="cat">${cats}</div>
  <div class="cath" style="margin:1.4rem 0 1rem"><b style="font-size:1.1rem">${esc(nm)}</b><span class="mu">${list.length} listing</span></div>${pills || '<div class="card mu">Tidak ada listing yang cocok dengan kategori atau pencarian ini.</div>'}`, 'stores');
};

// ---------- Profil pembeli: pengaturan, inventori voucher, merchant ----------
const newMd = () => ({ nama: '', jenis: JENIS_USAHA[0], alamat: '', area: AREAS[0].nama, telp: '', jam: '21:00', desk: '', setuju: false, gps: false, lat: null, lng: null, akurasi: null });

function merTab() {
  const apps = [...state.applications].reverse(), pending = apps.find(a => a.status === 'Menunggu'), pct = Math.round(APP_FEE * 100);
  const contoh = 25000, fee = feeOf(contoh);
  const feebox = `<div class="feebox" data-testid="merchant-fee-info"><h4>Biaya aplikasi ${pct}% per pembayaran</h4><p>Setiap pembayaran pembeli dipotong <b>${pct}%</b> sebagai biaya aplikasi (termasuk ongkir bila diantar). Pembeli tidak membayar biaya tambahan. Sisanya <b>${100 - pct}%</b> menjadi pendapatan toko.</p>
    ${rowSum('Contoh pembayaran', rp(contoh))}${rowSum(`Biaya aplikasi ${pct}%`, '−' + rp(fee))}${rowSum('Diterima toko', rp(contoh - fee), 't')}<p class="hint" style="margin-bottom:0">Untuk pembayaran tunai, biaya ${pct}% diperhitungkan pada pencairan berikutnya (simulasi).</p></div>`;
  const list = apps.map(a => `<div class="apc" data-testid="merchant-application-${a.id}"><div class="rowc"><b>${esc(a.nama)}</b><span class="badge ${a.status === 'Disetujui' ? 'g' : a.status === 'Ditolak' ? 'r' : 'o'}">${a.status}</span></div>
    <div class="mu">${esc(a.jenis)} · ${esc(a.area)}<br>${esc(a.alamat)}<br>Diajukan ${jam(a.createdAt)}${a.decidedAt ? ` · diputuskan ${jam(a.decidedAt)}` : ''}</div>
    ${a.status === 'Menunggu' ? `<p class="hint">Menunggu ditinjau admin. Di aplikasi nyata admin yang memutuskan; untuk demo, simulasikan keputusannya:</p><div class="bb"><button class="bt f" data-act="merDecide" data-id="${a.id}" data-ok="1" data-testid="merchant-approve-btn-${a.id}">Setujui (demo)</button><button class="bt o" data-act="merDecide" data-id="${a.id}" data-ok="0" data-testid="merchant-reject-btn-${a.id}">Tolak (demo)</button></div>` : ''}
    ${a.status === 'Disetujui' && state.stores.some(s => s.id === a.storeId) ? `<div class="bb"><button class="bt f" data-act="merEnter" data-store="${a.storeId}" data-testid="merchant-enter-btn-${a.id}">Masuk sebagai Toko Ini</button></div>` : ''}</div>`).join('');
  let form = '';
  if (!pending) {
    const d = md || (md = newMd());
    const ls = d.gps ? `<p class="hint ok">✓ Memakai lokasi GPS${d.akurasi ? ` (±${d.akurasi} m)` : ''}, area terdekat terisi otomatis.</p>` : '<p class="hint">Tanpa GPS, lokasi diperkirakan dari area yang dipilih.</p>';
    form = `<div class="sec-h">${icon('store2')}Ajukan Jadi Merchant</div><div class="fm">
      <label class="lab" for="m_nama" style="margin-top:0">Nama usaha</label><input class="in" id="m_nama" data-testid="merchant-name-input" maxlength="60" value="${esc(d.nama)}" placeholder="mis. Roti Bu Sri">
      <label class="lab" for="m_jenis">Jenis usaha</label><select class="in" id="m_jenis" data-testid="merchant-type-select">${JENIS_USAHA.map(j => `<option ${j === d.jenis ? 'selected' : ''}>${esc(j)}</option>`).join('')}</select>
      <label class="lab" for="m_alamat">Alamat lengkap</label><textarea class="in" id="m_alamat" data-testid="merchant-address-input" rows="3" maxlength="200" placeholder="Jalan, nomor, kelurahan">${esc(d.alamat)}</textarea>
      <label class="lab" for="m_area">Area usaha (Surabaya)</label><select class="in" id="m_area" data-testid="merchant-area-select">${AREAS.map(a => `<option ${a.nama === d.area ? 'selected' : ''}>${esc(a.nama)}</option>`).join('')}</select>
      <button class="bt o" style="margin:1rem 0 0" data-act="merLokasi" data-testid="merchant-location-btn">Pakai Lokasi Saya</button>${ls}
      <label class="lab" for="m_telp">Nomor HP/WhatsApp</label><input class="in" id="m_telp" data-testid="merchant-phone-input" inputmode="tel" maxlength="16" value="${esc(d.telp)}" placeholder="081234567890">
      <label class="lab" for="m_jam">Jam tutup toko</label><input class="in" id="m_jam" data-testid="merchant-closing-input" type="time" value="${esc(d.jam)}">
      <label class="lab" for="m_desk">Produk sisa yang biasa dijual (opsional)</label><textarea class="in" id="m_desk" data-testid="merchant-description-input" rows="2" maxlength="200" placeholder="mis. roti dan kue sisa hari ini">${esc(d.desk)}</textarea>
      <label class="chk"><input type="checkbox" id="m_setuju" data-testid="merchant-agree-checkbox" ${d.setuju ? 'checked' : ''}><span>Saya menyetujui biaya aplikasi ${pct}% dari setiap pembayaran dan hanya menjual produk sisa hari yang sama yang belum kedaluwarsa.</span></label>${flashHtml()}
      <button class="bt f w" style="width:100%;margin:1.4rem 0 0" data-act="submitMer" data-testid="merchant-submit-btn">Kirim Pengajuan</button></div>`;
  } else form = flash ? `<div class="fm">${flashHtml()}</div>` : '';
  return `${feebox}${apps.length ? `<div class="sec-h">${icon('list')}Pengajuan Saya</div>${list}` : ''}${form}`;
}

V.profile = () => {
  const b = state.buyer, tab = ['inv', 'mer'].includes(view.tab) ? view.tab : 'set';
  if (!pd) pd = { nama: b.nama, alamat: b.alamat, vcode: '', vmsg: null };
  const seg = `<div class="seg" role="tablist">${[['set', 'Pengaturan', 'user'], ['inv', 'Inventori', 'ticket'], ['mer', 'Merchant', 'store2']].map(([k, l, i]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-act="profileTab" data-k="${k}" data-testid="profile-tab-${k}">${icon(i)}${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'set') {
    const na = Number.isFinite(b.lat) ? nearestArea(b.lat, b.lng) : null;
    const status = !Number.isFinite(b.lat) ? '<p class="hint">Lokasi belum dicek. Cek lokasi agar jarak toko dan ongkir dihitung dari posisi Anda.</p>'
      : b.lokasiOk ? `<p class="hint ok">✓ Lokasi terdeteksi di Surabaya, dekat ${esc(na.area.nama)}${b.akurasi ? ` (akurasi ±${b.akurasi} m)` : ''}. Jarak toko dihitung dari sini dan ikut bergerak bila kamu berpindah.</p>`
      : '<p class="hint bad">Lokasi terdeteksi di luar Surabaya, jadi jarak toko tetap memakai data contoh.</p>';
    body = `<div class="fm"><div class="prof"><div class="av">${esc(initials(pd.nama))}</div><b>${esc(b.nama)}</b></div>
      <label class="lab" for="p_nama" style="margin-top:0">Nama</label><input class="in" id="p_nama" data-testid="profile-name-input" maxlength="40" autocomplete="name" value="${esc(pd.nama)}">
      <label class="lab" for="p_alamat">Alamat pengantaran</label><textarea class="in" id="p_alamat" data-testid="profile-address-input" rows="3" maxlength="200" placeholder="Jalan, nomor, RT/RW, kelurahan">${esc(pd.alamat)}</textarea>
      <p class="hint">Alamat tersimpan dipakai otomatis saat Anda memilih Antar di checkout.</p>
      <label class="lab">Cek lokasi</label>${status}${flashHtml()}
      <div class="bb" style="padding:0;margin-top:1rem"><button class="bt o" data-act="cekLokasi" data-testid="profile-check-location-btn" ${geoBusy ? 'disabled' : ''}>${geoBusy ? 'Mencari…' : 'Cek Lokasi Saya'}</button><button class="bt o" data-act="lokasiContoh" data-testid="profile-sample-location-btn">Titik Contoh</button></div>
      <button class="bt f w" style="width:100%;margin:1.6rem 0 0" data-act="saveProfile" data-testid="profile-save-btn">Simpan</button>
      <button class="bt o w" style="width:100%;margin:1rem 0 0" data-act="izin" data-testid="profile-permissions-btn">Izin Aplikasi &amp; Notifikasi</button></div>`;
  } else if (tab === 'inv') {
    const vs = b.vouchers.map(v => `<div class="vch ${v.dipakai ? 'used' : ''}" data-testid="profile-voucher-${esc(v.code)}">${icon('ticket')}<div><b>${esc(v.judul)}</b><small>Kode ${esc(v.code)}${v.minBelanja ? ` · min. belanja ${rp(v.minBelanja)}` : ''}</small></div><span class="badge ${v.dipakai ? 'r' : ''}">${v.dipakai ? 'Terpakai' : 'Tersedia'}</span></div>`).join('');
    body = `<div class="fm" style="margin-top:1.4rem"><label class="lab" for="p_vcode" style="margin-top:0">Tambah voucher</label><div class="vrow"><input class="in" id="p_vcode" data-testid="profile-voucher-input" autocapitalize="characters" autocomplete="off" maxlength="20" placeholder="Masukkan kode voucher" value="${esc(pd.vcode)}"><button class="pill" data-act="pvAdd" data-testid="profile-voucher-add-btn">Tambah</button></div>
      ${pd.vmsg ? `<p class="hint ${pd.vmsg.ok ? 'ok' : 'bad'}">${esc(pd.vmsg.text)}</p>` : ''}<p class="hint">Kode contoh: ${VOUCHER_KATALOG.map(v => v.code).join(', ')}.</p></div>
      <div class="sec-h">${icon('ticket')}Voucher Saya (${b.vouchers.filter(v => !v.dipakai).length} tersedia)</div>${vs || '<div class="card mu">Belum ada voucher.</div>'}`;
  } else body = merTab();
  return page(`${header('<span class="dp">DEMO</span>', true)}<h2 class="tt">Profil Pembeli</h2>${seg}${body}`, null);
};

// ---------- Notifikasi & izin ----------
V.notifs = () => {
  const a = aud(), list = visibleNotifs(state, a, ui.storeId);
  const rows = list.map(n => `<button class="nt ${n.read ? '' : 'un'}" data-act="openNotif" data-id="${esc(n.id)}" data-testid="notifications-item-${esc(n.id)}"><div class="ni">${icon(ICON_N[n.jenis] || 'bell')}</div><div><b>${esc(n.judul)}</b><p>${esc(n.isi)}</p><small>${ago(n.at)}</small></div></button>`).join('');
  const tg = (k, lab) => `<div class="tgl"><span>${lab}</span><button role="switch" aria-checked="${state.buyer.prefs[k]}" aria-label="${lab}" data-act="togglePref" data-k="${k}" data-testid="notifications-toggle-${k}"></button></div>`;
  const prefs = a === 'pembeli' ? `<div class="card"><b>Pengaturan Notifikasi</b>${tg('favorit', 'Produk favorit tersedia lagi')}${tg('pengambilan', 'Pengingat jam pengambilan')}${tg('pengantaran', 'Status pengantaran')}
    <div class="tgl"><span>Notifikasi sistem HP: <b>${permState.notifikasi === 'granted' ? 'aktif' : permState.notifikasi === 'denied' ? 'diblokir' : 'belum diizinkan'}</b></span>${permState.notifikasi === 'prompt' ? `<button class="pill" style="width:auto;height:3rem;background:var(--ol);color:#fff;border-radius:99px;padding:0 1.2rem" data-act="reqPerm" data-k="notifikasi" data-testid="notifications-enable-btn">Izinkan</button>` : ''}</div></div>` : '';
  return page(`${header('<span class="dp">DEMO</span>', true)}<h2 class="tt">Notifikasi</h2>
  ${list.length ? `<div class="bb" style="margin-bottom:1.2rem"><button class="bt o" data-act="notifReadAll" data-testid="notifications-read-all-btn">Tandai Dibaca</button><button class="bt o" data-act="notifClear" data-testid="notifications-clear-btn">Hapus Semua</button></div>` : ''}
  ${rows || '<div class="card mu" data-testid="notifications-empty">Belum ada notifikasi. Pengingat jam ambil, status pengantaran, dan produk favoritmu akan muncul di sini.</div>'}${prefs}`, null);
};

V.izin = () => page(`${header('<span class="dp">DEMO</span>', true)}<h2 class="tt">Izin Aplikasi</h2><p class="sub-t">Aplikasi hanya memakai izin ini untuk fitur di bawah. Kamu bisa mengubahnya kapan saja.</p>
  ${permRows()}<p class="hint" style="margin:0 2.1rem 1rem">Jika status Diblokir, buka Pengaturan HP atau peramban, pilih izin untuk aplikasi ini, lalu aktifkan lagi. Dialog izin tidak bisa dimunculkan ulang setelah ditolak.</p>
  <div class="bb"><button class="bt f" data-act="reqAll" data-testid="permission-allow-all-btn">Izinkan Semua</button><button class="bt o" data-act="testNotif" data-testid="permission-test-notification-btn">Tes Notifikasi</button></div>
  <div class="bb" style="margin-top:1rem"><button class="bt o" data-act="diag" data-testid="permission-diagnostics-btn">Diagnosa Perangkat</button></div>`, null);

let diagInfo = null, diagLog = [];
const diagText = i => [`RepEAT: laporan diagnosa`, `Platform: ${i.platform} (native: ${i.native ? 'ya' : 'tidak'})`, `Origin: ${i.origin} · aman(https): ${i.secure ? 'ya' : 'TIDAK'}`,
  `Plugin native: ${Object.entries(i.plugins).map(([k, v]) => `${k}=${v === null ? '-' : v ? 'ada' : 'TIDAK ADA'}`).join(', ')}`,
  `Web API: ${Object.entries(i.api).map(([k, v]) => `${k}=${v ? 'ya' : 'tidak'}`).join(', ')}`,
  `Izin: ${Object.entries(i.perm).map(([k, v]) => `${k}=${v}`).join(', ')}`,
  `Galat terakhir: ${Object.entries(i.errors).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' | ') || '-'}`,
  ...(diagLog.length ? [`Hasil tes: ${diagLog.join(' | ')}`] : []), `UA: ${i.ua}`].join('\n');
V.diag = () => {
  const i = diagInfo; if (!i) return page(`${header('<span class="dp">DEMO</span>', true)}<h2 class="tt">Diagnosa Perangkat</h2><p class="sub-t">Memeriksa…</p>`, null);
  const row = (a, b, bad) => `<div class="sum"><span>${a}</span><span style="text-align:right;max-width:62%;word-break:break-word;${bad ? 'color:#a63b26;font-weight:600' : ''}">${esc(b)}</span></div>`;
  const pl = Object.entries(i.plugins).map(([k, v]) => row(`Plugin ${k}`, v === null ? 'tidak berlaku (web)' : v ? 'ada' : 'TIDAK ADA', v === false)).join('');
  return page(`${header('<span class="dp">DEMO</span>', true)}<h2 class="tt">Diagnosa Perangkat</h2><p class="sub-t">Kirim tangkapan layar ini bila izin masih bermasalah.</p>
  <div class="card" data-testid="diagnostics-report">${row('Platform', `${i.platform}${i.native ? ' (aplikasi native)' : ''}`)}${row('Origin', i.origin)}${row('Konteks aman (https)', i.secure ? 'ya' : 'TIDAK', !i.secure)}${pl}
    ${Object.entries(i.api).map(([k, v]) => row(`API ${k}`, v ? 'ada' : 'tidak ada')).join('')}${Object.entries(i.perm).map(([k, v]) => row(`Izin ${k}`, v, v === 'denied' || v === 'unsupported')).join('')}
    ${Object.entries(i.errors).filter(([, v]) => v).map(([k, v]) => row(`Galat ${k}`, v, !/Ok$/.test(k))).join('')}</div>
  ${diagLog.length ? `<div class="card" data-testid="diagnostics-log"><b>Hasil tes</b>${diagLog.map(l => `<div class="hint">${esc(l)}</div>`).join('')}</div>` : ''}
  <div class="bb"><button class="bt o" data-act="diagGeo" data-testid="diagnostics-location-btn">Tes Lokasi</button><button class="bt o" data-act="diagCam" data-testid="diagnostics-camera-btn">Tes Kamera</button></div>
  <div class="bb" style="margin-top:1rem"><button class="bt o" data-act="diagNotif" data-testid="diagnostics-notification-btn">Tes Notifikasi</button><button class="bt f" data-act="diagCopy" data-testid="diagnostics-copy-btn">Salin Laporan</button></div>`, null);
};

// ---------- Penjual ----------
V.tdash = () => {
  const st = storeOf(ui.storeId) || state.stores[0];
  const t = qd.trim().toLowerCase();
  const orders = [...state.orders].filter(o => o.storeId === st.id && (!t || (o.judul + ' ' + o.status).toLowerCase().includes(t))).reverse();
  const idx = orders.length ? ((dashIdx % orders.length) + orders.length) % orders.length : 0;
  const f = orders[idx];
  const next = orders.filter((_, i) => i !== idx).slice(0, 3).map(o => `<div class="nx">${orderThumb(o)}<div><b>${esc(o.judul)}</b><small>${o.status}${o.metode === METODE.ANTAR ? ' · Antar' : ''}</small></div><span class="ring">×${o.qty}</span></div>`).join('');
  let acts = '';
  if (f && f.metode === METODE.ANTAR && f.status === STATUS.DIPESAN) {
    const k = f.kirim || { tahap: KIRIM.MENUNGGU };
    acts = k.tahap === KIRIM.DIANTAR ? `<p class="hint ok" style="margin-top:0.8rem" data-testid="tdash-delivery-status">Dalam pengantaran, tiba sekitar ${jam(k.etaAt)}. Scan QR atau kode pembeli saat serah terima.</p>`
      : `<div class="acts2">${k.tahap === KIRIM.MENUNGGU ? `<button class="bt o" data-act="siapkan" data-id="${esc(f.id)}" data-testid="tdash-prepare-btn">Siapkan</button>` : '<span class="badge g" style="align-self:center">Disiapkan</span>'}<button class="bt f" data-act="antar" data-id="${esc(f.id)}" data-testid="tdash-deliver-btn">Mulai Antar</button></div>`;
  }
  const featHtml = f ? `<div class="feat"><div class="fc">${orderThumb(f)}</div><div class="fc fb">${orderThumb(f, 'x')}</div>
    <div class="ft"><b>${esc(f.judul)}</b><small style="display:block;font-size:.7rem;color:var(--ol);font-weight:600">${f.status} · ×${f.qty}</small><div class="pp">${rp(f.total)}</div><p>Ambil ${range(f.ambilStart, f.ambilEnd)}. Pembeli menunjukkan QR atau Kode Ambil, lalu Anda verifikasi.</p></div>
    <div class="arr"><button data-act="dprev" data-testid="tdash-prev-btn" aria-label="Sebelumnya">${icon('left')}</button><button data-act="dnext" data-testid="tdash-next-btn" aria-label="Berikutnya">${icon('right')}</button></div></div>
    ${f.metode ? `<div class="card" style="margin-top:0">${orderInfo(f, true)}${f.bayar === BAYAR.TUNAI && f.status === STATUS.DIPESAN ? `<p class="hint bad" style="margin-top:0.8rem">Tagih tunai ${rp(f.total)} saat serah terima.</p>` : ''}${acts}</div>` : ''}`
    : `<div class="feat"><div class="fc">${thumb('bag')}</div><div class="ft"><b>Belum ada pesanan</b><p>Pesanan dari pembeli akan muncul di sini.</p></div></div>`;
  const mine = state.listings.filter(l => l.storeId === st.id).map(l => {
    const nm = titleOf(l);
    return `<div class="lrow" data-testid="tdash-listing-row-${esc(l.id)}">${thumbOf(l)}<div><b>${esc(nm)}</b><small>Sisa ${l.stok} dari ${l.stokAwal} · ${rp(l.harga)}</small></div>
      <div class="acts"><button class="ib sm" data-act="pickFoto" data-id="${esc(l.id)}" data-testid="tdash-photo-btn-${esc(l.id)}" aria-label="${l.foto ? 'Ganti' : 'Tambah'} foto ${esc(nm)}">${icon('camera')}</button><button class="ib sm dng" data-act="delListing" data-id="${esc(l.id)}" data-testid="tdash-delete-btn-${esc(l.id)}" aria-label="Hapus listing ${esc(nm)}">${icon('trash')}</button></div></div>`;
  }).join('');
  const e = sellerEarnings(state, st.id);
  return page(`${header()}<div class="search" style="margin-top:20px">${icon('search')}<input id="qd" data-testid="tdash-search-input" placeholder="Cari pesanan" value="${esc(qd)}" autocomplete="off"></div>
  <div class="tr2"><h2 class="tt" style="margin:0">Pesanan Masuk</h2><span class="ago">${f ? ago(f.createdAt) : esc(st.nama)}</span></div>${featHtml}
  <div class="nxh"><h3>Berikutnya</h3></div>${next || '<p class="mu" style="padding:0 21px">Tidak ada pesanan lain.</p>'}
  <div class="bb"><button class="bt f" data-act="scan" data-testid="tdash-scan-btn">Scan QR</button><button class="bt o" data-act="sheet" data-s="verify" data-testid="tdash-verify-btn">Input Kode</button></div>
  <div class="nxh" style="margin-top:22px"><h3>Pendapatan (pesanan diambil)</h3></div>
  <div class="earn" data-testid="tdash-earnings"><div><b>${rp(e.gross)}</b><small>Total bayar</small></div><div><b>−${rp(e.fee)}</b><small>Biaya ${Math.round(APP_FEE * 100)}%</small></div><div><b>${rp(e.net)}</b><small>Diterima</small></div></div>
  <p class="hint" style="margin:0.8rem 2.1rem 0">${e.orders} pesanan selesai. Biaya aplikasi ${Math.round(APP_FEE * 100)}% dari setiap pembayaran.</p>
  <div class="nxh" style="margin-top:22px"><h3>Listing ${esc(st.nama)}</h3></div>${mine || '<p class="mu" style="padding:0 21px">Belum ada listing.</p>'}`, 'tdash');
};

V.tcreate = () => {
  const d = draft || (draft = newDraft());
  const chip = (k, l) => `<button class="chip ${d.type === k ? 'on' : ''}" data-act="setType" data-type="${k}" data-testid="tcreate-type-chip-${k}">${l}</button>`;
  return page(`${header()}<h2 class="tt">Buat Listing</h2><div class="fm"><label class="lab" style="margin-top:0">Jenis</label><div class="chips" style="padding:0;margin:0">${chip('kejutan', 'Paket Kejutan')}${chip('item', 'Item Pilihan')}</div>
  ${d.type === TIPE.ITEM ? `<label class="lab" for="f_nama">Nama produk</label><input class="in" id="f_nama" data-testid="tcreate-name-input" value="${esc(d.nama)}" maxlength="60">` : '<p class="mu" style="margin-top:10px">Isi kantong tidak perlu diisi dan tidak ditampilkan ke pembeli.</p>'}
  <label class="lab">Foto produk (opsional)</label><div class="ph">${thumbOf({ foto: d.foto, type: d.type, nama: d.nama })}<div class="col"><button class="pill" data-act="pickFoto" data-id="" data-testid="tcreate-photo-btn">${icon('camera')}${d.foto ? 'Ganti Foto' : 'Tambah Foto'}</button>${d.foto ? `<button class="pill o" data-act="clearFoto" data-testid="tcreate-photo-remove-btn">${icon('trash')}Hapus Foto</button>` : ''}</div></div>
  <p class="hint">${d.type === TIPE.KEJUTAN ? 'Untuk Paket Kejutan, foto kantongnya saja, jangan isinya. ' : ''}Tanpa foto, aplikasi memakai ilustrasi. Foto dikecilkan otomatis.</p>
  <label class="lab" for="f_jumlah">Jumlah ${d.type === TIPE.KEJUTAN ? 'kantong' : ''}</label><input class="in" id="f_jumlah" data-testid="tcreate-quantity-input" type="number" inputmode="numeric" min="1" value="${esc(d.jumlah)}">
  <label class="lab" for="f_harga">Harga satuan (Rp)</label><input class="in" id="f_harga" data-testid="tcreate-price-input" type="number" inputmode="numeric" min="1" value="${esc(d.harga)}">
  <div class="g2"><div><label class="lab" for="f_start">Ambil mulai</label><input class="in" id="f_start" data-testid="tcreate-start-input" type="time" value="${esc(d.start)}"></div><div><label class="lab" for="f_end">Ambil selesai</label><input class="in" id="f_end" data-testid="tcreate-end-input" type="time" value="${esc(d.end)}"></div></div></div>
  <div class="note">${esc(TERMS)}</div>${flashHtml()}<button class="bt f w" data-act="saveListing" data-testid="tcreate-save-btn">Simpan listing</button>`, 'tcreate');
};

function render() {
  try {
    if (corrupt) { app.innerHTML = V.corrupt(); return; }
    if (expireOrders(state, now()) > 0) save(state);
    app.innerHTML = (V[view.name] || V.role)();
  } catch (e) { fatal(e); }
}
function fatal(e) {
  console.error(e);
  app.innerHTML = `<header class="top"><div class="logo"><img src="logo.svg" alt="RepEAT"></div><span class="dp">DEMO</span></header><h2 class="tt">Terjadi Kendala</h2><p class="hp">Aplikasi tetap aman. Anda bisa kembali ke beranda atau mereset data demo.</p>
  <button class="bt f w" data-act="home" data-testid="error-home-btn">Kembali ke beranda</button><button class="bt o w" data-act="reset" data-testid="error-reset-btn">Reset demo</button>`;
}

function hhmm(ms) { const d = new Date(ms), t = new Date(now()); return d.getDate() !== t.getDate() ? '23:59' : jam(ms); }
function newDraft() { return { type: TIPE.KEJUTAN, nama: '', jumlah: '5', harga: '15000', start: hhmm(now() + 0.5 * HOUR), end: hhmm(now() + 3 * HOUR), foto: null }; }
const stokOf = id => { const l = state.listings.find(x => x.id === id); return l ? l.stok : 1; };

// ---------- Foto produk: dikecilkan di perangkat (maks 640 px, JPEG) agar muat di penyimpanan ----------
function resizeImage(file, max = 640) {
  return new Promise((res, rej) => {
    if (!/^image\//.test(file.type)) return rej(new Error('File harus berupa gambar.'));
    if (file.size > 15 * 1024 * 1024) return rej(new Error('Gambar terlalu besar (maksimal 15 MB).'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let out = c.toDataURL('image/jpeg', 0.72); if (out.length > MAKS_FOTO_CHAR) out = c.toDataURL('image/jpeg', 0.5);
      out.length <= MAKS_FOTO_CHAR ? res(out) : rej(new Error('Foto masih terlalu besar setelah dikecilkan.'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Foto tidak bisa dibaca (format tidak didukung).')); };
    img.src = url;
  });
}
function chooseFile(onFile) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none'; document.body.appendChild(inp);
  inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.remove(); if (f) onFile(f); });
  inp.addEventListener('cancel', () => inp.remove());
  inp.click();
}

// ---------- Scanner QR (penjual) ----------
let scan = null;
const scanMsg = (t, bad) => { const m = document.getElementById('scanMsg'); if (m) { m.textContent = t; m.className = 'sc-msg' + (bad ? ' bad' : ''); } };
function closeScannerUi() {
  if (scan) { clearInterval(scan.timer); if (scan.stream) scan.stream.getTracks().forEach(t => t.stop()); scan = null; }
  if (!scanEl.hidden) { scanEl.hidden = true; scanEl.innerHTML = ''; }
}
function handleScanned(text) {
  const raw = String(text || '').trim();
  const code = parseCodeInput(raw);
  if (!/^[A-Z2-9]{6}$/.test(code) || (raw.toUpperCase().includes(':') && !raw.toUpperCase().startsWith(KODE_PREFIX))) {
    if (scan && scan.last !== raw) { scan.last = raw; scanMsg('QR ini bukan Kode Ambil RepEAT.', true); }
    return false;
  }
  if (scan && scan.last === code && Date.now() - scan.lastAt < 2500) return false; // jangan verifikasi ulang kode yang sama tiap frame
  if (scan) { scan.last = code; scan.lastAt = Date.now(); }
  const r = verifyCode(state, ui.storeId, code, now()); save(state);
  if (!r.ok) { scanMsg(r.error, true); return false; }
  const o = r.order; closeOverlay();
  toast(`Berhasil: ${o.judul} × ${o.qty} (${rp(o.total)}) ditandai Diambil.${o.bayar === BAYAR.TUNAI ? ` Terima tunai ${rp(o.total)}.` : ''}`);
  return true;
}
async function openScanner() {
  closeScannerUi(); menuOpen = false;
  if (sheet) { sheet = null; flash = null; history.replaceState({ v: view, d: histDepth(), ov: 'scan' }, ''); } else openOverlay('scan');
  render();
  scanEl.hidden = false;
  scanEl.innerHTML = `<div class="sc-top"><span>Scan QR Kode Ambil</span><button class="ib" data-scan="close" data-testid="scanner-close-btn" aria-label="Tutup">${icon('x')}</button></div>
    <video id="scanVideo" playsinline muted autoplay></video><div class="sc-frame"></div>
    <div class="sc-bot"><p class="sc-msg" id="scanMsg">Menyalakan kamera…</p><div class="bb"><button class="bt o" data-scan="file" data-testid="scanner-photo-btn">Pilih Foto QR</button><button class="bt o" data-scan="manual" data-testid="scanner-manual-btn">Ketik Kode</button></div></div>`;
  scan = { stream: null, timer: null, last: '', lastAt: 0, busy: false };
  const mine = scan;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { scanMsg('Kamera tidak tersedia di sini' + (window.isSecureContext ? '' : ' (butuh https)') + '. Pakai "Pilih Foto QR" atau "Ketik Kode".', true); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false }); }
  catch (e) { if (scan === mine) { const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError'); scanMsg((denied ? NT.hint('kamera', 'denied') : `Kamera tidak bisa dibuka (${(e && e.name) || 'galat'}).`) + ' Atau pakai "Pilih Foto QR" / "Ketik Kode".', true); } return; }
  if (scan !== mine) { stream.getTracks().forEach(t => t.stop()); return; }
  mine.stream = stream;
  const v = document.getElementById('scanVideo'); v.srcObject = stream; try { await v.play(); } catch (e) { /* abaikan */ }
  scanMsg('Arahkan kamera ke QR di layar pembeli.');
  let det = null; try { if ('BarcodeDetector' in window) det = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { det = null; }
  const cv = document.createElement('canvas'), g = cv.getContext('2d', { willReadFrequently: true });
  mine.timer = setInterval(async () => {
    if (scan !== mine || mine.busy || v.readyState < 2 || !v.videoWidth) return;
    mine.busy = true;
    try {
      let text = null;
      if (det) { try { const r = await det.detect(v); if (r && r[0]) text = r[0].rawValue; } catch (e) { det = null; } }
      if (!text) { const s = Math.min(1, 720 / v.videoWidth); cv.width = Math.round(v.videoWidth * s); cv.height = Math.round(v.videoHeight * s); g.drawImage(v, 0, 0, cv.width, cv.height); text = decodeQR(g.getImageData(0, 0, cv.width, cv.height)); }
      if (text && scan === mine) handleScanned(text);
    } catch (e) { /* frame gagal dibaca: lanjut frame berikutnya */ } finally { mine.busy = false; }
  }, 180);
}
scanEl.addEventListener('click', e => {
  const el = e.target.closest('[data-scan]'); if (!el) return;
  const k = el.dataset.scan;
  if (k === 'close') closeOverlay();
  else if (k === 'manual') { closeScannerUi(); sheet = 'verify'; flash = null; history.replaceState({ v: view, d: histDepth(), ov: 'verify' }, ''); render(); setTimeout(() => { const i = document.getElementById('kode'); if (i) i.focus(); }, 30); }
  else if (k === 'file') chooseFile(async f => {
    try {
      const url = URL.createObjectURL(f), img = new Image(); await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(new Error('x')); img.src = url; });
      let text = null; const cv = document.createElement('canvas'), g = cv.getContext('2d', { willReadFrequently: true });
      for (const max of [900, 1400, 600]) { const s = Math.min(1, max / Math.max(img.width, img.height)); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height); text = decodeQR(g.getImageData(0, 0, cv.width, cv.height)); if (text) break; }
      URL.revokeObjectURL(url);
      if (text) handleScanned(text); else scanMsg('QR tidak terbaca di foto itu. Coba foto yang lebih jelas dan lurus.', true);
    } catch (err) { scanMsg('Foto tidak bisa dibaca.', true); }
  });
});

// ---------- Aksi ----------
const A = {
  menu() { if (menuOpen) closeOverlay(); else { menuOpen = true; openOverlay('menu'); render(); } },
  menuClose() { closeOverlay(); },
  sheetClose() { closeOverlay(); },
  sheet(el) { sheet = el.dataset.s; flash = null; openOverlay(sheet); render(); setTimeout(() => { const k = document.getElementById('kode'); if (k) k.focus(); }, 30); },
  scan() { openScanner(); },
  back() { if (histDepth() > 0) history.back(); else A.home(); },
  roles() { ui.role = null; saveUi(ui); co = null; pd = null; go('role', {}, { replace: true }); },
  home() { go(ui.role === 'toko' ? 'tdash' : ui.role === 'pembeli' ? 'home' : 'role'); },
  pickRole(el) {
    const sel = document.getElementById('storeSel'); ui = { ...ui, role: el.dataset.role, storeId: sel ? sel.value : ui.storeId };
    const first = !ui.izinAsked; ui.izinAsked = true; saveUi(ui);
    go(ui.role === 'toko' ? 'tdash' : 'home', {}, { replace: true });
    refreshPerms(false).then(() => { if (first && NT.PERM_KINDS.some(k => permState[k] === 'prompt') && view.name !== 'role') { sheet = 'izin'; openOverlay('izin'); render(); } });
    setTimeout(pump, 50);
  },
  nav(el) { if (el.dataset.to === 'tcreate') draft = newDraft(); go(el.dataset.to); },
  detail(el) { go('detail', { id: el.dataset.id, n: 1 }); },
  ftipe(el) { ftipe = el.dataset.k; render(); },
  clearQ() { q = ''; render(); const i = document.getElementById('q'); if (i) i.focus(); },
  sort() { sortBy = sortBy === 'jarak' ? 'harga' : 'jarak'; render(); toast(sortBy === 'harga' ? 'Diurutkan: termurah' : 'Diurutkan: terdekat'); },
  scrollList() { const e = document.getElementById('list'); if (e) e.scrollIntoView({ behavior: 'smooth' }); },
  qup(el) { qty[el.dataset.id] = Math.min((qty[el.dataset.id] || 1) + 1, stokOf(el.dataset.id)); render(); },
  qdn(el) { qty[el.dataset.id] = Math.max((qty[el.dataset.id] || 1) - 1, 1); render(); },
  quick(el) { startCheckout(el.dataset.id); go('confirm', { id: el.dataset.id, n: Math.min(Math.max(qty[el.dataset.id] || 1, 1), stokOf(el.dataset.id)) }); },
  dup() { view.n = Math.min((view.n || 1) + 1, stokOf(view.id)); history.replaceState({ v: view, d: histDepth(), ov: 0 }, ''); render(); },
  ddn() { view.n = Math.max((view.n || 1) - 1, 1); history.replaceState({ v: view, d: histDepth(), ov: 0 }, ''); render(); },
  toConfirm(el) { startCheckout(el.dataset.id); go('confirm', { id: el.dataset.id, n: Math.min(Math.max(view.n || 1, 1), stokOf(el.dataset.id)) }); },
  setMetode(el) { co.metode = el.dataset.k; render(); },
  setBayar(el) { co.bayar = el.dataset.k; flash = null; render(); },
  vPick(el) { co.voucher = co.voucher === el.dataset.code ? '' : el.dataset.code; co.vmsg = null; render(); },
  vAdd() {
    const r = addVoucher(state, co.vcode);
    if (!r.ok) { co.vmsg = { ok: false, text: r.error }; render(); return; }
    save(state); co.voucher = r.voucher.code; co.vcode = ''; co.vmsg = { ok: true, text: `${r.voucher.judul} ditambahkan ke Inventori dan dipakai.` }; render();
  },
  pay(el) {
    const r = placeOrder(state, el.dataset.id, Number(el.dataset.n), now(), Math.random, {
      metode: co.metode, alamat: state.buyer.alamat, catatan: co.catatan, voucherCode: co.voucher, extraItems: extraItems(), bayar: { metode: co.bayar, ...co.kartu },
    });
    if (!r.ok) {
      if (r.kind === 'input') { flash = { ok: false, msg: r.error }; render(); const f = document.getElementById('flash'); if (f) f.scrollIntoView({ block: 'center' }); return; }
      toast(r.error); co = null; go('home'); return;
    }
    save(state); co = null; go('order', { id: r.order.id }, { replace: true }); setTimeout(pump, 50);
  },
  openOrder(el) { go('order', { id: el.dataset.id }); },
  catPick(el) { cat = cat === el.dataset.k ? 'semua' : el.dataset.k; selId = null; render(); },
  catAll() { cat = 'semua'; selId = null; render(); },
  pill(el) { if (selId === el.dataset.id || (!selId && el.classList.contains('on'))) go('detail', { id: el.dataset.id, n: 1 }); else { selId = el.dataset.id; render(); } },
  dprev() { dashIdx--; render(); }, dnext() { dashIdx++; render(); },
  // profil
  profile() { pd = null; go('profile', { tab: 'set' }); },
  profileTab(el) { view.tab = el.dataset.k; history.replaceState({ v: view, d: histDepth(), ov: 0 }, ''); flash = null; render(); },
  saveProfile() {
    const r = updateBuyer(state, { nama: pd.nama, alamat: pd.alamat });
    if (!r.ok) { flash = { ok: false, msg: r.error }; render(); return; }
    save(state); pd = null; flash = { ok: true, msg: 'Profil tersimpan. Alamat ini dipakai otomatis di checkout.' }; render();
  },
  async cekLokasi() {
    geoBusy = true; flash = null; render();
    try { const c = await getFix(); geoBusy = false; permState.lokasi = 'granted'; lastFix = { lat: c.latitude, lng: c.longitude }; applyLocation(c.latitude, c.longitude, c.accuracy); startWatch(); }
    catch (err) { geoBusy = false; if (isDenied(err)) permState.lokasi = 'denied'; flash = { ok: false, msg: geoError(err) }; render(); }
  },
  lokasiContoh() { applyLocation(-7.2617, 112.7388, null); },
  pvAdd() {
    const r = addVoucher(state, pd.vcode);
    if (!r.ok) { pd.vmsg = { ok: false, text: r.error }; render(); return; }
    save(state); pd.vcode = ''; pd.vmsg = { ok: true, text: `${r.voucher.judul} ditambahkan.` }; render();
  },
  // penjual
  setType(el) { draft.type = el.dataset.type; flash = null; render(); },
  pickFoto(el) {
    const id = el.dataset.id;
    chooseFile(async f => {
      try {
        const data = await resizeImage(f);
        if (!id) { draft.foto = data; render(); return; }
        const l = state.listings.find(x => x.id === id), old = l ? l.foto : null;
        const r = setListingFoto(state, ui.storeId, id, data);
        if (!r.ok) { toast(r.error); return; }
        if (!save(state)) { l.foto = old; toast('Penyimpanan perangkat penuh. Foto tidak disimpan.'); return; }
        render(); toast('Foto produk diperbarui.');
      } catch (e) { toast(e.message || 'Foto tidak bisa dibaca.'); }
    });
  },
  clearFoto() { draft.foto = null; render(); },
  delListing(el) {
    const l = state.listings.find(x => x.id === el.dataset.id); if (!l) return;
    const nm = l.type === TIPE.KEJUTAN ? 'Paket Kejutan' : l.nama;
    if (!window.confirm(`Hapus listing "${nm}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const r = deleteListing(state, ui.storeId, l.id);
    if (!r.ok) { toast(r.error); return; }
    save(state); render(); toast('Listing dihapus.');
  },
  saveListing() {
    const t = now();
    const input = { type: draft.type, nama: draft.nama, jumlah: Number(draft.jumlah), harga: Number(draft.harga), ambilStart: todayAt(draft.start, t), ambilEnd: todayAt(draft.end, t), foto: draft.foto };
    const r = createListing(state, ui.storeId, input, t);
    if (!r.ok) { flash = { ok: false, html: r.errors.map(esc).join('<br>') }; render(); return; }
    if (!save(state)) { state.listings.pop(); state.meta.nextListingId--; flash = { ok: false, msg: 'Penyimpanan perangkat penuh. Coba tanpa foto atau hapus listing lama.' }; render(); return; }
    toast('Listing dibuat dan tampil untuk Pembeli.'); draft = null; go('tdash');
  },
  verify() {
    const r = verifyCode(state, ui.storeId, document.getElementById('kode').value, now());
    save(state);
    if (r.ok) { const o = r.order; closeOverlay(); toast(`Berhasil: ${o.judul} × ${o.qty} (${rp(o.total)}) ditandai Diambil.${o.bayar === BAYAR.TUNAI ? ` Terima tunai ${rp(o.total)}.` : ''}`); }
    else { flash = { ok: false, msg: r.error }; render(); const k = document.getElementById('kode'); if (k) k.focus(); }
  },
  advance() { state.meta.offsetMs += HOUR; save(state); nativeIds.clear(); /* alarm native lama memakai jam nyata: tampilkan yang jatuh tempo sekarang, jadwalkan ulang sisanya */ closeOverlay(); toast('Jam simulasi maju 1 jam.'); setTimeout(pump, 50); },
  reset(el) {
    if (!el.dataset.force && !window.confirm('Reset demo? Semua pesanan, listing baru, profil, dan voucher akan dikembalikan ke awal.')) return;
    state = reset(Date.now()); corrupt = false; noStorage = false; ui = { role: null, storeId: 's1' };
    q = qd = ''; ftipe = 'semua'; sortBy = 'jarak'; cat = 'semua'; selId = null; dashIdx = 0; co = null; pd = null; md = null; draft = null; menuOpen = false; sheet = null; lastFix = null;
    go('role', {}, { replace: true }); toast('Demo dikembalikan ke kondisi awal.');
  },
};

function applyLocation(lat, lng, acc) {
  if (!pd) pd = { nama: state.buyer.nama, alamat: state.buyer.alamat, vcode: '', vmsg: null };
  updateBuyer(state, { lat, lng, akurasi: acc, at: Date.now() });
  const na = nearestArea(lat, lng), ok = state.buyer.lokasiOk;
  if (ok && !String(pd.alamat).trim()) { pd.alamat = `Dekat ${na.area.nama}, Surabaya`; updateBuyer(state, { alamat: pd.alamat }); }
  save(state);
  flash = ok ? { ok: true, msg: `Lokasi dicek: dekat ${na.area.nama}, Surabaya. Tambahkan nama jalan dan nomor rumah pada alamat, lalu Simpan.` } : { ok: false, msg: 'Lokasi ada di luar Surabaya. Jarak toko tetap memakai data contoh.' };
  render();
}

// ---------- Lokasi nyata: watchPosition mengikuti posisi pembeli di Surabaya ----------
let stopWatchFn = null, lastFix = null, lastFixSave = 0;
const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');
const LIVE_VIEWS = ['home', 'stores', 'detail', 'orders', 'order', 'notifs', 'tdash'];
function startWatch() { if (stopWatchFn) return; stopWatchFn = NT.watchPositionNative(onFix, () => { /* galat sementara: tetap pakai posisi terakhir; detail ada di Diagnosa */ }); }
function stopWatch() { if (stopWatchFn) { try { stopWatchFn(); } catch (e) { /* abaikan */ } stopWatchFn = null; } }
function onFix(c) {
  const { latitude: lat, longitude: lng, accuracy } = c;
  if (accuracy > 3000) return; // lokasi sangat kasar (berbasis IP/jaringan): terlalu tidak akurat untuk jarak toko
  const moved = lastFix ? haversineKm(lastFix.lat, lastFix.lng, lat, lng) * 1000 : Infinity;
  lastFix = { lat, lng };
  if (moved < 30 && Date.now() - lastFixSave < 30000) return; // abaikan getaran GPS kecil
  updateBuyer(state, { lat, lng, akurasi: accuracy, at: Date.now() }); lastFixSave = Date.now(); save(state);
  if (['home', 'stores', 'detail'].includes(view.name) && !typing() && !sheet && !menuOpen) render();
}
const getFix = () => NT.getPosition();
const errMsg = e => String((e && (e.message || e.errorMessage)) || '');
const isDenied = e => !!e && (e.code === 1 || /denied|permission|izin/i.test(errMsg(e)));
const isTimeout = e => !!e && (e.code === 3 || /time ?out|timed out/i.test(errMsg(e)));
const geoError = err => isDenied(err) ? 'Izin lokasi ditolak. Aktifkan izin lokasi di Pengaturan HP, atau isi alamat manual / pakai Titik Contoh.' : isTimeout(err) ? 'Mencari lokasi terlalu lama. Pastikan GPS/Lokasi HP aktif, lalu coba di tempat terbuka.' : err && err.code === 0 ? 'Perangkat ini tidak mendukung lokasi. Isi alamat manual atau pakai Titik Contoh.' : 'Lokasi tidak tersedia saat ini' + (errMsg(err) ? ` (${errMsg(err)})` : '') + '.';

async function refreshPerms(rerender = true) {
  for (const k of NT.PERM_KINDS) permState[k] = await NT.queryPerm(k);
  if (permState.lokasi === 'granted' && ui.role) startWatch();
  if (rerender && !typing() && (['izin', 'home', 'notifs'].includes(view.name) || sheet === 'izin')) render();
}

// ---------- Notifikasi: jatuh tempo pada jam simulasi; banner dalam aplikasi + notifikasi sistem ----------
const nativeIds = new Set();
let nbarTimer;
function showBanner(n, extra) {
  const el = document.getElementById('nbar'); el.innerHTML = `<b>${esc(n.judul)}</b>${esc(n.isi)}${extra ? ` <i>(+${extra} lainnya)</i>` : ''}`; el.hidden = false;
  clearTimeout(nbarTimer); nbarTimer = setTimeout(() => { el.hidden = true; }, 7000);
}
function updateBadge() {
  const btn = document.querySelector('[data-testid="header-notifications-btn"]'); if (!btn) return;
  const n = nUnread(); let b = btn.querySelector('.bdg');
  if (!n) { if (b) b.remove(); } else { if (!b) { b = document.createElement('i'); b.className = 'bdg'; b.dataset.testid = 'header-notifications-badge'; btn.appendChild(b); } b.textContent = n > 9 ? '9+' : String(n); }
  btn.setAttribute('aria-label', 'Notifikasi' + (n ? `, ${n} belum dibaca` : ''));
}
function syncNativeNow() {
  if (!NT.nativeAvailable() || !aud()) return;
  const items = pendingNotifs(state, aud(), ui.storeId, now()).map(n => ({ id: n.id, title: n.judul, body: n.isi, atReal: Date.now() + (n.at - now()) }));
  nativeIds.clear(); items.forEach(i => nativeIds.add(i.id)); NT.syncNative(items);
}
function pump() {
  const a = aud(); if (!a || corrupt) return;
  const due = collectDue(state, now(), a, ui.storeId);
  if (due.length) {
    save(state); showBanner(due[0], due.length - 1);
    for (const n of due) if (!nativeIds.has(n.id)) NT.showOs({ id: n.id, title: n.judul, body: n.isi });
    updateBadge();
    if (LIVE_VIEWS.includes(view.name) && !typing() && !sheet && !menuOpen) render();
  }
  syncNativeNow();
}
document.getElementById('nbar').addEventListener('click', () => { document.getElementById('nbar').hidden = true; if (aud()) go('notifs'); });
setInterval(pump, 4000);
setInterval(() => { if (view.name === 'order' && !typing() && !document.hidden && !sheet && !menuOpen) render(); }, 20000); // hitung mundur ETA
document.addEventListener('visibilitychange', () => { if (document.hidden) stopWatch(); else { refreshPerms(false); pump(); } });

Object.assign(A, {
  notifs() { go('notifs'); },
  izin() { go('izin'); },
  async diag() { diagInfo = null; diagLog = []; go('diag'); diagInfo = await NT.diagnose(); if (view.name === 'diag') render(); },
  async diagGeo() { try { const c = await getFix(); diagLog.push(`Lokasi OK: ${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)} (±${Math.round(c.accuracy)} m)`); } catch (e) { diagLog.push(`Lokasi GAGAL: ${errMsg(e) || e.code}`); } diagInfo = await NT.diagnose(); render(); },
  async diagCam() { const ok = await NT.testCamera(); diagLog.push(ok ? `Kamera OK (${NT.errors.kameraOk})` : `Kamera GAGAL: ${NT.errors.kamera}`); diagInfo = await NT.diagnose(); render(); },
  async diagNotif() { const ok = await NT.showOs({ id: 'dg' + Date.now(), title: 'Tes notifikasi', body: 'Kalau ini muncul di bilah notifikasi HP, notifikasi sistem berfungsi.' }); diagLog.push(ok ? 'Notifikasi sistem: terkirim' : `Notifikasi sistem GAGAL: ${NT.errors.notifikasi || 'izin belum diberikan'}`); diagInfo = await NT.diagnose(); render(); },
  async diagCopy() { const t = diagText(diagInfo || await NT.diagnose()); try { await navigator.clipboard.writeText(t); toast('Laporan disalin.'); } catch (e) { diagLog.push('Salin gagal; gunakan tangkapan layar.'); render(); } },
  async reqPerm(el) {
    const k = el.dataset.k; permState[k] = await NT.requestPerm(k);
    if (k === 'lokasi' && permState.lokasi === 'granted') startWatch();
    if (permState[k] === 'granted') toast(k === 'notifikasi' ? 'Notifikasi aktif.' : k === 'lokasi' ? 'Lokasi aktif.' : 'Kamera aktif.');
    else toast(NT.hint(k, permState[k]) || `Izin ${k} belum diberikan${NT.errors[k] ? ': ' + NT.errors[k] : ''}.`);
    render();
  },
  async reqAll() {
    for (const k of NT.PERM_KINDS) if (permState[k] === 'prompt') permState[k] = await NT.requestPerm(k);
    if (permState.lokasi === 'granted') startWatch();
    const wasSheet = sheet === 'izin'; if (wasSheet) closeOverlay(); else render();
    toast(NT.PERM_KINDS.every(k => permState[k] === 'granted') ? 'Semua izin aktif.' : 'Sebagian izin belum aktif. Buka Izin Aplikasi untuk melihat penyebabnya.');
  },
  async testNotif() {
    const ok = await NT.showOs({ id: 'tes' + Date.now(), title: 'Tes notifikasi', body: 'Notifikasi sistem RepEAT berfungsi.' });
    showBanner({ judul: 'Tes notifikasi', isi: ok ? 'Notifikasi sistem terkirim.' : `Notifikasi sistem belum terkirim (${NT.errors.notifikasi || 'izin belum diberikan'}), jadi hanya tampil di dalam aplikasi.` }, 0);
  },
  openNotif(el) {
    const n = state.notifs.find(x => x.id === el.dataset.id); if (!n) return;
    markNotifs(state, aud(), ui.storeId, { id: n.id }); save(state);
    const L = n.link || {};
    if (L.view === 'detail') { if (activeListings(state, now()).some(x => x.id === L.id)) go('detail', { id: L.id, n: 1 }); else { toast('Produk ini sudah tidak tersedia.'); render(); } }
    else if (L.view === 'order' && state.orders.some(x => x.id === L.id)) go('order', { id: L.id });
    else if (L.view === 'profile') { go('profile', { tab: L.tab || 'set' }); }
    else if (L.view === 'tdash') go('tdash'); else render();
  },
  notifReadAll() { markNotifs(state, aud(), ui.storeId, { all: true }); save(state); render(); },
  notifClear() { markNotifs(state, aud(), ui.storeId, { clear: true }); save(state); render(); },
  togglePref(el) { const k = el.dataset.k; updateBuyer(state, { prefs: { [k]: !state.buyer.prefs[k] } }); save(state); render(); },
  // pesan lagi & tambah produk
  recOrder(el) { startCheckout(el.dataset.id); go('confirm', { id: el.dataset.id, n: Math.min(Math.max(Number(el.dataset.n) || 1, 1), stokOf(el.dataset.id)) }); },
  reorder(el) {
    const p = reorderPlan(state, el.dataset.id, now()); if (!p.ok) { toast(p.error); return; }
    const [main, ...rest] = p.items; startCheckout(main.listingId); co.metode = p.metode; co.catatan = p.catatan; rest.forEach(x => { co.extra[x.listingId] = x.qty; });
    go('confirm', { id: main.listingId, n: main.qty }); if (p.missing.length) toast(`Belum tersedia: ${p.missing.join(', ')}`);
  },
  exAdd(el) { const id = el.dataset.id; co.extra[id] = Math.min((co.extra[id] || 0) + 1, stokOf(id)); render(); },
  exDel(el) { const id = el.dataset.id; co.extra[id] = Math.max((co.extra[id] || 0) - 1, 0); if (!co.extra[id]) delete co.extra[id]; render(); },
  // pengantaran
  siapkan(el) { const r = siapkanPesanan(state, ui.storeId, el.dataset.id, now()); if (!r.ok) { toast(r.error); return; } save(state); render(); toast('Pesanan ditandai disiapkan. Pembeli akan menerima notifikasi.'); },
  antar(el) { const r = mulaiAntar(state, ui.storeId, el.dataset.id, now()); if (!r.ok) { toast(r.error); return; } save(state); render(); toast(`Pengantaran dimulai, tiba sekitar ${jam(r.order.kirim.etaAt)}. Pembeli akan menerima notifikasi.`); },
  // merchant
  applyMer() { if (!ui.role) { ui = { ...ui, role: 'pembeli' }; saveUi(ui); } pd = null; go('profile', { tab: 'mer' }); },
  async merLokasi() {
    if (!md) md = newMd();
    try { const c = await getFix(); permState.lokasi = 'granted'; updateBuyer(state, { lat: c.latitude, lng: c.longitude, akurasi: c.accuracy, at: Date.now() }); save(state); startWatch(); lastFix = { lat: c.latitude, lng: c.longitude };
      if (!state.buyer.lokasiOk) { md.gps = false; flash = { ok: false, msg: 'Lokasimu di luar Surabaya. Pilih area usaha secara manual.' }; }
      else { md.gps = true; md.lat = c.latitude; md.lng = c.longitude; md.akurasi = Math.round(c.accuracy); md.area = nearestArea(c.latitude, c.longitude).area.nama; flash = null; } }
    catch (err) { if (isDenied(err)) permState.lokasi = 'denied'; flash = { ok: false, msg: geoError(err) }; }
    render();
  },
  submitMer() {
    const d = md || newMd(), ar = AREAS.find(a => a.nama === d.area) || AREAS[0];
    const r = submitApplication(state, { nama: d.nama, jenis: d.jenis, alamat: d.alamat, area: d.area, telp: d.telp, jamTutup: d.jam, deskripsi: d.desk, setuju: !!d.setuju, lat: d.gps ? d.lat : ar.lat, lng: d.gps ? d.lng : ar.lng, lokasiSumber: d.gps ? 'gps' : 'area' }, now());
    if (!r.ok) { flash = { ok: false, html: r.errors.map(esc).join('<br>') }; render(); const f = document.getElementById('flash'); if (f) f.scrollIntoView({ block: 'center' }); return; }
    save(state); md = null; flash = { ok: true, msg: 'Pengajuan terkirim. Status: Menunggu ditinjau.' }; render(); window.scrollTo(0, 0);
  },
  merDecide(el) { const r = decideApplication(state, el.dataset.id, el.dataset.ok === '1', now()); if (!r.ok) { toast(r.error); return; } save(state); render(); setTimeout(pump, 50); },
  merEnter(el) { ui = { ...ui, role: 'toko', storeId: el.dataset.store }; saveUi(ui); go('tdash', {}, { replace: true }); toast('Kamu masuk sebagai toko baru. Silakan buat listing pertama.'); setTimeout(pump, 50); },
});

app.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !A[el.dataset.act]) return;
  if ((el.dataset.act === 'menuClose' || el.dataset.act === 'sheetClose') && el.classList.contains('ov') && e.target.closest('[data-stop]')) return;
  try { const r = A[el.dataset.act](el); if (r && r.catch) r.catch(fatal); } catch (err) { fatal(err); }
  setTimeout(pump, 30);
});

app.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q' || t.id === 'qd') {
    if (t.id === 'q') q = t.value; else qd = t.value;
    const pos = t.selectionStart; render();
    const n = document.getElementById(t.id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* abaikan */ } }
  } else if (t.id && t.id.startsWith('f_') && draft) draft[t.id.slice(2)] = t.value;
  else if (t.id && t.id.startsWith('p_') && pd) pd[t.id.slice(2)] = t.value;
  else if (t.id && t.id.startsWith('m_') && md) md[t.id.slice(2)] = t.type === 'checkbox' ? t.checked : t.value;
  else if (t.id === 'c_nomor' && co) { const d = t.value.replace(/\D/g, '').slice(0, 19); co.kartu.nomor = d; t.value = d.replace(/(\d{4})(?=\d)/g, '$1 '); }
  else if (t.id === 'c_exp' && co) { let d = t.value.replace(/\D/g, '').slice(0, 4); if (d.length > 2) d = d.slice(0, 2) + '/' + d.slice(2); co.kartu.exp = d; t.value = d; }
  else if (t.id === 'c_cvv' && co) { co.kartu.cvv = t.value.replace(/\D/g, '').slice(0, 4); t.value = co.kartu.cvv; }
  else if (t.id === 'c_catatan' && co) co.catatan = t.value;
  else if (t.id === 'c_vcode' && co) co.vcode = t.value.toUpperCase();
});
app.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'kode') { e.preventDefault(); A.verify(); } });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && (inOverlay())) closeOverlay(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && scan) closeOverlay(); });

window.addEventListener('error', e => fatal(e.error || e.message));
window.addEventListener('unhandledrejection', e => fatal(e.reason));
render();
NT.initServiceWorker().then(() => refreshPerms(false));
pump();
