import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getPolicyContent, POLICY_UPDATED_AT, type PolicySectionId } from './policies';

const sectionIds: PolicySectionId[] = ['gameplay', 'terms', 'privacy', 'permissions', 'support'];

describe('rules, privacy and device permissions', () => {
  it('has matching, substantive sections in Persian and English', () => {
    for (const locale of ['fa', 'en'] as const) {
      const data = getPolicyContent(locale);
      expect(data.sections.map((section) => section.id)).toEqual(sectionIds);
      expect(data.introduction.length).toBeGreaterThan(60);
      expect(data.versionLabel).toContain('2026');
      expect(data.notice.length).toBeGreaterThan(40);

      for (const section of data.sections) {
        expect(section.title.trim()).not.toBe('');
        expect(section.description.trim()).not.toBe('');
        expect(section.items.length).toBeGreaterThanOrEqual(4);
        for (const item of section.items) {
          expect(item.heading.trim().length).toBeGreaterThan(3);
          expect(item.description.trim().length).toBeGreaterThan(40);
        }
      }
    }
    expect(POLICY_UPDATED_AT).toBe('2026-10-31');
  });

  it('discloses local storage, deletion, hosted logs and missing sensitive permissions', () => {
    for (const locale of ['fa', 'en'] as const) {
      const sections = getPolicyContent(locale).sections;
      const privacy = sections.find((section) => section.id === 'privacy')!;
      const permissions = sections.find((section) => section.id === 'permissions')!;
      expect(privacy.items.length).toBeGreaterThanOrEqual(5);
      expect(permissions.items.length).toBeGreaterThanOrEqual(5);
      expect(privacy.items.map((item) => item.description).join(' ')).toMatch(/localStorage/);
    }
    const english = getPolicyContent('en');
    const disclosures = english.sections.flatMap((section) => section.items.map((item) => item.description)).join(' ');
    expect(disclosures).toMatch(/clear app data/i);
    expect(disclosures).toMatch(/network providers/i);
    expect(disclosures).toMatch(/AndroidManifest/);
    expect(disclosures).toMatch(/microphone/i);
  });

  it('makes the policy screen reachable from the home, pause and settings menus', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain('data-menu-screen="policies"');
    expect(html).toContain('id="menu-policies-title" tabindex="-1"');
    expect(html).toContain('id="menu-policies-sections"');
    expect((html.match(/data-menu-action="policies"/g) ?? []).length).toBe(3);
    expect(html).toContain('data-menu-action="policy-back"');
  });
});
