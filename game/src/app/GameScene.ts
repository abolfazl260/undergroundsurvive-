import Phaser from 'phaser';
import { WORLD, toCell, toPixels, type GridPosition } from '../modules/world/grid';
import { ROOM_DEFINITIONS, type BuildableRoomType } from '../modules/building/catalog';
import { BuildingLayout, type BaseSnapshot } from '../modules/building/layout';
import type { PlacementResult } from '../modules/building/placement';
import { ROOM_ATLAS_KEY, ROOM_ATLAS_URL, ROOM_ATLAS_FRAME_WIDTH, ROOM_ATLAS_FRAME_HEIGHT, ROOM_FRAME_BY_TYPE } from './roomArt';
import { panBy, screenToWorld, zoomAt, zoomToWorldAnchor, ZOOM, type Point, type Viewport } from './viewport';

type Contact = { x: number; y: number; startX: number; startY: number; dragged: boolean };

export type ToolMode = 'build' | 'dig' | 'move' | 'remove' | 'upgrade';

export class GameScene extends Phaser.Scene {
  private readonly layout: BuildingLayout;
  private selectedRoom: BuildableRoomType = 'habitat';
  private mode: ToolMode = 'build';
  private pendingMoveId: string | null = null;
  private terrainLayer?: Phaser.GameObjects.Graphics;
  private roomLayer?: Phaser.GameObjects.Container;
  private preview?: Phaser.GameObjects.Graphics;
  private hovered: GridPosition | null = null;
  private readonly contacts = new Map<number, Contact>();
  private pinch?: { initialDistance: number; initialZoom: number; worldAnchor: Point };
  private gestureUsed = false;

  constructor(
    private readonly report: (snapshot: BaseSnapshot, message: string) => void,
    saved: unknown,
    private readonly onZoomChange: (zoom: number) => void = () => {}
  ) {
    super({ key: 'UndergroundScene' });
    this.layout = BuildingLayout.restore(saved) ?? new BuildingLayout();
  }

  preload(): void {
    this.load.spritesheet(ROOM_ATLAS_KEY, ROOM_ATLAS_URL, {
      frameWidth: ROOM_ATLAS_FRAME_WIDTH,
      frameHeight: ROOM_ATLAS_FRAME_HEIGHT
    });
  }

