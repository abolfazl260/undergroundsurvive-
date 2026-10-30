/**
 * Stable, deliberately small contract for public, reviewable story content.
 * Never execute a condition or HTML supplied by JSON.
 */
export interface StoryManifest {
  schemaVersion: 1;
  contentVersion: number;
  locale: string;
  chapters: { id: string; src: string }[];
}

export interface StoryScene {
  id: string;
  type: 'image' | 'video';
  src: string;
  title?: string;
  text: string;
  poster?: string;
  captions?: string;
  durationSeconds?: number;
}

export interface StoryChapter {
  schemaVersion: 1;
  contentVersion: number;
  id: string;
  locale: string;
  title: string;
  enabled: boolean;
  scenes: StoryScene[];
}

type ObjectValue = Record<string, unknown>;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

function object(value: unknown, name: string): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(name + ' باید یک شیء باشد.');
  }
  return value as ObjectValue;
}

function requireText(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 500) {
    throw new Error(name + ' نامعتبر است.');
  }
  return value;
}

function requireId(value: unknown, name: string): string {
  const id = requireText(value, name);
  if (!ID.test(id)) throw new Error(name + ' باید شناسهٔ کوتاه و پایدار باشد.');
  return id;
}

function requireVersion(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new Error(name + ' باید عدد صحیح مثبت باشد.');
  }
  return value as number;
}

/** Only allow paths within public/content (no external URLs or traversal). */
export function safeContentPath(value: unknown, prefix: string, extensions: string[]): string {
  const path = requireText(value, 'مسیر فایل');
  if (
    !path.startsWith(prefix) ||
    !/^[a-zA-Z0-9_./-]+$/.test(path) ||
    path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..') ||
    !extensions.some((extension) => path.toLowerCase().endsWith(extension))
  ) {
    throw new Error('مسیر محتوای ناامن یا پشتیبانی‌نشده: ' + path);
  }
  return path;
}

function sameLocale(value: unknown): string {
  const locale = requireText(value, 'locale');
  if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(locale)) throw new Error('locale نامعتبر است.');
  return locale;
}

export function parseManifest(input: unknown): StoryManifest {
  const data = object(input, 'manifest');
  if (data.schemaVersion !== 1) throw new Error('نسخهٔ schema manifest پشتیبانی نمی‌شود.');
  const contentVersion = requireVersion(data.contentVersion, 'contentVersion');
  const locale = sameLocale(data.locale);
  if (!Array.isArray(data.chapters)) throw new Error('فهرست فصل‌ها نامعتبر است.');
  const seen = new Set<string>();
  const chapters = data.chapters.map((item: unknown) => {
    const chapter = object(item, 'chapter reference');
    const id = requireId(chapter.id, 'chapter id');
    if (seen.has(id)) throw new Error('شناسهٔ فصل تکراری: ' + id);
    seen.add(id);
    return { id, src: safeContentPath(chapter.src, 'story/', ['.json']) };
  });
  return { schemaVersion: 1, contentVersion, locale, chapters };
}

export function parseChapter(input: unknown): StoryChapter {
  const data = object(input, 'chapter');
  if (data.schemaVersion !== 1) throw new Error('نسخهٔ schema فصل پشتیبانی نمی‌شود.');
  const id = requireId(data.id, 'chapter id');
  const contentVersion = requireVersion(data.contentVersion, 'contentVersion');
  const locale = sameLocale(data.locale);
  const title = requireText(data.title, 'chapter title');
  if (typeof data.enabled !== 'boolean') throw new Error('enabled باید boolean باشد.');
  if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
    throw new Error('فصل باید حداقل یک صحنه داشته باشد.');
  }
  const seen = new Set<string>();
  const scenes: StoryScene[] = data.scenes.map((item: unknown) => {
    const scene = object(item, 'scene');
    const sceneId = requireId(scene.id, 'scene id');
    if (seen.has(sceneId)) throw new Error('شناسهٔ صحنه تکراری: ' + sceneId);
    seen.add(sceneId);
    if (scene.type !== 'image' && scene.type !== 'video') throw new Error('نوع صحنه ناشناخته است.');
    const type = scene.type;
    const src = safeContentPath(scene.src, type === 'image' ? 'media/images/' : 'media/videos/',
      type === 'image' ? ['.webp', '.png', '.jpg', '.jpeg', '.svg'] : ['.mp4', '.webm']);
    if (typeof scene.text !== 'string' || scene.text.length > 3000) {
      throw new Error('متن صحنه نامعتبر است.');
    }
    const parsed: StoryScene = { id: sceneId, type, src, text: scene.text };
    if (scene.title !== undefined) parsed.title = requireText(scene.title, 'scene title');
    if (scene.poster !== undefined) {
      parsed.poster = safeContentPath(scene.poster, 'media/posters/', ['.webp', '.png', '.jpg', '.jpeg']);
    }
    if (scene.captions !== undefined) {
      if (type !== 'video') throw new Error('زیرنویس فقط برای ویدیو مجاز است.');
      parsed.captions = safeContentPath(scene.captions, 'media/captions/', ['.vtt']);
    }
    if (scene.durationSeconds !== undefined) {
      if (type !== 'image' || !Number.isFinite(scene.durationSeconds) ||
          (scene.durationSeconds as number) < 1 || (scene.durationSeconds as number) > 120) {
        throw new Error('مدت اسلاید باید بین ۱ تا ۱۲۰ ثانیه باشد.');
      }
      parsed.durationSeconds = scene.durationSeconds as number;
    }
    return parsed;
  });
  return { schemaVersion: 1, contentVersion, id, locale, title, enabled: data.enabled, scenes };
}

/** Compatible with Vite BASE_URL='./' on both / and GitHub Pages subpaths. */
export function contentUrl(path: string, baseUrl: string, pageUrl: string): string {
  const safe = safeContentPath(path, '', ['.json', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.mp4', '.webm', '.vtt']);
  const base = new URL(baseUrl, pageUrl);
  return new URL('content/' + safe, base).href;
}
