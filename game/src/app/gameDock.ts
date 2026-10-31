import { subscribeLocaleChange, t } from '../i18n';
import type { BuildableRoomType } from '../modules/building/catalog';
import { createIcon } from '../ui/icons';
import {
  ROOM_ART_ASSET, GARDEN_MEDBAY_ART_ASSET, LAB_WATER_ART_ASSET,
  roomArtCandidates
} from './roomArt';

/** All editing controls occupy a single bottom interaction region. */
export type GameSheet = 'rooms' | 'tools' | 'more' | null;
export function nextGameSheet(current: GameSheet, requested: Exclude<GameSheet, null>): GameSheet {
  return current === requested ? null : requested;
}

export const ROOM_CATEGORIES = [
  { key: 'all', label: 'همه اتاق‌ها' },
  { key: 'living', label: 'مسکونی' },
  { key: 'command', label: 'فرماندهی' },
  { key: 'resources', label: 'منابع' },
  { key: 'production', label: 'تولید' },
  { key: 'services', label: 'خدمات' },
  { key: 'defense', label: 'دفاعی' },
  { key: 'research', label: 'تحقیقات' }
] as const;
export type RoomCategory = typeof ROOM_CATEGORIES[number]['key'];

export const ROOM_CATEGORY: Record<BuildableRoomType, Exclude<RoomCategory, 'all'>> = {
  habitat: 'living', recreation: 'living', kitchen: 'living',
  command: 'command',
  hydroponics: 'resources', waterTreatment: 'resources', generator: 'resources',
  mine: 'production', workshop: 'production', storage: 'production',
  medbay: 'services', ventilation: 'services',
  guardPost: 'defense', laboratory: 'research'
};

export function roomMatchesCategory(type: BuildableRoomType, category: RoomCategory): boolean {
  return category === 'all' || ROOM_CATEGORY[type] === category;
}

