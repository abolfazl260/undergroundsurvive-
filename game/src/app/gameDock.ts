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


/** Every button continues to use the game's existing editor and power mechanics. */
export const PRIMARY_EDITOR_TOOLS = [
  { id: 'elevator', icon: 'elevator', label: 'آسانسور', hint: 'توسعه شفت آسانسور' },
  { id: 'build', icon: 'package', label: 'ساخت', hint: 'اتاق جدید بسازید' },
  { id: 'dig', icon: 'pickaxe', label: 'حفاری', hint: '۳۵ سکه برای هر خانه' },
  { id: 'move', icon: 'move', label: 'جابه‌جایی', hint: 'انتقال اتاق' },
  { id: 'upgrade', icon: 'arrow-up', label: 'ارتقا', hint: 'افزایش سطح اتاق' },
  { id: 'remove', icon: 'trash', label: 'تخریب', hint: 'حذف سازه' },
  { id: 'navigate', icon: 'route', label: 'آدمک', hint: 'هدایت بازماندگان' }
] as const;

export const POWER_EDITOR_TOOLS = [
  { id: 'cable', icon: 'wire', label: 'کابل · ۱۵', hint: 'کابل‌کشی بین اتاق‌ها' },
  { id: 'riser', icon: 'riser', label: 'رابط عمودی · ۳۵', hint: 'اتصال بین طبقات' },
  { id: 'cutCable', icon: 'wire-cut', label: 'حذف کابل', hint: 'حذف اتصال انتخابی' },
  { id: 'power-overlay-toggle', icon: 'network', label: 'نمایش شبکه برق', hint: 'نمایش اتصال‌ها و قطعی‌ها' }
] as const;

