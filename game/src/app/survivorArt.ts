import type { TextureAsset } from './assets/assetManager';
import { WORLD } from '../modules/world/grid';

/** Art contract: six poses per survivor, three variants, trimmed shared cells. */
export const SURVIVOR_ART: TextureAsset = {
  key: 'survivors', kind: 'spritesheet', frameWidth: 128, frameHeight: 192,
  filter: 'linear', variants: [{ scale: 1, path: 'assets/characters/survivors.webp' }]
};
export const ROOM_INTERIOR = { ceiling: 13, floor: 44, heightRatio: 0.56 } as const;
export function survivorGeometry(cellHeight = WORLD.cellSize) {
  const interior = cellHeight * (ROOM_INTERIOR.floor - ROOM_INTERIOR.ceiling) / WORLD.cellSize;
  const height = Math.max(12, Math.min(40, interior * ROOM_INTERIOR.heightRatio));
  return { height, width: height * 128 / 192,
    feetOffset: cellHeight * (ROOM_INTERIOR.floor - 36) / WORLD.cellSize };
}
export function survivorFrame(variant: number, state: 'idle' | 'walk' | 'work', time: number, reduced = false): number {
  const offset = state === 'walk' ? 2 : state === 'work' ? 4 : 0;
  return (Math.abs(variant) % 3) * 6 + offset + (reduced ? 0 : Math.floor(Math.max(0, time) / (state === 'walk' ? 150 : 500)) % 2);
}
export function hitSurvivor(feet: {x:number;y:number}, point: {x:number;y:number}, zoom: number): boolean {
  const { height, width, feetOffset } = survivorGeometry();
  const radius = Math.max(width / 2, 13 / Math.max(0.5, zoom));
  return Math.abs(point.x - feet.x) <= radius &&
    point.y >= feet.y + feetOffset - Math.max(height, 28 / Math.max(0.5, zoom)) &&
    point.y <= feet.y + feetOffset + 5;
}
