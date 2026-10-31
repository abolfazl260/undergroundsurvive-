import '@fontsource-variable/vazirmatn';
import { installAndroidRuntime } from './platform/androidRuntime';
import { mountSurvivorPanel } from './app/ui/survivorPanel';
import { mountCommandPanel } from './app/ui/commandPanel';
import { mountRadiationPanel } from './app/ui/radiationPanel';
import { mountResearchPanel } from './app/ui/researchPanel';
import { mountWaterPanel } from './app/ui/waterPanel';
import { mountAirPanel, mountAirHud } from './app/ui/airPanel';
import { mountKitchenPanel } from './app/ui/kitchenPanel';
import './kitchen.css';
import './style.css';
import { mountGameDock } from './app/gameDock';
import { confirmDestructiveAction } from './app/confirmDestructiveAction';
import { mountStoryViewer } from './modules/narrative/viewer';
import { setupGameMenu } from './app/gameMenu';
import './audio.css';
import './ui/ui.css';
import './fullscreen.css';
import './gameHud.css';
import './gameMenu.css';
import './achievements.css';
import './bunkerUi.css';
import './resourceSheet.css';
import { createIcon } from './ui/icons';
import { enhanceIcons, setButtonLabel, setPressed } from './ui/components';
import { createGame } from './app/createGame';
import { mountStartupScreen } from './startupScreen';
import { GameScene, type ToolMode } from './app/GameScene';
import { ZOOM } from './app/viewport';
import { AudioManager } from './modules/audio/AudioManager';
import { mountHud } from './app/ui/hud';
import { mountAchievements } from './app/achievementsUi';
import type { BuildableRoomType } from './modules/building/catalog';
import { loadLocalBase, saveLocalBase } from './platform/localSave';
import { BUILD_COSTS, DIG_COST, DEMO_BONUS_COINS, STARTING_COINS } from './modules/economy/pricing';
import { MAX_ROOM_LEVEL } from './modules/building/upgrades';
import type { UpgradeDetails } from './modules/economy/session';
import type { TransactionKind } from './modules/economy/wallet';
import type { GameSnapshot } from './modules/economy/session';
import { mountResourcePanel } from './app/ui/resourcePanel';
import { mountPowerPanel } from './app/ui/powerPanel';
import { formatNumber, loadLocale, localizeGameMessage, mountStaticTranslations, setLocale, subscribeLocaleChange, t } from './i18n';

setLocale(loadLocale());
const startup = mountStartupScreen();
startup.restoring();
mountStaticTranslations(document);
enhanceIcons();
const gameDock = mountGameDock();

const audio = new AudioManager();
const status = document.querySelector<HTMLElement>('#status');
// In compact landscape screens the footer is hidden; keep action feedback readable.
const actionToast = document.createElement('div');
actionToast.id = 'game-action-toast';
actionToast.hidden = true;
actionToast.setAttribute('role', 'status');
actionToast.setAttribute('aria-live', 'polite');
document.querySelector('#app')?.append(actionToast);
let actionToastTimer: number | undefined;
function showActionToast(message: string): void {
  if (!window.matchMedia('(max-height: 500px)').matches) return;
  // Time-based resource ticks should not continually interrupt a player's action.
  if (message.startsWith('چرخهٔ ') || message === 'پژوهش تکمیل شد.') return;
  actionToast.textContent = localizeGameMessage(message);
  actionToast.hidden = false;
  if (actionToastTimer !== undefined) window.clearTimeout(actionToastTimer);
  actionToastTimer = window.setTimeout(() => { actionToast.hidden = true; }, 4000);
}
const renderHud = mountHud(document);
const resourcePanel = mountResourcePanel(document);
const renderPower = mountPowerPanel(document,
  () => scene.activatePowerNetwork(),
  (id,priority) => scene.prioritizePower(id,priority));
const powerOverlayButton = document.querySelector<HTMLButtonElement>('#power-overlay-toggle');
const savedGame = loadLocalBase();
const announceMigrationRewards = savedGame !== null &&
  !(typeof savedGame === 'object' && 'schemaVersion' in savedGame &&
    typeof savedGame.schemaVersion === 'number' && savedGame.schemaVersion >= 14);
