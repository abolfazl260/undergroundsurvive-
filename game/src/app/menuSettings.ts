/** Local UI preferences, separate from the world/economy save. */
export interface MenuSettings {
  masterVolume: number;
  reducedMotion: boolean;
}

export const DEFAULT_MENU_SETTINGS: Readonly<MenuSettings> = {
  masterVolume: 80,
  reducedMotion: false
};

const STORAGE_KEY = 'underground-survive:menu-settings:v1';

interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function normalizeMenuSettings(raw: unknown): MenuSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_MENU_SETTINGS };
  }
  const value = raw as Record<string, unknown>;
  const volume = typeof value.masterVolume === 'number' && Number.isFinite(value.masterVolume)
    ? Math.round(Math.min(100, Math.max(0, value.masterVolume)))
    : DEFAULT_MENU_SETTINGS.masterVolume;
  return {
    masterVolume: volume,
    reducedMotion: typeof value.reducedMotion === 'boolean'
      ? value.reducedMotion : DEFAULT_MENU_SETTINGS.reducedMotion
  };
}

export function loadMenuSettings(storage?: SettingsStorage): MenuSettings {
  try {
    const raw = (storage ?? window.localStorage).getItem(STORAGE_KEY);
    return raw === null ? { ...DEFAULT_MENU_SETTINGS } : normalizeMenuSettings(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_MENU_SETTINGS };
  }
}

export function saveMenuSettings(settings: MenuSettings, storage?: SettingsStorage): boolean {
  try {
    (storage ?? window.localStorage).setItem(STORAGE_KEY, JSON.stringify(normalizeMenuSettings(settings)));
    return true;
  } catch {
    return false;
  }
}
