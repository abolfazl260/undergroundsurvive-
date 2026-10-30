import type { GameSnapshot } from '../modules/economy/session';

const NEW_KEY = 'underground-survive:game:v2';
const LEGACY_KEY = 'underground-survive:base:v1';

// Local prototype persistence is NOT safe for authoritative online balances.
export function loadLocalBase(): unknown {
  try {
    const current = window.localStorage.getItem(NEW_KEY);
    if (current !== null) return JSON.parse(current) as unknown;
    const old = window.localStorage.getItem(LEGACY_KEY);
    return old === null ? null : JSON.parse(old) as unknown;
  } catch {
    return null;
  }
}

export function saveLocalBase(snapshot: GameSnapshot): boolean {
  try {
    window.localStorage.setItem(NEW_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}
