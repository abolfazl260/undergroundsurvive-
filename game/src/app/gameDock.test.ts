import { describe, it, expect } from 'vitest';
import { nextGameSheet } from './gameDock';

describe('fullscreen game sheet navigation', () => {
  it('opens rooms and collapses it by tapping the same action', () => {
    expect(nextGameSheet(null, 'rooms')).toBe('rooms');
    expect(nextGameSheet('rooms', 'rooms')).toBe(null);
  });
  it('switches between rooms and more without stacking overlays', () => {
    expect(nextGameSheet('rooms', 'more')).toBe('more');
    expect(nextGameSheet('more', 'rooms')).toBe('rooms');
    expect(nextGameSheet('more', 'more')).toBe(null);
  });
});
