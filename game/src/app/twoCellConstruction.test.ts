import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { AssetManager } from './assets/assetManager';
import {
  CONSTRUCTION_DURATION_MS, CONSTRUCTION_FRAME_MS, CONSTRUCTION_FRAMES,
  TWO_CELL_CONSTRUCTION_ART_ASSET, TwoCellConstructionAnimation
} from './twoCellConstruction';

describe('generic two-cell construction art', () => {
  it('uses 8 consistent 2:1 frames, with retina WebP and light mobile fallback', () => {
    expect(CONSTRUCTION_FRAMES).toBe(8);
    expect(TWO_CELL_CONSTRUCTION_ART_ASSET.kind).toBe('spritesheet');
    if (TWO_CELL_CONSTRUCTION_ART_ASSET.kind !== 'spritesheet') throw new Error('Missing spritesheet');
    expect([TWO_CELL_CONSTRUCTION_ART_ASSET.frameWidth, TWO_CELL_CONSTRUCTION_ART_ASSET.frameHeight]).toEqual([160, 80]);
    expect(TWO_CELL_CONSTRUCTION_ART_ASSET.variants.map(v => v.scale)).toEqual([1, 2.5]);
    for (const variant of TWO_CELL_CONSTRUCTION_ART_ASSET.variants) {
      const path = 'public/' + variant.path;
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
      expect(bytes.byteLength).toBeLessThan(180_000);
    }
    const loader = { image: () => {}, spritesheet: vi.fn() };
    const manager = new AssetManager([TWO_CELL_CONSTRUCTION_ART_ASSET], '/', 4);
    manager.preload(loader, { exists: () => false, get: () => ({ has: () => false, setFilter: () => {} }) });
    expect(loader.spritesheet).toHaveBeenCalledWith(
      'two-cell-construction-art@2.5x', '/assets/rooms/construction-two-room-hd.webp',
      { frameWidth: 400, frameHeight: 200, margin: 0, spacing: 0 }
    );
    expect(loader.spritesheet).toHaveBeenCalledWith(
      'two-cell-construction-art@1x', '/assets/rooms/construction-two-room.webp',
      { frameWidth: 160, frameHeight: 80, margin: 0, spacing: 0 }
    );
  });

  it('plays eight frames and then exposes the completed room', () => {
    const animation = new TwoCellConstructionAnimation();
    expect(animation.start('new-room', 2, 1)).toBe(true);
    expect(animation.frame('new-room')).toBe(0);
    for (let index = 1; index < CONSTRUCTION_FRAMES; index++) {
      expect(animation.advance(CONSTRUCTION_FRAME_MS)).toBe(true);
      expect(animation.frame('new-room')).toBe(index);
    }
    expect(animation.advance(CONSTRUCTION_FRAME_MS)).toBe(true);
    expect(animation.frame('new-room')).toBeNull();
    expect(animation.active).toBe(false);
  });

  it('does not animate other widths or reduced-motion rooms', () => {
    const animation = new TwoCellConstructionAnimation();
    expect(animation.start('small', 1, 1)).toBe(false);
    expect(animation.start('command', 3, 1)).toBe(false);
    expect(animation.start('accessible', 2, 1, true)).toBe(false);
    expect(animation.frame('command')).toBeNull();
    expect(animation.active).toBe(false);
  });

  it('preserves concurrent progress on redraw, pauses on zero delta, and clears on reset', () => {
    const animation = new TwoCellConstructionAnimation();
    animation.start('a', 2, 1);
    animation.advance(CONSTRUCTION_FRAME_MS);
    animation.start('b', 2, 1);
    expect(animation.advance(0)).toBe(false);
    expect(animation.advance(Number.NaN)).toBe(false);
    expect([animation.frame('a'), animation.frame('b')]).toEqual([1, 0]);
    animation.advance(CONSTRUCTION_FRAME_MS);
    expect([animation.frame('a'), animation.frame('b')]).toEqual([2, 1]);
    animation.cancel('a');
    expect(animation.frame('a')).toBeNull();
    expect(animation.active).toBe(true);
    animation.clear();
    expect(animation.active).toBe(false);
    expect(animation.advance(CONSTRUCTION_DURATION_MS)).toBe(false);
  });

  it('does not replay construction on save restore or force full room graphics during a build', () => {
    const scene = readFileSync('src/app/GameScene.ts', 'utf8');
    expect(scene).toContain('this.construction.start(');
    expect(scene).toContain('this.construction.advance(delta)');
    expect(scene).toContain('this.construction.clear()');
    expect(scene).toContain('if (constructionArt) {');
    expect(scene).toContain('this.roomLayer.add(constructionSprite)');
  });
});
