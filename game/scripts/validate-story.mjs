/**
 * Validate GitHub-authored story JSON and local media references before deployment.
 * Imports the same runtime parser so editor and game cannot silently drift.
 * Node >=22.12; --experimental-strip-types loads the TS contract without bundling.
 */
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseManifest, parseChapter } from '../src/modules/narrative/content.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/content');
const failures = [];

async function json(relative) {
  const full = path.resolve(root, relative);
  if (!full.startsWith(root + path.sep)) throw new Error('Unsafe content path');
  return JSON.parse(await readFile(full, 'utf8'));
}
async function checkAsset(relative, context) {
  try {
    const full = path.resolve(root, relative);
    if (!full.startsWith(root + path.sep)) throw new Error('Unsafe content path');
    const asset = await stat(full);
    if (!asset.isFile() || asset.size === 0) throw new Error('File is missing or empty');
  } catch (error) {
    failures.push(context + ' -> ' + relative + ': ' + error.message);
  }
}

try {
  const manifest = parseManifest(await json('manifest.json'));
  for (const entry of manifest.chapters) {
    try {
      const chapter = parseChapter(await json(entry.src));
      if (entry.id !== chapter.id) throw new Error('Chapter id mismatch with manifest');
      if (manifest.locale !== chapter.locale) throw new Error('Chapter locale mismatch with manifest');
      for (const scene of chapter.scenes) {
        for (const asset of [scene.src, scene.poster, scene.captions]) {
          if (asset) await checkAsset(asset, chapter.id + '/' + scene.id);
        }
      }
    } catch (error) {
      failures.push(entry.id + ': ' + error.message);
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('Story content valid (' + manifest.chapters.length + ' chapters).');
} catch (error) {
  console.error('Story content validation failed:\n' + error.message);
  process.exitCode = 1;
}
