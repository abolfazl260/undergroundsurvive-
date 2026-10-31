import { describe, expect, it } from 'vitest';
import { displayedAirFraction, displayedAirPercent } from './airPanel';

describe('air readout agrees with zero-air defeat threshold', () => {
  it('shows zero only when the actual quality reaches zero', () => {
    expect(displayedAirPercent(0)).toBe(0);
    expect(displayedAirFraction(0)).toBe('0.0');
    expect(displayedAirPercent(0.01)).toBe(1);
    expect(displayedAirFraction(0.01)).toBe('0.1');
    expect(displayedAirPercent(0.49)).toBe(1);
    expect(displayedAirPercent(1.4)).toBe(1);
    expect(displayedAirPercent(100)).toBe(100);
  });
});
