import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The approved launcher artwork is versioned in public/ so both web and Android use the same image.
const LAUNCHER_IMAGE = join(root, 'public', 'assets', 'branding', 'underground-launcher.webp');
const COLORS = "<?xml version=\"1.0\" encoding=\"utf-8\"?><resources><color name=\"underground_background\">#0B1422</color></resources>";

export function patchAndroidManifest(xml) {
  if (typeof xml !== 'string' || !xml.includes('xmlns:android=') ||
      !xml.includes('android.permission.INTERNET')) {
    throw new Error('Unexpected AndroidManifest.xml; inspect the Capacitor template');
  }
  const match = xml.match(/<application\b[^>]*>/);
  if (!match) throw new Error('Android application element is missing');
  let opening = match[0];
  const attrs = {
    allowBackup: 'false', usesCleartextTraffic: 'false', appCategory: 'game',
    enableOnBackInvokedCallback: 'false', icon: '@drawable/underground_launcher',
    roundIcon: '@drawable/underground_launcher'
  };
  for (const [key, value] of Object.entries(attrs)) {
    const pattern = new RegExp('android:' + key + '=(["\x27])[^"\x27]*\\1');
    if (pattern.test(opening)) opening = opening.replace(pattern, 'android:' + key + '="' + value + '"');
    else opening = opening.replace(/>$/, ' android:' + key + '="' + value + '">');
  }
  return xml.replace(match[0], opening);
}

export function patchAndroidLaunchTheme(xml) {
  if (typeof xml !== 'string' || !xml.includes('<resources')) throw new Error('Unexpected Android styles.xml');
  const match = xml.match(/(<style\b[^>]*name=["']AppTheme\.NoActionBarLaunch["'][^>]*>)([\s\S]*?)(<\/style>)/);
  if (!match) throw new Error('Capacitor launch theme not found');
  let body = match[2];
  // AndroidX Theme.SplashScreen defines unprefixed items. Capacitor's default
  // AppTheme.NoActionBar does not; on that template use Android 12 platform
  // attributes to avoid "resource attr/windowSplashScreen... not found".
  const androidx = /parent=["']Theme\.SplashScreen["']/.test(match[1]);
  const items = androidx
    ? [
        ['android:background', '@drawable/underground_launcher'],
        ['windowSplashScreenBackground', '@color/underground_background'],
        ['windowSplashScreenAnimatedIcon', '@drawable/underground_launcher']
      ]
    : [
        ['android:background', '@drawable/underground_launcher'],
        ['android:windowSplashScreenBackground', '@color/underground_background'],
        ['android:windowSplashScreenAnimatedIcon', '@drawable/underground_launcher']
      ];
  for (const [key, value] of items) {
    const pattern = new RegExp('<item\\s+name=["\x27]' + key + '["\x27]\\s*>[\\s\\S]*?<\\/item>');
    const item = '<item name="' + key + '">' + value + '</item>';
    if (pattern.test(body)) body = body.replace(pattern, item);
    else body = body.trimEnd() + '\n        ' + item + '\n    ';
  }
  return xml.replace(match[0], match[1] + body + match[3]);
}

function writeIfChanged(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path) || readFileSync(path, 'utf8') !== content) writeFileSync(path, content);
}
function copyIfChanged(source, destination) {
  if (!existsSync(source)) throw new Error('Approved launcher image is missing: ' + source);
  const bytes = readFileSync(source);
  if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
    throw new Error('Approved launcher image must be WebP');
  }
  mkdirSync(dirname(destination), { recursive: true });
  if (!existsSync(destination) || !readFileSync(destination).equals(bytes)) copyFileSync(source, destination);
}

export function prepareAndroidNative(projectRoot = join(root, 'android', 'app', 'src', 'main')) {
  const manifest = join(projectRoot, 'AndroidManifest.xml');
  const styles = join(projectRoot, 'res', 'values', 'styles.xml');
  if (!existsSync(manifest) || !existsSync(styles)) throw new Error('Run cap add android and cap sync android first');
  const updatedManifest = patchAndroidManifest(readFileSync(manifest, 'utf8'));
  const updatedStyles = patchAndroidLaunchTheme(readFileSync(styles, 'utf8'));
  writeIfChanged(manifest, updatedManifest);
  writeIfChanged(styles, updatedStyles);
  // A stale vector with the same resource name would cause a duplicate-resource build failure.
  rmSync(join(projectRoot, 'res', 'drawable', 'underground_launcher.xml'), { force: true });
  copyIfChanged(LAUNCHER_IMAGE, join(projectRoot, 'res', 'drawable-nodpi', 'underground_launcher.webp'));
  writeIfChanged(join(projectRoot, 'res', 'values', 'underground_colors.xml'), COLORS);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { prepareAndroidNative(); console.log('Android native artwork, splash and manifest configured.'); }
  catch (error) { console.error('Android preparation failed: ' + error.message); process.exitCode = 1; }
}
