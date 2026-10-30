import './style.css';
import { createGame } from './app/createGame';
import { GameScene } from './app/GameScene';
import type { BuildableRoomType } from './modules/building/catalog';

const status = document.querySelector<HTMLElement>('#status');
const roomCount = document.querySelector<HTMLElement>('#room-count');

const scene = new GameScene((count, message) => {
  if (status) status.textContent = message;
  if (roomCount) roomCount.textContent = 'اتاق‌ها: ' + count;
});

createGame(scene);

const buttons = document.querySelectorAll<HTMLButtonElement>('[data-room]');
buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const type = button.dataset.room as BuildableRoomType | undefined;
    if (!type) return;
    scene.selectRoom(type);
    buttons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    if (status) status.textContent = 'مکان ساخت اتاق را روی نقشه انتخاب کنید.';
  });
});

document.querySelector<HTMLButtonElement>('#reset-layout')?.addEventListener('click', () => {
  scene.resetLayout();
});

