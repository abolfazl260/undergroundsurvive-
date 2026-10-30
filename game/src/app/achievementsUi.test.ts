import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
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

  it('maps every milestone to two distinct, bundled WebP files at the configured base path', () => {
    for (const base of ['/', './', '/undergroundsurvive-/', '/custom/subfolder/']) {
      const paths = ACHIEVEMENTS.map((entry) => achievementArtPaths(entry.id, base));
      expect(new Set(paths.map((entry) => entry.small)).size).toBe(ACHIEVEMENTS.length);
      expect(new Set(paths.map((entry) => entry.large)).size).toBe(ACHIEVEMENTS.length);
      for (const [index, entry] of paths.entries()) {
        const id = ACHIEVEMENTS[index].id;
        expect(entry.small).toBe(base + 'assets/achievements/' + id + '-360.webp');
        expect(entry.large).toBe(base + 'assets/achievements/' + id + '-540.webp');
        expect(existsSync('public/assets/achievements/' + id + '-360.webp')).toBe(true);
        expect(existsSync('public/assets/achievements/' + id + '-540.webp')).toBe(true);
      }
    }
  });

  it('uses the Vite runtime base automatically for img src and srcset', () => {
    const paths = achievementArtPaths('first-room');
    expect(paths.small).toBe(import.meta.env.BASE_URL + 'assets/achievements/first-room-360.webp');
    expect(paths.large).toBe(import.meta.env.BASE_URL + 'assets/achievements/first-room-540.webp');
    // Vite's test runner uses root hosting, while GitHub Pages serves the
    // production build from a project subdirectory with relative base './'.
    const projectPath = achievementArtPaths('first-room', './').large;
    expect(new URL(projectPath, 'https://example.org/undergroundsurvive-/').pathname)
      .toBe('/undergroundsurvive-/assets/achievements/first-room-540.webp');
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
