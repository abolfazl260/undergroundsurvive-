import { describe, expect, it } from 'vitest';
import { androidBackTarget } from './androidRuntime';
const state = { dialogOpen: false, sheetOpen: false, resourcesOpen: false, canPause: true };
describe('Android back priority', () => {
  it('prioritizes modal, sheet, resource drawer and pause', () => {
    expect(androidBackTarget({ ...state, dialogOpen: true, sheetOpen: true })).toBe('dialog');
    expect(androidBackTarget({ ...state, sheetOpen: true, resourcesOpen: true })).toBe('sheet');
    expect(androidBackTarget({ ...state, resourcesOpen: true })).toBe('resources');
    expect(androidBackTarget(state)).toBe('pause');
    expect(androidBackTarget({ ...state, canPause: false })).toBe('minimize');
  });
});
