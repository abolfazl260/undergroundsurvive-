import './style.css';
import { mountStoryViewer } from './modules/narrative/viewer';
import { setupGameMenu } from './app/gameMenu';
import './audio.css';
import './ui/ui.css';
import { createIcon } from './ui/icons';
import { enhanceIcons, setButtonLabel, setPressed } from './ui/components';
import { createGame } from './app/createGame';
import { GameScene, type ToolMode } from './app/GameScene';
import { ZOOM } from './app/viewport';
import { AudioManager } from './modules/audio/AudioManager';
import { mountHud } from './app/ui/hud';
import { WORLD } from './modules/world/grid';
import type { BuildableRoomType } from './modules/building/catalog';
import { loadLocalBase, saveLocalBase } from './platform/localSave';
import { BUILD_COSTS, DIG_COST, DEMO_BONUS_COINS, STARTING_COINS, getFloorCost } from './modules/economy/pricing';
import { MAX_ROOM_LEVEL } from './modules/building/upgrades';
import type { UpgradeDetails } from './modules/economy/session';
import type { TransactionKind } from './modules/economy/wallet';
import { mountResourcePanel } from './app/ui/resourcePanel';

enhanceIcons();

const audio = new AudioManager();
const status = document.querySelector<HTMLElement>('#status');
const unlockButton = document.querySelector<HTMLButtonElement>('#unlock-floor');
const renderHud = mountHud(document);
const resourcePanel = mountResourcePanel(document);
const bonusButton = document.querySelector<HTMLButtonElement>('#demo-bonus');
const historyNode = document.querySelector<HTMLElement>('#transaction-list');
const digButton = document.querySelector<HTMLButtonElement>('[data-tool="dig"]');
const numberFormat = new Intl.NumberFormat('fa-IR');
const formatCoins = (amount: number): string => numberFormat.format(amount);
const kindTitles: Record<TransactionKind, string> = {
  'starting-balance': 'سرمایهٔ اولیه',
  build: 'ساخت اتاق',
  dig: 'حفاری',
  floor: 'بازکردن طبقه',
  upgrade: 'ارتقای اتاق',
  'demo-bonus': 'کمک‌هزینهٔ آزمایشی'
};
const audioMute = document.querySelector<HTMLButtonElement>('#audio-mute');
const musicEnabled = document.querySelector<HTMLInputElement>('#music-enabled');
const effectsEnabled = document.querySelector<HTMLInputElement>('#effects-enabled');
const musicVolume = document.querySelector<HTMLInputElement>('#music-volume');
const effectsVolume = document.querySelector<HTMLInputElement>('#effects-volume');
const musicVolumeValue = document.querySelector<HTMLOutputElement>('#music-volume-value');
const effectsVolumeValue = document.querySelector<HTMLOutputElement>('#effects-volume-value');
const audioPreview = document.querySelector<HTMLButtonElement>('#audio-preview');
const audioHint = document.querySelector<HTMLElement>('#audio-hint');
const zoomIn = document.querySelector<HTMLButtonElement>('#zoom-in');
const zoomOut = document.querySelector<HTMLButtonElement>('#zoom-out');
const zoomReset = document.querySelector<HTMLButtonElement>('#zoom-reset');
const zoomLevel = document.querySelector<HTMLOutputElement>('#zoom-level');
const roomButtons = document.querySelectorAll<HTMLButtonElement>('[data-room]');
const toolButtons = document.querySelectorAll<HTMLButtonElement>('[data-tool]');
const upgradePanel = document.querySelector<HTMLElement>('#upgrade-panel');
const upgradeTitle = document.querySelector<HTMLElement>('#upgrade-title');
const upgradeEffect = document.querySelector<HTMLElement>('#upgrade-effect');
const upgradeCost = document.querySelector<HTMLElement>('#upgrade-cost');
const confirmUpgrade = document.querySelector<HTMLButtonElement>('#confirm-upgrade');
let upgradeSelection: UpgradeDetails | null = null;
let latestBalance = STARTING_COINS;

