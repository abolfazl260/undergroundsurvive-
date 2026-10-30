import { describe, expect, it } from 'vitest';
import { readStoryProgress, saveStoryPosition, storyResumeIndex, storyCompleted } from './progress';
import type { StoryChapter } from './content';

const chapter: StoryChapter = {
  schemaVersion: 1, contentVersion: 1, id: 'demo-chapter', locale: 'fa-IR', title: 'demo',
  enabled: true, scenes: [
    { id: 'first', type: 'image', src: 'media/images/a.png', text: '' },
    { id: 'second', type: 'image', src: 'media/images/b.png', text: '' }
  ]
};
const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); }
  };
};

describe('local story bookmark (separate from gameplay save)', () => {
  it('resumes a scene and restarts when the chapter was completed', () => {
    const storage = memory();
    saveStoryPosition(storage, chapter, 1);
    expect(storyResumeIndex(chapter, readStoryProgress(storage))).toBe(1);
    saveStoryPosition(storage, chapter, 2);
    const saved = readStoryProgress(storage);
    expect(storyCompleted(chapter, saved)).toBe(true);
    expect(storyResumeIndex(chapter, saved)).toBe(0);
  });

  it('ignores malformed data and tolerates blocked storage', () => {
    expect(readStoryProgress({ getItem: () => '{invalid' })).toEqual({});
    expect(() => saveStoryPosition({ getItem: () => null, setItem: () => { throw new Error('quota'); } },
      chapter, 0)).not.toThrow();
    expect(readStoryProgress(null)).toEqual({});
  });

  it('clamps out-of-bounds indexes and never generates rewards', () => {
    const storage = memory();
    saveStoryPosition(storage, chapter, 100);
    expect(readStoryProgress(storage)['demo-chapter']).toBe(2);
    saveStoryPosition(storage, chapter, -10);
    expect(readStoryProgress(storage)['demo-chapter']).toBe(0);
  });
});