/** Real optimized artwork for the digging card, matching the other neon tools. */
export const DIG_TOOL_ART = 'assets/ui/dig-pickaxe.webp';
type EditorToolCard = typeof PRIMARY_EDITOR_TOOLS[number] | typeof POWER_EDITOR_TOOLS[number];
function illustrateToolButton(root: Document, button: HTMLButtonElement, item: EditorToolCard): void {
  button.classList.add('tool-card', 'tool-card--' + item.id);
  button.dataset.toolLabel = item.label;
  button.dataset.toolHint = item.hint;
  const art = root.createElement('span');
  art.className = 'tool-card-art';
  art.setAttribute('aria-hidden', 'true');
  const platform = root.createElement('span');
  platform.className = 'tool-card-platform';
  if (item.id === 'dig') {
    // Keep the image decorative: the button's visible Persian/English label
    // remains its accessible name. A missing asset falls back to line art.
    const image = root.createElement('img');
    image.className = 'tool-card-image';
    image.src = import.meta.env.BASE_URL + DIG_TOOL_ART;
    image.alt = '';
    image.width = 128;
    image.height = 128;
    image.decoding = 'async';
    image.draggable = false;
    image.addEventListener('error', () => image.replaceWith(createIcon(item.icon, 54)), { once: true });
    art.append(image);
  } else {
    art.append(platform, createIcon(item.icon, 54));
  }
  const copy = root.createElement('span');
  copy.className = 'tool-card-copy';
  const name = root.createElement('span');
  name.className = 'ui-control-label';
  name.textContent = t(item.label);
  const hint = root.createElement('small');
  hint.className = 'tool-card-hint';
  hint.textContent = t(item.hint);
  copy.append(name, hint);
  button.replaceChildren(art, copy);
}
function makeToolHeading(root: Document, label: string, icon: 'bolt' | 'wrench'): HTMLElement {
  const heading = root.createElement('h3');
  heading.className = 'tool-section-heading';
  heading.dataset.toolSection = label;
  heading.append(createIcon(icon), root.createTextNode(t(label)));
  return heading;
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

  // All persistent gameplay actions live in one top HUD; never pin controls
  // to a side rail or the bottom of the game canvas.
  const storyNavigation = root.querySelector<HTMLElement>('.story-navigation');
  if (storyNavigation) {
    topbar.insertBefore(storyNavigation, moreButton);
    const story = storyNavigation.querySelector<HTMLButtonElement>('#story-open');
    const achievements = storyNavigation.querySelector<HTMLButtonElement>('#achievements-open');
    if (story) story.setAttribute('aria-label', t('داستان تصویری'));
    if (achievements) achievements.setAttribute('aria-label', t('دستاوردها'));
  }
  // Reparent original controls instead of cloning them; event handlers stay connected.
  const toolsContainer = root.createElement('section');
  toolsContainer.className = 'dock-tools-container';
  toolsContainer.setAttribute('aria-label', t('ابزارهای زمین و اتاق'));
  const mainSection = root.createElement('section');
  mainSection.className = 'tool-section tool-section-primary';
  const mainHeading = makeToolHeading(root, 'ابزارهای اصلی', 'wrench');
  toolGrid.setAttribute('aria-label', t('ابزارهای اصلی'));
  PRIMARY_EDITOR_TOOLS.forEach((item) => {
    const button = toolGrid.querySelector<HTMLButtonElement>(`[data-tool="${item.id}"]`);
    if (!button) throw new Error(`Missing editor tool: ${item.id}`);
    illustrateToolButton(root, button, item);
  });
  mainSection.append(mainHeading, toolGrid);
  const powerSection = root.createElement('section');
  powerSection.className = 'tool-section tool-section-power';
  const powerHeading = makeToolHeading(root, 'ابزارهای شبکه برق', 'bolt');
  const powerGrid = root.createElement('div');
  powerGrid.className = 'power-tools-grid';
  powerGrid.setAttribute('role', 'group');
  powerGrid.setAttribute('aria-label', t('ابزارهای شبکه برق'));
  POWER_EDITOR_TOOLS.forEach((item) => {
    const selector = item.id === 'power-overlay-toggle'
      ? '#power-overlay-toggle'
      : `[data-tool="${item.id}"]`;
    const button = toolGrid.querySelector<HTMLButtonElement>(selector);
    if (!button) throw new Error(`Missing power tool: ${item.id}`);
    illustrateToolButton(root, button, item);
    powerGrid.append(button);
  });
  powerSection.append(powerHeading, powerGrid);
  const viewControls = root.createElement('div');
  viewControls.className = 'top-view-controls';
  viewControls.setAttribute('role', 'group');
  viewControls.setAttribute('aria-label', t('کنترل بزرگ‌نمایی نقشه'));
  const zoom = root.querySelector<HTMLElement>('.zoom-controls');
  if (zoom) viewControls.append(zoom);
  if (fullscreen) viewControls.append(fullscreen);
  topbar.insertBefore(viewControls, moreButton);
  toolsContainer.append(mainSection, powerSection);
  sheet.append(toolsContainer);

  // Mode tabs mirror the illustrated reference design and remain keyboard accessible.
  const titleBar = sheet.querySelector<HTMLElement>('.sheet-titlebar');
  const modeTabs = root.createElement('nav');
  modeTabs.className = 'sheet-mode-tabs';
  modeTabs.setAttribute('aria-label', t('ابزارهای اصلی'));
  const makeModeTab = (label: string, icon: 'package' | 'wrench') => {
    const tab = root.createElement('button');
    tab.type = 'button';
    tab.className = 'sheet-mode-tab';
    tab.dataset.modeLabel = label;
    tab.setAttribute('aria-controls', 'game-sheet');
    tab.append(createIcon(icon));
    const span = root.createElement('span');
    span.textContent = t(label);
    tab.append(span);
    modeTabs.append(tab);
    return tab;
  };
  const roomsTab = makeModeTab('ساخت اتاق', 'package');
  const toolsTab = makeModeTab('ابزارها', 'wrench');
  titleBar?.insertBefore(modeTabs, closeButton);

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
  // Keep the original nav and listeners intact; move the dock into the header.
  topbar.insertBefore(dock, viewControls);

  // The resource toggle is an ordinary header action, while its long-form
  // details remain in a separate viewport-level popover (no clipped overflow).
  const resourceHeader = resourcePanel.querySelector<HTMLElement>('.resource-panel-header');
  const cycle = resourceHeader?.querySelector<HTMLElement>('.cycle-label');
  const resourceTrigger = root.createElement('div');
  resourceTrigger.className = 'top-resource-control';
  resourceTrigger.setAttribute('role', 'group');
  resourceTrigger.setAttribute('aria-label', t('منابع و چرخهٔ زمانی پناهگاه'));
  const resourcesText = root.createElement('span');
  resourcesText.className = 'top-resources-text';
  resourcesText.textContent = t('منابع');
  resourceToggle.prepend(createIcon('bolt'), resourcesText);
  resourceTrigger.append(resourceToggle);
  if (cycle) resourceTrigger.append(cycle);
  topbar.insertBefore(resourceTrigger, moreButton);

  let current: GameSheet = null;
  let returnFocus: HTMLElement | null = null;
  title.tabIndex = -1;
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

  // Preserve the actual buttons and their listeners while compacting the
  // mobile HUD. Secondary actions move into the existing More sheet rather
  // than getting clipped, duplicated, or creating a third toolbar row.
  const secondaryActions = root.createElement('nav');
  secondaryActions.className = 'mobile-secondary-actions';
  secondaryActions.setAttribute('aria-label', t('امکانات و میانبرهای بیشتر'));
  titleBar?.after(secondaryActions);
  const compactMedia = root.defaultView?.matchMedia?.('(max-width: 1160px)');
  const applyResponsiveNavigation = () => {
    const compact = compactMedia?.matches ?? false;
    if (compact) {
      if (storyNavigation) secondaryActions.append(storyNavigation);
      if (fullscreen) secondaryActions.append(fullscreen);
    } else {
      if (storyNavigation) topbar.insertBefore(storyNavigation, resourceTrigger);
      if (fullscreen) viewControls.append(fullscreen);
    }
  };
  compactMedia?.addEventListener?.('change', applyResponsiveNavigation);
  applyResponsiveNavigation();

  const measureHud = () => {
    // No bottom bar remains; tools, zoom and navigation are all inside topbar.
    root.documentElement.style.setProperty('--hud-dock-occupied', '0px');
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
    const previous = current;
    if (previous === null && next !== null) {
      returnFocus = root.activeElement instanceof HTMLElement ? root.activeElement : null;
    }
    if (next !== null) collapseResources();
    current = next;
    sheet.hidden = next === null;
    scrim.hidden = next === null;
    sheet.dataset.sheet = next ?? '';
    title.textContent = t(next === 'more' ? 'امکانات پناهگاه' : next === 'tools' ? 'ابزارهای زمین و اتاق' : 'ساخت اتاق');
    moreButton.setAttribute('aria-expanded', String(next === 'more'));
    buildButton.setAttribute('aria-expanded', String(next === 'rooms'));
    toolsButton.setAttribute('aria-expanded', String(next === 'tools'));
    roomsTab.setAttribute('aria-pressed', String(next === 'rooms'));
    toolsTab.setAttribute('aria-pressed', String(next === 'tools'));
    dock.dataset.sheetOpen = String(next !== null);
    dock.dataset.activeSheet = next ?? '';
    if (next === 'rooms') filterRooms(activeCategory);
    if (next !== null && next !== previous) title.focus({ preventScroll: true });
    if (next === null && previous !== null) {
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
  };
  const toggleSheet = (requested: Exclude<GameSheet, null>) => showSheet(nextGameSheet(current, requested));
  subscribeLocaleChange(() => {
    categoryButtons.forEach((button, index) => { button.textContent = t(ROOM_CATEGORIES[index].label); });
    dock.querySelectorAll<HTMLElement>('[data-dock-label]').forEach((node) => {
      node.textContent = t(node.dataset.dockLabel ?? '');
    });
    label.textContent = t('اتاق انتخاب‌شده');
    confirm.lastChild!.textContent = t('شروع ساخت');
    [roomsTab, toolsTab].forEach((button) => {
      button.querySelector('span')!.textContent = t(button.dataset.modeLabel ?? '');
    });
    for (const heading of [mainHeading, powerHeading]) {
      heading.lastChild!.textContent = t(heading.dataset.toolSection ?? '');
    }
    toolGrid.setAttribute('aria-label', t('ابزارهای اصلی'));
    powerGrid.setAttribute('aria-label', t('ابزارهای شبکه برق'));
    toolsContainer.setAttribute('aria-label', t('ابزارهای زمین و اتاق'));
    resourceTrigger.setAttribute('aria-label', t('منابع و چرخهٔ زمانی پناهگاه'));
    secondaryActions.setAttribute('aria-label', t('امکانات و میانبرهای بیشتر'));
    resourcesText.textContent = t('منابع');
    storyNavigation?.querySelector<HTMLButtonElement>('#story-open')?.setAttribute('aria-label', t('داستان تصویری'));
    storyNavigation?.querySelector<HTMLButtonElement>('#achievements-open')?.setAttribute('aria-label', t('دستاوردها'));
    const translatedCards: HTMLButtonElement[] = [
      ...Array.from(toolGrid.querySelectorAll<HTMLButtonElement>('.tool-card')),
      ...Array.from(powerGrid.querySelectorAll<HTMLButtonElement>('.tool-card'))
    ];
    translatedCards.forEach((button) => {
      const caption = button.querySelector<HTMLElement>('.ui-control-label');
      const hint = button.querySelector<HTMLElement>('.tool-card-hint');
      if (caption) caption.textContent = t(button.dataset.toolLabel ?? '');
      if (hint) hint.textContent = t(button.dataset.toolHint ?? '');
    });
    showSheet(current);
  });
  buildButton.addEventListener('click', () => toggleSheet('rooms'));
  toolsButton.addEventListener('click', () => toggleSheet('tools'));
  roomsTab.addEventListener('click', () => showSheet('rooms'));
  toolsTab.addEventListener('click', () => showSheet('tools'));
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
    if (event.target instanceof Node &&
      !resourcePanel.contains(event.target) && !resourceToggle.contains(event.target)) collapseResources();
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
