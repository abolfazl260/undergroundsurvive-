/** Pure camera geometry shared by mouse, touch and UI controls. Phaser-independent. */
export const ZOOM = { min: 0.75, max: 2.5, initial: 1, step: 0.25 } as const;

/** Portrait viewport with extra vertical world space for the sealed access shaft. */
export const GAME_VIEW = { width: 480, height: 600, worldWidth: 960, worldHeight: 720 } as const;

/** Frame the 14-cell playfield rather than its much wider decorative margins. */
export const GAME_FOCUS = { width: 804, height: 660 } as const;

/** 100% zoom covers the viewport while keeping room artwork at a useful size. */
export function fitCameraZoom(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
  return Math.max(width / GAME_FOCUS.width, height / GAME_FOCUS.height);
}

export interface ZoomLimits { min: number; max: number }

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

export function clampZoom(value: number, limits: ZoomLimits = ZOOM): number {
  return Number.isFinite(value) ? Math.min(limits.max, Math.max(limits.min, value)) : ZOOM.initial;
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
export function zoomToWorldAnchor(view: Viewport, proposedZoom: number, world: Point, screen: Point, limits: ZoomLimits = ZOOM): Viewport {
  const zoom = clampZoom(proposedZoom, limits);
  const result: Viewport = {
    ...view,
    zoom,
    scrollX: world.x - view.width / 2 - (screen.x - view.width / 2) / zoom,
    scrollY: world.y - view.height / 2 - (screen.y - view.height / 2) / zoom
  };
  return { ...result, ...constrainScroll(result) };
}

export function zoomAt(view: Viewport, proposedZoom: number, screen: Point, limits: ZoomLimits = ZOOM): Viewport {
  return zoomToWorldAnchor(view, proposedZoom, screenToWorld(view, screen), screen, limits);
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

/** Keep the same world point at screen center when the browser resizes or rotates. */
export function resizeViewport(view: Viewport, width: number, height: number): Viewport {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return view;
  const next: Viewport = {
    ...view, width, height,
    scrollX: view.scrollX + (view.width - width) / 2,
    scrollY: view.scrollY + (view.height - height) / 2
  };
  return { ...next, ...constrainScroll(next) };
}
