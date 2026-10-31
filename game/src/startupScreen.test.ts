import { describe, expect, it } from 'vitest';
import { startupPercent } from './startupScreen';

describe('startup loading phases', () => {
  it('starts before restoring local progress', () => {
    expect(startupPercent('initializing')).toBe(0);
    expect(startupPercent('restoring')).toBe(10);
  });

  it('uses the real Phaser load fraction within the asset phase', () => {
    expect(startupPercent('assets', 0)).toBe(15);
    expect(startupPercent('assets', 0.5)).toBe(55);
    expect(startupPercent('assets', 1)).toBe(95);
  });

  it('sanitizes invalid values and never claims ready while assets load', () => {
    expect(startupPercent('assets', -1)).toBe(15);
    expect(startupPercent('assets', Infinity)).toBe(15);
    expect(startupPercent('assets', Number.NaN)).toBe(15);
    expect(startupPercent('assets', 30)).toBe(95);
    expect(startupPercent('assets', 0.99)).toBeLessThan(100);
  });

  it('reaches 100% only when the first game scene is ready', () => {
    expect(startupPercent('world')).toBe(97);
    expect(startupPercent('ready')).toBe(100);
  });
});
