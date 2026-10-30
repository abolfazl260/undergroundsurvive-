import { describe, expect, it } from 'vitest';
import { ICON_PATHS, isIconName } from './icons';
import { badgeClassNames, buttonClassNames } from './components';
describe('shared UI icons', () => {
  it('includes all icons used by the HUD', () => {
    for (const name of ['bunker','coin','home','bolt','wrench','package','pickaxe','sprout','medical','move',
      'arrow-up','trash','layers','gift','reset','zoom-in','zoom-out','arrow-left']) expect(isIconName(name)).toBe(true);
  });
  it('rejects unknown or inherited names', () => {
    expect(isIconName('unknown')).toBe(false);
    expect(isIconName('constructor')).toBe(false);
    expect(isIconName('__proto__')).toBe(false);
  });
  it('contains only nonempty static SVG paths', () => {
    for (const paths of Object.values(ICON_PATHS)) {
      expect(paths.length).toBeGreaterThan(0);
      for (const path of paths) {
        expect(path.trim().length).toBeGreaterThan(3);
        expect(path).not.toContain('<');
      }
    }
  });
});
describe('UI component variants', () => {
  it('produces stable button classes', () => {
    expect(buttonClassNames()).toBe('ui-button ui-button--secondary');
    expect(buttonClassNames('primary')).toBe('ui-button ui-button--primary');
    expect(buttonClassNames('danger')).toBe('ui-button ui-button--danger');
  });
  it('produces badge tones', () => {
    expect(badgeClassNames()).toBe('ui-badge ui-badge--neutral');
    expect(badgeClassNames('success')).toBe('ui-badge ui-badge--success');
    expect(badgeClassNames('warning')).toBe('ui-badge ui-badge--warning');
  });
});
