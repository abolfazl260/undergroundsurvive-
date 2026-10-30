import { ROOM_DEFINITIONS, type BuildableRoomType } from './catalog';
import { validatePlacement, type PlacementResult, type Room } from './placement';

const STARTER_ROOMS: Room[] = [
  { id: 'initial-command', type: 'command', x: 5, y: -1, width: 3, height: 1, level: 1 },
  { id: 'initial-power', type: 'generator', x: 1, y: -2, width: 2, height: 1, level: 1 },
  { id: 'initial-habitat', type: 'habitat', x: 10, y: -2, width: 2, height: 1, level: 1 },
  { id: 'initial-garden', type: 'hydroponics', x: 2, y: 0, width: 2, height: 1, level: 1 }
];

export class BuildingLayout {
  private data: Room[] = STARTER_ROOMS.map((room) => ({ ...room }));
  private sequence = 0;

  get rooms(): readonly Room[] {
    return this.data;
  }

  canPlace(type: BuildableRoomType, x: number, y: number): PlacementResult {
    return validatePlacement(this.data, type, x, y);
  }

  place(type: BuildableRoomType, x: number, y: number): PlacementResult {
    const result = this.canPlace(type, x, y);
    if (!result.ok) return result;
    const definition = ROOM_DEFINITIONS[type];
    this.data.push({
      id: 'demo-' + ++this.sequence, type, x, y,
      width: definition.width, height: definition.height, level: 1
    });
    return { ok: true };
  }

  reset(): void {
    this.sequence = 0;
    this.data = STARTER_ROOMS.map((room) => ({ ...room }));
  }
}

