import type { GameSnapshot } from '../../modules/economy/session';
import { leaderboardFor } from '../../modules/online/leaderboard';
import { formatNumber, subscribeLocaleChange, t } from '../../i18n';
import { createIcon } from '../../ui/icons';

/** In-game sample ranking; network presence is only the device's reported online state. */
export function mountOnlineLeaderboard(
  root: Document,
  getSnapshot: () => GameSnapshot | null
): { render: () => void } {
  // The rankings entry belongs to the secondary navigation. That navigation
  // moves into the More sheet on phones without leaving an orphan grid row.
  const navigation = root.querySelector<HTMLElement>('.story-navigation');
  if (!navigation) throw new Error('Online leaderboard requires secondary navigation');

  const trigger = root.createElement('button');
  trigger.type = 'button';
  trigger.id = 'online-leaderboard-open';
  trigger.className = 'online-leaderboard-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'online-leaderboard-dialog');
  trigger.append(createIcon('network', 19));
  const label = root.createElement('span');
  trigger.append(label);
  navigation.append(trigger);

  const dialog = root.createElement('dialog');
  dialog.className = 'online-leaderboard-dialog';
  dialog.id = 'online-leaderboard-dialog';
  dialog.setAttribute('aria-labelledby', 'online-leaderboard-title');

  const header = root.createElement('header');
  header.className = 'online-leaderboard-header';
  const intro = root.createElement('div');
  const kicker = root.createElement('small');
  kicker.textContent = 'SURVIVOR RANKINGS';
  const title = root.createElement('h2');
  title.id = 'online-leaderboard-title';
  const description = root.createElement('p');
  intro.append(kicker, title, description);
  const close = root.createElement('button');
  close.type = 'button';
  close.className = 'online-leaderboard-close';
  close.setAttribute('aria-label', t('بستن رتبه‌بندی'));
  close.append(createIcon('x', 24));
  header.append(intro, close);

  const summary = root.createElement('section');
  summary.className = 'online-leaderboard-summary';
  const scoreTile = root.createElement('div');
  const scoreName = root.createElement('span');
  const scoreValue = root.createElement('strong');
  scoreTile.append(scoreName, scoreValue);
  const coinsTile = root.createElement('div');
  const coinsName = root.createElement('span');
  const coinsValue = root.createElement('strong');
  coinsTile.append(coinsName, coinsValue);
  summary.append(scoreTile, coinsTile);

  const listTitle = root.createElement('h3');
  listTitle.className = 'online-leaderboard-list-title';
  const list = root.createElement('ol');
  list.className = 'online-leaderboard-list';
  list.setAttribute('aria-label', t('رتبه‌بندی نمونه بازیکنان'));
  dialog.append(header, summary, listTitle, list);
  root.body.append(dialog);

  const render = () => {
    label.textContent = t('آنلاین');
    trigger.setAttribute('aria-label', t('نمایش رتبه‌بندی آزمایشی'));
    title.textContent = t('رتبه‌بندی بازماندگان');
    description.textContent = t('امتیاز پیشرفت و موجودی سکه');
    scoreName.textContent = t('امتیاز شما');
    coinsName.textContent = t('سکه‌های شما');
    listTitle.textContent = t('فهرست نمونه بازیکنان');
    close.setAttribute('aria-label', t('بستن رتبه‌بندی'));
    list.setAttribute('aria-label', t('رتبه‌بندی نمونه بازیکنان'));
    const snapshot = getSnapshot();
    scoreValue.textContent = snapshot ? formatNumber(leaderboardFor(snapshot).find((row) => row.isCurrentPlayer)!.score) : '—';
    coinsValue.textContent = snapshot ? formatNumber(snapshot.wallet.balance) : '—';
    list.replaceChildren();
    if (!snapshot) return;
    for (const [index, row] of leaderboardFor(snapshot).entries()) {
      const item = root.createElement('li');
      item.className = 'online-leaderboard-row';
      if (row.isCurrentPlayer) item.classList.add('is-player');
      const rank = root.createElement('span');
      rank.className = 'online-leaderboard-rank';
      rank.textContent = formatNumber(index + 1);
      const username = root.createElement('strong');
      username.className = 'online-leaderboard-name';
      username.dir = row.isCurrentPlayer ? 'auto' : 'ltr';
      username.textContent = row.isCurrentPlayer ? t('شما') : row.username;
      const stats = root.createElement('div');
      stats.className = 'online-leaderboard-stats';
      const score = root.createElement('span');
      score.textContent = formatNumber(row.score) + ' ' + t('امتیاز');
      const coins = root.createElement('span');
      coins.textContent = formatNumber(row.coins) + ' ' + t('سکه');
      stats.append(score, coins);
      item.append(rank, username, stats);
      list.append(item);
    }
  };

  const syncConnection = () => {
    const online = root.defaultView?.navigator.onLine === true;
    trigger.hidden = !online;
    if (!online && dialog.open) dialog.close();
  };

  trigger.addEventListener('click', () => {
    if (trigger.hidden || root.defaultView?.navigator.onLine !== true) return;
    render();
    dialog.showModal();
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (!trigger.hidden && trigger.isConnected) trigger.focus({ preventScroll: true });
  });
  root.defaultView?.addEventListener('online', syncConnection);
  root.defaultView?.addEventListener('offline', syncConnection);
  subscribeLocaleChange(render);
  syncConnection();
  render();
  return { render: () => { if (dialog.open) render(); } };
}
