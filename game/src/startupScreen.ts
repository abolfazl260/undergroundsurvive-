import { getLocale, subscribeLocaleChange } from './i18n';

export type StartupPhase = 'initializing' | 'restoring' | 'assets' | 'world' | 'ready';

/** Phase-weighted progress, not an invented download-bytes counter. */
export function startupPercent(phase: StartupPhase, assetFraction = 0): number {
  switch (phase) {
    case 'initializing': return 0;
    case 'restoring': return 10;
    case 'assets': {
      const bounded = Number.isFinite(assetFraction) ? Math.min(1, Math.max(0, assetFraction)) : 0;
      return 15 + Math.round(bounded * 80);
    }
    case 'world': return 97;
    case 'ready': return 100;
  }
}

type MessageKey = StartupPhase | 'detail' | 'slow' | 'failed' | 'retry' | 'someAssets';
const messages: Record<'fa' | 'en', Record<MessageKey, string>> = {
  fa: {
    initializing: 'در حال راه‌اندازی پناهگاه…',
    restoring: 'بازیابی پیشرفت و تنظیمات…',
    assets: 'در حال دریافت تصاویر و منابع بازی…',
    world: 'در حال آماده‌سازی دنیای بازی…',
    ready: 'پناهگاه آماده است',
    detail: 'منابع لازم برای اجرای بازی آماده می‌شوند.',
    slow: 'بارگذاری بیشتر از حد معمول طول کشیده است. می‌توانید دوباره تلاش کنید.',
    failed: 'راه‌اندازی بازی با مشکل مواجه شد. برای تلاش دوباره، صفحه را بارگذاری کنید.',
    retry: 'تلاش مجدد',
    someAssets: 'برخی تصاویر در دسترس نیستند؛ بازی از نمای جایگزین استفاده می‌کند.'
  },
  en: {
    initializing: 'Starting the shelter…',
    restoring: 'Restoring progress and preferences…',
    assets: 'Loading game art and resources…',
    world: 'Preparing the game world…',
    ready: 'Shelter ready',
    detail: 'Preparing the resources needed to play.',
    slow: 'Loading is taking longer than usual. You can try again.',
    failed: 'The game could not start. Reload to try again.',
    retry: 'Try again',
    someAssets: 'Some images are unavailable; the game will use fallback visuals.'
  }
};

export interface StartupScreen {
  restoring(): void;
  assets(progress: number): void;
  worldReady(): void;
  assetUnavailable(key: string): void;
  finish(onComplete: () => void): void;
  fail(): void;
}

export function mountStartupScreen(doc: Document = document): StartupScreen {
  const overlay = doc.getElementById('startup-screen');
  const stage = doc.getElementById('startup-stage');
  const percent = doc.getElementById('startup-percent');
  const fill = doc.getElementById('startup-fill');
  const meter = doc.getElementById('startup-meter');
  const detail = doc.getElementById('startup-detail');
  const retry = doc.getElementById('startup-retry') as HTMLButtonElement | null;

  let phase: StartupPhase = 'initializing';
  let assetFraction = 0;
  let unavailableAssets = 0;
  let issue: 'slow' | 'failed' | null = null;
  let finished = false;
  const win = doc.defaultView;

  function render(): void {
    if (!overlay) return;
    const locale = getLocale();
    const labels = messages[locale];
    overlay.dir = locale === 'fa' ? 'rtl' : 'ltr';
    if (stage) stage.textContent = issue === 'failed' ? labels.failed : labels[phase];
    if (detail) detail.textContent = issue ? labels[issue] :
      unavailableAssets > 0 ? labels.someAssets : labels.detail;
    const value = startupPercent(phase, assetFraction);
    if (percent) percent.textContent = locale === 'fa' ? value.toLocaleString('fa-IR') + '٪' : value + '%';
    if (fill) fill.style.width = value + '%';
    if (meter) meter.setAttribute('aria-valuenow', String(value));
    if (retry) {
      retry.hidden = issue === null;
      retry.textContent = labels.retry;
    }
  }

  const slowTimer = win?.setTimeout(() => {
    if (!finished && !issue) {
      issue = 'slow';
      render();
    }
  }, 30000);

  const onError = (): void => {
    if (!finished) {
      issue = 'failed';
      render();
    }
  };
  win?.addEventListener('error', onError);
  win?.addEventListener('unhandledrejection', onError);
  retry?.addEventListener('click', () => win?.location.reload());
  const unsubscribe = subscribeLocaleChange(render);
  const cleanup = (): void => {
    if (slowTimer !== undefined) win?.clearTimeout(slowTimer);
    win?.removeEventListener('error', onError);
    win?.removeEventListener('unhandledrejection', onError);
    if (typeof unsubscribe === 'function') unsubscribe();
  };

  render();

  return {
    restoring() {
      if (finished) return;
      phase = 'restoring';
      render();
    },
    assets(progress: number) {
      if (finished) return;
      phase = 'assets';
      assetFraction = Math.max(assetFraction, Number.isFinite(progress) ? progress : 0);
      if (issue === 'slow') issue = null;
      render();
    },
    worldReady() {
      if (finished) return;
      phase = 'world';
      render();
    },
    assetUnavailable(key: string) {
      if (finished) return;
      unavailableAssets += 1;
      console.warn('Optional game image could not load:', key);
      render();
    },
    fail: onError,
    finish(onComplete) {
      if (finished) return;
      finished = true;
      issue = null;
      phase = 'ready';
      render();
      cleanup();
      overlay?.classList.add('startup-screen--done');
      const finishTransition = (): void => {
        overlay?.remove();
        onComplete();
      };
      // Respect reduced-motion settings and avoid blocking when no CSS transition fires.
      const reduceMotion = win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion || !overlay) finishTransition();
      else win?.setTimeout(finishTransition, 260);
    }
  };
}
