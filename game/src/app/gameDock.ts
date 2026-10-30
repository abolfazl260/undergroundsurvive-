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
  const scrim = root.querySelector<HTMLElement>('#sheet-scrim');
  const title = root.querySelector<HTMLElement>('#sheet-title');
  const resourcePanel = root.querySelector<HTMLElement>('.resource-panel');
  const resourceToggle = root.querySelector<HTMLButtonElement>('#resource-details-toggle');
  const fullscreen = root.querySelector<HTMLButtonElement>('#screen-fullscreen');
  const topbar = root.querySelector<HTMLElement>('.topbar');
  const hud = root.querySelector<HTMLElement>('.hud-bar');
  if (!sheet || !dock || !toolGrid || !moreButton || !closeButton || !scrim || !title || !resourcePanel || !resourceToggle || !topbar || !hud) {
    throw new Error('Fullscreen game controls are missing required elements');
  }

  // Reuse the live resource/HUD nodes inside a thin translucent header.
  // Moving the nodes (rather than cloning) preserves IDs, listeners and snapshot updates.
  topbar.insertBefore(hud, moreButton);
  topbar.insertBefore(resourcePanel, moreButton);
  dock.append(toolGrid);
  const saveBadge = root.querySelector<HTMLElement>('#hud-save-status');
  if (saveBadge) topbar.append(saveBadge);
  // Upgrade confirmations remain visible while selecting a room in the map.
  const upgradePanel = sheet.querySelector<HTMLElement>('#upgrade-panel');
  const playArea = root.querySelector<HTMLElement>('.play-area');
  if (upgradePanel && playArea) playArea.append(upgradePanel);
  // Measure actual wrapping and safe-area padding rather than assuming a dock height.
  const measureHud = () => {
    root.documentElement.style.setProperty('--hud-dock-occupied', dock.getBoundingClientRect().height + 'px');
    root.documentElement.style.setProperty('--hud-top-occupied', topbar.getBoundingClientRect().height + 'px');
  };
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(measureHud);
    observer.observe(dock);
    observer.observe(topbar);
  }
  measureHud();
  root.defaultView?.addEventListener('resize', measureHud);
  let current: GameSheet = null;
  const collapseResources = () => {
    resourcePanel.dataset.expanded = 'false';
    resourceToggle.setAttribute('aria-expanded', 'false');
  };
  const showSheet = (next: GameSheet) => {
    if (next !== null) collapseResources();
    current = next;
    sheet.hidden = next === null;
    scrim.hidden = next === null;
    sheet.dataset.sheet = next ?? '';
    title.textContent = t(next === 'more' ? 'امکانات پناهگاه' : 'انتخاب اتاق');
    moreButton.setAttribute('aria-expanded', String(next === 'more'));
    dock.setAttribute('data-sheet-open', String(next !== null));
  };

  const toggleSheet = (next: Exclude<GameSheet, null>) => showSheet(nextGameSheet(current, next));
  subscribeLocaleChange(() => showSheet(current));
  moreButton.addEventListener('click', () => toggleSheet('more'));
  closeButton.addEventListener('click', () => showSheet(null));
  scrim.addEventListener('click', () => showSheet(null));
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (current !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showSheet(null);
    } else if (resourcePanel.dataset.expanded === 'true') {
      event.preventDefault();
      collapseResources();
      resourceToggle.focus();
    }
  });
  resourceToggle.addEventListener('click', () => {
    const open = resourcePanel.dataset.expanded !== 'true';
    resourcePanel.dataset.expanded = String(open);
    resourceToggle.setAttribute('aria-expanded', String(open));
  });
  root.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Node && !resourcePanel.contains(event.target)) collapseResources();
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
