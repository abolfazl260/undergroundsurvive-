import './style.css';
import { setupGameMenu } from './app/gameMenu';
import { createGame } from './app/createGame';
import { GameScene, type ToolMode } from './app/GameScene';
import { ZOOM } from './app/viewport';
import { WORLD } from './modules/world/grid';
import type { BuildableRoomType } from './modules/building/catalog';
import { loadLocalBase, saveLocalBase } from './platform/localSave';
import { BUILD_COSTS, DIG_COST, DEMO_BONUS_COINS, getFloorCost } from './modules/economy/pricing';
import type { TransactionKind } from './modules/economy/wallet';

const status = document.querySelector<HTMLElement>('#status');
const roomCount = document.querySelector<HTMLElement>('#room-count');
const floorStatus = document.querySelector<HTMLElement>('#floor-status');
const terrainCount = document.querySelector<HTMLElement>('#terrain-count');
const unlockButton = document.querySelector<HTMLButtonElement>('#unlock-floor');
const balanceNode = document.querySelector<HTMLElement>('#coin-balance');
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
const zoomIn = document.querySelector<HTMLButtonElement>('#zoom-in');
const zoomOut = document.querySelector<HTMLButtonElement>('#zoom-out');
const zoomReset = document.querySelector<HTMLButtonElement>('#zoom-reset');
const zoomLevel = document.querySelector<HTMLOutputElement>('#zoom-level');
const roomButtons = document.querySelectorAll<HTMLButtonElement>('[data-room]');
const toolButtons = document.querySelectorAll<HTMLButtonElement>('[data-tool]');

roomButtons.forEach((button) => {
  const type = button.dataset.room as BuildableRoomType;
  const price = document.createElement('span');
  price.className = 'room-cost';
  price.textContent = formatCoins(BUILD_COSTS[type]) + ' ●';
  price.setAttribute('aria-label', 'هزینه: ' + formatCoins(BUILD_COSTS[type]) + ' سکه');
  button.append(price);
});
if (digButton) digButton.textContent = '⛏ حفاری · ' + formatCoins(DIG_COST) + ' سکه';

let activeRoom: BuildableRoomType = 'habitat';
let activeTool: ToolMode = 'build';

const savedGame = loadLocalBase();
const scene = new GameScene((snapshot, message) => {
  const saved = saveLocalBase(snapshot);
  if (balanceNode) balanceNode.textContent = formatCoins(snapshot.wallet.balance);
  if (bonusButton) {
    bonusButton.disabled = snapshot.demoBonusClaimed;
    bonusButton.textContent = snapshot.demoBonusClaimed
      ? 'کمک‌هزینهٔ آزمایشی دریافت شده'
      : 'دریافت ' + formatCoins(DEMO_BONUS_COINS) + ' سکهٔ آزمایشی (یک‌بار)';
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
  if (roomCount) roomCount.textContent = 'اتاق‌ها: ' + snapshot.base.rooms.length;
  if (floorStatus) floorStatus.textContent = 'طبقات بالا: ' + snapshot.base.terrain.highestFloor + ' از ' + WORLD.maxY;
  if (terrainCount) terrainCount.textContent = 'خانه‌های حفاری‌شده: ' + snapshot.base.terrain.excavated.length;
  if (unlockButton) {
    const maxed = snapshot.base.terrain.highestFloor >= WORLD.maxY;
    unlockButton.disabled = maxed;
    unlockButton.textContent = maxed
      ? 'تمام طبقات باز شده‌اند'
      : '＋ طبقهٔ +' + (snapshot.base.terrain.highestFloor + 1) + ' · ' +
        formatCoins(getFloorCost(snapshot.base.terrain.highestFloor)) + ' سکه';
  }
}, savedGame, (zoom) => {
  if (zoomLevel) zoomLevel.textContent = Math.round(zoom * 100) + '%';
  if (zoomIn) zoomIn.disabled = zoom >= ZOOM.max - 0.001;
  if (zoomOut) zoomOut.disabled = zoom <= ZOOM.min + 0.001;
  if (zoomReset) zoomReset.disabled = Math.abs(zoom - ZOOM.initial) < 0.001;
});

createGame(scene);
setupGameMenu(scene, savedGame !== null);
zoomIn?.addEventListener('click', () => scene.zoomBy(ZOOM.step));
zoomOut?.addEventListener('click', () => scene.zoomBy(-ZOOM.step));
zoomReset?.addEventListener('click', () => scene.resetZoom());

function updateSelectedButtons(): void {
  roomButtons.forEach((button) => {
    const active = activeTool === 'build' && button.dataset.room === activeRoom;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  toolButtons.forEach((button) => {
    const active = button.dataset.tool === activeTool;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
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

unlockButton?.addEventListener('click', () => scene.unlockFloor());
bonusButton?.addEventListener('click', () => scene.claimDemoBonus());
document.querySelector<HTMLButtonElement>('#reset-layout')?.addEventListener('click', () => {
  scene.resetLayout();
});

