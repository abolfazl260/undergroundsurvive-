import type { GameSnapshot } from '../../modules/economy/session';
import { WORLD } from '../../modules/world/grid';

const formatter = new Intl.NumberFormat('fa-IR');

export interface HudView {
  balance: string;
  lastChange: string;
  changeKind: 'earned' | 'spent' | 'none';
  rooms: string;
  floors: string;
  excavated: string;
  saveLabel: string;
  saveState: 'saved' | 'failed';
}

/** A display-only projection of the authoritative game snapshot (no game state here). */
export function toHudView(snapshot: GameSnapshot, saved: boolean): HudView {
  const latest = snapshot.wallet.transactions.at(-1);
  const showChange = latest !== undefined && latest.kind !== 'starting-balance';
  const changeKind = !showChange ? 'none' : latest.delta > 0 ? 'earned' : 'spent';
  return {
    balance: formatter.format(snapshot.wallet.balance),
    lastChange: showChange
      ? (latest.delta > 0 ? '+' : '−') + formatter.format(Math.abs(latest.delta))
      : '—',
    changeKind,
    rooms: formatter.format(snapshot.base.rooms.length),
    floors: formatter.format(snapshot.base.terrain.highestFloor) + ' / ' + formatter.format(WORLD.maxY),
    excavated: formatter.format(snapshot.base.terrain.excavated.length),
    saveLabel: saved ? 'ذخیره روی دستگاه' : 'ذخیره نشد',
    saveState: saved ? 'saved' : 'failed'
  };
}

/** Subscribes the HTML HUD to the same snapshot used by the game and economy. */
export function mountHud(root: ParentNode): (snapshot: GameSnapshot, saved: boolean) => void {
  const required = (selector: string): HTMLElement => {
    const node = root.querySelector<HTMLElement>(selector);
    if (!node) throw new Error('Missing HUD element: ' + selector);
    return node;
  };
  const balance = required('#coin-balance');
  const change = required('#hud-coin-change');
  const rooms = required('#hud-rooms');
  const floors = required('#hud-floors');
  const excavated = required('#hud-excavated');
  const saveStatus = required('#hud-save-status');

  return (snapshot, saved) => {
    const view = toHudView(snapshot, saved);
    balance.textContent = view.balance;
    change.textContent = view.lastChange;
    change.dataset.kind = view.changeKind;
    change.setAttribute('aria-label', view.changeKind === 'none'
      ? 'هنوز تغییری ثبت نشده است'
      : 'آخرین تغییر موجودی: ' + view.lastChange + ' سکه');
    rooms.textContent = view.rooms;
    floors.textContent = view.floors;
    excavated.textContent = view.excavated;
    saveStatus.textContent = view.saveLabel;
    saveStatus.dataset.state = view.saveState;
  };
}
