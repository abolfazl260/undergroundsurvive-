import './style.css';
import { createGame } from './app/createGame';
import { GameScene, type ToolMode } from './app/GameScene';
import { ZOOM } from './app/viewport';
import { WORLD } from './modules/world/grid';
import type { BuildableRoomType } from './modules/building/catalog';
import { loadLocalBase, saveLocalBase } from './platform/localSave';

const status = document.querySelector<HTMLElement>('#status');
const roomCount = document.querySelector<HTMLElement>('#room-count');
const floorStatus = document.querySelector<HTMLElement>('#floor-status');
const terrainCount = document.querySelector<HTMLElement>('#terrain-count');
const unlockButton = document.querySelector<HTMLButtonElement>('#unlock-floor');
const zoomIn = document.querySelector<HTMLButtonElement>('#zoom-in');
const zoomOut = document.querySelector<HTMLButtonElement>('#zoom-out');
const zoomReset = document.querySelector<HTMLButtonElement>('#zoom-reset');
const zoomLevel = document.querySelector<HTMLOutputElement>('#zoom-level');
const roomButtons = document.querySelectorAll<HTMLButtonElement>('[data-room]');
const toolButtons = document.querySelectorAll<HTMLButtonElement>('[data-tool]');

let activeRoom: BuildableRoomType = 'habitat';
let activeTool: ToolMode = 'build';

const scene = new GameScene((snapshot, message) => {
  const saved = saveLocalBase(snapshot);
  if (status) status.textContent = saved ? message : message + ' (ذخیرهٔ محلی در دسترس نیست)';
  if (roomCount) roomCount.textContent = 'اتاق‌ها: ' + snapshot.rooms.length;
  if (floorStatus) floorStatus.textContent = 'طبقات بالا: ' + snapshot.terrain.highestFloor + ' از ' + WORLD.maxY;
  if (terrainCount) terrainCount.textContent = 'خانه‌های حفاری‌شده: ' + snapshot.terrain.excavated.length;
  if (unlockButton) {
    const maxed = snapshot.terrain.highestFloor >= WORLD.maxY;
    unlockButton.disabled = maxed;
    unlockButton.textContent = maxed
      ? 'تمام طبقات باز شده‌اند'
      : '＋ بازکردن طبقهٔ +' + (snapshot.terrain.highestFloor + 1);
  }
}, loadLocalBase(), (zoom) => {
  if (zoomLevel) zoomLevel.textContent = Math.round(zoom * 100) + '%';
  if (zoomIn) zoomIn.disabled = zoom >= ZOOM.max - 0.001;
  if (zoomOut) zoomOut.disabled = zoom <= ZOOM.min + 0.001;
  if (zoomReset) zoomReset.disabled = Math.abs(zoom - ZOOM.initial) < 0.001;
});

createGame(scene);
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
document.querySelector<HTMLButtonElement>('#reset-layout')?.addEventListener('click', () => {
  scene.resetLayout();
});

