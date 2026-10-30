import { describe, expect, it } from 'vitest';
import { loadStoryCatalog } from './loader';

const manifest = { schemaVersion: 1, contentVersion: 2, locale: 'fa-IR', chapters: [
  { id: 'good', src: 'story/good.json' }, { id: 'broken', src: 'story/broken.json' }
] };
const good = { schemaVersion: 1, contentVersion: 1, id: 'good', locale: 'fa-IR',
  title: 'Good', enabled: true, scenes: [{ id: 'slide', type: 'image',
  src: 'media/images/a.svg', text: 'demo' }] };

describe('story catalog loader', () => {
  it('keeps valid chapters if another content file is unavailable', async () => {
    const urls: string[] = [];
    const request = (async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith('manifest.json')) return new Response(JSON.stringify(manifest), { status: 200 });
      if (url.endsWith('good.json')) return new Response(JSON.stringify(good), { status: 200 });
      return new Response('not found', { status: 404 });
    }) as typeof fetch;
    const result = await loadStoryCatalog('./', 'https://example.org/game/', request);
    expect(result.chapters.map((chapter) => chapter.id)).toEqual(['good']);
    expect(result.errors).toHaveLength(1);
    expect(result.contentVersion).toBe(2);
    expect(urls[0]).toBe('https://example.org/game/content/manifest.json');
  });

  it('rejects invalid manifests before reading any chapter', async () => {
    const request = (async () => new Response('{"schemaVersion": 7}', { status: 200 })) as typeof fetch;
    await expect(loadStoryCatalog('./', 'https://example.org/game/', request)).rejects.toThrow();
  });
});
