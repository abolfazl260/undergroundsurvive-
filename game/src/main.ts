import './style.css';
import { createGame } from './app/createGame';
import { GameScene, type ToolMode } from './app/GameScene';
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

roomButtonsSetup();
function roomButtonsSetup(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-room]').forEach((button) => {
    const type = button.dataset.room as BuildableRoomType;
    const price = document.createElement('span');
    price.className = 'room-cost';
    price.textContent = formatCoins(BUILD_COSTS[type]) + ' ●';
    price.setAttribute('aria-label', 'هزینه: ' + formatCoins(BUILD_COSTS[type]) + ' سکه');
    button.append(price);
  });
}
if (digButton) digButton.textContent = '⛏ حفاری · ' + formatCoins(DIG_COST) + ' سکه';
const roomButtons = document.querySelectorAll<HTMLButtonElement>('[data-room]');
const toolButtons = document.querySelectorAll<HTMLButtonElement>('[data-tool]');

let activeRoom: BuildableRoomType = 'habitat';
let activeTool: ToolMode = 'build';

const scene = new GameScene((snapshot, message) => {
  const saved = saveLocalBase(snapshot);
  const balance = snapshot.wallet.balance;
  if (balanceNode) balanceNode.textContent = formatCoins(balance);
  if (bonusButton) {
    bonusButton.disabled = snapshot.demoBonusClaimed;
    bonusButton.textContent = snapshot.demoBonusClaimed
      ? 'کمک‌هزینهٔ آزمایشی دریافت شده'
      : 'دریافت ' + formatCoins(DEMO_BONUS_COINS) + ' سکهٔ آزمایشی (یک‌بار)';
  }
  if (historyNode) {
    historyNode.replaceChildren();
    for (const t of [...snapshot.wallet.transactions].reverse().slice(0, 6)) {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = kindTitles[t.kind];
      const amount = document.createElement('b');
      amount.className = t.delta < 0 ? 'spent' : 'earned';
      amount.textContent = (t.delta > 0 ? '+' : '−') + formatCoins(Math.abs(t.delta));
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
}, loadLocalBase());

createGame(scene);

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

