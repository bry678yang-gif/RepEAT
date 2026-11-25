// Pembaca QR offline untuk kode buatan qr.js (mode byte, koreksi galat M, versi 1-10).
// decodeQR({data,width,height}) -> string | null. data = RGBA (seperti ImageData).
import { EXP, LOG, mul, EC_M, layout, MASKS } from './qr.js';

// ---------- 1. Biner ----------
function binarize(img) {
  const { data, width: w, height: h } = img;
  const g = new Float32Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += g[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
  const win = Math.max(15, (Math.floor(Math.min(w, h) / 8) | 1)), r = win >> 1;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const sum = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      out[y * w + x] = g[y * w + x] < mean * 0.9 ? 1 : 0;
    }
  }
  return { bin: out, w, h };
}

// ---------- 2. Finder pattern (1:1:3:1:1) ----------
const near = (a, b, tol) => Math.abs(a - b) <= tol;
function ratioOk(c) {
  const t = c[0] + c[1] + c[2] + c[3] + c[4]; if (t < 7) return 0;
  const m = t / 7, tol = m * 0.6;
  return near(c[0], m, tol) && near(c[1], m, tol) && near(c[2], 3 * m, tol * 3) && near(c[3], m, tol) && near(c[4], m, tol) ? m : 0;
}
// Hitung 5 run di sekitar (x,y) searah (dx,dy); kembalikan {counts, center}
function crossCheck(B, x, y, dx, dy) {
  const { bin, w, h } = B; const at = (i) => { const xx = x + dx * i, yy = y + dy * i; return xx < 0 || yy < 0 || xx >= w || yy >= h ? -1 : bin[yy * w + xx]; };
  if (at(0) !== 1) return null;
  const c = [0, 0, 0, 0, 0];
  let i = 0; while (at(i) === 1) { c[2]++; i++; } const fwd = i;
  while (at(i) === 0) { c[3]++; i++; } while (at(i) === 1) { c[4]++; i++; }
  let j = -1; while (at(j) === 1) { c[2]++; j--; } const bwd = j;
  while (at(j) === 0) { c[1]++; j--; } while (at(j) === 1) { c[0]++; j--; }
  const m = ratioOk(c); if (!m) return null;
  const total = c[0] + c[1] + c[2] + c[3] + c[4];
  return { m, total, off: (bwd + fwd) / 2 };
}
function findFinders(B) {
  const { bin, w, h } = B; const cands = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w && bin[y * w + x] === 0) x++;
    const runs = []; // panjang run berurutan dimulai dari gelap
    let cur = 1, prev = bin[y * w + x];
    const starts = [x];
    for (let i = x + 1; i <= w; i++) {
      const v = i < w ? bin[y * w + i] : 2;
      if (v === prev) cur++; else { runs.push(cur); starts.push(i); cur = 1; prev = v; }
    }
    for (let k = 0; k + 4 < runs.length; k += 2) {
      const c = runs.slice(k, k + 5); const m = ratioOk(c); if (!m) continue;
      const cx = starts[k] + c[0] + c[1] + c[2] / 2;
      const xi = Math.floor(cx);
      const v = crossCheck(B, xi, y, 0, 1); if (!v) continue;
      const cy = y + v.off;
      const yi = Math.round(cy);
      const hz = crossCheck(B, xi, yi, 1, 0); if (!hz) continue;
      const fx = xi + hz.off, size = (v.total + hz.total) / 14;
      const hit = cands.find(q => Math.hypot(q.x - fx, q.y - cy) < Math.max(size, q.m) * 1.5 && Math.abs(q.m - size) < q.m * 0.5);
      if (hit) { hit.x = (hit.x * hit.n + fx) / (hit.n + 1); hit.y = (hit.y * hit.n + cy) / (hit.n + 1); hit.m = (hit.m * hit.n + size) / (hit.n + 1); hit.n++; }
      else cands.push({ x: fx, y: cy, m: size, n: 1 });
    }
  }
  return cands.filter(c => c.n >= 2).sort((a, b) => b.n - a.n).slice(0, 8);
}
function pickTriple(c) {
  let best = null, bs = Infinity;
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) for (let k = j + 1; k < c.length; k++) {
    const P = [c[i], c[j], c[k]]; const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const ds = [d(P[0], P[1]), d(P[0], P[2]), d(P[1], P[2])].sort((a, b) => a - b);
    const ms = P.map(p => p.m), mm = (ms[0] + ms[1] + ms[2]) / 3;
    const score = Math.abs(ds[0] - ds[1]) / ds[1] + Math.abs(ds[2] - ds[1] * Math.SQRT2) / ds[2] + ms.reduce((a, m) => a + Math.abs(m - mm), 0) / mm;
    if (ds[0] < mm * 8) continue; // terlalu dekat untuk QR valid
    if (score < bs) { bs = score; best = P; }
  }
  return bs < 1.2 ? best : null;
}
function orient(P) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const opp = [d(P[1], P[2]), d(P[0], P[2]), d(P[0], P[1])];
  const t = opp.indexOf(Math.max(...opp)); const tl = P[t], o = P.filter((_, i) => i !== t);
  const cross = (o[0].x - tl.x) * (o[1].y - tl.y) - (o[0].y - tl.y) * (o[1].x - tl.x);
  return cross > 0 ? { tl, tr: o[0], bl: o[1] } : { tl, tr: o[1], bl: o[0] };
}

