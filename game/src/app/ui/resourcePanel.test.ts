import { describe, expect, it } from 'vitest';
import { resourceLevelState } from './resourcePanel';

describe('resource strip status logic', () => {
  it('keeps optional empty resources neutral rather than marking an emergency', () => {
    expect(resourceLevelState(0, 30, false)).toBe('empty');
    expect(resourceLevelState(30, 30, false)).toBe('normal');
  });
  it('marks essential empty resources as critical', () => {
    expect(resourceLevelState(0, 30, true)).toBe('critical');
    expect(resourceLevelState(0, 30, true, false)).toBe('critical');
  });
  it('marks low but nonempty essential stock as a warning', () => {
    expect(resourceLevelState(6, 30, true)).toBe('low');
    expect(resourceLevelState(7, 30, true)).toBe('normal');
  });
  it('respects shortages reported by the simulation even with inventory left', () => {
    expect(resourceLevelState(15, 30, false, true)).toBe('critical');
    expect(resourceLevelState(15, 30, true, true)).toBe('critical');
  });
});
