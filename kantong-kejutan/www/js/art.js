// Ilustrasi makanan buatan kode (SVG), pengganti foto. Tanpa aset luar.
const BG = k => `<defs><radialGradient id="bg${k}" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#f6f1e8"/><stop offset="1" stop-color="#dccfb6"/></radialGradient>
<linearGradient id="gold${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1b866"/><stop offset="1" stop-color="#c47a2e"/></linearGradient></defs>
<rect width="200" height="200" fill="url(#bg${k})"/>`;
const SH = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#3a2a14" opacity=".16"/>`;

function croissant() {
  let s = SH(100, 152, 64, 9);
  [[-66, 12, 21], [-35, 18, 27], [0, 25, 31], [35, 18, 27], [66, 12, 21]].forEach(([a, w, h], i) => {
    const r = a * Math.PI / 180, x = 100 + 66 * Math.sin(r), y = 150 - 52 * Math.cos(r) * 1.0;
    s += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a})"><ellipse rx="${w}" ry="${h}" fill="url(#goldc)" stroke="#a3601f" stroke-width="1.5"/>
    <ellipse rx="${w * .45}" ry="${h * .7}" cx="${-w * .2}" cy="${-h * .1}" fill="#ffe2a8" opacity=".5"/></g>`;
  });
  return `<defs><linearGradient id="goldc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3bd6c"/><stop offset="1" stop-color="#c9772a"/></linearGradient></defs>${s}`;
}

function donutX(ic, sprink) {
  let sp = '';
  const cols = ['#ffffff', '#f7d046', '#6cc3a0', '#e8624a'];
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4, r = 30 + (i * 37 % 26), x = 100 + r * Math.cos(a), y = 100 + r * Math.sin(a) * .9;
    sp += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="10" height="3.6" rx="1.8" fill="${cols[i % 4]}" transform="rotate(${(i * 47) % 180} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  return `${SH(100, 158, 66, 9)}<circle cx="100" cy="100" r="70" fill="url(#gold1)"/><circle cx="100" cy="98" r="62" fill="${ic}"/>
  <path d="M46 84 Q70 52 118 50" stroke="#fff" stroke-opacity=".45" stroke-width="7" fill="none" stroke-linecap="round"/>${sprink ? sp : ''}
  <circle cx="100" cy="100" r="22" fill="#dccfb6"/><circle cx="100" cy="100" r="22" fill="none" stroke="#c98f4a" stroke-width="4"/>`;
}

const donut = () => donutX('#f2a0b2', true);
const donutchoc = () => donutX('#6b3f26', true);
const donutsugar = () => donutX('#f7f3ea', false);

function cakeX(body, band, top, berry) {
  return `${SH(100, 152, 66, 8)}<ellipse cx="100" cy="148" rx="74" ry="12" fill="#fff" stroke="#d8cdb6" stroke-width="2"/>
  <path d="M38 132 V92 Q38 78 52 76 L148 68 Q164 68 164 84 V132 Q164 142 152 142 H50 Q38 142 38 132Z" fill="${body}" stroke="#00000022" stroke-width="2"/>
  <rect x="38" y="104" width="126" height="9" fill="${band}"/><path d="M38 92 Q38 78 52 76 L148 68 Q164 68 164 84 V90 H38Z" fill="${top}"/>
  <path d="M46 82 Q70 74 100 74" stroke="#fff" stroke-opacity=".4" stroke-width="4" fill="none" stroke-linecap="round"/>${berry ? `<circle cx="104" cy="64" r="9" fill="${berry}"/><circle cx="101" cy="61" r="3" fill="#fff" opacity=".5"/>` : ''}`;
}
const cake = () => cakeX('#f4dfae', '#e8c77a', '#c9855a', '#d93a3a');
const redvelvet = () => cakeX('#b8322e', '#fbf3e6', '#fbf3e6', '#b8322e');

function cakeroll() {
  return `${SH(100, 150, 70, 8)}<rect x="28" y="82" width="140" height="64" rx="32" fill="#7a4a2c" stroke="#5a3420" stroke-width="2"/>
  <path d="M60 96 H150 M60 112 H150 M60 128 H150" stroke="#9a6440" stroke-width="3" opacity=".6"/>
  <circle cx="150" cy="114" r="32" fill="#f4e3c0" stroke="#7a4a2c" stroke-width="3"/>
  <path d="M150 114 m0 0 a4 4 0 1 1 8 0 a10 10 0 1 1 -20 0 a16 16 0 1 1 32 0 a22 22 0 1 1 -44 0" stroke="#7a4a2c" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

function danish() {
  return `${SH(100, 156, 62, 8)}<g transform="rotate(45 100 100)"><rect x="40" y="40" width="120" height="120" rx="16" fill="url(#gold1)" stroke="#a3601f" stroke-width="2"/>
  <rect x="60" y="60" width="80" height="80" rx="10" fill="#e8624a"/><rect x="80" y="80" width="40" height="40" rx="8" fill="#fbe9c8"/></g>
  <path d="M60 84 Q80 62 100 58" stroke="#ffe2a8" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`;
}

function muffin() {
  let b = ''; [[70, 92], [88, 70], [112, 84], [128, 100], [100, 100]].forEach(([x, y]) => b += `<circle cx="${x}" cy="${y}" r="5.5" fill="#3f4a8a"/>`);
  return `${SH(100, 158, 52, 7)}<path d="M54 100 Q50 52 100 52 Q150 52 146 100Z" fill="#b9733a" stroke="#8a4f22" stroke-width="2"/>${b}
  <path d="M56 98 H144 L134 152 Q133 158 127 158 H73 Q67 158 66 152Z" fill="#e8d3a8" stroke="#c9ad78" stroke-width="2"/><path d="M80 100 L84 156 M100 100 V158 M120 100 L116 156" stroke="#c9ad78" stroke-width="2"/>`;
}

function cookies() {
  const one = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gold1)" stroke="#a3601f" stroke-width="2"/>` +
    [[-.4, -.3], [.3, -.4], [0, .1], [-.3, .45], [.45, .3]].map(([a, c]) => `<circle cx="${x + a * r}" cy="${y + c * r}" r="${r * .13}" fill="#4a2a18"/>`).join('');
  return `${SH(100, 158, 68, 8)}${one(68, 118, 36)}${one(132, 116, 36)}${one(100, 80, 38)}`;
}

function rolls() {
  let s = `${SH(100, 156, 72, 8)}<rect x="22" y="58" width="156" height="100" rx="14" fill="#e9d3a5" stroke="#cfb27a" stroke-width="2"/>`;
  [[58, 88], [100, 88], [142, 88], [58, 128], [100, 128], [142, 128]].forEach(([x, y]) => {
    s += `<circle cx="${x}" cy="${y}" r="23" fill="url(#gold1)" stroke="#a9651f" stroke-width="1.5"/><ellipse cx="${x - 6}" cy="${y - 8}" rx="11" ry="6" fill="#ffe2a8" opacity=".55"/>
    <path d="M${x - 15} ${y + 2} q7 -8 15 0 t15 0" stroke="#5a3420" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  });
  return s;
}

function loaf() {
  return `${SH(100, 156, 66, 8)}<path d="M38 112 Q38 58 100 58 Q162 58 162 112 L162 142 Q162 152 150 152 L50 152 Q38 152 38 142Z" fill="url(#gold2)" stroke="#a3601f" stroke-width="2"/>
  <defs><linearGradient id="gold2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2a455"/><stop offset="1" stop-color="#b9702a"/></linearGradient></defs>
  <path d="M62 78 l14 22 M92 72 l14 26 M122 78 l14 22" stroke="#f6d9a3" stroke-width="6" stroke-linecap="round"/>
  <path d="M50 100 Q60 70 100 66" stroke="#fff" stroke-opacity=".35" stroke-width="6" fill="none" stroke-linecap="round"/>`;
}

function baguette() {
  const one = (y, rot) => `<g transform="rotate(${rot} 100 ${y})"><rect x="16" y="${y - 17}" width="168" height="34" rx="17" fill="url(#gold1)" stroke="#a3601f" stroke-width="1.8"/>
  ${[44, 72, 100, 128, 156].map(x => `<path d="M${x - 8} ${y + 7} l13 -14" stroke="#f9dfae" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>`;
  return `${SH(100, 160, 70, 8)}${one(86, -14)}${one(124, -14)}`;
}

function bag() {
  return `${SH(100, 172, 56, 8)}
  <g transform="rotate(-12 80 70)"><rect x="66" y="26" width="26" height="70" rx="13" fill="url(#gold1)" stroke="#a3601f" stroke-width="1.6"/><path d="M70 50 l16 -8 M70 66 l16 -8" stroke="#f9dfae" stroke-width="4" stroke-linecap="round"/></g>
  <g transform="rotate(14 124 70)"><rect x="110" y="34" width="26" height="62" rx="13" fill="url(#gold1)" stroke="#a3601f" stroke-width="1.6"/><path d="M114 56 l16 -8 M114 72 l16 -8" stroke="#f9dfae" stroke-width="4" stroke-linecap="round"/></g>
  <path d="M52 84 H148 L158 166 Q159 174 150 174 H50 Q41 174 42 166Z" fill="#d9a766" stroke="#a87a3e" stroke-width="2"/>
  <path d="M52 84 H148 L150 98 H50Z" fill="#c4914f"/><path d="M52 84 H148" stroke="#a87a3e" stroke-width="3"/>
  <circle cx="100" cy="132" r="22" fill="#8b8934"/><text x="100" y="142" text-anchor="middle" font-family="Poppins,Arial,sans-serif" font-weight="700" font-size="28" fill="#fff">?</text>`;
}

const KINDS = { croissant, donut, donutchoc, donutsugar, cake, redvelvet, cakeroll, danish, muffin, cookies, rolls, loaf, baguette, bag };

export function art(kind) {
  const k = KINDS[kind] ? kind : 'rolls';
  return `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="art" aria-hidden="true" focusable="false">${BG(k)}<defs><linearGradient id="gold1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1b866"/><stop offset="1" stop-color="#c47a2e"/></linearGradient></defs>${KINDS[k]()}</svg>`;
}

export function kindFor(tipe, judul) {
  if (tipe === 'kejutan') return 'bag';
  const t = String(judul || '').toLowerCase();
  if (/donat|donut/.test(t)) return /cokelat|choco/.test(t) ? 'donutchoc' : /gula halus|sugar/.test(t) ? 'donutsugar' : 'donut';
  if (/red velvet/.test(t)) return 'redvelvet';
  if (/cheesecake|cake|kue|tart/.test(t) && !/gulung/.test(t)) return 'cake';
  if (/gulung|roll cake|swiss/.test(t)) return 'cakeroll';
  if (/danish/.test(t)) return 'danish';
  if (/muffin|cupcake/.test(t)) return 'muffin';
  if (/cookie|kue kering/.test(t)) return 'cookies';
  if (/croissant|kroisan/.test(t)) return 'croissant';
  if (/baguette|baget/.test(t)) return 'baguette';
  if (/tawar|gandum|loaf/.test(t)) return 'loaf';
  return 'rolls';
}

export const STORE_ART = { s1: 'donut', s2: 'loaf', s3: 'cakeroll', s4: 'croissant', s5: 'muffin', s6: 'redvelvet' };

const P = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', back: '<path d="M15 5l-7 7 7 7"/>',
  up: '<path d="M7 14l5-5 5 5"/>', down: '<path d="M7 10l5 5 5-5"/>', left: '<path d="M14 6l-6 6 6 6"/>', right: '<path d="M10 6l6 6-6 6"/>',
  cart: '<path d="M3 4h2.2l2.2 10.4a1 1 0 001 .8h8.4a1 1 0 001-.8L19.5 8H6"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>', sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  bag: '<path d="M6 8h12l1 12H5L6 8z"/><path d="M9 8a3 3 0 016 0"/>', home: '<path d="M4 11l8-7 8 7v9H4z"/>', store: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16"/>',
  list: '<path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"/>', leaf: '<path d="M5 19c0-8 5-13 15-14 0 10-5 15-13 15M5 19l7-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', check: '<path d="M5 12l4 4 10-10"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  scan: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>',
  ticket: '<path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4z"/><path d="M14 6v12"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2"/>',
  cash: '<rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
  bell: '<path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 00-9 0v4.5zM10 20a2 2 0 004 0"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  store2: '<path d="M4 9l1.5-5h13L20 9zM5 9v11h14V9M10 20v-5h4v5"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 18l5-5 4 4 2-2 4 4"/>',
};
export const icon = (n, size = 24) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
