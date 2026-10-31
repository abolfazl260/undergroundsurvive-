import { contentUrl, type StoryChapter, type StoryScene } from './content';
import { loadStoryCatalog } from './loader';
import { readStoryProgress, saveStoryPosition, storyCompleted, storyResumeIndex } from './progress';
import { getLocale, mountStaticTranslations, subscribeLocaleChange, t } from '../../i18n';
import './viewer.css';

export interface StoryViewer {
  openChapter(chapterId: string, restart?: boolean): Promise<void>;
}
export interface StoryViewerOptions {
  onChapterFinished?: (chapterId: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function mountStoryViewer(openButton: HTMLButtonElement, options: StoryViewerOptions = {}): StoryViewer {
  const dialog = document.createElement('dialog');
  dialog.className = 'story-dialog';
  dialog.setAttribute('aria-label', 'سناریوهای تصویری و ویدیویی');
  dialog.innerHTML = `
    <section class="story-panel">
      <header class="story-head">
        <div><span class="story-eyebrow">UNDERGROUND SURVIVE</span><h2>داستان و روایت</h2></div>
        <button type="button" class="story-close" aria-label="بستن داستان">×</button>
      </header>
      <div class="story-toolbar">
        <label for="story-chapter">فصل <select id="story-chapter" aria-label="انتخاب فصل داستان"></select></label>
        <span class="story-status" role="status" aria-live="polite"></span>
      </div>
      <div class="story-progress-track" aria-hidden="true"><span class="story-progress-fill"></span></div>
      <div class="story-stage" aria-live="off"><p class="story-placeholder">در حال آماده‌سازی داستان…</p></div>
      <div class="story-copy"><h3 class="story-title"></h3><p class="story-text"></p></div>
      <footer class="story-actions">
        <button type="button" class="story-prev">قبلی</button>
        <span class="story-counter" aria-live="polite"></span>
        <button type="button" class="story-next">بعدی</button>
        <button type="button" class="story-skip">رد کردن فصل</button>
      </footer>
    </section>`;
  document.body.append(dialog);
  mountStaticTranslations(dialog);
  dialog.dir = getLocale() === 'fa' ? 'rtl' : 'ltr';
  subscribeLocaleChange(() => { dialog.dir = getLocale() === 'fa' ? 'rtl' : 'ltr'; });

  const select = dialog.querySelector<HTMLSelectElement>('#story-chapter')!;
  const stage = dialog.querySelector<HTMLElement>('.story-stage')!;
  const title = dialog.querySelector<HTMLElement>('.story-title')!;
  const text = dialog.querySelector<HTMLElement>('.story-text')!;
  const status = dialog.querySelector<HTMLElement>('.story-status')!;
  const counter = dialog.querySelector<HTMLElement>('.story-counter')!;
  const progressFill = dialog.querySelector<HTMLElement>('.story-progress-fill')!;
  const prev = dialog.querySelector<HTMLButtonElement>('.story-prev')!;
  const next = dialog.querySelector<HTMLButtonElement>('.story-next')!;
  const skip = dialog.querySelector<HTMLButtonElement>('.story-skip')!;
  const baseUrl = import.meta.env.BASE_URL;
  const pageUrl = window.location.href;
  const mediaUrl = (path: string): string => contentUrl(path, baseUrl, pageUrl);

  let chapters: StoryChapter[] = [];
  let chapterIndex = 0;
  let sceneIndex = 0;
  let loaded = false;
  let loadedLocale: 'fa' | 'en' | null = null;
  let loading = false;
  let slideTimer: number | undefined;
  const storage = (() => {
    try { return window.localStorage; } catch { return null; }
  })();

  function stopMedia(): void {
    if (slideTimer !== undefined) window.clearTimeout(slideTimer);
    slideTimer = undefined;
    stage.querySelector('video')?.pause();
    stage.replaceChildren();
  }

  function message(value: string): void {
    stopMedia();
    const notice = document.createElement('p');
    notice.className = 'story-placeholder';
    notice.textContent = value;
    stage.append(notice);
    title.textContent = '';
    text.textContent = '';
    counter.textContent = '';
    progressFill.style.width = '0%';
    prev.disabled = true;
    next.disabled = true;
    skip.disabled = true;
  }

  function fallback(scene: StoryScene): void {
    stopMedia();
    if (scene.poster) {
      const poster = document.createElement('img');
      poster.alt = scene.title || t('پوستر جایگزین');
      poster.src = mediaUrl(scene.poster);
      poster.addEventListener('error', () => {
        poster.remove();
        const notice = document.createElement('p');
        notice.className = 'story-placeholder';
        notice.textContent = t('رسانه در دسترس نیست؛ متن صحنه را دنبال کنید.');
        stage.append(notice);
      }, { once: true });
      stage.append(poster);
    } else {
      const notice = document.createElement('p');
      notice.className = 'story-placeholder';
      notice.textContent = t('رسانه در دسترس نیست؛ متن صحنه را دنبال کنید.');
      stage.append(notice);
    }
  }

  function activeChapter(): StoryChapter | undefined {
    return chapters[chapterIndex];
  }

  function render(): void {
    const chapter = activeChapter();
    if (!chapter) {
      message(t('هنوز فصل قابل‌نمایشی ثبت نشده است.'));
      return;
    }
    const scene = chapter.scenes[sceneIndex];
    if (!scene) return;
    stopMedia();
    saveStoryPosition(storage, chapter, sceneIndex);
    select.value = chapter.id;
    status.textContent = chapter.title;
    title.textContent = scene.title || chapter.title;
    text.textContent = scene.text;
    counter.textContent = (sceneIndex + 1) + ' / ' + chapter.scenes.length;
    progressFill.style.width = ((sceneIndex + 1) / chapter.scenes.length * 100) + '%';
    prev.disabled = sceneIndex === 0;
    next.disabled = false;
    skip.disabled = false;
    next.textContent = sceneIndex === chapter.scenes.length - 1 ? t('پایان فصل') : t('بعدی');

    if (scene.type === 'image') {
      const image = document.createElement('img');
      image.alt = scene.title || chapter.title;
      image.src = mediaUrl(scene.src);
      image.addEventListener('error', () => fallback(scene), { once: true });
      stage.append(image);
      if (scene.durationSeconds) {
        slideTimer = window.setTimeout(() => advance(), scene.durationSeconds * 1000);
      }
    } else {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.src = mediaUrl(scene.src);
      if (scene.poster) video.poster = mediaUrl(scene.poster);
      if (scene.captions) {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = t('زیرنویس');
        track.srclang = chapter.locale.split('-')[0];
        track.src = mediaUrl(scene.captions);
        track.default = true;
        video.append(track);
      }
      video.addEventListener('error', () => fallback(scene), { once: true });
      stage.append(video);
    }
  }

  function close(): void {
    if (dialog.open) dialog.close();
  }

  function advance(): void {
    const chapter = activeChapter();
    if (!chapter) return;
    if (sceneIndex >= chapter.scenes.length - 1) {
      saveStoryPosition(storage, chapter, chapter.scenes.length);
      options.onChapterFinished?.(chapter.id);
      close();
    } else {
      sceneIndex++;
      render();
    }
  }

  select.addEventListener('change', () => {
    const found = chapters.findIndex((chapter) => chapter.id === select.value);
    if (found < 0) return;
    chapterIndex = found;
    sceneIndex = storyResumeIndex(chapters[found], readStoryProgress(storage));
    render();
  });
  prev.addEventListener('click', () => {
    if (sceneIndex > 0) { sceneIndex--; render(); }
  });
  next.addEventListener('click', advance);
  skip.addEventListener('click', () => {
    const chapter = activeChapter();
    if (chapter) {
      saveStoryPosition(storage, chapter, chapter.scenes.length);
      options.onChapterFinished?.(chapter.id);
    }
    close();
  });
  dialog.querySelector<HTMLButtonElement>('.story-close')!.addEventListener('click', close);
  dialog.addEventListener('close', () => { stopMedia(); options.onClose?.(); });

  async function open(chapterId?: string, restart = false): Promise<void> {
    if (dialog.open) return;
    dialog.showModal();
    options.onOpen?.();
    if (loadedLocale !== getLocale()) loaded = false;
    if (loaded) {
      const found = chapters.findIndex((chapter) => chapter.id === chapterId);
      if (found >= 0) chapterIndex = found;
      const chapter = activeChapter();
      if (chapter) sceneIndex = restart ? 0 : storyResumeIndex(chapter, readStoryProgress(storage));
      render();
      return;
    }
    if (loading) return;
    loading = true;
    message(t('در حال بارگذاری فصل‌ها…'));
    try {
      const catalog = await loadStoryCatalog(baseUrl, pageUrl, undefined, getLocale());
      chapters = catalog.chapters;
      loaded = true;
      loadedLocale = getLocale();
      select.replaceChildren();
      const progress = readStoryProgress(storage);
      for (const chapter of chapters) {
        const option = document.createElement('option');
        option.value = chapter.id;
        option.textContent = chapter.title + (storyCompleted(chapter, progress) ? ' ✓' : '');
        select.append(option);
      }
      select.disabled = chapters.length === 0;
      if (catalog.errors.length) {
        status.textContent = catalog.errors.length + ' ' + t('فصل بارگذاری نشد.');
      }
      if (chapters.length) {
        const selected = chapters.findIndex((chapter) => chapter.id === chapterId);
        chapterIndex = selected >= 0 ? selected : 0;
        sceneIndex = restart ? 0 : storyResumeIndex(chapters[chapterIndex], progress);
        if (dialog.open) render();
      } else {
        message(t(catalog.errors.length ? 'فصل‌ها قابل بارگذاری نیستند. فایل‌های محتوا را بررسی کنید.' : 'هنوز فصل فعالی وجود ندارد.'));
      }
    } catch (error) {
      message(t('دریافت محتوای داستان ناموفق بود. اتصال اینترنت یا انتشار فایل‌های محتوا را بررسی کنید.'));
      status.textContent = error instanceof Error ? error.message : t('خطای بارگذاری');
    } finally {
      loading = false;
    }
  }
  openButton.addEventListener('click', () => { void open(); });
  return { openChapter: (chapterId, restart = false) => open(chapterId, restart) };
}
