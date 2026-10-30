import type { RoomType } from '../modules/building/catalog';
import type { TextureAsset } from './assets/assetManager';

// Six frames in fixed order. High-quality original-art HD image is preferred;
// the smaller, previously published WebP remains a network/GPU fallback.
export const ROOM_ART_ASSET: TextureAsset = {
  key: 'room-art',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/room-atlas.webp' },
    { scale: 6.4, path: 'assets/rooms/room-atlas-hd.webp', frameWidth: 1024, frameHeight: 341 }
  ]
};

export const ROOM_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  habitat: 0,
  command: 1,
  workshop: 2,
  storage: 3,
  generator: 4,
  mine: 5
};

/** Two illustrated rooms, in order: hydroponics, medbay. */
export const GARDEN_MEDBAY_ART_ASSET: TextureAsset = {
  key: 'garden-medbay-art',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/garden-medbay-atlas.webp' },
    { scale: 6.4, path: 'assets/rooms/garden-medbay-atlas-hd.webp',
      frameWidth: 1024, frameHeight: 341 }
  ]
};

export const GARDEN_MEDBAY_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  hydroponics: 0,
  medbay: 1
};
