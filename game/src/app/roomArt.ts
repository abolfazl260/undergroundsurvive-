import type { RoomType } from '../modules/building/catalog';

// The single WebP atlas avoids six network requests on mobile.
// Frame order: habitat, command, workshop, storage, generator, mine.
export const ROOM_ATLAS_KEY = 'room-art';
export const ROOM_ATLAS_URL = `${import.meta.env.BASE_URL}assets/rooms/room-atlas.webp`;
export const ROOM_ATLAS_FRAME_WIDTH = 160;
export const ROOM_ATLAS_FRAME_HEIGHT = 53;

export const ROOM_FRAME_BY_TYPE: Partial<Record<RoomType, number>> = {
  habitat: 0,
  command: 1,
  workshop: 2,
  storage: 3,
  generator: 4,
  mine: 5
};
