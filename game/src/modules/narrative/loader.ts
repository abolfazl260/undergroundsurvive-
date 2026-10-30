import { contentUrl, parseChapter, parseManifest, type StoryChapter } from './content';

export interface StoryCatalog {
  chapters: StoryChapter[];
  errors: string[];
  contentVersion: number;
}

export async function loadStoryCatalog(
  baseUrl: string,
  pageUrl: string,
  request: typeof fetch = fetch,
  locale: 'fa' | 'en' = 'fa'
): Promise<StoryCatalog> {
  const getJson = async (path: string): Promise<unknown> => {
    const response = await request(contentUrl(path, baseUrl, pageUrl), { cache: 'no-cache' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json() as Promise<unknown>;
  };
  const manifest = parseManifest(await getJson(locale === 'en' ? 'manifest.en.json' : 'manifest.json'));
  const chapters: StoryChapter[] = [];
  const errors: string[] = [];
  for (const entry of manifest.chapters) {
    try {
      const chapter = parseChapter(await getJson(entry.src));
      if (chapter.id !== entry.id || chapter.locale !== manifest.locale) {
        throw new Error('شناسه یا زبان فصل با manifest سازگار نیست.');
      }
      if (chapter.enabled) chapters.push(chapter);
    } catch (error) {
      errors.push(entry.id + ': ' + (error instanceof Error ? error.message : 'خطای ناشناخته'));
    }
  }
  return { chapters, errors, contentVersion: manifest.contentVersion };
}
