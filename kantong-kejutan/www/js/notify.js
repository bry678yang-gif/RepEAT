// Izin perangkat (lokasi, kamera, notifikasi), lokasi, dan notifikasi sistem.
// Di APK Capacitor: memakai plugin resmi @capacitor/geolocation, @capacitor/camera, @capacitor/local-notifications
// (dipanggil lewat Capacitor.registerPlugin, karena aplikasi ini tanpa bundler). Bila plugin tidak ada, jatuh ke Web API.
// Di peramban: Web API (Geolocation, getUserMedia, Notification lewat service worker).
// Galat TIDAK ditelan diam-diam: tersimpan di `errors` dan tampil di layar Diagnosa.
export const PERM_KINDS = ['lokasi', 'kamera', 'notifikasi'];
export const errors = { lokasi: '', kamera: '', notifikasi: '', lokasiOk: '', kameraOk: '' };
const cap = () => window.Capacitor || null;
export const isNative = () => { const c = cap(); try { return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform()); } catch (e) { return false; } };
const cache = new Map();
// Plugin native. Tanpa bundler plugin harus didaftarkan lewat registerPlugin(); Capacitor.Plugins.X saja bisa undefined.
function plugin(name) {
  const c = cap(); if (!c || !isNative()) return null;
  if (cache.has(name)) return cache.get(name);
  let p = null;
  try {
    const avail = typeof c.isPluginAvailable === 'function' ? c.isPluginAvailable(name) : true;
    if (avail) p = typeof c.registerPlugin === 'function' ? c.registerPlugin(name) : (c.Plugins && c.Plugins[name]) || null;
  } catch (e) { p = null; }
  cache.set(name, p); return p;
}
const LN = () => plugin('LocalNotifications'), GEO = () => plugin('Geolocation'), CAM = () => plugin('Camera');
const norm = s => (s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'prompt');
const errText = e => e ? `${e.name || e.code || 'Error'}: ${e.message || e.errorMessage || JSON.stringify(e)}` : '';

export async function queryPerm(kind) {
  try {
    if (kind === 'notifikasi') {
      if (isNative()) { if (LN()) return norm((await LN().checkPermissions()).display); return 'unsupported'; }
      return 'Notification' in window ? norm(Notification.permission) : 'unsupported';
    }
    if (kind === 'lokasi') {
      if (GEO()) { const r = await GEO().checkPermissions(); return norm(r.location === 'granted' || r.coarseLocation === 'granted' ? 'granted' : r.location); }
      if (!navigator.geolocation) return 'unsupported';
    }
    if (kind === 'kamera') {
      if (CAM()) { const r = await CAM().checkPermissions(); if (r.camera === 'granted' || r.camera === 'denied') return r.camera; }
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return 'unsupported';
    }
    if (navigator.permissions && navigator.permissions.query) {
      const r = await navigator.permissions.query({ name: kind === 'lokasi' ? 'geolocation' : 'camera' });
      return norm(r.state);
    }
  } catch (e) { errors[kind] = 'queryPerm: ' + errText(e); }
  return 'prompt';
}

// Minta izin lewat dialog sistem. Harus dipanggil dari ketukan pengguna.
export async function requestPerm(kind) {
  errors[kind] = '';
  try {
    if (kind === 'lokasi') {
      if (GEO()) await GEO().requestPermissions({ permissions: ['location'] });
      else await getPosition();                                   // memicu dialog izin Web API
    } else if (kind === 'kamera') {
      if (CAM()) await CAM().requestPermissions({ permissions: ['camera'] });
      const st = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); st.getTracks().forEach(t => t.stop());
      errors.kameraOk = 'getUserMedia berhasil';
    } else if (kind === 'notifikasi') {
      if (LN()) { await LN().requestPermissions(); await ensureChannel(); }
      else if ('Notification' in window) await Notification.requestPermission();
      else throw new Error(isNative() ? 'Plugin LocalNotifications tidak terpasang di APK' : 'Notification API tidak tersedia');
    }
  } catch (e) { errors[kind] = errText(e); }
  return queryPerm(kind);
}

