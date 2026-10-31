import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { nextGameSheet, ROOM_CATEGORY, ROOM_CATEGORIES, roomMatchesCategory, PRIMARY_EDITOR_TOOLS, POWER_EDITOR_TOOLS, DIG_TOOL_ART } from './gameDock';
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

describe('illustrated editor tool layout', () => {
  it('preserves all original build and editing tools with unique touch targets', () => {
    expect(PRIMARY_EDITOR_TOOLS.map((tool) => tool.id)).toEqual([
      'elevator', 'build', 'dig', 'move', 'upgrade', 'remove', 'navigate'
    ]);
    expect(new Set(PRIMARY_EDITOR_TOOLS.map((tool) => tool.id)).size).toBe(PRIMARY_EDITOR_TOOLS.length);
  });
  it('keeps power actions separate and includes a distinct functional overlay toggle', () => {
    expect(POWER_EDITOR_TOOLS.map((tool) => tool.id)).toEqual([
      'cable', 'riser', 'cutCable', 'power-overlay-toggle'
    ]);
    const all = [...PRIMARY_EDITOR_TOOLS, ...POWER_EDITOR_TOOLS];
    expect(new Set(all.map((tool) => tool.id)).size).toBe(all.length);
    expect(all.every((tool) => tool.label.length > 0 && tool.hint.length > 0)).toBe(true);
  });
});

describe('digging artwork replacement', () => {
  it('ships a lightweight transparent WebP for the excavation card', () => {
    expect(DIG_TOOL_ART).toBe('assets/ui/dig-pickaxe.webp');
    const bytes = readFileSync('public/' + DIG_TOOL_ART);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
    expect(bytes.toString('ascii', 12, 16)).toBe('VP8X');
    expect(bytes.readUIntLE(24, 3) + 1).toBe(96);
    expect(bytes.readUIntLE(27, 3) + 1).toBe(96);
    expect(bytes.length).toBeLessThan(8_000);
    expect(PRIMARY_EDITOR_TOOLS.find((tool) => tool.id === 'dig')?.label).toBe('حفاری');
  });
});
