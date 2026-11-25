// Simulasi APK Capacitor (WebView): TIDAK ada Notification API, plugin native dipanggil lewat Capacitor.registerPlugin.
// Plugin palsu mengikuti bentuk API resmi @capacitor/geolocation, /camera, /local-notifications.
// Ini menguji LOGIKA aplikasi terhadap API tersebut. Perilaku sungguhan di HP tetap harus dicoba di perangkat.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const BASE = process.env.BASE || 'http://localhost:8080/';
const browser = await chromium.launch({ channel: 'chromium' });
const errors = []; let step = 0; const ok = m => console.log(`ok ${++step} - ${m}`);
const tid = id => `[data-testid="${id}"]`;

const fakeNative = ({ withNotifPlugin = true, camDenied = false }) => {
  const calls = []; window.__calls = calls; window.__sched = []; window.__cancelled = 0;
  const st = { geo: 'prompt', cam: 'prompt', notif: 'prompt' }; window.__st = st;
  let fix = { latitude: -7.2597, longitude: 112.7401, accuracy: 12 }, watcher = null;
  window.__geoMove = (lat, lng) => { fix = { latitude: lat, longitude: lng, accuracy: 8 }; if (watcher) watcher({ coords: fix }); };
  const plugins = {
    Geolocation: {
      checkPermissions: async () => ({ location: st.geo, coarseLocation: st.geo }),
      requestPermissions: async () => { calls.push('geo.requestPermissions'); st.geo = 'granted'; return { location: 'granted', coarseLocation: 'granted' }; },
      getCurrentPosition: async () => { calls.push('geo.getCurrentPosition'); if (st.geo !== 'granted') throw { code: 1, message: 'User denied location permission request' }; return { coords: fix }; },
      watchPosition: async (_o, cb) => { calls.push('geo.watchPosition'); watcher = cb; setTimeout(() => cb({ coords: fix }), 40); return 'watch-1'; },
      clearWatch: async () => { calls.push('geo.clearWatch'); watcher = null; },
    },
    Camera: {
      checkPermissions: async () => ({ camera: st.cam, photos: 'granted' }),
      requestPermissions: async (o) => { calls.push('cam.requestPermissions:' + JSON.stringify(o)); st.cam = camDenied ? 'denied' : 'granted'; return { camera: st.cam }; },
    },
    LocalNotifications: {
      checkPermissions: async () => ({ display: st.notif }),
      requestPermissions: async () => { calls.push('ln.requestPermissions'); st.notif = 'granted'; return { display: 'granted' }; },
      createChannel: async c => { calls.push('ln.createChannel:' + c.id); },
      schedule: async o => { calls.push('ln.schedule'); o.notifications.forEach(n => window.__sched.push({ ...n, at: new Date(n.schedule.at).getTime() })); },
      getPending: async () => ({ notifications: window.__sched.map(n => ({ id: n.id })) }),
      cancel: async o => { window.__cancelled += o.notifications.length; window.__sched = window.__sched.filter(n => !o.notifications.some(c => c.id === n.id)); },
    },
  };
  if (!withNotifPlugin) delete plugins.LocalNotifications;
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: n => n in plugins, registerPlugin: n => { calls.push('register:' + n); return plugins[n]; }, Plugins: {} };
  delete window.Notification;                                   // WebView Android tidak punya Notification API
  Object.defineProperty(navigator.geolocation, 'getCurrentPosition', { value: () => { throw new Error('Web geolocation tidak boleh dipakai bila plugin ada'); } });
  navigator.mediaDevices.getUserMedia = async () => { if (camDenied) { const e = new Error('Permission denied'); e.name = 'NotAllowedError'; throw e; } return { getTracks: () => [{ stop() {} }], getVideoTracks: () => [{ label: 'kamera belakang' }] }; };
};

async function open(init) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(init.fn, init.arg);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); page.on('dialog', d => d.accept());
  await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.reload();
  return { ctx, page, click: s => page.locator(s).first().click(), text: () => page.locator('#app').innerText() };
}

