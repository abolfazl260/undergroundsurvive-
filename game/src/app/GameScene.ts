import { contaminationState } from '../modules/radiation/radiation';
import { confirmDestructiveAction } from './confirmDestructiveAction';
import { paintElevatorCars, paintElevatorShaft } from './elevatorArt';
import { ELEVATOR_DEFINITION } from '../modules/world/elevators';
import { canWire, POWER_BALANCE, type PowerAllocation } from '../modules/power/network';
import Phaser from 'phaser';
import type { MenuSettings } from './menuSettings';
import { getLocale, localizeGameMessage } from '../i18n';
import type { AudioCue } from '../modules/audio/AudioManager';
import { WORLD, toCell, toPixels, type GridPosition } from '../modules/world/grid';
import { ROOM_DEFINITIONS, type BuildableRoomType } from '../modules/building/catalog';
import { BuildingLayout } from '../modules/building/layout';
import { LEGACY_SURFACE_READ_ONLY_REASON } from '../modules/building/constructionPolicy';
import { findRoomPath } from '../modules/characters/pathfinding';
import type { ResidentTraffic } from '../modules/characters/traffic';
import { GameSession, type GameSnapshot, type UpgradeDetails } from '../modules/economy/session';
import type { PlacementResult } from '../modules/building/placement';
import { ROOM_ART_ASSET, GARDEN_MEDBAY_ART_ASSET, LAB_WATER_ART_ASSET, LEVEL_TWO_ROOM_ART_ASSET, LEVEL_TWO_ADDITIONAL_ART_ASSET, LEVEL_TWO_COMMAND_ART_ASSET, MISSING_ROOM_ART_ASSET, roomArtCandidates } from './roomArt';
import { SURVIVOR_ART, survivorGeometry, survivorFrame, hitSurvivor } from './survivorArt';
import { AssetManager } from './assets/assetManager';
import { TWO_CELL_CONSTRUCTION_ART_ASSET, TwoCellConstructionAnimation } from './twoCellConstruction';
import { DIGGING_ART_ASSET, DiggingAnimation } from './diggingAnimation';
import { CINEMATIC_BUNKER_BACKGROUND, terrainOverlayOpacity } from './backgroundArt';
import { backgroundPlacement, paintAlignedCinematicBackdrop } from './cinematicBackdrop';
import { roomCorridors } from './roomCorridors';
import { roomUtilityWarnings } from './roomUtilityWarnings';
import { clampZoom, constrainScroll, fitCameraZoom, GAME_VIEW, panBy, screenToWorld, zoomAt, zoomToWorldAnchor, ZOOM, type Point, type Viewport, type ZoomLimits } from './viewport';

type Contact = { x: number; y: number; startX: number; startY: number; dragged: boolean };
const localizedRoomBadges: Record<keyof typeof ROOM_DEFINITIONS, string> = {
  recreation:'تفریح', guardPost:'نگهبانی', command: 'فرمان', habitat: 'مسکونی', generator: 'برق', hydroponics: 'گلخانه',
  laboratory: 'آزمایشگاه', kitchen:'آشپزخانه', waterTreatment: 'تصفیه آب', ventilation: 'تهویه', medbay: 'درمانگاه', workshop: 'کارگاه', storage: 'انبار', mine: 'معدن'
};

export type ToolMode = 'elevator' | 'build' | 'dig' | 'move' | 'remove' | 'upgrade' | 'navigate' | 'cable' | 'riser' | 'cutCable';

