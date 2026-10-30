import type { GameSnapshot } from '../modules/economy/session';
import { ACHIEVEMENTS, getAchievementViews } from '../modules/achievements/achievements';
import { formatNumber, t } from '../i18n';

/** Responsive achievement dialog; progress is read-only and never awards coins. */
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
  const list = get<HTMLUListElement>('#achievements-list');
  const toast = get<HTMLElement>('#achievement-toast');
  let priorUnlocks: Set<string> | null = null;
  let toastTimer: number | undefined;

  openButton.addEventListener('click', () => {
    if (!dialog.open) dialog.showModal();
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => openButton.focus());

  return (snapshot: GameSnapshot) => {
    const views = getAchievementViews(snapshot);
    const completed = views.filter((view) => view.unlocked);
    count.textContent = formatNumber(completed.length) + ' / ' + formatNumber(ACHIEVEMENTS.length);
    summary.textContent = t('{done} از {total} دستاورد باز شده', {
      done: formatNumber(completed.length), total: formatNumber(views.length)
    });
    list.replaceChildren(...views.map((view) => {
      const item = root.createElement('li');
      item.className = 'achievement-item' + (view.unlocked ? ' is-unlocked' : '');
      const medal = root.createElement('span');
      medal.className = 'achievement-medal';
      medal.textContent = view.unlocked ? '★' : '◇';
      medal.setAttribute('aria-hidden', 'true');
      const content = root.createElement('div');
      content.className = 'achievement-detail';
      const title = root.createElement('strong');
      title.textContent = t(view.title);
      const description = root.createElement('p');
      description.textContent = t(view.description);
      const status = root.createElement('span');
      status.className = 'achievement-item-status';
      status.textContent = view.unlocked ? t('باز شده') :
        formatNumber(view.progress) + ' / ' + formatNumber(view.target);
      const progress = root.createElement('progress');
      progress.max = view.target;
      progress.value = view.unlocked ? view.target : view.progress;
      progress.setAttribute('aria-label', t('پیشرفت') + ': ' + t(view.title));
      content.append(title, description, progress, status);
      item.append(medal, content);
      return item;
    }));

    const current = new Set(snapshot.achievements.unlocked);
    if (priorUnlocks !== null) {
      const unlockedNow = views.filter((view) => current.has(view.id) && !priorUnlocks!.has(view.id));
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
