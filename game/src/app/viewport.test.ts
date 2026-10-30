import { describe, expect, it } from 'vitest';
import { clampZoom, panBy, screenToWorld, zoomAt, zoomToWorldAnchor, ZOOM, type Viewport } from './viewport';

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

  it('maintains grid selection after zoom and pan', () => {
    const view = zoomAt(base, 2, { x: 480, y: 300 });
    const targetScreen = { x: 480 + (360 - 480) * view.zoom, y: 300 + (460 - 300) * view.zoom };
    const world = screenToWorld(view, targetScreen);
    expect(world.x).toBeCloseTo(360);
    expect(world.y).toBeCloseTo(460);
  });
});
