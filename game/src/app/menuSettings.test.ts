import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MENU_SETTINGS, loadMenuSettings, normalizeMenuSettings, saveMenuSettings
} from './menuSettings';

describe('game menu preferences', () => {
  it('uses safe defaults for missing or malformed preferences', () => {
    expect(normalizeMenuSettings(null)).toEqual(DEFAULT_MENU_SETTINGS);
    expect(normalizeMenuSettings([])).toEqual(DEFAULT_MENU_SETTINGS);
    expect(normalizeMenuSettings({ masterVolume: '90', reducedMotion: 'yes' })).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it('clamps volume and respects an explicit motion preference', () => {
    expect(normalizeMenuSettings({ masterVolume: 150, reducedMotion: true })).toEqual({
      masterVolume: 100, reducedMotion: true
    });
    expect(normalizeMenuSettings({ masterVolume: -3, reducedMotion: false }).masterVolume).toBe(0);
    expect(normalizeMenuSettings({ masterVolume: Number.NaN }).masterVolume).toBe(80);
  });

  it('round-trips preferences without touching the game save', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); }
    };
    expect(saveMenuSettings({ masterVolume: 25, reducedMotion: true }, storage)).toBe(true);
    expect(loadMenuSettings(storage)).toEqual({ masterVolume: 25, reducedMotion: true });
    expect([...values.keys()]).toEqual(['underground-survive:menu-settings:v1']);
  });

  it('does not crash when local storage is unavailable or corrupted', () => {
    const broken = {
      getItem: (_key: string): string | null => { throw new Error('blocked'); },
      setItem: (_key: string, _value: string): void => { throw new Error('blocked'); }
    };
    expect(loadMenuSettings(broken)).toEqual(DEFAULT_MENU_SETTINGS);
    expect(saveMenuSettings({ masterVolume: 50, reducedMotion: false }, broken)).toBe(false);
    expect(loadMenuSettings({ ...broken, getItem: () => '{' })).toEqual(DEFAULT_MENU_SETTINGS);
  });
});