// ---------- 3. Ambil sampel modul ----------
// Homografi 8 parameter dari 4 pasang titik (modul -> piksel).
function homography(src, dst) {
  const A = [], y = [];
  for (let i = 0; i < 4; i++) {
    const [x, yy] = src[i], [u, v] = dst[i];
    A.push([x, yy, 1, 0, 0, 0, -u * x, -u * yy]); y.push(u);
    A.push([0, 0, 0, x, yy, 1, -v * x, -v * yy]); y.push(v);
  }
  for (let i = 0; i < 8; i++) {
    let p = i; for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    if (Math.abs(A[p][i]) < 1e-9) return null;
    [A[i], A[p]] = [A[p], A[i]]; [y[i], y[p]] = [y[p], y[i]];
    for (let r = 0; r < 8; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c < 8; c++) A[r][c] -= f * A[i][c]; y[r] -= f * y[i]; }
  }
  const h = y.map((v, i) => v / A[i][i]);
  return (x, yy) => { const w = h[6] * x + h[7] * yy + 1; return [(h[0] * x + h[1] * yy + h[2]) / w, (h[3] * x + h[4] * yy + h[5]) / w]; };
}
const bit = (B, x, y) => { const px = Math.round(x), py = Math.round(y); return px >= 0 && py >= 0 && px < B.w && py < B.h ? B.bin[py * B.w + px] : 0; };

// Cari pusat alignment pattern di dekat perkiraan (px,py); kembalikan titik piksel atau null.
function findAlignment(B, f, dim, px, py) {
  const { tl, tr, bl } = f, ux = (tr.x - tl.x) / (dim - 7), uy = (tr.y - tl.y) / (dim - 7), vx = (bl.x - tl.x) / (dim - 7), vy = (bl.y - tl.y) / (dim - 7);
  const m = Math.hypot(ux, uy), R = Math.ceil(m * 3.5); let best = null, bs = -1;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const cx = px + dx, cy = py + dy; let sc = 0;
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const want = Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0;
      if (bit(B, cx + i * ux + j * vx, cy + i * uy + j * vy) === want) sc++;
    }
    sc -= Math.hypot(dx, dy) / (m * 20); // tie-break: dekat prediksi
    if (sc > bs) { bs = sc; best = [cx, cy]; }
  }
  return bs >= 23 ? best : null;
}

