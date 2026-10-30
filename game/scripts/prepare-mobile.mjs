import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.argv[2];
if (platform !== 'android' && platform !== 'ios') {
  console.error('Usage: node scripts/prepare-mobile.mjs android|ios');
  process.exit(2);
}
if (platform === 'ios' && process.platform !== 'darwin') {
  console.error('iOS project generation requires macOS and Xcode. Run this on a Mac.');
  process.exit(2);
}
if (!existsSync(join(root, 'dist', 'index.html'))) {
  console.error('Run npm run build before preparing a mobile platform.');
  process.exit(2);
}

function cap(...args) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['--no-install', 'cap', ...args], {
    cwd: root, stdio: 'inherit', shell: process.platform === 'win32'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const nativeDir = join(root, platform);
const requiredProject = platform === 'ios'
  ? join(nativeDir, 'App', 'App.xcodeproj', 'project.pbxproj')
  : join(nativeDir, 'app', 'build.gradle');
if (!existsSync(nativeDir)) {
  console.log('Creating Capacitor ' + platform + ' project');
  cap('add', platform, ...(platform === 'ios' ? ['--packagemanager', 'SPM'] : []));
} else if (!existsSync(requiredProject)) {
  console.error('Incomplete ' + platform + ' directory. Back up and remove it before retrying.');
  process.exit(2);
}
cap('sync', platform);
console.log('Capacitor ' + platform + ' native project is ready.');
