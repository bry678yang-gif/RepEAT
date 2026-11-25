# Cook ledger: Kantong Kejutan UI

Copy this to `cook/ROUNDS.md` at the start of a run. Keep the header current. Add one round entry per round, newest at the bottom. Label every number as measured or eyeballed.

Started: 2026-11-21 05:17 UTC
Time: floor none | cap 2h
Bar: layout [99] | color [99] | shape [99] | typography [99] | detail [99]
Calibration offset: [none yet] (from [user estimate, date])
Usage: hemat, 2 putaran
Gate: stills approved [ya] | final render [zip dibuat]
Best so far: round [N], `cook/stills/r[NN]/`, [commit or snapshot]

## Decisions

- awal: nama aplikasi tetap Kantong Kejutan; foto diganti ilustrasi SVG; hamburger = menu (ganti peran, reset, majukan jam); bell diganti pill DEMO; pencarian dan sort dibuat berfungsi; kritik: tidak ada subagen, skor mandiri (self-scored) dan ukuran terukur.

## User feedback inbox

Exact words. Close an item only when a still or clip proves it.
- [time] "[quote]" | round [N] | [open / done, proof: path]

---

## Round [NN]

Time: floor none | cap 2h
Usage: hemat, 2 putaran
Focus: [shot and dimension], because [user feedback / lowest score / largest gap]

Changes:
- [what changed, where]

Stills: `cook/stills/r[NN]/` | Side by side: `cook/compare/r[NN]/`

Scores, eyeballed: critic median after calibration ([n] critics, [models or "same model"])

| Shot | Comp | Light | Color | Materials | Detail | Motion | vs last round |
|---|---|---|---|---|---|---|---|
| S01 | | | | | | | |
| S02 | | | | | | | |

Raw critic medians before calibration: [ ]
Own score (logged, never decides): [ ]

Measured (command and result):
- [color check S01: saturation delta [+/-0.00], brightness delta [+/-0.00]]
- [render: [N] s per frame at [resolution], [N] sub-frames]

Not checked this round:
- [what, and why]

Top gaps from critics:
1. [shot, region, what is wrong, what to change]
2. [ ]
3. [ ]

Progress note sent: [time]
Stop check: bar [no] | floor [no] | stills approved [no] | final checked [no] -> [next round / ship / stop at cap]
Next focus: [ ]

---

## Round 01

Focus: bangun seluruh UI (S01 sampai S05) dari nol sesuai mockup, karena belum ada putaran sebelumnya.
Changes: art.js (ilustrasi SVG), style.css (satuan skala mockup 289px), app.js (layar baru), cook/shots.mjs, cook/pairs.py.
Stills: `cook/stills/r01/` | Side by side: `cook/compare/r01/`
Scores: self-scored (tanpa subagen), eyeballed: komposisi ~88, warna ~92, bentuk ~85, tipografi ~85 (font sistem, bukan Poppins), detail ~70 (foto diganti ilustrasi). Belum mencapai bar 99.
Top gaps: 1) S03 lingkaran besar terpotong memperlihatkan "?" setengah, ref menampilkan produk utuh di sisi kanan lingkaran; 2) S04 jarak vertikal header-search-hero lebih longgar dari ref; 3) S02 hero ref berupa foto penuh, kita lingkaran di latar abu.
Gate: stills approved [ya] | final render [zip dibuat]

---

## Round 02 (+ r03 hero detail)

Focus: persetujuan pengguna ("oke") + permintaan 6 merchant (J.CO, Bon Ami, Holland, 3 hotel Surabaya) dengan produk bergambar.
Changes: 18 listing seed, 8 ilustrasi baru (donat cokelat/gula, cheesecake, red velvet, bolu gulung, danish, muffin, cookies), lingkaran S03 digeser agar produk terlihat, hero detail penuh, jarak beranda dirapatkan, disclaimer merek demo, tes diperbarui.
Measured: 19 tes logika lolos; 27 langkah uji browser lolos; tanpa permintaan jaringan eksternal, tanpa galat JS.
Gate: stills approved [ya] | final render [zip dibuat]
Not checked: HP Android sungguhan; font Poppins asli; skor kritikus independen (self-scored).
