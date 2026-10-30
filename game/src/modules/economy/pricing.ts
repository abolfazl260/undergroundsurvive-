import type { BuildableRoomType, RoomType } from '../building/catalog';
import { MAX_ROOM_LEVEL } from '../building/upgrades';

export const STARTING_COINS = 1500;
export const DEMO_BONUS_COINS = 500;

// Prototype balancing values. Later, the server will own the price catalog.
export const BUILD_COSTS: Record<BuildableRoomType, number> = {
  recreation:150,
  guardPost:180,
  command: 300,
  laboratory: 200,
  waterTreatment: 180,
  ventilation: 200,
  kitchen: 160,
  habitat: 120,
  generator: 220,
  hydroponics: 150,
  medbay: 190,
  workshop: 170,
  storage: 100,
  mine: 210
};

export const DIG_COST = 35;

export function getBuildCost(type: BuildableRoomType): number {
  return BUILD_COSTS[type];
}

export function getFloorCost(currentHighestFloor: number): number {
  if (!Number.isInteger(currentHighestFloor) || currentHighestFloor < 0) {
    throw new Error('Invalid floor level');
  }
  return 300 + currentHighestFloor * 150;
}

// Level denotes the CURRENT room level before upgrading.
export function getUpgradeCost(type: RoomType, level: number): number {
  if (!Number.isInteger(level) || level < 1 || level >= MAX_ROOM_LEVEL) {
    throw new Error('Invalid room upgrade level');
  }
  const base = type === 'command' ? 250 : BUILD_COSTS[type];
  return base * (level + 1);
}