const renderAchievements = mountAchievements(document, announceMigrationRewards);
const bonusButton = document.querySelector<HTMLButtonElement>('#demo-bonus');
const historyNode = document.querySelector<HTMLElement>('#transaction-list');
const digButton = document.querySelector<HTMLButtonElement>('[data-tool="dig"]');
const formatCoins = formatNumber;
const kindTitles: Record<TransactionKind, string> = {
  'starting-balance': 'سرمایهٔ اولیه',
  build: 'ساخت اتاق',
  dig: 'حفاری',
  floor: 'بازکردن طبقه',
  upgrade: 'ارتقای اتاق',
  research: 'پژوهش',
  radiation: 'کاهش تشعشع',
  air: 'تعمیر تهویه',
  'demo-bonus': 'کمک‌هزینهٔ آزمایشی',
  'achievement-reward': 'پاداش دستاورد'
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
  upgradePanel.classList.toggle('has-selection', details !== null);
  if (!details) {
    if (upgradeTitle) upgradeTitle.textContent = t('یک اتاق را برای ارتقا انتخاب کنید');
    if (upgradeEffect) upgradeEffect.textContent = t('برای دیدن ظرفیت و هزینه، روی اتاق بزنید.');
    if (upgradeCost) upgradeCost.textContent = '';
    if (confirmUpgrade) {
      confirmUpgrade.textContent = t('ابتدا اتاق را انتخاب کنید');
      confirmUpgrade.disabled = true;
    }
    return;
  }
  if (upgradeTitle) upgradeTitle.textContent = details.label + ' · ' +
    t('سطح {level} از {max}', { level: formatCoins(details.level), max: formatCoins(MAX_ROOM_LEVEL) });
  if (upgradeEffect) upgradeEffect.textContent = t(details.current.label) + ': ' +
    formatCoins(details.current.value) + ' ' + t(details.current.unit) +
    (details.next ? ' ← ' + formatCoins(details.next.value) + ' ' + t(details.next.unit) : '');
  if (upgradeCost) upgradeCost.textContent = details.cost === null
    ? (details.blockedReason ? t(details.blockedReason) : t('این اتاق به بالاترین سطح رسیده است.'))
    : t('هزینهٔ سطح بعد: {value} سکه', { value: formatCoins(details.cost) }) +
      (latestBalance < details.cost ? ' — ' + t('موجودی کافی نیست.') : '');
  if (confirmUpgrade) {
    confirmUpgrade.disabled = details.cost === null || latestBalance < details.cost;
    confirmUpgrade.textContent = details.cost === null ? (details.blockedReason ? t('ارتقا در دسترس نیست') : t('حداکثر سطح')) :
      t('تأیید ارتقا · {value} سکه', { value: formatCoins(details.cost) });
  }
}

roomButtons.forEach((button) => {
  const type = button.dataset.room as BuildableRoomType;
  const price = document.createElement('span');
  price.className = 'room-cost';
  const amount = document.createElement('span');
  amount.textContent = formatCoins(BUILD_COSTS[type]);
  price.append(createIcon('coin'), amount);
  price.setAttribute('aria-label', t('هزینه: {value} سکه', { value: formatCoins(BUILD_COSTS[type]) }));
  button.append(price);
});
function renderDigLabel(): void {
  if (digButton) setButtonLabel(digButton, t('حفاری') + ' · ' + formatCoins(DIG_COST) + ' ' + t('سکه'), 'pickaxe');
}
renderDigLabel();

let activeRoom: BuildableRoomType = 'habitat';
let activeTool: ToolMode = 'build';
let lastSnapshot: GameSnapshot | null = null;
let lastSaved = false;
let lastMessage = '';

