import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../modules/achievements/achievements';
import { achievementArtPaths, categoryForAchievement } from './achievementsUi';

describe('achievement presentation categories', () => {
  it('assigns every achievement to a single existing category', () => {
    const groups = ACHIEVEMENTS.map((entry) => categoryForAchievement(entry.metric));
    expect(groups).toHaveLength(ACHIEVEMENTS.length);
    expect(groups.every((category) =>
      ['construction', 'exploration', 'production', 'community'].includes(category)
    )).toBe(true);
  });

  it('maps every milestone to its own two independent WebP URLs', () => {
    const paths = ACHIEVEMENTS.map((entry) => achievementArtPaths(entry.id));
    expect(new Set(paths.map((entry) => entry.small)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(paths.map((entry) => entry.large)).size).toBe(ACHIEVEMENTS.length);
    for (const [index, entry] of paths.entries()) {
      expect(entry.small).toBe('/assets/achievements/' + ACHIEVEMENTS[index].id + '-360.webp');
      expect(entry.large).toBe('/assets/achievements/' + ACHIEVEMENTS[index].id + '-540.webp');
    }
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
