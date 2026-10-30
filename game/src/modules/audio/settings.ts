/** Sound preferences are intentionally separate from game progress and economy saves. */
export interface AudioSettings {
  muted: boolean;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
}

export const AUDIO_SETTINGS_KEY = 'underground-survive:audio:v1';

export const DEFAULT_AUDIO_SETTINGS: Readonly<AudioSettings> = Object.freeze({
  muted: false,
  musicEnabled: true,
  effectsEnabled: true,
  musicVolume: 0.3,
  effectsVolume: 0.65
});

export interface AudioStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function volume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

export function normalizeAudioSettings(value: unknown): AudioSettings {
  const input = value && typeof value === 'object' ? value as Partial<AudioSettings> : {};
  return {
    muted: typeof input.muted === 'boolean' ? input.muted : DEFAULT_AUDIO_SETTINGS.muted,
    musicEnabled: typeof input.musicEnabled === 'boolean' ? input.musicEnabled : DEFAULT_AUDIO_SETTINGS.musicEnabled,
    effectsEnabled: typeof input.effectsEnabled === 'boolean' ? input.effectsEnabled : DEFAULT_AUDIO_SETTINGS.effectsEnabled,
    musicVolume: volume(input.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
    effectsVolume: volume(input.effectsVolume, DEFAULT_AUDIO_SETTINGS.effectsVolume)
  };
}

function browserStorage(): AudioStorage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined; // e.g. disabled cookies or restricted mobile WebView
  }
}

export function loadAudioSettings(storage: AudioStorage | undefined = browserStorage()): AudioSettings {
  try {
    const raw = storage?.getItem(AUDIO_SETTINGS_KEY);
    return raw ? normalizeAudioSettings(JSON.parse(raw)) : normalizeAudioSettings(null);
  } catch {
    return normalizeAudioSettings(null);
  }
}

export function saveAudioSettings(settings: AudioSettings, storage: AudioStorage | undefined = browserStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(normalizeAudioSettings(settings)));
    return true;
  } catch {
    return false;
  }
}
