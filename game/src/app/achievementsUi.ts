import type { GameSnapshot } from '../modules/economy/session';
import {
  ACHIEVEMENTS, getAchievementViews,
  type AchievementMetric, type AchievementId, type AchievementView
} from '../modules/achievements/achievements';
import { formatNumber, getLocale, t } from '../i18n';
import { assetUrl } from './assets/assetManager';

/** Presentation-only groups. Game rules and saved achievements remain unchanged. */
export type AchievementCategory = 'all' | 'construction' | 'exploration' | 'production' | 'community';

export function categoryForAchievement(metric: AchievementMetric): Exclude<AchievementCategory, 'all'> {
  if (metric === 'builds' || metric === 'digs' || metric === 'upgrades') return 'construction';
  if (metric === 'floors') return 'exploration';
  if (metric === 'cycles') return 'production';
  return 'community';
}

const categories = [
  { id: 'all', title: 'همه', icon: '★' },
  { id: 'construction', title: 'ساخت‌وساز', icon: '⚒' },
  { id: 'exploration', title: 'کاوش', icon: '◇' },
  { id: 'production', title: 'تولید', icon: '⚙' },
  { id: 'community', title: 'جمعیت', icon: '♟' }
] as const satisfies readonly { id: AchievementCategory; title: string; icon: string }[];

const categoryById = new Map<AchievementId, Exclude<AchievementCategory, 'all'>>(
  ACHIEVEMENTS.map((definition) => [definition.id, categoryForAchievement(definition.metric)] as const)
);

/**
 * The image filenames are runtime img/srcset values, not Vite CSS/JS imports.
 * Prefix with Vite's deployed base so GitHub Pages project URLs work alongside
 * root-hosted local previews, without hard-coding an origin or repository name.
 */
export function achievementArtPaths(
  id: AchievementId,
  baseUrl: string = import.meta.env.BASE_URL
): { small: string; large: string } {
  const filename = 'assets/achievements/' + id;
  return {
    small: assetUrl(baseUrl, filename + '-360.webp'),
    large: assetUrl(baseUrl, filename + '-540.webp')
  };
}