// ---------- Lokasi ----------
// Satu pembacaan posisi -> {latitude, longitude, accuracy}
export async function getPosition() {
  errors.lokasiOk = '';
  try {
    let c;
    if (GEO()) c = (await GEO().getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 })).coords;
    else c = await new Promise((ok, no) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => ok(p.coords), no, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }) : no({ code: 0, message: 'Geolocation tidak tersedia' }));
    errors.lokasiOk = `posisi didapat (±${Math.round(c.accuracy)} m)`;
    return { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy };
  } catch (e) { errors.lokasi = errText(e); throw e; }
}
// Ikuti posisi terus-menerus. Mengembalikan fungsi untuk berhenti.
export function watchPositionNative(onFix, onErr) {
  let stopped = false, id = null;
  const fix = c => { if (!stopped && c) onFix({ latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy }); };
  if (GEO()) {
    Promise.resolve(GEO().watchPosition({ enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }, (pos, err) => { if (err) { errors.lokasi = errText(err); onErr && onErr(err); } else if (pos) fix(pos.coords); }))
      .then(v => { id = v; if (stopped && id != null) GEO().clearWatch({ id }); }).catch(e => { errors.lokasi = errText(e); onErr && onErr(e); });
    return () => { stopped = true; if (id != null) { try { GEO().clearWatch({ id }); } catch (e) { /* abaikan */ } } };
  }
  if (!navigator.geolocation) { onErr && onErr({ code: 0, message: 'Geolocation tidak tersedia' }); return () => {}; }
  const wid = navigator.geolocation.watchPosition(p => fix(p.coords), e => { errors.lokasi = errText(e); onErr && onErr(e); }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
  return () => { stopped = true; try { navigator.geolocation.clearWatch(wid); } catch (e) { /* abaikan */ } };
}

// ---------- Kamera (uji pembukaan kamera sungguhan) ----------
export async function testCamera() {
  errors.kameraOk = '';
  try {
    const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const label = (st.getVideoTracks()[0] || {}).label || 'kamera'; st.getTracks().forEach(t => t.stop());
    errors.kameraOk = 'getUserMedia berhasil: ' + label; return true;
  } catch (e) { errors.kamera = errText(e); return false; }
}

// ---------- Notifikasi ----------
let swReg = null;
export async function initServiceWorker() {
  if (isNative() || !('serviceWorker' in navigator) || location.protocol === 'file:') return null;
  try { swReg = await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; } catch (e) { swReg = null; errors.notifikasi = 'serviceWorker: ' + errText(e); }
  return swReg;
}
const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) % 2000000000; };
const CHANNEL = 'kk-default';
let channelDone = false;
async function ensureChannel() {
  if (channelDone || !LN()) return; channelDone = true;
  try { await LN().createChannel({ id: CHANNEL, name: 'RepEAT', description: 'Pengingat ambil, pengantaran, dan produk favorit', importance: 4, visibility: 1, vibration: true }); } catch (e) { /* kanal sudah ada / bukan Android */ }
}
const nativeItem = (n, at) => ({ id: hash(n.id), title: n.title, body: n.body, channelId: CHANNEL, schedule: { at, allowWhileIdle: true } });

// Tampilkan notifikasi sistem sekarang. true bila benar-benar dikirim ke sistem.
export async function showOs({ id, title, body }) {
  errors.notifikasi = '';
  try {
    if ((await queryPerm('notifikasi')) !== 'granted') { errors.notifikasi = 'izin notifikasi belum diberikan'; return false; }
    if (LN()) { await ensureChannel(); await LN().schedule({ notifications: [nativeItem({ id: 'now' + id, title, body }, new Date(Date.now() + 500))] }); return true; }
    if (swReg && swReg.showNotification) { await swReg.showNotification(title, { body, tag: String(id), icon: 'icon.svg', badge: 'icon.svg' }); return true; }
    if ('Notification' in window) { new Notification(title, { body, tag: String(id) }); return true; }
    errors.notifikasi = 'tidak ada API notifikasi yang tersedia';
  } catch (e) { errors.notifikasi = errText(e); }
  return false;
}

