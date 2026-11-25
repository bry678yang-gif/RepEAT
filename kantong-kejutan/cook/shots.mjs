// Harness: node cook/shots.mjs rNN  -> cook/stills/rNN/S01..S05.png (server harus jalan di :8080)
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('/opt/npm-tools/node_modules/playwright');
const r = process.argv[2] || 'r01', out = `cook/stills/${r}`; fs.mkdirSync(out, { recursive: true });
const W = 390, H = Math.round(390 * 626 / 289);
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:8080/'); await p.evaluate(() => localStorage.clear()); await p.reload();
const shot = async (n, clip) => { await p.waitForTimeout(150); await p.screenshot({ path: `${out}/${n}.png`, ...(clip ? { clip } : {}) }); };
// S04 beranda atas
await p.click('[data-role=pembeli]'); await p.setViewportSize({ width: W, height: Math.round(390 * 613 / 312) }); await p.evaluate(() => scrollTo(0, 0)); await shot('S04');
// S01 daftar
await p.setViewportSize({ width: W, height: H });
await p.evaluate(() => { const y = document.getElementById('list').getBoundingClientRect().top + scrollY - 0.44 * 390; scrollTo(0, y); }); await shot('S01');
// S02 detail
await p.evaluate(() => scrollTo(0, 0)); await p.locator('.row').first().click(); await shot('S02');
// pesanan untuk S03: pesan 3 item dari toko s1 lalu masuk sebagai toko
await p.click('[data-act=toConfirm]'); await p.click('[data-act=pay]');
for (const i of [1, 2]) { await p.click('[data-to=home]'); await p.locator('.row').nth(i % 2 ? 1 : 0).click(); await p.click('[data-act=toConfirm]'); await p.click('[data-act=pay]'); }
await p.click('[data-act=menu]'); await p.click('[data-act=roles]'); await p.click('[data-role=toko]'); await p.evaluate(() => scrollTo(0, 0)); await shot('S03');
// S05 kategori (pembeli, tab Toko), klip kiri 70% seperti crop referensi
await p.click('[data-act=menu]'); await p.click('[data-act=roles]'); await p.click('[data-role=pembeli]'); await p.click('[data-to=stores]');
await p.click('.cc >> nth=0'); await p.evaluate(() => scrollTo(0, 0));
const k = 390 / 289 * 1; await shot('S05', { x: 0, y: Math.round(0.07 * 390), width: Math.round(220 / 312 * 390), height: Math.round(410 / 312 * 390) });
console.log(errs.length ? 'ERR ' + errs.join(' | ') : 'no js errors'); await b.close();
