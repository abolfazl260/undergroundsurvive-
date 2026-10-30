import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseChapter, parseManifest } from './content';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(new URL('../../../public/content/' + path, import.meta.url), 'utf8'));
}

describe('official day-ninety prologue', () => {
  it('publishes the same six scenes in both localized manifests', () => {
    const faManifest = parseManifest(readJson('manifest.json'));
    const enManifest = parseManifest(readJson('manifest.en.json'));
    expect(faManifest.contentVersion).toBe(3);
    expect(enManifest.contentVersion).toBe(3);
    expect(faManifest.chapters.map((item) => item.id)).toEqual(['prologue-90-days']);
    expect(enManifest.chapters.map((item) => item.id)).toEqual(['prologue-90-days']);
    const fa = parseChapter(readJson(faManifest.chapters[0].src));
    const en = parseChapter(readJson(enManifest.chapters[0].src));
    const expected = ['anomaly', 'broadcast', 'evacuation', 'seal', 'day-ninety', 'survivors'];
    expect(fa.scenes.map((scene) => scene.id)).toEqual(expected);
    expect(en.scenes.map((scene) => scene.id)).toEqual(expected);
    expect(fa.scenes.map((scene) => scene.src)).toEqual(en.scenes.map((scene) => scene.src));
    for (const scene of fa.scenes) {
      expect(scene.type).toBe('image');
      expect(scene.src).toMatch(/^media\\/images\\/prologue-[a-z0-9-]+\\.webp$/);
      expect(scene.text.length).toBeGreaterThan(70);
      const file = readFileSync(new URL('../../../public/content/' + scene.src, import.meta.url));
      expect(file.length).toBeGreaterThan(30_000);
      expect(file.length).toBeLessThan(150_000);
      expect(file.toString('ascii', 0, 4)).toBe('RIFF');
      expect(file.toString('ascii', 8, 12)).toBe('WEBP');
    }
    // Dedicated artwork per scene: prevent a shared illustration from being reused.
    const checksums = fa.scenes.map((scene) =>
      createHash('sha256').update(readFileSync(new URL('../../../public/content/' + scene.src, import.meta.url))).digest('hex')
    );
    expect(new Set(checksums).size).toBe(6);
    expect(fa.contentVersion).toBe(3);
    expect(en.contentVersion).toBe(3);
    expect(fa.scenes.find((scene) => scene.id === 'day-ninety')?.text).toContain('سه ماه');
    expect(en.scenes.find((scene) => scene.id === 'day-ninety')?.text).toContain('Three months');
    expect(fa.scenes.find((scene) => scene.id === 'anomaly')?.text).toContain('ناشناخته');
  });
});
