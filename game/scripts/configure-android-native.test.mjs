import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { patchAndroidManifest, patchAndroidLaunchTheme, prepareAndroidNative } from './configure-android-native.mjs';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const manifest = "<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\"><application android:allowBackup=\"true\" android:icon=\"@mipmap/ic_launcher\" android:roundIcon=\"@mipmap/ic_launcher_round\"></application><uses-permission android:name=\"android.permission.INTERNET\" /></manifest>";
const styles = "<resources><style name=\"AppTheme.NoActionBarLaunch\" parent=\"Theme.SplashScreen\"><item name=\"windowSplashScreenBackground\">@color/colorPrimary</item><item name=\"windowSplashScreenAnimatedIcon\">@drawable/splash</item><item name=\"postSplashScreenTheme\">@style/AppTheme.NoActionBar</item></style></resources>";
describe('Native Android configuration', () => {
  it('hardens and brands Android manifest idempotently', () => {
    const updated = patchAndroidManifest(manifest);
    for (const value of ['allowBackup="false"', 'usesCleartextTraffic="false"', 'appCategory="game"',
      'enableOnBackInvokedCallback="false"', 'icon="@drawable/underground_launcher"',
      'roundIcon="@drawable/underground_launcher"']) assert.ok(updated.includes(value), value);
    assert.equal(patchAndroidManifest(updated), updated);
  });
  it('brands launch theme without dropping postSplashScreenTheme', () => {
    const updated = patchAndroidLaunchTheme(styles);
    assert.ok(updated.includes('@drawable/underground_launcher'));
    assert.ok(updated.includes('@color/underground_background'));
    assert.ok(updated.includes('postSplashScreenTheme'));
    assert.equal(patchAndroidLaunchTheme(updated), updated);
  });
  it('handles Capacitor templates without AndroidX splash attributes', () => {
    const noAndroidX = styles.replace('parent="Theme.SplashScreen"', 'parent="AppTheme.NoActionBar"');
    const updated = patchAndroidLaunchTheme(noAndroidX);
    assert.ok(updated.includes('name="android:windowSplashScreenBackground"'));
    assert.ok(updated.includes('name="android:windowSplashScreenAnimatedIcon"'));
    assert.ok(updated.includes('name="android:background"'));
    assert.equal(patchAndroidLaunchTheme(updated), updated);
  });
  it('installs the approved WebP icon and replaces the old vector idempotently', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'underground-icon-'));
    const res = join(temporary, 'res');
    const expected = fileURLToPath(new URL('../public/assets/branding/underground-launcher.webp', import.meta.url));
    try {
      mkdirSync(join(res, 'values'), { recursive: true });
      mkdirSync(join(res, 'drawable'), { recursive: true });
      writeFileSync(join(temporary, 'AndroidManifest.xml'), manifest);
      writeFileSync(join(res, 'values', 'styles.xml'), styles);
      writeFileSync(join(res, 'drawable', 'underground_launcher.xml'), '<vector/>');
      prepareAndroidNative(temporary);
      const destination = join(res, 'drawable-nodpi', 'underground_launcher.webp');
      assert.deepEqual(readFileSync(destination), readFileSync(expected));
      assert.equal(readFileSync(join(temporary, 'AndroidManifest.xml'), 'utf8').includes('@drawable/underground_launcher'), true);
      assert.throws(() => readFileSync(join(res, 'drawable', 'underground_launcher.xml')));
      prepareAndroidNative(temporary);
      assert.deepEqual(readFileSync(destination), readFileSync(expected));
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
  it('fails closed for unsupported templates', () => {
    assert.throws(() => patchAndroidManifest('<manifest/>'));
    assert.throws(() => patchAndroidLaunchTheme('<resources/>'));
  });
});
