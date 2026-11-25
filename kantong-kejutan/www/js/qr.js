// Pembuat QR Code offline (mode byte, koreksi galat M, versi 1-10). Tanpa pustaka luar.
// qrMatrix(teks) -> array 2D boolean (true = modul gelap). qrSvg(teks) -> string SVG.

export const EXP = new Array(512), LOG = new Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
export const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGen(n) {
  let g = [1];
  for (let i = 0; i < n; i++) { const next = new Array(g.length + 1).fill(0); g.forEach((c, j) => { next[j] ^= c; next[j + 1] ^= mul(c, EXP[i]); }); g = next; }
  return g;
}
function rsEncode(data, n) {
  const g = rsGen(n), res = new Array(n).fill(0);
  for (const b of data) { const f = b ^ res[0]; res.shift(); res.push(0); if (f) for (let i = 0; i < n; i++) res[i] ^= mul(g[i + 1], f); }
  return res;
}

// [ecc per blok, jumlah blok grup1, data per blok grup1, jumlah blok grup2, data per blok grup2] untuk level M, versi 1..10
export const EC_M = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0], [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
export const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const dataCap = v => { const [, a, b, c, d] = EC_M[v]; return a * b + c * d; };

function bchFormat(data) { let d = data << 10; for (let i = 14; i >= 10; i--) if (d & (1 << i)) d ^= 0x537 << (i - 10); return ((data << 10) | d) ^ 0x5412; }
function bchVersion(v) { let d = v << 12; for (let i = 17; i >= 12; i--) if (d & (1 << i)) d ^= 0x1f25 << (i - 12); return (v << 12) | d; }


// Pola fungsi (finder, timing, alignment, area format/versi) untuk versi tertentu. reserved[r][c] = modul bukan data.
export function layout(ver) {
  const size = 17 + 4 * ver;
  const M = Array.from({ length: size }, () => new Array(size).fill(null));
  const set = (r, c, v) => { if (r >= 0 && c >= 0 && r < size && c < size) M[r][c] = v; };
  const finder = (r, c) => { for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) { const on = i >= 0 && i <= 6 && j >= 0 && j <= 6 && (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)); set(r + i, c + j, on); } };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const al = ALIGN[ver];
  al.forEach(r => al.forEach(c => { if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (c === 6 && r === al[al.length - 1])) return; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1); }));
  set(size - 8, 8, true);
  const reserved = M.map(r => r.map(v => v !== null));
  for (let i = 0; i < 9; i++) { reserved[8][i] = reserved[i][8] = true; }
  for (let i = 0; i < 8; i++) { reserved[8][size - 1 - i] = true; reserved[size - 1 - i][8] = true; }
  if (ver >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { reserved[i][size - 11 + j] = true; reserved[size - 11 + j][i] = true; }
  return { M, reserved, size };
}
export const MASKS = [(r, c) => (r + c) % 2 === 0, r => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0, (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0];

export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  let ver = 0;
  for (let v = 1; v <= 10; v++) { const cc = v < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCap(v) * 8) { ver = v; break; } }
  if (!ver) throw new Error('Teks terlalu panjang untuk QR');
  const size = 17 + 4 * ver, cap = dataCap(ver);

  // bit data
  const bits = []; const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, cap * 8 - bits.length)); while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0; data.length < cap; pad++) data.push(pad % 2 ? 0x11 : 0xec);

  // blok + ECC, lalu interleave
  const [eccN, n1, d1, n2, d2] = EC_M[ver]; const blocks = []; let p = 0;
  for (let i = 0; i < n1 + n2; i++) { const len = i < n1 ? d1 : d2; const blk = data.slice(p, p + len); p += len; blocks.push({ d: blk, e: rsEncode(blk, eccN) }); }
  const out = []; const maxD = Math.max(d1, d2 || 0);
  for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b.d.length) out.push(b.d[i]); });
  for (let i = 0; i < eccN; i++) blocks.forEach(b => out.push(b.e[i]));
  const stream = []; out.forEach(b => put2(b)); function put2(b) { for (let i = 7; i >= 0; i--) stream.push((b >> i) & 1); }

  // matriks
  const { M, reserved } = layout(ver);


  function build(mask) {
    const B = M.map(r => r.slice()); let k = 0, up = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (let n = 0; n < size; n++) {
        const r = up ? size - 1 - n : n;
        for (let c = col; c >= col - 1; c--) { if (reserved[r][c]) continue; let bit = k < stream.length ? stream[k] === 1 : false; k++; if (MASKS[mask](r, c)) bit = !bit; B[r][c] = bit; }
      }
      up = !up;
    }
    const f = bchFormat((0 << 3) | mask); // level M = 00
    for (let i = 0; i < 15; i++) { const bit = ((f >> i) & 1) === 1; if (i < 6) B[i][8] = bit; else if (i < 8) B[i + 1][8] = bit; else B[size - 15 + i][8] = bit; if (i < 8) B[8][size - 1 - i] = bit; else if (i < 9) B[8][15 - i] = bit; else B[8][15 - i - 1] = bit; }
    if (ver >= 7) { const vi = bchVersion(ver); for (let i = 0; i < 18; i++) { const bit = ((vi >> i) & 1) === 1; const a = Math.floor(i / 3), b = i % 3; B[a][size - 11 + b] = bit; B[size - 11 + b][a] = bit; } }
    return B;
  }
  function penalty(B) {
    let s = 0;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < size; i++) {
      let run = 1;
      for (let j = 1; j < size; j++) { const a = pass ? B[j][i] : B[i][j], b = pass ? B[j - 1][i] : B[i][j - 1]; if (a === b) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; }
    }
    for (let i = 0; i < size - 1; i++) for (let j = 0; j < size - 1; j++) if (B[i][j] === B[i + 1][j] && B[i][j] === B[i][j + 1] && B[i][j] === B[i + 1][j + 1]) s += 3;
    const dark = B.flat().filter(Boolean).length; s += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
    return s;
  }
  let best = null, bestS = Infinity;
  for (let m = 0; m < 8; m++) { const B = build(m); const s = penalty(B); if (s < bestS) { bestS = s; best = B; } }
  return best;
}

export function qrSvg(text, { quiet = 3, dark = '#262626', light = '#ffffff' } = {}) {
  const m = qrMatrix(text), n = m.length, t = n + quiet * 2; let d = '';
  m.forEach((row, r) => { let c = 0; while (c < n) { if (row[c]) { let e = c; while (e < n && row[e]) e++; d += `M${c + quiet} ${r + quiet}h${e - c}v1h-${e - c}z`; c = e; } else c++; } });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" class="qrsvg" role="img" aria-label="QR Kode Ambil"><rect width="${t}" height="${t}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}
