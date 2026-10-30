import { describe, expect, it } from 'vitest';
import { clampZoom, constrainScroll, GAME_VIEW, panBy, screenToWorld, zoomAt, zoomToWorldAnchor, resizeViewport, ZOOM, type Viewport } from './viewport';

const base: Viewport = { width: 960, height: 600, zoom: 1, scrollX: 0, scrollY: 0 };

describe('camera zoom and pan', () => {
  it('clamps zoom to safe limits', () => {
    expect(clampZoom(0.1)).toBe(ZOOM.min);
    expect(clampZoom(12)).toBe(ZOOM.max);
    expect(clampZoom(NaN)).toBe(ZOOM.initial);
  });

  it('retains the world position beneath the cursor when possible', () => {
    const cursor = { x: 680, y: 380 };
    const world = screenToWorld(base, cursor);
    const zoomed = zoomAt(base, 2, cursor);
    expect(screenToWorld(zoomed, cursor).x).toBeCloseTo(world.x);
    expect(screenToWorld(zoomed, cursor).y).toBeCloseTo(world.y);
  });

  it('constrains pan within map edges at high zoom', () => {
    const view: Viewport = { ...base, zoom: 2 };
    const moved = panBy(view, { x: -9999, y: 9999 });
    expect(moved.scrollX).toBeCloseTo(240);
    expect(moved.scrollY).toBeCloseTo(-150);
  });

  it('returns to centered scroll when zooming out below 100%', () => {
    const zoomed = zoomAt({ ...base, zoom: 2, scrollX: 180, scrollY: -80 }, 0.75, { x: 400, y: 200 });
    expect(zoomed.scrollX).toBe(0);
    expect(zoomed.scrollY).toBe(0);
  });

  it('supports pinch zoom with a moving screen midpoint', () => {
    const anchor = { x: 520, y: 340 };
    const newMidpoint = { x: 610, y: 390 };
    const result = zoomToWorldAnchor(base, 1.6, anchor, newMidpoint);
    expect(screenToWorld(result, newMidpoint).x).toBeCloseTo(anchor.x);
    expect(screenToWorld(result, newMidpoint).y).toBeCloseTo(anchor.y);
  });

  it('uses the same portrait geometry on phones, tablets, and desktop', () => {
    expect(GAME_VIEW).toMatchObject({ width: 480, height: 600, worldWidth: 960, worldHeight: 600 });
    const portrait: Viewport = {
      width: GAME_VIEW.width, height: GAME_VIEW.height,
      worldWidth: GAME_VIEW.worldWidth, worldHeight: GAME_VIEW.worldHeight,
      zoom: 1, scrollX: 240, scrollY: 0
    };
    expect(screenToWorld(portrait, { x: 240, y: 300 })).toEqual({ x: 480, y: 300 });
    expect(constrainScroll(portrait)).toEqual({ scrollX: 240, scrollY: 0 });
    expect(panBy(portrait, { x: -5000, y: -5000 })).toMatchObject({ scrollX: 480, scrollY: 0 });
    expect(panBy(portrait, { x: 5000, y: 5000 })).toMatchObject({ scrollX: 0, scrollY: 0 });
    const zoomed = zoomAt(portrait, 2, { x: 240, y: 300 });
    expect(screenToWorld(zoomed, { x: 240, y: 300 })).toEqual({ x: 480, y: 300 });
  });

  it('keeps a smaller world centered instead of placing it at the left edge', () => {
    expect(constrainScroll({
      width: 480, height: 600, worldWidth: 960, worldHeight: 600,
      zoom: 0.75, scrollX: 99999, scrollY: 99999
    })).toEqual({ scrollX: 400, scrollY: 0 });
  });

  it('retains the same map center when switching between portrait and landscape screens', () => {
    const portrait: Viewport = { width: 390, height: 810, worldWidth: 960,
      worldHeight: 600, zoom: 2, scrollX: 150, scrollY: -90 };
    const before = screenToWorld(portrait, { x: 195, y: 405 });
    const wide = resizeViewport(portrait, 810, 390);
    expect(screenToWorld(wide, { x: 405, y: 195 })).toEqual(before);
    expect(wide).toMatchObject({ width: 810, height: 390, zoom: 2 });
  });

  it('clamps resize to world bounds and ignores zero-sized browser frames', () => {
    const portrait: Viewport = { width: 390, height: 800, worldWidth: 960,
      worldHeight: 600, zoom: 1, scrollX: 285, scrollY: -100 };
    expect(resizeViewport(portrait, 0, 500)).toEqual(portrait);
    expect(resizeViewport(portrait, 1600, 1000)).toMatchObject({ scrollX: -320, scrollY: -200 });
  });

  it('maintains grid selection after zoom and pan', () => {
    const view = zoomAt(base, 2, { x: 480, y: 300 });
    const targetScreen = { x: 480 + (360 - 480) * view.zoom, y: 300 + (460 - 300) * view.zoom };
    const world = screenToWorld(view, targetScreen);
    expect(world.x).toBeCloseTo(360);
    expect(world.y).toBeCloseTo(460);
  });
});