export class GameScene extends Phaser.Scene {
  private readonly session: GameSession;
  // Transient presentation state; constructed rooms remain saved immediately.
  private readonly construction = new TwoCellConstructionAnimation();
  private readonly digging = new DiggingAnimation();
  private readonly diggingViews = new Map<string, {
    current: Phaser.GameObjects.Image;
    incoming: Phaser.GameObjects.Image;
    effects: Phaser.GameObjects.Graphics;
    left: number;
    top: number;
  }>();
  private diggingLayer?: Phaser.GameObjects.Container;
  private readonly constructionViews = new Map<string, {
    current: Phaser.GameObjects.Image;
    incoming: Phaser.GameObjects.Image;
    /** The upgraded room fades in only after the eight construction frames. */
    revealTarget?: Phaser.GameObjects.Image;
    effects: Phaser.GameObjects.Graphics;
    left: number;
    top: number;
    width: number;
    height: number;
  }>();
  private readonly assets = new AssetManager(
    [ROOM_ART_ASSET, GARDEN_MEDBAY_ART_ASSET, CINEMATIC_BUNKER_BACKGROUND, SURVIVOR_ART, LAB_WATER_ART_ASSET, LEVEL_TWO_ROOM_ART_ASSET, LEVEL_TWO_ADDITIONAL_ART_ASSET, LEVEL_TWO_COMMAND_ART_ASSET, MISSING_ROOM_ART_ASSET, TWO_CELL_CONSTRUCTION_ART_ASSET, DIGGING_ART_ASSET], import.meta.env.BASE_URL,
    Math.min(4, ZOOM.max * Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1))
  );
  private get layout(): BuildingLayout { return this.session.layout; }
  private selectedRoom: BuildableRoomType = 'habitat';
  private mode: ToolMode = 'build';
  private pendingMoveId: string | null = null;
  private selectedUpgradeId: string | null = null;
  private terrainLayer?: Phaser.GameObjects.Graphics;
  private elevatorCarLayer?: Phaser.GameObjects.Graphics;
  private roomLayer?: Phaser.GameObjects.Container;
  private roomBadges: Phaser.GameObjects.Container[] = [];
  private readonly roomUtilityViews = new Map<string, {
    graphics: Phaser.GameObjects.Graphics;
    left: number;
    top: number;
    width: number;
    height: number;
    key: string;
  }>();
  private airBadges: {id: string; label: Phaser.GameObjects.Text}[] = [];
  private preview?: Phaser.GameObjects.Graphics;
  private powerOverlay=false;
  private powerLayer?: Phaser.GameObjects.Graphics;
  private radiationOverlay=false;
  private radiationSelection:GridPosition={x:12,y:-1};
  private radiationLayer?:Phaser.GameObjects.Graphics;
  private previewReason?: Phaser.GameObjects.Text;
  private readonly recoveryFailed: boolean;
  private hovered: GridPosition | null = null;
  private readonly contacts = new Map<number, Contact>();
  private pinch?: { initialDistance: number; initialZoom: number; worldAnchor: Point };
  private gestureUsed = false;
  private gameplayPaused = true;
  private sceneReady = false;
  private menuSettings: MenuSettings = { reducedMotion: false };
  private readonly residentFigures = new Map<string, {
    person: Phaser.GameObjects.Container;
    sprite: Phaser.GameObjects.Image;
    variant: number;
    lastX: number;
    ring: Phaser.GameObjects.Ellipse;
  }>();
  private traffic?: ResidentTraffic;
  private selectedResidentId = 'resident-1';
  private readonly residentWaitMs = new Map<string, number>();
  private readonly patrolCursors = new Map<string, number>();
  private viewportSize: { width: number; height: number } = {
    width: GAME_VIEW.width, height: GAME_VIEW.height
  };
  /** Camera zoom is measured in renderer pixels; the UI reports relative zoom. */
  private baseZoom = 1;
  private zoomFactor: number = ZOOM.initial;

  private zoomLimits(): ZoomLimits {
    return { min: this.baseZoom * ZOOM.min, max: this.baseZoom * ZOOM.max };
  }

  constructor(
    private readonly report: (snapshot: GameSnapshot, message: string) => void,
    saved: unknown,
    private readonly onZoomChange: (zoom: number) => void = () => {},
    private readonly onAudioCue: (cue: AudioCue) => void = () => {},
    private readonly onAudioActivate: () => void = () => {},
    private readonly onUpgradeSelection: (details: UpgradeDetails | null) => void = () => {},
    private readonly onCycleProgress: (remainingSeconds: number) => void = () => {},
    private readonly onAssetProgress: (progress: number) => void = () => {},
    private readonly onAssetUnavailable: (key: string) => void = () => {},
    private readonly onAssetsComplete: () => void = () => {},
    private readonly onBootReady: () => void = () => {}
  ) {
    super({ key: 'UndergroundScene' });
    this.recoveryFailed = saved != null && !GameSession.restore(saved) && !BuildingLayout.restore(saved);
    this.session = GameSession.fromSave(saved);
  }

  preload(): void {
    // Phaser's real file loader progress drives the startup indicator.
    this.load.on('progress', (value: number) => this.onAssetProgress(value));
    this.load.on('loaderror', (file: { key: string }) => this.onAssetUnavailable(file.key));
    this.load.once('complete', () => this.onAssetsComplete());
    this.assets.preload(this.load, this.textures);
  }

  create(): void {
    this.assets.configureFilters(
      this.textures, Phaser.Textures.FilterMode.LINEAR, Phaser.Textures.FilterMode.NEAREST
    );
    // The game runs at device-pixel resolution. Fit the world to the actual
    // framebuffer while presenting the same 100% relative zoom on every screen.
    const camera = this.cameras.main;
    this.baseZoom = fitCameraZoom(camera.width, camera.height);
    camera.setZoom(this.baseZoom * this.zoomFactor);
    // Prefer the exact center of the world; constrainScroll keeps map edges valid.
    const start = this.currentView();
    const centered = { ...start,
      scrollX: GAME_VIEW.worldWidth / 2 - start.width / 2,
      scrollY: GAME_VIEW.worldHeight / 2 - start.height / 2
    };
    this.applyView({ ...centered, ...constrainScroll(centered) });
    this.viewportSize = { width: camera.width, height: camera.height };
    // Preserve the world-space center and the user's zoom after rotation/resize.
    const resizeView = (size: Phaser.Structs.Size): void => {
      if (size.width <= 0 || size.height <= 0) return;
      const previous = { ...this.currentView(), ...this.viewportSize };
      const center = screenToWorld(previous, { x: previous.width / 2, y: previous.height / 2 });
      this.baseZoom = fitCameraZoom(size.width, size.height);
      camera.setSize(size.width, size.height);
      this.viewportSize = { width: size.width, height: size.height };
      const next: Viewport = { ...previous, width: size.width, height: size.height,
        zoom: this.baseZoom * this.zoomFactor,
        scrollX: center.x - size.width / 2, scrollY: center.y - size.height / 2 };
      this.applyView({ ...next, ...constrainScroll(next) });
    };
    this.scale.on('resize', resizeView);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', resizeView));
    this.drawBackdrop();
    this.terrainLayer = this.add.graphics().setDepth(1);
    this.elevatorCarLayer = this.add.graphics().setDepth(3.8);
    this.radiationLayer=this.add.graphics().setDepth(5);
    this.powerLayer=this.add.graphics().setDepth(5.5);
    this.roomLayer = this.add.container(0, 0).setDepth(3);
    this.diggingLayer = this.add.container(0, 0).setDepth(2.9);
    this.preview = this.add.graphics().setDepth(6);
    this.paintTerrain();
    this.paintRooms();
    this.paintPower();
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
      if (dy !== 0) this.setZoomAt(this.zoomFactor + (dy < 0 ? 0.15 : -0.15), { x: pointer.x, y: pointer.y });
    });
    this.onZoomChange(this.zoomFactor);
    this.onCycleProgress(Math.ceil(this.session.resources.remainingMs / 1000));
    if(this.recoveryFailed) this.notify('ذخیره قابل بازیابی نیست؛ نسخهٔ اصلی برای بازیابی نگهداری شد.');
    else if (this.layout.disconnectedRoomIds.length)
      this.notify('ذخیرهٔ قدیمی دارای اتاق‌های جداافتاده است؛ اتاق‌ها حفظ شده‌اند. برای اصلاح، آن‌ها را به شبکهٔ آسانسور منتقل کنید.');
    else this.notify('ابزار ساخت را انتخاب کنید؛ با اسکرول یا دو انگشت زوم کنید و با کشیدن، نقشه را جابه‌جا کنید.');
    if (this.gameplayPaused) this.scene.pause();
    // Only now is saved world state, artwork, and initial scene rendering ready.
    this.onBootReady();
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
    // Respect accessibility when reduced motion is toggled mid-construction.
    if (settings.reducedMotion && this.construction.active) {
      this.construction.clear();
      if (this.sceneReady) this.paintRooms();
    }
    if (settings.reducedMotion) {
      this.digging.clear();
      this.clearDiggingViews();
    }
    this.session.survivors.setReducedMotion(settings.reducedMotion);
    // Reduced motion resolves one traversable step per update without
    // skipping terrain boundaries or elevator ride phases.
    this.syncResidents();
  }

  private lastCycleCountdown = -1;

  update(_time: number, delta: number): void {
    if (this.gameplayPaused) return;
    // Phaser's scene update automatically pauses animation with the game.
    if (this.construction.advance(delta)) this.paintRooms();
    else if (this.construction.active) this.refreshConstructionViews();
    for (const key of this.digging.advance(delta)) this.removeDiggingView(key);
    if (this.digging.active) this.refreshDiggingViews();
    this.session.setRadiationOccupants((this.traffic?.residents??[]).map(r=>({id:r.id,x:r.cell.x,y:r.cell.y,protection:0})));
    const researchBefore=this.session.research.snapshot().activeResearchId;
    const completed = this.session.advanceTime(delta);
    const seconds = Math.ceil(this.session.resources.remainingMs / 1000);
    if (seconds !== this.lastCycleCountdown) {
      this.lastCycleCountdown = seconds;
      this.onCycleProgress(seconds);
    }
    if (completed > 0) {
      this.updateAirBadges();
      this.paintRadiation();
      this.paintPower();
      if (this.layout.rooms.some(r=>r.type==='kitchen')) this.paintRooms();
      const result = this.session.resources.snapshot();
      this.notify(researchBefore && !this.session.research.snapshot().activeResearchId ? 'پژوهش تکمیل شد.' : result.lastShortages.length
        ? 'چرخهٔ منابع انجام شد؛ برخی اتاق‌ها به‌علت کمبود منابع متوقف شدند.'
        : 'چرخهٔ تولید و مصرف منابع انجام شد.');
    }
    if (!this.traffic) return;
    const arrivals: string[] = [];
    this.syncResidents();
    this.paintElevatorMotion();
    for (const resident of this.traffic.residents) {
      if (resident.isMoving || this.session.survivors.assignment(resident.id)) continue;
      if (arrivals.includes(resident.id)) this.residentWaitMs.set(resident.id, 1800);
      const remaining = (this.residentWaitMs.get(resident.id) ?? 1400) -
        Math.max(0, Math.min(delta, 1000));
      this.residentWaitMs.set(resident.id, remaining);
      if (remaining <= 0) this.patrolResident(resident.id);
    }
  }

  /** Repaint translated nameplates without changing any gameplay state. */
  refreshLanguage(): void {
    if (this.sceneReady) this.paintRooms();
  }

  /** Exposed to the responsive HTML zoom controls. */
  zoomBy(amount: number): void {
    this.setZoomAt(this.zoomFactor + amount, {
      x: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2
    });
  }

  resetZoom(): void {
    const view = this.currentView();
    const centered = {
      ...view, zoom: this.baseZoom * ZOOM.initial,
      scrollX: (GAME_VIEW.worldWidth - view.width) / 2,
      scrollY: (GAME_VIEW.worldHeight - view.height) / 2
    };
    this.applyView({ ...centered, ...constrainScroll(centered) });
  }

  private currentView(): Viewport {
    const camera = this.cameras.main;
    return {
      width: camera.width, height: camera.height,
      worldWidth: GAME_VIEW.worldWidth, worldHeight: GAME_VIEW.worldHeight,
      zoom: camera.zoom, scrollX: camera.scrollX, scrollY: camera.scrollY
    };
  }

  private applyView(view: Viewport): void {
    const camera = this.cameras.main;
    const changedZoom = camera.zoom !== view.zoom;
    camera.setZoom(view.zoom);
    camera.setScroll(view.scrollX, view.scrollY);
    this.zoomFactor = clampZoom(view.zoom / this.baseZoom);
    if (changedZoom) {
      this.updateBadgeScale();
      this.onZoomChange(this.zoomFactor);
    }
    if (this.contacts.size === 0) this.updateHover(this.input.activePointer);
    else {
      this.hovered = null;
      this.paintPreview();
    }
  }

  private setZoomAt(zoom: number, screen: Point): void {
    this.applyView(zoomAt(this.currentView(), this.baseZoom * clampZoom(zoom), screen, this.zoomLimits()));
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
      this.applyView(zoomToWorldAnchor(this.currentView(), targetZoom, this.pinch.worldAnchor, midpoint, this.zoomLimits()));
      return;
    }

    if (Math.hypot(contact.x - contact.startX, contact.y - contact.startY) > 14 / this.scale.zoom) {
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
      const screen = { x: pointer.x, y: pointer.y };
      const cell = this.pointToCell(screen);
      if (cell) this.actOnCell(cell, screenToWorld(this.currentView(), screen));
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
    this.radiationOverlay=false;this.paintRadiation();
    if (tool === 'cable' || tool === 'riser' || tool === 'cutCable') this.powerOverlay=true;
    this.paintPower();
    this.mode = tool;
    this.pendingMoveId = null;
    this.selectedUpgradeId = null;
    this.onUpgradeSelection(null);
    this.syncResidents();
    this.paintPreview();
    const messages: Record<ToolMode, string> = {
      cable: 'روی خانهٔ باز برای نصب کابل افقی بزنید. هزینه ۱۵ سکه.',
      riser: 'روی دو خانهٔ عمودی مجاور، رابط عمودی نصب کنید؛ هر رابط ۳۵ سکه.',
      cutCable: 'برای حذف کابل روی خانهٔ دارای کابل بزنید.',
      elevator: 'آسانسور را در خانهٔ مجاور شفت امتداد دهید.',
      build: 'جایگاه‌های سبز کنار آسانسور یا اتاق‌های متصل را برای ساخت انتخاب کنید.',
      dig: 'برای حفاری روی زمین بستهٔ زیرزمینی مجاور فضای باز بزنید.',
      move: 'ابتدا اتاق را انتخاب کنید و سپس مکان جدید آن را لمس کنید.',
      remove: 'برای تخریب روی اتاق کلیک کنید. مجوزهای کسب‌شده حفظ می‌شوند.',
      upgrade: 'اتاق را انتخاب کنید، جزئیات ارتقا را ببینید و سپس پرداخت را تأیید کنید.',
      navigate: 'ابتدا آدمک را لمس کنید، سپس اتاق مقصد را انتخاب کنید. مسیر فقط از زمین قابل‌عبور می‌گذرد.'
    };
    this.onAudioCue('select');
    this.notify(messages[tool]);
  }

  unlockFloor(): void {
    const cost = this.session.floorCost();
    const result = this.session.unlockFloor();
    if (result.ok) {
      this.paintTerrain();
      this.refreshResidentPath();
    }
    this.onAudioCue(result.ok ? 'floor' : 'error');
    this.paintPreview();
    this.notify(result.ok ? 'طبقهٔ جدید با پرداخت ' + cost + ' سکه آزاد شد؛ برای ساخت تکیه‌گاه لازم است.' : result.reason);
  }

  assignSurvivor(id:string,roomId:string):void {
    if(this.gameplayPaused)return;
    const room=this.layout.rooms.find(r=>r.id===roomId);
    const block=room?.type==='laboratory'?this.session.assignScientist(id,roomId,crypto.randomUUID()):room?.type==='recreation'?this.session.assignRecreation(id,roomId,crypto.randomUUID()):null;
    const reason=room?.type==='laboratory'||room?.type==='recreation'?(block?({survivor:'بازمانده وجود ندارد.',room:'اتاق معتبر نیست.',busy:'نیرو شغل دیگری دارد؛ ابتدا آزاد کنید.',capacity:'ظرفیت اتاق پر است.',path:'مسیر قابل‌عبور نیست.',duplicate:'درخواست تکراری است.',satisfied:'روحیه کامل است.',power:'برق کافی نیست.'}[block]):null):room?.type==='kitchen'?this.session.assignCook(id,roomId,crypto.randomUUID()):this.session.assignGuard(id,roomId,crypto.randomUUID());
    this.syncResidents();this.notify(reason??'تخصیص انجام شد؛ نیرو در مسیر است.');
  }
  releaseSurvivor(id:string):void {
    if(this.gameplayPaused)return;
    this.session.survivors.release(id);this.notify('نیرو آزاد شد.');
  }
  commandPopulation():number{return this.traffic?.residents.length??0;}
  /** The room's game level is committed immediately; only its artwork transition is staged. */
  private beginUpgradeConstruction(roomId: string, previousLevel: number | undefined): void {
    if (previousLevel === undefined) return;
    const room = this.layout.rooms.find((candidate) => candidate.id === roomId);
    if (!room || !this.assets.resolve(TWO_CELL_CONSTRUCTION_ART_ASSET.key, this.textures, 0)) return;
    // The approved atlas is two cells wide. Other dimensions need their own artwork.
    this.construction.startUpgrade(room.id, room.width, room.height, previousLevel, this.menuSettings.reducedMotion);
  }

  upgradeCommandCenter():void {
    if(this.gameplayPaused)return;
    const id=this.session.commandStatus().activeRoomId;
    const previousLevel=this.layout.rooms.find((room)=>room.id===id)?.level;
    const result=id?this.session.upgradeRoom(id,crypto.randomUUID()):{ok:false as const,reason:'اتاق فرماندهی فعال لازم است.'};
    if(result.ok) {
      this.beginUpgradeConstruction(id!, previousLevel);
      this.paintRooms();
    }
    this.notify(result.ok?'فرماندهی ارتقا یافت.':result.reason);
  }
  togglePowerOverlay():void {
    this.powerOverlay = !this.powerOverlay;
    this.paintPower();
    this.onAudioCue('select');
    this.notify(this.powerOverlay ? 'نمایش شبکه برق فعال شد.' : 'نمایش شبکه برق غیرفعال شد.');
  }
  powerView(): { enabled:boolean; cableCount:number; allocation:PowerAllocation } {
    return {enabled:this.powerOverlay,cableCount:this.session.power.cables.length,
      allocation:this.session.powerStatus()};
  }
  activatePowerNetwork():void {
    if(this.gameplayPaused)return;
    const result=this.session.activatePowerNetwork();
    this.paintPower();
    this.notify(result.ok?'شبکه برق فیزیکی فعال شد.':result.reason);
  }
  prioritizePower(id:string, priority:0|1|2):void {
    if(this.gameplayPaused)return;
    const result=this.session.prioritizeRoom(id,priority);
    this.paintPower();
    this.notify(result.ok?'اولویت مصرف برق تغییر کرد.':result.reason);
  }
  private paintPower():void {
    // Utility warnings must update even when the optional cable overlay is hidden.
    this.refreshRoomUtilityWarnings();
    const g=this.powerLayer;if(!g)return;g.clear();
    if(!this.powerOverlay)return;
    const cables=this.session.power.cables;
    const wired=new Map(cables.map(c=>[c.x+':'+c.y,c]));
    for(const cable of cables) {
      const at=toPixels(cable.x,cable.y);
      const cx=at.left+WORLD.cellSize/2,cy=at.top+WORLD.cellSize/2;
      g.lineStyle(3,0xffca63,0.90);
      const right=wired.get((cable.x+1)+':'+cable.y);
      if(right)g.lineBetween(cx,cy,cx+WORLD.cellSize,cy);
      const above=wired.get(cable.x+':'+(cable.y+1));
      if(above&&cable.riser&&above.riser) {
        const p=toPixels(above.x,above.y);
        g.lineBetween(cx,cy,p.left+WORLD.cellSize/2,p.top+WORLD.cellSize/2);
      }
      g.fillStyle(cable.riser?0xffbd4a:0x6fe8db,0.96);
      g.fillRoundedRect(cx-5,cy-5,10,10,2);
      if(cable.riser) {g.lineStyle(1.5,0x17252c).lineBetween(cx-3,cy+1,cx,cy-3);
        g.lineBetween(cx,cy-3,cx+3,cy+1);}
    }
    const statuses=new Map(this.session.powerStatus().rooms.map(r=>[r.roomId,r]));
    for(const room of this.layout.rooms) {
      const state=statuses.get(room.id);
      if(!state||state.status==='online'||state.status==='legacy')continue;
      const at=toPixels(room.x,room.y);
      const cx=at.left+room.width*WORLD.cellSize-13,cy=at.top+12;
      g.fillStyle(0x9e2635,0.9).fillCircle(cx,cy,10);
      g.lineStyle(2,0xffffff,1).lineBetween(cx-4,cy-4,cx+4,cy+4);
      g.lineBetween(cx-4,cy+4,cx+4,cy-4);
    }
  }
  toggleRadiation():void {this.radiationOverlay=!this.radiationOverlay;this.paintRadiation();}
  radiationView() {return {enabled:this.radiationOverlay,cell:{...this.radiationSelection}};}
  cleanupRadiation():void {
    if(this.gameplayPaused)return;
    const {x,y}=this.radiationSelection;
    const ok=this.session.cleanupRadiation(x,y,crypto.randomUUID());this.paintRadiation();this.notify(ok?'پاکسازی انجام شد.':'پاکسازی ممکن نیست؛ موجودی را بررسی کنید.');
  }
  filterRadiation():void {
    if(this.gameplayPaused)return;
    const r=this.layout.getRoomAt(this.radiationSelection.x,this.radiationSelection.y);
    const ok=r&&this.session.installRadiationFilter(r.id,crypto.randomUUID());this.paintRadiation();this.notify(ok?'فیلتر نصب شد.':'ابتدا اتاق بدون فیلتر انتخاب کنید و موجودی را بررسی کنید.');
  }
  private paintRadiation():void {
    const g=this.radiationLayer;if(!g)return;g.clear();if(!this.radiationOverlay)return;
    const colors={low:0x43c9a5,medium:0xffbf55,high:0xf35572};
    for(let y:number=WORLD.minY;y<=WORLD.maxY;y++)for(let x=0;x<WORLD.cols;x++) {
      const {left,top}=toPixels(x,y),risk=this.session.radiation.getRiskForLocation(x,y);
      g.fillStyle(colors[contaminationState(risk)],0.28).fillRect(left+1,top+1,WORLD.cellSize-2,WORLD.cellSize-2);
    }
    const p=toPixels(this.radiationSelection.x,this.radiationSelection.y);g.lineStyle(3,0xffffff).strokeRect(p.left+2,p.top+2,50,50);
  }
  startResearch(id:string):void {
    if(this.gameplayPaused)return;
    const ok=this.session.startResearch(id,crypto.randomUUID());
    this.notify(ok ? 'پژوهش آغاز شد.' : 'پژوهش قابل شروع نیست؛ پیش‌نیازها را بررسی کنید.');
  }
  startCooking(roomId: string, recipeId: string): void {
    if (this.gameplayPaused) return;
    const reason = this.session.startCooking(roomId, recipeId, crypto.randomUUID());
    this.paintRooms(); this.notify(reason ? 'شروع پخت ممکن نیست: ' + reason : 'پخت جیره آغاز شد.');
  }
  toggleCooking(roomId: string): void {
    if (this.gameplayPaused) return;
    this.session.toggleCooking(roomId);
    this.paintRooms(); this.notify('وضعیت پخت تغییر کرد.');
  }
  cancelCooking(roomId: string): void {
    if (this.gameplayPaused) return;
    this.session.cancelCooking(roomId);
    this.paintRooms(); this.notify('پخت لغو شد؛ مواد مصرف‌شده بازگردانده نمی‌شوند.');
  }
  collectWater(): void {
    if (this.gameplayPaused) return;
    const ok = this.session.collectWater(crypto.randomUUID());
    this.notify(ok ? 'آب خام برداشت شد.' : 'برداشت ممکن نیست؛ برق، فضای مخزن و ذخیرهٔ چاه را بررسی کنید.');
  }
  toggleWater(id: string): void {
    if (this.gameplayPaused) return;
    this.session.toggleWater(id); this.notify('تصفیه آب');
  }
  toggleLifeSupportLink(a: string, b: string): void {
    if (this.gameplayPaused) return;
    const ok = this.session.toggleLifeSupportLink(a, b);
    this.notify(ok ? 'وضعیت اتصال آب و اکسیژن تغییر کرد.' : 'این دو اتاق اتصال قابل تغییر ندارند.');
  }
  toggleVent(id: string): void {
    if (this.gameplayPaused) return;
    const ok = this.session.toggleVent(id, crypto.randomUUID());
    this.updateAirBadges();
    this.notify(ok ? 'وضعیت تهویه تغییر کرد.' : 'تغییر وضعیت تهویه ممکن نیست.');
  }
  repairVent(id: string): void {
    if (this.gameplayPaused) return;
    const ok = this.session.repairVent(id, crypto.randomUUID());
    this.updateAirBadges();
    this.notify(ok ? 'تجهیزات تهویه تعمیر شد.' : 'تعمیر تهویه ممکن نیست؛ موجودی را بررسی کنید.');
  }
  claimDemoBonus(): void {
    const result = this.session.claimDemoBonus();
    this.onAudioCue(result.ok ? 'reward' : 'error');
    this.paintPreview();
    this.notify(result.ok ? '۵۰۰ سکهٔ کمک‌هزینهٔ آزمایشی دریافت شد.' : result.reason);
  }

  resetLayout(): void {
    this.construction.clear();
    this.digging.clear();
    this.clearDiggingViews();
    this.session.reset();
    this.lastCycleCountdown = -1;
    this.onCycleProgress(5);
    this.onAudioCue('reset');
    this.pendingMoveId = null;
    this.selectedUpgradeId = null;
    this.onUpgradeSelection(null);
    this.paintTerrain();
    this.paintRadiation();
    this.paintRooms();
    this.resetResident();
    this.paintPreview();
    this.notify('نقشه، حفاری‌ها و طبقات به وضعیت اولیه بازگردانده شدند.');
  }

  /** Commit a selected upgrade only after the explicit confirmation button is used. */
  upgradeSelected(): void {
    if (this.gameplayPaused || this.mode !== 'upgrade' || !this.selectedUpgradeId) {
      this.onAudioCue('error');
      this.notify('ابتدا در حالت ارتقا یک اتاق را انتخاب کنید.');
      return;
    }
    const id = this.selectedUpgradeId;
    const details = this.session.upgradeDetails(id);
    if (!details || details.cost === null) {
      this.onUpgradeSelection(details);
      this.onAudioCue('error');
      this.notify(details ? details.blockedReason ?? 'این اتاق در بالاترین سطح قرار دارد.' : 'اتاق انتخاب‌شده وجود ندارد.');
      return;
    }
    const previousLevel = this.layout.rooms.find((room) => room.id === id)?.level;
    const result = this.session.upgradeRoom(id,crypto.randomUUID());
    if (result.ok) {
      this.beginUpgradeConstruction(id, previousLevel);
      this.paintRooms();
    }
    this.onUpgradeSelection(this.session.upgradeDetails(id));
    this.paintPreview();
    this.onAudioCue(result.ok ? 'upgrade' : 'error');
    this.notify(result.ok
      ? 'اتاق ' + details.label + ' با هزینهٔ ' + details.cost + ' سکه ارتقا یافت.'
      : result.reason);
  }

  private actOnCell(cell: GridPosition, worldPoint?: Point): void {
    if (this.gameplayPaused) return;
    const { x, y } = cell;
    if(this.radiationOverlay) {
      this.radiationSelection={x,y};this.paintRadiation();this.notify('منطقهٔ تشعشع انتخاب شد.');return;
    }
    if(this.mode==='cable'||this.mode==='riser'||this.mode==='cutCable') {
      const result=this.mode==='cutCable'?this.session.removeCable(x,y):
        this.session.installCable(x,y,this.mode==='riser');
      if(result.ok)this.paintPower();
      this.hovered=cell;this.paintPreview();
      this.onAudioCue(result.ok?'build':'error');
      this.notify(result.ok?(this.mode==='cutCable'?'کابل حذف شد.':'کابل نصب شد.'):result.reason);
      return;
    }
    if (this.mode === 'elevator') {
      const result=this.session.buildElevator(x,y);
      if(result.ok) { this.paintTerrain(); this.paintPower(); this.refreshResidentPath(); }
      this.hovered = cell;
      this.paintPreview();
      this.notify(result.ok ? 'آسانسور ساخته و طبقه آزاد شد.' : result.reason); return;
    }
    if (this.mode === 'navigate') {
      // Tap a character to select it, then tap a room to direct that resident.
      // Use rendered positions, not only grid origins, for moving characters.
      const selected = worldPoint && this.traffic?.residents.find((resident) =>
        hitSurvivor(resident.position, worldPoint, this.cameras.main.zoom)
      );
      if (selected) {
        this.selectedResidentId = selected.id;
        this.syncResidents();
            this.onAudioCue('select');
        this.notify('آدمک ' + selected.id.replace('resident-', '') + ' انتخاب شد؛ اتاق مقصد را لمس کنید.');
        return;
      }
      const room = this.layout.getRoomAt(x, y);
      if (!room || !this.beginResidentWalk(this.selectedResidentId, room.id, true)) {
        this.onAudioCue('error');
        this.notify(room ? 'مسیر قابل‌عبوری به این اتاق وجود ندارد.' : 'ابتدا یک اتاق مقصد انتخاب کنید.');
        return;
      }
      this.onAudioCue('select');
      this.notify('مقصد آدمک انتخاب‌شده: ' + ROOM_DEFINITIONS[room.type].label + '.');
      return;
    }
    if (this.mode === 'upgrade') {
      const room = this.layout.getRoomAt(x, y);
      this.selectedUpgradeId = room?.id ?? null;
      const preview = room ? this.session.upgradeDetails(room.id) : null;
      this.onUpgradeSelection(preview);
      this.hovered = cell;
      this.paintPreview();
      this.onAudioCue(preview ? 'select' : 'error');
      this.notify(!preview ? 'در این موقعیت اتاقی وجود ندارد.' :
        room && !this.layout.canEditRoom(room) ? LEGACY_SURFACE_READ_ONLY_REASON :
        preview.cost === null ? 'این اتاق در بالاترین سطح قرار دارد.' :
        'جزئیات ارتقا نمایش داده شد؛ با دکمهٔ تأیید پرداخت کنید.');
      return;
    }
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
        if (!room || !this.layout.canEditRoom(room)) {
          this.onAudioCue('error');
          this.notify(room && !this.layout.canEditRoom(room) ? LEGACY_SURFACE_READ_ONLY_REASON :
            'برای جابه‌جایی ابتدا یک اتاق معمولی انتخاب کنید.');
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
      result = this.session.moveRoom(this.pendingMoveId, x, y);
      successMessage = 'اتاق به محل جدید منتقل شد.';
      if (result.ok) this.pendingMoveId = null;
    } else {
      // Destruction is irreversible: require an explicit second action.
      const room = this.layout.getRoomAt(x, y);
      if (!room) {
        this.onAudioCue('error');
        this.notify('در این موقعیت اتاقی وجود ندارد.');
        return;
      }
      void this.removeRoomWithConfirmation(room.id);
      return;
    }
    if (result.ok) {
      if (this.mode === 'build') {
        const newRoom = this.layout.getRoomAt(x, y);
        // Keep the purchase/save transaction unchanged. Animate fresh two-cell
        // builds only; upgrades independently replay this same visual timeline.
        if (newRoom?.width === 2 && newRoom.height === 1 &&
          this.assets.resolve(TWO_CELL_CONSTRUCTION_ART_ASSET.key, this.textures, 0)) {
          this.construction.start(
            newRoom.id, newRoom.width, newRoom.height, this.menuSettings.reducedMotion
          );
        }
      }
      this.paintTerrain();
      this.paintRooms();
      this.paintPower();
      if (this.mode === 'dig') this.startDigging(x, y);
      this.refreshResidentPath();
    }
    this.hovered = cell;
    this.paintPreview();
    this.onAudioCue(result.ok ? cue : 'error');
    this.notify(result.ok ? successMessage : result.reason);
  }

  private async removeRoomWithConfirmation(roomId: string): Promise<void> {
    const room = this.layout.rooms.find((candidate) => candidate.id === roomId);
    if (!room || !this.layout.canEditRoom(room)) {
      this.onAudioCue('error');
      this.notify(room ? LEGACY_SURFACE_READ_ONLY_REASON : 'اتاق انتخاب‌شده دیگر وجود ندارد.');
      return;
    }
    const persian = getLocale() === 'fa';
    const accepted = await confirmDestructiveAction({
      title: persian ? 'تخریب اتاق؟' : 'Demolish room?',
      description: persian
        ? 'این اتاق و منابع صرف‌شده برای ساخت آن حذف می‌شوند. این عملیات قابل بازگشت نیست.'
        : 'This room and its construction investment will be lost. This cannot be undone.',
      confirmLabel: persian ? 'تخریب اتاق' : 'Demolish',
      cancelLabel: persian ? 'انصراف' : 'Cancel'
    });
    if (!accepted || this.gameplayPaused || this.mode !== 'remove') return;
    // Revalidate the exact room after the modal closes, never destroy a new occupant of the same cell.
    const current = this.layout.rooms.find((candidate) => candidate.id === roomId);
    if (!current || !this.layout.canEditRoom(current)) return;
    const result = this.session.removeRoom(roomId);
    if (result.ok) {
      this.construction.cancel(roomId);
      this.paintTerrain();
      this.paintRooms();
      this.paintPower();
      this.refreshResidentPath();
    }
    this.paintPreview();
    this.onAudioCue(result.ok ? 'remove' : 'error');
    this.notify(result.ok ? 'اتاق تخریب شد.' : result.reason);
  }

  private notify(message: string): void {
    const snapshot = this.session.snapshot();
    // Also react immediately to resource spending, refills and toggles;
    // waiting for the next five-second cycle would leave a stale icon.
    this.refreshRoomUtilityWarnings();
    this.report(snapshot, message);
  }

  private drawBackdrop(): void {
    // Keep an oversized solid fallback behind the artwork for panning, zooming
    // out, or a failed texture request. The background stays behind gameplay
    // layers and the independent, interactive elevator/exit-door graphics.
    const fallback = this.add.graphics().setDepth(-1);
    fallback.fillStyle(0x211f2a).fillRect(-600, -400, 2160, WORLD.groundLineY + 400);
    fallback.fillStyle(0x33271e).fillRect(-600, WORLD.groundLineY, 2160, 1000);

    const background = this.assets.resolve(CINEMATIC_BUNKER_BACKGROUND.key, this.textures);
    if (background) {
      // The original cutaway has a *baked* lift at the left edge; it does not
      // coincide with the real in-game shaft. Compose a clean version only once
      // rather than shifting the grid, the room art or existing save coordinates.
      const alignedKey = 'cinematic-bunker-aligned';
      try {
        if (!this.textures.exists(alignedKey)) {
          const placement = backgroundPlacement(
            GAME_VIEW.worldWidth, GAME_VIEW.worldHeight, WORLD.groundLineY
          );
          const texture = this.textures.createCanvas(
            alignedKey, placement.width, placement.height
          );
          const context = texture.getContext();
          const source = this.textures.get(background.key).getSourceImage() as CanvasImageSource;
          paintAlignedCinematicBackdrop(context, source, placement);
          texture.refresh();
          texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
        this.add.image(0, 0, alignedKey)
          .setOrigin(0, 0)
          .setDisplaySize(GAME_VIEW.worldWidth, GAME_VIEW.worldHeight)
          .setDepth(0);
      } catch (error) {
        console.warn('Could not compose the aligned bunker background:', error);
        // A safe scenery fallback keeps the game playable on unusual devices.
        this.add.image(0, 0, background.key)
          .setOrigin(0, 0)
          .setDisplaySize(GAME_VIEW.worldWidth, GAME_VIEW.worldHeight)
          .setDepth(0);
      }
    }
    this.add.text(20, 20, 'SURFACE / CONSTRUCTION LOCKED', { fontSize: '13px', color: '#e2e5ed' }).setDepth(2);
    this.add.text(20, GAME_VIEW.worldHeight - 34, 'UNDERGROUND / EXCAVATE BELOW', { fontSize: '13px', color: '#cbb7a0' }).setDepth(2);
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
        g.fillStyle(color, terrainOverlayOpacity(y, open));
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
    paintElevatorShaft(g, this.layout.terrain.elevators);
    this.paintElevatorMotion();
  }

  /** One-cell excavation animation; no building scaffold or finished room. */
  private startDigging(x: number, y: number): void {
    if (!this.diggingLayer || this.menuSettings.reducedMotion) return;
    const texture = this.assets.resolve(DIGGING_ART_ASSET.key, this.textures, 0);
    if (!texture) return; // Never block excavation if artwork failed to load.
    const key = x + ':' + y;
    if (!this.digging.start(key)) return;
    this.removeDiggingView(key);
    const { left, top } = toPixels(x, y);
    const current = this.add.image(left + 1, top + 1, texture.key, 0)
      .setOrigin(0, 0).setDisplaySize(WORLD.cellSize - 2, WORLD.cellSize - 2);
    const incoming = this.add.image(left + 1, top + 1, texture.key, 1)
      .setOrigin(0, 0).setDisplaySize(WORLD.cellSize - 2, WORLD.cellSize - 2).setAlpha(0);
    const effects = this.add.graphics();
    this.diggingLayer.add([current, incoming, effects]);
    this.diggingViews.set(key, { current, incoming, effects, left, top });
    this.refreshDiggingViews();
  }

  private removeDiggingView(key: string): void {
    const view = this.diggingViews.get(key);
    if (!view) return;
    view.current.destroy();
    view.incoming.destroy();
    view.effects.destroy();
    this.diggingViews.delete(key);
  }

  private clearDiggingViews(): void {
    for (const key of this.diggingViews.keys()) this.removeDiggingView(key);
  }

  /** Reuse sprites and update opacity instead of repainting the world each tick. */
  private refreshDiggingViews(): void {
    for (const [key, view] of this.diggingViews) {
      const state = this.digging.visual(key);
      if (!state) {
        this.removeDiggingView(key);
        continue;
      }
      view.current.setFrame(state.frame).setAlpha(1 - state.reveal);
      view.incoming.setFrame(state.nextFrame).setAlpha(state.blend * (1 - state.reveal));
      const g = view.effects;
      g.clear().setAlpha(1 - state.reveal);
      const x = view.left + 4;
      const bottom = view.top + WORLD.cellSize - 4;
      const barWidth = WORLD.cellSize - 8;
      g.fillStyle(0x0a1015, 0.68).fillRect(x, bottom, barWidth, 2);
      g.fillStyle(0xf2b14c, 0.95).fillRect(x, bottom, barWidth * state.progress, 2);
      // Low-cost deterministic rock dust; no emitters, particles or extra textures.
      if (state.frame < 7 && state.reveal === 0) {
        for (let i = 0; i < 3; i++) {
          const drift = (state.elapsedMs * (0.011 + i * 0.003) + 11 * i) % (WORLD.cellSize - 12);
          const lift = (state.elapsedMs * (0.007 + i * 0.002) + 9 * i) % (WORLD.cellSize - 14);
          g.fillStyle(0xe7b985, 0.12 + 0.08 * Math.sin(state.elapsedMs * 0.007 + i) ** 2)
            .fillCircle(view.left + 6 + drift, view.top + WORLD.cellSize - 8 - lift, 0.7);
        }
      }
    }
  }

  private paintRooms(): void {
    if (!this.roomLayer) return;
    this.roomLayer.removeAll(true);
    // Graphics are recreated on structural redraw only, not on every fade tick.
    this.constructionViews.clear();
    this.roomBadges = [];
    this.roomUtilityViews.clear();
    this.airBadges = [];
    // Draw connector passages over the room artwork, then restore UI labels on top.
    const roomLabels: Phaser.GameObjects.GameObject[] = [];
    for (const room of this.layout.rooms) {
      const definition = ROOM_DEFINITIONS[room.type];
      const { left, top } = toPixels(room.x, room.y);
      const width = room.width * WORLD.cellSize - 4;
      const height = room.height * WORLD.cellSize - 4;
      const constructionVisual = this.construction.visual(room.id);
      const constructionArt = constructionVisual === null ? null : this.assets.resolve(
        TWO_CELL_CONSTRUCTION_ART_ASSET.key, this.textures, constructionVisual.frame
      );
      if (constructionArt && constructionVisual) {
        const upgradeFromLevel = this.construction.upgradeFromLevel(room.id);
        // During an upgrade, keep the previous level behind the scaffold. The
        // new art is completely hidden until the final reveal (unlike a fresh build).
        const baseArt = roomArtCandidates(room.type, upgradeFromLevel ?? room.level)
          .map(({ key, frame }) => this.assets.resolve(key, this.textures, frame))
          .find((resolved) => resolved !== null) ?? null;
        if (baseArt) {
          this.roomLayer.add(this.add.image(left + 2, top + 2, baseArt.key, baseArt.frame)
            .setOrigin(0, 0).setDisplaySize(width, height));
        } else {
          const backing = this.add.graphics();
          backing.fillStyle(definition.color).fillRoundedRect(left + 2, top + 2, width, height, 4);
          backing.fillStyle(definition.accent, 0.21).fillRect(left + 10, top + 9, width - 16, 8);
          this.roomLayer.add(backing);
        }
        let revealTarget: Phaser.GameObjects.Image | undefined;
        if (upgradeFromLevel !== null) {
          const upgradedArt = roomArtCandidates(room.type, room.level)
            .map(({ key, frame }) => this.assets.resolve(key, this.textures, frame))
            .find((resolved) => resolved !== null) ?? null;
          if (upgradedArt) {
            revealTarget = this.add.image(left + 2, top + 2, upgradedArt.key, upgradedArt.frame)
              .setOrigin(0, 0).setDisplaySize(width, height).setAlpha(constructionVisual.reveal);
            this.roomLayer.add(revealTarget);
          }
        }
        const constructionSprite = this.add.image(
          left + 2, top + 2, constructionArt.key, constructionVisual.frame
        ).setOrigin(0, 0).setDisplaySize(width, height);
        const incoming = this.add.image(
          left + 2, top + 2, constructionArt.key, constructionVisual.nextFrame
        ).setOrigin(0, 0).setDisplaySize(width, height).setAlpha(0);
        const effects = this.add.graphics();
        this.roomLayer.add([constructionSprite, incoming, effects]);
        this.constructionViews.set(room.id, {
          current: constructionSprite, incoming, revealTarget, effects, left, top, width, height
        });
        continue; // Show the new image and level badge only after construction.
      }
      if (constructionVisual !== null) this.construction.cancel(room.id);
      // Level 2 receives its own illustrated interior; missing assets safely
      // fall back to the original Level 1 sheet (or basic room graphics).
      const texture = roomArtCandidates(room.type, room.level)
        .map(({ key, frame }) => this.assets.resolve(key, this.textures, frame))
        .find((resolved) => resolved !== null) ?? null;
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
        if (room.type === 'ventilation') {
          const cx = left + width / 2, cy = top + height / 2 + 3;
          graphics.lineStyle(2, 0xbafbf2, 0.85).strokeCircle(cx, cy, 13);
          graphics.fillStyle(0x0b2932, 0.9).fillCircle(cx, cy, 3);
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI * 2 / 3) {
            graphics.fillStyle(0x7fe6d5, 0.65).fillEllipse(cx + Math.cos(angle) * 7, cy + Math.sin(angle) * 7, 11, 5);
          }
        }
      }
      // The illustrated steel room shell already provides its own border.
      // Removing the coloured rounded outline restores that original frame.
      this.roomLayer.add(graphics);

      // A transparent, non-interactive layer per finished room. It darkens
      // only the affected interior, leaving its steel frame and neighbours.
      const utilityGraphics = this.add.graphics();
      this.roomLayer.add(utilityGraphics);
      this.roomUtilityViews.set(room.id, {
        graphics: utilityGraphics, left, top, width, height, key: ''
      });

      // At high zoom, keep the nameplate at its original screen size so it
      // does not obscure the newly detailed artwork. Text textures render at
      // 3× resolution instead of stretching a tiny 9px bitmap.
      const badgeWidth = width - 8;
      const badge = this.add.container(left + 6, top + 3);
      const plate = this.add.graphics();
      plate.fillStyle(0x09131f, 0.82).fillRoundedRect(0, 0, badgeWidth, 14, 3);
      const name = this.add.text(4, 1, getLocale() === 'fa' ? localizedRoomBadges[room.type] : definition.label, {
        fontSize: '9px', fontFamily: getLocale() === 'fa' ? 'Vazirmatn, Tahoma, Arial, sans-serif' : 'Arial', fontStyle: 'bold', color: '#f4f7fa'
      }).setResolution(3);
      const level = this.add.text(badgeWidth - 4, 1, 'LV ' + room.level, {
        fontSize: '9px', fontFamily: getLocale() === 'fa' ? 'Vazirmatn, Tahoma, Arial, sans-serif' : 'Arial', color: room.level > 1 ? '#ffe2a1' : '#e0e5eb'
      }).setOrigin(1, 0).setResolution(3);
      badge.add([plate, name, level]);
      this.roomBadges.push(badge);
      roomLabels.push(badge);
      if (room.type === 'ventilation') {
        const airLabel = this.add.text(left + 7, top + height - 14, '', {
          fontSize: '10px', color: '#a8fff0', fontFamily: getLocale() === 'fa' ? 'Vazirmatn, Tahoma, Arial, sans-serif' : 'Arial', fontStyle: 'bold',
          backgroundColor: '#09202bd9', padding: {x:3,y:1},
        }).setResolution(3);
        this.airBadges.push({id: room.id, label: airLabel});
        roomLabels.push(airLabel);
      }
      if (room.type === 'kitchen') {
        const cycle = this.session.kitchen.snapshot().cycles.find(c => c.roomId === room.id);
        if (cycle && cycle.status !== 'idle') {
          const pct = cycle.durationMs ? Math.round(100 * cycle.elapsedMs / cycle.durationMs) : 100;
          const cooking = this.add.text(left + 8, top + height - 14,
            (cycle.status === 'completed' ? '✓' : cycle.status === 'running' ? '♨' : 'Ⅱ') + ' ' + pct + '%',
            { fontSize: '10px', fontFamily: getLocale() === 'fa' ? 'Vazirmatn, Tahoma, Arial, sans-serif' : 'Arial', color: '#fff5d5', backgroundColor: '#222222aa' }).setResolution(3);
          roomLabels.push(cooking);
        }
      }
    }
    this.paintRoomCorridors();
    this.roomLayer.add(roomLabels); // Names and status remain legible above the doors.
    this.refreshRoomUtilityWarnings();
    this.updateBadgeScale();
    this.updateAirBadges();
    this.refreshConstructionViews();
  }

  /**
   * Refresh only rooms whose warning flags changed. No textures, tweens,
   * hit targets or rebuild of all room art are needed on five-second ticks.
   */
  private refreshRoomUtilityWarnings(): void {
    if (this.roomUtilityViews.size === 0) return;
    const resources = this.session.resources.snapshot();
    const lifeSupport = this.session.lifeSupport.snapshot();
    const water = this.session.water.snapshot();
    const air = this.session.air.snapshot();
    const states = roomUtilityWarnings({
      rooms: this.layout.rooms,
      power: this.session.powerStatus(),
      powerStock: resources.stock.power,
      lifeSupportRooms: lifeSupport.roomStatuses,
      waterRaw: water.raw,
      waterCycles: water.cycles,
      vents: air.vents,
      ventilationHasTicked: air.nowMs > 0
    });

    for (const [roomId, view] of this.roomUtilityViews) {
      const state = states.get(roomId);
      const key = state ? `${Number(state.power)}:${Number(state.water)}` : '0:0';
      if (view.key === key) continue;
      view.key = key;
      const g = view.graphics;
      g.clear();
      if (!state?.power && !state?.water) continue;

      // Power outage switches off the interior. Water loss uses a gentler
      // shade to preserve the distinction without requiring any text.
      g.fillStyle(0x030b14, state.power ? 0.71 : 0.38);
      g.fillRoundedRect(view.left + 2, view.top + 2, view.width, view.height, 3);

      const icons: ('power' | 'water')[] = [];
      if (state.power) icons.push('power');
      if (state.water) icons.push('water');
      for (const [index, kind] of icons.entries()) {
        const cx = view.left + view.width - 11 - index * 24;
        const cy = view.top + view.height - 14;
        g.fillStyle(0x071621, 0.96).fillRoundedRect(cx - 11, cy - 12, 22, 24, 6);
        g.lineStyle(1.3, kind === 'power' ? 0xffc46b : 0x83dcff, 0.95)
          .strokeRoundedRect(cx - 10.5, cy - 11.5, 21, 23, 5);
        if (kind === 'power') {
          // Solid lightning bolt: visible at mobile scale and with no text.
          g.fillStyle(0xffdb78, 1).fillPoints([
            { x: cx + 1, y: cy - 8 }, { x: cx - 5, y: cy + 1 },
            { x: cx - 1, y: cy + 1 }, { x: cx - 3, y: cy + 8 },
            { x: cx + 6, y: cy - 2 }, { x: cx + 2, y: cy - 2 }
          ], true);
        } else {
          // Filled water drop, distinct in both shape and colour.
          g.fillStyle(0x79d7fc, 1);
          g.fillTriangle(cx, cy - 8, cx - 5, cy + 2, cx + 5, cy + 2);
          g.fillCircle(cx, cy + 2, 5);
          g.fillStyle(0xe4f9ff, 0.72).fillEllipse(cx - 1.5, cy, 2, 4);
        }
      }
    }
  }

  /** Small steel passages only at actual same-floor, side-by-side room joins. */
  private paintRoomCorridors(): void {
    if (!this.roomLayer) return;
    // A room that's still under construction cannot have a finished doorway.
    const finished = this.layout.rooms.filter(room => this.construction.visual(room.id) === null);
    const passages = roomCorridors(finished);
    if (!passages.length) return;
    // One batched Graphics object for all passages: no extra textures or scene objects per door.
    const g = this.add.graphics();
    for (const { left, top, width, height } of passages) {
      // Shadowed bulkhead; it bridges the tiny gap between the two pre-painted shells.
      g.fillStyle(0x071015, 0.98).fillRoundedRect(left - 1, top - 2, width + 2, height + 2, 2);
      g.fillStyle(0x48535a, 1).fillRect(left, top, width, height);
      g.fillStyle(0x152027, 1).fillRect(left + 3, top + 5, width - 6, height - 11);
      g.fillStyle(0x303d44, 1).fillRect(left + 5, top + 7, width - 10, height - 15);
      // Identical metal jambs and bolts for every room type and level.
      g.fillStyle(0x626d71, 1).fillRect(left + 1, top + 2, 2, height - 5);
      g.fillRect(left + width - 3, top + 2, 2, height - 5);
      g.fillStyle(0x9ca5a7, 0.85).fillRect(left + 1, top + 3, 1, height - 8);
      g.fillStyle(0x28343d, 1).fillRect(left, top, width, 4);
      g.fillStyle(0x9ba5a6, 1).fillRect(left + 1, top, width - 2, 1);
      g.fillStyle(0xe5a950, 0.95).fillRect(left + 4, top + 2, width - 8, 2);
      // A narrow lit steel threshold suggests a continuous walkable passage.
      g.fillStyle(0x303a3c, 1).fillRect(left, top + height - 6, width, 5);
      g.fillStyle(0xd69b46, 0.95).fillRect(left + 3, top + height - 5, width - 6, 2);
      g.fillStyle(0x7b8588, 0.9).fillRect(left + 1, top + height - 2, width - 2, 1);
      g.fillStyle(0xe0b978, 0.9)
        .fillRect(left + 1, top + 8, 1, 1)
        .fillRect(left + width - 2, top + 8, 1, 1)
        .fillRect(left + 1, top + height - 9, 1, 1)
        .fillRect(left + width - 2, top + height - 9, 1, 1);
    }
    this.roomLayer.add(g);
  }

  /** Updates only a handful of existing sprites, keeping mobile redraws cheap. */
  private refreshConstructionViews(): void {
    for (const [roomId, view] of this.constructionViews) {
      const state = this.construction.visual(roomId);
      if (!state) continue;
      view.current.setFrame(state.frame).setAlpha(1 - state.reveal);
      view.incoming.setFrame(state.nextFrame).setAlpha(state.blend * (1 - state.reveal));
      view.revealTarget?.setAlpha(state.reveal);

      // A quiet warm construction lamp, two drifting dust motes and a thin
      // yellow progress strip. No large flash, emitter or new texture.
      const g = view.effects;
      g.clear().setAlpha(1 - state.reveal);
      const progressWidth = view.width - 8;
      const x = view.left + 6;
      const bottom = view.top + view.height - 5;
      g.fillStyle(0x07131a, 0.64).fillRect(x, bottom, progressWidth, 2);
      g.fillStyle(0xffbf54, 0.85).fillRect(x, bottom, progressWidth * state.progress, 2);

      if (state.frame > 0 && state.reveal === 0) {
        const pulse = 0.5 + 0.5 * Math.sin(state.elapsedMs * 0.006);
        const lampX = view.left + view.width * 0.68;
        g.fillStyle(0xffc16b, 0.07 + 0.12 * pulse)
          .fillEllipse(lampX, view.top + 9, 22, 7);
        for (let i = 0; i < 2; i++) {
          const drift = (state.elapsedMs * (0.018 + i * 0.006) + i * 31) % (view.width - 18);
          const rise = (state.elapsedMs * 0.009 + i * 19) % Math.max(12, view.height - 20);
          g.fillStyle(0xffd39b, 0.12 + 0.1 * (1 - pulse))
            .fillCircle(view.left + 9 + drift, view.top + view.height - 9 - rise, 0.65);
        }
      }
    }
  }

  private updateAirBadges(): void {
    if (!this.airBadges.length) return;
    const vents = this.session.air.snapshot().vents;
    const en = getLocale() === 'en';
    for (const badge of this.airBadges) {
      const state = vents.find(vent => vent.id === badge.id);
      const active = !!state?.powered && !!state.enabled && state.health > 0;
      badge.label.setText(active ? (en ? 'ACTIVE' : 'فعال')
        : !state?.enabled ? (en ? 'OFF' : 'خاموش') :
          !state || state.health <= 0 ? (en ? 'BROKEN' : 'خراب') : (en ? 'NO POWER' : 'بدون برق'));
      badge.label.setColor(active ? '#a8fff0' : '#ffca88');
    }
  }

  private updateBadgeScale(): void {
    // Only counteract magnification; labels stay attached to their rooms.
    // Below 100% the room is too narrow for a full-size badge.
    const scale = 1 / Math.max(1, this.zoomFactor);
    for (const badge of this.roomBadges) badge.setScale(scale);
  }

  private addResident(): void {
    for (const figure of this.residentFigures.values()) figure.person.destroy();
    this.residentFigures.clear();
    this.traffic = this.session.survivors.traffic;
    this.selectedResidentId = this.traffic.residents[0]?.id ?? '';
    this.residentWaitMs.clear();
    this.patrolCursors.clear();
    this.traffic.residents.forEach((resident, index) => {
      const person = this.add.container(resident.position.x, resident.position.y).setDepth(4);
      const geometry = survivorGeometry();
      const ring = this.add.ellipse(0, geometry.feetOffset, 15, 4, 0xffe29a, 0.25);
      const texture = this.assets.resolve(SURVIVOR_ART.key, this.textures, index * 6);
      // The loader always bundles the atlas; a missing animation uses its idle frame.
      const sprite = this.add.image(0, geometry.feetOffset, texture?.key ?? '__MISSING', texture?.frame)
        .setOrigin(0.5, 1).setDisplaySize(geometry.width, geometry.height);
      person.add([ring, sprite]);
      this.residentFigures.set(resident.id, { person, sprite, variant: index, lastX: resident.position.x, ring });
      this.residentWaitMs.set(resident.id, 1400 + index * 650);
      this.patrolCursors.set(resident.id, index);
    });
    this.syncResidents();
    this.paintElevatorMotion();
  }

  private resetResident(): void {
    this.addResident();
  }

  private syncResidents(): void {
    for (const resident of this.traffic?.residents ?? []) {
      const figure = this.residentFigures.get(resident.id);
      if (!figure) continue;
      figure.person.setPosition(resident.position.x, resident.position.y);
      const phase = resident.elevator;
      figure.person.setVisible(phase !== 'closing' && phase !== 'travel' && phase !== 'arrival-opening');
      figure.person.setAlpha(phase === 'boarding' ? 0.6 : 1);
      figure.ring.setVisible(this.mode === 'navigate' && resident.id === this.selectedResidentId);
      if (Math.abs(resident.position.x - figure.lastX) > 0.01)
        figure.sprite.setFlipX(resident.position.x < figure.lastX);
      figure.lastX = resident.position.x;
      const room = this.layout.getRoomAt(resident.cell.x, resident.cell.y);
      const state = resident.isWalking ? 'walk' : !resident.isWaiting && room &&
        room.type !== 'habitat' && room.type !== 'command' && room.type !== 'recreation' ? 'work' : 'idle';
      const frame = survivorFrame(figure.variant, state, this.time.now, this.menuSettings.reducedMotion);
      const texture = this.assets.resolve(SURVIVOR_ART.key, this.textures, frame)
        ?? this.assets.resolve(SURVIVOR_ART.key, this.textures, figure.variant * 6);
      if (texture) figure.sprite.setTexture(texture.key, texture.frame);

    }
  }

  private paintElevatorMotion(): void {
    if (this.elevatorCarLayer) paintElevatorCars(this.elevatorCarLayer,
      this.traffic?.elevatorCars ?? [], this.layout.terrain.elevators);
  }

  private beginResidentWalk(residentId: string, roomId: string, manual: boolean): boolean {
    if (this.session.survivors.assignment(residentId) || !this.traffic?.goToRoom(residentId, roomId)) return false;
    this.residentWaitMs.set(residentId, manual ? 9000 : 1800);
    this.syncResidents();
    return true;
  }

  private patrolResident(residentId: string): void {
    const resident = this.traffic?.getResident(residentId);
    if (!resident) return;
    const rooms = this.layout.rooms;
    const cursor = this.patrolCursors.get(residentId) ?? 0;
    for (let i = 0; i < rooms.length; i++) {
      const index = (cursor + i) % rooms.length;
      if (rooms[index].id === resident.destinationId) continue;
      if (this.beginResidentWalk(residentId, rooms[index].id, false)) {
        this.patrolCursors.set(residentId, (index + 1) % rooms.length);
        return;
      }
    }
    this.residentWaitMs.set(residentId, 4000);
  }

  private refreshResidentPath(): void {
    if (!this.traffic) return;
    this.session.survivors.setLayout(this.layout);
    const cancelled = this.traffic.refresh();
    for (const id of cancelled) this.residentWaitMs.set(id, 1600);
    this.syncResidents();
  }

  private paintPreview(): void {
    if (!this.preview) return;
    const g = this.preview;
    g.clear();
    this.previewReason?.setVisible(false);
    // Show eligible anchors even before a touch; preview works identically on mobile and web.
    if (this.mode === 'build' && this.session.canAfford(this.session.buildCost(this.selectedRoom))) {
      const definition = ROOM_DEFINITIONS[this.selectedRoom];
      for (let y = WORLD.minY; y < 0; y++) {
        for (let x = 0; x <= WORLD.cols - definition.width; x++) {
          if (!this.session.canBuild(this.selectedRoom, x, y).ok) continue;
          const { left, top } = toPixels(x, y);
          g.fillStyle(0x6acdad, 0.13);
          g.fillRect(left + 3, top + 3,
            definition.width * WORLD.cellSize - 6, definition.height * WORLD.cellSize - 6);
          g.lineStyle(1, 0x89e5bd, 0.55);
          g.strokeRect(left + 3, top + 3,
            definition.width * WORLD.cellSize - 6, definition.height * WORLD.cellSize - 6);
        }
      }
    }
    const selected = this.mode === 'upgrade'
      ? this.layout.rooms.find((room) => room.id === this.selectedUpgradeId)
      : undefined;
    if (selected) {
      const { left, top } = toPixels(selected.x, selected.y);
      g.lineStyle(3, 0xffd886, 1);
      g.strokeRect(left + 3, top + 3, selected.width * WORLD.cellSize - 6, selected.height * WORLD.cellSize - 6);
    }
    if (!this.hovered) return;
    const { x, y } = this.hovered;
    // Do not render build/dig/move ghosts over the non-buildable surface.
    if (y >= 0 && (this.mode === 'build' || this.mode === 'dig' || this.mode === 'move')) return;
    const room = this.layout.getRoomAt(x, y);
    let width = 1, height = 1, startX = x, startY = y, valid = false;
    let rejection: string | null = null;
    if(this.mode==='cable'||this.mode==='riser'||this.mode==='cutCable') {
      const reason=this.mode==='cutCable'
        ? (this.session.power.cables.some(c=>c.x===x&&c.y===y)?null:'در این خانه کابل وجود ندارد.')
        : canWire(this.session.power,this.layout.terrain,x,y,this.mode==='riser');
      const cost=this.mode==='riser'?POWER_BALANCE.riserCost:POWER_BALANCE.cableCost;
      valid=!reason&&(this.mode==='cutCable'||this.session.canAfford(cost));
      if(!valid)rejection=reason??'سکهٔ کافی برای کابل ندارید.';
    } else if (this.mode === 'elevator') {
      const result=this.layout.canBuildElevator(x,y);
      valid=result.ok && this.session.canAfford(ELEVATOR_DEFINITION.cost);
      if(!valid) {
        const point=toPixels(x,y);
        this.previewReason ??= this.add.text(0,0,'',{fontSize:'12px',color:'#ffffff',backgroundColor:'#641c30',wordWrap:{width:170},padding:{x:5,y:5}}).setDepth(7).setResolution(3);
        this.previewReason.setText(localizeGameMessage(result.ok ? 'سکهٔ کافی برای این عملیات ندارید.' : result.reason)).setPosition(point.left+54,point.top).setVisible(true);
      }
    } else if (this.mode === 'build') {
      const d = ROOM_DEFINITIONS[this.selectedRoom];
      width = d.width; height = d.height;
      const result = this.session.canBuild(this.selectedRoom, x, y);
      valid = result.ok && this.session.canAfford(this.session.buildCost(this.selectedRoom));
      if (!valid) rejection = result.ok ? 'سکهٔ کافی برای این عملیات ندارید.' : result.reason;
    } else if (this.mode === 'dig') {
      valid = this.layout.terrain.canDig(x, y).ok && this.session.canAfford(this.session.digCost());
    } else if (this.mode === 'move' && this.pendingMoveId) {
      const selected = this.layout.rooms.find((r) => r.id === this.pendingMoveId);
      if (!selected) return;
      width = selected.width; height = selected.height;
      const result = this.layout.canMove(selected.id, x, y);
      valid = result.ok;
      if (!result.ok) rejection = result.reason;
    } else if (room) {
      startX = room.x; startY = room.y;
      width = room.width; height = room.height;
      valid = this.mode === 'remove' ? this.layout.canRemove(room.id).ok :
        this.mode === 'upgrade' ?
        this.session.upgradeCostAt(x, y) !== null &&
        this.session.canAfford(this.session.upgradeCostAt(x, y)!) :
        this.mode === 'navigate' ?
          !!this.traffic?.getResident(this.selectedResidentId) &&
          findRoomPath(this.layout, this.traffic.getResident(this.selectedResidentId)!.cell, room.id) !== null :
          this.layout.canEditRoom(room);
      if (this.mode === 'remove' && !valid) {
        const result = this.layout.canRemove(room.id);
        if (!result.ok) rejection = result.reason;
      }
    } else return;
    if (rejection) {
      const point = toPixels(startX, startY);
      this.previewReason ??= this.add.text(0, 0, '', {
        fontSize: '12px', color: '#ffffff', backgroundColor: '#641c30',
        wordWrap: { width: 190 }, padding: { x: 5, y: 5 }
      }).setDepth(7).setResolution(3);
      this.previewReason.setText(localizeGameMessage(rejection))
        .setPosition(point.left + 10, point.top - 36).setVisible(true);
    }
    const { left, top } = toPixels(startX, startY);
    const w = width * WORLD.cellSize - 4, h = height * WORLD.cellSize - 4;
    g.fillStyle(valid ? 0x6acdad : 0xe48384, 0.25);
    g.fillRect(left + 2, top + 2, w, h);
    g.lineStyle(2, valid ? 0x89e5bd : 0xff9192);
    g.strokeRect(left + 2, top + 2, w, h);
  }
}

