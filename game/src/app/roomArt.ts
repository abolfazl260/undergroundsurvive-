import type { RoomType } from '../modules/building/catalog';

// High-resolution WebP atlas built from original 2172×724 artwork; one request for all six rooms.
// 1024px-wide frames retain detail at 250% camera zoom on high-DPI screens.
// Frame order: habitat, command, workshop, storage, generator, mine.
export const ROOM_ATLAS_KEY = 'room-art';
export const ROOM_ATLAS_URL = `${import.meta.env.BASE_URL}assets/rooms/room-atlas-hd.webp`;
export const ROOM_ATLAS_FRAME_WIDTH = 1024;
export const ROOM_ATLAS_FRAME_HEIGHT = 341;

export const ROOM_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  habitat: 0,
  command: 1,
  workshop: 2,
  storage: 3,
  generator: 4,
  mine: 5
};
