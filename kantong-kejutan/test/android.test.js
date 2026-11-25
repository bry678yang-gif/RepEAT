import test from 'node:test';
import assert from 'node:assert/strict';
import { patchManifest, patchConfig, PERMISSIONS, FEATURES } from '../scripts/manifest.mjs';

// Bentuk AndroidManifest.xml bawaan "npx cap add android" (INTERNET ada SETELAH </application>)
const SAMPLE = `<?xml version="1.0" encoding="utf-8" ?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

    <!-- Permissions -->

    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
`;
const count = (xml, name) => (xml.match(new RegExp(`android:name="${name.replace(/\./g, '\\.')}"`, 'g')) || []).length;

test('manifest: semua izin & fitur ditambahkan tepat satu kali, INTERNET tidak digandakan', () => {
  const { xml, added } = patchManifest(SAMPLE);
  for (const p of PERMISSIONS) assert.equal(count(xml, p), 1, p);
  for (const [f] of FEATURES) assert.equal(count(xml, f), 1, f);
  assert.ok(!added.includes('android.permission.INTERNET'));
  assert.ok(added.includes('android.permission.CAMERA') && added.includes('android.permission.ACCESS_FINE_LOCATION') && added.includes('android.permission.POST_NOTIFICATIONS'));
});

test('manifest: izin diletakkan sebelum <application>, sisa isi file tidak berubah, tag seimbang', () => {
  const { xml } = patchManifest(SAMPLE);
  assert.ok(xml.indexOf('android.permission.CAMERA') < xml.indexOf('<application'));
  for (const keep of ['android:name=".MainActivity"', 'android.intent.category.LAUNCHER', '<!-- Permissions -->', '</manifest>']) assert.ok(xml.includes(keep), keep);
  const open = (xml.match(/<(manifest|application|activity|intent-filter)[\s>]/g) || []).length, close = (xml.match(/<\/(manifest|application|activity|intent-filter)>/g) || []).length;
  assert.equal(open, close);
  assert.ok(xml.startsWith('<?xml'));
});

test('manifest: idempotent (dijalankan dua kali tidak menambah apa pun)', () => {
  const once = patchManifest(SAMPLE).xml, twice = patchManifest(once);
  assert.equal(twice.xml, once); assert.deepEqual(twice.added, []);
});

test('manifest: menghormati izin yang sudah ada dan menolak berkas tidak valid', () => {
  const pre = SAMPLE.replace('<application', '<uses-permission android:name="android.permission.CAMERA" />\n    <application');
  const { xml, added } = patchManifest(pre); assert.equal(count(xml, 'android.permission.CAMERA'), 1); assert.ok(!added.includes('android.permission.CAMERA'));
  assert.throws(() => patchManifest('<html></html>'), /tidak valid/);
});

test('config: androidScheme=https ditambahkan, appId/appName/webDir tidak berubah, idempotent', () => {
  const orig = { appId: 'id.kantongkejutan.demo', appName: 'RepEAT', webDir: 'www' };
  const { cfg, changes } = patchConfig(orig);
  assert.deepEqual(changes, ['server.androidScheme=https']); assert.equal(cfg.appId, orig.appId); assert.equal(cfg.appName, orig.appName); assert.equal(cfg.webDir, 'www'); assert.equal(cfg.server.androidScheme, 'https');
  assert.deepEqual(patchConfig(cfg).changes, []); assert.equal(orig.server, undefined);
});
