import type { GameSnapshot } from '../modules/economy/session';
import {
  ACHIEVEMENTS, getAchievementViews,
  type AchievementMetric, type AchievementId, type AchievementView
} from '../modules/achievements/achievements';
import { formatNumber, t } from '../i18n';

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

// Every illustration is sourced from room art already shipped with the game.
const artworkById: Record<AchievementId, string> = {
  'first-room': 'habitat',
  builder: 'workshop',
  'first-dig': 'mine',
  excavator: 'mine',
  'first-upgrade': 'workshop',
  upgrader: 'command',
  'upper-floor': 'command',
  skyline: 'command',
  'first-cycles': 'generator',
  'steady-shelter': 'generator',
  'diverse-shelter': 'garden'
};

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

  function renderList(resetScroll = false): void {
    const priorScroll = resetScroll ? 0 : list.scrollTop;
    const shown = latestViews.filter((view) =>
      activeFilter === 'all' || categoryById.get(view.id) === activeFilter
    );
    const items = shown.map((view) => {
      const item = root.createElement('li');
      item.className = 'achievement-item' + (view.unlocked ? ' is-unlocked' : '');

      const medal = root.createElement('span');
      medal.className = 'achievement-medal';
      medal.textContent = view.unlocked ? '★' : '◇';
      medal.setAttribute('aria-hidden', 'true');

      const detail = root.createElement('div');
      detail.className = 'achievement-detail';
      const title = root.createElement('strong');
      title.textContent = t(view.title);
      const description = root.createElement('p');
      description.textContent = t(view.description);
      const progress = root.createElement('progress');
      progress.max = view.target;
      progress.value = view.unlocked ? view.target : view.progress;
      progress.setAttribute('aria-label', t('پیشرفت') + ': ' + t(view.title));
      const status = root.createElement('span');
      status.className = 'achievement-item-status';
      const statusText = root.createElement('span');
      statusText.textContent = view.unlocked ? t('باز شده') :
        formatNumber(view.progress) + ' / ' + formatNumber(view.target);
      const statusIcon = root.createElement('span');
      statusIcon.className = 'achievement-state-icon';
      statusIcon.textContent = view.unlocked ? '✓' : '◇';
      statusIcon.setAttribute('aria-hidden', 'true');
      status.append(statusText, statusIcon);
      detail.append(title, description, progress, status);

      const art = root.createElement('span');
      art.className = 'achievement-art';
      art.dataset.art = artworkById[view.id];
      art.setAttribute('aria-hidden', 'true');
      item.append(medal, detail, art);
      return item;
    });
    list.replaceChildren(...items);
    list.scrollTop = priorScroll;
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
      renderList(true);
      dialog.showModal();
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
