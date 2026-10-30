import { describe, expect, it } from 'vitest';
import { menuBackTarget } from './gameMenu';

describe('game help menu navigation', () => {
  it('returns to Settings before the menu that opened it', () => {
    expect(menuBackTarget('help', 'home')).toBe('settings');
    expect(menuBackTarget('help', 'pause')).toBe('settings');
  });
  it('returns from Settings to the correct previous screen', () => {
    expect(menuBackTarget('settings', 'home')).toBe('home');
    expect(menuBackTarget('settings', 'pause')).toBe('pause');
  });
  it('preserves existing new game confirmation navigation', () => {
    expect(menuBackTarget('confirm-new', 'pause')).toBe('pause');
    expect(menuBackTarget('confirm-new', 'home')).toBe('home');
  });
});
