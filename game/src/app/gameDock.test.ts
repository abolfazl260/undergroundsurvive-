import { describe, it, expect } from 'vitest';
import { nextGameSheet, ROOM_CATEGORY, ROOM_CATEGORIES, roomMatchesCategory } from './gameDock';
import { ROOM_DEFINITIONS } from '../modules/building/catalog';

describe('unified bottom-sheet navigation', () => {
  it('opens a bottom panel and collapses it on repeated action', () => {
    expect(nextGameSheet(null, 'rooms')).toBe('rooms');
    expect(nextGameSheet('rooms', 'rooms')).toBe(null);
    expect(nextGameSheet(null, 'tools')).toBe('tools');
    expect(nextGameSheet('tools', 'tools')).toBe(null);
  });
  it('switches between build, tools and management without stacked overlays', () => {
    expect(nextGameSheet('rooms', 'tools')).toBe('tools');
    expect(nextGameSheet('tools', 'more')).toBe('more');
    expect(nextGameSheet('more', 'rooms')).toBe('rooms');
    expect(nextGameSheet('more', 'more')).toBe(null);
  });
});

describe('illustrated room gallery filters', () => {
  it('classifies every buildable room exactly once', () => {
    expect(Object.keys(ROOM_CATEGORY).sort()).toEqual(Object.keys(ROOM_DEFINITIONS).sort());
    for (const type of Object.keys(ROOM_DEFINITIONS) as (keyof typeof ROOM_DEFINITIONS)[]) {
      expect(ROOM_CATEGORIES.some((category) => category.key === ROOM_CATEGORY[type])).toBe(true);
      expect(roomMatchesCategory(type, 'all')).toBe(true);
      expect(roomMatchesCategory(type, ROOM_CATEGORY[type])).toBe(true);
    }
  });
  it('never shows a room in an unrelated category', () => {
    expect(roomMatchesCategory('habitat', 'services')).toBe(false);
    expect(roomMatchesCategory('laboratory', 'research')).toBe(true);
    expect(roomMatchesCategory('waterTreatment', 'resources')).toBe(true);
    expect(roomMatchesCategory('guardPost', 'defense')).toBe(true);
  });
});
