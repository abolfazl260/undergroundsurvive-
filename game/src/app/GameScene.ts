import Phaser from 'phaser';
import type { MenuSettings } from './menuSettings';
import type { AudioCue } from '../modules/audio/AudioManager';
import { WORLD, toCell, toPixels, type GridPosition } from '../modules/world/grid';
import { ROOM_DEFINITIONS, type BuildableRoomType } from '../modules/building/catalog';
import { BuildingLayout } from '../modules/building/layout';
import { GameSession, type GameSnapshot } from '../modules/economy/session';
import type { PlacementResult } from '../modules/building/placement';
import { ROOM_ART_ASSET, ROOM_FRAME_BY_TYPE, GARDEN_MEDBAY_ART_ASSET, GARDEN_MEDBAY_FRAME_BY_TYPE } from './roomArt';
import { AssetManager } from './assets/assetManager';
import { panBy, screenToWorld, zoomAt, zoomToWorldAnchor, ZOOM, type Point, type Viewport } from './viewport';

type Contact = { x: number; y: number; startX: number; startY: number; dragged: boolean };

export type ToolMode = 'build' | 'dig' | 'move' | 'remove' | 'upgrade';

export class GameScene extends Phaser.Scene {
  private readonly session: GameSession;
  private readonly assets = new AssetManager(
    [ROOM_ART_ASSET, GARDEN_MEDBAY_ART_ASSET], import.meta.env.BASE_URL,
    Math.min(4, ZOOM.max * Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1))
  );
  private get layout(): BuildingLayout { return this.session.layout; }
  private selectedRoom: BuildableRoomType = 'habitat';
  private mode: ToolMode = 'build';
  private pendingMoveId: string | null = null;
  private terrainLayer?: Phaser.GameObjects.Graphics;
  private roomLayer?: Phaser.GameObjects.Container;
  private roomBadges: Phaser.GameObjects.Container[] = [];
  private preview?: Phaser.GameObjects.Graphics;
  private hovered: GridPosition | null = null;
  private readonly contacts = new Map<number, Contact>();
  private pinch?: { initialDistance: number; initialZoom: number; worldAnchor: Point };
  private gestureUsed = false;
  private gameplayPaused = true;
  private sceneReady = false;
  private menuSettings: MenuSettings = { reducedMotion: false };
  private residentTween?: Phaser.Tweens.Tween;

  constructor(
    private readonly report: (snapshot: GameSnapshot, message: string) => void,
    saved: unknown,
    private readonly onZoomChange: (zoom: number) => void = () => {},
    private readonly onAudioCue: (cue: AudioCue) => void = () => {},
    private readonly onAudioActivate: () => void = () => {}
  ) {
    super({ key: 'UndergroundScene' });
    this.session = GameSession.fromSave(saved);
  }

  preload(): void {
    this.assets.preload(this.load, this.textures);
  }

  create(): void {
    this.assets.configureFilters(
      this.textures, Phaser.Textures.FilterMode.LINEAR, Phaser.Textures.FilterMode.NEAREST
    );
    this.drawBackdrop();
    this.terrainLayer = this.add.graphics().setDepth(1);
    this.roomLayer = this.add.container(0, 0).setDepth(3);
    this.preview = this.add.graphics().setDepth(6);
    this.drawLevelMarkers();
    this.paintTerrain();
    this.paintRooms();
    this.addResident();
    this.sceneReady = true;
    this.applyMenuSettings(this.menuSettings);

    this.input.addPointer(2); // Accept simultaneous touch contacts for pinch gestures.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.onAudioActivate(); // Unlock Web Audio during a touch/mouse gesture.
      this.startContact(pointer);
    });
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
    if (this.gameplayPaused) this.scene.pause();
  }

  /** Pause scene updates, resident animations and world interactions. */
  pauseGameplay(): void {
    this.gameplayPaused = true;
    this.contacts.clear();
    this.pinch = undefined;
    this.gestureUsed = false;
    this.hovered = null;
    this.paintPreview();
    if (this.sceneReady && this.scene.isActive()) this.scene.pause();
  }

  resumeGameplay(): void {
    this.gameplayPaused = false;
    if (this.sceneReady && this.scene.isPaused()) this.scene.resume();
  }

  applyMenuSettings(settings: MenuSettings): void {
    this.menuSettings = { ...settings };
    if (!this.sceneReady || !this.residentTween) return;
    if (settings.reducedMotion) this.residentTween.pause();
    else this.residentTween.resume();
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
    if (changedZoom) {
      this.updateBadgeScale();
      this.onZoomChange(view.zoom);
    }
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
      upgrade: 'روی یک اتاق بزنید؛ هزینهٔ ارتقا براساس نوع و سطح اتاق محاسبه می‌شود.'
    };
    this.onAudioCue('select');
    this.notify(messages[tool]);
  }

  unlockFloor(): void {
    const cost = this.session.floorCost();
    const result = this.session.unlockFloor();
    if (result.ok) this.paintTerrain();
    this.onAudioCue(result.ok ? 'floor' : 'error');
    this.paintPreview();
    this.notify(result.ok ? 'طبقهٔ جدید با پرداخت ' + cost + ' سکه آزاد شد؛ برای ساخت تکیه‌گاه لازم است.' : result.reason);
  }

  claimDemoBonus(): void {
    const result = this.session.claimDemoBonus();
    this.onAudioCue(result.ok ? 'reward' : 'error');
    this.paintPreview();
    this.notify(result.ok ? '۵۰۰ سکهٔ کمک‌هزینهٔ آزمایشی دریافت شد.' : result.reason);
  }

  resetLayout(): void {
    this.session.reset();
    this.onAudioCue('reset');
    this.pendingMoveId = null;
    this.paintTerrain();
    this.paintRooms();
    this.paintPreview();
    this.notify('نقشه، حفاری‌ها و طبقات به وضعیت اولیه بازگردانده شدند.');
  }

  private actOnCell(cell: GridPosition): void {
    if (this.gameplayPaused) return;
    const { x, y } = cell;
    let result: PlacementResult = { ok: false, reason: 'دستور نامعتبر است.' };
    let successMessage = '';
    const cue: AudioCue = {
      build: 'build', dig: 'dig', move: 'move', remove: 'remove', upgrade: 'upgrade'
    }[this.mode] as AudioCue;
    if (this.mode === 'build') {
      const cost = this.session.buildCost(this.selectedRoom);
      result = this.session.build(this.selectedRoom, x, y);
      successMessage = 'اتاق ساخته شد. هزینه: ' + cost + ' سکه.';
    } else if (this.mode === 'dig') {
      const cost = this.session.digCost();
      result = this.session.dig(x, y);
      successMessage = 'حفاری با هزینهٔ ' + cost + ' سکه انجام شد.';
    } else if (this.mode === 'move') {
      const room = this.layout.getRoomAt(x, y);
      if (!this.pendingMoveId) {
        if (!room || room.type === 'command') {
          this.onAudioCue('error');
          this.notify('برای جابه‌جایی ابتدا یک اتاق معمولی انتخاب کنید.');
          return;
        }
        this.pendingMoveId = room.id;
        this.onAudioCue('select');
        this.paintPreview();
        this.notify('اتاق انتخاب شد؛ روی محل جدید بزنید.');
        return;
      }
      if (room?.id === this.pendingMoveId) {
        this.pendingMoveId = null;
        this.onAudioCue('select');
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
        this.onAudioCue('error');
        this.notify('در این موقعیت اتاقی وجود ندارد.');
        return;
      }
      if (this.mode === 'remove') {
        result = this.layout.remove(room.id);
        successMessage = 'اتاق تخریب شد.';
      } else {
        const cost = this.session.upgradeCostAt(x, y);
        result = this.session.upgradeAt(x, y);
        successMessage = 'اتاق ارتقا یافت. هزینه: ' + cost + ' سکه.';
      }
    }
    if (result.ok) {
      this.paintTerrain();
      this.paintRooms();
    }
    this.hovered = cell;
    this.paintPreview();
    this.onAudioCue(result.ok ? cue : 'error');
    this.notify(result.ok ? successMessage : result.reason);
  }

  private notify(message: string): void {
    this.report(this.session.snapshot(), message);
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
      }).setOrigin(0.5).setDepth(2).setResolution(3);
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
    this.roomBadges = [];
    for (const room of this.layout.rooms) {
      const definition = ROOM_DEFINITIONS[room.type];
      const { left, top } = toPixels(room.x, room.y);
      const width = room.width * WORLD.cellSize - 4;
      const height = room.height * WORLD.cellSize - 4;
      const specialFrame = GARDEN_MEDBAY_FRAME_BY_TYPE[room.type];
      const frame = specialFrame ?? ROOM_FRAME_BY_TYPE[room.type];
      const assetKey = specialFrame === undefined ? ROOM_ART_ASSET.key : GARDEN_MEDBAY_ART_ASSET.key;

      const texture = frame === undefined ? null : this.assets.resolve(
        assetKey, this.textures, frame
      );
      if (texture) {
        const sprite = this.add.image(left + 2, top + 2, texture.key, texture.frame)
          .setOrigin(0, 0)
          .setDisplaySize(width, height);
        this.roomLayer.add(sprite);
      }

      const graphics = this.add.graphics();
      if (!texture) {
        // Keep legacy room types and failed asset requests playable.
        graphics.fillStyle(definition.color).fillRoundedRect(left + 2, top + 2, width, height, 4);
        graphics.fillStyle(definition.accent, 0.21).fillRect(left + 10, top + 9, width - 16, 8);
      }
      graphics.lineStyle(1.5, definition.accent, 0.9)
        .strokeRoundedRect(left + 2, top + 2, width, height, 4);
      this.roomLayer.add(graphics);

      // At high zoom, keep the nameplate at its original screen size so it
      // does not obscure the newly detailed artwork. Text textures render at
      // 3× resolution instead of stretching a tiny 9px bitmap.
      const badgeWidth = width - 8;
      const badge = this.add.container(left + 6, top + height - 18);
      const plate = this.add.graphics();
      plate.fillStyle(0x09131f, 0.82).fillRoundedRect(0, 0, badgeWidth, 14, 3);
      const name = this.add.text(4, 1, definition.label, {
        fontSize: '9px', fontFamily: 'Arial', fontStyle: 'bold', color: '#f4f7fa'
      }).setResolution(3);
      const level = this.add.text(badgeWidth - 4, 1, 'LV ' + room.level, {
        fontSize: '9px', fontFamily: 'Arial', color: '#e0e5eb'
      }).setOrigin(1, 0).setResolution(3);
      badge.add([plate, name, level]);
      this.roomBadges.push(badge);
      this.roomLayer.add(badge);
    }
    this.updateBadgeScale();
  }

  private updateBadgeScale(): void {
    // Only counteract magnification; labels stay attached to their rooms.
    // Below 100% the room is too narrow for a full-size badge.
    const scale = 1 / Math.max(1, this.cameras.main.zoom);
    for (const badge of this.roomBadges) badge.setScale(scale);
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
    this.residentTween = this.tweens.add({ targets: person, x: left + 126, duration: 2300, yoyo: true, repeat: -1 });
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
      valid = this.layout.canPlace(this.selectedRoom, x, y).ok &&
        this.session.canAfford(this.session.buildCost(this.selectedRoom));
    } else if (this.mode === 'dig') {
      valid = this.layout.terrain.canDig(x, y).ok && this.session.canAfford(this.session.digCost());
    } else if (this.mode === 'move' && this.pendingMoveId) {
      const selected = this.layout.rooms.find((r) => r.id === this.pendingMoveId);
      if (!selected) return;
      width = selected.width; height = selected.height;
      valid = this.layout.canMove(selected.id, x, y).ok;
    } else if (room) {
      startX = room.x; startY = room.y;
      width = room.width; height = room.height;
      valid = this.mode === 'upgrade' ?
        this.session.upgradeCostAt(x, y) !== null &&
        this.session.canAfford(this.session.upgradeCostAt(x, y)!) :
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

