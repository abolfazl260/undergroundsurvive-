import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getHelpDocument } from './helpContent';

describe('practical bilingual game help', () => {
  const fa = getHelpDocument('fa');
  const en = getHelpDocument('en');

  it('offers concise quick-start steps and matching translated topics', () => {
    expect(fa.startSteps).toHaveLength(6);
    expect(en.startSteps).toHaveLength(fa.startSteps.length);
    expect(fa.topics.length).toBeGreaterThanOrEqual(12);
    expect(en.topics.map(x => x.id)).toEqual(fa.topics.map(x => x.id));
    expect(new Set(fa.topics.map(x => x.id)).size).toBe(fa.topics.length);
    for (const guide of [fa, en]) {
      expect(guide.intro.length).toBeGreaterThan(10);
      expect(guide.reminder.length).toBeGreaterThan(10);
      expect(guide.startSteps.every(step => step.length > 20)).toBe(true);
      expect(guide.topics.every(topic => topic.title.length > 4 && topic.steps.length >= 3 &&
        topic.steps.every(step => step.length > 18))).toBe(true);
    }
  });

  it('explains real controls, critical survival systems and local saving', () => {
    const ids = fa.topics.map(x => x.id);
    for (const id of ['screen','camera','dig','build','edit','power','water','air','food',
      'people','research','radiation','progress','troubleshooting']) expect(ids).toContain(id);
    expect(fa.startSteps.join(' ')).toContain('تصفیه آب');
    expect(fa.startSteps.join(' ')).toContain('ارتقا');
    expect(fa.topics.find(x => x.id === 'air')?.steps.join(' ')).toContain('صفر');
    expect(fa.topics.find(x => x.id === 'progress')?.steps.join(' ')).toContain('محلی');
  });

  it('opens from home, pause, settings, and in-game tools with a return path', () => {
    const html = readFileSync('index.html', 'utf8');
    const menu = readFileSync('src/app/gameMenu.ts', 'utf8');
    const guide = readFileSync('src/app/helpContent.ts', 'utf8');
    const css = readFileSync('src/gameMenu.css', 'utf8');
    expect(html.match(/data-menu-action="help"/g)).toHaveLength(3);
    expect(html).toContain('id="menu-help-from-tools"');
    expect(html).toContain('id="menu-help-content"');
    expect(html).toContain('id="menu-help-title"');
    expect(menu).toContain("case 'help':");
    expect(menu).toContain("screen === 'help' ? helpReturnScreen");
    expect(menu).toContain("if (screen === 'help') showScreen(helpReturnScreen)");
    expect(menu).toContain("if (next === 'help') renderHelpContent");
    expect(guide).toContain("document.createElement('details')");
    expect(guide).toContain("const opened = new Set(");
    expect(guide).not.toContain('innerHTML');
    expect(css).toContain('min-height: 48px;');
    expect(css).toContain('.menu-help-actions');
  });
});
