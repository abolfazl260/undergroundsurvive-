import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { AssetManager } from './assets/assetManager';
import {
  DIGGING_ART_ASSET, DIGGING_BUILD_MS, DIGGING_CROSSFADE_MS, DIGGING_DURATION_MS,
  DIGGING_FRAME_MS, DIGGING_FRAMES, DIGGING_REVEAL_MS, DiggingAnimation
} from './diggingAnimation';

describe('excavation-only 8-frame WebP animation', () => {
  it('ships eight square excavation panels with no loading dependency on construction art', () => {
    expect(DIGGING_FRAMES).toBe(8);
    expect(DIGGING_ART_ASSET.kind).toBe('spritesheet');
    if (DIGGING_ART_ASSET.kind !== 'spritesheet') throw new Error('Expected a spritesheet');
    expect([DIGGING_ART_ASSET.frameWidth, DIGGING_ART_ASSET.frameHeight]).toEqual([192, 192]);
    expect(DIGGING_ART_ASSET.variants).toHaveLength(1);
    const variant = DIGGING_ART_ASSET.variants[0];
    const path = 'public/' + variant.path;
    expect(existsSync(path)).toBe(true);
    const bytes = readFileSync(path);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
    expect(bytes.toString('ascii', 12, 16)).toBe('VP8 ');
    expect(bytes.readUInt16LE(26) & 0x3fff).toBe(192 * 4);
    expect(bytes.readUInt16LE(28) & 0x3fff).toBe(192 * 2);
    expect(bytes.byteLength).toBeLessThan(90_000);
    const loader = { image: vi.fn(), spritesheet: vi.fn() };
    const manager = new AssetManager([DIGGING_ART_ASSET], '/', 4);
    manager.preload(loader, { exists: () => false, get: () => ({ has: () => false, setFilter: () => {} }) });
    expect(loader.spritesheet).toHaveBeenCalledWith(
      'underground-digging@1x',
      '/assets/terrain/underground-digging.webp',
      { frameWidth: 192, frameHeight: 192, margin: 0, spacing: 0 }
    );
  });

  it('plays all eight steps and fades out into the already-excavated cell', () => {
    const animation = new DiggingAnimation();
    expect(DIGGING_DURATION_MS).toBe(DIGGING_BUILD_MS + DIGGING_REVEAL_MS);
    expect(DIGGING_CROSSFADE_MS).toBeLessThan(DIGGING_FRAME_MS);
    expect(animation.start('2:-3')).toBe(true);
    expect(animation.visual('2:-3')).toMatchObject({
      frame: 0, nextFrame: 1, blend: 0, reveal: 0, progress: 0
    });
    for (let frame = 1; frame < DIGGING_FRAMES; frame++) {
      expect(animation.advance(DIGGING_FRAME_MS)).toEqual([]);
      expect(animation.visual('2:-3')?.frame).toBe(frame);
    }
    expect(animation.advance(DIGGING_FRAME_MS)).toEqual([]);
    expect(animation.visual('2:-3')?.reveal).toBe(0);
    expect(animation.advance(DIGGING_REVEAL_MS / 2)).toEqual([]);
    expect(animation.visual('2:-3')?.reveal).toBeCloseTo(0.5, 5);
    expect(animation.advance(DIGGING_REVEAL_MS / 2)).toEqual(['2:-3']);
    expect(animation.active).toBe(false);
    expect(animation.visual('2:-3')).toBeNull();
  });

  it('blends only during the end of a frame, and handles simultaneous dig sites', () => {
    const animation = new DiggingAnimation();
    animation.start('2:-2');
    animation.advance(DIGGING_FRAME_MS - DIGGING_CROSSFADE_MS);
    expect(animation.visual('2:-2')?.blend).toBe(0);
    animation.advance(DIGGING_CROSSFADE_MS / 2);
    expect(animation.visual('2:-2')?.blend).toBeCloseTo(0.5, 5);
    animation.start('3:-2');
    animation.advance(DIGGING_CROSSFADE_MS / 2);
    expect(animation.visual('2:-2')?.frame).toBe(1);
    expect(animation.visual('3:-2')?.frame).toBe(0);
    animation.cancel('2:-2');
    expect(animation.active).toBe(true);
    animation.clear();
    expect(animation.active).toBe(false);
  });

  it('is presentation-only: reduced motion, invalid delta and long lag do not skip gameplay', () => {
    const animation = new DiggingAnimation();
    expect(animation.start('1:-1', true)).toBe(false);
    expect(animation.start('')).toBe(false);
    expect(animation.start('1:-1')).toBe(true);
    expect(animation.advance(0)).toEqual([]);
    expect(animation.advance(Number.NaN)).toEqual([]);
    expect(animation.advance(100_000)).toEqual([]);
    expect(animation.visual('1:-1')?.elapsedMs).toBe(1000);
    expect(animation.active).toBe(true);
  });

  it('is triggered only on successful dig, and clears on reset/reduced-motion', () => {
    const source = readFileSync('src/app/GameScene.ts', 'utf8');
    expect(source).toContain('if (this.mode === \'dig\') this.startDigging(x, y)');
    expect(source).toContain('if (!texture) return; // Never block excavation');
    expect(source).toContain('this.digging.advance(delta)');
    expect(source).toContain('this.clearDiggingViews()');
    expect(source).toContain('this.digging.clear()');
    expect(source).toContain('this.diggingLayer = this.add.container(0, 0).setDepth(2.9)');
    expect(source).toContain('this.diggingViews.set(key,');
  });
});
