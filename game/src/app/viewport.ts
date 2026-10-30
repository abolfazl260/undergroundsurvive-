/** Pure camera geometry shared by mouse, touch and UI controls. Phaser-independent. */
export const ZOOM = { min: 0.75, max: 2.5, initial: 1, step: 0.25 } as const;

/** One portrait screen and one unchanged 960×600 world on every device. */
export const GAME_VIEW = { width: 480, height: 600, worldWidth: 960, worldHeight: 600 } as const;

export interface Point { x: number; y: number }
export interface Viewport {
  width: number;
  height: number;
  /** World bounds are independent of the smaller portrait viewport. */
  worldWidth?: number;
  worldHeight?: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
}

export function clampZoom(value: number): number {
  return Number.isFinite(value) ? Math.min(ZOOM.max, Math.max(ZOOM.min, value)) : ZOOM.initial;
}

/** Camera origin is fixed at the center of its viewport. */
export function screenToWorld(view: Viewport, screen: Point): Point {
  return {
    x: view.scrollX + view.width / 2 + (screen.x - view.width / 2) / view.zoom,
    y: view.scrollY + view.height / 2 + (screen.y - view.height / 2) / view.zoom
  };
}

function constrainAxis(scroll: number, size: number, zoom: number, worldSize: number): number {
  // Camera scroll measures its unzoomed top-left. Clamp its visible region to
  // the full world, not the narrower mobile screen.
  const visibleHalf = size / (2 * zoom);
  if (visibleHalf >= worldSize / 2) return (worldSize - size) / 2;
  const center = scroll + size / 2;
  return Math.max(visibleHalf, Math.min(worldSize - visibleHalf, center)) - size / 2;
}

export function constrainScroll(view: Viewport): Pick<Viewport, 'scrollX' | 'scrollY'> {
  return {
    scrollX: constrainAxis(view.scrollX, view.width, view.zoom, view.worldWidth ?? view.width),
    scrollY: constrainAxis(view.scrollY, view.height, view.zoom, view.worldHeight ?? view.height)
  };
}

/** Keep a world position beneath a given screen point while changing zoom. */
export function zoomToWorldAnchor(view: Viewport, proposedZoom: number, world: Point, screen: Point): Viewport {
  const zoom = clampZoom(proposedZoom);
  const result: Viewport = {
    ...view,
    zoom,
    scrollX: world.x - view.width / 2 - (screen.x - view.width / 2) / zoom,
    scrollY: world.y - view.height / 2 - (screen.y - view.height / 2) / zoom
  };
  return { ...result, ...constrainScroll(result) };
}

export function zoomAt(view: Viewport, proposedZoom: number, screen: Point): Viewport {
  return zoomToWorldAnchor(view, proposedZoom, screenToWorld(view, screen), screen);
}

/** Dragging the picture right moves the camera left (screen pixels / zoom). */
export function panBy(view: Viewport, screenDelta: Point): Viewport {
  const next = {
    ...view,
    scrollX: view.scrollX - screenDelta.x / view.zoom,
    scrollY: view.scrollY - screenDelta.y / view.zoom
  };
  return { ...next, ...constrainScroll(next) };
}
