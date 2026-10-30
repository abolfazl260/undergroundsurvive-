import type Phaser from 'phaser';
import { toPixels, WORLD, SURFACE_ACCESS_BUFFER_FLOORS, type GridPosition } from '../modules/world/grid';
import type { ElevatorCarView } from '../modules/characters/traffic';

/** Heavy sealed blast door on the surface; deliberately not a lift landing. */
export function paintSurfaceBlastDoor(graphics: Phaser.GameObjects.Graphics, left: number, top: number): void {
  // Concrete surround and deeply inset steel entrance.
  graphics.fillStyle(0x242a2e, 1).fillRoundedRect(left + 1, top + 1, 52, 53, 3);
  graphics.fillStyle(0x677078, 1).fillRect(left + 3, top + 2, 48, 49);
  graphics.fillStyle(0x171f28, 1).fillRect(left + 7, top + 6, 40, 41);
  graphics.fillStyle(0x46535e, 1).fillRect(left + 10, top + 9, 34, 35);
  // Reinforced two-panel metal bulkhead with a central locking seam.
  graphics.fillStyle(0x303d47, 1).fillRect(left + 11, top + 11, 15, 31);
  graphics.fillStyle(0x384650, 1).fillRect(left + 28, top + 11, 15, 31);
  graphics.fillStyle(0x82929b, 0.7).fillRect(left + 12, top + 12, 2, 29);
  graphics.fillStyle(0x17232a, 1).fillRect(left + 26, top + 10, 2, 34);
  graphics.lineStyle(1, 0x95a4a9, 0.8).strokeRect(left + 10, top + 9, 34, 35);
  // Horizontal blast bar, industrial lock and inspection bolts.
  graphics.fillStyle(0x182731, 1).fillRect(left + 10, top + 25, 34, 5);
  graphics.fillStyle(0x8d999b, 1).fillRect(left + 12, top + 26, 30, 2);
  graphics.fillStyle(0x202a30, 1).fillCircle(left + 27, top + 27, 7);
  graphics.lineStyle(2, 0xaab5b6, 1).strokeCircle(left + 27, top + 27, 6);
  graphics.lineStyle(2, 0xd1b584, 0.95);
  graphics.lineBetween(left + 22, top + 27, left + 32, top + 27);
  graphics.lineBetween(left + 27, top + 22, left + 27, top + 32);
  for (const x of [8, 46]) for (const y of [8, 20, 35, 45]) {
    graphics.fillStyle(0x1d272d, 1).fillCircle(left + x, top + y, 2);
    graphics.fillStyle(0xb4bdc0, 0.8).fillCircle(left + x, top + y, 0.8);
  }
  // Quarantine warning strip along the ground threshold.
  graphics.fillStyle(0x151b20, 1).fillRect(left + 4, top + 47, 46, 5);
  graphics.fillStyle(0xd0a14d, 1).fillRect(left + 5, top + 48, 44, 2);
  graphics.lineStyle(2, 0x151b20, 1);
  for (let x = 6; x < 48; x += 9)
    graphics.lineBetween(left + x, top + 48, left + x + 4, top + 51);
  graphics.lineStyle(2, 0x859199, 0.9).strokeRoundedRect(left + 2, top + 1, 50, 52, 3);
}

/** Draw the extra two sealed shaft spans between the exit and logical level -1. */
function paintSecurityAccessShaft(graphics: Phaser.GameObjects.Graphics, left: number, top: number): void {
  graphics.fillStyle(0x111b24, 0.98).fillRect(left + 2, top, 50, 54);
  graphics.fillStyle(0x394b55, 1).fillRect(left + 3, top, 5, 54);
  graphics.fillStyle(0x394b55, 1).fillRect(left + 46, top, 5, 54);
  graphics.fillStyle(0x91a09f, 0.75).fillRect(left + 10, top, 2, 54);
  graphics.fillStyle(0x91a09f, 0.75).fillRect(left + 42, top, 2, 54);
  graphics.fillStyle(0xc5ae7a, 0.7).fillRect(left + 27, top, 2, 54);
  graphics.fillStyle(0x65737a, 0.85).fillRect(left + 2, top + 50, 50, 3);
  graphics.lineStyle(1, 0x87949c, 0.75).strokeRect(left + 2, top, 50, 54);
}

/** Industrial cross-section at exactly one 54px grid cell per shaft segment.
 * No raster scaling or floor-specific sprite atlases are needed for animations. */
