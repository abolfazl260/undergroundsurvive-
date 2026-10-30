import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseChapter, parseManifest } from './content';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(new URL('../../../public/content/' + path, import.meta.url), 'utf8'));
}

describe('official day-ninety prologue', () => {
  it('publishes the same six scenes in both localized manifests', () => {
    const faManifest = parseManifest(readJson('manifest.json'));
    const enManifest = parseManifest(readJson('manifest.en.json'));
    expect(faManifest.contentVersion).toBe(2);
    expect(enManifest.contentVersion).toBe(2);
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
      expect(scene.text.length).toBeGreaterThan(70);
      expect(readFileSync(new URL('../../../public/content/' + scene.src, import.meta.url)).length).toBeGreaterThan(100);
    }
    expect(fa.scenes.find((scene) => scene.id === 'day-ninety')?.text).toContain('سه ماه');
    expect(en.scenes.find((scene) => scene.id === 'day-ninety')?.text).toContain('Three months');
    expect(fa.scenes.find((scene) => scene.id === 'anomaly')?.text).toContain('ناشناخته');
  });
});
