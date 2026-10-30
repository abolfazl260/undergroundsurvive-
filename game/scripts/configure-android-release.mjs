import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Capacitor regenerates game/android; keep the release configuration reproducible.
// Never write signing credentials into build.gradle or into tracked files.
const START = '// BEGIN UNDERGROUND SURVIVE MANUAL RELEASE SIGNING (generated)';
const END = '// END UNDERGROUND SURVIVE MANUAL RELEASE SIGNING';

export function validateReleaseVersion(versionCode, versionName) {
  if (!/^[1-9][0-9]*$/.test(String(versionCode)) ||
      !Number.isSafeInteger(Number(versionCode)) || Number(versionCode) > 2100000000) {
    throw new Error('version_code must be an integer between 1 and 2100000000');
  }
  if (typeof versionName !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,49}$/.test(versionName)) {
    throw new Error('version_name must use 1-50 ASCII letters, digits, dots, underscores or hyphens');
  }
}

export function signingGradleBlock(versionCode, versionName) {
  validateReleaseVersion(versionCode, versionName);
  return `${START}
android {
    defaultConfig {
        versionCode ${Number(versionCode)}
        versionName '${versionName}'
    }
    signingConfigs {
        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
${END}`;
}

export function configureAndroidGradle(gradle, versionCode, versionName) {
  if (typeof gradle !== 'string' || !/apply plugin: ['"]com\.android\.application['"]/.test(gradle) ||
      !/\bandroid\s*\{/.test(gradle)) {
    throw new Error('Android application build.gradle not recognized; inspect the Capacitor template');
  }
  const block = signingGradleBlock(versionCode, versionName);
  const begin = gradle.indexOf(START);
  const end = gradle.indexOf(END);
  if ((begin < 0) !== (end < 0) || (begin >= 0 && end <= begin)) {
    throw new Error('Incomplete release signing block in build.gradle');
  }
  if (begin >= 0) {
    return gradle.slice(0, begin) + block + gradle.slice(end + END.length);
  }
  return gradle.trimEnd() + '\n\n' + block + '\n';
}

function main() {
  const [versionCode, versionName] = process.argv.slice(2);
  validateReleaseVersion(versionCode, versionName);
  const required = ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD',
    'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'];
  if (required.some((name) => !process.env[name])) {
    throw new Error('Missing Android release signing environment variables');
  }
  if (!existsSync(process.env.ANDROID_KEYSTORE_PATH) ||
      !statSync(process.env.ANDROID_KEYSTORE_PATH).isFile() ||
      statSync(process.env.ANDROID_KEYSTORE_PATH).size === 0) {
    throw new Error('Android signing keystore is missing or empty');
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const gradlePath = join(root, 'android', 'app', 'build.gradle');
  const updated = configureAndroidGradle(readFileSync(gradlePath, 'utf8'), versionCode, versionName);
  writeFileSync(gradlePath, updated);
  console.log('Generated Android release signing configuration for version ' +
    versionName + ' (code ' + versionCode + ').');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error('Release configuration failed: ' + error.message);
    process.exitCode = 1;
  }
}
