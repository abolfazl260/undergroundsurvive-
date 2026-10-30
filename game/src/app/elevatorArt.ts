import type Phaser from 'phaser';
import { toPixels, WORLD, type GridPosition } from '../modules/world/grid';
import type { ElevatorCarView } from '../modules/characters/traffic';

/** Industrial cross-section at exactly one 54px grid cell per shaft segment.
 * No raster scaling or floor-specific sprite atlases are needed for animations. */
export function paintElevatorShaft(
  graphics: Phaser.GameObjects.Graphics,
  shafts: readonly GridPosition[]
): void {
  for (const { x, y } of shafts) {
    const { left, top } = toPixels(x, y);
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
}

/** The cabin is rendered on a fractional floor coordinate while travelling;
 * its sliding door leaves a progressively widening opening. */
export function paintElevatorCars(
  graphics: Phaser.GameObjects.Graphics,
  cars: readonly ElevatorCarView[]
): void {
  graphics.clear();
  for (const car of cars) {
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
}
