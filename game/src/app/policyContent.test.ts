import { describe, expect, it } from 'vitest';
import { getPolicyDocument, POLICY_ISSUES_URL, POLICY_UPDATED } from './policyContent';

describe('menu policies', () => {
  it('has the same complete, ordered sections in both supported languages', () => {
    const persian = getPolicyDocument('fa');
    const english = getPolicyDocument('en');
    expect(persian.sections.map((section) => section.id)).toEqual([
      'gameplay', 'terms', 'privacy', 'permissions', 'controls',
      'commerce', 'safety', 'updates'
    ]);
    expect(english.sections.map((section) => section.id)).toEqual(
      persian.sections.map((section) => section.id)
    );
    for (const doc of [persian, english]) {
      expect(doc.summary.length).toBeGreaterThan(50);
      expect(doc.updated.length).toBeGreaterThan(10);
      for (const section of doc.sections) {
        expect(section.title.length).toBeGreaterThan(8);
        expect(section.paragraphs.length).toBeGreaterThanOrEqual(2);
        expect(section.paragraphs.every((p) => p.length >= 30)).toBe(true);
      }
    }
  });

  it('dates the notice and uses a verified public project contact', () => {
    expect(POLICY_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(POLICY_ISSUES_URL).toBe('https://github.com/abolfazl260/undergroundsurvive-/issues');
  });
});
