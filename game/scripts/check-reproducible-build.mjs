import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(root, 'package-lock.json');

/** The lock is mandatory for a release; npm install in a previous job is not a substitute. */
export function checkLockfile(pkg, lock) {
  if (!lock || lock.lockfileVersion < 3 || !lock.packages?.['']) return ['Commit an npm v3 package-lock.json before Android release.'];
  const issues = [];
  for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const actual = Object.entries(pkg[group] ?? {}).sort();
    const locked = Object.entries(lock.packages[''][group] ?? {}).sort();
    if (JSON.stringify(actual) !== JSON.stringify(locked)) issues.push('Lockfile root ' + group + ' differs from package.json.');
  }
  if (lock.name !== pkg.name || lock.version !== pkg.version) issues.push('Manifest and lockfile package identities disagree.');
  return issues;
}

export function builtManifest(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const full = join(dir, item.name);
    if (item.isDirectory()) return builtManifest(full, base);
    if (!item.isFile()) return [];
    return [{ path: relative(base, full).replaceAll('\\', '/'),
      sha256: createHash('sha256').update(readFileSync(full)).digest('hex') }];
  }).sort((a,b) => a.path.localeCompare(b.path));
}

function run(command, args) {
  const result = spawnSync(process.platform === 'win32' ? command + '.cmd' : command, args,
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ' ' + args.join(' ') + ' failed');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!existsSync(lockPath)) throw new Error('Missing game/package-lock.json. Use the manual dependency-lock workflow, then review and commit its artifact before release.');
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    const problems = checkLockfile(pkg, lock);
    if (problems.length) throw new Error(problems.join('\n'));
    const manifests = [];
    for (let pass = 0; pass < 2; pass++) {
      console.log('Clean reproducibility pass ' + (pass + 1) + '/2');
      run('npm', ['ci', '--no-audit', '--no-fund']);
      run('npm', ['run', 'build']);
      manifests.push(builtManifest(join(root, 'dist')));
    }
    if (!manifests[0].length || JSON.stringify(manifests[0]) !== JSON.stringify(manifests[1])) {
      throw new Error('Two clean npm ci installs produced different web bundles; release blocked.');
    }
    const evidence = { lockSha256: createHash('sha256').update(readFileSync(lockPath)).digest('hex'),
      files: manifests[0], builds: 2 };
    mkdirSync(join(root, 'quality-evidence'), { recursive: true });
    writeFileSync(join(root, 'quality-evidence/reproducibility.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log('Reproducible web bundle verified: ' + manifests[0].length + ' files.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