function renderUpgradePanel(): void {
  if (!upgradePanel) return;
  upgradePanel.hidden = activeTool !== 'upgrade';
  if (activeTool !== 'upgrade') return;
  const details = upgradeSelection;
  if (!details) {
    if (upgradeTitle) upgradeTitle.textContent = 'یک اتاق را برای ارتقا انتخاب کنید';
    if (upgradeEffect) upgradeEffect.textContent = 'برای دیدن ظرفیت و هزینه، روی اتاق بزنید.';
    if (upgradeCost) upgradeCost.textContent = '';
    if (confirmUpgrade) {
      confirmUpgrade.textContent = 'ابتدا اتاق را انتخاب کنید';
      confirmUpgrade.disabled = true;
    }
    return;
  }
  if (upgradeTitle) upgradeTitle.textContent = details.label + ' · سطح ' +
    formatCoins(details.level) + ' از ' + formatCoins(MAX_ROOM_LEVEL);
  if (upgradeEffect) upgradeEffect.textContent = details.current.label + ': ' +
    formatCoins(details.current.value) + ' ' + details.current.unit +
    (details.next ? ' ← ' + formatCoins(details.next.value) + ' ' + details.next.unit : '');
  if (upgradeCost) upgradeCost.textContent = details.cost === null
    ? 'این اتاق به بالاترین سطح رسیده است.'
    : 'هزینهٔ سطح بعد: ' + formatCoins(details.cost) + ' سکه' +
      (latestBalance < details.cost ? ' — موجودی کافی نیست.' : '');
  if (confirmUpgrade) {
    confirmUpgrade.disabled = details.cost === null || latestBalance < details.cost;
    confirmUpgrade.textContent = details.cost === null ? 'حداکثر سطح' :
      'تأیید ارتقا · ' + formatCoins(details.cost) + ' سکه';
  }
}


roomButtons.forEach((button) => {
  const type = button.dataset.room as BuildableRoomType;
  const price = document.createElement('span');
  price.className = 'room-cost';
  const amount = document.createElement('span');
  amount.textContent = formatCoins(BUILD_COSTS[type]);
  price.append(createIcon('coin'), amount);
  price.setAttribute('aria-label', 'هزینه: ' + formatCoins(BUILD_COSTS[type]) + ' سکه');
  button.append(price);
});
if (digButton) setButtonLabel(digButton, 'حفاری · ' + formatCoins(DIG_COST) + ' سکه', 'pickaxe');

let activeRoom: BuildableRoomType = 'habitat';
let activeTool: ToolMode = 'build';

const savedGame = loadLocalBase();
const scene = new GameScene((snapshot, message) => {
  const saved = saveLocalBase(snapshot);
  latestBalance = snapshot.wallet.balance;
  renderUpgradePanel();
  renderHud(snapshot, saved);
  resourcePanel.render(snapshot);
  if (bonusButton) {
    bonusButton.disabled = snapshot.demoBonusClaimed;
    setButtonLabel(bonusButton, snapshot.demoBonusClaimed
      ? 'کمک‌هزینهٔ آزمایشی دریافت شده'
      : 'دریافت ' + formatCoins(DEMO_BONUS_COINS) + ' سکهٔ آزمایشی (یک‌بار)', 'gift');
  }
  if (historyNode) {
    historyNode.replaceChildren();
    for (const txn of [...snapshot.wallet.transactions].reverse().slice(0, 6)) {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = kindTitles[txn.kind];
      const amount = document.createElement('b');
      amount.className = txn.delta < 0 ? 'spent' : 'earned';
      amount.textContent = (txn.delta > 0 ? '+' : '−') + formatCoins(Math.abs(txn.delta));
      item.append(label, amount);
      historyNode.append(item);
    }
  }
  if (status) status.textContent = saved ? message : message + ' (ذخیرهٔ محلی در دسترس نیست)';
  if (unlockButton) {
    const maxed = snapshot.base.terrain.highestFloor >= WORLD.maxY;
    unlockButton.disabled = maxed;
    setButtonLabel(unlockButton, maxed
      ? 'تمام طبقات باز شده‌اند'
      : 'طبقهٔ +' + (snapshot.base.terrain.highestFloor + 1) + ' · ' +
        formatCoins(getFloorCost(snapshot.base.terrain.highestFloor)) + ' سکه', 'layers');
  }
}, savedGame, (zoom) => {
  if (zoomLevel) zoomLevel.textContent = Math.round(zoom * 100) + '%';
  if (zoomIn) zoomIn.disabled = zoom >= ZOOM.max - 0.001;
  if (zoomOut) zoomOut.disabled = zoom <= ZOOM.min + 0.001;
  if (zoomReset) zoomReset.disabled = Math.abs(zoom - ZOOM.initial) < 0.001;
}, (cue) => audio.play(cue), () => audio.activate(), (details) => {
  upgradeSelection = details;
  renderUpgradePanel();
}, (seconds) => resourcePanel.renderCountdown(seconds));