function renderSceneUi(snapshot: GameSnapshot, saved: boolean, message: string): void {
  latestBalance = snapshot.wallet.balance;
  renderUpgradePanel();
  renderHud(snapshot, saved);
  renderAchievements(snapshot);
  resourcePanel.render(snapshot);
  const powerView = scene.powerView();
  renderPower(snapshot,powerView.allocation);
  if(powerOverlayButton)powerOverlayButton.setAttribute('aria-pressed',String(powerView.enabled));
  renderWater(snapshot);
  renderAir(snapshot);
  renderAirHud(snapshot);
  renderKitchen(snapshot);
  renderResearch(snapshot);
  renderRadiation(snapshot);
  renderCommand(snapshot);
  renderSurvivors(snapshot);
  if (bonusButton) {
    bonusButton.disabled = snapshot.demoBonusClaimed;
    setButtonLabel(bonusButton, snapshot.demoBonusClaimed
      ? t('کمک‌هزینهٔ آزمایشی دریافت شده')
      : t('دریافت {value} سکهٔ آزمایشی (یک‌بار)', { value: formatCoins(DEMO_BONUS_COINS) }), 'gift');
  }
  if (historyNode) {
    historyNode.replaceChildren();
    for (const txn of [...snapshot.wallet.transactions].reverse().slice(0, 6)) {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = t(kindTitles[txn.kind]);
      const amount = document.createElement('b');
      amount.className = txn.delta < 0 ? 'spent' : 'earned';
      amount.textContent = (txn.delta > 0 ? '+' : '−') + formatCoins(Math.abs(txn.delta));
      item.append(label, amount);
      historyNode.append(item);
    }
  }
  if (status) status.textContent = localizeGameMessage(saved ? message : message + ' (ذخیرهٔ محلی در دسترس نیست)');
}
const renderCommand = mountCommandPanel(document.querySelector<HTMLElement>('#command-panel')!,()=>scene.commandPopulation(),()=>scene.upgradeCommandCenter());
const renderRadiation = mountRadiationPanel(document.querySelector<HTMLElement>('#radiation-panel')!,()=>{scene.toggleRadiation();if(lastSnapshot)renderRadiation(lastSnapshot);gameDock.showSheet(null);},()=>scene.radiationView(),()=>scene.cleanupRadiation(),()=>scene.filterRadiation());
const renderSurvivors=mountSurvivorPanel(document.querySelector<HTMLElement>('#survivor-panel')!,(id,room)=>scene.assignSurvivor(id,room),id=>scene.releaseSurvivor(id));
const renderResearch = mountResearchPanel(document.querySelector<HTMLElement>('#research-panel')!,id=>scene.startResearch(id));
const renderWater = mountWaterPanel(document.querySelector<HTMLElement>('#water-panel')!, () => scene.collectWater(), id => scene.toggleWater(id), (a, b) => scene.toggleLifeSupportLink(a, b));
const renderAir = mountAirPanel(document.querySelector<HTMLElement>('#air-panel')!, id => scene.toggleVent(id), id => scene.repairVent(id));
const renderAirHud = mountAirHud(document);
const renderKitchen = mountKitchenPanel(document.querySelector<HTMLElement>('#kitchen-panel')!,
  (room, recipe) => scene.startCooking(room, recipe), room => scene.toggleCooking(room), room => scene.cancelCooking(room));
const scene = new GameScene((snapshot, message) => {
  showActionToast(message);
  const saved = saveLocalBase(snapshot);
  lastSnapshot = snapshot;
  lastSaved = saved;
  lastMessage = message;
  renderSceneUi(snapshot, saved, message);
}, savedGame, (zoom) => {
  if (zoomLevel) zoomLevel.textContent = Math.round(zoom * 100) + '%';
  if (zoomIn) zoomIn.disabled = zoom >= ZOOM.max - 0.001;
  if (zoomOut) zoomOut.disabled = zoom <= ZOOM.min + 0.001;
  if (zoomReset) zoomReset.disabled = Math.abs(zoom - ZOOM.initial) < 0.001;
}, (cue) => audio.play(cue), () => audio.activate(), (details) => {
  upgradeSelection = details;
  renderUpgradePanel();
}, (seconds) => resourcePanel.renderCountdown(seconds),
(progress) => startup.assets(progress),
(key) => startup.assetUnavailable(key),
() => startup.worldReady(),
() => startup.finish(openStartMenu));