/** Responsive, keyboard-accessible dialog; badges never award coins or resources. */
export function mountAchievements(root: Document): (snapshot: GameSnapshot) => void {
  const get = <T extends HTMLElement>(selector: string): T => {
    const node = root.querySelector<T>(selector);
    if (!node) throw new Error('Missing achievements element: ' + selector);
    return node;
  };
  const openButton = get<HTMLButtonElement>('#achievements-open');
  const dialog = get<HTMLDialogElement>('#achievements-dialog');
  const closeButton = get<HTMLButtonElement>('#achievements-close');
  const count = get<HTMLElement>('#achievement-count');
  const summary = get<HTMLElement>('#achievements-summary');
  const totalProgress = get<HTMLProgressElement>('#achievements-total-progress');
  const totalFraction = get<HTMLOutputElement>('#achievements-total-fraction');
  const filters = get<HTMLElement>('#achievements-filters');
  const list = get<HTMLUListElement>('#achievements-list');
  const toast = get<HTMLElement>('#achievement-toast');
  let priorUnlocks: Set<string> | null = null;
  let toastTimer: number | undefined;
  let activeFilter: AchievementCategory = 'all';
  let latestViews: AchievementView[] = [];
  const filterButtons = new Map<AchievementCategory, HTMLButtonElement>();

  for (const category of categories) {
    const button = root.createElement('button');
    button.type = 'button';
    button.dataset.filter = category.id;
    const icon = root.createElement('span');
    icon.className = 'achievements-filter-icon';
    icon.textContent = category.icon;
    icon.setAttribute('aria-hidden', 'true');
    const label = root.createElement('span');
    label.className = 'achievements-filter-label';
    label.textContent = t(category.title);
    const number = root.createElement('span');
    number.className = 'achievements-filter-count';
    number.textContent = formatNumber(
      category.id === 'all' ? ACHIEVEMENTS.length :
        ACHIEVEMENTS.filter((definition) => categoryForAchievement(definition.metric) === category.id).length
    );
    button.append(icon, label, number);
    filters.append(button);
    filterButtons.set(category.id, button);
  }

  type CardRef = {
    element: HTMLLIElement;
    title: HTMLElement;
    description: HTMLParagraphElement;
    progress: HTMLProgressElement;
    status: HTMLElement;
    medal: HTMLElement;
    statusIcon: HTMLElement;
  };
  const cards = new Map<AchievementId, CardRef>();
  let renderedKey = '';

  function createCard(view: AchievementView): CardRef {
    const item = root.createElement('li');
    item.className = 'achievement-item';
    const medal = root.createElement('span');
    medal.className = 'achievement-medal';
    medal.setAttribute('aria-hidden', 'true');

    const detail = root.createElement('div');
    detail.className = 'achievement-detail';
    const title = root.createElement('strong');
    const description = root.createElement('p');
    const progress = root.createElement('progress');
    progress.max = view.target;
    const status = root.createElement('span');
    status.className = 'achievement-item-status';
    const statusText = root.createElement('span');
    const statusIcon = root.createElement('span');
    statusIcon.className = 'achievement-state-icon';
    statusIcon.setAttribute('aria-hidden', 'true');
    status.append(statusText, statusIcon);
    detail.append(title, description, progress, status);

    const art = root.createElement('img');
    art.className = 'achievement-art';
    const paths = achievementArtPaths(view.id);
    art.src = paths.large;
    art.srcset = paths.small + ' 360w, ' + paths.large + ' 540w';
    art.sizes = '(max-width: 720px) calc(100vw - 30px), 420px';
    art.alt = t(view.title);
    art.loading = 'lazy';
    art.decoding = 'async';
    art.width = 540;
    art.height = 180;
    item.append(medal, detail, art);

    return { element: item, title, description, progress, status: statusText,
      medal, statusIcon };
  }

  function updateCard(view: AchievementView, ref: CardRef): void {
    ref.element.classList.toggle('is-unlocked', view.unlocked);
    const translatedTitle = t(view.title);
    if (ref.title.textContent !== translatedTitle) ref.title.textContent = translatedTitle;
    const translatedDescription = t(view.description);
    if (ref.description.textContent !== translatedDescription) {
      ref.description.textContent = translatedDescription;
    }
    const progressLabel = t('پیشرفت') + ': ' + translatedTitle;
    if (ref.progress.getAttribute('aria-label') !== progressLabel) {
      ref.progress.setAttribute('aria-label', progressLabel);
    }
    const progress = view.unlocked ? view.target : view.progress;
    if (ref.progress.value !== progress) ref.progress.value = progress;
    const status = view.unlocked ? t('باز شده') :
      formatNumber(view.progress) + ' / ' + formatNumber(view.target);
    if (ref.status.textContent !== status) ref.status.textContent = status;
    const icon = view.unlocked ? '✓' : '◇';
    if (ref.statusIcon.textContent !== icon) ref.statusIcon.textContent = icon;
    const medal = view.unlocked ? '★' : '◇';
    if (ref.medal.textContent !== medal) ref.medal.textContent = medal;
  }

  /** Reuse existing cards across resource ticks; images keep their current request and decode state. */
  function renderList(force = false): void {
    if (!dialog.open) return;
    const shown = latestViews.filter((view) =>
      activeFilter === 'all' || categoryById.get(view.id) === activeFilter
    );
    const key = getLocale() + ':' + activeFilter;
    if (force || renderedKey !== key ||
        shown.length !== cards.size ||
        shown.some((view) => !cards.has(view.id))) {
      cards.clear();
      const fragment = root.createDocumentFragment();
      for (const view of shown) {
        const ref = createCard(view);
        cards.set(view.id, ref);
        fragment.append(ref.element);
      }
      list.replaceChildren(fragment);
      list.scrollTop = 0;
      renderedKey = key;
    }
    for (const view of shown) updateCard(view, cards.get(view.id)!);
  }

  function updateFilters(): void {
    for (const category of categories) {
      const button = filterButtons.get(category.id)!;
      button.setAttribute('aria-pressed', String(activeFilter === category.id));
      const label = button.querySelector<HTMLElement>('.achievements-filter-label')!;
      label.textContent = t(category.title);
      const number = button.querySelector<HTMLElement>('.achievements-filter-count')!;
      number.textContent = formatNumber(category.id === 'all' ? ACHIEVEMENTS.length :
        ACHIEVEMENTS.filter((entry) => categoryForAchievement(entry.metric) === category.id).length);
    }
    filters.setAttribute('aria-label', t('دسته‌بندی دستاوردها'));
  }

  filters.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLButtonElement>('button[data-filter]');
    if (!target) return;
    const next = target.dataset.filter as AchievementCategory;
    if (next === activeFilter || !filterButtons.has(next)) return;
    activeFilter = next;
    updateFilters();
    renderList(true);
  });
  openButton.addEventListener('click', () => {
    if (!dialog.open) {
      activeFilter = 'all';
      updateFilters();
      dialog.showModal();
      renderList(true);
    }
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => openButton.focus());
  updateFilters();

  return (snapshot: GameSnapshot) => {
    latestViews = getAchievementViews(snapshot);
    const completed = latestViews.filter((view) => view.unlocked);
    count.textContent = formatNumber(completed.length) + ' / ' + formatNumber(ACHIEVEMENTS.length);
    summary.textContent = t('{done} از {total} دستاورد باز شده', {
      done: formatNumber(completed.length), total: formatNumber(latestViews.length)
    });
    totalProgress.max = latestViews.length;
    totalProgress.value = completed.length;
    totalProgress.setAttribute('aria-label', t('پیشرفت کل دستاوردها'));
    totalFraction.textContent = formatNumber(completed.length) + ' / ' + formatNumber(latestViews.length);
    updateFilters();
    renderList();

    const current = new Set(snapshot.achievements.unlocked);
    if (priorUnlocks !== null) {
      const unlockedNow = latestViews.filter((view) => current.has(view.id) && !priorUnlocks!.has(view.id));
      if (unlockedNow.length > 0) {
        toast.textContent = unlockedNow.length === 1
          ? t('دستاورد جدید: {name}', { name: t(unlockedNow[0].title) })
          : t('{count} دستاورد جدید باز شد', { count: formatNumber(unlockedNow.length) });
        toast.hidden = false;
        if (toastTimer !== undefined) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4500);
      }
    }
    priorUnlocks = current;
  };
}
