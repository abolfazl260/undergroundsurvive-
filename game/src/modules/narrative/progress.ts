import type { StoryChapter } from './content';

const KEY = 'underground:story-progress:v1';
type Progress = Record<string, number>;

export function readStoryProgress(storage: Pick<Storage, 'getItem'> | null): Progress {
  if (!storage) return {};
  try {
    const value: unknown = JSON.parse(storage.getItem(KEY) ?? '{}');
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    const result: Progress = {};
    for (const [id, index] of Object.entries(value)) {
      if (/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) &&
          typeof index === 'number' && Number.isSafeInteger(index) && index >= 0) {
        result[id] = index;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** Scene index is a bookmark; sceneCount marks finished/skipped. No gameplay rewards. */
export function saveStoryPosition(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
  chapter: StoryChapter,
  index: number
): void {
  if (!storage) return;
  const current = readStoryProgress(storage);
  current[chapter.id] = Math.max(0, Math.min(chapter.scenes.length, Math.trunc(index)));
  try {
    storage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Private mode / quota exhaustion: keep story playback usable.
  }
}

export function storyResumeIndex(chapter: StoryChapter, progress: Progress): number {
  const index = progress[chapter.id] ?? 0;
  return index >= chapter.scenes.length ? 0 : Math.max(0, index);
}

export function storyCompleted(chapter: StoryChapter, progress: Progress): boolean {
  return (progress[chapter.id] ?? 0) >= chapter.scenes.length;
}
