/**
 * Compose the cinematic cutaway for the *game's actual world coordinates*.
 *
 * The supplied artwork includes a pre-painted entrance and shaft at a
 * completely different position from the playable elevator. Erase that
 * decoration by sampling neighbouring scenery, then align the photographed
 * surface with the game's ground line. The only door/shaft left visible is
 * the interactive one drawn by elevatorArt.ts.
 *
 * No change to the cell grid, saved game data or elevator routes.
 */
export const BACKDROP_SOURCE = {
  width: 1920,
  height: 1200,
  surfaceY: 265,
  embeddedShaftEndX: 340,
  maskEndX: 430,
  sampleStartX: 465
} as const;

export interface BackgroundPlacement {
  width: number;
  height: number;
  ground: number;
  skylineTop: number;
  skylineHeight: number;
  rockHeight: number;
}

export function backgroundPlacement(
  worldWidth: number,
  worldHeight: number,
  groundLineY: number,
  textureScale = 2
): BackgroundPlacement {
  if (![worldWidth, worldHeight, groundLineY, textureScale].every(Number.isFinite) ||
      textureScale <= 0 || worldWidth <= 0 || worldHeight <= 0 ||
      groundLineY <= 0 || groundLineY >= worldHeight) {
    throw new Error('Invalid world dimensions for cinematic background');
  }
  const height = Math.round(worldHeight * textureScale);
  const ground = Math.round(groundLineY * textureScale);
  // The source skyline is one continuous strip. Splitting and repeating its
  // upper edge created a visible horizontal seam and duplicate buildings.
  return {
    width: Math.round(worldWidth * textureScale),
    height, ground, skylineTop: 0,
    skylineHeight: ground,
    rockHeight: height - ground
  };
}

/**
 * Reuse the existing high-definition source in a single canvas texture.
 * Drawing is done once during scene creation, never per animation frame.
 */
export function paintAlignedCinematicBackdrop(
  ctx: CanvasRenderingContext2D,
  original: CanvasImageSource,
  placement: BackgroundPlacement
): void {
  const { width, height, ground, skylineTop, skylineHeight, rockHeight } = placement;
  const { width: sw, height: sh, surfaceY } = BACKDROP_SOURCE;
  // A single uninterrupted skyline avoids duplicate buildings and sky seams.
  ctx.drawImage(original, 0, 0, sw, surfaceY, 0, skylineTop, width, skylineHeight);
  ctx.drawImage(original, 0, surfaceY, sw, sh - surfaceY,
    0, ground, width, rockHeight);

  // The left 340 source pixels contain a baked blast door and shaft that must
  // not be shown underneath the game's independently animated shaft. Replace
  // the entire column, including its sky and ground, with a feathered copy
  // of nearby *matching horizontal geological strata*.
  const factor = width / sw;
  const maskWidth = Math.min(width, Math.round(BACKDROP_SOURCE.maskEndX * factor));
  const solidWidth = Math.round(BACKDROP_SOURCE.embeddedShaftEndX * factor);
  const sourceX = Math.round(BACKDROP_SOURCE.sampleStartX * factor);
  const patch = ctx.canvas.ownerDocument.createElement('canvas');
  patch.width = maskWidth;
  patch.height = height;
  const patchCtx = patch.getContext('2d');
  if (!patchCtx) throw new Error('Unable to compose cinematic background');
  // Mirror the donor to avoid an obviously duplicated skyline silhouette.
  patchCtx.save();
  patchCtx.translate(maskWidth, 0);
  patchCtx.scale(-1, 1);
  patchCtx.drawImage(ctx.canvas, sourceX, 0, maskWidth, height,
    0, 0, maskWidth, height);
  patchCtx.restore();
  patchCtx.globalCompositeOperation = 'destination-in';
  const feather = patchCtx.createLinearGradient(solidWidth, 0, maskWidth, 0);
  feather.addColorStop(0, 'rgba(0,0,0,1)');
  feather.addColorStop(1, 'rgba(0,0,0,0)');
  patchCtx.fillStyle = feather;
  patchCtx.fillRect(0, 0, maskWidth, height);
  patchCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(patch, 0, 0);
}
