import type { GameSnapshot } from '../../modules/economy/session';
import { WORLD } from '../../modules/world/grid';
import { formatNumber, t } from '../../i18n';

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
    balance: formatNumber(snapshot.wallet.balance),
    lastChange: showChange
      ? (latest.delta > 0 ? '+' : '−') + formatNumber(Math.abs(latest.delta))
      : '—',
    changeKind,
    rooms: formatNumber(snapshot.base.rooms.length),
    floors: formatNumber(snapshot.base.terrain.highestFloor) + ' / ' + formatNumber(WORLD.maxY),
    excavated: formatNumber(snapshot.base.terrain.excavated.length),
    saveLabel: t(saved ? 'ذخیره روی دستگاه' : 'ذخیره نشد'),
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
  const saveStatus = required('#hud-save-status');

  return (snapshot, saved) => {
    const view = toHudView(snapshot, saved);
    balance.textContent = view.balance;
    change.textContent = view.lastChange;
    change.dataset.kind = view.changeKind;
    change.setAttribute('aria-label', view.changeKind === 'none'
      ? t('هنوز تغییری ثبت نشده است')
      : t('آخرین تغییر موجودی: {value} سکه', { value: view.lastChange }));
    rooms.textContent = view.rooms;
    saveStatus.textContent = view.saveLabel;
    saveStatus.dataset.state = view.saveState;
  };
}
