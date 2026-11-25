// Menambahkan izin Android yang dibutuhkan ke AndroidManifest.xml. Murni (string -> string), idempotent.
export const PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.CAMERA',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.VIBRATE',
];
export const FEATURES = [
  ['android.hardware.camera', 'false'],
  ['android.hardware.location.gps', 'false'],
];

export function patchManifest(xml) {
  if (!/<manifest[\s>]/.test(xml) || !/<application[\s>]/.test(xml)) throw new Error('AndroidManifest.xml tidak valid: tag <manifest>/<application> tidak ditemukan');
  const has = (tag, name) => new RegExp(`<${tag}[^>]*android:name="${name.replace(/\./g, '\\.')}"`).test(xml);
  const added = [], lines = [];
  for (const p of PERMISSIONS) if (!has('uses-permission', p)) { lines.push(`<uses-permission android:name="${p}" />`); added.push(p); }
  for (const [f, req] of FEATURES) if (!has('uses-feature', f)) { lines.push(`<uses-feature android:name="${f}" android:required="${req}" />`); added.push(f); }
  if (!lines.length) return { xml, added };
  const i = xml.search(/<application[\s>]/), lineStart = xml.lastIndexOf('\n', i) + 1;
  const indent = /^[ \t]*/.exec(xml.slice(lineStart, i))[0];
  const block = lines.map(l => indent + l).join('\n') + '\n\n';
  return { xml: xml.slice(0, lineStart) + block + xml.slice(lineStart), added };
}

// capacitor.config.json: https untuk Android (kamera/lokasi butuh konteks aman) + webDir.
export function patchConfig(cfg) {
  const out = JSON.parse(JSON.stringify(cfg)), changes = [];
  if (!out.webDir) { out.webDir = 'www'; changes.push('webDir=www'); }
  out.server = out.server || {};
  if (out.server.androidScheme !== 'https') { out.server.androidScheme = 'https'; changes.push('server.androidScheme=https'); }
  return { cfg: out, changes };
}