// ===== A. APK lengkap: ketiga plugin terpasang =====
{
  const { ctx, page, click, text } = await open({ fn: fakeNative, arg: {} });
  await click(tid('role-buyer-btn')); await page.waitForSelector(tid('permission-sheet-overlay'));
  assert.equal(await page.locator('.perm[data-state=prompt]').count(), 3); ok('APK: sheet izin muncul dengan ketiga izin "belum ditanya" (dibaca dari plugin native)');
  await click(tid('permission-sheet-allow-all-btn'));
  await page.waitForFunction(() => window.__st.geo === 'granted' && window.__st.cam === 'granted' && window.__st.notif === 'granted');
  const calls = await page.evaluate(() => window.__calls);
  for (const c of ['register:Geolocation', 'register:Camera', 'register:LocalNotifications', 'geo.requestPermissions', 'ln.requestPermissions', 'ln.createChannel:kk-default']) assert.ok(calls.includes(c), 'tidak terpanggil: ' + c + ' | ' + calls.join(','));
  assert.ok(calls.some(c => c.startsWith('cam.requestPermissions') && c.includes('camera'))); ok('"Izinkan Semua" memanggil requestPermissions plugin Geolocation, Camera, LocalNotifications (+ membuat kanal notifikasi)');
  await page.waitForSelector(tid('permission-sheet-overlay'), { state: 'detached' });
  await page.waitForFunction(() => /dekat Tunjungan/.test(document.querySelector('[data-testid=home-location-bar]').innerText)); assert.ok((await page.evaluate(() => window.__calls)).includes('geo.watchPosition')); ok('lokasi dibaca lewat plugin Geolocation (watchPosition), bukan Web API');
  await page.evaluate(() => window.__geoMove(-7.289968, 112.7163)); await page.waitForFunction(() => /Shangri-La/.test(document.querySelector('.row').innerText)); ok('posisi berpindah lewat plugin → daftar toko terdekat ikut berubah');
  await page.evaluate(() => window.__geoMove(-7.2597, 112.7401)); await page.waitForFunction(() => /Majapahit/.test(document.querySelector('.row').innerText));
  // pesan -> notifikasi dijadwalkan di sistem (APK) untuk jam ambil
  await page.locator('.row', { hasText: 'Croissant' }).first().click(); await click(tid('detail-order-btn')); await click(tid('confirm-payment-tab-tunai')); await click(tid('confirm-pay-btn'));
  await page.waitForFunction(() => window.__sched.length >= 2);
  const sched = await page.evaluate(() => window.__sched.map(n => ({ title: n.title, at: n.at, ch: n.channelId, idOk: Number.isInteger(n.id) && n.id > 0 && n.id < 2147483647, idle: n.schedule.allowWhileIdle })));
  const start = sched.find(n => n.title === 'Waktunya ambil pesanan'); assert.ok(start, JSON.stringify(sched)); assert.ok(start.idOk && start.idle && start.ch === 'kk-default');
  const mins = (start.at - Date.now()) / 60000; assert.ok(mins > 20 && mins < 35, 'menit: ' + mins); ok(`pesanan dibuat → notifikasi "Waktunya ambil" dijadwalkan di sistem ±${Math.round(mins)} menit lagi (id int32, kanal, allowWhileIdle)`);
  assert.ok(sched.some(n => n.title === 'Tinggal 30 menit lagi') && sched.some(n => n.title === 'Pesanan hangus')); ok('pengingat 30 menit terakhir dan hangus juga dijadwalkan');
  // Majukan jam: yang jatuh tempo ditampilkan sekarang, jadwal lama dibatalkan dan dibuat ulang
  const before = await page.evaluate(() => window.__cancelled);
  await click(tid('header-menu-btn')); await click(tid('menu-advance-btn'));
  await page.waitForFunction(() => window.__sched.some(n => n.title === 'Waktunya ambil pesanan' && Math.abs(n.at - Date.now()) < 5000), null, { timeout: 15000 });
  assert.ok((await page.evaluate(() => window.__cancelled)) > before); ok('Majukan jam: notifikasi yang jatuh tempo tampil segera di sistem; jadwal lama dibatalkan & disusun ulang');
  // layar diagnosa
  await click(tid('header-menu-btn')); await click(tid('menu-permissions-btn')); await click(tid('permission-diagnostics-btn')); await page.waitForSelector(tid('diagnostics-report'));
  const d = await page.locator(tid('diagnostics-report')).innerText(); assert.match(d, /android \(aplikasi native\)/); assert.match(d, /Plugin LocalNotifications\s*ada/); assert.match(d, /Plugin Geolocation\s*ada/); assert.match(d, /API Notification\s*tidak ada/); assert.match(d, /Izin notifikasi\s*granted/);
  await click(tid('diagnostics-location-btn')); await page.waitForFunction(() => /Lokasi OK/.test(document.body.innerText)); await click(tid('diagnostics-camera-btn')); await page.waitForFunction(() => /Kamera OK/.test(document.body.innerText));
  await click(tid('diagnostics-notification-btn')); await page.waitForFunction(() => /Notifikasi sistem: terkirim/.test(document.body.innerText));
  ok('layar Diagnosa: platform, plugin, API, izin; tes Lokasi/Kamera/Notifikasi berhasil'); 
  const miss = await page.evaluate(() => [...document.querySelectorAll('#app button,#app input,#app select,#app textarea,#app [data-act]')].filter(e => !e.dataset.testid).map(e => e.outerHTML.slice(0, 80))); assert.deepEqual(miss, []); ok('layar Diagnosa: semua elemen interaktif punya data-testid');
  await ctx.close();
}

