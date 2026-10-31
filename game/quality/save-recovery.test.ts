import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSession } from '../src/modules/economy/session';
import { loadLocalBase, saveLocalBase } from '../src/platform/localSave';

const KEY = 'underground-survive:game:v2';
const RECOVERY = 'underground-survive:recovery';

function fakeStorage() {
  const data = new Map<string,string>();
  return {
    getItem: (key:string) => data.get(key) ?? null,
    setItem: (key:string, value:string) => { data.set(key, String(value)); },
    removeItem: (key:string) => { data.delete(key); },
    clear: () => { data.clear(); }
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal('window', { localStorage: fakeStorage() });
});

describe('on-demand corrupt-save scenarios', () => {
  it('round-trips a legitimate save through the actual storage adapter', () => {
    const game = GameSession.create();
    expect(saveLocalBase(game.snapshot())).toBe(true);
    const saved = loadLocalBase();
    expect(GameSession.restore(saved)).not.toBeNull();
  });

  it('does not throw on truncated JSON and preserves the damaged bytes for diagnosis', () => {
    const storage = window.localStorage;
    storage.setItem(KEY, '{"schemaVersion":16,');
    expect(loadLocalBase()).toBeNull();
    expect(saveLocalBase(GameSession.create().snapshot())).toBe(true);
    expect(storage.getItem(RECOVERY)).toBe('{"schemaVersion":16,');
  });

  it('rejects tampered records and leaves a recoverable fresh state', () => {
    const storage = window.localStorage;
    const modified = GameSession.create().snapshot();
    modified.wallet.balance += 50000;
    storage.setItem(KEY, JSON.stringify(modified));
    expect(GameSession.restore(loadLocalBase())).toBeNull();
    expect(saveLocalBase(GameSession.create().snapshot())).toBe(true);
    expect(GameSession.restore(loadLocalBase())).not.toBeNull();
    expect(storage.getItem(RECOVERY)).toContain('"schemaVersion"');
  });

  it('reports storage quota/permission errors instead of implying save succeeded', () => {
    vi.stubGlobal('window', { localStorage: {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); }
    } });
    expect(saveLocalBase(GameSession.create().snapshot())).toBe(false);
    expect(loadLocalBase()).toBeNull();
  });
});
