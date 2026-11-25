#!/usr/bin/env node
// Menyiapkan proyek Android agar kamera, lokasi, dan notifikasi bekerja:
//   1) memasang plugin resmi dengan versi mayor yang SAMA dengan @capacitor/core (versi tidak cocok = sync gagal)
//   2) membuat folder android/ bila belum ada
//   3) menambahkan izin ke AndroidManifest.xml dan androidScheme=https ke capacitor.config.json
//   4) npx cap sync android
// Pakai:  npm run android:setup        (butuh internet untuk langkah 1-2)
//         npm run android:setup -- --patch-only   (hanya langkah 3, tanpa internet)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { patchManifest, patchConfig } from './manifest.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const patchOnly = process.argv.includes('--patch-only');
const run = cmd => { console.log('$ ' + cmd); execSync(cmd, { stdio: 'inherit', cwd: root }); };
const readJson = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));

if (!patchOnly) {
  const corePkg = path.join(root, 'node_modules/@capacitor/core/package.json');
  if (!fs.existsSync(corePkg)) run('npm install @capacitor/core @capacitor/android && npm install -D @capacitor/cli');
  const major = readJson('node_modules/@capacitor/core/package.json').version.split('.')[0];
  console.log(`Capacitor mayor terpasang: ${major}`);
  run(`npm install @capacitor/geolocation@^${major} @capacitor/camera@^${major} @capacitor/local-notifications@^${major}`);
  if (!fs.existsSync(path.join(root, 'android'))) run('npx cap add android');
}

const cfgPath = path.join(root, 'capacitor.config.json');
const { cfg, changes } = patchConfig(readJson('capacitor.config.json'));
if (changes.length) { fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n'); console.log('capacitor.config.json diperbarui: ' + changes.join(', ')); } else console.log('capacitor.config.json sudah benar.');

const mPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
if (!fs.existsSync(mPath)) { console.error('android/app/src/main/AndroidManifest.xml belum ada. Jalankan tanpa --patch-only (atau "npx cap add android") dulu.'); process.exit(1); }
const { xml, added } = patchManifest(fs.readFileSync(mPath, 'utf8'));
if (added.length) { fs.writeFileSync(mPath, xml); console.log('AndroidManifest.xml: menambahkan ' + added.join(', ')); } else console.log('AndroidManifest.xml sudah lengkap.');

if (!patchOnly) run('npx cap sync android');
console.log('\nSelesai. Build ulang APK (Android Studio: Build > Build APK, atau "npx cap open android"), lalu PASANG ULANG di HP.');
console.log('Penting: jika sebelumnya izin sudah ditolak/diabaikan, hapus aplikasi lama atau reset izin di Pengaturan HP sebelum mencoba lagi.');