function sample(B, f, ver, mode) {
  const dim = 17 + 4 * ver, { tl, tr, bl } = f;
  const ux = (tr.x - tl.x) / (dim - 7), uy = (tr.y - tl.y) / (dim - 7), vx = (bl.x - tl.x) / (dim - 7), vy = (bl.y - tl.y) / (dim - 7);
  const aff = (x, y) => [tl.x + (x - 3.5) * ux + (y - 3.5) * vx, tl.y + (x - 3.5) * uy + (y - 3.5) * vy];
  let map = aff;
  if (mode === 'persp') {
    const src = [[3.5, 3.5], [dim - 3.5, 3.5], [3.5, dim - 3.5]], dst = [[tl.x, tl.y], [tr.x, tr.y], [bl.x, bl.y]];
    if (ver >= 2) {
      const [ex, ey] = aff(dim - 6.5, dim - 6.5), ap = findAlignment(B, f, dim, ex, ey);
      if (!ap) return null; src.push([dim - 6.5, dim - 6.5]); dst.push(ap);
    } else { src.push([dim - 3.5, dim - 3.5]); dst.push([tr.x + bl.x - tl.x, tr.y + bl.y - tl.y]); }
    map = homography(src, dst); if (!map) return null;
  }
  const M = [];
  for (let r = 0; r < dim; r++) {
    const row = [];
    for (let c = 0; c < dim; c++) {
      let dark = 0; // vote 5 titik kecil di sekitar pusat modul agar tahan noise
      for (const [ox, oy] of [[0, 0], [-0.25, 0], [0.25, 0], [0, -0.25], [0, 0.25]]) { const [x, y] = map(c + 0.5 + ox, r + 0.5 + oy); if (bit(B, x - 0.5 + 0.5, y)) dark++; }
      row.push(dark >= 3);
    }
    M.push(row);
  }
  return M;
}

// ---------- 4. Format, data, Reed-Solomon ----------
const FORMATS = (() => { const out = []; for (let d = 0; d < 32; d++) { let v = d << 10; for (let i = 14; i >= 10; i--) if (v & (1 << i)) v ^= 0x537 << (i - 10); out.push({ d, bits: ((d << 10) | v) ^ 0x5412 }); } return out; })();
const pop = x => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };
function readFormat(M) {
  const n = M.length, a = [], b = [];
  for (let i = 0; i < 15; i++) {
    a.push(i < 6 ? M[i][8] : i < 8 ? M[i + 1][8] : M[n - 15 + i][8]);
    b.push(i < 8 ? M[8][n - 1 - i] : i < 9 ? M[8][15 - i] : M[8][15 - i - 1]);
  }
  const num = arr => arr.reduce((v, bit, i) => v | ((bit ? 1 : 0) << i), 0);
  let best = null, bd = 99;
  for (const raw of [num(a), num(b)]) for (const f of FORMATS) { const d = pop(raw ^ f.bits); if (d < bd) { bd = d; best = f.d; } }
  return bd <= 3 ? { ecc: best >> 3, mask: best & 7 } : null;
}

function polyEval(p, x) { let y = 0; for (const c of p) y = mul(y, x) ^ c; return y; } // p: koefisien tertinggi dulu
const inv = a => EXP[255 - LOG[a]];
function rsCorrect(cw, nEcc) {
  const S = []; let bad = false;
  for (let i = 0; i < nEcc; i++) { S.push(polyEval(cw, EXP[i])); if (S[i]) bad = true; }
  if (!bad) return cw;
  // Berlekamp-Massey
  let C = [1], Bp = [1], L = 0, m = 1, b = 1;
  for (let n = 0; n < nEcc; n++) {
    let d = S[n]; for (let i = 1; i <= L; i++) d ^= mul(C[i] || 0, S[n - i]);
    if (d === 0) { m++; continue; }
    const T = C.slice(), coef = mul(d, inv(b));
    while (C.length < Bp.length + m) C.push(0);
    for (let i = 0; i < Bp.length; i++) C[i + m] ^= mul(coef, Bp[i]);
    if (2 * L <= n) { L = n + 1 - L; Bp = T; b = d; m = 1; } else m++;
  }
  if (L * 2 > nEcc) return null;
  const len = cw.length, pos = [];
  const pw = (a, k) => EXP[(((LOG[a] * k) % 255) + 255) % 255]; // a^k, a != 0
  for (let i = 0; i < len; i++) { // Chien: simpangan di indeks i bila sigma(X^-1) = 0, X = alpha^(len-1-i)
    const X = EXP[len - 1 - i], xinv = inv(X); let v = 0;
    for (let k = 0; k <= L; k++) if (C[k]) v ^= mul(C[k], pw(xinv, k));
    if (v === 0) pos.push(i);
  }
  if (pos.length !== L) return null;
  const omega = new Array(nEcc).fill(0); // Omega = S(x) * sigma(x) mod x^nEcc
  for (let i = 0; i < nEcc; i++) for (let k = 0; k <= i && k <= L; k++) omega[i] ^= mul(C[k] || 0, S[i - k]);
  const out = cw.slice();
  for (const i of pos) { // Forney (b = 0): e = X * Omega(X^-1) / sigma'(X^-1)
    const X = EXP[len - 1 - i], xinv = inv(X);
    let num = 0; for (let k = 0; k < nEcc; k++) if (omega[k]) num ^= mul(omega[k], pw(xinv, k));
    let den = 0; for (let k = 1; k <= L; k += 2) if (C[k]) den ^= mul(C[k], pw(xinv, k - 1));
    if (!den) return null;
    out[i] ^= mul(X, mul(num, inv(den)));
  }
  return polyEvalAll(out, nEcc) ? out : null;
}
const polyEvalAll = (cw, nEcc) => { for (let i = 0; i < nEcc; i++) if (polyEval(cw, EXP[i])) return false; return true; };

