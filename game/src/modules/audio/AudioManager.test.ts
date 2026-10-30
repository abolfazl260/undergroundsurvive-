import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './AudioManager';
import { DEFAULT_AUDIO_SETTINGS } from './settings';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AudioManager graceful fallback', () => {
  it('works without window, AudioContext or DOM (SSR/test environments)', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    const manager = new AudioManager({ ...DEFAULT_AUDIO_SETTINGS });
    expect(manager.supported).toBe(false);
    expect(() => {
      manager.activate();
      manager.play('build');
      manager.play('error');
      manager.dispose();
      manager.dispose();
    }).not.toThrow();
  });

  it('accepts independent settings even when playback is unavailable', () => {
    vi.stubGlobal('window', undefined);
    const manager = new AudioManager({ ...DEFAULT_AUDIO_SETTINGS });
    expect(manager.setSettings({
      muted: true, musicEnabled: false, musicVolume: 0.8, effectsVolume: 0.2
    })).toMatchObject({
      muted: true, musicEnabled: false, effectsEnabled: true,
      musicVolume: 0.8, effectsVolume: 0.2
    });
    manager.play('reward');
    manager.dispose();
    expect(manager.getSettings().muted).toBe(true);
  });
});