// Defer opening the initial modal until the game and loader finish.
const openStartMenu = setupGameMenu(scene, savedGame !== null, audio, renderAudioControls);
startup.assets(0);
createGame(scene);
function renderAudioControls(): void {
  const settings = audio.getSettings();
  if (audioMute) {
    audioMute.setAttribute('aria-pressed', String(settings.muted));
    audioMute.textContent = t(settings.muted ? 'فعال‌کردن صدا' : 'قطع همهٔ صداها');
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
      ? t('پخش موسیقی پس از اولین لمس یا کلیک شروع می‌شود. تنظیمات روی همین دستگاه ذخیره می‌شوند.')
      : t('این مرورگر از Web Audio پشتیبانی نمی‌کند؛ بازی بدون صدا قابل استفاده است.');
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
  const selected = document.querySelector<HTMLElement>('#selected-room-summary');
  if (selected) {
    const title = Array.from(roomButtons).find((button) => button.dataset.room === activeRoom)
      ?.querySelector<HTMLElement>('strong')?.textContent ?? t('انتخاب اتاق');
    selected.textContent = title + ' · ' + formatCoins(BUILD_COSTS[activeRoom]) + ' ' + t('سکه');
  }
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
    // Picking an illustrated card updates the preview. The explicit action below
    // closes the gallery and makes room placement available on the world.
  });
});

document.querySelector<HTMLButtonElement>('#confirm-room-placement')?.addEventListener('click', () => {
  scene.selectRoom(activeRoom);
  gameDock.showSheet(null);
});

toolButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tool = button.dataset.tool as ToolMode | undefined;
    if (!tool) return;
    if (tool === 'build') {
      const alreadyBuilding = activeTool === 'build';
      activeTool = 'build';
      scene.selectRoom(activeRoom);
      if (alreadyBuilding) gameDock.toggleSheet('rooms');
      else gameDock.showSheet('rooms');
    } else {
      activeTool = tool;
      scene.setTool(tool);
      gameDock.showSheet(null);
    }
    updateSelectedButtons();
  });
});

powerOverlayButton?.addEventListener('click', () => {
  scene.togglePowerOverlay();
  const view = scene.powerView();
  powerOverlayButton.setAttribute('aria-pressed',String(view.enabled));
});
confirmUpgrade?.addEventListener('click', () => scene.upgradeSelected());
bonusButton?.addEventListener('click', () => scene.claimDemoBonus());
document.querySelector<HTMLButtonElement>('#reset-layout')?.addEventListener('click', async () => {
  const persian = document.documentElement.lang !== 'en';
  const accepted = await confirmDestructiveAction({
    title: persian ? 'بازنشانی تمام پیشرفت؟' : 'Reset all progress?',
    description: persian
      ? 'تمام اتاق‌ها، منابع و پیشرفت ذخیره‌شده به حالت اولیه بازمی‌گردند. این عملیات قابل بازگشت نیست.'
      : 'All rooms, resources and saved progress will return to the starting state. This cannot be undone.',
    confirmLabel: persian ? 'بازنشانی کامل' : 'Reset everything',
    cancelLabel: persian ? 'انصراف' : 'Cancel'
  });
  if (!accepted) return;
  scene.resetLayout();
  gameDock.showSheet(null);
});

updateSelectedButtons();

const storyButton = document.querySelector<HTMLButtonElement>('#story-open');
if (storyButton) mountStoryViewer(storyButton);

installAndroidRuntime({
  getSheet: gameDock.getSheet,
  closeSheet: () => gameDock.showSheet(null),
  save: () => { if (lastSnapshot) saveLocalBase(lastSnapshot); }
});

subscribeLocaleChange(() => {
  if (lastSnapshot) renderSceneUi(lastSnapshot, lastSaved, lastMessage);
  roomButtons.forEach((button) => {
    const type = button.dataset.room as BuildableRoomType;
    const amount = button.querySelector<HTMLElement>('.room-cost span');
    const cost = button.querySelector<HTMLElement>('.room-cost');
    if (amount) amount.textContent = formatCoins(BUILD_COSTS[type]);
    if (cost) cost.setAttribute('aria-label', t('هزینه: {value} سکه', { value: formatCoins(BUILD_COSTS[type]) }));
  });
  renderDigLabel();
  updateSelectedButtons();
  renderAudioControls();
  scene.refreshLanguage();
});