// Jadwalkan ulang notifikasi mendatang di sistem (hanya APK). items: [{id, title, body, atReal(ms epoch)}]
let lastSig = '';
export async function syncNative(items) {
  const ln = LN(); if (!ln) return false;
  const sig = items.map(i => i.id + ':' + Math.round(i.atReal / 1000)).join('|');
  if (sig === lastSig) return true;
  try {
    if ((await ln.checkPermissions()).display !== 'granted') return false;
    await ensureChannel();
    const pend = await ln.getPending(); if (pend && pend.notifications && pend.notifications.length) await ln.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
    const ok = items.filter(i => i.atReal > Date.now() + 1000).slice(0, 60);
    if (ok.length) await ln.schedule({ notifications: ok.map(i => nativeItem(i, new Date(i.atReal))) });
    lastSig = sig; return true;
  } catch (e) { errors.notifikasi = 'syncNative: ' + errText(e); return false; }
}
export const nativeAvailable = () => !!LN();
export async function listShown() { try { return swReg && swReg.getNotifications ? await swReg.getNotifications() : []; } catch (e) { return []; } }

// ---------- Diagnosa & petunjuk ----------
export async function diagnose() {
  const c = cap(), out = {};
  out.platform = c && c.getPlatform ? c.getPlatform() : 'web'; out.native = isNative(); out.origin = location.origin; out.secure = window.isSecureContext;
  out.plugins = {}; for (const n of ['Geolocation', 'Camera', 'LocalNotifications']) { let a = false; try { a = !!(c && c.isPluginAvailable && c.isPluginAvailable(n)); } catch (e) { a = false; } out.plugins[n] = out.native ? a : null; }
  out.api = { geolocation: !!navigator.geolocation, getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), Notification: 'Notification' in window, serviceWorker: 'serviceWorker' in navigator, permissions: !!navigator.permissions };
  out.perm = {}; for (const k of PERM_KINDS) out.perm[k] = await queryPerm(k);
  out.errors = { ...errors }; out.ua = navigator.userAgent;
  return out;
}
// Petunjuk spesifik berdasarkan kondisi perangkat (tampil di layar Izin).
export function hint(kind, state) {
  const native = isNative();
  if (kind === 'notifikasi') {
    if (native && !LN()) return 'Plugin notifikasi belum ada di APK ini. Jalankan "npm run android:setup", lalu build ulang APK.';
    if (state === 'denied') return 'Notifikasi diblokir. Buka Pengaturan HP > Aplikasi > RepEAT > Notifikasi, lalu aktifkan.';
    if (state === 'unsupported') return 'Peramban ini tidak mendukung notifikasi sistem. Notifikasi tetap tampil di dalam aplikasi.';
  }
  if (kind === 'lokasi') {
    if (state === 'denied') return native ? 'Lokasi diblokir. Buka Pengaturan HP > Aplikasi > RepEAT > Izin > Lokasi. Jika tidak ada pilihan Lokasi, izin belum ada di AndroidManifest: jalankan "npm run android:setup" dan build ulang.' : 'Lokasi diblokir di peramban. Klik ikon gembok di address bar, lalu izinkan Lokasi.';
    if (errors.lokasi && /timeout|3/i.test(errors.lokasi)) return 'Lokasi tidak didapat tepat waktu. Pastikan Lokasi/GPS HP aktif dan coba di tempat terbuka.';
  }
  if (kind === 'kamera') {
    if (state === 'denied') return native ? 'Kamera diblokir. Buka Pengaturan HP > Aplikasi > RepEAT > Izin > Kamera. Jika tidak ada pilihan Kamera, jalankan "npm run android:setup" dan build ulang.' : 'Kamera diblokir di peramban. Klik ikon gembok di address bar, lalu izinkan Kamera.';
    if (native && !window.isSecureContext) return 'Kamera butuh konteks aman (https). Pastikan capacitor.config.json memakai server.androidScheme "https", lalu "npx cap sync".';
  }
  return '';
}
