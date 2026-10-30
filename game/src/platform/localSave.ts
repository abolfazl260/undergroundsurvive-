import type { BaseSnapshot } from '../modules/building/layout';

const SAVE_KEY = 'underground-survive:base:v1';

// Temporary offline prototype only. Never trust this data for online coins or PvP.
export function loadLocalBase(): unknown {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) as unknown : null;
  } catch {
    return null;
  }
}
export function saveLocalBase(snapshot: BaseSnapshot): boolean {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

