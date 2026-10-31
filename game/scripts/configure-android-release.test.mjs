import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureAndroidGradle, validateReleaseVersion } from './configure-android-release.mjs';

const nativeGradle = `apply plugin: 'com.android.application'

android {
    namespace 'com.undergroundsurvive.game'
    defaultConfig {
        versionCode 1
        versionName '1.0'
    }
    buildTypes {
        release {
            minifyEnabled false
        }
    }
}
`;

describe('Manual signed Android release', () => {
  it('exposes only a manual release trigger and restricts signing to main', () => {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    const workflow = readFileSync(join(scriptDir, '..', '..', '.github', 'workflows',
      'android-signed-release.yml'), 'utf8');
    assert.ok(workflow.includes('on:\n  workflow_dispatch:'));
    assert.doesNotMatch(workflow, /^  (?:push|pull_request|schedule|workflow_call):/m);
    assert.ok(workflow.includes("github.ref == 'refs/heads/main'"));
  });

  it('accepts valid Play Store version metadata', () => {
    assert.doesNotThrow(() => validateReleaseVersion('12', '1.2.3-beta'));
  });

  it('rejects malformed or injected versions', () => {
    for (const code of ['0', '-1', '1.5', '1; exit', '2100000001', '9007199254740993']) {
      assert.throws(() => validateReleaseVersion(code, '1.0.0'));
    }
    for (const name of ['', '1.0\' ; println("bad")', 'space name', 'نسخه-۱']) {
      assert.throws(() => validateReleaseVersion('1', name));
    }
  });

  it('preserves native config and reads signing secrets from environment only', () => {
    const content = configureAndroidGradle(nativeGradle, '28', '2.8.0');
    assert.match(content, /namespace 'com\.undergroundsurvive\.game'/);
    assert.match(content, /minifyEnabled false/);
    assert.match(content, /versionCode 28/);
    assert.match(content, /versionName '2\.8\.0'/);
    assert.match(content, /signingConfig signingConfigs\.release/);
    for (const variable of ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD',
      'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD']) {
      assert.ok(content.includes(`System.getenv('${variable}')`));
    }
    assert.ok(!content.includes('example-password'));
  });

  it('is idempotent and updates an existing generated signing block', () => {
    const first = configureAndroidGradle(nativeGradle, 4, '1.0.0');
    assert.equal(configureAndroidGradle(first, 4, '1.0.0'), first);
    const second = configureAndroidGradle(first, 5, '1.0.1');
    assert.equal((second.match(/BEGIN UNDERGROUND SURVIVE/g) ?? []).length, 1);
    assert.match(second, /versionCode 5/);
    assert.doesNotMatch(second, /versionCode 4/);
  });

  it('fails closed on an unfamiliar native template or corrupt signing block', () => {
    assert.throws(() => configureAndroidGradle('plugins {}', 1, '1.0'));
    assert.throws(() => configureAndroidGradle(nativeGradle + '\n// BEGIN UNDERGROUND SURVIVE MANUAL RELEASE SIGNING (generated)', 1, '1.0'));
  });
});