function readData(M, ver, mask) {
  const { reserved, size } = layout(ver); const bits = []; let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let n = 0; n < size; n++) {
      const r = up ? size - 1 - n : n;
      for (let c = col; c >= col - 1; c--) { if (reserved[r][c]) continue; let bit = M[r][c]; if (MASKS[mask](r, c)) bit = !bit; bits.push(bit ? 1 : 0); }
    }
    up = !up;
  }
  const cw = []; for (let i = 0; i + 7 < bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  const [eccN, n1, d1, n2, d2] = EC_M[ver], nb = n1 + n2, lens = []; for (let i = 0; i < nb; i++) lens.push(i < n1 ? d1 : d2);
  const maxD = Math.max(d1, d2 || 0), blocks = lens.map(() => ({ d: [], e: [] })); let p = 0;
  for (let i = 0; i < maxD; i++) for (let k = 0; k < nb; k++) if (i < lens[k]) blocks[k].d.push(cw[p++]);
  for (let i = 0; i < eccN; i++) for (let k = 0; k < nb; k++) blocks[k].e.push(cw[p++]);
  const data = [];
  for (const b of blocks) { const fixed = rsCorrect(b.d.concat(b.e), eccN); if (!fixed) return null; data.push(...fixed.slice(0, b.d.length)); }
  return data;
}

function parseBytes(data, ver) {
  const bits = data.map(b => b.toString(2).padStart(8, '0')).join('');
  if (bits.slice(0, 4) !== '0100') return null;
  const cc = ver < 10 ? 8 : 16, len = parseInt(bits.slice(4, 4 + cc), 2), bytes = [];
  for (let i = 0; i < len; i++) { const s = 4 + cc + i * 8; if (s + 8 > bits.length) return null; bytes.push(parseInt(bits.slice(s, s + 8), 2)); }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); } catch (e) { return null; }
}

export function decodeMatrix(M) {
  const ver = (M.length - 17) / 4; if (!Number.isInteger(ver) || ver < 1 || ver > 10) return null;
  const f = readFormat(M); if (!f || f.ecc !== 0) return null; // 0 = level M
  const data = readData(M, ver, f.mask); return data ? parseBytes(data, ver) : null;
}

export function decodeQR(img) {
  const B = binarize(img);
  const tri = pickTriple(findFinders(B)); if (!tri) return null;
  const f = orient(tri), d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const m = (f.tl.m + f.tr.m + f.bl.m) / 3, dimEst = (d(f.tl, f.tr) + d(f.tl, f.bl)) / 2 / m + 7;
  const v0 = Math.min(10, Math.max(1, Math.round((dimEst - 17) / 4)));
  // Lebar run finder membesar saat kode miring, jadi estimasi versi bisa meleset: coba semua versi, terdekat dulu.
  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].sort((a, b) => Math.abs(a - v0) - Math.abs(b - v0) || b - a);
  for (const v of order) {
    for (const mode of ['persp', 'affine']) { const M = sample(B, f, v, mode); const r = M && decodeMatrix(M); if (r) return r; }
  }
  return null;
}
