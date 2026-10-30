import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// CI guard: every one of the 11 milestones must have separate, valid, small WebPs.
const ids = [
  'first-room', 'builder', 'first-dig', 'excavator', 'first-upgrade',
  'upgrader', 'upper-floor', 'skyline', 'first-cycles',
  'steady-shelter', 'diverse-shelter'
];
const root = resolve(import.meta.dirname, '..', 'public', 'assets', 'achievements');
let totalBytes = 0;
for (const width of [360, 540]) {
  const seen = new Map();
  for (const id of ids) {
    const filename = resolve(root, `${id}-${width}.webp`);
    const contents = readFileSync(filename);
    if (contents.toString('ascii', 0, 4) !== 'RIFF' ||
        contents.toString('ascii', 8, 12) !== 'WEBP') {
      throw new Error(`Not a valid WebP container: ${filename}`);
    }
    const bytes = statSync(filename).size;
    if (bytes > 65_000) throw new Error(`Achievement image is too large: ${filename}`);
    totalBytes += bytes;
    const hash = createHash('sha256').update(contents).digest('hex');
    if (seen.has(hash)) throw new Error(`Duplicate image: ${id} and ${seen.get(hash)}`);
    seen.set(hash, id);
  }
}
if (totalBytes > 350_000) throw new Error(`Achievement image budget exceeded: ${totalBytes}`);
console.log(`Validated 22 independent, distinct WebP files: ${(totalBytes / 1024).toFixed(1)} KiB total.`);
