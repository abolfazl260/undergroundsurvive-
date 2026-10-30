import { describe, expect, it } from 'vitest';
import { GameSession } from '../../modules/economy/session';
import { WORLD } from '../../modules/world/grid';
import { toHudView } from './hud';
import { setLocale } from '../../i18n';

const format = (value: number): string => new Intl.NumberFormat('fa-IR').format(value);

describe('HUD snapshot projection', () => {
  it('shows only real starter values and reports local save status', () => {
    const snapshot = GameSession.create().snapshot();
    const view = toHudView(snapshot, true);
    expect(view.balance).toBe(format(snapshot.wallet.balance));
    expect(view.rooms).toBe(format(snapshot.base.rooms.length));
    expect(view.floors).toBe(format(2) + ' / ' + format(-WORLD.minY));
    expect(view.excavated).toBe(format(snapshot.base.terrain.excavated.length));
    expect(view.changeKind).toBe('none');
    expect(view.lastChange).toBe('—');
    expect(view.saveLabel).toBe('ذخیره روی دستگاه');
    expect(view.saveState).toBe('saved');
  });

  it('updates the balance and latest delta after an income transaction', () => {
    const session = GameSession.create();
    expect(session.claimDemoBonus().ok).toBe(true);
    const view = toHudView(session.snapshot(), true);
    expect(view.balance).toBe(format(2000));
    expect(view.lastChange).toBe('+' + format(500));
    expect(view.changeKind).toBe('earned');
  });

  it('reports excavated underground depth rather than disabled sky floors', () => {
    const session = GameSession.create();
    expect(session.dig(5, -2).ok).toBe(true);
    expect(session.buildElevator(0,-3).ok).toBe(true);
    expect(session.dig(5, -3).ok).toBe(true);
    const view = toHudView(session.snapshot(), true);
    expect(view.balance).toBe(format(1500 - 70 - 150));
    expect(view.lastChange).toBe('−' + format(35));
    expect(view.changeKind).toBe('spent');
    expect(view.floors).toBe(format(3) + ' / ' + format(-WORLD.minY));
  });

  it('renders English digits and save status on a language switch without mutating the snapshot', () => {
    const snapshot = GameSession.create().snapshot();
    setLocale('en', { setItem: () => {} });
    try {
      const view = toHudView(snapshot, true);
      expect(view.balance).toBe('1,500');
      expect(view.saveLabel).toBe('Saved on this device');
      expect(view.rooms).toBe(String(snapshot.base.rooms.length));
    } finally {
      setLocale('fa', { setItem: () => {} });
    }
    expect(snapshot.wallet.balance).toBe(1500);
  });

  it('does not claim success when browser persistence fails', () => {
    const view = toHudView(GameSession.create().snapshot(), false);
    expect(view.saveLabel).toBe('ذخیره نشد');
    expect(view.saveState).toBe('failed');
  });

  it('refreshes live room and terrain counts without modifying the snapshot', () => {
    const session = GameSession.create();
    const before = session.snapshot();
    const after = {
      ...before,
      base: {
        ...before.base,
        rooms: before.base.rooms.slice(1),
        terrain: {
          ...before.base.terrain,
          excavated: before.base.terrain.excavated.slice(2)
        }
      }
    };
    const view = toHudView(after, true);
    expect(view.rooms).toBe(format(before.base.rooms.length - 1));
    expect(view.excavated).toBe(format(before.base.terrain.excavated.length - 2));
    expect(before.base.rooms.length).toBe(4);
  });
});
