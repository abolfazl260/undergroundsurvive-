import { subscribeLocaleChange, t } from '../i18n';

/** Interactive fullscreen HUD layers; only presentation state lives here. */
export type GameSheet = 'rooms' | 'more' | null;
export function nextGameSheet(current: GameSheet, requested: Exclude<GameSheet, null>): GameSheet {
  return current === requested ? null : requested;
}

export function mountGameDock(root: Document = document): {
  getSheet: () => GameSheet;
  showSheet: (sheet: GameSheet) => void;
  toggleSheet: (sheet: Exclude<GameSheet, null>) => void;
} {
  const sheet = root.querySelector<HTMLElement>('#game-sheet');
  const dock = root.querySelector<HTMLElement>('#action-dock');
  const toolGrid = sheet?.querySelector<HTMLElement>('.tools-grid');
  const moreButton = root.querySelector<HTMLButtonElement>('#open-more');
  const closeButton = root.querySelector<HTMLButtonElement>('#close-game-sheet');
  const title = root.querySelector<HTMLElement>('#sheet-title');
  const resourcePanel = root.querySelector<HTMLElement>('.resource-panel');
  const resourceToggle = root.querySelector<HTMLButtonElement>('#resource-details-toggle');
  const fullscreen = root.querySelector<HTMLButtonElement>('#screen-fullscreen');
  if (!sheet || !dock || !toolGrid || !moreButton || !closeButton || !title || !resourcePanel || !resourceToggle) {
    throw new Error('Fullscreen game controls are missing required elements');
  }

  // Move the existing controls rather than cloning them; IDs, listeners and tool state stay intact.
  dock.append(toolGrid);
  // The save indicator remains visible as a small status dot in the compact header.
  const saveBadge = root.querySelector<HTMLElement>('#hud-save-status');
  const topbar = root.querySelector<HTMLElement>('.topbar');
  if (saveBadge && topbar) topbar.append(saveBadge);
  // Upgrade confirmations remain visible while selecting a room in the map.
  const upgradePanel = sheet.querySelector<HTMLElement>('#upgrade-panel');
  const playArea = root.querySelector<HTMLElement>('.play-area');
  if (upgradePanel && playArea) playArea.append(upgradePanel);
  let current: GameSheet = null;
  const showSheet = (next: GameSheet) => {
    current = next;
    sheet.hidden = next === null;
    sheet.dataset.sheet = next ?? '';
    title.textContent = t(next === 'more' ? 'امکانات پناهگاه' : 'انتخاب اتاق');
    moreButton.setAttribute('aria-expanded', String(next === 'more'));
    dock.setAttribute('data-sheet-open', String(next !== null));
  };

  const toggleSheet = (next: Exclude<GameSheet, null>) => showSheet(nextGameSheet(current, next));
  subscribeLocaleChange(() => showSheet(current));
  moreButton.addEventListener('click', () => toggleSheet('more'));
  closeButton.addEventListener('click', () => showSheet(null));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showSheet(null);
    }
  });
  resourceToggle.addEventListener('click', () => {
    const open = resourcePanel.dataset.expanded !== 'true';
    resourcePanel.dataset.expanded = String(open);
    resourceToggle.setAttribute('aria-expanded', String(open));
  });

  const updateFullscreen = () => {
    if (fullscreen) fullscreen.setAttribute('aria-pressed', String(!!root.fullscreenElement));
  };
  fullscreen?.addEventListener('click', () => {
    if (root.fullscreenElement) {
      if (root.exitFullscreen) void root.exitFullscreen().catch(() => {});
    } else {
      // Browser fullscreen requires a user gesture and is unsupported on some iPhones.
      const target = root.documentElement;
      if (target?.requestFullscreen) void target.requestFullscreen().catch(() => {});
    }
  });
  root.addEventListener('fullscreenchange', updateFullscreen);
  showSheet(null);
  updateFullscreen();
  return { getSheet: () => current, showSheet, toggleSheet };
}
