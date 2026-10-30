import { describe, expect, it } from 'vitest';
import { BuildingLayout, type BaseSnapshot } from './layout';
import { connectedRoomIds, CONNECTED_ROOM_REASON, DISCONNECTION_REASON } from './connectivity';
import { GameSession } from '../economy/session';

/** Empty excavated floor with a connected elevator in the middle, for testing both directions. */
function middleShaft(): BuildingLayout {
  const snapshot = new BuildingLayout().snapshot();
  const base: BaseSnapshot = {
    ...snapshot,
    rooms: [],
    terrain: {
      ...snapshot.terrain,
      elevators: [{ x: 7, y: 0 }, { x: 7, y: -1 }, { x: 7, y: -2 }],
      excavated: [...snapshot.terrain.excavated, { x: 7, y: -2 }, { x: 8, y: -2 }, { x: 9, y: -2 }]
        .filter((cell, index, all) =>
          all.findIndex((candidate) => candidate.x === cell.x && candidate.y === cell.y) === index)
    }
  };
  const layout = BuildingLayout.restore(base);
  expect(layout).not.toBeNull();
  return layout!;
}

describe('connected room expansion (#58)', () => {
  it('seeds all new-game rooms with an uninterrupted route to the elevator', () => {
    const layout = new BuildingLayout();
    expect(layout.disconnectedRoomIds).toEqual([]);
    expect(connectedRoomIds(layout.rooms, layout.terrain).size).toBe(layout.rooms.length);
    expect(BuildingLayout.restore(layout.snapshot())?.disconnectedRoomIds).toEqual([]);
  });

  it('accepts first rooms on either side of a shaft, followed by left/right chains', () => {
    const layout = middleShaft();
    expect(layout.place('habitat', 5, -1).ok).toBe(true); // Left edge touches shaft x7.
    expect(layout.place('medbay', 8, -1).ok).toBe(true); // Right edge touches shaft x7.
    expect(layout.place('storage', 3, -1).ok).toBe(true);
    expect(layout.place('workshop', 10, -1).ok).toBe(true);
    expect(layout.disconnectedRoomIds).toEqual([]);
  });

  it('rejects a gap on already excavated and unlocked floors without any mutation', () => {
    const layout = middleShaft();
    const before = layout.snapshot();
    expect(layout.canPlace('habitat', 10, -1)).toEqual({ ok: false, reason: CONNECTED_ROOM_REASON });
    expect(layout.place('habitat', 10, -1)).toEqual({ ok: false, reason: CONNECTED_ROOM_REASON });
    expect(layout.canPlace('habitat', 1, -1).ok).toBe(false);
    expect(layout.snapshot()).toEqual(before);
    expect(layout.place('habitat', 8, -1).ok).toBe(true);
    expect(layout.place('storage', 12, -1).ok).toBe(false);
    expect(layout.place('storage', 10, -1).ok).toBe(true);
    expect(layout.place('storage', 12, -1).ok).toBe(true);
  });

  it('does not interpret diagonal/vertical contact or an orphaned neighbor as a valid attachment', () => {
    const layout = middleShaft();
    expect(layout.place('habitat', 8, -2).ok).toBe(true);
    expect(layout.place('habitat', 10, -1).ok).toBe(false); // Only diagonally touches the room below.
    const legacy = layout.snapshot();
    legacy.rooms.push({ id: 'legacy-island', type: 'habitat', x: 12, y: -1, width: 2, height: 1, level: 1 });
    const restored = BuildingLayout.restore(legacy)!;
    expect(restored.disconnectedRoomIds).toContain('legacy-island');
    expect(restored.place('storage', 10, -1).ok).toBe(false); // Adjacent only to an orphan.
    expect(restored.place('storage', 8, -1).ok).toBe(true);
    expect(restored.disconnectedRoomIds).toContain('legacy-island');
    expect(restored.place('storage', 10, -1).ok).toBe(true);
    expect(restored.disconnectedRoomIds).toEqual([]);
  });

  it('rejects deleting or relocating a bridge when that disconnects another room', () => {
    const layout = middleShaft();
    expect(layout.place('habitat', 8, -1).ok).toBe(true);
    const bridge = layout.getRoomAt(8, -1)!.id;
    expect(layout.place('medbay', 10, -1).ok).toBe(true);
    const before = layout.snapshot();
    expect(layout.canRemove(bridge)).toEqual({ ok: false, reason: DISCONNECTION_REASON });
    expect(layout.remove(bridge)).toEqual({ ok: false, reason: DISCONNECTION_REASON });
    expect(layout.canMove(bridge, 5, -1)).toEqual({ ok: false, reason: DISCONNECTION_REASON });
    expect(layout.move(bridge, 5, -1).ok).toBe(false);
    expect(layout.snapshot()).toEqual(before);
    expect(layout.remove(layout.getRoomAt(10, -1)!.id).ok).toBe(true);
    expect(layout.remove(bridge).ok).toBe(true);
  });

  it('loads historical disconnected rooms in any order without deleting them', () => {
    const legacy = new BuildingLayout().snapshot();
    legacy.rooms.push({ id: 'legacy-isolated', type: 'habitat', x: 10, y: -2, width: 2, height: 1, level: 1 });
    const loaded = BuildingLayout.restore(legacy)!;
    expect(loaded.disconnectedRoomIds).toEqual(['legacy-isolated']);
    expect(loaded.snapshot()).toEqual(legacy);
    const reversed = { ...legacy, rooms: [...legacy.rooms].reverse() };
    expect(BuildingLayout.restore(reversed)?.snapshot()).toEqual(reversed);
    expect(loaded.place('medbay', 8, -1).ok).toBe(true);
    expect(loaded.disconnectedRoomIds).toEqual(['legacy-isolated']);
    expect(loaded.move('legacy-isolated', 8, -2).ok).toBe(false);
  });

  it('preserves the wallet and complete snapshot on invalid build and move', () => {
    const game = GameSession.create();
    const initial = game.snapshot();
    expect(game.build('habitat', 10, -1).ok).toBe(false);
    expect(game.snapshot()).toEqual(initial);
    expect(game.build('habitat', 8, -1).ok).toBe(true);
    const after = game.snapshot();
    const id = game.layout.getRoomAt(8, -1)!.id;
    expect(game.moveRoom(id, 9, -1).ok).toBe(false);
    expect(game.snapshot()).toEqual(after);
  });

  it('permits a move to the opposite side when no reachable rooms are stranded', () => {
    const layout = middleShaft();
    expect(layout.place('habitat', 5, -1).ok).toBe(true);
    const id = layout.getRoomAt(5, -1)!.id;
    expect(layout.move(id, 8, -1).ok).toBe(true);
    expect(layout.disconnectedRoomIds).toEqual([]);
  });
});