export function paintElevatorShaft(
  graphics: Phaser.GameObjects.Graphics,
  shafts: readonly GridPosition[]
): void {
  for (const { x, y } of shafts) {
    const { left, top } = toPixels(x, y);
    if (y === 0) {
      // The contaminated exterior has a sealed exit gate, not an exposed lift car.
      paintSurfaceBlastDoor(graphics, left, top);
      continue;
    }
    graphics.fillStyle(0x141d27, 0.97).fillRect(left + 2, top + 1, 50, 52);
    // Reinforced steel housing, elevator rails and cable.
    graphics.fillStyle(0x46535c, 1).fillRect(left + 3, top + 1, 4, 52);
    graphics.fillStyle(0x46535c, 1).fillRect(left + 47, top + 1, 4, 52);
    graphics.fillStyle(0x8b9298, 0.8).fillRect(left + 9, top + 2, 2, 50);
    graphics.fillStyle(0x8b9298, 0.8).fillRect(left + 43, top + 2, 2, 50);
    graphics.fillStyle(0xb8a37f, 0.7).fillRect(left + 26, top + 2, 2, 50);
    graphics.fillStyle(0x4b535d, 0.85).fillRect(left + 2, top + 2, 50, 4);
    graphics.fillStyle(0x4b535d, 0.85).fillRect(left + 2, top + 49, 50, 4);
    // Amber landing call controls (outside sliding doors).
    graphics.fillStyle(0xe4a74a, 0.92).fillRect(left + 44, top + 25, 3, 6);
    graphics.fillStyle(0x7a8993, 1).fillRect(left + 44, top + 10, 3, 8);
    graphics.lineStyle(1, 0xc0c4bb, 0.58).strokeRect(left + 2, top + 2, 50, 50);
  }
  // Bridge the surface blast door to the first (deeper) playable underground row.
  for (const { x, y } of shafts) {
    if (y !== 0 || !shafts.some(p => p.x === x && p.y === -1)) continue;
    const { left } = toPixels(x, 0);
    for (let level = 0; level < SURFACE_ACCESS_BUFFER_FLOORS; level++)
      paintSecurityAccessShaft(graphics, left, WORLD.groundLineY + level * WORLD.cellSize);
  }
}

/** The cabin is rendered on a fractional floor coordinate while travelling;
 * its sliding door leaves a progressively widening opening. */
export function paintElevatorCars(
  graphics: Phaser.GameObjects.Graphics,
  cars: readonly ElevatorCarView[],
  shafts: readonly GridPosition[] = []
): void {
  graphics.clear();
  for (const car of cars) {
    if (car.y >= 0) continue; // Surface hatch never turns into an elevator cabin.
    const { left, top } = toPixels(car.x, car.y);
    const open = Math.max(0, Math.min(1, car.doorOpen));
    graphics.fillStyle(0x0a1a23, 0.98).fillRoundedRect(left + 7, top + 6, 40, 42, 3);
    graphics.lineStyle(2, 0x9ba4a2, 0.98).strokeRoundedRect(left + 6, top + 5, 42, 44, 3);
    graphics.fillStyle(0xffc06e, 0.9).fillRect(left + 16, top + 8, 22, 3);
    // Interior becomes visible as the doors open.
    graphics.fillStyle(0x65727a, 0.8).fillRect(left + 11, top + 13, 32, 28);
    graphics.fillStyle(0x192834, 1).fillRect(left + 12, top + 17, 30, 24);
    graphics.fillStyle(0xd9a34b, 0.75).fillRect(left + 13, top + 41, 29, 3);
    const panelWidth = 16 * (1 - open);
    if (panelWidth > 0.01) {
      graphics.fillStyle(0x606e77, 1).fillRect(left + 11, top + 13, panelWidth, 28);
      graphics.fillStyle(0x606e77, 1).fillRect(left + 43 - panelWidth, top + 13, panelWidth, 28);
      graphics.lineStyle(1, 0xa8b7b4, 0.75);
      graphics.strokeRect(left + 11, top + 13, panelWidth, 28);
      graphics.strokeRect(left + 43 - panelWidth, top + 13, panelWidth, 28);
    }
    graphics.fillStyle(0xf3b34a, 1).fillRect(left + 44, top + 26, 3, 5);
    graphics.fillStyle(0xd4a65d, 1).fillRect(left + 11, top + 44, 32, 3);
    // Hazard marking above threshold, like adjacent industrial room art.
    graphics.lineStyle(1, 0x292c31, 0.9);
    for (let stripe = 0; stripe < 4; stripe++)
      graphics.lineBetween(left + 12 + stripe * 8, top + 46, left + 15 + stripe * 8, top + 43);
    if (car.phase === 'travel' || car.phase === 'calling') {
      graphics.fillStyle(0xf3c46d, 0.75).fillRect(left + 25, top + 1, 4, 3);
    }
  }
  // Always draw the sealed exterior entrance above a car passing underneath.
  for (const { x, y } of shafts) if (y === 0) {
    const { left, top } = toPixels(x, y);
    paintSurfaceBlastDoor(graphics, left, top);
  }
}
