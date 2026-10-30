import { describe, expect, it } from 'vitest';
import {
  AUDIO_SETTINGS_KEY, DEFAULT_AUDIO_SETTINGS, loadAudioSettings,
  normalizeAudioSettings, saveAudioSettings, type AudioStorage
} from './settings';

function memoryStorage(): AudioStorage {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); }
  };
}

describe('audio preferences', () => {
  it('uses safe defaults for missing or malformed settings', () => {
    const store = memoryStorage();
    expect(loadAudioSettings(store)).toEqual(DEFAULT_AUDIO_SETTINGS);
    store.setItem(AUDIO_SETTINGS_KEY, '{invalid');
    expect(loadAudioSettings(store)).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('normalizes invalid fields and clamps volume to 0–1', () => {
    expect(normalizeAudioSettings({
      muted: 'yes', musicEnabled: false, effectsEnabled: true,
      musicVolume: 7, effectsVolume: -2
    })).toEqual({
      ...DEFAULT_AUDIO_SETTINGS, musicEnabled: false,
      musicVolume: 1, effectsVolume: 0
    });
    expect(normalizeAudioSettings({ musicVolume: Number.NaN, effectsVolume: Infinity }))
      .toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it('round trips every setting without touching game-save keys', () => {
    const store = memoryStorage();
    store.setItem('underground-survive:base:v1', 'original');
    const settings = normalizeAudioSettings({
      muted: true, musicEnabled: false, effectsEnabled: true,
      musicVolume: 0.42, effectsVolume: 0.8
    });
    expect(saveAudioSettings(settings, store)).toBe(true);
    expect(loadAudioSettings(store)).toEqual(settings);
    expect(store.getItem('underground-survive:base:v1')).toBe('original');
  });

  it('continues working when browser storage is blocked', () => {
    const blocked: AudioStorage = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('QuotaExceededError'); }
    };
    expect(loadAudioSettings(blocked)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(saveAudioSettings(normalizeAudioSettings(null), blocked)).toBe(false);
  });
});
