import { GameSession } from '../modules/economy/session';
import { BuildingLayout } from '../modules/building/layout';
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
    const previous = window.localStorage.getItem(NEW_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    if(previous && !window.localStorage.getItem('underground-survive:recovery')) {
      let valid=false;
      try { const value:unknown=JSON.parse(previous); valid=!!GameSession.restore(value)||!!BuildingLayout.restore(value); } catch { /* Keep malformed originals too. */ }
      if(!valid) window.localStorage.setItem('underground-survive:recovery',previous);
    }
    window.localStorage.setItem(NEW_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}
