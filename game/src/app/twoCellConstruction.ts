import type { TextureAsset } from './assets/assetManager';

/**
 * Generic two-cell room construction, without people or room-specific machinery.
 * Frames are ordered left-to-right, top-to-bottom in a four-column WebP atlas.
 * A successful build is committed immediately; only its visual reveal is delayed.
 */
export const TWO_CELL_CONSTRUCTION_ART_ASSET: TextureAsset = {
  key: 'two-cell-construction-art',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 80,
  filter: 'linear',
  variants: [
    { scale: 1, path: 'assets/rooms/construction-two-room.webp' },
    { scale: 2.5, path: 'assets/rooms/construction-two-room-hd.webp', frameWidth: 400, frameHeight: 200 }
  ]
};

export const CONSTRUCTION_FRAMES = 8;
export const CONSTRUCTION_FRAME_MS = 360;
export const CONSTRUCTION_DURATION_MS = CONSTRUCTION_FRAMES * CONSTRUCTION_FRAME_MS;

/** Presentation-only state: never stored in saves and never changes room placement. */
export class TwoCellConstructionAnimation {
  private readonly elapsedByRoom = new Map<string, number>();

  start(roomId: string, width: number, height: number, reducedMotion = false): boolean {
    if (!roomId || width !== 2 || height !== 1 || reducedMotion) return false;
    this.elapsedByRoom.set(roomId, 0);
    return true;
  }

  frame(roomId: string): number | null {
    const elapsed = this.elapsedByRoom.get(roomId);
    return elapsed === undefined ? null : Math.min(CONSTRUCTION_FRAMES - 1, Math.floor(elapsed / CONSTRUCTION_FRAME_MS));
  }

  cancel(roomId: string): void {
    this.elapsedByRoom.delete(roomId);
  }

  clear(): void {
    this.elapsedByRoom.clear();
  }

  get active(): boolean {
    return this.elapsedByRoom.size > 0;
  }

  /** Returns true only when a visible frame changes or an animation completes. */
  advance(deltaMs: number): boolean {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return false;
    let changed = false;
    for (const [roomId, elapsed] of this.elapsedByRoom) {
      const previous = this.frame(roomId);
      const next = elapsed + deltaMs;
      if (next >= CONSTRUCTION_DURATION_MS) {
        this.elapsedByRoom.delete(roomId);
        changed = true; // Reveal the completed, room-specific interior.
      } else {
        this.elapsedByRoom.set(roomId, next);
        if (this.frame(roomId) !== previous) changed = true;
      }
    }
    return changed;
  }
}
