import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MENU_SETTINGS, loadMenuSettings, normalizeMenuSettings, saveMenuSettings
} from './menuSettings';

describe('game menu preferences', () => {
  it('uses safe defaults for missing or malformed preferences', () => {
    expect(normalizeMenuSettings(null)).toEqual(DEFAULT_MENU_SETTINGS);
    expect(normalizeMenuSettings([])).toEqual(DEFAULT_MENU_SETTINGS);
    expect(normalizeMenuSettings({ reducedMotion: 'yes' })).toEqual(DEFAULT_MENU_SETTINGS);
  });

  it('respects explicit reduced-motion setting without copying unrelated audio fields', () => {
    expect(normalizeMenuSettings({ masterVolume: 95, reducedMotion: true })).toEqual({ reducedMotion: true });
    expect(normalizeMenuSettings({ reducedMotion: false })).toEqual({ reducedMotion: false });
  });

  it('round-trips preferences without touching game and audio saves', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); }
    };
    expect(saveMenuSettings({ reducedMotion: true }, storage)).toBe(true);
    expect(loadMenuSettings(storage)).toEqual({ reducedMotion: true });
    expect([...values.keys()]).toEqual(['underground-survive:menu-settings:v1']);
  });

  it('uses defaults when local storage is unavailable or corrupted', () => {
    const broken = {
      getItem: (_key: string): string | null => { throw new Error('blocked'); },
      setItem: (_key: string, _value: string): void => { throw new Error('blocked'); }
    };
    expect(loadMenuSettings(broken)).toEqual(DEFAULT_MENU_SETTINGS);
    expect(saveMenuSettings({ reducedMotion: false }, broken)).toBe(false);
    expect(loadMenuSettings({ ...broken, getItem: () => '{' })).toEqual(DEFAULT_MENU_SETTINGS);
  });
});