/** Extract native artwork from the existing sprite atlases; never use the UI concept image as a game texture. */
function attachRoomPreview(button: HTMLButtonElement, root: Document): void {
  const type = button.dataset.room as BuildableRoomType;
  const canvas = root.createElement('canvas');
  canvas.className = 'room-preview';
  canvas.width = 320;
  canvas.height = 107;
  canvas.setAttribute('aria-hidden', 'true');
  button.prepend(canvas);

  const candidate = roomArtCandidates(type, 1)[0];
  const asset = [ROOM_ART_ASSET, GARDEN_MEDBAY_ART_ASSET, LAB_WATER_ART_ASSET]
    .find((item) => item.key === candidate?.key);
  if (!candidate || !asset || asset.kind !== 'spritesheet') {
    button.classList.add('room-preview-fallback');
    return;
  }
  const variant = asset.variants.find((item) => item.scale > 1) ?? asset.variants[0];
  const frameWidth = variant.frameWidth ?? asset.frameWidth;
  const frameHeight = variant.frameHeight ?? asset.frameHeight;
  if (!frameWidth || !frameHeight) return;
  const img = root.createElement('img');
  img.decoding = 'async';
  img.onload = () => {
    const columns = Math.max(1, Math.floor(img.naturalWidth / frameWidth));
    const sx = (candidate.frame % columns) * frameWidth;
    const sy = Math.floor(candidate.frame / columns) * frameHeight;
    if (sx + frameWidth > img.naturalWidth || sy + frameHeight > img.naturalHeight) return;
    canvas.getContext('2d')?.drawImage(img, sx, sy, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
    button.classList.add('has-room-preview');
  };
  // Base-relative paths also work when the game is deployed under GitHub Pages' repo prefix.
  img.src = new URL(variant.path, root.baseURI).href;
}

function dockButton(root: Document, id: string, icon: 'package' | 'wrench', label: string, className: string): HTMLButtonElement {
  const button = root.createElement('button');
  button.type = 'button';
  button.id = id;
  button.className = className;
  button.append(createIcon(icon));
  const caption = root.createElement('span');
  caption.textContent = t(label);
  caption.dataset.dockLabel = label;
  button.append(caption);
  button.setAttribute('aria-controls', 'game-sheet');
  button.setAttribute('aria-expanded', 'false');
  return button;
}

export function mountGameDock(root: Document = document): {
  getSheet: () => GameSheet;
  showSheet: (sheet: GameSheet) => void;
  toggleSheet: (sheet: Exclude<GameSheet, null>) => void;
} {
  const sheet = root.querySelector<HTMLElement>('#game-sheet');
  const dock = root.querySelector<HTMLElement>('#action-dock');
  const toolGrid = sheet?.querySelector<HTMLElement>('.tools-grid');
  const roomList = sheet?.querySelector<HTMLElement>('.room-list');
  const moreButton = root.querySelector<HTMLButtonElement>('#open-more');
  const closeButton = root.querySelector<HTMLButtonElement>('#close-game-sheet');
  const scrim = root.querySelector<HTMLElement>('#sheet-scrim');
  const title = root.querySelector<HTMLElement>('#sheet-title');
  const resourcePanel = root.querySelector<HTMLElement>('.resource-panel');
  const resourceToggle = root.querySelector<HTMLButtonElement>('#resource-details-toggle');
  const fullscreen = root.querySelector<HTMLButtonElement>('#screen-fullscreen');
  const topbar = root.querySelector<HTMLElement>('.topbar');
  const hud = root.querySelector<HTMLElement>('.hud-bar');
  if (!sheet || !dock || !toolGrid || !roomList || !moreButton || !closeButton || !scrim || !title || !resourcePanel || !resourceToggle || !topbar || !hud) {
    throw new Error('Fullscreen game controls are missing required elements');
  }

  // Keep the top HUD small. The resource drawer belongs to the viewport, not
  // the filtered/backdrop-blurred header (which traps fixed descendants).
  topbar.insertBefore(hud, moreButton);
  const app = root.querySelector<HTMLElement>('#app');
  if (!app) throw new Error('Game root missing');
  app.append(resourcePanel);
  const saveBadge = root.querySelector<HTMLElement>('#hud-save-status');
  if (saveBadge) topbar.append(saveBadge);
  const upgradePanel = sheet.querySelector<HTMLElement>('#upgrade-panel');
  const playArea = root.querySelector<HTMLElement>('.play-area');
  if (upgradePanel && playArea) playArea.append(upgradePanel);

  // The right-side story buttons and zoom rail now live inside bottom-accessible sheets.
  const storyNavigation = root.querySelector<HTMLElement>('.story-navigation');
  const heading = sheet.querySelector<HTMLElement>('.sidebar-heading');
  if (storyNavigation && heading) sheet.insertBefore(storyNavigation, heading);
  const toolsContainer = root.createElement('section');
  toolsContainer.className = 'dock-tools-container';
  toolsContainer.setAttribute('aria-label', t('ابزارهای زمین و اتاق'));
  toolsContainer.append(toolGrid);
  const zoom = root.querySelector<HTMLElement>('.zoom-controls');
  if (zoom) toolsContainer.append(zoom);
  if (fullscreen) toolsContainer.append(fullscreen);
  sheet.append(toolsContainer);

  const categories = root.createElement('nav');
  categories.className = 'room-categories';
  categories.setAttribute('aria-label', t('دسته‌بندی اتاق‌ها'));
  const categoryButtons = ROOM_CATEGORIES.map(({ key, label }) => {
    const button = root.createElement('button');
    button.type = 'button';
    button.dataset.roomCategory = key;
    button.textContent = t(label);
    button.setAttribute('aria-pressed', String(key === 'all'));
    categories.append(button);
    return button;
  });
  sheet.insertBefore(categories, roomList);
  const roomButtons = Array.from(roomList.querySelectorAll<HTMLButtonElement>('[data-room]'));
  roomButtons.forEach((button) => attachRoomPreview(button, root));

  const buildFooter = root.createElement('div');
  buildFooter.className = 'build-footer';
  const description = root.createElement('div');
  description.className = 'build-selected-info';
  const label = root.createElement('strong');
  label.textContent = t('اتاق انتخاب‌شده');
  const detail = root.createElement('span');
  detail.id = 'selected-room-summary';
  description.append(label, detail);
  const confirm = root.createElement('button');
  confirm.type = 'button';
  confirm.id = 'confirm-room-placement';
  confirm.className = 'build-confirm';
  confirm.append(createIcon('package'), root.createTextNode(t('شروع ساخت')));
  buildFooter.append(description, confirm);
  roomList.after(buildFooter);

  const buildButton = dockButton(root, 'dock-build', 'package', 'ساخت اتاق', 'dock-primary');
  const toolsButton = dockButton(root, 'dock-tools', 'wrench', 'ابزارها', 'dock-secondary');
  dock.append(buildButton, toolsButton);

  let current: GameSheet = null;
  let activeCategory: RoomCategory = 'all';
  const filterRooms = (category: RoomCategory) => {
    activeCategory = category;
    categoryButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.roomCategory === category)));
    roomButtons.forEach((button) => {
      button.hidden = !roomMatchesCategory(button.dataset.room as BuildableRoomType, category);
    });
    // Keep the selected card visible in the new category, including keyboard navigation.
    const visible = roomButtons.filter((button) => !button.hidden);
    if (visible.length && !visible.some((button) => button.getAttribute('aria-pressed') === 'true')) visible[0].click();
  };
  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => filterRooms(button.dataset.roomCategory as RoomCategory));
  });

  const measureHud = () => {
    root.documentElement.style.setProperty('--hud-dock-occupied', dock.getBoundingClientRect().height + 'px');
    root.documentElement.style.setProperty('--hud-top-occupied', topbar.getBoundingClientRect().height + 'px');
  };
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(measureHud);
    observer.observe(dock);
    observer.observe(topbar);
  }
  root.defaultView?.addEventListener('resize', measureHud);
  measureHud();

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
    title.textContent = t(next === 'more' ? 'امکانات پناهگاه' : next === 'tools' ? 'ابزارهای زمین و اتاق' : 'ساخت اتاق');
    moreButton.setAttribute('aria-expanded', String(next === 'more'));
    buildButton.setAttribute('aria-expanded', String(next === 'rooms'));
    toolsButton.setAttribute('aria-expanded', String(next === 'tools'));
    dock.dataset.sheetOpen = String(next !== null);
    dock.dataset.activeSheet = next ?? '';
    if (next === 'rooms') filterRooms(activeCategory);
  };
  const toggleSheet = (requested: Exclude<GameSheet, null>) => showSheet(nextGameSheet(current, requested));
  subscribeLocaleChange(() => {
    categoryButtons.forEach((button, index) => { button.textContent = t(ROOM_CATEGORIES[index].label); });
    dock.querySelectorAll<HTMLElement>('[data-dock-label]').forEach((node) => {
      node.textContent = t(node.dataset.dockLabel ?? '');
    });
    label.textContent = t('اتاق انتخاب‌شده');
    confirm.lastChild!.textContent = t('شروع ساخت');
    showSheet(current);
  });
  buildButton.addEventListener('click', () => toggleSheet('rooms'));
  toolsButton.addEventListener('click', () => toggleSheet('tools'));
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
    if (open && current !== null) showSheet(null);
    resourcePanel.dataset.expanded = String(open);
    resourceToggle.setAttribute('aria-expanded', String(open));
  });
  root.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Node && !resourcePanel.contains(event.target)) collapseResources();
  });
  const updateFullscreen = () => fullscreen?.setAttribute('aria-pressed', String(!!root.fullscreenElement));
  fullscreen?.addEventListener('click', () => {
    if (root.fullscreenElement) {
      if (root.exitFullscreen) void root.exitFullscreen().catch(() => {});
    } else if (root.documentElement.requestFullscreen) {
      void root.documentElement.requestFullscreen().catch(() => {});
    }
  });
  root.addEventListener('fullscreenchange', updateFullscreen);
  showSheet(null);
  updateFullscreen();
  return { getSheet: () => current, showSheet, toggleSheet };
}
