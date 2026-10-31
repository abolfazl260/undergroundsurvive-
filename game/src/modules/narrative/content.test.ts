import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseManifest, parseChapter, safeContentPath, contentUrl } from './content';

const validChapter = () => ({
  schemaVersion: 1,
  contentVersion: 1,
  id: 'chapter-one',
  locale: 'fa-IR',
  title: 'فصل آزمایشی',
  enabled: true,
  scenes: [
    { id: 'opening', type: 'image', src: 'media/images/start.webp', text: 'سلام' },
    { id: 'clip', type: 'video', src: 'media/videos/cutscene.mp4', poster: 'media/posters/clip.png',
      captions: 'media/captions/clip.vtt', text: 'ویدیو' }
  ]
});

describe('versioned story data contract', () => {
  it('parses image/video scenes and subtitle references', () => {
    const chapter = parseChapter(validChapter());
    expect(chapter.scenes[1].type).toBe('video');
    expect(chapter.scenes[1].captions).toBe('media/captions/clip.vtt');
  });

  it('rejects unknown schema versions and duplicate chapters', () => {
    expect(() => parseManifest({ schemaVersion: 9, contentVersion: 1, locale: 'fa-IR', chapters: [] })).toThrow();
    expect(() => parseManifest({ schemaVersion: 1, contentVersion: 1, locale: 'fa-IR', chapters: [
      { id: 'repeat', src: 'story/repeat.json' }, { id: 'repeat', src: 'story/second.json' }
    ] })).toThrow(/تکراری/);
  });

  it('rejects duplicate scene ids and unsupported media types', () => {
    const repeated = validChapter();
    repeated.scenes[1].id = 'opening';
    expect(() => parseChapter(repeated)).toThrow(/تکراری/);
    const chapter = validChapter();
    chapter.scenes[1].type = 'audio';
    expect(() => parseChapter(chapter)).toThrow(/ناشناخته/);
  });

  it('rejects URL schemes, traversal and wrong folders/extensions', () => {
    for (const bad of ['../media/images/x.webp', 'media/images/../../secret.webp',
      '/media/images/x.webp', 'https://evil.example/x.webp', 'media/images/x.webp?token=x',
      'media/images/x.mp4', 'media\\images\\x.png']) {
      expect(() => safeContentPath(bad, 'media/images/', ['.webp', '.png'])).toThrow();
    }
  });

  it('validates slide timings and forbids image caption tracks', () => {
    const chapter = validChapter();
    Object.assign(chapter.scenes[0], { durationSeconds: 0 });
    expect(() => parseChapter(chapter)).toThrow();
    const other = validChapter();
    Object.assign(other.scenes[0], { captions: 'media/captions/clip.vtt' });
    expect(() => parseChapter(other)).toThrow();
  });

  it('resolves assets under the Vite Pages subpath', () => {
    expect(contentUrl('media/images/scene.png', './', 'https://example.com/undergroundsurvive-/'))
      .toBe('https://example.com/undergroundsurvive-/content/media/images/scene.png');
    expect(contentUrl('manifest.json', '/', 'https://example.com/undergroundsurvive-/'))
      .toBe('https://example.com/content/manifest.json');
  });

  it('keeps developer-platform references out of both localized sample chapters', () => {
    for (const file of ['demo-shelter.json', 'demo-shelter.en.json']) {
      const chapter = parseChapter(JSON.parse(readFileSync(
        new URL('../../../public/content/story/' + file, import.meta.url), 'utf8'
      )));
      const copy = [chapter.title, ...chapter.scenes.flatMap((scene) =>
        [scene.title ?? '', scene.text])].join(' ');
      expect(copy).not.toMatch(/git[ -]?hub|گیت[ ‌-]*هاب/i);
    }
  });
});