createGame(scene);
setupGameMenu(scene, savedGame !== null, audio, renderAudioControls);
function renderAudioControls(): void {
  const settings = audio.getSettings();
  if (audioMute) {
    audioMute.setAttribute('aria-pressed', String(settings.muted));
    audioMute.textContent = settings.muted ? 'فعال‌کردن صدا' : 'قطع همهٔ صداها';
  }
  if (musicEnabled) musicEnabled.checked = settings.musicEnabled;
  if (effectsEnabled) effectsEnabled.checked = settings.effectsEnabled;
  if (musicVolume) {
    musicVolume.value = String(Math.round(settings.musicVolume * 100));
    musicVolume.disabled = !settings.musicEnabled;
  }
  if (effectsVolume) {
    effectsVolume.value = String(Math.round(settings.effectsVolume * 100));
    effectsVolume.disabled = !settings.effectsEnabled;
  }
  if (musicVolumeValue) musicVolumeValue.textContent = Math.round(settings.musicVolume * 100) + '%';
  if (effectsVolumeValue) effectsVolumeValue.textContent = Math.round(settings.effectsVolume * 100) + '%';
  if (audioPreview) audioPreview.disabled = !audio.supported || settings.muted || !settings.effectsEnabled;
  if (audioHint) {
    audioHint.textContent = audio.supported
      ? 'پخش موسیقی پس از اولین لمس یا کلیک شروع می‌شود. تنظیمات روی همین دستگاه ذخیره می‌شوند.'
      : 'این مرورگر از Web Audio پشتیبانی نمی‌کند؛ بازی بدون صدا قابل استفاده است.';
  }
}

audioMute?.addEventListener('click', () => {
  audio.setSettings({ muted: !audio.getSettings().muted });
  audio.activate();
  renderAudioControls();
});
musicEnabled?.addEventListener('change', () => {
  audio.setSettings({ musicEnabled: musicEnabled.checked });
  audio.activate();
  renderAudioControls();
});
effectsEnabled?.addEventListener('change', () => {
  audio.setSettings({ effectsEnabled: effectsEnabled.checked });
  audio.activate();
  renderAudioControls();
});
musicVolume?.addEventListener('input', () => {
  audio.setSettings({ musicVolume: Number(musicVolume.value) / 100 });
  audio.activate();
  renderAudioControls();
});
effectsVolume?.addEventListener('input', () => {
  audio.setSettings({ effectsVolume: Number(effectsVolume.value) / 100 });
  audio.activate();
  renderAudioControls();
});
audioPreview?.addEventListener('click', () => audio.play('upgrade'));
window.addEventListener('beforeunload', () => audio.dispose());
renderAudioControls();

zoomIn?.addEventListener('click', () => scene.zoomBy(ZOOM.step));
zoomOut?.addEventListener('click', () => scene.zoomBy(-ZOOM.step));
zoomReset?.addEventListener('click', () => scene.resetZoom());

function updateSelectedButtons(): void {
  roomButtons.forEach((button) => {
    const active = activeTool === 'build' && button.dataset.room === activeRoom;
    setPressed(button, active);
  });
  toolButtons.forEach((button) => {
    const active = button.dataset.tool === activeTool;
    setPressed(button, active);
  });
  renderUpgradePanel();
}

roomButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const type = button.dataset.room as BuildableRoomType | undefined;
    if (!type) return;
    activeRoom = type;
    activeTool = 'build';
    scene.selectRoom(type);
    updateSelectedButtons();
  });
});

toolButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tool = button.dataset.tool as ToolMode | undefined;
    if (!tool) return;
    activeTool = tool;
    scene.setTool(tool);
    updateSelectedButtons();
  });
});

confirmUpgrade?.addEventListener('click', () => scene.upgradeSelected());
unlockButton?.addEventListener('click', () => scene.unlockFloor());
bonusButton?.addEventListener('click', () => scene.claimDemoBonus());
document.querySelector<HTMLButtonElement>('#reset-layout')?.addEventListener('click', () => {
  scene.resetLayout();
});

const storyButton = document.querySelector<HTMLButtonElement>('#story-open');
if (storyButton) mountStoryViewer(storyButton);