// ===== B. APK tanpa plugin notifikasi: penyebab harus terlihat jelas =====
{
  const { ctx, page, click } = await open({ fn: fakeNative, arg: { withNotifPlugin: false } });
  await click(tid('role-buyer-btn')); await page.waitForSelector(tid('permission-sheet-overlay'));
  await click(tid('permission-sheet-later-btn')); await click(tid('header-menu-btn')); await click(tid('menu-permissions-btn'));
  assert.equal(await page.locator('.perm[data-state=unsupported]').count(), 1); const h = await page.locator(tid('permission-hint-notifikasi')).innerText(); assert.match(h, /npm run android:setup/); ok('plugin notifikasi tidak terpasang: layar Izin menjelaskan penyebab dan perintah perbaikannya');
  await click(tid('permission-test-notification-btn')); await page.waitForFunction(() => /belum terkirim/.test(document.getElementById('nbar').innerText)); ok('Tes Notifikasi menampilkan alasan kegagalan, bukan diam');
  await ctx.close();
}

// ===== C. Kamera diblokir di WebView =====
{
  const { ctx, page, click } = await open({ fn: fakeNative, arg: { camDenied: true } });
  await click(tid('role-buyer-btn')); await page.waitForSelector(tid('permission-sheet-overlay')); await click(tid('permission-sheet-allow-all-btn')); await page.waitForSelector(tid('permission-sheet-overlay'), { state: 'detached' });
  await click(tid('header-menu-btn')); await click(tid('menu-permissions-btn'));
  assert.equal(await page.locator('.perm[data-state=denied]').count(), 1); assert.match(await page.locator(tid('permission-hint-kamera')).innerText(), /Pengaturan HP > Aplikasi > RepEAT > Izin > Kamera/); ok('kamera ditolak: petunjuk langkah di Pengaturan HP tampil');
  await click(tid('bottom-nav-tab-home')); await click(tid('header-menu-btn')); await click(tid('menu-roles-btn')); await click(tid('role-seller-btn')); await click(tid('tdash-scan-btn'));
  await page.waitForFunction(() => /Kamera diblokir/.test(document.getElementById('scanMsg').innerText)); ok('scanner penjual: pesan galat kamera spesifik (bukan sekadar gagal)');
  await ctx.close();
}
assert.deepEqual(errors.filter(e => !/Failed to load resource/.test(e)), [], 'galat konsol: ' + errors.join(' | ')); ok('tanpa galat JavaScript');
await browser.close();
