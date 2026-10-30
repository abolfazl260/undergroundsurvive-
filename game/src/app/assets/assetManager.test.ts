import { describe, expect, it, vi } from 'vitest';
import {
  AssetManager, assetUrl, chooseVariants, variantTextureKey,
  type LoaderPort, type TextureAsset, type TextureRegistry
} from './assetManager';
import { ROOM_ART_ASSET, ROOM_FRAME_BY_TYPE, GARDEN_MEDBAY_ART_ASSET, GARDEN_MEDBAY_FRAME_BY_TYPE } from '../roomArt';

const art: TextureAsset = {
  key: 'rooms',
  kind: 'spritesheet',
  frameWidth: 160,
  frameHeight: 53,
  filter: 'linear',
  variants: [
    { scale: 4, path: 'assets/rooms/atlas@4x.webp' },
    { scale: 1, path: 'assets/rooms/atlas.webp' },
    { scale: 2, path: 'assets/rooms/atlas@2x.webp' }
  ]
};

function createLoader(): LoaderPort & {
  image: ReturnType<typeof vi.fn>;
  spritesheet: ReturnType<typeof vi.fn>;
} {
  return { image: vi.fn(), spritesheet: vi.fn() };
}

function createTextures(available: Record<string, string[]>): TextureRegistry {
  return {
    exists: (key) => Object.hasOwn(available, key),
    get: (key) => ({
      has: (frame) => available[key]?.includes(frame) ?? false,
      setFilter: vi.fn()
    })
  };
}

describe('asset quality selection', () => {
  it('chooses the smallest adequate density, with the baseline fallback', () => {
    expect(chooseVariants(art, 0.75).map((v) => v.scale)).toEqual([1]);
    expect(chooseVariants(art, 1.3).map((v) => v.scale)).toEqual([2, 1]);
    expect(chooseVariants(art, 3.7).map((v) => v.scale)).toEqual([4, 1]);
    expect(chooseVariants(art, 8).map((v) => v.scale)).toEqual([4, 1]);
    expect(chooseVariants(art, Number.NaN).map((v) => v.scale)).toEqual([1]);
  });

  it('rejects an invalid or ambiguous manifest', () => {
    expect(() => chooseVariants({ ...art, variants: [] }, 2)).toThrow('No variants');
    expect(() => chooseVariants({ ...art, variants: [art.variants[0], art.variants[0]] }, 2))
      .toThrow('Duplicate asset scale');
    expect(() => chooseVariants({ ...art, variants: [{ scale: 0, path: 'x' }] }, 2))
      .toThrow('Invalid asset variant');
  });

  it('resolves URLs for GitHub Pages subpaths', () => {
    expect(assetUrl('/undergroundsurvive-/', '/assets/rooms/a.webp'))
      .toBe('/undergroundsurvive-/assets/rooms/a.webp');
    expect(variantTextureKey(art, art.variants[0])).toBe('rooms@4x');
  });
});

