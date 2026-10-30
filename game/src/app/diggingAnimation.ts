import type { TextureAsset } from './assets/assetManager';

/**
 * Pure excavation artwork: eight stages of drilling, rock breaking, debris
 * loading and clearing. No construction, room props, or above-ground scenery.
 * Frames are stored left-to-right, top-to-bottom in a 4 × 2 WebP atlas.
 */
export const DIGGING_ART_ASSET: TextureAsset = {
  key: 'underground-digging',
  kind: 'spritesheet',
  frameWidth: 192,
  frameHeight: 192,
  filter: 'linear',
  variants: [{ scale: 1, path: 'assets/terrain/underground-digging.webp' }]
};

export const DIGGING_FRAMES = 8;
export const DIGGING_FRAME_MS = 580;
export const DIGGING_CROSSFADE_MS = 270;
export const DIGGING_REVEAL_MS = 430;
export const DIGGING_BUILD_MS = DIGGING_FRAMES * DIGGING_FRAME_MS;
export const DIGGING_DURATION_MS = DIGGING_BUILD_MS + DIGGING_REVEAL_MS;

export interface DiggingVisual {
  readonly frame: number;
  readonly nextFrame: number;
  readonly blend: number;
  readonly reveal: number;
  readonly progress: number;
  readonly elapsedMs: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smoothstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/**
 * Visual-only state keyed by excavated cell. Terrain is committed immediately
 * so currency, save data and traversal never depend on a sprite finishing.
 */
export class DiggingAnimation {
  private readonly elapsedByCell = new Map<string, number>();

  start(key: string, reducedMotion = false): boolean {
    if (!key || reducedMotion) return false;
    this.elapsedByCell.set(key, 0);
    return true;
  }

  visual(key: string): DiggingVisual | null {
    const elapsedMs = this.elapsedByCell.get(key);
    if (elapsedMs === undefined) return null;
    if (elapsedMs >= DIGGING_BUILD_MS) {
      return {
        frame: DIGGING_FRAMES - 1, nextFrame: DIGGING_FRAMES - 1,
        blend: 0, reveal: smoothstep((elapsedMs - DIGGING_BUILD_MS) / DIGGING_REVEAL_MS),
        progress: 1, elapsedMs
      };
    }
    const frame = Math.min(DIGGING_FRAMES - 1, Math.floor(elapsedMs / DIGGING_FRAME_MS));
    const withinFrame = elapsedMs - frame * DIGGING_FRAME_MS;
    return {
      frame,
      nextFrame: Math.min(DIGGING_FRAMES - 1, frame + 1),
      blend: frame === DIGGING_FRAMES - 1 ? 0
        : smoothstep((withinFrame - (DIGGING_FRAME_MS - DIGGING_CROSSFADE_MS)) / DIGGING_CROSSFADE_MS),
      reveal: 0,
      progress: elapsedMs / DIGGING_BUILD_MS,
      elapsedMs
    };
  }

  advance(deltaMs: number): string[] {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return [];
    const complete: string[] = [];
    for (const [key, elapsed] of this.elapsedByCell) {
      const next = elapsed + Math.min(deltaMs, 1000);
      if (next >= DIGGING_DURATION_MS) {
        this.elapsedByCell.delete(key);
        complete.push(key);
      } else {
        this.elapsedByCell.set(key, next);
      }
    }
    return complete;
  }

  cancel(key: string): void { this.elapsedByCell.delete(key); }
  clear(): void { this.elapsedByCell.clear(); }
  get active(): boolean { return this.elapsedByCell.size > 0; }
}
