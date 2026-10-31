import type { TextureAsset } from './assets/assetManager';

/**
 * Generic two-cell room construction, without people or room-specific machinery.
 * Frames are ordered left-to-right, top-to-bottom in a four-column WebP atlas.
 * Successful builds and upgrades commit immediately; only the final image reveal is delayed.
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
// Slower, deliberate construction: 5.76s of building + 0.52s reveal.
export const CONSTRUCTION_FRAME_MS = 720;
export const CONSTRUCTION_FADE_MS = 330;
export const CONSTRUCTION_REVEAL_MS = 520;
export const CONSTRUCTION_BUILD_MS = CONSTRUCTION_FRAMES * CONSTRUCTION_FRAME_MS;
export const CONSTRUCTION_DURATION_MS = CONSTRUCTION_BUILD_MS + CONSTRUCTION_REVEAL_MS;

export interface ConstructionVisualState {
  /** Current and next frames in the existing 8-frame atlas. */
  readonly frame: number;
  readonly nextFrame: number;
  /** 0..1 smoothstep alpha for the incoming construction frame. */
  readonly blend: number;
  /** 0..1 fade-out to reveal the final room, after all eight stages. */
  readonly reveal: number;
  readonly progress: number;
  /** Elapsed time, used solely for subtle deterministic lighting/dust. */
  readonly elapsedMs: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smoothstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/** Presentation-only state: never stored in saves and never changes room placement. */
export class TwoCellConstructionAnimation {
  private readonly elapsedByRoom = new Map<string, number>();
  /** Keep an upgrade's preceding art visible until the final construction reveal. */
  private readonly previousUpgradeLevel = new Map<string, number>();

  start(roomId: string, width: number, height: number, reducedMotion = false): boolean {
    if (!roomId || width !== 2 || height !== 1 || reducedMotion) return false;
    this.previousUpgradeLevel.delete(roomId);
    this.elapsedByRoom.set(roomId, 0);
    return true;
  }

  /** Use the exact build timeline for a successful two-cell upgrade. */
  startUpgrade(roomId: string, width: number, height: number, fromLevel: number, reducedMotion = false): boolean {
    if (!Number.isInteger(fromLevel) || fromLevel < 1) return false;
    if (!this.start(roomId, width, height, reducedMotion)) return false;
    this.previousUpgradeLevel.set(roomId, fromLevel);
    return true;
  }

  upgradeFromLevel(roomId: string): number | null {
    return this.previousUpgradeLevel.get(roomId) ?? null;
  }

  /** Continuous render state for two blended sprites and a subtle progress/effects layer. */
  visual(roomId: string): ConstructionVisualState | null {
    const elapsed = this.elapsedByRoom.get(roomId);
    if (elapsed === undefined) return null;

    if (elapsed >= CONSTRUCTION_BUILD_MS) {
      return {
        frame: CONSTRUCTION_FRAMES - 1,
        nextFrame: CONSTRUCTION_FRAMES - 1,
        blend: 0,
        reveal: smoothstep((elapsed - CONSTRUCTION_BUILD_MS) / CONSTRUCTION_REVEAL_MS),
        progress: 1,
        elapsedMs: elapsed
      };
    }

    const frame = Math.min(CONSTRUCTION_FRAMES - 1, Math.floor(elapsed / CONSTRUCTION_FRAME_MS));
    const withinFrame = elapsed - frame * CONSTRUCTION_FRAME_MS;
    // Keep each step fully legible before blending its successor.
    const blend = frame === CONSTRUCTION_FRAMES - 1 ? 0 : smoothstep(
      (withinFrame - (CONSTRUCTION_FRAME_MS - CONSTRUCTION_FADE_MS)) / CONSTRUCTION_FADE_MS
    );
    return {
      frame,
      nextFrame: Math.min(CONSTRUCTION_FRAMES - 1, frame + 1),
      blend,
      reveal: 0,
      progress: elapsed / CONSTRUCTION_BUILD_MS,
      elapsedMs: elapsed
    };
  }

  frame(roomId: string): number | null {
    return this.visual(roomId)?.frame ?? null;
  }

  cancel(roomId: string): void {
    this.elapsedByRoom.delete(roomId);
    this.previousUpgradeLevel.delete(roomId);
  }

  clear(): void {
    this.elapsedByRoom.clear();
    this.previousUpgradeLevel.clear();
  }

  get active(): boolean {
    return this.elapsedByRoom.size > 0;
  }

  /** Returns true only on completion, so the scene redraws finished rooms once. */
  advance(deltaMs: number): boolean {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return false;
    let completed = false;
    for (const [roomId, elapsed] of this.elapsedByRoom) {
      const next = elapsed + Math.min(deltaMs, 1000);
      if (next >= CONSTRUCTION_DURATION_MS) {
        this.cancel(roomId);
        completed = true;
      } else {
        this.elapsedByRoom.set(roomId, next);
      }
    }
    return completed;
  }
}
