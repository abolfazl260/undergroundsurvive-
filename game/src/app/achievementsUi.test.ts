import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../modules/achievements/achievements';
import { ACHIEVEMENT_ARTWORK, categoryForAchievement } from './achievementsUi';

describe('achievement presentation categories', () => {
  it('assigns every achievement to a single existing category', () => {
    const groups = ACHIEVEMENTS.map((entry) => categoryForAchievement(entry.metric));
    expect(groups).toHaveLength(ACHIEVEMENTS.length);
    expect(groups.every((category) =>
      ['construction', 'exploration', 'production', 'community'].includes(category)
    )).toBe(true);
  });

  it('assigns a distinct, in-range illustrated scene to all eleven achievements', () => {
    const frames = ACHIEVEMENTS.map((entry) => ACHIEVEMENT_ARTWORK[entry.id]);
    expect(frames).toEqual(Array.from({ length: ACHIEVEMENTS.length }, (_, index) => index));
    expect(new Set(frames).size).toBe(ACHIEVEMENTS.length);
  });

  it('keeps catalog-derived filter totals consistent', () => {
    const totals = ACHIEVEMENTS.reduce<Record<string, number>>((counts, entry) => {
      const category = categoryForAchievement(entry.metric);
      counts[category] = (counts[category] ?? 0) + 1;
      return counts;
    }, {});
    expect(totals).toEqual({ construction: 6, exploration: 2, production: 2, community: 1 });
    expect(Object.values(totals).reduce((sum, count) => sum + count, 0)).toBe(11);
  });
});
