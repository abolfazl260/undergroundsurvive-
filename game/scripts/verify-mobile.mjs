import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const gameRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function configurationProblems(config, pkg) {
  const errors = [];
  if (typeof config !== 'object' || config === null) return ['Capacitor config is missing'];
  if (!/^[a-z][a-z\d_]*(?:\.[a-z][a-z\d_]*){2,}$/i.test(config.appId ?? '')) {
    errors.push('appId must be a valid reverse-domain identifier with at least three segments');
  }
  if (typeof config.appName !== 'string' || !config.appName.trim()) errors.push('appName is missing');
  if (config.webDir !== 'dist') errors.push('webDir must match Vite output: dist');
  // Never point production mobile apps to a remote dev server or permit cleartext.
  if (config.server?.url || config.server?.cleartext || config.server?.allowNavigation) {
    errors.push('Mobile production config must not load a remote server or allow cleartext/navigation exceptions');
  }
  if (config.android?.allowMixedContent) errors.push('Mixed content is forbidden in the mobile build');
  const packages = [
    pkg?.dependencies?.['@capacitor/core'],
    pkg?.dependencies?.['@capacitor/android'],
    pkg?.dependencies?.['@capacitor/ios'],
    pkg?.devDependencies?.['@capacitor/cli']
  ];
  if (packages.some((version) => !/^8\.\d+\.\d+$/.test(version ?? '')) ||
      packages.some((version) => version !== packages[0])) {
    errors.push('Capacitor core, CLI, Android and iOS must all use the same pinned v8 version');
  }
  return errors;
}

export function assetProblems(root) {
  const errors = [];
  const webDir = join(root, 'dist');
  const files = [
    'index.html', 'content/manifest.json', 'content/manifest.en.json',
    'content/story/demo-shelter.json', 'content/story/demo-shelter.en.json',
    'assets/backgrounds/ruined-city-hd.webp',
    'assets/rooms/room-atlas.webp',
    'assets/rooms/garden-medbay-atlas.webp'
  ];
  for (const file of files) {
    const filename = join(webDir, file);
    if (!existsSync(filename) || !statSync(filename).isFile()) errors.push('Missing built asset: ' + file);
  }
  const indexPath = join(webDir, 'index.html');
  if (existsSync(indexPath)) {
    const html = readFileSync(indexPath, 'utf8');
    if (!/<head[\s>]/i.test(html)) errors.push('Built HTML must contain <head> for the native bridge');
    if (!/viewport-fit=cover/.test(html)) errors.push('Safe-area viewport meta tag is required');
    if (/(?:src|href)=["']\/(?!\/)/.test(html)) errors.push('Built assets contain absolute root URLs');
    if (html.includes('/@vite/client')) errors.push('Development Vite client must not ship in native bundles');
  }
  return errors;
}

export function verifyMobile(root = gameRoot) {
  const config = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  return [...configurationProblems(config, pkg), ...assetProblems(root)];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = verifyMobile();
  if (errors.length) {
    console.error('Mobile packaging checks failed:\n' + errors.map((e) => '- ' + e).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Capacitor config and offline web bundle verified.');
  }
}
