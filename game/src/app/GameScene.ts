import Phaser from 'phaser';
import { WORLD, toCell, toPixels, type GridPosition } from '../modules/world/grid';
import { ROOM_DEFINITIONS, type BuildableRoomType } from '../modules/building/catalog';
import { BuildingLayout } from '../modules/building/layout';

export class GameScene extends Phaser.Scene {
  private readonly layout = new BuildingLayout();
  private selectedRoom: BuildableRoomType = 'habitat';
  private preview?: Phaser.GameObjects.Graphics;
  private roomLayer?: Phaser.GameObjects.Container;
  private hovered: GridPosition | null = null;

  constructor(private readonly report: (count: number, message: string) => void) {
    super({ key: 'UndergroundScene' });
  }

  create(): void {
    this.drawWorld();
    this.roomLayer = this.add.container(0, 0).setDepth(3);
    this.paintRooms();
    this.addResident();
    this.preview = this.add.graphics().setDepth(6);
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.hovered = toCell(pointer.x, pointer.y);
      this.paintPreview();
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const cell = toCell(pointer.x, pointer.y);
      if (!cell) return;
      const result = this.layout.place(this.selectedRoom, cell.x, cell.y);
      if (result.ok) {
        this.paintRooms();
        this.report(this.layout.rooms.length, 'اتاق با موفقیت ساخته شد (فقط نسخهٔ آزمایشی).');
      } else {
        this.report(this.layout.rooms.length, result.reason);
      }
      this.hovered = cell;
      this.paintPreview();
    });
    this.report(this.layout.rooms.length, 'نوع اتاق را انتخاب کنید و روی خانهٔ خالی بزنید.');
  }

  selectRoom(type: BuildableRoomType): void {
    this.selectedRoom = type;
    this.paintPreview();
  }

  resetLayout(): void {
    this.layout.reset();
    if (this.roomLayer) this.paintRooms();
    this.paintPreview();
    this.report(this.layout.rooms.length, 'نقشه به وضعیت اولیه بازگردانده شد.');
  }

  private drawWorld(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x101d2d, 1).fillRect(0, 0, 960, 312);
    g.fillStyle(0x253c4b, 1).fillRect(0, 245, 960, 67);
    g.fillStyle(0x453b32, 1).fillRect(0, 312, 960, 288);
    g.fillStyle(0x3b332e, 1).fillRect(0, 430, 960, 170);
    g.fillStyle(0x5e6244, 1).fillRect(0, 309, 960, 5);
    g.lineStyle(1, 0x7590a0, 0.16);
    for (let x = 0; x <= WORLD.cols; x++) {
      const px = WORLD.originX + x * WORLD.cellSize;
      g.lineBetween(px, 150, px, 528);
    }
    for (let y = WORLD.minY; y <= WORLD.maxY + 1; y++) {
      const lineY = WORLD.groundLineY - y * WORLD.cellSize;
      g.lineBetween(WORLD.originX, lineY, WORLD.originX + WORLD.cols * WORLD.cellSize, lineY);
    }
    // Fixed scenery needs no external asset downloads.
    g.fillStyle(0xaccad4, 0.34);
    for (let i = 0; i < 23; i++) {
      g.fillCircle(30 + (i * 167) % 900, 38 + (i * 83) % 120, i % 3 === 0 ? 2 : 1);
    }
    g.fillStyle(0x71845f, 1).fillTriangle(50, 309, 110, 270, 170, 309);
    g.fillTriangle(755, 309, 820, 256, 909, 309);
    this.add.text(30, 24, 'SURFACE / ABOVE GROUND', {
      color: '#9bb9cd', fontSize: '13px', fontFamily: 'Arial'
    }).setDepth(1);
    this.add.text(30, 563, 'UNDERGROUND / -4', {
      color: '#b8a48e', fontSize: '13px', fontFamily: 'Arial'
    }).setDepth(1);
    this.add.text(922, 290, '0', {
      color: '#d6e0cc', fontSize: '15px', fontFamily: 'Arial'
    }).setDepth(1);
  }

  private paintRooms(): void {
    if (!this.roomLayer) return;
    this.roomLayer.removeAll(true);
    for (const room of this.layout.rooms) {
      const definition = ROOM_DEFINITIONS[room.type];
      const { left, top } = toPixels(room.x, room.y);
      const width = room.width * WORLD.cellSize - 4;
      const height = room.height * WORLD.cellSize - 4;
      const block = this.add.graphics();
      block.fillStyle(0x0a111b, 0.55).fillRoundedRect(left + 4, top + 5, width, height, 4);
      block.fillStyle(definition.color, 1).fillRoundedRect(left + 2, top + 2, width, height, 5);
      block.lineStyle(2, definition.accent, 0.9).strokeRoundedRect(left + 2, top + 2, width, height, 5);
      block.fillStyle(definition.accent, 0.16).fillRect(left + 9, top + 9, width - 14, 8);
      this.roomLayer.add(block);
      const text = this.add.text(left + width / 2 + 2, top + 30, definition.label, {
        fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', color: '#f3f8fb'
      }).setOrigin(0.5);
      this.roomLayer.add(text);
    }
  }

  private addResident(): void {
    const { left, top } = toPixels(5, -1);
    const person = this.add.container(left + 26, top + 34).setDepth(4);
    person.add([
      this.add.circle(0, -14, 5, 0xf7d9ae),
      this.add.rectangle(0, -2, 11, 15, 0x8bd9c4),
      this.add.rectangle(-4, 10, 3, 10, 0x1a2638),
      this.add.rectangle(4, 10, 3, 10, 0x1a2638)
    ]);
    this.tweens.add({ targets: person, x: left + 122, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private paintPreview(): void {
    if (!this.preview) return;
    this.preview.clear();
    if (!this.hovered) return;
    const { x, y } = this.hovered;
    const definition = ROOM_DEFINITIONS[this.selectedRoom];
    const { left, top } = toPixels(x, y);
    const valid = this.layout.canPlace(this.selectedRoom, x, y).ok;
    this.preview.fillStyle(valid ? 0x6acdad : 0xe48384, 0.22);
    this.preview.fillRect(left + 2, top + 2, definition.width * WORLD.cellSize - 4, definition.height * WORLD.cellSize - 4);
    this.preview.lineStyle(2, valid ? 0x88e4bf : 0xff9192, 1);
    this.preview.strokeRect(left + 2, top + 2, definition.width * WORLD.cellSize - 4, definition.height * WORLD.cellSize - 4);
  }
}

