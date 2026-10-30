/** Menu-only preferences. Audio uses the shared AudioManager settings. */
export interface MenuSettings {
  reducedMotion: boolean;
}

export const DEFAULT_MENU_SETTINGS: Readonly<MenuSettings> = {
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
  return {
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
