/**
 * Asset loading and texture resolution for Phaser, with a small testable
 * interface so quality selection does not depend on Phaser or the DOM.
 */
export interface ImageVariant {
  readonly scale: number;
  readonly path: string;
  /** Override when the source does not scale to exact integer frame dimensions. */
  readonly frameWidth?: number;
  readonly frameHeight?: number;
}

export type TextureAsset = Readonly<{
  key: string;
  filter: 'linear' | 'nearest';
  variants: readonly ImageVariant[];
} & (
  | { kind: 'image' }
  | { kind: 'spritesheet'; frameWidth: number; frameHeight: number; margin?: number; spacing?: number }
)>;

export interface LoaderPort {
  image(key: string, url: string): unknown;
  spritesheet(key: string, url: string, config: {
    frameWidth: number;
    frameHeight: number;
    margin?: number;
    spacing?: number;
  }): unknown;
}

export interface TextureRegistry {
  exists(key: string): boolean;
  get(key: string): {
    has(frame: string): boolean;
    setFilter(mode: number): unknown;
  };
}

export interface ResolvedTexture {
  readonly key: string;
  readonly frame?: string | number;
}

export function variantTextureKey(asset: TextureAsset, variant: ImageVariant): string {
  return asset.key + '@' + variant.scale + 'x';
}

/** Prefer the smallest source that meets the target; always queue 1x fallback. */
export function chooseVariants(asset: TextureAsset, desiredScale: number): ImageVariant[] {
  if (asset.variants.length === 0) throw new Error('No variants for asset: ' + asset.key);
  const sorted = [...asset.variants].sort((a, b) => a.scale - b.scale);
  if (sorted.some((item) => !Number.isFinite(item.scale) || item.scale < 1 || !item.path)) {
    throw new Error('Invalid asset variant: ' + asset.key);
  }
  if (new Set(sorted.map((item) => item.scale)).size !== sorted.length) {
    throw new Error('Duplicate asset scale: ' + asset.key);
  }
  const target = Number.isFinite(desiredScale) && desiredScale > 0 ? desiredScale : 1;
  const preferred = sorted.find((item) => item.scale >= target) ?? sorted[sorted.length - 1];
  const fallback = sorted.find((item) => item.scale === 1) ?? sorted[0];
  return preferred.scale === fallback.scale ? [preferred] : [preferred, fallback];
}

export function assetUrl(baseUrl: string, relativePath: string): string {
  return (baseUrl.endsWith('/') ? baseUrl : baseUrl + '/') + relativePath.replace(/^\/+/, '');
}

/**
 * The requested density is camera max zoom multiplied by device pixel ratio
 * (capped by the caller for texture memory). A missing high-density file
 * never prevents the bundled 1x sprite sheet from being used.
 */
export class AssetManager {
  private readonly selected = new Map<string, readonly ImageVariant[]>();
  private readonly enqueued = new Set<string>();

  constructor(
    private readonly assets: readonly TextureAsset[],
    private readonly baseUrl: string,
    desiredScale: number
  ) {
    for (const asset of assets) {
      if (this.selected.has(asset.key)) throw new Error('Duplicate asset key: ' + asset.key);
      this.selected.set(asset.key, chooseVariants(asset, desiredScale));
    }
  }

  preload(loader: LoaderPort, textures: TextureRegistry): void {
    for (const asset of this.assets) {
      for (const variant of this.selected.get(asset.key) ?? []) {
        const key = variantTextureKey(asset, variant);
        if (textures.exists(key) || this.enqueued.has(key)) continue;
        this.enqueued.add(key);
        const url = assetUrl(this.baseUrl, variant.path);
        if (asset.kind === 'image') {
          loader.image(key, url);
        } else {
          const scale = variant.scale;
          loader.spritesheet(key, url, {
            frameWidth: variant.frameWidth ?? asset.frameWidth * scale,
            frameHeight: variant.frameHeight ?? asset.frameHeight * scale,
            margin: (asset.margin ?? 0) * scale,
            spacing: (asset.spacing ?? 0) * scale
          });
        }
      }
    }
  }

  configureFilters(textures: TextureRegistry, linear: number, nearest: number): void {
    for (const asset of this.assets) {
      for (const variant of this.selected.get(asset.key) ?? []) {
        const key = variantTextureKey(asset, variant);
        if (textures.exists(key)) {
          textures.get(key).setFilter(asset.filter === 'linear' ? linear : nearest);
        }
      }
    }
  }

  /** Return null on a missing texture OR frame; the scene draws its fallback. */
  resolve(key: string, textures: TextureRegistry, frame?: number | string): ResolvedTexture | null {
    const asset = this.assets.find((entry) => entry.key === key);
    if (!asset) return null;
    for (const variant of this.selected.get(key) ?? []) {
      const textureKey = variantTextureKey(asset, variant);
      if (!textures.exists(textureKey)) continue;
      if (frame === undefined || textures.get(textureKey).has(String(frame))) {
        return { key: textureKey, ...(frame === undefined ? {} : { frame }) };
      }
    }
    return null;
  }
}