  create(): void {
    this.drawBackdrop();
    this.terrainLayer = this.add.graphics().setDepth(1);
    this.roomLayer = this.add.container(0, 0).setDepth(3);
    this.preview = this.add.graphics().setDepth(6);
    this.drawLevelMarkers();
    this.paintTerrain();
    this.paintRooms();
    this.addResident();

    this.input.addPointer(2); // Accept simultaneous touch contacts for pinch gestures.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startContact(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.moveContact(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.endContact(pointer, false));
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.endContact(pointer, true));
    this.input.on('gameout', () => {
      this.hovered = null;
      this.paintPreview();
    });
    this.input.on('wheel', (
      pointer: Phaser.Input.Pointer,
      _over: Phaser.GameObjects.GameObject[],
      _dx: number,
      dy: number,
      _dz: number,
      event: WheelEvent
    ) => {
      event.preventDefault();
      if (dy !== 0) this.setZoomAt(this.cameras.main.zoom + (dy < 0 ? 0.15 : -0.15), { x: pointer.x, y: pointer.y });
    });
    this.onZoomChange(this.cameras.main.zoom);
    this.notify('ابزار ساخت را انتخاب کنید؛ با اسکرول یا دو انگشت زوم کنید و با کشیدن، نقشه را جابه‌جا کنید.');
  }

  /** Exposed to the responsive HTML zoom controls. */
  zoomBy(amount: number): void {
    this.setZoomAt(this.cameras.main.zoom + amount, {
      x: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2
    });
  }

  resetZoom(): void {
    this.applyView({ ...this.currentView(), zoom: ZOOM.initial, scrollX: 0, scrollY: 0 });
  }

  private currentView(): Viewport {
    const camera = this.cameras.main;
    return {
      width: camera.width, height: camera.height,
      zoom: camera.zoom, scrollX: camera.scrollX, scrollY: camera.scrollY
    };
  }

  private applyView(view: Viewport): void {
    const camera = this.cameras.main;
    const changedZoom = camera.zoom !== view.zoom;
    camera.setZoom(view.zoom);
    camera.setScroll(view.scrollX, view.scrollY);
    if (changedZoom) this.onZoomChange(view.zoom);
    if (this.contacts.size === 0) this.updateHover(this.input.activePointer);
    else {
      this.hovered = null;
      this.paintPreview();
    }
  }

  private setZoomAt(zoom: number, screen: Point): void {
    this.applyView(zoomAt(this.currentView(), zoom, screen));
  }

  private pointToCell(screen: Point): GridPosition | null {
    const world = screenToWorld(this.currentView(), screen);
    return toCell(world.x, world.y);
  }

  private updateHover(pointer: Phaser.Input.Pointer): void {
    this.hovered = this.pointToCell({ x: pointer.x, y: pointer.y });
    this.paintPreview();
  }

  private startContact(pointer: Phaser.Input.Pointer): void {
    this.contacts.set(pointer.id, {
      x: pointer.x, y: pointer.y,
      startX: pointer.x, startY: pointer.y,
      dragged: false
    });
    if (this.contacts.size >= 2) {
      this.gestureUsed = true;
      this.beginPinch();
      this.hovered = null;
      this.paintPreview();
    }
  }

  private beginPinch(): void {
    const [first, second] = [...this.contacts.values()];
    if (!first || !second) return;
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    this.pinch = {
      initialDistance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
      initialZoom: this.cameras.main.zoom,
      worldAnchor: screenToWorld(this.currentView(), midpoint)
    };
  }

  private moveContact(pointer: Phaser.Input.Pointer): void {
    const contact = this.contacts.get(pointer.id);
    if (!contact) {
      if (this.contacts.size === 0) this.updateHover(pointer);
      return;
    }
    const dx = pointer.x - contact.x;
    const dy = pointer.y - contact.y;
    contact.x = pointer.x;
    contact.y = pointer.y;

    if (this.contacts.size >= 2) {
      if (!this.pinch) this.beginPinch();
      const [a, b] = [...this.contacts.values()];
      if (!a || !b || !this.pinch) return;
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const targetZoom = this.pinch.initialZoom * distance / this.pinch.initialDistance;
      this.applyView(zoomToWorldAnchor(this.currentView(), targetZoom, this.pinch.worldAnchor, midpoint));
      return;
    }

    if (Math.hypot(contact.x - contact.startX, contact.y - contact.startY) > 14) {
      contact.dragged = true;
    }
    if (contact.dragged || this.gestureUsed) {
      this.applyView(panBy(this.currentView(), { x: dx, y: dy }));
      return;
    }
    this.updateHover(pointer);
  }

  private endContact(pointer: Phaser.Input.Pointer, outside: boolean): void {
    const contact = this.contacts.get(pointer.id);
    if (!contact) return;
    this.contacts.delete(pointer.id);
    if (this.contacts.size < 2) this.pinch = undefined;
    const shouldAct = !outside && !this.gestureUsed && !contact.dragged && pointer.button === 0;
    if (this.contacts.size === 0) this.gestureUsed = false;
    if (shouldAct) {
      const cell = this.pointToCell({ x: pointer.x, y: pointer.y });
      if (cell) this.actOnCell(cell);
    }
    if (this.contacts.size === 0 && !outside) this.updateHover(pointer);
    else {
      this.hovered = null;
      this.paintPreview();
    }
  }

  selectRoom(type: BuildableRoomType): void {
    this.selectedRoom = type;
    this.setTool('build');
  }

  setTool(tool: ToolMode): void {
    this.mode = tool;
    this.pendingMoveId = null;
    this.paintPreview();
    const messages: Record<ToolMode, string> = {
      build: 'برای ساخت، یک خانهٔ خالی و آماده را انتخاب کنید.',
      dig: 'برای حفاری روی زمین بستهٔ زیرزمینی مجاور فضای باز بزنید.',
      move: 'ابتدا اتاق را انتخاب کنید و سپس مکان جدید آن را لمس کنید.',
      remove: 'برای تخریب روی اتاق کلیک کنید. اتاق فرمان محفوظ است.',
      upgrade: 'روی یک اتاق بزنید تا سطح آزمایشی آن افزایش یابد.'
    };
    this.notify(messages[tool]);
  }

  unlockFloor(): void {
    const result = this.layout.unlockFloor();
    if (result.ok) this.paintTerrain();
    this.paintPreview();
    this.notify(result.ok ? 'طبقهٔ جدید آزاد شد؛ برای ساخت باید تکیه‌گاه داشته باشد.' : result.reason);
  }

  resetLayout(): void {
    this.layout.reset();
    this.pendingMoveId = null;
    this.paintTerrain();
    this.paintRooms();
    this.paintPreview();
    this.notify('نقشه، حفاری‌ها و طبقات به وضعیت اولیه بازگردانده شدند.');
  }

  private actOnCell(cell: GridPosition): void {
    const { x, y } = cell;
    let result: PlacementResult = { ok: false, reason: 'دستور نامعتبر است.' };
    let successMessage = '';
    if (this.mode === 'build') {
      result = this.layout.place(this.selectedRoom, x, y);
      successMessage = 'اتاق جدید ساخته شد.';
    } else if (this.mode === 'dig') {
      result = this.layout.dig(x, y);
      successMessage = 'زمین حفاری شد؛ اکنون می‌توانید در آن اتاق بسازید.';
    } else if (this.mode === 'move') {
      const room = this.layout.getRoomAt(x, y);
      if (!this.pendingMoveId) {
        if (!room || room.type === 'command') {
          this.notify('برای جابه‌جایی ابتدا یک اتاق معمولی انتخاب کنید.');
          return;
        }
        this.pendingMoveId = room.id;
        this.paintPreview();
        this.notify('اتاق انتخاب شد؛ روی محل جدید بزنید.');
        return;
      }
      if (room?.id === this.pendingMoveId) {
        this.pendingMoveId = null;
        this.paintPreview();
        this.notify('انتخاب جابه‌جایی لغو شد.');
        return;
      }
      result = this.layout.move(this.pendingMoveId, x, y);
      successMessage = 'اتاق به محل جدید منتقل شد.';
      if (result.ok) this.pendingMoveId = null;
    } else {
      const room = this.layout.getRoomAt(x, y);
      if (!room) {
        this.notify('در این موقعیت اتاقی وجود ندارد.');
        return;
      }
      if (this.mode === 'remove') {
        result = this.layout.remove(room.id);
        successMessage = 'اتاق تخریب شد.';
      } else {
        result = this.layout.upgrade(room.id);
        successMessage = 'سطح اتاق ارتقا یافت.';
      }
    }
    if (result.ok) {
      this.paintTerrain();
      this.paintRooms();
    }
    this.hovered = cell;
    this.paintPreview();
    this.notify(result.ok ? successMessage : result.reason);
  }

  private notify(message: string): void {
    this.report(this.layout.snapshot(), message);
  }

  private drawBackdrop(): void {
    const g = this.add.graphics().setDepth(0);
    // Oversized background keeps the sky and soil visible at 75% zoom.
    g.fillStyle(0x111e2e).fillRect(-600, -400, 2160, 712);
    g.fillStyle(0x24394b).fillRect(-600, 246, 2160, 66);
    g.fillStyle(0x42392f).fillRect(-600, 312, 2160, 1000);
    g.fillStyle(0x7d8965).fillRect(-600, 310, 2160, 4);
    g.fillStyle(0x9bbcc9, 0.38);
    for (let i = 0; i < 25; i++) {
      g.fillCircle(22 + i * 181 % 911, 18 + i * 67 % 150, 1.5);
    }
    g.fillStyle(0x53684f).fillTriangle(25, 310, 95, 268, 170, 310);
    g.fillTriangle(770, 310, 831, 257, 929, 310);
    this.add.text(20, 20, 'SURFACE / BUILD ABOVE', { fontSize: '13px', color: '#aac4d3' }).setDepth(2);
    this.add.text(20, 566, 'UNDERGROUND / EXCAVATE BELOW', { fontSize: '13px', color: '#b3a18e' }).setDepth(2);
  }

  private drawLevelMarkers(): void {
    for (let y: number = WORLD.minY; y <= WORLD.maxY; y++) {
      const { top } = toPixels(0, y);
      this.add.text(68, top + 22, y > 0 ? '+' + y : String(y), {
        fontSize: '13px', fontFamily: 'Arial', color: y >= 0 ? '#b5d4df' : '#b6a58f'
      }).setOrigin(0.5).setDepth(2);
    }
  }

  private paintTerrain(): void {
    if (!this.terrainLayer) return;
    const g = this.terrainLayer;
    g.clear();
    for (let y: number = WORLD.minY; y <= WORLD.maxY; y++) {
      for (let x = 0; x < WORLD.cols; x++) {
        const { left, top } = toPixels(x, y);
        const open = this.layout.terrain.isOpen(x, y);
        const color = y < 0 ? (open ? 0x1a3441 : ((x + y) % 2 ? 0x504136 : 0x493a31)) :
          y === 0 ? 0x2a4751 : open ? 0x263f50 : 0x172634;
        g.fillStyle(color, y > 0 && !open ? 0.50 : 1);
        g.fillRect(left + 1, top + 1, WORLD.cellSize - 2, WORLD.cellSize - 2);
        if (!open && y < 0) {
          g.lineStyle(1, 0x8c7359, 0.26);
          g.lineBetween(left + 12, top + 18, left + 28, top + 33);
        } else if (y < 0) {
          g.fillStyle(0x4f8b8a, 0.19).fillRect(left + 4, top + 4, WORLD.cellSize - 8, 4);
        }
        g.lineStyle(1, 0x91b0ae, 0.18);
        g.strokeRect(left, top, WORLD.cellSize, WORLD.cellSize);
      }
    }
  }

  private paintRooms(): void {
    if (!this.roomLayer) return;
    this.roomLayer.removeAll(true);
    const artworkReady = this.textures.exists(ROOM_ATLAS_KEY);

    for (const room of this.layout.rooms) {
      const definition = ROOM_DEFINITIONS[room.type];
      const { left, top } = toPixels(room.x, room.y);
      const width = room.width * WORLD.cellSize - 4;
      const height = room.height * WORLD.cellSize - 4;
      const frame = ROOM_FRAME_BY_TYPE[room.type];

      if (artworkReady && frame !== undefined) {
        const sprite = this.add.image(left + 2, top + 2, ROOM_ATLAS_KEY, frame)
          .setOrigin(0, 0)
          .setDisplaySize(width, height);
        this.roomLayer.add(sprite);
      }

      const graphics = this.add.graphics();
      if (!artworkReady || frame === undefined) {
        // Keep legacy room types and failed asset requests playable.
        graphics.fillStyle(definition.color).fillRoundedRect(left + 2, top + 2, width, height, 4);
        graphics.fillStyle(definition.accent, 0.21).fillRect(left + 10, top + 9, width - 16, 8);
      }
      graphics.lineStyle(1.5, definition.accent, 0.9)
        .strokeRoundedRect(left + 2, top + 2, width, height, 4);
      graphics.fillStyle(0x09131f, 0.82)
        .fillRoundedRect(left + 6, top + height - 17, width - 8, 14, 3);
      this.roomLayer.add(graphics);

      const name = this.add.text(left + 9, top + height - 15, definition.label, {
        fontSize: '9px', fontFamily: 'Arial', fontStyle: 'bold', color: '#f4f7fa'
      });
      const level = this.add.text(left + width - 8, top + height - 15, 'LV ' + room.level, {
        fontSize: '9px', fontFamily: 'Arial', color: '#e0e5eb'
      }).setOrigin(1, 0);
      this.roomLayer.add([name, level]);
    }
  }

  private addResident(): void {
    const { left, top } = toPixels(5, -1);
    const person = this.add.container(left + 27, top + 35).setDepth(4);
    person.add([
      this.add.circle(0, -14, 5, 0xf7d9ae),
      this.add.rectangle(0, -2, 11, 15, 0x8bd9c4),
      this.add.rectangle(-4, 10, 3, 10, 0x1a2638),
      this.add.rectangle(4, 10, 3, 10, 0x1a2638)
    ]);
    this.tweens.add({ targets: person, x: left + 126, duration: 2300, yoyo: true, repeat: -1 });
  }

  private paintPreview(): void {
    if (!this.preview) return;
    const g = this.preview;
    g.clear();
    if (!this.hovered) return;
    const { x, y } = this.hovered;
    const room = this.layout.getRoomAt(x, y);
    let width = 1, height = 1, startX = x, startY = y, valid = false;
    if (this.mode === 'build') {
      const d = ROOM_DEFINITIONS[this.selectedRoom];
      width = d.width; height = d.height;
      valid = this.layout.canPlace(this.selectedRoom, x, y).ok;
    } else if (this.mode === 'dig') {
      valid = this.layout.terrain.canDig(x, y).ok;
    } else if (this.mode === 'move' && this.pendingMoveId) {
      const selected = this.layout.rooms.find((r) => r.id === this.pendingMoveId);
      if (!selected) return;
      width = selected.width; height = selected.height;
      valid = this.layout.canMove(selected.id, x, y).ok;
    } else if (room) {
      startX = room.x; startY = room.y;
      width = room.width; height = room.height;
      valid = this.mode === 'upgrade' ? room.level < 3 :
        this.mode === 'remove' ? room.type !== 'command' : room.type !== 'command';
    } else return;
    const { left, top } = toPixels(startX, startY);
    const w = width * WORLD.cellSize - 4, h = height * WORLD.cellSize - 4;
    g.fillStyle(valid ? 0x6acdad : 0xe48384, 0.25);
    g.fillRect(left + 2, top + 2, w, h);
    g.lineStyle(2, valid ? 0x89e5bd : 0xff9192);
    g.strokeRect(left + 2, top + 2, w, h);
  }
}