describe('AssetManager', () => {
  it('preloads the selected sprite sheet and 1x fallback once with scaled frames', () => {
    const assets = new AssetManager([art], '/undergroundsurvive-/', 2.5);
    const loader = createLoader();
    const textures = createTextures({});
    assets.preload(loader, textures);
    assets.preload(loader, textures);
    expect(loader.spritesheet).toHaveBeenCalledTimes(2);
    expect(loader.spritesheet).toHaveBeenNthCalledWith(
      1, 'rooms@4x', '/undergroundsurvive-/assets/rooms/atlas@4x.webp',
      { frameWidth: 640, frameHeight: 212, margin: 0, spacing: 0 }
    );
    expect(loader.spritesheet).toHaveBeenNthCalledWith(
      2, 'rooms@1x', '/undergroundsurvive-/assets/rooms/atlas.webp',
      { frameWidth: 160, frameHeight: 53, margin: 0, spacing: 0 }
    );
  });

  it('uses the sharpest loaded frame and safely falls back on network or frame failures', () => {
    const assets = new AssetManager([art], '/', 3);
    const both = createTextures({ 'rooms@4x': ['0'], 'rooms@1x': ['0', '1'] });
    expect(assets.resolve('rooms', both, 0)).toEqual({ key: 'rooms@4x', frame: 0 });
    expect(assets.resolve('rooms', both, 1)).toEqual({ key: 'rooms@1x', frame: 1 });
    expect(assets.resolve('rooms', both, 6)).toBeNull();
    expect(assets.resolve('rooms', createTextures({}), 0)).toBeNull();
    expect(assets.resolve('unknown', both, 0)).toBeNull();
  });

  it('supports standalone images and applies filtering only to loaded assets', () => {
    const picture: TextureAsset = {
      key: 'cover', kind: 'image', filter: 'nearest',
      variants: [{ scale: 1, path: 'assets/cover.webp' }]
    };
    const assets = new AssetManager([art, picture], '/', 2);
    const loader = createLoader();
    const filter = vi.fn();
    const registry: TextureRegistry = {
      exists: (key) => key === 'rooms@1x' || key === 'cover@1x',
      get: () => ({ has: () => true, setFilter: filter })
    };
    assets.preload(loader, registry);
    expect(loader.spritesheet).toHaveBeenCalledTimes(1);
    expect(loader.image).not.toHaveBeenCalled();
    assets.configureFilters(registry, 1, 0);
    expect(filter.mock.calls).toEqual([[1], [0]]);
    expect(assets.resolve('cover', registry)).toEqual({ key: 'cover@1x' });
  });

  it('uses the committed HD atlas while retaining the 1x fallback and room order', () => {
    const manager = new AssetManager([ROOM_ART_ASSET], '/undergroundsurvive-/', 4);
    const loader = createLoader();
    manager.preload(loader, createTextures({}));
    expect(loader.spritesheet).toHaveBeenNthCalledWith(
      1, 'room-art@6.4x', '/undergroundsurvive-/assets/rooms/room-atlas-hd.webp',
      { frameWidth: 1024, frameHeight: 341, margin: 0, spacing: 0 }
    );
    expect(loader.spritesheet).toHaveBeenCalledTimes(2);
    expect(ROOM_ART_ASSET.variants).toHaveLength(2);
    expect(Object.values(ROOM_FRAME_BY_TYPE).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('garden and medbay room artwork', () => {
  it('maps the existing room types to different frames', () => {
    expect(GARDEN_MEDBAY_FRAME_BY_TYPE.hydroponics).toBe(0);
    expect(GARDEN_MEDBAY_FRAME_BY_TYPE.medbay).toBe(1);
    expect(ROOM_FRAME_BY_TYPE.hydroponics).toBeUndefined();
    expect(ROOM_FRAME_BY_TYPE.medbay).toBeUndefined();
    expect(GARDEN_MEDBAY_ART_ASSET.key).not.toBe(ROOM_ART_ASSET.key);
  });
  it('preloads high-definition and fallback frames', () => {
    const manager = new AssetManager([ROOM_ART_ASSET, GARDEN_MEDBAY_ART_ASSET], '/', 4);
    const loader = createLoader();
    manager.preload(loader, createTextures({}));
    expect(loader.spritesheet).toHaveBeenCalledWith(
      'garden-medbay-art@6.4x', '/assets/rooms/garden-medbay-atlas-hd.webp',
      { frameWidth: 1024, frameHeight: 341, margin: 0, spacing: 0 }
    );
    expect(loader.spritesheet).toHaveBeenCalledWith(
      'garden-medbay-art@1x', '/assets/rooms/garden-medbay-atlas.webp',
      { frameWidth: 160, frameHeight: 53, margin: 0, spacing: 0 }
    );
    const frames = createTextures({ 'garden-medbay-art@6.4x': ['0', '1'] });
    expect(manager.resolve('garden-medbay-art', frames, 0))
      .toEqual({ key: 'garden-medbay-art@6.4x', frame: 0 });
    expect(manager.resolve('garden-medbay-art', frames, 1))
      .toEqual({ key: 'garden-medbay-art@6.4x', frame: 1 });
    expect(manager.resolve('garden-medbay-art',
      createTextures({ 'garden-medbay-art@1x': ['0', '1'] }), 1))
      .toEqual({ key: 'garden-medbay-art@1x', frame: 1 });
    expect(manager.resolve('garden-medbay-art', createTextures({}), 1)).toBeNull();
  });
});
